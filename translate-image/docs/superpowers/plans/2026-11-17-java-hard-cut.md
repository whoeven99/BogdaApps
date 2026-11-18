# 图译运行时硬切 Java 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。
>
> **本会话约束：** 写本计划时不得改产品代码。实现须等用户明确说「按这个做 / 开始写代码」。

**目标：** `translate-image` 商户路径（进 App、定价、试用、购包、订阅、取消、卸载）运行时零 `SERVER_URL` / Java 调用；账本只认本仓 Turso。

**架构：** 抄 TSF 模式但不共用 TSF 库。`CreditGrant` 继续做 Shopify GID 幂等入账；`Account` 增加 `hasUsedTrial` / `trialEndsAt`；进 App / 定价 loader 对 Shopify `activeSubscriptions` 做轻量对账。取消订阅优先本地真实 GID，占位符 `java-snapshot` 再 GraphQL。卸载留账本，只有 `SHOP_REDACT` 删除。P0 不发购包/订阅邮件。存量积分和试用由 `import-java-credits.mjs` 上线前只读 Java 回填。

**技术栈：** Remix 2、Prisma 6 + Turso/libSQL、Shopify Admin GraphQL（application-only token）、`node:test`（现有测试入口只跑 `scripts/*.test.mjs`）。

**已拍板（grill）：**
1. P0 运行时硬切；脚本可只读 Java
2. 试用落 `Account.hasUsedTrial` + `trialEndsAt`
3. 卸载留账本；`SHOP_REDACT` 才删
4. 取消 GID：本地真实 GID，否则 Shopify
5. 存量靠脚本回填；loader 不再 Java 快照
6. webhook 丢失：进 App / 定价 loader 轻量对账
7. P0 不发成功邮件、不接 SES

**非目标：** 双写 Java、SES/飞书/邀请码、独立 Worker、改图译主链、把 `JavaServer.ts` 里 Shopify GraphQL 辅助函数改名。

---

## 文件职责

| 路径 | 职责 |
| --- | --- |
| `prisma/schema.prisma` | `Account` 加试用两字段 |
| `prisma/migrations/20261117100000_account_trial/migration.sql` | Turso 迁移 SQL |
| `scripts/lib/billingState.mjs` | 纯函数：GID 合法性、试用结束时间、isNew / 弹窗条件（测试 + 回填脚本共用） |
| `scripts/billing-state.test.mjs` | 上述纯函数的 `node:test` |
| `app/server/billing/billingState.ts` | 与 mjs **签名和结果一致** 的 TS 端口，给运行时用 |
| `app/server/billing/quota.server.ts` | 去掉 Java 快照；quota 返回试用态；推断 `hasUsedTrial` |
| `app/server/billing/grants.server.ts` | 订阅入账写真实 GID + 试用字段；`java-snapshot` 仍跳过加积分 |
| `app/server/billing/uninstall.server.ts` | 卸载清套餐留账本；redact 删 Account/图片/Session |
| `app/server/billing/reconcile.server.ts` | Shopify 轻量对账 |
| `app/server/billing/resolveSubscriptionGid.server.ts` | 取消用：本地 GID 或 GraphQL |
| `app/routes/api.billing.quota.ts` | response 增加 `hasUsedTrial` / `isInFreePlanTime` / `trialEndsAt` |
| `app/routes/app.tsx` | 去掉 UserAdd / Java 试用 / 下发 `SERVER_URL`；loader 对账 |
| `app/routes/app.pricing/route.tsx` | 取消改为服务端解析 GID；loader 对账 |
| `app/routes/app.pricing/components/hasPayForFreePlanModal.tsx` | 去掉 `IsShowFreePlan` |
| `app/routes/app._index/route.tsx` | 不再把 `SERVER_URL` 塞进 loader |
| `app/routes/webhooks.tsx` | 只写 Turso；删 Java 订单/邮件/卸载 |
| `app/api/JavaServer.ts` | 删除全部 `SERVER_URL` 函数，保留 Shopify/GA 辅助 |
| `app/server/shop/userAdd.server.ts` | 删除 |
| `app/config/runtimeEnv.server.ts` | 运行时不再把 `SERVER_URL` 当必填 |
| `scripts/import-java-credits.mjs` | 回填积分 + `hasUsedTrial` + `trialEndsAt` |
| `package.json` | `test` 脚本纳入新测试文件（已是 `scripts/*.test.mjs` 则只需新文件被 glob 到） |

`package.json` 现有：`"test": "node --test scripts/picture-urlkeys.test.mjs"`。实现时改成 `node --test scripts/*.test.mjs`，否则新测试不会跑。

---

### 任务 1：试用 / GID 纯函数 + 测试

**文件：**
- 创建：`scripts/lib/billingState.mjs`
- 创建：`scripts/billing-state.test.mjs`
- 创建：`app/server/billing/billingState.ts`
- 修改：`package.json` 的 `test` 脚本

- [ ] **步骤 1：写失败测试** `scripts/billing-state.test.mjs`

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  JAVA_SNAPSHOT_SUBSCRIPTION_GID,
  computeTrialEndsAt,
  inferHasUsedTrial,
  isInFreePlanTime,
  isRealShopifySubscriptionGid,
  shouldShowTrialStartedModal,
} from "./lib/billingState.mjs";

test("isRealShopifySubscriptionGid 只认 AppSubscription GID", () => {
  assert.equal(
    isRealShopifySubscriptionGid("gid://shopify/AppSubscription/123"),
    true,
  );
  assert.equal(isRealShopifySubscriptionGid(JAVA_SNAPSHOT_SUBSCRIPTION_GID), false);
  assert.equal(isRealShopifySubscriptionGid(""), false);
  assert.equal(isRealShopifySubscriptionGid(null), false);
});

test("computeTrialEndsAt = createdAt + trialDays；trialDays<=0 为 null", () => {
  assert.equal(
    computeTrialEndsAt("2026-11-17T00:00:00.000Z", 5),
    "2026-11-22T00:00:00.000Z",
  );
  assert.equal(computeTrialEndsAt("2026-11-17T00:00:00.000Z", 0), null);
  assert.equal(computeTrialEndsAt("bad", 5), null);
});

test("isInFreePlanTime 只在未到期时为 true", () => {
  assert.equal(isInFreePlanTime("2099-01-01T00:00:00.000Z", "2026-11-17T00:00:00.000Z"), true);
  assert.equal(isInFreePlanTime("2020-01-01T00:00:00.000Z", "2026-11-17T00:00:00.000Z"), false);
  assert.equal(isInFreePlanTime(null, "2026-11-17T00:00:00.000Z"), false);
});

test("inferHasUsedTrial：显式标记 / 付费套餐 / 已有 grant 都算用过", () => {
  assert.equal(inferHasUsedTrial({ hasUsedTrial: true, plan: 1, grantCount: 0 }), true);
  assert.equal(inferHasUsedTrial({ hasUsedTrial: false, plan: 2, grantCount: 0 }), true);
  assert.equal(inferHasUsedTrial({ hasUsedTrial: false, plan: 1, grantCount: 1 }), true);
  assert.equal(inferHasUsedTrial({ hasUsedTrial: false, plan: 1, grantCount: 0 }), false);
});

test("试用成功弹窗：非新客 + 仍在试用窗 + 本地未展示过", () => {
  assert.equal(
    shouldShowTrialStartedModal({ isNew: false, isInFreePlanTime: true, hasShownLocal: false }),
    true,
  );
  assert.equal(
    shouldShowTrialStartedModal({ isNew: false, isInFreePlanTime: true, hasShownLocal: true }),
    false,
  );
  assert.equal(
    shouldShowTrialStartedModal({ isNew: false, isInFreePlanTime: false, hasShownLocal: false }),
    false,
  );
  assert.equal(
    shouldShowTrialStartedModal({ isNew: true, isInFreePlanTime: true, hasShownLocal: false }),
    false,
  );
});
```

- [ ] **步骤 2：跑测试确认失败**

```powershell
cd D:\code\BogdaApps\translate-image
node --test scripts/billing-state.test.mjs
```

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现 `scripts/lib/billingState.mjs`**

```js
export const JAVA_SNAPSHOT_SUBSCRIPTION_GID = "java-snapshot";
export const JAVA_SNAPSHOT_PERIOD_KEY = "once";
export const JAVA_SNAPSHOT_KIND = "java-snapshot";

export function javaSnapshotGrantGid(shop) {
  return `java-snapshot:${shop}`;
}

export function isRealShopifySubscriptionGid(gid) {
  return typeof gid === "string" && gid.startsWith("gid://shopify/AppSubscription/");
}

export function computeTrialEndsAt(createdAt, trialDays) {
  const days = Number(trialDays);
  if (!Number.isFinite(days) || days <= 0) return null;
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isInFreePlanTime(trialEndsAt, nowIso = new Date().toISOString()) {
  if (!trialEndsAt) return false;
  const end = new Date(trialEndsAt);
  const now = new Date(nowIso);
  if (Number.isNaN(end.getTime()) || Number.isNaN(now.getTime())) return false;
  return end.getTime() > now.getTime();
}

export function inferHasUsedTrial({ hasUsedTrial, plan, grantCount }) {
  if (hasUsedTrial) return true;
  if (Number(plan) > 1) return true;
  if (Number(grantCount) > 0) return true;
  return false;
}

export function shouldShowTrialStartedModal({ isNew, isInFreePlanTime, hasShownLocal }) {
  return isNew === false && isInFreePlanTime === true && hasShownLocal !== true;
}
```

- [ ] **步骤 4：TS 端口 `app/server/billing/billingState.ts`**

把上面的函数原样搬成 TS（`gid: string | null | undefined` 等）。**不要**从 app 去 import `scripts/lib/*.mjs`（Vite/Remix 运行时别绑脚本目录）。两份签名必须一致；改一边就改另一边。

- [ ] **步骤 5：改 `package.json` test**

```json
"test": "node --test scripts/*.test.mjs"
```

- [ ] **步骤 6：跑测试确认通过**

```powershell
npm test --prefix D:\code\BogdaApps\translate-image
```

预期：旧 picture-urlkeys 测试 + 新 billing-state 测试全部 PASS。

- [ ] **步骤 7：Commit**

```powershell
git add translate-image/scripts/lib/billingState.mjs translate-image/scripts/billing-state.test.mjs translate-image/app/server/billing/billingState.ts translate-image/package.json
git commit -m "test: add billing trial/gid helpers for java hard-cut"
```

---

### 任务 2：Prisma 试用字段

**文件：**
- 修改：`prisma/schema.prisma` 的 `Account`
- 创建：`prisma/migrations/20261117100000_account_trial/migration.sql`

- [ ] **步骤 1：改 schema**

`Account` 增加：

```prisma
  hasUsedTrial      Boolean   @default(false)
  trialEndsAt       DateTime?
```

放在 `currentPeriodEnd` 后面。不要拆积分池，不要加 `deletedAt`。

- [ ] **步骤 2：写 migration.sql**

```sql
ALTER TABLE "Account" ADD COLUMN "hasUsedTrial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Account" ADD COLUMN "trialEndsAt" DATETIME;
```

Turso/libSQL 支持这种 `ADD COLUMN`。本仓库用 `scripts/turso-migrate.mjs` 按文件夹名执行，不跑 `prisma migrate deploy` 指到 libsql。

- [ ] **步骤 3：生成 client**

```powershell
cd D:\code\BogdaApps\translate-image
npx prisma generate
npx prisma validate
```

预期：validate 通过。不要提交 `node_modules`。若 `app/generated/prisma` 有 diff 且仓库原本提交它，一并纳入。

- [ ] **步骤 4：Commit**

```powershell
git add translate-image/prisma/schema.prisma translate-image/prisma/migrations/20261117100000_account_trial/migration.sql
git commit -m "feat: store image-app trial flags on Account"
```

---

### 任务 3：quota 去掉 Java 快照

**文件：**
- 修改：`app/server/billing/quota.server.ts`
- 修改：`app/routes/api.billing.quota.ts`

- [ ] **步骤 1：`ensureAccount` 不再打 Java**

删除对 `GetUserWords` / `GetUserSubscriptionPlan` 的 import，删除 `fetchJavaQuotaSnapshot` / `applyJavaQuotaSnapshot` / `snapshotJavaQuotaIfNeeded`（运行时不再用）。**保留** `JAVA_SNAPSHOT_SUBSCRIPTION_GID` 常量（可改为从 `billingState.ts` 再导出），`grantCreditsOnce` 还要靠它避免重复加积分。

`ensureAccount` 只 upsert `Account`。若已有行且 `hasUsedTrial === false`，读 `CreditGrant` 计数，用 `inferHasUsedTrial` 写回 true（兜底漏跑脚本的付费店）。不要在请求路径调 `SERVER_URL`。

`getAccountQuota` 返回值增加：

```ts
hasUsedTrial: boolean;
trialEndsAt: Date | null;
isInFreePlanTime: boolean; // isInFreePlanTime(account.trialEndsAt?.toISOString())
```

`isNew` 不存在于服务端 quota 类型里；前端用 `hasUsedTrial` 取反。

- [ ] **步骤 2：`/api/billing/quota` response 加上三字段**

```ts
hasUsedTrial: quota.hasUsedTrial,
isInFreePlanTime: quota.isInFreePlanTime,
trialEndsAt: quota.trialEndsAt,
```

- [ ] **步骤 3：Commit**

```powershell
git commit -m "fix: stop snapshotting java quota on image-app boot"
```

---

### 任务 4：入账写试用 + 卸载本地化

**文件：**
- 修改：`app/server/billing/grants.server.ts`
- 创建：`app/server/billing/uninstall.server.ts`

- [ ] **步骤 1：扩展 `grantCreditsOnce` 的 `plan` 参数**

```ts
plan?: {
  plan: number;
  planType: string;
  feeType: number;
  subscriptionGid?: string;
  currentPeriodEnd?: Date | null;
  hasUsedTrial?: boolean;
  trialEndsAt?: Date | null;
};
```

`kind === "subscription"` 时：
- `skipAdd` 逻辑保持：`account.subscriptionGid === JAVA_SNAPSHOT_SUBSCRIPTION_GID` 则 `purchasePoints` 不加
- **即使 skipAdd** 也要写入真实 `subscriptionGid`、`hasUsedTrial: true`、`trialEndsAt`（如果传入）
- `kind === "pack"` 不改试用字段

`markPlanCancelled`：`plan=1, planType=Free, subscriptionGid=null`，**不要**清 `hasUsedTrial` / `trialEndsAt` / 积分。可把 `trialEndsAt` 留着（过期后 `isInFreePlanTime` 自然 false）。

- [ ] **步骤 2：实现卸载**

```ts
// app/server/billing/uninstall.server.ts
export async function handleAppUninstalled(shop: string): Promise<void> {
  await prisma.account.updateMany({
    where: { shop },
    data: { plan: 1, planType: "Free", subscriptionGid: null },
  });
  await prisma.session.deleteMany({ where: { shop } });
}

export async function handleShopRedact(shop: string): Promise<void> {
  await prisma.userPicture.deleteMany({ where: { shop } });
  await prisma.account.deleteMany({ where: { shop } }); // cascade grants/usages
  await prisma.session.deleteMany({ where: { shop } });
}
```

`UserPicture` **没有** FK 到 `Account`，redact 必须显式删图片行。不要调用 Java `Uninstall`。不要向外 `appSubscriptionCancel`（APP_UNINSTALLED 与 TSF 一样 skip outbound）。

- [ ] **步骤 3：Commit**

```powershell
git commit -m "feat: persist trial on subscribe and keep ledger on uninstall"
```

---

### 任务 5：Shopify 轻量对账 + 取消 GID

**文件：**
- 创建：`app/server/billing/reconcile.server.ts`
- 创建：`app/server/billing/resolveSubscriptionGid.server.ts`

对账 GraphQL（走已有 `admin.graphql` 或 `postShopGraphql`，**application-only**，不要读 `Session.accessToken`）：

```graphql
query BillingReconcile {
  currentAppInstallation {
    activeSubscriptions {
      id
      name
      status
      createdAt
      currentPeriodEnd
      trialDays
    }
  }
}
```

- [ ] **步骤 1：`reconcileShopBilling(shop, admin)` 行为（失败只 `console.warn`，不抛、不挡 loader）**

1. 拉 `activeSubscriptions`，过滤 `status === "ACTIVE"`。
2. **有 ACTIVE：** `yearly = interval === "ANNUAL"`（query 必须带 `lineItems { plan { pricingDetails { ... on AppRecurringPricing { interval } } } }`）。再用 `planGrantForName(name, yearly)`。与 webhook `purchase.interval !== "every_30_days"` 对齐。查不到 interval 则当月付，不要猜年付。
3. 对每个 ACTIVE 调 `grantCreditsOnce`（幂等）。`trialEndsAt = computeTrialEndsAt(createdAt, trialDays)`。
4. **无 ACTIVE 且本地 `plan > 1`：** 调 `markPlanCancelled(shop, account.feeType)`。`subscriptionGid === java-snapshot` 也走这步（Shopify 已无订阅则打回 Free，积分保留）。
5. 超时 / GraphQL 错：return，不改库。

Webhook 路径已经写入时，对账应因 `CreditGrant` 唯一键变成 no-op。

- [ ] **步骤 2：`resolveCancelSubscriptionGid(shop, admin)`**

```ts
const account = await prisma.account.findUnique({ where: { shop } });
if (isRealShopifySubscriptionGid(account?.subscriptionGid)) {
  return account.subscriptionGid;
}
// GraphQL activeSubscriptions[0].id；没有则 null
```

不要打 Java。

- [ ] **步骤 3：Commit**

```powershell
git commit -m "feat: reconcile image-app billing from Shopify on load"
```

---

### 任务 6：Webhook 去 Java

**文件：**
- 修改：`app/routes/webhooks.tsx`

- [ ] **步骤 1：删 Java import**

删除 `InsertOrUpdateOrder` / `SendOneTimeBuySuccessEmail` / `SendSubscribeSuccessEmail` / `Uninstall`。

- [ ] **步骤 2：改各 topic**

`APP_UNINSTALLED`：`await handleAppUninstalled(shop)`，ACK 200。不要打 Java。

`APP_PURCHASES_ONE_TIME_UPDATE`：只留 `grantCreditsOnce`（ACTIVE）。删 `InsertOrUpdateOrder` 和成功邮件。

`APP_SUBSCRIPTIONS_UPDATE`：
- ACTIVE：`grantCreditsOnce` + 用 payload `admin_graphql_api_id` 当 GID。`trialDays` / `createdAt` 若 payload 没有，用 webhook 自带的 `admin` GraphQL `node(id)` 查 `trialDays`/`createdAt`（查失败则 `trialEndsAt` 不写，等 loader 对账补）。
- CANCELLED / EXPIRED：`markPlanCancelled`。
- 删 Java 订单和邮件。

`SHOP_REDACT`：`await handleShopRedact(shop)`，不要 Java Uninstall。

每步仍 try/catch，失败也 200。

- [ ] **步骤 3：Commit**

```powershell
git commit -m "fix: write image-app billing webhooks to turso only"
```

---

### 任务 7：嵌入 UI 去 Java

**文件：**
- 修改：`app/routes/app.tsx`
- 修改：`app/routes/app.pricing/route.tsx`
- 修改：`app/routes/app.pricing/components/hasPayForFreePlanModal.tsx`
- 修改：`app/routes/app._index/route.tsx`
- 修改：`app/api/pictureClient.ts`（若 `fetchLocalQuota` 类型要认新字段；JS 无需改）

- [ ] **步骤 1：`app.tsx` loader**

`authenticate.admin` 之后：`ensureAccount(shop)` → `reconcileShopBilling(shop, admin)`（.catch 打日志）。  
loader **不再**返回 `server: process.env.SERVER_URL`。

- [ ] **步骤 2：`app.tsx` action**

删 `init` → `UserAdd` 整支。`initFetcher.submit` 可删；`getWords`/`getPlan` 在 mount 时直接 `fetchLocalQuota()`。`orderInfo` → `InsertOrUpdateOrder` 整支删掉（结账回跳不再写 Java 订单）。保留 `payInfo`（Shopify 一次性购买）和 `googleAnalytics`（`GoogleAnalyticClickReport`，不是 Java）。

- [ ] **步骤 3：`getPlan` / `checkFreeUsed` / `getWords`**

全部只走 `fetchLocalQuota()`：

```ts
const data = await fetchLocalQuota();
dispatch(setPlan({
  plan: {
    id: data.response.plan || 1,
    type: data.response.planType || "Free",
    feeType: data.response.feeType || 0,
    isInFreePlanTime: Boolean(data.response.isInFreePlanTime),
  },
}));
dispatch(setIsNew({ isNew: !data.response.hasUsedTrial }));
dispatch(setChars({ chars: data.response.usedPoints }));
dispatch(setTotalChars({ totalChars: data.response.purchasePoints }));
```

删 `IsInFreePlanTime` / `IsOpenFreePlan`。`globalStore.server` 不再赋值；`globalStore.shop` 可留。

- [ ] **步骤 4：定价页取消**

`handleCancelPlan` 不要调 `GetLatestActiveSubscribeId`。改为：

```ts
planCancelFetcher.submit(
  { cancelPlan: JSON.stringify(true) },
  { method: "POST" },
);
```

action 新分支 `cancelPlan`：`const gid = await resolveCancelSubscriptionGid(shop, admin)`；gid 为空则返回 `{ success: false, errorMsg: "NO_ACTIVE_SUBSCRIPTION" }`；有则现有 `appSubscriptionCancel`。成功后 **不要** `InsertOrUpdateFreePlan`。`markPlanCancelled` 交给 webhook / 下一次 reconcile。

- [ ] **步骤 5：定价 loader** 同样 `reconcileShopBilling`。

- [ ] **步骤 6：`hasPayForFreePlanModal`**

删 `IsShowFreePlan`。用 Redux 的 `isNew`、`plan.isInFreePlanTime` + localStorage `ciwi-image-translation-freetrial-hasShow`，走 `shouldShowTrialStartedModal`（把逻辑内联或从无法在浏览器 import 的 server 模块复制 4 行即可，**不要**在客户端 bundle `*.server.ts`）。

回填过来的老付费店 `isInFreePlanTime=false`，不会误弹「Got a 5-day free trial」。

- [ ] **步骤 7：`app._index/route.tsx`** 去掉 loader 的 `server` 字段；若组件解构了 `server` 但没用，一并删。

- [ ] **步骤 8：Commit**

```powershell
git commit -m "fix: read image-app trial and quota from turso only"
```

---

### 任务 8：删除运行时 Java 包装

**文件：**
- 修改：`app/api/JavaServer.ts`
- 删除：`app/server/shop/userAdd.server.ts`
- 修改：`app/config/runtimeEnv.server.ts`

- [ ] **步骤 1：从 `JavaServer.ts` 删除所有 `${process.env.SERVER_URL}` / `server` axios 函数**，包括未引用的死包装：

`SendOneTimeBuySuccessEmail` `SendSubscribeSuccessEmail` `GetUnTranslatedWords` `GetConversionData` `GetStoreLanguage` `GetRealTimeQuotaData` `GetTranslationQualityScore` `GetLatestActiveSubscribeId` `IsShowFreePlan` `GetUserSubscriptionPlan` `GetUserWords` `InsertOrUpdateOrder` `AddCharsByShopName` `Uninstall` `AddCharsByShopNameAfterSubscribe` `AddSubscriptionQuotaRecord` `UpdateUserPlan` `StartFreePlan` `InsertOrUpdateFreePlan` `UpdateStatus` `IsInFreePlanTime` `IsOpenFreePlan`

**保留：** `GoogleAnalyticClickReport`、`getAltFromHtml`、`updateManageTranslation`、`deleteSaveInShopify`、`extractShopifyImages`、`queryShopifyThemeData` 及其文件内私有 helper。这些不是 Java。

- [ ] **步骤 2：删除 `userAdd.server.ts`。** 确认无其它 import。

- [ ] **步骤 3：`runtimeEnv.server.ts`**

`logEnvCheck("Backend", ... SERVER_URL)` 改为不把 `SERVER_URL` 当必填。`HANDLE` 仍检查。`SERVER_URL` 只留给脚本。不要打印 env 值。

- [ ] **步骤 4：验收 grep（必须零商户路径命中）**

在 `translate-image` 下：

```powershell
rg "SERVER_URL" app --glob "!**/JavaServer.ts"
rg "pcUsers/|pc/orders|pc/userTrials|GetUserWords|UserAdd" app
```

允许：无命中，或只剩注释。`scripts/` 和 `migrate-cos-pictures-to-files.mjs` 仍可用 `SERVER_URL`。

`JavaServer` 的运行时 import 只应出现在：
- `app/routes/app.tsx` → `GoogleAnalyticClickReport`
- `app/routes/app.theme/route.tsx` → `queryShopifyThemeData`
- `app/routes/app.$type.$productId.$imageId/index.tsx` → `updateManageTranslation` / `deleteSaveInShopify`

- [ ] **步骤 5：Commit**

```powershell
git commit -m "chore: remove image-app runtime java client"
```

---

### 任务 9：扩展回填脚本（P1，但必须在上线前跑）

**文件：**
- 修改：`scripts/import-java-credits.mjs`

- [ ] **步骤 1：`fetchJavaQuota` 额外拉试用**

```js
const open = await javaJson(`${server}/pc/userTrials/isOpenFreePlan?shopName=${encodeURIComponent(shop)}`);
const inTrial = await javaJson(`${server}/pc/userTrials/isInFreePlanTime?shopName=${encodeURIComponent(shop)}`);
```

`javaJson` 对 `isOpenFreePlan` / `isInFreePlanTime` 用 POST（与现网 `JavaServer.ts` 一致）。

写入：
- `hasUsedTrial = Boolean(open?.response) || snapshot.plan > 1`
- `trialEndsAt`：若 `inTrial?.response === true`，用 `now + 5d` 的 ISO（Java 只给布尔，没有结束时间；上线后 loader 对账会按 Shopify `trialDays` 覆盖成准时间）。若 `inTrial` 为 false，写 `null`。

`INSERT/UPDATE Account` 列清单加上 `hasUsedTrial, trialEndsAt`。已有 `java-snapshot` 的店默认 skip；加 `--force-trial`：**只补两试用字段，不改积分**（给已经跑过旧脚本的店）。

dry-run 日志带 `hasUsedTrial=` / `inTrial=`。不打印 `SERVER_URL` 值。

- [ ] **步骤 2：头注释更新用法**

```
node scripts/import-java-credits.mjs
node scripts/import-java-credits.mjs --write
node scripts/import-java-credits.mjs --force-trial --write
```

- [ ] **步骤 3：Commit**

```powershell
git commit -m "feat: backfill image-app trial flags from java"
```

---

### 任务 10：收尾验证

- [ ] **步骤 1：测试**

```powershell
cd D:\code\BogdaApps\translate-image
npm test
npx prisma validate
```

- [ ] **步骤 2：类型 / 构建（按风险）**

```powershell
npx tsc --noEmit
```

若仓库没有独立 `tsc` 脚本，用现有 `npm run build`。不要为了验证去改 Shopify 真数据。

- [ ] **步骤 3：人工清单（实现者打勾，不要声称已在生产跑过）**

- [ ] 新店：进 App 不打 Java，Turso 有 Account，`hasUsedTrial=false`
- [ ] 定价开 5 天试用 → webhook/对账后 `hasUsedTrial=true` 且 `trialEndsAt` 约 +5d
- [ ] 试用弹窗只出一次（localStorage）
- [ ] 取消：本地真实 GID 能取消；`java-snapshot` 店走 Shopify 回退
- [ ] 卸载：Session 没了，Account 积分和 `hasUsedTrial` 还在
- [ ] `SHOP_REDACT`：Account + UserPicture + Session 删除
- [ ] 购包/订阅成功 **不再** 发 Java 邮件
- [ ] 上线前测环境 `npm run turso:migrate`（即 `node scripts/turso-migrate.mjs`）再 `npm run credits:import -- --write`

---

## 上线顺序（实现后由人执行，本计划不改产）

1. 测环境：migrate → 回填 dry-run → `--write` → 部署 `zz/fixImage`
2. 生产：须用户二次确认；`scripts/turso-migrate.mjs --env=.env.prod --confirm-prod`；`import-java-credits.mjs --env=.env.prod --write --confirm-prod`
3. 部署后再抽查几家付费店 `hasUsedTrial` / `subscriptionGid`

## 剩余风险

- Java `isInFreePlanTime` 只有布尔，回填的 `trialEndsAt` 可能是 +5d 近似，依赖首次对账用 Shopify `trialDays` 校正。
- 对账加在进 App / 定价 loader，Shopify 慢时可能拖首屏；必须 catch 且超时，失败不挡页面。
- P0 停成功邮件，商户不再收到购包/订阅信，直到 P2 SES。
