# 第三方图片翻译设计

> 仓库：`BogdaApps/translate-image`。对齐 TSF（ciwi-translate）Switcher 图片闭环，但不引入语言/货币 Switcher、不共用 TSF 包。
>
> 本会话约束：写本规格时不得改产品代码。实现须等用户明确说「按这个做 / 开始写代码」。
>
> **修订（同日）：** 第三方 L1/L2 批量勾选、任务表、进程内循环见 `2026-11-18-batch-image-translate-design.md`。下文第 1.7 条与第 2 节「批量勾选 / ImageTranslateJob / 独立 Worker」中的批量部分作废；采集、索引、店面换图仍以本文为准。独立 Worker 仍然不做。

**目标：** 店面发现非 Shopify CDN 图，商户能按「语言 × 店面路径」找到并单张翻译，译完后店面按 `urlKey` 换成译图。

**架构：** 扩展 idle 采集 → App Proxy `picture/collect` 写索引表 → 后台 L1/L2 读索引、译图写现有 `UserPicture` → 店面 `ContentImageTranslate` 按页内 urlKey 读译图替换。采集与换图都是图片翻译能力，不接 Java。

---

## 1. 已拍板（grill）

1. 完整闭环：采集 + 索引 + 后台 + 换图，不只优化时机。
2. 只采第三方 `ext:{host}{pathname}`，不采 Shopify CDN。
3. 后台两级：当前语言的店面路径 → 该页的图 → 单张翻译。
4. 语言用 Shopify `shopLocales`；`zh-hans` 等归一到本店 locale；对不上只记图、不挂页。
5. L1 按语言筛路径；该语言下没逛过店则空列表 + 引导文案。
6. 首页第四张卡「第三方图片 / Third-party images」；侧栏同样加一项。
7. 单张翻译，不做批量任务 / Worker。
8. 换图改为 DCL + idle；`html[lang]` / `pageshow` / `popstate` 再换。主题编辑器里换图、不采集。
9. 每店每分钟 **1** 次 collect；每店最多 **10000** 条索引；超帽删最旧索引、不删 `UserPicture`。不做 30 天清理、不发飞书。
10. 属性宽或高 &lt; 80 的 `<img>` 不采。
11. 同一 `ext:` 译一次，该语言全店生效。

## 2. 非目标

- 语言/货币 Switcher UI、Custom Liquid、商品/集合 GID 换图层。
- 页面/集合/Files 等 Shopify 图分类（继续走商品/文章/主题现有入口）。
- 批量勾选翻译、`ImageTranslateJob`、独立 Worker。
- 30 天未见清理、触顶飞书。
- 恢复整店 `GetShopImageData` 拉图。
- 删 `JavaServer.ts` 里主题 GraphQL（主题图页仍在用）。
- 改鉴权、部署、密钥、生产库（实现阶段测环境迁移；产库须用户二次确认）。

## 3. 数据流

```text
店面 idle
  CollectSwitcherImages
    → POST /apps/{proxy}/picture/collect  (HMAC)
    → SwitcherImage (shop+urlKey)
    → 语言能归一 且 有 pagePath → SwitcherImagePage (shop+urlKey+pagePath+targetCode)

商户后台
  L1 按 shopLocales 当前语言筛 SwitcherImagePage
  L2 该 pagePath + 语言 下列图，译图状态来自 UserPicture
  点一张 → 单图翻译（Gemini / 上传 / 清除）
    → UserPicture.imageId = "content:{urlKey}"
    → invalidateStorefrontCache("picture", shop)

店面 idle（可与采集并行）
  ContentImageTranslate
    → 扫 body + open shadow + 同源 iframe 的 img/video/model-viewer/iframe
    → POST picture/getPictureDataByUrlKeys
    → 按 urlKey 换 src/srcset/picture source 与 alt
```

店面换图**不读**两张索引表，只读 `UserPicture`。索引只为后台找图。

## 4. 数据模型

`prisma/schema.prisma` 新增（对齐 TSF 字段，不引 TSF 包）：

```prisma
model SwitcherImage {
  id             String   @id @default(cuid())
  shop           String
  urlKey         String
  imageBeforeUrl String
  lastPagePath   String?
  firstSeenAt    DateTime @default(now())
  lastSeenAt     DateTime
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@unique([shop, urlKey])
  @@index([shop, lastSeenAt])
}

model SwitcherImagePage {
  id         String   @id @default(cuid())
  shop       String
  urlKey     String
  pagePath   String
  targetCode String?
  lastSeenAt DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([shop, urlKey, pagePath, targetCode])
  @@index([shop, targetCode, pagePath, lastSeenAt])
  @@index([shop, lastSeenAt])
}
```

- `urlKey` 例：`ext:cdn.judgeme.com/reviews/a.jpg`（小写 host，无 query/hash，最长 512）。
- `pagePath` 剥本店 locale 前缀后的路径：`/fr/products/hat` 与 `/products/hat` 都存 `/products/hat`，最长 512。
- `targetCode` 为本店 Shopify locale 原串（`zh-CN`，不是 `zh-cn`）。
- 迁移：`prisma/migrations/<timestamp>_switcher_image/migration.sql`，测环境 `npm run turso:migrate`。产库不在本规格授权。

`UserPicture` 不改表。第三方图约定：

| 字段 | 值 |
| --- | --- |
| `imageId` | `content:{urlKey}` |
| `urlKey` | 同一 `ext:…` |
| `imageBeforeUrl` | 去 query/hash 的 https 原图 |
| `languageCode` | 本店 `shopLocales.locale` |

复合唯一键仍是 `(shop, imageId, imageBeforeUrl, languageCode)`。为避免签名 URL 裂行：**`imageId` 以 `content:` 开头时，按 `shop + imageId + languageCode` 找未删除最新行再 update**，找不到才 insert。`urlKey` 一律 `pictureUrlKey(imageBeforeUrl)`（已含 `ext:`）。

## 5. 语言

本仓没有 `ShopTargetLocale`。店面与采集用的语言列表 = Shopify `shopLocales { locale primary }`。

- Redis：`img:shop-locales:{shop}`，JSON `{ locales: string[], primary: string }`，TTL 3600s。
- 未命中：App Proxy 进程用现有 application-only token 拉 GraphQL，写入缓存。
- GraphQL 失败：采集仍写 `SwitcherImage`，不写 `SwitcherImagePage`；换图读库用请求里的 `languageCode` 原文（可能 miss，不 500）。

归一规则（从 TSF `resolveShopLocale` 拷一份到本仓，不 import TSF）：

- 大小写 / `_` vs `-` 不敏感。
- 别名组：`zh-cn` ↔ `zh-hans`；`zh-tw` ↔ `zh-hant` ↔ `zh-hk`。
- 再试语言主码（`zh` → 店里第一个 `zh-*`）。
- 对不上 → `null` → 不挂页。
- 换图读 `UserPicture` 时同样归一后再查。

`pagePath` 写入前用本店 locale 前缀集合剥第一段（`/zh-hans/products/x` → `/products/x`）。L1 展示时若当前语言不是 primary，再把前缀加回去给商户看。

## 6. 店面扩展（`ciwi-image-switcher`）

现有 `ContentImageTranslate` 已能按 Shopify key 与 `ext:` 换图。本规格改启动与采集，不改匹配口径（须与 `app/server/picture/imageUrlKey.ts` 继续一致）。

### 6.1 启动

- 入口仍是 Liquid `star_rating`（`target: body`）。不要等 `window.onload`。
- `DOMContentLoaded`（若已完成则立刻）后：
  - 疑似爬虫：只 `return`，**不再** POST Spring `/frontEndPrinting`。
  - 主题编辑器（`Shopify.designMode` / `visualPreviewMode` / `shopify-design-mode` class / Admin 编辑器 referrer）：只跑 `ContentImageTranslate`，不采集。
  - 否则 `requestIdleCallback`（timeout 2000）并行：换图 + 采集。
- 换图后再听：`document.documentElement` 的 `lang`、`pageshow`、`popstate`。语言码相对上次有变化才再跑 `ContentImageTranslate`（不重采）。

### 6.2 换图（已有逻辑 + 时机）

保持：扫根 = body + open shadow + 同源 iframe；每页最多 200 urlKey；`ciwiOriginalSrc` 记原图；Observer 只处理 **addedNodes**（不在本期改成监听 `src`）。商品/主题/第三方走同一函数。

不恢复 `GetProductImageData` / `GetShopImageData` 调用。这两个函数若未引用可留着（P2 再删）。

### 6.3 采集

只扫 `<img>`（不扫 video/iframe）。规则：

- 原图 URL 来自 `dataset.ciwiOriginalSrc` → `currentSrc` → `src` → `data-src`。
- 丢掉：`data:` / `blob:`、非 https、内网 host、Shopify CDN（`imageUrlKey` 能算出）、`ext:` 算不出、属性宽或高存在且 &lt; 80。
- 本扩展没有国旗 UI，不必抄 TSF 国旗过滤。
- 15s 内 MutationObserver：新增节点、`src|srcset|data-src`、新 open shadow、同源 iframe `load`。
- POST 每批最多 100 条；同页 `sessionStorage` 键 `ciwi_sw_img_posted:{shop}:{pagePath}` 去重。
- **限流未写入时不得写入 sessionStorage**（见 7.2），否则 1 次/分钟会把未入库的 key 记成已上报。

Body：

```json
{
  "shopName": "store.myshopify.com",
  "images": [{ "src": "https://cdn.judgeme.com/reviews/a.jpg?w=400", "urlKey": "ext:cdn.judgeme.com/reviews/a.jpg" }],
  "pagePath": "/products/hat",
  "languageCode": "zh-CN"
}
```

`urlKey` 客户端可带；服务端必须按 `src` 重算，不信任客户端 key。

### 6.4 Liquid

继续用 `image_queryCiwiId` / `image_language_code`。`ciwi_app_proxy_base` 由主题 App embed 写入真实 `/apps/…`（空则仍按 CDN handle 推断，现有逻辑保留）。

## 7. App Proxy

`app/routes/api.storefront.$.ts` 现有 HMAC + `shopName === auth.shop` 不变。

### 7.1 `POST picture/getPictureDataByUrlKeys`

先 `resolvePictureReadLanguage` 再查。返回形状不变：`{ urlKey, imageAfterUrl, altAfterTranslation }[]`。继续 `readThroughStorefrontCache`，extra 含归一后的 languageCode。

### 7.2 `POST picture/collect`（新增）

不走读缓存。步骤：

1. HMAC 已过。
2. Redis 占坑：key `img:sf:rl:collect:{shop}`，窗口 60s，上限默认 **1**（env `STOREFRONT_COLLECT_PER_MINUTE` 可覆盖，非法则 1）。Redis 故障或超限 → **不写库**。
3. 超限 / Redis 故障响应（让客户端重试、不记 posted）：

```json
{ "success": true, "response": { "accepted": false, "reason": "rate_limited", "inserted": 0, "updated": 0, "skipped": 0, "total": 0 } }
```

HTTP 202。客户端仅当 `response.accepted !== false` 时把本批 urlKey 写入 sessionStorage。

4. 通过限流：规范化 items（最多 100、丢掉 Shopify CDN / 非法 / 重复），`INSERT ON CONFLICT(shop, urlKey)` 刷新 `lastSeenAt`、`imageBeforeUrl`、`lastPagePath`，不改 `id` / `firstSeenAt`。
5. 语言归一成功且 pagePath 非空：upsert `SwitcherImagePage`。
6. 写入后 `count > 10000`：按 `lastSeenAt ASC, id ASC` 删溢出索引行，并删对应 `SwitcherImagePage`；单次最多删 500。不删 `UserPicture`。
7. 成功：`{ accepted: true, inserted, updated, skipped, total }`，202。

空 `images`：`accepted: true`，不占业务语义上的「已采」，可仍占限流槽（实现按 TSF：先占槽再看 body，保持简单）。

## 8. 后台

### 8.1 入口

- 首页 `ThemeModule` 第四张卡，`key: "third-party"`，进 `/app/third-party`。
- `app.tsx` `NavMenu` 在 Theme images 下加「第三方图片」。
- i18n：至少 `public/locales/en/translation.json` 与 `zh-CN/translation.json`；其余语言用现有 `npm run translate`（实现时跑或不跑由执行者定，不得在路由里留英文硬编码）。

### 8.2 路由

现有 `app.$type.$productId.$imageId` 的 loader 拉 Shopify Media，**不能**把 `ext:` 塞进去。复用的是译图引擎与交互，不是那条 URL。

| URL | 文件 | 做什么 |
| --- | --- | --- |
| `/app/third-party` | `app/routes/app.third-party/route.tsx` | L1 路径列表 |
| `/app/third-party/pages/:pagePath` | `app/routes/app.third-party_.pages.$pagePath.tsx` | L2；`pagePath` 为 `encodeURIComponent` |
| `/app/third-party/image/:urlKey` | `app/routes/app.third-party_.image.$urlKey.tsx` | 单图翻译；`urlKey` 为 `encodeURIComponent` |

L2 → 详情带 `?pagePath=` 与 `?language=` 以便返回。

语言下拉：与商品图页相同，action 拉 `shopLocales`（含 primary）。默认选第一个非 primary；只有一种语言则选它。

L1 查询：`shop + targetCode = 当前语言`，`groupBy pagePath`，按 `max(lastSeenAt)` 倒序，每页 50。可选路径包含搜索（防抖），无搜索则全量分页。

L2：该 `pagePath + targetCode` 下的 `SwitcherImage` join `UserPicture`（`imageId=content:{urlKey}` 且当前语言、未删除）。列：缩略图、原图 URL、是否已有译图、操作「翻译」。已在其它路径译过的同一 urlKey 显示已译。

详情页：按语言列出译图/原文，按钮走现有 `translateImageToFiles` / `api.picture.upload` / `api.picture.delete`。`imageId` 固定 `content:{urlKey}`。缺 `write_files` 仍用全局 `FilesAccessBanner`。积分不足走现有额度弹窗，不新做支付。

返回：详情 → L2 → L1 → 首页。L1/L2 用 Polarise `Page` `backAction`（与商品图子页一致），不要用会整页跳走的外链。

### 8.3 空态 / 加载 / 主按钮

- L1 加载：表格 skeleton 或现有 Table loading。
- L1 空：标题「还没有第三方图片」；说明「请用当前语言打开网店逛一圈，扩展采集后回到这里刷新」。无主按钮（采集在店面，后台不能凭空拉第三方 CDN）。
- L1 有数据：行可点进 L2；无行内主 CTA。
- L2 空：该路径下图被淘汰或语言不匹配；提示返回 L1。
- 详情：与商品图相同，有额度且已授权 Files 才可点翻译。

## 9. 限制与故障

| 情况 | 行为 |
| --- | --- |
| 每分钟第 2 次 collect | 不写库，`accepted: false`，店面本分钟可再试（不记 posted） |
| Redis 挂了 | collect 拒绝；换图读路径直查 Turso（现有 cache 降级） |
| 索引 &gt; 10000 | 删最旧索引 + 页面关联，译图保留，店面仍能换 |
| GraphQL locales 失败 | 只写图不挂页 |
| 译图失败 | 现有 `imageTranslateError` 码；不删索引 |
| 主题编辑器 | 换图，不采集 |

环境变量只记名字：`STOREFRONT_COLLECT_PER_MINUTE`（默认 1）、`SWITCHER_IMAGE_TOTAL_CAP`（默认 10000）。不打印 `.env*` 值。

Redis 业务 key 必须以 `img:` 开头，禁止 `tsf:` / `translate:v4:` / `spark:`。

## 10. 文件落点

| 路径 | 职责 |
| --- | --- |
| `prisma/schema.prisma` + 新 migration | 两张表 |
| `app/lib/shopLocale.ts` | `resolveShopLocale` / 剥前缀 / 展示路径；纯函数 |
| `app/server/picture/storefrontPictureLanguage.ts` | 读图语言归一 |
| `app/server/storefront/pictureCollect.normalize.ts` | 入参规范化、帽、SQL 拼 upsert（可测） |
| `app/server/storefront/pictureCollect.server.ts` | 写 Turso、淘汰 |
| `app/server/storefront/storefrontCollectRateLimit.server.ts` | `img:sf:rl:collect:` 占槽 |
| `app/server/storefront/shopLocalesCache.server.ts` | Redis + GraphQL |
| `app/server/contentImage/switcherImages.server.ts` | L1/L2 查询 |
| `app/server/picture/picture.server.ts` | `content:` upsert 按 imageId+语言找最新行 |
| `app/routes/api.storefront.$.ts` | 注册 collect |
| `app/routes/app.third-party/**` | L1/L2/详情 |
| `app/routes/app._index/components/themeModule.tsx` | 第四张卡 |
| `app/routes/app.tsx` | NavMenu |
| `extensions/ciwi-image-switcher/assets/ciwi-main.js` | idle 换图 + 采集 + 语言再换 |
| `extensions/ciwi-image-switcher/assets/ciwi-api.js` | `CollectSwitcherImageData` |
| `public/locales/en/translation.json`、`zh-CN/translation.json` | 文案 |
| `scripts/switcher-image-collect.test.mjs` 等 | `node:test` 纯函数 |

店面 urlKey 算法不得与 `imageUrlKey.ts` 分叉；正则变更必须两边一起改，并补 `scripts/picture-urlkeys.test.mjs`。

## 11. 测试（实现时 TDD 纯函数优先）

本仓 `npm test` 只跑 `scripts/*.test.mjs`。新增：

- 采集规范化：Shopify CDN 丢弃、`ext:` 保留、query 不进 key、tiny 不在服务端再判（tiny 只在店面）、pagePath 截断 512。
- 语言：`zh-hans`→`zh-CN`；对不上 → null；剥 `/zh-CN/products/x`。
- 限流：第 1 次 true，第 2 次 false；key 前缀 `img:sf:rl:collect:`。
- 帽：total 10001 → overflow 1；不把 cap 算进译图表。
- `content:` upsert 策略用纯函数 `pickLatestContentPictureRow` 测，不在单测里连 Turso。

店面 JS 无现成 runner：实现后在测试店手工验（见验收）。不为此引入新测试框架。

## 12. UI 样例

### 首页卡

```text
[ 商品图片 ] [ 主题图片 ] [ 文章图片 ] [ 第三方图片 ]
                                         图标
                                      [ 管理 ]
```

### L1

```text
← 第三方图片                    语言 [Français ▾]   搜索路径 [    ]
请用当前语言打开网店，采集完成后刷新。

路径              图片数    最近出现
/                 12        2 分钟前
/products/hat     4         1 小时前
```

空态说明：「还没有第三方图片。请用当前语言打开网店逛一圈，然后回到这里刷新。」

### L2

```text
← /products/hat · Français
[缩略图]  https://cdn.judgeme.com/…   已译 | [翻译]
[缩略图]  https://cdn.loox.io/…       未译 | [翻译]
```

### 详情

与现有商品单图页同一信息层级：原图 | 各语言译图 | 翻译 / 上传 / 清除。不新做模型选择器样式。

文案：

| 角色 | 中文 | 英文 |
| --- | --- | --- |
| 卡/导航标题 | 第三方图片 | Third-party images |
| L1 空态 | 还没有第三方图片。请用当前语言打开网店逛一圈，然后回到这里刷新。 | No third-party images yet. Open your storefront in this language, browse a few pages, then refresh. |
| L2 操作 | 翻译 | Translate |

组件：Polaris `Page` / `Select`（本仓商品/主题页已用 Polarise Select + Ant Table，**不引入** TSF `InFlowSelect`，避免在 translate-image 单造一套）。表格继续 Ant Design，与 `/app/product` 一致。

## 13. 验收

1. 测试店装扩展，非主语言打开带 Judge.me（或任意非 Shopify `<img>`）的页面；约 2s+15s 内后台该语言 L1 出现该路径。
2. 主语言逛过的路径，切到未逛过的目标语言，L1 为空且有引导，不是报错。
3. L2 点一张译完，刷新店面该语言下所有出现该图的位置都换成译图；`ciwiOriginalSrc` 仍是原图。
4. 商品/主题 Shopify 图不出现在 L1/L2。
5. 主题编辑器能看到已有译图替换，后台不新增编辑器垃圾路径。
6. 同一分钟第二次 collect 不丢已采 key 的重试机会（sessionStorage 未误标）。
7. 属性高度 16 的图标不进 L2。
8. `npm test` 含新脚本；`npx prisma validate`。扩展改动后需对该 toml `shopify app deploy` 才在店面生效（实现阶段提醒，不自动发产）。

## 14. 实现优先级

1. **P0** 表 + 采集规范化/限流/帽 + App Proxy collect + 店面采集与 idle 换图 + 语言归一读图 + `content:` upsert 防裂行 + L1/L2/详情闭环 + 首页/导航入口 + en/zh-CN 文案。
2. **P1** L1 路径搜索、空态文案打磨。
3. **P2（可延后）** 换图 Observer 听 `src`、首屏 200 key 之外补请求、删未调用的 GetShop/GetProduct API、30 天清理、其它 locale 机翻。
