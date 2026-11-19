# 图译商户 SES 邮件

规格日期：2026-11-19。对齐 TSF App 侧腾讯 SES 发送方式，落在 `BogdaApps/translate-image`。本文是实现前规格，不含产品代码。

## 1. 目标与非目标

**目标：** 商户在安装、购积分、订阅激活、Shopify 账期续费、批量图译任务完成后收到腾讯云模板邮件；Render 日志能按相位排查（脱敏）。

**非目标：**

- 暂停 / 取消 / 额度不足专用邮件
- 卸载挽回、邀请码、试用专用模板（TSF `146220`）
- 年付 30 天拨额度商户信（只飞书）
- 邮件失败飞书
- SES 频控冷却（P2）
- 依赖 TSF 仓库或 `@ciwi/translation-core`
- 改 Shopify 鉴权、webhook 订阅、生产密钥、真实发信到生产除非另授权

## 2. 已锁定决策

| 项 | 选择 |
| --- | --- |
| 计费四封 | Java 图译模板 `158999` 欢迎 / `159001` 购积分 / `159003` 订阅激活（含试用） / `159005` 账期续费 |
| 批量完成 | 模板 `236766`，仅 `COMPLETED`（含创建时已全部 skipped） |
| 计费数字 | `floor(credits / 2000)` |
| 完成信积分 | `credits_used` / `credits_remaining` 用账本原值（与任务卡 `creditsUsed` 一致） |
| 续费闸 | 仅 `grantKind=shopify_period`；有试用跳过试用结束第一次扣款；年付 30 天拨额度不发 |
| `159003` 日期 | `currentPeriodStart` / `currentPeriodEnd`，UTC `yyyy-MM-dd` |
| 年付 `plan_name` | `shopifyPlanName` + `" yearly"` |
| 收件人 | Shopify `shop.email` → `contactEmail`；`name` = `shopOwnerName` 或 `there` |
| 日志 | 相位 JSON；`maskEmail`；不打明文邮箱 / 密钥；失败不飞书 |
| 幂等 | 续费 `BillingLog.metadata.renewalEmailSent`；完成信 `ImageTranslateJob.emailSent` |
| 发送失败 | 返回 false，不抛，不挡 webhook / 任务循环 |
| CC | `feynman@ciwi.ai`、`yewen@ciwi.ai` |
| From | `TENCENT_FROM_EMAIL` 或 `support@msg.ciwi.ai` |
| 迁移入账 | `skipAdd`（Java 快照 GID）不发订阅信 |

## 3. 模板与变量

主题对齐 `MailChimpConstants`（Java PC_*）。

### 3.1 欢迎 `158999`

Subject: `Welcome to Ciwi Image Translate — Start Localizing Your Images Instantly`

| 变量 | 来源 |
| --- | --- |
| `name` | 店主称呼 |

### 3.2 购积分 `159001`

Subject: `Image Translation Credits Have Been Added Successfully`

| 变量 | 来源 |
| --- | --- |
| `name` | 店主称呼 |
| `credits_purchased` | `floor(plan.credits / 2000)` 千分位 |
| `credits_total` | 入账后 `floor(remaining / 2000)` 千分位 |
| `purchase_time` | UTC `yyyy-MM-dd`（发信时刻） |

### 3.3 订阅激活 `159003`

Subject: `Your Ciwi Image Translate Subscription Is Now Active`

| 变量 | 来源 |
| --- | --- |
| `name` | 店主称呼 |
| `plan_name` | `shopifyPlanName`；年付加 ` yearly` |
| `image_limit` | `floor(creditsPerPeriod / 2000)` 千分位 |
| `activation_date` | `currentPeriodStart` UTC 日 |
| `next_billing_date` | `currentPeriodEnd` UTC 日 |

### 3.4 账期续费 `159005`

Subject: `Your Plan Has Renewed — Ciwi Image Translate`

| 变量 | 来源 |
| --- | --- |
| `name` | 店主称呼 |
| `plan_name` | 同 3.3 |
| `new_cycle_images` | `floor(creditsPerPeriod / 2000)` 千分位 |
| `current_image_balance` | 入账后 `floor(remaining / 2000)` 千分位 |

`shouldSendRenewalEmail({ hadTrial, priorRenewalCount })`：无试用 → 第一次续费就发；有试用 → `priorRenewalCount >= 1` 才发。`priorRenewalCount` = 该 GID 的 `SUBSCRIPTION_RENEWED` 条数 − 1（本条已写入）。

### 3.5 批量完成 `236766`

Subject: `Image Translation Task Is Complete — Ciwi Image Translate`

| 变量 | 来源 |
| --- | --- |
| `name` | 店主称呼 |
| `target_language` | `Intl.DisplayNames` 英文名 + `(code)`，失败用 code |
| `total_images` | `job.total` 千分位 |
| `image_count` | `job.done`（已译）千分位 |
| `failed_count` | `job.failed` 千分位 |
| `skipped_count` | `job.skipped` 千分位 |
| `duration` | `createdAt`→`finishedAt` 向上取整分钟，如 `12 min`；不足 1 分 `1 min` |
| `credits_used` | `job.creditsUsed` 千分位（原值） |
| `credits_remaining` | 发信时 `remainingOf(getAccountQuota)` 千分位（原值） |

View Results 按钮由 SES 模板写死，代码不传 URL。

不发：`PAUSED` / `CANCELLED` / 仍有 PENDING。

## 4. 模块与缝

调用方只调 `schedule*`（`void`，内部 `.catch` 打日志）。不拼模板变量、不直接调 SES SDK。

### 4.1 `emailFormat.ts`（深模块，纯函数）

零 IO。千分位、`/2000`、日期、时长、语言名、续费闸、年付 plan 名、五封 `templateData` 组装。

测试：`scripts/lib/emailFormat.mjs` 镜像 + `scripts/email-format.test.mjs`。

### 4.2 `tencentSes.server.ts`

腾讯 SDK 发送。相位：`ses-client-missing` / `send-skipped` / `before-sdk-call` / `after-sdk-call` / `after-sdk-call-failed`。成功判定：响应有非空 `RequestId`。凭证：`TENCENT_CLOUD_KEY_ID` / `TENCENT_CLOUD_KEY` / `TENCENT_SES_REGION`（默认 `ap-hongkong`）。

### 4.3 `fetchShopContact.server.ts`

`postShopGraphql` path `shop_contact`。字段 `shop { email contactEmail shopOwnerName }`。卸载/无 token：空收件人，调用方 skip。

### 4.4 `billingEmail.server.ts`

四封 `send*` + `schedule*`。无邮箱：`send-skipped reason=no_recipient`，不飞书。

### 4.5 `jobCompleteEmail.server.ts`

读任务行 + 剩余积分 → 发 `236766`。成功才把 `emailSent` 置 1。

## 5. 挂钩

| 事件 | 现有飞书点 | 邮件 |
| --- | --- | --- |
| 终身首次 `Account.create` | `scheduleInstallFeishu` | `scheduleWelcomeEmail` |
| 订阅 `outcome=activated` 且非 `skipAdd` | `scheduleSubscribeFeishu` | `scheduleSubscribeEmail` |
| 加量包 `applyTokenPackPurchase` 返回 true | `schedulePurchaseFeishu` | `schedulePurchaseEmail` |
| `archivePeriodAndRenew` | `scheduleRenewalFeishu` | 过闸且 `claimBillingLogFlag(..., "renewalEmailSent")` 后 `scheduleRenewalEmail` |
| `annual_credit_cycle` | `scheduleAnnualCreditFeishu` | 不发 |
| `completeRunningJob` 后 | 无 | `scheduleJobCompleteEmail` |
| `createContentImageJob` 直接 `COMPLETED` | 无 | 同上 |
| tick 补发 | 无 | `COMPLETED && emailSent=0 && finishedAt` 早于 30s 前 |

## 6. 日志

前缀：`[tencentSes]` 发送层；`[imgEmail]` 业务层。

每封：`schedule-start` → `contact-resolved`（`to` 脱敏）→ SES 相位 → `send-success` 或 `send-failed`。JSON 单行。禁止打印 `.env*` 值。

## 7. 数据

`ImageTranslateJob.emailSent Boolean @default(false)`。迁移 `prisma/migrations/20261119090000_job_email_sent/migration.sql`。存量 COMPLETED 默认为 0，tick 可能补发历史完成任务：P0 只补 `finishedAt` 在发版之后的行（`finishedAt >= 迁移部署时刻` 不写死；改为 **仅当 `emailSent=0` 且 `finishedAt` 距今 ≤ 24h**）。更早的历史不补。

## 8. 验证

- `npm test`（含新 `email-format.test.mjs`）
- `npx prisma validate` + `npx prisma generate`
- 测环境配 `TENCENT_CLOUD_KEY_ID` / `TENCENT_CLOUD_KEY` 后人工看 `[imgEmail]` / `[tencentSes]`（不改产、不打印密钥）
