# 图译商户 SES 邮件 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 在 `BogdaApps/translate-image` 接入五封腾讯 SES 商户邮件（欢迎 / 购积分 / 订阅激活 / 账期续费 / 批量图译完成），发送方式对齐 TSF，模板用图译 ID，并打脱敏相位日志。

**架构：** 纯函数 `emailFormat` 组装模板数据；`tencentSes.server.ts` 调 SDK；`fetchShopContact` 现拉 Shopify 邮箱；`billingEmail` / `jobCompleteEmail` 只暴露 `schedule*`（fire-and-forget）。挂钩挂在现有入账飞书点和 `completeRunningJob` / 创建即完成路径旁，不挡 webhook。

**技术栈：** Remix app（无独立 worker 发信）、Prisma/Turso、`tencentcloud-sdk-nodejs-ses@^4.1.263`、`node --test` + `scripts/lib/*.mjs` 镜像（仓库现有测试套路）。

**规格：** `docs/superpowers/specs/2026-11-19-merchant-ses-email-design.md`

**工作目录：** `D:\code\BogdaApps\translate-image`。不要改 `ciwi-translate` / `Spark`。不要打印 `.env*` 值。不要对生产 Turso 跑 migrate，除非用户二次确认。

---

## 文件结构

| 路径 | 职责 |
| --- | --- |
| `app/server/email/emailFormat.ts` | 纯函数：千分位、`/2000`、日期、时长、语言名、续费闸、五封 templateData |
| `scripts/lib/emailFormat.mjs` | 上述纯函数的 JS 镜像，供 `node --test` |
| `scripts/email-format.test.mjs` | 闸门与变量组装测试 |
| `app/server/email/tencentSes.server.ts` | SES 客户端、相位日志、`sendTencentTemplateEmail` |
| `app/server/shop/fetchShopContact.server.ts` | GraphQL 拉 `email` / `contactEmail` / `shopOwnerName` |
| `app/server/billing/email/billingEmail.server.ts` | 四封计费 `send*` / `schedule*` |
| `app/server/contentImage/jobCompleteEmail.server.ts` | `236766` + `emailSent` + tick 补发 |
| `prisma/schema.prisma` | `ImageTranslateJob.emailSent` |
| `prisma/migrations/20261119090000_job_email_sent/migration.sql` | `ALTER TABLE` + 索引 |
| `package.json` | 依赖 SES SDK；`test` 脚本加新文件 |
| `env.d.ts` | SES 环境变量名（无值） |
| 挂钩：`quota.server.ts`、`grants.server.ts`、`subscription.server.ts`、`imageTranslateLoop.server.ts`、`contentImageJobs.server.ts` | 只加 `schedule*` |

不改：飞书文案、入账闸、年付拨额度飞书、Shopify webhook 订阅。

---

### 任务 1：纯函数 emailFormat + 失败测试

**文件：**
- 创建：`scripts/lib/emailFormat.mjs`
- 创建：`scripts/email-format.test.mjs`
- 修改：`package.json` 的 `"test"` 脚本，在列表末尾追加 `scripts/email-format.test.mjs`

- [ ] **步骤 1：写 `scripts/lib/emailFormat.mjs`**

```js
export function formatUsNumber(n) {
  return Number(n).toLocaleString("en-US");
}

export function merchantTimes(credits) {
  return Math.floor(Number(credits) / 2000);
}

export function formatUtcDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function formatDurationMinutes(startedAt, finishedAt) {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const end = finishedAt instanceof Date ? finishedAt : new Date(finishedAt);
  const ms = Math.max(0, end.getTime() - start.getTime());
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `${minutes} min`;
}

export function displayLanguageName(code) {
  const raw = String(code || "").trim() || "—";
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(raw);
    return name && name !== raw ? `${name} (${raw})` : raw;
  } catch {
    return raw;
  }
}

export function planNameForEmail(shopifyPlanName, billingInterval) {
  const name = String(shopifyPlanName || "").trim() || "Plan";
  return String(billingInterval).toUpperCase() === "ANNUAL" ? `${name} yearly` : name;
}

export function shouldSendRenewalEmail(params) {
  if (params.hadTrial) return params.priorRenewalCount >= 1;
  return true;
}

export function maskEmail(email) {
  const trimmed = String(email || "").trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "(invalid)";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

export function buildWelcomeTemplateData(name) {
  return { name };
}

export function buildPurchaseTemplateData(params) {
  return {
    name: params.name,
    credits_purchased: formatUsNumber(merchantTimes(params.purchasedCredits)),
    credits_total: formatUsNumber(merchantTimes(params.remainingCredits)),
    purchase_time: formatUtcDate(params.purchaseTime),
  };
}

export function buildSubscribeTemplateData(params) {
  return {
    name: params.name,
    plan_name: planNameForEmail(params.shopifyPlanName, params.billingInterval),
    image_limit: formatUsNumber(merchantTimes(params.creditsPerPeriod)),
    activation_date: formatUtcDate(params.periodStart),
    next_billing_date: formatUtcDate(params.periodEnd),
  };
}

export function buildRenewalTemplateData(params) {
  return {
    name: params.name,
    plan_name: planNameForEmail(params.shopifyPlanName, params.billingInterval),
    new_cycle_images: formatUsNumber(merchantTimes(params.creditsPerPeriod)),
    current_image_balance: formatUsNumber(merchantTimes(params.remainingCredits)),
  };
}

export function buildJobCompleteTemplateData(params) {
  return {
    name: params.name,
    target_language: displayLanguageName(params.targetLanguage),
    total_images: formatUsNumber(params.total),
    image_count: formatUsNumber(params.done),
    failed_count: formatUsNumber(params.failed),
    skipped_count: formatUsNumber(params.skipped),
    duration: formatDurationMinutes(params.createdAt, params.finishedAt),
    credits_used: formatUsNumber(params.creditsUsed),
    credits_remaining: formatUsNumber(params.creditsRemaining),
  };
}
```

- [ ] **步骤 2：写 `scripts/email-format.test.mjs`**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJobCompleteTemplateData,
  buildPurchaseTemplateData,
  buildRenewalTemplateData,
  buildSubscribeTemplateData,
  formatDurationMinutes,
  formatUtcDate,
  maskEmail,
  merchantTimes,
  planNameForEmail,
  shouldSendRenewalEmail,
} from "./lib/emailFormat.mjs";

test("merchantTimes floors credits / 2000", () => {
  assert.equal(merchantTimes(200000), 100);
  assert.equal(merchantTimes(1999), 0);
});

test("shouldSendRenewalEmail skips first charge after trial", () => {
  assert.equal(shouldSendRenewalEmail({ hadTrial: false, priorRenewalCount: 0 }), true);
  assert.equal(shouldSendRenewalEmail({ hadTrial: true, priorRenewalCount: 0 }), false);
  assert.equal(shouldSendRenewalEmail({ hadTrial: true, priorRenewalCount: 1 }), true);
});

test("planNameForEmail appends yearly", () => {
  assert.equal(planNameForEmail("Basic", "ANNUAL"), "Basic yearly");
  assert.equal(planNameForEmail("Pro", "MONTHLY"), "Pro");
});

test("purchase template uses /2000", () => {
  const data = buildPurchaseTemplateData({
    name: "Ada",
    purchasedCredits: 20000,
    remainingCredits: 220000,
    purchaseTime: new Date(Date.UTC(2026, 10, 19)),
  });
  assert.equal(data.credits_purchased, "10");
  assert.equal(data.credits_total, "110");
  assert.equal(data.purchase_time, "2026-11-19");
});

test("subscribe template uses Shopify period dates", () => {
  const data = buildSubscribeTemplateData({
    name: "Ada",
    shopifyPlanName: "Basic",
    billingInterval: "ANNUAL",
    creditsPerPeriod: 200000,
    periodStart: new Date(Date.UTC(2026, 0, 1)),
    periodEnd: new Date(Date.UTC(2027, 0, 1)),
  });
  assert.equal(data.plan_name, "Basic yearly");
  assert.equal(data.image_limit, "100");
  assert.equal(data.activation_date, "2026-01-01");
  assert.equal(data.next_billing_date, "2027-01-01");
});

test("job complete uses raw credits not /2000", () => {
  const data = buildJobCompleteTemplateData({
    name: "Ada",
    targetLanguage: "zh-CN",
    total: 10,
    done: 7,
    failed: 1,
    skipped: 2,
    createdAt: new Date("2026-11-19T00:00:00.000Z"),
    finishedAt: new Date("2026-11-19T00:12:01.000Z"),
    creditsUsed: 14000,
    creditsRemaining: 186000,
  });
  assert.equal(data.image_count, "7");
  assert.equal(data.credits_used, "14,000");
  assert.equal(data.credits_remaining, "186,000");
  assert.equal(data.duration, "13 min");
  assert.match(data.target_language, /zh-CN/);
});

test("formatDurationMinutes floors up to at least 1", () => {
  assert.equal(
    formatDurationMinutes("2026-11-19T00:00:00.000Z", "2026-11-19T00:00:10.000Z"),
    "1 min",
  );
});

test("maskEmail hides local part", () => {
  assert.equal(maskEmail("owner@shop.com"), "ow***@shop.com");
});

test("formatUtcDate is UTC date only", () => {
  assert.equal(formatUtcDate(new Date("2026-11-19T23:30:00.000Z")), "2026-11-19");
});
```

- [ ] **步骤 3：把 `scripts/email-format.test.mjs` 加进 `package.json` 的 `test` 脚本**（空格分隔，插在现有列表最后）

- [ ] **步骤 4：跑测试确认通过**

```bash
node --test scripts/email-format.test.mjs
```

预期：PASS，全部 test 绿。

- [ ] **步骤 5：Commit**

```bash
git add scripts/lib/emailFormat.mjs scripts/email-format.test.mjs package.json
git commit -m "test: add image-app SES email format helpers"
```

---

### 任务 2：TypeScript 镜像 emailFormat.ts

**文件：**
- 创建：`app/server/email/emailFormat.ts`

- [ ] **步骤 1：把 `scripts/lib/emailFormat.mjs` 的同一套导出写成 TS**（函数名、参数、返回值必须与 mjs 一致）。类型：

```ts
export function formatUsNumber(n: number): string;
export function merchantTimes(credits: number): number;
export function formatUtcDate(value: Date | string): string;
export function formatDurationMinutes(startedAt: Date | string, finishedAt: Date | string): string;
export function displayLanguageName(code: string): string;
export function planNameForEmail(shopifyPlanName: string, billingInterval: string): string;
export function shouldSendRenewalEmail(params: {
  hadTrial: boolean;
  priorRenewalCount: number;
}): boolean;
export function maskEmail(email: string): string;
export function buildWelcomeTemplateData(name: string): Record<string, string>;
export function buildPurchaseTemplateData(params: {
  name: string;
  purchasedCredits: number;
  remainingCredits: number;
  purchaseTime: Date | string;
}): Record<string, string>;
export function buildSubscribeTemplateData(params: {
  name: string;
  shopifyPlanName: string;
  billingInterval: string;
  creditsPerPeriod: number;
  periodStart: Date | string;
  periodEnd: Date | string;
}): Record<string, string>;
export function buildRenewalTemplateData(params: {
  name: string;
  shopifyPlanName: string;
  billingInterval: string;
  creditsPerPeriod: number;
  remainingCredits: number;
}): Record<string, string>;
export function buildJobCompleteTemplateData(params: {
  name: string;
  targetLanguage: string;
  total: number;
  done: number;
  failed: number;
  skipped: number;
  createdAt: Date | string;
  finishedAt: Date | string;
  creditsUsed: number;
  creditsRemaining: number;
}): Record<string, string>;
```

实现与 mjs 逐行同语义，不要从 `geminiImage.ts` 引 `languageName`。

- [ ] **步骤 2：Commit**

```bash
git add app/server/email/emailFormat.ts
git commit -m "feat: add SES email format helpers"
```

---

### 任务 3：腾讯 SES 发送层

**文件：**
- 修改：`package.json` dependencies 增加 `"tencentcloud-sdk-nodejs-ses": "^4.1.263"`
- 修改：`env.d.ts` 增加 `TENCENT_CLOUD_KEY_ID?` / `TENCENT_CLOUD_KEY?` / `TENCENT_SES_REGION?` / `TENCENT_FROM_EMAIL?`
- 创建：`app/server/email/tencentSes.server.ts`

- [ ] **步骤 1：安装依赖**

```bash
npm install tencentcloud-sdk-nodejs-ses@^4.1.263
```

- [ ] **步骤 2：实现 `tencentSes.server.ts`**

对齐 TSF `app/server/email/tencentSes.server.ts` + worker `doSend` 日志。要点：

```ts
import { ses } from "tencentcloud-sdk-nodejs-ses";
import { maskEmail } from "./emailFormat";

const LOG = "[tencentSes]";
const DEFAULT_CC = ["feynman@ciwi.ai", "yewen@ciwi.ai"] as const;
const FROM_EMAIL = process.env.TENCENT_FROM_EMAIL?.trim() || "support@msg.ciwi.ai";

function logDetail(phase: string, payload: Record<string, unknown>): void {
  console.info(`${LOG} ${phase} ${JSON.stringify(payload)}`);
}

export async function sendTencentTemplateEmail(params: {
  templateId: number;
  subject: string;
  templateData: Record<string, string>;
  to: string;
  cc?: string[];
}): Promise<boolean> {
  // 1. 无 client → logDetail ses-client-missing（只打 hasSecretId/hasSecretKey 布尔）return false
  // 2. to 空 → send-skipped reason=empty_recipient
  // 3. before-sdk-call：templateId, subject, to: maskEmail(to), cc 脱敏, templateDataKeyCount（不要把整封 templateData 里的邮箱再打一遍）
  // 4. client.SendEmail({ FromEmailAddress, Destination:[to], Cc, Subject, Template:{ TemplateID, TemplateData: JSON.stringify(templateData) } })
  // 5. 有 RequestId → after-sdk-call sendSuccess=true + requestId + elapsedMs
  // 6. catch → after-sdk-call-failed，console.error 只带 message，return false
}

export function resetTencentSesClientForTests(): void {
  _client = null;
}
```

凭证缺失时 `console.warn("[tencentSes] missing Tencent SES credentials")` 一次即可。

- [ ] **步骤 3：Commit**

```bash
git add package.json package-lock.json env.d.ts app/server/email/tencentSes.server.ts
git commit -m "feat: add Tencent SES sender with phase logs"
```

---

### 任务 4：fetchShopContact

**文件：**
- 创建：`app/server/shop/fetchShopContact.server.ts`

- [ ] **步骤 1：实现**

```ts
import { postShopGraphql } from "~/server/shop/shopAdminToken.server";

export type ShopContact = { email: string | null; ownerName: string | null };

const QUERY = `#graphql
  query ShopContactEmail {
    shop { email contactEmail shopOwnerName }
  }
`;

export async function fetchShopContact(shop: string): Promise<ShopContact> {
  const normalizedShop = shop.trim();
  if (!normalizedShop) return { email: null, ownerName: null };
  try {
    const body = await postShopGraphql({
      shop: normalizedShop,
      path: "shop_contact",
      timeoutMs: 2500,
      query: QUERY,
    });
    const node = body?.data?.shop;
    const email =
      (typeof node?.email === "string" && node.email.trim()) ||
      (typeof node?.contactEmail === "string" && node.contactEmail.trim()) ||
      null;
    const ownerName =
      typeof node?.shopOwnerName === "string" && node.shopOwnerName.trim()
        ? node.shopOwnerName.trim()
        : null;
    return { email, ownerName };
  } catch (err) {
    console.warn(`[fetchShopContact] failed shop=${normalizedShop}`, err instanceof Error ? err.message : err);
    return { email: null, ownerName: null };
  }
}
```

不读 `Session.accessToken`。不要改 `fetchShopEmailForChargeGuard` 的入账闸用途。

- [ ] **步骤 2：Commit**

```bash
git add app/server/shop/fetchShopContact.server.ts
git commit -m "feat: fetch Shopify shop contact for SES"
```

---

### 任务 5：计费四封 + 挂钩

**文件：**
- 创建：`app/server/billing/email/billingEmail.server.ts`
- 修改：`app/server/billing/quota.server.ts`（`created` 分支 `scheduleInstallFeishu` 旁）
- 修改：`app/server/billing/grants.server.ts`（`schedulePurchaseFeishu` 旁）
- 修改：`app/server/billing/subscription.server.ts`（activated 与 `archivePeriodAndRenew`）

常量：

```ts
const TEMPLATE_WELCOME = 158999;
const TEMPLATE_PURCHASE = 159001;
const TEMPLATE_SUBSCRIBE = 159003;
const TEMPLATE_RENEWAL = 159005;
const SUBJECT_WELCOME = "Welcome to Ciwi Image Translate — Start Localizing Your Images Instantly";
const SUBJECT_PURCHASE = "Image Translation Credits Have Been Added Successfully";
const SUBJECT_SUBSCRIBE = "Your Ciwi Image Translate Subscription Is Now Active";
const SUBJECT_RENEWAL = "Your Plan Has Renewed — Ciwi Image Translate";
const LOG = "[imgEmail]";
```

公共流程 `sendWithContact(shop, kind, build)`：

1. `logDetail("schedule-start", { shop, kind })`
2. `fetchShopContact` → `contact-resolved` `{ shop, hasEmail, to: maskEmail | null }`
3. 无 email → `send-skipped reason=no_recipient`，return false
4. `userName = ownerName || "there"`
5. `sendTencentTemplateEmail(...)`
6. 成功 / 失败相位日志；不飞书

`scheduleXxx(...): void` 一律：

```ts
void sendXxx(params).catch((error) => {
  console.error(`${LOG} unhandled kind=welcome shop=${shop}`, error);
});
```

- [ ] **步骤 1：欢迎**

`scheduleWelcomeEmail(shop)`。`ensureAccount` 在 `scheduleInstallFeishu(shop)` 后加 `scheduleWelcomeEmail(shop)`，仅 `created === true`。

- [ ] **步骤 2：购积分**

`schedulePurchaseEmail({ shop, purchasedCredits })`。内部 `getAccountQuota` 取 remaining，`purchaseTime = new Date()`。

`applyTokenPackPurchase` 在 `schedulePurchaseFeishu` 后、`return true` 前：

```ts
schedulePurchaseEmail({ shop, purchasedCredits: plan.credits });
```

- [ ] **步骤 3：订阅激活**

`scheduleSubscribeEmail({ shop, shopifyPlanName, billingInterval, creditsPerPeriod, periodStart, periodEnd })`。

`applyActiveSubscription` 里 `if (wasPending)` 且 `!skipAdd`，在 `scheduleSubscribeFeishu` 之后调用。缺日期则 skip 并打 `send-skipped reason=missing_period`。

- [ ] **步骤 4：账期续费**

在 `archivePeriodAndRenew`，`scheduleRenewalFeishu` 之后：

```ts
const renewalCountAfter = await prisma.billingLog.count({
  where: {
    shop,
    eventType: BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
    referenceId: subscription.shopifySubscriptionId,
  },
});
const priorRenewalCount = Math.max(0, renewalCountAfter - 1);
const hadTrial = subscription.trialEndsAt != null;
if (shouldSendRenewalEmail({ hadTrial, priorRenewalCount })) {
  if (await claimBillingLogFlag(renewedLog.id, "renewalEmailSent")) {
    scheduleRenewalEmail({
      shop,
      shopifyPlanName: next.shopifyPlanName,
      billingInterval: next.billingInterval,
      creditsPerPeriod: next.creditsPerPeriod,
    });
  }
} else {
  console.info(`[imgEmail] renewal skipped shop=${shop} hadTrial=${hadTrial} prior=${priorRenewalCount}`);
}
```

不要在 `maybeGrantAnnualCycle` / `scheduleAnnualCreditFeishu` 旁发信。

`scheduleRenewalEmail` 内部再读 `getAccountQuota` 填 `current_image_balance`。

- [ ] **步骤 5：Commit**

```bash
git add app/server/billing/email/billingEmail.server.ts app/server/billing/quota.server.ts app/server/billing/grants.server.ts app/server/billing/subscription.server.ts
git commit -m "feat: send image-app billing SES emails"
```

---

### 任务 6：批量完成信 + emailSent

**文件：**
- 修改：`prisma/schema.prisma` `ImageTranslateJob` 增加 `emailSent Boolean @default(false)`，并 `@@index([status, emailSent, finishedAt])`
- 创建：`prisma/migrations/20261119090000_job_email_sent/migration.sql`
- 创建：`app/server/contentImage/jobCompleteEmail.server.ts`（读任务、发信、置 `emailSent`、24h 补发查询都在此文件，不改 jobStore）
- 修改：`app/server/contentImage/imageTranslateLoop.server.ts`
- 修改：`app/server/contentImage/contentImageJobs.server.ts`

- [ ] **步骤 1：迁移 SQL**

```sql
ALTER TABLE "ImageTranslateJob" ADD COLUMN "emailSent" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "ImageTranslateJob_status_emailSent_finishedAt_idx"
  ON "ImageTranslateJob"("status", "emailSent", "finishedAt");
```

Prisma 字段：

```
emailSent Boolean @default(false)
```

SQLite/Turso 用 INTEGER 0/1，与表里 `retranslate` 一致。

- [ ] **步骤 2：跑 generate / validate（测库，不写产）**

```bash
npx prisma validate
npx prisma generate
```

预期：schema 合法。不要跑 `turso:migrate` 到 prod。

- [ ] **步骤 3：`jobCompleteEmail.server.ts`**

常量：`TEMPLATE_JOB_COMPLETE = 236766`，subject `Image Translation Task Is Complete — Ciwi Image Translate`。

`sendJobCompleteEmail(jobId: string): Promise<boolean>`：

1. 读任务；非 `COMPLETED` → skip `not_completed`
2. `emailSent` 已 true → skip `already_sent`
3. `finishedAt` 为空 → skip `missing_finished_at`
4. 拉 contact + `getAccountQuota`
5. `buildJobCompleteTemplateData`（credits 原值）
6. SES 成功后：

```sql
UPDATE ImageTranslateJob SET emailSent = 1, updatedAt = ? WHERE id = ? AND emailSent = 0
```

`scheduleJobCompleteEmail(jobId)`：void + catch。

`retryPendingJobCompleteEmails()`：

```sql
SELECT id FROM ImageTranslateJob
 WHERE status = 'COMPLETED' AND emailSent = 0
   AND finishedAt IS NOT NULL
   AND finishedAt >= ?
   AND finishedAt <= ?
 LIMIT 20
```

`finishedAt >= now-24h` 且 `finishedAt <= now-30s`（给首次 fire-and-forget 留窗口）。每条 `sendJobCompleteEmail`。

- [ ] **步骤 4：挂钩循环**

`imageTranslateLoop.server.ts` 的 `processJob`：

```ts
if (!item) {
  await completeRunningJob(job.id);
  scheduleJobCompleteEmail(job.id);
  console.log(`${LOG} completed job=${job.id}`);
  return;
}
```

`runImageTranslateTick` 末尾（claim 循环结束后）调用 `retryPendingJobCompleteEmails()`，错误只 log。

- [ ] **步骤 5：挂钩创建即完成**

`createContentImageJob` 在 `return { ok: true, data: toSummary(job) }` 前：

```ts
if (!pending.length) {
  scheduleJobCompleteEmail(job.id);
}
```

- [ ] **步骤 6：Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20261119090000_job_email_sent/migration.sql app/server/contentImage/jobCompleteEmail.server.ts app/server/contentImage/imageTranslateLoop.server.ts app/server/contentImage/contentImageJobs.server.ts
git commit -m "feat: send bulk image-translate complete email"
```

---

### 任务 7：全量验证

- [ ] **步骤 1：跑测试**

```bash
npm test
```

预期：原有测试 + `email-format.test.mjs` 全绿。

- [ ] **步骤 2：Prisma**

```bash
npx prisma validate
```

- [ ] **步骤 3：手工核对挂钩（读代码，不发真实邮件）**

确认以下各有且仅有一处 `schedule*`：

- `quota.server.ts` `created` → welcome
- `grants.server.ts` 购包成功 → purchase
- `subscription.server.ts` activated `!skipAdd` → subscribe
- `subscription.server.ts` `archivePeriodAndRenew` → renewal（带闸 + `renewalEmailSent`）
- `maybeGrantAnnualCycle` **没有** schedule 邮件
- `imageTranslateLoop` complete + tick 补发
- `createContentImageJob` 无 pending 时

- [ ] **步骤 4：测环境 SES（可选，需用户授权）**

只提变量名：`TENCENT_CLOUD_KEY_ID`、`TENCENT_CLOUD_KEY`、`TENCENT_FROM_EMAIL`。在测试店走安装 / 购包 / 订阅 / 跑一个会 COMPLETED 的批量任务，grep Render：`[imgEmail]`、`[tencentSes]`。不要对生产 migrate、不要对生产发信，除非用户明确「可以改产」。

---

## 实现优先级（执行时）

1. P0 — 任务 1–6：五封能发、日志完整
2. P1 — `emailSent` / `renewalEmailSent` 与 24h 补发（已含在任务 5–6）
3. P2 — SES 频控冷却、模板 ID env 覆盖（本计划不做）

---

## 自检

| 规格项 | 任务 |
| --- | --- |
| 158999 / 159001 / 159003 / 159005 | 5 |
| 236766 COMPLETED | 6 |
| `/2000` 仅计费 | 1 + 5 |
| 完成信原值积分 | 1 + 6 |
| 续费闸 + 年付 30 天不发 | 1 + 5 |
| Shopify 周期日期 | 1 + 5 |
| 年付 plan_name yearly | 1 |
| fetchShopContact | 4 |
| 相位日志不飞书 | 3 + 5 |
| emailSent 24h 补发 | 6 |
| skipAdd 不发订阅 | 5 |
| 不挡 webhook | 全部 schedule* |
