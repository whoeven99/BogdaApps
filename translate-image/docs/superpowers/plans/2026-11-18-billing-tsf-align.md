# 图译订阅对齐 TSF 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。
>
> **本会话约束：** 写本计划时不得改产品代码。实现须等用户明确说「确认，按这个做 / 开始写代码」。
>
> **规格：** `docs/superpowers/specs/2026-11-18-billing-tsf-align-design.md`

**目标：** 图译三池账本 + `currentPeriodEnd` 续费/年付滴灌 + 产环境放行店 test 单创单并入账。

**架构：** 纯函数（mjs + TS 双份，与现网 `billingState` 相同）→ Prisma/`PlanCatalog` → webhook 先 ACK → TranslateImageProd 进程内对账。不新建 Worker，不引 TSF 包。

**技术栈：** Remix 2、Prisma 6 + Turso、Shopify Admin GraphQL（application-only）、`node:test`（`scripts/*.test.mjs`）。

**已拍板：** 见规格第 1 节 9 条。P0 不发试用赠送、不发飞书/邮件。

**非目标：** 见规格第 2 节。不要改用户未提交的第三方图片文件。

---

## 文件职责

| 路径 | 职责 |
| --- | --- |
| `scripts/lib/accountBalance.mjs` + `app/server/billing/accountBalance.ts` | remaining、扣池、续费结算、取消清订阅池、存量拆池 |
| `scripts/lib/testBillingShop.mjs` + `app/server/billing/testBillingShop.ts` | 域名名单 ∪ `@shopify.com`；`BILLING_TEST` 整环境 |
| `scripts/lib/billingChargeGuard.mjs` + `app/server/billing/chargeGuard.ts` | 入账闸纯函数；允许金额从调用方传入（Catalog 价） |
| `scripts/lib/annualCreditCycle.mjs` + `app/server/billing/annualCreditCycle.ts` | 从 TSF `packages/translation-core/src/annualCreditCycle.ts` **整文件本地拷贝**（禁止 import 该包），注释去掉 TSF 字样 |
| `scripts/account-balance.test.mjs` 等 | 上述纯函数测试 |
| `prisma/schema.prisma` | Account 三池列、AppSubscription、BillingLog、PlanCatalog、BillingReconcileLock |
| `prisma/migrations/20261118120000_billing_pools/migration.sql` | DDL + PlanCatalog 种子 INSERT |
| `prisma/plan-catalog-seed.sql` | 与迁移相同的种子，供文档/重跑 |
| `app/server/billing/types.server.ts` | PLAN_KIND / BILLING_INTERVAL / BILLING_LOG_EVENT / APP_SUBSCRIPTION_STATUS（只要规格用到的 event） |
| `app/server/billing/plans/planCatalog.server.ts` | 按 name+interval 查订阅；按包名查加量包；允许金额集合 |
| `app/server/billing/quota.server.ts` | 读三池；别名 purchasePoints/usedPoints；deduct usedCredits |
| `app/server/billing/subscription.server.ts` | applyActiveSubscription / archivePeriodAndRenew / cancelSubscription |
| `app/server/billing/grants.server.ts` | 购包入账改 purchasedCredits；删硬编码 PLAN_BY_NAME/PACK_CREDITS |
| `app/server/billing/chargeGuardApply.server.ts` | GraphQL 补 test/金额/shop.email；persist deny log |
| `app/server/billing/reconcile.server.ts` | Shopify 对账 + 年付 decide；供 interval 调用 |
| `app/server/billing/reconcileLoop.server.ts` | setInterval + Redis/Turso 锁 |
| `app/entry.server.tsx` | 启动 loop 一次 |
| `app/routes/webhooks.tsx` | 计费 200 后后台处理 |
| `app/routes/app.tsx` / `app.pricing/route.tsx` | 去掉 loader 对账；创单 test 走放行函数 |
| `app/api/admin.server.ts` | 创单 test 仍由调用方传入（已支持） |
| `scripts/migrate-billing-pools.mjs` | 存量拆池，默认 dry-run |
| `public/locales/en/translation.json` + `zh-CN/translation.json` | FAQ 取消积分文案 |
| `package.json` | `test` glob 纳入新 `scripts/*.test.mjs` |

---

### 任务 1：三池纯函数

**文件：**
- 创建：`scripts/lib/accountBalance.mjs`
- 创建：`scripts/account-balance.test.mjs`
- 创建：`app/server/billing/accountBalance.ts`（与 mjs 签名结果一致）

- [ ] **步骤 1：写失败测试** `scripts/account-balance.test.mjs`

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  getRemainingCredits,
  settlePoolsAtRenewal,
  clearSubscriptionOnCancel,
  splitLegacyRemaining,
} from "./lib/accountBalance.mjs";

test("remaining = 三池 - used，下限 0", () => {
  assert.equal(
    getRemainingCredits({
      subscriptionCredits: 200000,
      purchasedCredits: 100000,
      trialCredits: 0,
      usedCredits: 50000,
    }),
    250000,
  );
  assert.equal(
    getRemainingCredits({
      subscriptionCredits: 0,
      purchasedCredits: 10,
      trialCredits: 0,
      usedCredits: 50,
    }),
    0,
  );
});

test("续费结算：先试用再订阅再加量包，used 清掉对应池", () => {
  const next = settlePoolsAtRenewal({
    subscriptionCredits: 200000,
    purchasedCredits: 100000,
    trialCredits: 0,
    usedCredits: 250000,
  });
  assert.deepEqual(next, {
    subscriptionCredits: 0,
    purchasedCredits: 50000,
    trialCredits: 0,
  });
});

test("取消：清订阅池，加量包留下", () => {
  const next = clearSubscriptionOnCancel({
    subscriptionCredits: 200000,
    purchasedCredits: 80000,
    creditsPerPeriod: 200000,
  });
  assert.equal(next.subscriptionCredits, 0);
  assert.equal(next.purchasedCredits, 80000);
});

test("存量拆池：付费溢出进加量包；免费全进加量包", () => {
  assert.deepEqual(
    splitLegacyRemaining({ remaining: 500000, plan: 2, periodCredits: 200000 }),
    { subscriptionCredits: 200000, purchasedCredits: 300000, usedCredits: 0 },
  );
  assert.deepEqual(
    splitLegacyRemaining({ remaining: 40000, plan: 1, periodCredits: 200000 }),
    { subscriptionCredits: 0, purchasedCredits: 40000, usedCredits: 0 },
  );
});
```

- [ ] **步骤 2：跑测试确认失败**

```powershell
cd D:\code\BogdaApps\translate-image
node --test scripts/account-balance.test.mjs
```

预期：FAIL，模块不存在。

- [ ] **步骤 3：实现 `scripts/lib/accountBalance.mjs`**

```js
export function getRemainingCredits(account) {
  const total =
    Math.max(0, account.subscriptionCredits | 0) +
    Math.max(0, account.purchasedCredits | 0) +
    Math.max(0, account.trialCredits | 0);
  return Math.max(0, total - Math.max(0, account.usedCredits | 0));
}

export function settlePoolsAtRenewal(account) {
  let remaining = Math.max(0, Math.floor(account.usedCredits));
  const next = {
    subscriptionCredits: Math.max(0, Math.floor(account.subscriptionCredits)),
    purchasedCredits: Math.max(0, Math.floor(account.purchasedCredits)),
    trialCredits: Math.max(0, Math.floor(account.trialCredits)),
  };
  const total = next.subscriptionCredits + next.purchasedCredits + next.trialCredits;
  if (remaining <= 0 || remaining > total) return next;
  for (const key of ["trialCredits", "subscriptionCredits", "purchasedCredits"]) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, next[key]);
    next[key] -= take;
    remaining -= take;
  }
  return next;
}

export function clearSubscriptionOnCancel(account) {
  const previous = Math.max(0, account.subscriptionCredits | 0);
  const removed = Math.min(previous, Math.max(0, account.creditsPerPeriod | 0));
  return {
    subscriptionCredits: previous - removed,
    purchasedCredits: Math.max(0, account.purchasedCredits | 0),
  };
}

export function splitLegacyRemaining({ remaining, plan, periodCredits }) {
  const leftover = Math.max(0, Math.floor(remaining));
  const period = Math.max(0, Math.floor(periodCredits));
  const subscriptionCredits = Number(plan) > 1 ? Math.min(leftover, period) : 0;
  return {
    subscriptionCredits,
    purchasedCredits: leftover - subscriptionCredits,
    usedCredits: 0,
  };
}
```

`accountBalance.ts` 用相同导出、加类型。续费 IO 层在结算后把 `subscriptionCredits` **替换**为 Catalog 一个月额度，并把 `usedCredits` 置 0。

- [ ] **步骤 4：测试通过** `node --test scripts/account-balance.test.mjs`

---

### 任务 2：放行店 + 入账闸纯函数

**文件：**
- 创建：`scripts/lib/testBillingShop.mjs`、`scripts/test-billing-shop.test.mjs`、`app/server/billing/testBillingShop.ts`
- 创建：`scripts/lib/billingChargeGuard.mjs`、`scripts/billing-charge-guard.test.mjs`、`app/server/billing/chargeGuard.ts`

- [ ] **步骤 1：放行店测试**

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  HARDCODED_TEST_BILLING_SHOPS,
  isProdTestBillingShop,
  isShopifyDotComEmail,
  shouldCreateTestCharge,
} from "./lib/testBillingShop.mjs";

test("硬编码含 ciwishop.myshopify.com", () => {
  assert.equal(HARDCODED_TEST_BILLING_SHOPS.includes("ciwishop.myshopify.com"), true);
});

test("域名或 @shopify.com 任一放行", () => {
  assert.equal(isProdTestBillingShop("ciwishop.myshopify.com", []), true);
  assert.equal(isProdTestBillingShop("CIWISHOP.myshopify.com", []), true);
  assert.equal(
    isProdTestBillingShop("other.myshopify.com", ["dev@shopify.com"]),
    true,
  );
  assert.equal(isProdTestBillingShop("other.myshopify.com", ["a@shop.com"]), false);
  assert.equal(isShopifyDotComEmail("a@shopify.com.evil.com"), false);
});

test("env 额外店；BILLING_TEST 整环境 test 创单", () => {
  assert.equal(
    isProdTestBillingShop("extra.myshopify.com", [], {
      BILLING_TEST_SHOPS: "extra.myshopify.com",
    }),
    true,
  );
  assert.equal(
    shouldCreateTestCharge("merchant.myshopify.com", [], {
      BILLING_TEST: "true",
      NODE_ENV: "production",
    }),
    true,
  );
  assert.equal(
    shouldCreateTestCharge("merchant.myshopify.com", [], {
      NODE_ENV: "production",
    }),
    false,
  );
});
```

实现要点：`normalizeShop` 小写 trim；`isShopifyDotComEmail` 只认最后一个 `@` 后恰好 `shopify.com`；`shouldCreateTestCharge` = `BILLING_TEST===true` 或 `NODE_ENV` 为 development/test 或 `isProdTestBillingShop`。

- [ ] **步骤 2：闸测试**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { decideChargeGrant } from "./lib/billingChargeGuard.mjs";

const basicMonthly = {
  env: "prod",
  allowlisted: false,
  test: false,
  amountCents: 999,
  currencyCode: "USD",
  allowedCents: [999, 9588],
};

test("放行店 test 单 grant staff_allowlist", () => {
  const d = decideChargeGrant({ ...basicMonthly, allowlisted: true, test: true });
  assert.equal(d.action, "grant");
  assert.equal(d.reason, "staff_allowlist");
});

test("非放行 test 单 deny", () => {
  const d = decideChargeGrant({ ...basicMonthly, test: true });
  assert.equal(d.action, "deny");
  assert.equal(d.reason, "test_charge");
});

test("金额不对 deny；缺字段 grant fields_missing", () => {
  assert.equal(
    decideChargeGrant({ ...basicMonthly, amountCents: 1 }).reason,
    "amount_mismatch",
  );
  assert.equal(
    decideChargeGrant({ ...basicMonthly, amountCents: null, test: null }).reason,
    "fields_missing",
  );
});
```

```js
export function decideChargeGrant(input) {
  if (input.env === "prod" && input.allowlisted) {
    return { action: "grant", reason: "staff_allowlist" };
  }
  if (input.env === "prod" && input.test === true) {
    return { action: "deny", reason: "test_charge" };
  }
  if (input.amountCents == null || input.test == null) {
    return { action: "grant", reason: "fields_missing" };
  }
  if (input.currencyCode && input.currencyCode !== "USD") {
    return { action: "deny", reason: "amount_mismatch" };
  }
  if (!input.allowedCents?.includes(input.amountCents)) {
    return { action: "deny", reason: "amount_mismatch" };
  }
  return { action: "grant", reason: "ok" };
}
```

测环境 `env: "test"` 不因 `test: true` 拒，仍核金额（与 TSF 一致）。`dollarsToCents`：`Math.round(n * 100)`。年付允许集合含 `月价cents * 12`。

- [ ] **步骤 3：** `node --test scripts/test-billing-shop.test.mjs scripts/billing-charge-guard.test.mjs` 通过。

---

### 任务 3：年付周期纯函数

**文件：**
- 创建：`scripts/lib/annualCreditCycle.mjs`
- 创建：`scripts/annual-credit-cycle.test.mjs`
- 创建：`app/server/billing/annualCreditCycle.ts`

- [ ] **步骤 1：** 从 `D:\code\ciwi-translate\packages\translation-core\src\annualCreditCycle.ts` **原样拷贝**逻辑到 mjs/ts（函数名保持 `decideAnnualCreditGrant` / `collectGrantedAnnualCreditCycleIndexes` / `getAnnualCreditCycleIndex`）。禁止 `from "@ciwi/translation-core"`。注释里的 TSF 改成「本账本」。

- [ ] **步骤 2：锁定行为的测试**（`yearEnd = 2027-01-01T00:00:00.000Z` → yearStart = 365 天前）

```js
import assert from "node:assert/strict";
import test from "node:test";
import {
  decideAnnualCreditGrant,
  collectGrantedAnnualCreditCycleIndexes,
} from "./lib/annualCreditCycle.mjs";

const periodEnd = new Date("2027-01-01T00:00:00.000Z");

test("无历史 → migration_assumed，不追补", () => {
  const d = decideAnnualCreditGrant({
    now: new Date("2026-06-01T00:00:00.000Z"),
    currentPeriodEnd: periodEnd,
    grantedCycleIndexes: [],
  });
  assert.equal(d.action, "skip");
  assert.equal(d.reason, "migration_assumed_granted");
});

test("cycle0 已发且进入下一窗 → grant 当前窗", () => {
  const d = decideAnnualCreditGrant({
    now: new Date("2026-02-05T00:00:00.000Z"),
    currentPeriodEnd: periodEnd,
    grantedCycleIndexes: [0],
  });
  assert.equal(d.action, "grant");
  assert.equal(d.creditCycleIndex, d.currentCycleIndex);
  assert.ok(d.creditCycleIndex >= 1);
});

test("ACTIVATED 无 index 计为 cycle 0", () => {
  const idx = collectGrantedAnnualCreditCycleIndexes(
    [{ eventType: "SUBSCRIPTION_ACTIVATED", metadata: { billingPeriodEnd: periodEnd.toISOString() } }],
    periodEnd,
  );
  assert.deepEqual(idx, [0]);
});
```

日期若因 365 天窗口让 2026-02-05 仍是 cycle 0，把 `now` 改成 `yearStart + 31 天` 再断言 grant。以 `getAnnualCreditCycleIndex` 为准，不要写死 index 数字除非测过。

- [ ] **步骤 3：** 测试通过。

---

### 任务 4：Schema + Catalog 种子

**文件：**
- 修改：`prisma/schema.prisma`
- 创建：`prisma/migrations/20261118120000_billing_pools/migration.sql`

- [ ] Account 增加规格第 4 节 9 个字段（默认 0 / null）。
- [ ] `AppSubscription`、`BillingLog`、`PlanCatalog` 按 TSF 同名字段（不要邀请码 event 注释）。
- [ ] `BillingReconcileLock`：`id` 固定 `'global'`，`lockedAt DateTime`。
- [ ] 种子 INSERT 规格第 4 节全部订阅 + 加量包行（`enabled=1`）。年付 `credits` 是一个月，不是 ×12。
- [ ] `npx prisma validate` 通过。生成客户端。

不要改 `UserPicture` / 第三方图片迁移。

---

### 任务 5：存量拆池脚本

**文件：** 创建 `scripts/migrate-billing-pools.mjs`、`scripts/migrate-billing-pools.test.mjs`（测 `splitLegacyRemaining` 包装即可，SQL 不在单测里打真库）。

- [ ] 默认 dry-run，打印将改店铺数。`--write` 才 UPDATE。产环境必须 `--env=.env.prod --confirm-prod`。
- [ ] 每店读 Catalog 一个月额度：`planType` + `feeType`（0 月 / 1 年）→ `periodCredits`。
- [ ] `java-snapshot` 店同样拆池（积分已在 Java 侧给过），不在脚本里加积分。
- [ ] 实现阶段只对测环境 `--write`。产库等用户二次确认。

---

### 任务 6：quota 读三池

**文件：** 修改 `app/server/billing/quota.server.ts`、`app/routes/api.billing.quota.ts`

- [ ] `remaining` / `purchasePoints` / `usedPoints` 按规格第 3 节别名计算。
- [ ] 若三池 + `usedCredits` 全 0 且 `purchasePoints - usedPoints > 0`，回退旧公式。
- [ ] `deductCredits` 改 `usedCredits += n`；仍写 `CreditUsage`。同步把旧列 `usedPoints` increment，避免回退窗口读歪。
- [ ] 加量包入账写 `purchasedCredits`；订阅写 `subscriptionCredits` **赋值一个月**（不要 increment 12 个月）。

---

### 任务 7：订阅激活 / 续费 / 取消

**文件：**
- 创建：`app/server/billing/types.server.ts`、`plans/planCatalog.server.ts`、`subscription.server.ts`、`billingLog.server.ts`
- 修改：`grants.server.ts`（购包只走 Catalog + purchasedCredits；删除 `PLAN_BY_NAME` 年付 ×12）

- [ ] `applyActiveSubscription`：同 GID 且 `currentPeriodEnd` 比本地晚超过 2s → `archivePeriodAndRenew`（结算 + 订阅池替换一个月 + used=0 + BillingLog `SUBSCRIPTION_RENEWED`）。
- [ ] 否则 upsert `AppSubscription`，首次 pending→active 发一个月，`SUBSCRIPTION_ACTIVATED`，ANNUAL 的 metadata 带 `creditCycleIndex: 0` 和 `billingPeriodEnd`。
- [ ] 本地 `subscriptionGid === java-snapshot`：creditsDelta 0，`grantKind: migration_assumed`，`creditCycleIndex = 当前窗`，然后写入真实 GID。
- [ ] `cancelSubscription`：GID 必须匹配；`clearSubscriptionOnCancel`；plan=Free；删 AppSubscription 行。
- [ ] 购包：`findPackPlanByName`，幂等 referenceId=GID。

---

### 任务 8：webhook ACK + 闸 IO

**文件：** 修改 `app/routes/webhooks.tsx`；创建 `chargeGuardApply.server.ts`

- [ ] `APP_SUBSCRIPTIONS_UPDATE` / `APP_PURCHASES_ONE_TIME_UPDATE`：先 `return 200`，`void handle...catch(log)`。
- [ ] GraphQL 补 `test`、price、`currentPeriodEnd`、`shop { email }`。
- [ ] `allowlisted = isProdTestBillingShop(shop, [shopEmail])`。deny 写 `CHARGE_GUARD_DENIED` 后 return。
- [ ] 卸载 / redact 行为保持现网（清套餐留账本；redact 删 Account）。取消本地订阅走 `cancelSubscription`。

---

### 任务 9：创单 test 标记

**文件：** 修改 `app/routes/app.tsx`、`app/routes/app.pricing/route.tsx`

- [ ] 购包/订阅 mutation 的 `test:` 改为 `shouldCreateTestCharge(shop, [session.email, shopEmail])`。
- [ ] `shopEmail`：`postShopGraphql` `query { shop { email } }`，失败则只用 session.email。
- [ ] 保留 `BILLING_TEST` / development 整环境 test。

---

### 任务 10：进程内对账 loop

**文件：** 重写 `reconcile.server.ts`；创建 `reconcileLoop.server.ts`；修改 `entry.server.tsx`、`app.tsx`、定价 loader

- [ ] `reconcileShopBilling(shop, admin)` 与 webhook 共用 apply/cancel/年付 decide。年付 grant：`subscriptionCredits = 一个月`（替换），BillingLog `SUBSCRIPTION_RENEWED` + `grantKind: annual_credit_cycle`，**禁止**改 `AppSubscription.currentPeriodEnd`。
- [ ] `startBillingReconcileLoop`：`globalThis.__imgBillingReconcileStarted` 防双挂；首次 2min+抖动；之后 30min。
- [ ] 锁：`SET img:billing:reconcile-lock NX EX 300`；无 Redis 则 `UPDATE BillingReconcileLock SET lockedAt=now WHERE id='global' AND lockedAt < now-300s`。
- [ ] 候选：`AppSubscription.status=ACTIVE` ∪ `Account.plan>1`。店间 50ms。
- [ ] **删除** `app.tsx` 与定价 loader 里的 `reconcileShopBilling`。

---

### 任务 11：定价页 Catalog + FAQ

**文件：** `app/routes/app.pricing/route.tsx`、`app._index/components/addCreditsModal.tsx`、`public/locales/en/translation.json`、`zh-CN/translation.json`

- [ ] loader 读 `PlanCatalog` 填价格/积分；不要再写死 9.99/29.99/79.99 和加量包价。
- [ ] 年付创单金额仍是 `priceAmount * 12`（现网 `yearlyPrice * 12`）。
- [ ] FAQ 键：
  - en carry over：`Plan credits reset at the end of each billing cycle. Extra credit packs never expire.`
  - en cancel：`Unused plan credits are removed when the subscription ends. Extra credit packs stay.`
  - zh-CN 同步：「套餐积分在周期结束或不续费时失效；加量包永久保留。」
- [ ] Pro/Premium 试用按钮继续 `trialDays: 5`，Basic 为 0。

---

### 任务 12：收尾验证

- [ ] `package.json` 的 `test` 包含本计划新增 `scripts/*.test.mjs`（可用 glob 或显式列出，不要漏）。
- [ ] `node --test scripts/*.test.mjs` 全绿。
- [ ] `npx prisma validate`。
- [ ] 不提交 `.env*`；不跑产 `--write`。

---

## 规格覆盖自检

| 规格节 | 任务 |
| --- | --- |
| 三池 / 别名 | 1, 6 |
| 年付滴灌 | 3, 7, 10 |
| 放行店 test | 2, 8, 9 |
| 入账闸 | 2, 8 |
| Catalog | 4, 7, 11 |
| 存量拆池 / java-snapshot | 1, 5, 7 |
| 取消清订阅池 / FAQ | 1, 7, 11 |
| 进程内对账、去掉 loader | 10 |
| 不发试用赠送 / 不引 TSF 包 | 全文未列发放与 import |

占位符扫描：无 TODO / 待定。类型名：`decideChargeGrant`、`applyActiveSubscription`、`splitLegacyRemaining` 前后一致。
