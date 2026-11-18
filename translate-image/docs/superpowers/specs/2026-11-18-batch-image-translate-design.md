# 图片批量翻译设计

> 仓库：`BogdaApps/translate-image`。对齐 TSF（ciwi-translate）内容图批量任务，不共用 TSF 包、库、Worker。
>
> 本会话约束：写本规格时不得改产品代码。实现须等用户明确说「按这个做 / 开始写代码」。
>
> **覆盖：** `docs/superpowers/specs/2026-11-18-third-party-images-design.md` 第 1.7 条「单张翻译，不做批量」以及第 2 节「批量勾选 / ImageTranslateJob / 独立 Worker」中的批量部分。第三方采集、索引、店面换图仍以那份为准。

**目标：** 商户在商品 / 文章 / 主题 / 第三方四个入口勾选后，能建一条后台图片翻译任务，看进度，暂停 / 继续 / 取消，失败图可查。译图仍写现有 `UserPicture` + Shopify Files，店面换图不改。

**架构：** Remix Web（TranslateImageProd）自管 Turso 任务表。认领循环挂在本进程 `setInterval`（对齐计费 `reconcileLoop`）。逐张调用现有 `translateImageToShopifyFiles`。不新建 Render Worker，不引 `@ciwi/translation-core`。

---

## 1. 已拍板（grill）

1. P0 四个入口都做：商品、文章、主题、第三方。
2. L1 / L2 勾选对齐 TSF：商品 / 文章 L1 勾资源（最多 20）并展开成图（帽 500）；第三方 L1 勾店面路径并展开成图；主题 L1 勾图（扁平行）；各 L2 勾单图。1 张且未强制任务则同步单译。
3. 不新建 Worker：Turso 任务表 + 认领 / 心跳 / 逐张串行，循环挂 TranslateImageProd。
4. 进行中任务：四个列表页共用一条顶栏任务条 + `/app/image_job/:id` 详情。首页入口卡不改、不加任务队列。
5. 四个 L1 / L2 按 TSF 图片管理页重做（工具条、勾选、译图列、live 状态、失败提示）。本仓无 `<s-modal>`，确认弹窗用 Polaris `Modal` 同布局。语言 / 模型单选用拷贝的 `InFlowSelect`。
6. 确认弹窗对齐 TSF：模型、所需 / 剩余积分、是否重译、部分开跑文案、试用 / 升级 / 买积分分流。买积分走现有 `AddCreaditsModal`，升级走 `/app/pricing`。
7. 控制面整套：暂停 / 继续 / 取消；详情列出每张 PENDING / DONE / FAILED / SKIPPED；列表失败提示；额度不足和缺 `write_files` 自动暂停，补额度或授权后可继续。

未单独提问、本规格锁定：

8. 同店同时只允许一条进行中任务（`QUEUED` / `RUNNING` / `PAUSED`），不按 kind 拆队列。
9. 未勾「重新翻译」时已译图计入 `skipped`，不进 PENDING。
10. 成功后才扣**该张**积分（`deductCredits`，`source: "image"`）。建任务不预扣。
11. `kind`：商品任务 `product`（相册行带 Product GID）；文章 / 主题 / 第三方 `content`。
12. 部分开跑 = 仍按勾选全量建任务（帽 500）；循环跑到余额不够一张时 `PAUSED` + `QUOTA_INSUFFICIENT`。弹窗只提示大约能译 N 张，**不在建任务时截断 items**（与 TSF 确认弹窗实际提交一致）。
13. 商户模型仍两档 Standard / Advance，写入 `job.model` 为真实模型 id（与单张 `translateImageToFiles` 相同）。
14. 测环境跑 Prisma 迁移；产库须用户二次确认。

---

## 2. 非目标

- 独立 Render Worker、hint 队列、Cosmos。
- 页面 / 集合 / 未分类 Files 新分类入口（TSF 有，本仓没有，P2）。
- 首页任务队列、`ContentImageClassifyJob`、内容图 Redis 分类索引。
- 批量译 alt（L2 行内单张 alt 若现网已有则保留，不进本任务）。
- 改店面采集 / 换图 / App Proxy HMAC。
- 改鉴权、部署、密钥、生产库（实现默认测环境）。
- 依赖 `@ciwi/translation-core` 或 TSF Turso。从 TSF **拷贝**纯函数与列表壳，去掉 TSF 包 import。
- 引入 `polaris-1.js` / `<s-modal>`。确认弹窗用 Polaris `Modal`。

---

## 3. 数据流

```text
L1 勾选
  商品/文章：最多 20 个资源 → POST list intent=images resourceIds
  第三方：最多 20 条路径 → POST list intent=switcher pagePaths
  主题：当前页勾中的图（已是图行）
  → 确认弹窗（模型 / 积分 / 重译 / 额度分流）
  → 1 张且非 asJob：现有 translateImageToFiles（同步）
  → 多张或 L1：POST jobs intent=create
       同店已有进行中 → JOB_ACTIVE
       缺 write_files → SCOPE_MISSING
       remaining < 一张单价 → 不建任务，走买积分/升级
       未重译：已译 skip
       写入 ImageTranslateJob + PENDING items（QUEUED；若无 PENDING 则直接 COMPLETED）

TranslateImageProd loop（约 10s）
  raw SQL 认领 QUEUED，或心跳超过 10 分钟的 RUNNING
  全局同时跑 1 个任务；任务内逐张
  每张开始前重读 status（暂停/取消在当前这张结束后生效）
  已译且未重译 → SKIPPED
  remaining < 单价 → PAUSED QUOTA_INSUFFICIENT
  translateImageToShopifyFiles → upsert UserPicture
    product 行 imageId = Product GID
    其余 imageId = content:{urlKey}
  成功：扣费 + invalidateStorefrontCache("picture") + DONE
  Gemini 连续 2 张 RATE_LIMITED：剩余 PENDING 标 FAILED
  缺 scope → PAUSED SCOPE_MISSING；Gemini 未配置 / 店铺不可用 → PAUSED SERVICE_ERROR
  无 PENDING → COMPLETED
  进程退出：RUNNING 退回 QUEUED

UI
  四列表顶栏读 current job（任意 kind）
  详情 /image_job/:id 轮询 5s
  行 live 状态：PENDING/RUNNING 中的 urlKey×productId
```

---

## 4. 数据模型

`prisma/schema.prisma` 新增（字段对齐 TSF，不引 TSF 包）：

```prisma
model ImageTranslateJob {
  id             String    @id
  shop           String
  targetLanguage String
  model          String
  /// content = 文章/主题/第三方；product = 商品相册（可含同任务里的正文-only 行，productId 为空）
  kind           String    @default("content")
  /// QUEUED | RUNNING | PAUSED | COMPLETED | CANCELLED
  status         String
  /// MANUAL | QUOTA_INSUFFICIENT | SCOPE_MISSING | SERVICE_ERROR
  pauseReason    String?
  retranslate    Boolean   @default(false)
  total          Int       @default(0)
  done           Int       @default(0)
  failed         Int       @default(0)
  skipped        Int       @default(0)
  creditsUsed    Int       @default(0)
  claimedBy      String?
  heartbeatAt    DateTime?
  finishedAt     DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([shop, createdAt])
  @@index([shop, kind, createdAt])
  @@index([status, updatedAt])
}

model ImageTranslateJobItem {
  id            String   @id
  jobId         String
  shop          String
  urlKey        String
  imageUrl      String
  /// 商品相册为 Product GID；content 为空串
  productId     String   @default("")
  resourceTitle String?
  /// PENDING | DONE | FAILED | SKIPPED
  status        String   @default("PENDING")
  error         String?
  imageAfterUrl String?
  credits       Int      @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([jobId, urlKey, productId])
  @@index([jobId, status])
}
```

- 迁移：`prisma/migrations/<timestamp>_image_translate_job/migration.sql`，测环境 `npm run turso:migrate`。
- `UserPicture` / `CreditUsage` / `Account` 不改表。`CreditUsage.source` 继续 `"image"`。
- 时间字段：循环认领用 ISO 字符串比较（与 TSF 相同），Prisma DateTime 写入须能和 raw SQL 心跳比较。规格要求认领 SQL 用 `datetime(heartbeatAt)` 或统一写 ISO 文本；实现时与 TSF `imageTranslateJobStore` 同一套比较方式，并有单测锁住。

---

## 5. 任务状态

| 动作 | from | to |
| --- | --- | --- |
| 创建（有 PENDING） | — | `QUEUED` |
| 创建（全部 skip） | — | `COMPLETED`（`skipped = total`） |
| 循环认领 | `QUEUED` 或心跳过期 `RUNNING` | `RUNNING` |
| 人工暂停 | `QUEUED` / `RUNNING` | `PAUSED` + `MANUAL` |
| 额度不足 / 缺 scope / 服务异常 | `RUNNING` | `PAUSED` + 对应 reason |
| 继续 | `PAUSED` | `QUEUED`（清 `pauseReason`） |
| 取消 | `QUEUED` / `RUNNING` / `PAUSED` | `CANCELLED` + `finishedAt` |
| 无 PENDING | `RUNNING` | `COMPLETED` + `finishedAt` |

- Resume 闸：仍缺 `write_files` 则 `SCOPE_MISSING`；`remaining < 一张单价` 则 `QUOTA_INSUFFICIENT`，不改回 QUEUED。
- 取消不删已写成的 `UserPicture` / Files，不退积分。
- `JOB_ACTIVE`：同店已有 `QUEUED` / `RUNNING` / `PAUSED` 时不能再建。

计数：`total` = 提交去重后张数（含即将 skip 的）；`skipped` / `done` / `failed` 由建任务与循环累加，三者之和达到 `total` 才允许 COMPLETED。

---

## 6. 进程内循环

挂点：`app/entry.server.tsx` 在 `startBillingReconcileLoop()` 旁调用 `startImageTranslateLoop()`。

| 项 | 值 |
| --- | --- |
| 轮询 | `IMAGE_TRANSLATE_POLL_MS`，默认 10s，最小 2s |
| 全局并发 | `IMAGE_TRANSLATE_MAX_JOBS`，默认 **1**（Web 与 HTTP 同进程，比 TSF Worker 默认 2 更紧） |
| 心跳过期 | 10 分钟无更新视为进程死，可被下一轮认领 |
| 认领 | raw SQL `UPDATE ... WHERE id = (SELECT ... LIMIT 1) RETURNING`，禁止 findFirst + update |
| 多实例 | Turso 认领串行即可；**不要**再用一条全局 Redis 锁挡住认领（计费对账那把锁是扫全店，这里是抢单行） |
| Shopify token | 现有 `getShopAdmin` / application-only，不把 token 写入任务表 |
| 译图 | 现有 `translateImageToShopifyFiles` + `upsertUserPictureFile` |
| 扣费 | 现有 `precheckCredits` / `deductCredits` |
| Redis key | 若打日志去重等，必须以 `img:` 开头 |

连续两张 `GEMINI_RATE_LIMITED`（或本仓等价 token）：把剩余 PENDING 标 FAILED，任务 COMPLETED（带 failed 计数）。不要把整店打挂。

进程 SIGTERM：本进程 `running` 里的任务 `RUNNING` → `QUEUED`（对齐 TSF `requeueRunningJob`）。

---

## 7. 列表数据口径（对齐 TSF，本仓实现）

语言：Shopify `shopLocales`，默认第一个非 primary；与第三方页同一套 `loadAdminShopLocales`。

### 7.1 商品（`kind=product`）

- L1：`products` 分页，只列有封面或可译图的商品。Tab：All / Active / Draft / Archived。
- 可译图 = 相册 `media` MediaImage **加** `descriptionHtml` 正文图。同 `urlKey` 先相册：`productId = Product GID`；正文-only：`productId = ""`，`imageId = content:{urlKey}`。
- L1 勾选最多 20 个商品，服务端展开最多 500 张，截断 toast。

### 7.2 文章（`kind=content`）

- L1：`articles` 分页。Tab：All / Published / Unpublished。
- 可译图 = 封面 + `body` HTML 中的 Shopify CDN 图。`imageId = content:{urlKey}`。
- 展开帽同 20 / 500。

### 7.3 主题（`kind=content`，扁平行）

- **改口径：** 不再用 `translatableResources` + `queryShopifyThemeData` 那套 FILE_REFERENCE Tab。
- L1 = 当前 MAIN 主题 JSON 引用的 Files 图（拷贝 TSF `themeImages` / `themeImageRefs` / schema 解析，去 TSF 包）。`urlKey=files/…`，列 usedIn。Redis `img:theme-images:v1:{shop}` TTL 180s，空结果不缓存。不扫 `assets/`，不写主题，不加 `write_themes`。
- 无 L2。勾选即图行。

### 7.4 第三方（`kind=content`）

- L1 / L2 查询继续 `switcherImages.server.ts`。
- L1 勾路径 → 展开这些路径 + 当前语言下的图。同一 `ext:` 只入队一次。已在其它路径译过的显示已译，未重译则 skip。

HTML 抽 URL 用本仓已有 `extractShopifyImageUrlsFromHtml`（`imageUrlKey.ts`），不得再分叉一份。

---

## 8. API

前缀 `/api/content-image/`。鉴权 `authenticate.admin`。租户键只用 `session.shop`。

### 8.1 `POST /api/content-image/list`

| intent | body | 用途 |
| --- | --- | --- |
| `resources` | `type=product\|article\|theme`，`after?` `q?` `status?` `languageCode` | L1 |
| `images` | `type` + `resourceId` + `languageCode` | L2 |
| `images` | `type` + `resourceIds[]`（最多 20） | L1 批量展开 |
| `switcherPages` | 现有第三方 L1 | 保持 |
| `switcher` | `pagePath` 或 `pagePaths[]` | L2 / 批量展开 |

响应形状对齐 TSF `{ success, errorMsg, response: { rows, hasNextPage, endCursor, truncated?, canWriteFiles } }`。

### 8.2 `GET|POST /api/content-image/jobs`

GET：

- `current=1`：任意 kind 进行中，没有则 `null`
- 默认 latest：进行中优先，否则该 kind 最近一条
- `failed=1&kind=&languageCode=`：失败图（同 urlKey×productId 只留最新）
- `jobId=`：详情（含 items）

POST JSON：

- `{ intent: "create", kind, targetLanguage, model?, items: [{ imageUrl, title?, productId? }], retranslate? }`
- `{ intent: "pause"|"resume"|"cancel", jobId }`

错误码给 UI：`JOB_ACTIVE` / `SCOPE_MISSING` / `额度不够`（与单张同一 `IMAGE_TRANSLATE_INSUFFICIENT_CREDITS`） / `INVALID_STATE` / `NOT_FOUND`。

---

## 9. UI

保留现有 URL，避免侧栏和书签裂开。

| URL | 角色 |
| --- | --- |
| `/app/product` | 商品 L1（重做） |
| `/app/products/:productId` | 商品 L2 资源图列表（替换现相册表；不再以超长单图页当主路径） |
| `/app/article` | 文章 L1 |
| `/app/articles/:articleId` | 文章 L2 |
| `/app/theme` | 主题扁平行 L1 |
| `/app/third-party` | 第三方路径 L1（加勾选 / 工具条 / 任务条） |
| `/app/third-party/pages/:pagePath` | 第三方 L2（加勾选） |
| `/app/image_job/:jobId` | 任务详情（新） |

P1：`/app/:type/:productId/:imageId` 与 `/app/third-party/image/:urlKey` 重定向到对应 L2，并用 query 打开对照预览。P0 可不做重定向，旧 URL 暂时仍可进单张页。

### 9.1 列表壳（从 TSF 拷贝适配）

- `ImageManageListShell` + 搜索 + 语言 `InFlowSelect` + 状态筛选 + 勾选后顶栏主按钮「翻译」。
- Ant Table：`rowSelection`，缩略图，标题，图数或译图列，live 状态。
- 缺 `write_files`：现有全局 `FilesAccessBanner`；主按钮不可点。
- 失败提示条：该语言最近失败张数，点进详情或失败筛选。
- 进行中任务条：四页都读 `current` job（跨 kind）。暂停 / 继续 / 取消。点标题进详情。
- 有进行中任务时再点「翻译」：toast `JOB_ACTIVE`，不打开确认框。

### 9.2 确认弹窗（Polaris Modal）

打开时重置「重新翻译」为关。

| 剩余积分 | 主按钮 | 次按钮 |
| --- | --- | --- |
| ≥ 全量 | 翻译 | 取消 |
| ≥ 1 张单价且 < 全量 | 翻译（文案带将先译 N 张） | 买积分 |
| < 1 张；`isNew` | 去试用 / 升级（进定价） | 取消 |
| < 1 张；免费已用过试用 | 去升级 | 取消 |
| < 1 张；付费套餐 | 买积分（`AddCreaditsModal`） | 取消 |

额度查不到（null）：按 ready 开跑，循环里再闸。不要用假 0 挡住。

### 9.3 详情页

标题：`{kind 标签} · {语言}`。迷你进度 `done+failed+skipped / total`。进行中可暂停 / 取消；暂停中可继续。表格：缩略图、标题、状态、错误文案（token 映射）、View 对照。轮询 5s 直到终态。

### 9.4 文案

至少 `public/locales/en/translation.json` 与 `zh-CN/translation.json`。路由里不得新留商户可见英文硬编码。其余语言实现时可用现有 `npm run translate`，不作为 P0 门禁。

| 角色 | 中文 | 英文 |
| --- | --- | --- |
| 顶栏主按钮 | 翻译 | Translate |
| 任务已在进行 | 已有进行中的图片翻译任务 | An image translation job is already running |
| 确认主按钮 | 翻译 | Translate |
| 部分开跑说明 | 积分不够全部张数，将先翻译 {count} 张 | Not enough credits for all images. We'll translate {count} first. |
| 重译勾选 | 重新翻译已有译图 | Retranslate existing images |
| 任务条进行中 | 翻译中 · {done}/{total} | Translating · {done}/{total} |

组件：Polaris `Page` / `Modal` / `Banner`；Ant `Table`；本仓拷贝 `InFlowSelect`。不要新做第二套设计系统。

---

## 10. 单张 vs 批量

| | 单张（现有 `translateImageToFiles`） | 批量循环 |
| --- | --- | --- |
| 入口 | L2 行「翻译」，或勾 1 张 | 勾多张 / L1 展开 |
| 扣费 | 成功后 `deductCredits` | 同左，每张一次 |
| `UserPicture` | `upsertUserPictureFile` | 同左 |
| 额度不足 | 返回「额度不够」，弹买积分 | 当前张不译，任务暂停 |
| scope | `SCOPE_MISSING` | 任务暂停 |

批量循环**不要**再走 Remix action 里的 `translateImageToFiles` HTTP 形；抽一层 `runTranslateImageItem({ shop, graphql, ... })` 给单张 action 和循环共用，避免扣费 / upsert 分叉。

---

## 11. 限制与故障

| 情况 | 行为 |
| --- | --- |
| 同店已有进行中 | 409 `JOB_ACTIVE` |
| 缺 `write_files` | 不建任务；循环中暂停 `SCOPE_MISSING` |
| remaining &lt; 一张 | 不建任务；循环中暂停 `QUOTA_INSUFFICIENT` |
| 勾选 0 张 / 展开 0 张 | toast，不打开弹窗 |
| 展开截断 | 入队 500 张，toast 告知截断 |
| Gemini 失败 | 该张 FAILED，继续下一张（非连续限流） |
| 连续 2 张限流 | 剩余 PENDING → FAILED，任务结束 |
| upsert 失败 | 删刚上传的 Files，该张 FAILED，不扣费 |
| 扣费失败（图已存） | 打日志，该张仍 DONE（与单张现网一致：Files 已成功不回滚图） |
| Web 多实例 | 认领 SQL 保证一条 RUNNING |
| `RENDER_KV` 缺失 | 循环仍跑（认领不依赖 Redis） |

环境变量只记名字：`IMAGE_TRANSLATE_POLL_MS`、`IMAGE_TRANSLATE_MAX_JOBS`。不打印 `.env*` 值。

---

## 12. 文件落点

| 路径 | 职责 |
| --- | --- |
| `prisma/schema.prisma` + 新 migration | 两张任务表 |
| `scripts/lib/imageTranslateJobItems.mjs` + `.ts` 镜像 | 去重、kind、rowKey、帽 |
| `scripts/lib/imageTranslateConfirmState.mjs` + `.ts` 镜像 | 确认态机（ready / partial / offer） |
| `app/server/contentImage/contentImageJobs.server.ts` | 创建 / 控制 / 查询 |
| `app/server/contentImage/imageTranslateJobStore.server.ts` | raw SQL 认领 / 心跳 / 下一张 |
| `app/server/contentImage/imageTranslateLoop.server.ts` | setInterval 循环 |
| `app/server/contentImage/imageList.server.ts` | list API 分发 |
| `app/server/contentImage/resourceImages.server.ts` | 商品 / 文章 GraphQL 列表与展开 |
| `app/server/contentImage/themeImages.server.ts` 等 | 从 TSF 拷贝主题 JSON 扫图 |
| `app/server/picture/translateImage.server.ts` | 抽出 `runTranslateImageItem` 供单张与循环 |
| `app/entry.server.tsx` | 启动 loop |
| `app/routes/api.content-image.list.ts` | list |
| `app/routes/api.content-image.jobs.ts` | jobs |
| `app/routes/app.product/route.tsx` 等四入口 | 改为列表壳 |
| `app/routes/app.image_job.$jobId.tsx` | 详情 |
| `app/ui/components/InFlowSelect.tsx` | 从 TSF 拷贝，不引 TSF |
| `app/routes/app.manage_translation_.content_image/` 不存在 | 列表壳放 `app/routes/component/contentImage/`（本仓无 manage_translation 路径） |
| `public/locales/en/translation.json`、`zh-CN/translation.json` | 文案 |
| `scripts/*.test.mjs` | 纯函数测试，纳入 `npm test` |

TSF 参考（只读拷贝，禁止 import）：

- `ciwi-translate/app/server/contentImage/contentImageJobs.server.ts`
- `ciwi-translate/worker/src/services/imageTranslateJobStore.ts`
- `ciwi-translate/worker/src/workers/imageTranslateWorker.ts`
- `ciwi-translate/app/routes/app.manage_translation_.content_image/*`
- `ciwi-translate/app/ui/components/InFlowSelect.tsx`

---

## 13. 测试（实现时 TDD 纯函数优先）

本仓 `npm test` 只跑 `scripts/*.test.mjs`。新增至少：

- `normalizeImageJobItems`：product 丢非 Shopify URL；content 保留 `ext:`；同 urlKey×productId 去重；空 productId。
- `imageRowKey`：`gid::files/a.jpg` vs `files/a.jpg`。
- `groupProductResourceImages`：相册优先于正文同一 urlKey；正文-only 无 productId。
- `resolveImageTranslateConfirmState`：够全量 / 只够部分 / 一张都不够 × trial|pricing|paid。
- 展开帽：21 个资源 → truncated；501 张 → 截 500。
- 暂停状态机：pause/resume/cancel 合法 from；非法 from → INVALID_STATE。
- 认领比较：heartbeat 过期可抢；新鲜 RUNNING 不可抢（用固定 ISO 字符串纯函数测 `isClaimEligible`）。

循环与 GraphQL 不在 `npm test` 连真实 Turso / Shopify。实现后测试店手工验。

---

## 14. UI 样例

### L1 商品（主状态）

```text
← 商品图片                         语言 [Français ▾]  状态 [Active ▾]  搜索 [    ]
已选 3                     [ 翻译 ]

☑  [图]  Summer Dress     图 3/8    翻译中
☐  [图]  Winter Coat      图 0/4    未翻译

进行中 · 商品 · Français · 12/40    [暂停] [取消]
```

### 确认弹窗

```text
翻译图片
语言    Français
图片    40
模型    [Standard · 2,000 / 张 ▾]
所需    80,000
剩余    50,000
☐ 重新翻译已有译图
积分不够全部张数，将先翻译 25 张。
              [买积分]  [翻译]
```

### 详情

```text
← 商品图片 · Français
翻译中  12/40  失败 1          [暂停] [取消]
[缩略图] Summer Dress   DONE
[缩略图] Summer Dress   FAILED  GEMINI_…
[缩略图] Winter Coat    PENDING
```

空态：无目标语言 →「请先在 Shopify 添加语言」；第三方无采集 → 沿用现有逛店引导；展开 0 张 → toast「所选资源没有可翻译图片」。

加载：表格 `loading`；任务条 skeleton 或上次快照。主按钮：有勾选、有语言、已授权 Files、无进行中任务时可点。

做错了：取消关闭弹窗不建任务；任务可取消；已译图不自动删。

---

## 15. 验收

1. 测试店商品 L1 勾 2 个有图商品，确认后出现任务条，进度增加；店面该语言商品图替换。
2. 文章 / 主题 / 第三方同样能建任务（第三方需该语言下已有采集路径）。
3. 同店第二条任务被 `JOB_ACTIVE` 拦住。
4. 勾「重新翻译」会重译已有图；不勾则 skipped 增加。
5. 把剩余积分改到只够 1 张以下：进行中任务暂停，补积分后继续。
6. 暂停 / 取消按钮生效；取消后其它入口可新建。
7. 缺 Files 权限时不能建任务，Banner 仍在；授权后 resume 或重开。
8. `npm test` 含新脚本；`npx prisma validate`。测环境 `npm run turso:migrate`。
9. 首页四张入口卡与侧栏 URL 不变。

---

## 16. 实现优先级

1. **P0** 表 + 认领循环 + jobs/list API + 四入口 TSF 列表壳 / 确认弹窗 / 任务条 / 详情 / 暂停继续取消 / 失败提示 + en/zh-CN + 纯函数测试。
2. **P1** 旧单图 URL 重定向到 L2 对照；失败图从提示跳进可筛选列表。
3. **P2（可延后）** Web 明显变慢再拆独立 Worker（表不用改）；页面 / 集合 / Files；首页紧凑卡。
