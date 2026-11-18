# 图译订阅账本对齐 TSF 设计

> 仓库：`BogdaApps/translate-image`。对齐 TSF（ciwi-translate）计费语义，不共用 TSF 包、库、表。
>
> 本会话约束：写本规格时不得改产品代码。实现须等用户明确说「确认，按这个做 / 开始写代码」。

**目标：** 图译订阅/购包/取消/续费用三池账本和 Shopify `currentPeriodEnd` 发积分；产环境 `ciwishop.myshopify.com` 或 `@shopify.com` 邮箱可走 Shopify test 单并入账。

**架构：** Remix Web（TranslateImageProd）自管账本。年付每 30 天发一个月额度；对账在本进程 `setInterval` 跑。创单和入账共用放行判断。套餐目录落 `PlanCatalog`。

---

## 1. 已拍板（grill）

1. 产环境 test 单：店铺域名在名单 **或** 店主/会话邮箱 `@shopify.com`，任一即可。创单 `test: true` 与入账闸同一函数。
2. 三池：`subscriptionCredits` + `purchasedCredits` + `trialCredits`；`usedCredits` 周期内只增。
3. P0 **不发**安装赠送 / Basic 首订赠送。试用列建空。继续 Shopify 5 天 `trialDays` + `hasUsedTrial`。
4. 年付：Shopify 一年扣一次，每 30 天发 **一个月**额度（最多 12 次，不补历史）。
5. 对账和滴灌跑在 TranslateImageProd 进程内，约 30 分钟；`RENDER_KV` NX，无 KV 则 Turso 行锁。Web loader **不再**对账。
6. 取消/过期立刻清订阅池；加量包留下。改 FAQ。
7. 存量：付费店 `remaining` 最多一个当前周期额度进订阅池，多的进加量包；免费店全部进加量包；`usedCredits` 归零。`java-snapshot` 本周期不重发，写 `migration_assumed` 水位。
8. 全套入账闸：非放行店 test 单拒；金额必须落在图译 `PlanCatalog` 价表。放行店 test 单发全额。缺字段先按名字入账。
9. 套餐/加量包进 `PlanCatalog` 表，改价走迁移。

## 2. 非目标

- 安装 5 万 / 首订 10 万等试用赠送（表预留，P0 不写发放逻辑）。
- 独立 Worker 服务、SES、飞书、邀请码、迁积分到 Spark。
- 依赖 `@ciwi/translation-core` 或 TSF Turso。
- 改图译主链（Gemini / Files / 店面换图）。
- 覆盖用户工作树里未提交的第三方图片改动。
- 生产库写入须另一次确认（实现默认测环境）。

## 3. 额度语义

```text
remaining = max(0,
  subscriptionCredits + purchasedCredits + trialCredits - usedCredits)
```

扣费：只 `usedCredits += n`（允许短暂超支，拦截在 `precheckCredits`）。续费才结算三池。

| 池 | 何时增加 | 续费 | 取消 |
| --- | --- | --- | --- |
| `subscriptionCredits` | 月付激活/续费发一个月；年付每 30 天发一个月 | 先按 used 结算，再 **替换** 为本期一个月额度 | 立刻清零（最多清 `creditsPerPeriod`） |
| `purchasedCredits` | 加量包 webhook | 结算后 leftover 结转 | 留下 |
| `trialCredits` | P0 恒 0 | 无 | 无 |

对外 API 保持 `purchasePoints` / `usedPoints` / `remaining` 别名，避免 Redux 进度条裂：

- `purchasePoints` = 三池之和
- `usedPoints` = `usedCredits`
- `remaining` = 上式

现网 FAQ 写「取消后再留 3 个月」与代码不符；按第 6 条改成：套餐剩余立即失效，加量包永久保留。续费未用完的套餐积分不结转（加量包结转）。

**已有年付店接受多给：** 他们可能已经拿到 `monthly × 12`。拆池后约 11 个月进加量包且永不回收，之后仍按 30 天滴灌。不追扣。

## 4. 数据模型

`Account` 现有 `purchasePoints` / `usedPoints` / `plan` / `planType` / `feeType` / `subscriptionGid` / `hasUsedTrial` / `trialEndsAt` **保留**（套餐展示和取消 GID）。新增：

```prisma
subscriptionCredits     Int       @default(0)
purchasedCredits        Int       @default(0)
trialCredits            Int       @default(0)
trialCreditsExpiresAt   DateTime?
trialInstallCredits     Int       @default(0)
trialInstallExpiresAt   DateTime?
trialBonusCredits       Int       @default(0)
trialBonusExpiresAt     DateTime?
usedCredits             Int       @default(0)
```

新增 `AppSubscription`（每店一行，`shopifySubscriptionId` 唯一）、`BillingLog`、`PlanCatalog`（字段对齐 TSF，不含邀请码相关 event）。

`CreditGrant` P0 保留不删；新路径以 `BillingLog` 为入账审计。购包幂等：已有 `TOKEN_PACK_PURCHASED` + 同一 Shopify GID 则跳过。年付窗水位：`BillingLog.metadata.creditCycleIndex` + `billingPeriodEnd`。

`PlanCatalog` 种子（`shopifyPlanName` 必须等于 Shopify 订单名）：

订阅（`credits` 都是 **一个月**额度，年付行不是 ×12）：

| planKey | interval | shopifyPlanName | credits | priceAmount | Shopify 实付 |
| --- | --- | --- | --- | --- | --- |
| basic_monthly | MONTHLY | Basic | 200000 | 9.99 | 9.99 |
| basic_annual | ANNUAL | Basic | 200000 | 7.99 | 95.88 |
| pro_monthly | MONTHLY | Pro | 600000 | 29.99 | 29.99 |
| pro_annual | ANNUAL | Pro | 600000 | 23.99 | 287.88 |
| premium_monthly | MONTHLY | Premium | 1600000 | 79.99 | 79.99 |
| premium_annual | ANNUAL | Premium | 1600000 | 63.99 | 767.88 |

年付 `priceAmount` 存折后月单价；闸用 `× 12` 对实付。`trialDays`：Basic 0，Pro/Premium 月年付 5（与现网「试用按钮 5 天」一致）。

加量包（创单 `name` = `{n} extra times`，与 `mutationAppPurchaseOneTimeCreate` 一致）：

| shopifyPlanName | credits | priceAmount |
| --- | --- | --- |
| 50 extra times | 100000 | 3.99 |
| 100 extra times | 200000 | 7.99 |
| 200 extra times | 400000 | 15.99 |
| 300 extra times | 600000 | 23.99 |
| 500 extra times | 1000000 | 39.99 |
| 1000 extra times | 2000000 | 79.99 |
| 2000 extra times | 4000000 | 159.99 |
| 3000 extra times | 6000000 | 239.99 |

图译加量包 **不按套餐打折**，闸只认上表唯一标价。

不建 `INTERNAL_TRIAL` 行。

## 5. 数据流

```text
创单（定价页 / 加量包弹窗）
  isBillingTestMode(env) OR isProdTestBillingShop(shop, emails)
    → Shopify appSubscriptionCreate / appPurchaseOneTimeCreate test 标记
  确认 URL 顶层打开（现网不变）

APP_SUBSCRIPTIONS_UPDATE / APP_PURCHASES_ONE_TIME_UPDATE
  立刻 200
  后台：GraphQL 补 currentPeriodEnd / test / 金额 / shop.email
  decideChargeGrant → deny 则 BillingLog CHARGE_GUARD_DENIED
  ACTIVE 订阅 → applyActiveSubscription
    同 GID 且 currentPeriodEnd 前进 → 归档结算 + 替换订阅池（一个月）
    新 GID / 首次 → 写 AppSubscription + 订阅池 = 一个月
    ANNUAL 另写 creditCycleIndex=0（java-snapshot 则 0 分 + migration_assumed）
  购包 → purchasedCredits += catalog.credits

取消 / EXPIRED
  仅当 payload GID === 本地 shopifySubscriptionId
  清订阅池、删 AppSubscription 行；plan 改 Free

进程内 reconcile（30 min）
  锁 NX 300s
  扫 Account.plan>1 或 AppSubscription ACTIVE
  拉 Shopify activeSubscriptions
  无 ACTIVE 且本地仍付费 → cancel
  有 ACTIVE → 与 webhook 同一 apply
  ANNUAL → decideAnnualCreditGrant；grant 则发一个月（不改 currentPeriodEnd）
```

账期锚点：**只用** Shopify `currentPeriodEnd`。`createdAt` 只用于 `trialEndsAt = createdAt + trialDays`。

年付 `decideAnnualCreditGrant` 行为与 TSF `packages/translation-core/src/annualCreditCycle.ts` 相同（本地拷贝，改名不含 TSF）：

- 当前窗已发 → skip
- 无历史或水位空洞 > 1 → skip 并写 `migration_assumed` baseline（`creditsDelta: 0`，`creditCycleIndex = 当前窗`）
- `current === maxGranted + 1` → 发当前窗一次

## 6. 放行店与入账闸

```text
HARDCODED = ciwishop.myshopify.com
BILLING_TEST_SHOPS = 逗号分隔额外域名（小写）

isProdTestBillingShop(shop, emails[]):
  normalize(shop) 在 HARDCODED ∪ env
  OR 任一带邮箱 isShopifyDotComEmail
```

创单邮箱：`Session.email`（OAuth 登录人）**和** GraphQL `shop.email`（店联系邮箱），能拿到的都传入。webhook / 对账无 Session，只拉 `shop.email`。拉失败且域名不在名单 → 当普通店（产环境 `test: false`；闸若 `test===true` 则拒）。

全环境 test 创单（现网 `NODE_ENV=development|test`）保留，并加上 `BILLING_TEST=true`（Render 测环境 `NODE_ENV=production` 时整环境 test 单，对齐 Spark）。

闸（产且非放行）：

1. `test === true` → deny `test_charge`
2. 金额或 test 字段缺失 → grant `fields_missing`（对账再核）
3. 非 USD 或金额不在目录允许集合 → deny `amount_mismatch`
4. 否则 grant

放行店：grant `staff_allowlist`，仍发套餐全额积分。P0 只打日志，不发飞书。

## 7. 存量拆池

脚本默认 dry-run，`--write` 才写（测环境可跑；产须 `--confirm-prod` + 用户二次确认）。

```text
legacyRemaining = max(0, purchasePoints - usedPoints)
period = 当前 planType+feeType 在 Catalog 的一个月 credits（免费 = 0）
subscriptionCredits = plan>1 ? min(legacyRemaining, period) : 0
purchasedCredits = legacyRemaining - subscriptionCredits
usedCredits = 0
```

`java-snapshot` 或无法解析真实 GID：不调用加积分；对上 Shopify 后写 `AppSubscription` + `migration_assumed` 水位，把 `subscriptionGid` 换成真实 GID。

旧列 `purchasePoints` / `usedPoints` 不删。读路径以新三池为准；若三池与 `usedCredits` 全 0 且 `legacyRemaining > 0`，临时回退旧公式（防脚本未跑）。回填后不再走旧公式。

## 8. 进程内对账

- 入口：`app/entry.server.tsx` 调一次 `startBillingReconcileLoop()`，`globalThis` 防 HMR 双挂。
- 首次延迟 2 min + 0–60 s 抖动，之后 30 min。
- 锁 key：`img:billing:reconcile-lock`（前缀 `img:`，不碰 `tsf:` / `spark:` / `translate:v4:`）。TTL 300 s。无 `RENDER_KV` 则 `UPDATE BillingReconcileLock SET lockedAt` 一行。
- 店间 50 ms。单店失败 continue。
- 从 `app.tsx` / 定价 loader 删除 `reconcileShopBilling`。

## 9. 错误处理

- webhook 处理失败只打日志，不改变已返回的 200。靠下一轮对账补。
- 对账 GraphQL `Unavailable Shop` / 换票失败：跳过该店，本地订阅不动。
- 取消 GID 仍：本地真实 `AppSubscription` GID，否则 GraphQL；`java-snapshot` 不是真实 GID。
- 入账闸 deny 不改额度。
- 加量包/订阅名字不在 Catalog：不入账，打 warn。

## 10. 测试

纯函数（`scripts/*.test.mjs`，与现网 `node --test` 一致）：

- remaining / 续费结算 / 取消清订阅池
- 存量拆池（付费溢出、免费全进加量包、零余额）
- 放行店域名、env 额外店、`@shopify.com`、恶意域名
- 闸：放行 test 放行、非放行 test 拒、金额对/错、fields_missing
- 年付窗：cycle0 已发、下一窗 grant、空洞 migration_assumed、第 12 窗耗尽

不测真实 Shopify / 不写产库。

## 11. 验证与风险

验证：`node --test scripts/*.test.mjs`；有 schema 时 `npx prisma validate`。

风险：

1. 已有年付店拆池后加量包偏多（已接受）。
2. 多实例无锁会双发——NX / Turso 行锁必须落地；账本幂等是第二道。
