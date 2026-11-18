# 图片批量翻译实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。
>
> **本会话约束：** 写本计划时不得改产品代码。实现须等用户明确说「按这个做 / 开始写代码」。
>
> **规格：** `docs/superpowers/specs/2026-11-18-batch-image-translate-design.md`

**目标：** 商品 / 文章 / 主题 / 第三方四个入口对齐 TSF 的勾选批量译图：任务表 + Web 进程内认领循环 + TSF 列表壳 / 确认弹窗 / 任务条 / 详情。

**架构：** 纯函数（mjs + TS 双份）→ Prisma 任务表 → jobs/list API → `entry.server` setInterval 认领逐张调用现有译图函数。不新建 Worker，不引 TSF 包。列表壳从 TSF 拷贝到 `app/routes/component/contentImage/`。

**技术栈：** Remix 2、Prisma 6 + Turso、Shopify Admin GraphQL（application-only）、Polaris Modal + Ant Table、`node:test`（`scripts/*.test.mjs`）。

**已拍板：** 见规格第 1 节。P0 不含旧单图 URL 重定向、不含独立 Worker。

**非目标：** 见规格第 2 节。不要改店面采集 / 换图。不要改用户未提交的无关文件。

---

## 文件职责

| 路径 | 职责 |
| --- | --- |
| `scripts/lib/imageTranslateJobItems.mjs` + `app/server/contentImage/imageTranslateJobItems.ts` | kind、rowKey、去重、normalize、帽 20/500 |
| `scripts/lib/imageTranslateConfirmState.mjs` + `app/routes/component/contentImage/imageTranslateConfirmState.ts` | 确认态机 |
| `scripts/lib/imageTranslateClaim.mjs` | `isClaimEligible(nowIso, heartbeatAt, staleMs)` |
| `scripts/image-translate-job-items.test.mjs` 等 | 上述纯函数 |
| `prisma/schema.prisma` + `prisma/migrations/20261118180000_image_translate_job/migration.sql` | 两张表 |
| `app/server/contentImage/contentImageJobs.server.ts` | 创建 / 控制 / current / failed / detail |
| `app/server/contentImage/imageTranslateJobStore.server.ts` | raw SQL 认领 / 下一张 / 记结果 |
| `app/server/contentImage/imageTranslateLoop.server.ts` | setInterval；并发 1 |
| `app/server/contentImage/resourceImages.server.ts` | 商品 / 文章列表与展开 |
| `app/server/contentImage/themeImages.server.ts` + refs/schema/cache | 从 TSF 拷贝主题 JSON 扫图，Redis `img:theme-images:v1:` |
| `app/server/contentImage/imageList.server.ts` | list 分发 |
| `app/server/picture/translateImage.server.ts` | 抽出 `runTranslateImageItem` |
| `app/entry.server.tsx` | 启动 loop |
| `app/routes/api.content-image.list.ts` | POST list |
| `app/routes/api.content-image.jobs.ts` | GET/POST jobs |
| `app/ui/components/InFlowSelect.tsx` | 从 TSF 拷贝 |
| `app/routes/component/contentImage/*` | 列表壳、表格、确认弹窗、任务条、hooks |
| `app/routes/app.product/route.tsx` 等 | 四入口改为壳 |
| `app/routes/app.products.$productId/index.tsx` 等 | L2 资源图列表 |
| `app/routes/app.image_job.$jobId.tsx` | 详情 |
| `public/locales/en/translation.json` + `zh-CN/translation.json` | 文案 |
| `package.json` | `test` glob 纳入新 `scripts/*.test.mjs` |

TSF 只读拷贝源见规格第 12 节。拷贝后删除 `@ciwi/translation-core` import，改为本仓 `~/server/picture/imageUrlKey` 与 `~/server/picture/imageTranslate`。

---

### 任务 1：任务行纯函数

**文件：**
- 创建：`scripts/lib/imageTranslateJobItems.mjs`
- 创建：`scripts/image-translate-job-items.test.mjs`
- 创建：`app/server/contentImage/imageTranslateJobItems.ts`（签名与 mjs 一致）

- [ ] **步骤 1：写失败测试** `scripts/image-translate-job-items.test.mjs`

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  parseImageTranslateJobKind,
  imageRowKey,
  dedupeByImageRowKey,
  normalizeImageJobItems,
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
} from "./lib/imageTranslateJobItems.mjs";

test("kind 只有 product 为 product", () => {
  assert.equal(parseImageTranslateJobKind("product"), "product");
  assert.equal(parseImageTranslateJobKind("content"), "content");
  assert.equal(parseImageTranslateJobKind("nope"), "content");
});

test("rowKey：有 productId 则 gid::urlKey", () => {
  assert.equal(
    imageRowKey({ urlKey: "files/a.jpg", productId: "gid://shopify/Product/1" }),
    "gid://shopify/Product/1::files/a.jpg",
  );
  assert.equal(imageRowKey({ urlKey: "files/a.jpg", productId: "" }), "files/a.jpg");
});

test("product kind 丢非 Shopify URL；content 保留 ext:", () => {
  const product = normalizeImageJobItems(
    [{ imageUrl: "https://cdn.judgeme.com/a.jpg", productId: "gid://shopify/Product/1" }],
    "product",
  );
  assert.equal(product.length, 0);
  const content = normalizeImageJobItems(
    [{ imageUrl: "https://cdn.judgeme.com/a.jpg?width=100", title: "Review" }],
    "content",
  );
  assert.equal(content.length, 1);
  assert.ok(content[0].urlKey.startsWith("ext:"));
  assert.equal(content[0].productId, "");
});

test("同 urlKey×productId 去重，帽常量", () => {
  assert.equal(CONTENT_IMAGE_JOB_MAX_ITEMS, 500);
  assert.equal(IMAGE_RESOURCE_BULK_SELECT_MAX, 20);
  const rows = normalizeImageJobItems(
    [
      { imageUrl: "https://cdn.shopify.com/s/files/1/a.jpg", productId: "gid://shopify/Product/1" },
      { imageUrl: "https://cdn.shopify.com/s/files/1/a.jpg?v=2", productId: "gid://shopify/Product/1" },
    ],
    "product",
  );
  assert.equal(rows.length, 1);
  assert.equal(isResourceImagesBatchTruncated(21, false), true);
  assert.equal(isResourceImagesBatchTruncated(20, true), true);
  assert.equal(isResourceImagesBatchTruncated(2, false), false);
});
```

- [ ] **步骤 2：运行确认失败**

```bash
cd D:\code\BogdaApps\translate-image
node --test scripts/image-translate-job-items.test.mjs
```

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现 mjs + ts**

对齐 TSF `imageTranslateJobItems.ts`。Shopify URL 规范化用本仓 `scripts` 里已有 urlKey 逻辑：不要在 mjs 里复制第二套正则。若 mjs 无法 import TS，把 `pictureUrlKey` / `imageUrlKey` / `canonicalShopifyImageUrl` 的纯函数抽到 `scripts/lib/pictureUrlKey.mjs`（若尚未抽出，从 `app/server/picture/imageUrlKey.ts` 镜像，并改 `scripts/picture-urlkeys.test.mjs` 引用，避免分叉）。

`normalizeImageJobItems` 行为必须与规格第 1.11 / 第 7 节一致。

- [ ] **步骤 4：测试通过**

```bash
node --test scripts/image-translate-job-items.test.mjs
```

预期：PASS。

- [ ] **步骤 5：Commit**

```bash
git add scripts/lib/imageTranslateJobItems.mjs scripts/image-translate-job-items.test.mjs app/server/contentImage/imageTranslateJobItems.ts
git commit -m "test: 图片批量任务行去重与 kind"
```

（实现阶段才 commit；本计划书写时不要提交。）

---

### 任务 2：确认态机 + 认领资格

**文件：**
- 创建：`scripts/lib/imageTranslateConfirmState.mjs`
- 创建：`scripts/lib/imageTranslateClaim.mjs`
- 创建：`scripts/image-translate-confirm.test.mjs`
- 创建：`app/routes/component/contentImage/imageTranslateConfirmState.ts`

- [ ] **步骤 1：写失败测试**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { resolveImageTranslateConfirmState } from "./lib/imageTranslateConfirmState.mjs";
import { isClaimEligible } from "./lib/imageTranslateClaim.mjs";

test("够全量 → ready", () => {
  const s = resolveImageTranslateConfirmState({
    count: 10,
    creditsPerImage: 2000,
    remainingCredits: 20000,
    quotaOfferMode: "paid",
  });
  assert.equal(s.scenario, "ready");
  assert.equal(s.canStartPartial, false);
  assert.equal(s.requiredCredits, 20000);
});

test("只够部分 → insufficient_paid + partial", () => {
  const s = resolveImageTranslateConfirmState({
    count: 10,
    creditsPerImage: 2000,
    remainingCredits: 5000,
    quotaOfferMode: "paid",
  });
  assert.equal(s.canStartPartial, true);
  assert.equal(s.affordableCount, 2);
});

test("一张都不够走 offerMode", () => {
  const cases = [
    ["trial", "insufficient_trial"],
    ["pricing", "insufficient_pricing"],
    ["paid", "insufficient_paid"],
  ];
  for (const [mode, scenario] of cases) {
    const s = resolveImageTranslateConfirmState({
      count: 3,
      creditsPerImage: 2000,
      remainingCredits: 100,
      quotaOfferMode: mode,
    });
    assert.equal(s.canStartPartial, false);
    assert.equal(s.affordableCount, 0);
    assert.equal(s.scenario, scenario);
  }
});

test("remaining null 当 ready", () => {
  const s = resolveImageTranslateConfirmState({
    count: 2,
    creditsPerImage: 2000,
    remainingCredits: null,
    quotaOfferMode: "paid",
  });
  assert.equal(s.scenario, "ready");
});

test("心跳过期可认领", () => {
  const now = Date.parse("2026-11-18T12:00:00.000Z");
  const staleMs = 10 * 60 * 1000;
  assert.equal(isClaimEligible({ status: "QUEUED", heartbeatAt: null, now, staleMs }), true);
  assert.equal(
    isClaimEligible({
      status: "RUNNING",
      heartbeatAt: "2026-11-18T11:49:00.000Z",
      now,
      staleMs,
    }),
    true,
  );
  assert.equal(
    isClaimEligible({
      status: "RUNNING",
      heartbeatAt: "2026-11-18T11:55:00.000Z",
      now,
      staleMs,
    }),
    false,
  );
  assert.equal(isClaimEligible({ status: "PAUSED", heartbeatAt: null, now, staleMs }), false);
});
```

`quotaOfferMode` 映射与 TSF `resolveScenarioFromOfferMode` 一致：trial → `insufficient_trial`，pricing → `insufficient_pricing`，paid → `insufficient_paid`。一张都不够且 mode=paid 时 `canStartPartial` 仍为 false。

- [ ] **步骤 2：跑测失败 → 实现 → 跑通 → 暂不 commit 等到任务 3 一起也可。** 实现阶段单独 commit：`test: 图片批量确认态机与认领资格`

---

### 任务 3：Prisma 任务表

**文件：**
- 修改：`prisma/schema.prisma`（追加规格第 4 节两个 model，不要改 `UserPicture`）
- 创建：`prisma/migrations/20261118180000_image_translate_job/migration.sql`

- [ ] **步骤 1：写 SQL**（SQLite / Turso）

```sql
CREATE TABLE "ImageTranslateJob" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "shop" TEXT NOT NULL,
  "targetLanguage" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'content',
  "status" TEXT NOT NULL,
  "pauseReason" TEXT,
  "retranslate" INTEGER NOT NULL DEFAULT 0,
  "total" INTEGER NOT NULL DEFAULT 0,
  "done" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "creditsUsed" INTEGER NOT NULL DEFAULT 0,
  "claimedBy" TEXT,
  "heartbeatAt" DATETIME,
  "finishedAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "ImageTranslateJob_shop_createdAt_idx" ON "ImageTranslateJob"("shop", "createdAt");
CREATE INDEX "ImageTranslateJob_shop_kind_createdAt_idx" ON "ImageTranslateJob"("shop", "kind", "createdAt");
CREATE INDEX "ImageTranslateJob_status_updatedAt_idx" ON "ImageTranslateJob"("status", "updatedAt");

CREATE TABLE "ImageTranslateJobItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "jobId" TEXT NOT NULL,
  "shop" TEXT NOT NULL,
  "urlKey" TEXT NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "productId" TEXT NOT NULL DEFAULT '',
  "resourceTitle" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "error" TEXT,
  "imageAfterUrl" TEXT,
  "credits" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ImageTranslateJobItem_jobId_urlKey_productId_key"
  ON "ImageTranslateJobItem"("jobId", "urlKey", "productId");
CREATE INDEX "ImageTranslateJobItem_jobId_status_idx" ON "ImageTranslateJobItem"("jobId", "status");
```

- [ ] **步骤 2：** `npx prisma validate` 通过；`npx prisma generate`。测环境 `npm run turso:migrate`（无 `--env=.env.prod`）。产库本计划不授权。

- [ ] **步骤 3：Commit** `feat: 图片批量任务表`

---

### 任务 4：jobs 服务（创建 / 控制 / 查询）

**文件：**
- 创建：`app/server/contentImage/contentImageJobs.server.ts`
- 创建：`scripts/image-translate-job-control.test.mjs`（控制转移纯函数，从 jobs 抽出 `controlTransition(intent)`）

- [ ] **步骤 1：控制表测试**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { controlTransition } from "./lib/imageTranslateJobControl.mjs";

test("pause/resume/cancel from", () => {
  assert.deepEqual(controlTransition("pause").from, ["QUEUED", "RUNNING"]);
  assert.equal(controlTransition("pause").status, "PAUSED");
  assert.equal(controlTransition("pause").pauseReason, "MANUAL");
  assert.deepEqual(controlTransition("resume").from, ["PAUSED"]);
  assert.equal(controlTransition("resume").status, "QUEUED");
  assert.deepEqual(controlTransition("cancel").from, ["QUEUED", "RUNNING", "PAUSED"]);
  assert.equal(controlTransition("bogus"), null);
});
```

- [ ] **步骤 2：实现 `createContentImageJob`**

对齐 TSF `contentImageJobs.server.ts`，差异：

- 额度：`getAccountQuota` / `remainingOf`（本仓 `quota.server.ts`），不够一张返回 `IMAGE_TRANSLATE_INSUFFICIENT_CREDITS`（`"额度不够"`）。
- scope：本仓 `sessionCanWriteFiles`。
- 已译：商品用 `listListingPictures` 若尚无此 helper，则 `UserPicture` 查 `shop + languageCode + urlKey + imageId=productId` 且 `imageAfterUrl` 非空；content 用现有 `listPicturesByUrlKeys` / `pickLatestContentPictureRow`。
- items 先 `normalizeImageJobItems` 再 `slice(0, 500)`。
- 无 PENDING → 直接 COMPLETED。
- 已有 ACTIVE → `JOB_ACTIVE`。

- [ ] **步骤 3：实现 GET 查询** `getCurrentContentImageJob`（任意 kind 的 ACTIVE 最新一条）、`getContentImageJobDetail`、`listFailedImageItems`（status=FAILED，按 updatedAt desc，同 urlKey×productId 去重）。

- [ ] **步骤 4：Commit** `feat: 图片批量任务创建与控制`

---

### 任务 5：认领 store + 循环

**文件：**
- 创建：`app/server/contentImage/imageTranslateJobStore.server.ts`
- 创建：`app/server/contentImage/imageTranslateLoop.server.ts`
- 修改：`app/server/picture/translateImage.server.ts`（抽出 `runTranslateImageItem`）
- 修改：`app/entry.server.tsx`

- [ ] **步骤 1：抽出 `runTranslateImageItem`**

签名：

```ts
export async function runTranslateImageItem(args: {
  shop: string;
  graphql: ShopifyFilesGraphql;
  imageId: string;
  imageUrl: string;
  targetLanguage: string;
  model: string;
  alt?: string;
}): Promise<{ url: string; fileId: string }>;
```

内部：`precheckCredits` → `translateImageToShopifyFiles` → `upsertUserPictureFile` → `deductCredits`。单张 `translateImageToFiles` 改为调它。循环也调它。禁止两套扣费。

- [ ] **步骤 2：store raw SQL** 从 TSF `imageTranslateJobStore.ts` 拷贝，Prisma 改为 `prisma.$queryRaw` / `$executeRaw` 或 `db.server` 的 libsql execute。心跳比较用任务 2 的 `isClaimEligible` 同样的 ISO 规则。函数：`claimImageTranslateJob`、`nextPendingItem`、`recordItemOutcome`（同时累加 job.done/failed/skipped/creditsUsed、刷新 heartbeat）、`pauseRunningJob`、`completeRunningJob`、`requeueRunningJob`、`failRemainingPendingItems`、`readJobStatus`。

- [ ] **步骤 3：loop**

```ts
const POLL_MS = Math.max(2000, Number(process.env.IMAGE_TRANSLATE_POLL_MS) || 10_000);
const MAX_JOBS = Math.max(1, Math.floor(Number(process.env.IMAGE_TRANSLATE_MAX_JOBS) || 1));
const STALE_MS = 10 * 60 * 1000;
const running = new Set<string>();

export function startImageTranslateLoop() {
  if (globalThis.__imgTranslateLoopStarted) return;
  globalThis.__imgTranslateLoopStarted = true;
  const tick = () => {
    void runImageTranslateTick().catch((err) =>
      console.error("[imageTranslate] tick", err),
    );
  };
  setTimeout(tick, 5_000);
  setInterval(tick, POLL_MS);
}

async function runImageTranslateTick() {
  while (running.size < MAX_JOBS) {
    const job = await claimImageTranslateJob(`web-${process.pid}`, STALE_MS);
    if (!job) return;
    running.add(job.id);
    void processJob(job).finally(() => running.delete(job.id));
  }
}
```

`processJob` 对齐 TSF `imageTranslateWorker.processJob`：每张前 `readJobStatus === RUNNING`；未重译且已译 → SKIPPED；`precheckCredits` 失败 → `pauseRunningJob(QUOTA_INSUFFICIENT)`；否则 `runTranslateImageItem`；连续 2 次 `GEMINI_RATE_LIMITED` → `failRemainingPendingItems`。graphql 用 `getShopAdmin(job.shop)`。缺 scope → `SCOPE_MISSING`。`entry.server.tsx` 在 `startBillingReconcileLoop()` 后调用 `startImageTranslateLoop()`。

- [ ] **步骤 4：Commit** `feat: 图片批量进程内认领循环`

---

### 任务 6：list API（商品 / 文章 / 主题 / 第三方展开）

**文件：**
- 创建：`app/server/contentImage/resourceImages.server.ts`（含 `groupProductResourceImages` 导出给测试）
- 创建：`scripts/group-product-resource-images.test.mjs`
- 创建：`app/server/contentImage/themeImages.server.ts` 等（TSF 拷贝）
- 创建：`app/server/contentImage/imageList.server.ts`
- 创建：`app/routes/api.content-image.list.ts`
- 修改：现有 `switcherImages.server.ts`，增加 `pagePaths[]` 批量（若尚未有）

- [ ] **步骤 1：`groupProductResourceImages` 测试**（规格 7.1）

```js
test("相册优先于正文同一 urlKey", () => {
  const rows = groupProductResourceImages({
    productId: "gid://shopify/Product/1",
    title: "Hat",
    mediaUrls: ["https://cdn.shopify.com/s/files/1/a.jpg"],
    bodyUrls: ["https://cdn.shopify.com/s/files/1/a.jpg?v=9", "https://cdn.shopify.com/s/files/1/b.jpg"],
  });
  assert.equal(rows.length, 2);
  const a = rows.find((r) => r.urlKey.endsWith("files/1/a.jpg") || r.urlKey.includes("/a.jpg"));
  assert.equal(a.productId, "gid://shopify/Product/1");
  const b = rows.find((r) => r !== a);
  assert.equal(b.productId || "", "");
});
```

urlKey 断言用本仓 `pictureUrlKey` 实际输出，不要写死猜的 path。

- [ ] **步骤 2：商品 / 文章 GraphQL 列表** 对齐 TSF `resourceImages.server.ts` 的 LIST_QUERIES，本仓 admin 走 `authenticate.admin` 的 `admin.graphql`。L1 只返回有图资源。`imageCount` / `translatedImageCount`（有 languageCode 时查 UserPicture）。

- [ ] **步骤 3：主题** 从 TSF `themeImages.server.ts`、`themeImageRefs.ts`、`themeImageSchema.ts`、`themeImageCache.server.ts` 拷贝。缓存 key `img:theme-images:v1:{shop}`，TTL 180s，空不写。graphql 用本仓 app-only。

- [ ] **步骤 4：`handleImageListRequest`** 规格 8.1 的 intent 表。`resourceIds` / `pagePaths` slice 20，items cap 500，`truncated` 标志。

- [ ] **步骤 5：Commit** `feat: 图片批量列表与展开 API`

---

### 任务 7：jobs HTTP + 列表壳组件

**文件：**
- 创建：`app/routes/api.content-image.jobs.ts`
- 从 TSF 拷贝并改 import 到 `app/routes/component/contentImage/`：
  - `InFlowSelect` → `app/ui/components/InFlowSelect.tsx`
  - `ImageManageListShell` / `ImageManageToolbar` / `ContentImageResourceTable` / `ContentImageConfirmModal`（Modal 改为 Polaris `Modal`）/ `ContentImageJobBar` / `ContentImageCompareModal` / `ImageRowStatusBadge` / `ImageTranslationFailureHint`
  - hooks：`useBatchTranslate` / `useContentImageJob` / `useImageRowLiveStatus` / `useRecentImageFailures` / `useImageTranslateQuotaOffer` / `useContentImageActions` / `contentImageClient.ts`
- 修改：`public/locales/en/translation.json`、`zh-CN/translation.json`（规格 9.4 键；确认弹窗不足额文案）

Polaris Modal：`primaryAction` / `secondaryActions` 放 footer，不要把主按钮放 children。`InFlowSelect` 菜单不要 portal。买积分调用现有 `AddCreaditsModal`（`openModal` 状态放壳上）。升级 `navigate("/app/pricing")`。`quotaOfferMode` 用 Redux `userConfig.plan.type` + `isNew`（与 TSF hook 相同分流）。

`contentImageClient.ts` 的 fetch 路径改本仓 `/api/content-image/jobs` 与 `/api/content-image/list`。不要请求 TSF 域名。

- [ ] **步骤：拷贝后先改 import 能 `npm run build` 的类型通过，再接线。Commit** `feat: 图片批量列表壳与 jobs API`

---

### 任务 8：四个入口接入

**文件：**
- 重写：`app/routes/app.product/route.tsx` → `<ImageResourceListPage type="product" />` + loader `imageManageLoader("product")`
- 重写：`app/routes/app.products.$productId/index.tsx` → `<ImageResourceDetailPage type="product" />`
- 重写：`app/routes/app.article/route.tsx`、`app/routes/app.articles.$articleId/index.tsx`
- 重写：`app/routes/app.theme/route.tsx`（扁平行，无详情）
- 修改：`app/routes/app.third-party/route.tsx`、`app.third-party_.pages.$pagePath.tsx`（加勾选 / 任务条 / 确认；列表查询仍走 switcher）
- 创建：`app/routes/app.image_job.$jobId.tsx`
- 创建：`app/server/contentImage/imageManageLoader.server.ts`（locales + current job + remaining + canWriteFiles）

保留 URL。`TitleBar` 标题走 i18n。全局 `FilesAccessBanner` 已在 `app.tsx`，列表页不要再叠一个除非 loader 需要。

L2 行操作：翻译（1 张走同步）、View 对照、清除走现有 `/api/picture/delete`。上传替换走现有 `/api/picture/upload`。

- [ ] **Commit** `feat: 商品文章主题第三方接入批量译图`

不要在本任务顺手删 `app.$type.$productId.$imageId`（P1 重定向）。

---

### 任务 9：收尾验证

- [ ] `package.json` `test` 脚本补上新的 `scripts/image-translate-*.test.mjs`、`scripts/group-product-resource-images.test.mjs`
- [ ] `npm test`
- [ ] `npx prisma validate`
- [ ] 测环境 `npm run turso:migrate`
- [ ] 手工：规格第 15 节 1–7（测试店）
- [ ] Commit 文案：`test: 图片批量纯函数纳入 npm test`

---

## 规格覆盖自检

| 规格节 | 任务 |
| --- | --- |
| §1 勾选 / 帽 / 四入口 | 1, 6, 8 |
| §1 进程内循环 | 5 |
| §1 列表 UI / 确认 / 任务条 | 2, 7, 8 |
| §1 暂停继续取消 | 4, 5, 8 |
| §4 表 | 3 |
| §5 状态机 | 4 |
| §6 loop 参数 | 5 |
| §7 数据口径 | 6, 8 |
| §8 API | 4, 6, 7 |
| §9 URL / 弹窗 | 7, 8 |
| §10 单张共用 | 5 |
| §13 测试 | 1, 2, 4, 6, 9 |
| P1 旧 URL 重定向 | **无 P0 任务**（规格明确延后） |

无「待定」步骤。主题 JSON 扫图以 TSF 拷贝为准，不在本计划重设计解析规则。
