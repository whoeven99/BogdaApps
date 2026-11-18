import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyShopBillingSnapshot,
  FAILURE_FEISHU_TTL_SEC,
  failureFeishuBucket,
  failureFeishuLogReference,
  failureFeishuRedisKey,
  failureFeishuUsesDebounce,
  formatAnnualCreditFeishuMessage,
  formatBillingFailureFeishuMessage,
  formatCancelFeishuMessage,
  formatChargeGuardFeishuMessage,
  formatFirstSubscribeFeishuMessage,
  formatInstallFeishuMessage,
  formatPurchaseFeishuMessage,
  formatRenewalFeishuMessage,
  formatShopBillingFeishuLines,
  formatSubscribeFeishuMessage,
  formatUninstallFeishuMessage,
  resolveAmountUsd,
  sanitizeFeishuErrorDetail,
} from "./lib/billingFeishuFormat.mjs";

const snap = {
  shop: "demo.myshopify.com",
  subscribed: true,
  planName: "Basic",
  status: "ACTIVE",
  billingInterval: "MONTHLY",
  billingIntervalLabel: "月付",
  remainingCredits: 2_700_000,
  totalCredits: 2_700_000,
  usedCredits: 0,
  subscriptionCredits: 1_500_000,
  purchasedCredits: 1_000_000,
  trialCredits: 200_000,
};

test("快照三行，无大小", () => {
  const lines = formatShopBillingFeishuLines(snap);
  assert.deepEqual(lines, [
    "订阅：是 · Basic",
    "计费周期：月付",
    "额度：剩余 2,700,000（总 2,700,000 / 已用 0；订阅 1,500,000 + 加量 1,000,000 + 试用 200,000）",
  ]);
  assert.equal(lines.some((line) => line.includes("大小")), false);
});

test("未订阅无行 / 已取消", () => {
  assert.equal(
    formatShopBillingFeishuLines(emptyShopBillingSnapshot("x.myshopify.com"))[0],
    "订阅：否 · Free",
  );
  assert.equal(
    formatShopBillingFeishuLines({
      ...emptyShopBillingSnapshot("x.myshopify.com"),
      planName: "Basic（CANCELLED）",
      status: "CANCELLED",
      billingIntervalLabel: "月付",
    })[0],
    "订阅：否 · Basic（CANCELLED）",
  );
});

test("无分池时额度行不含订阅/加量/试用", () => {
  const lines = formatShopBillingFeishuLines({
    ...emptyShopBillingSnapshot("x.myshopify.com"),
    remainingCredits: 50_000,
    totalCredits: 50_000,
    usedCredits: 0,
  });
  assert.equal(lines[2], "额度：剩余 50,000（总 50,000 / 已用 0）");
});

test("成功标题", () => {
  assert.match(formatInstallFeishuMessage(snap), /^✅ 图译店铺安装：demo\.myshopify\.com\n/);
  assert.match(formatFirstSubscribeFeishuMessage(snap), /^💰 图译首次订阅：demo\.myshopify\.com\n/);
  assert.match(formatSubscribeFeishuMessage(snap), /^💰 图译订阅：demo\.myshopify\.com\n/);
  assert.match(
    formatSubscribeFeishuMessage(snap, { trial: true }),
    /^💰 图译试用订阅：demo\.myshopify\.com\n/,
  );
  assert.match(formatRenewalFeishuMessage(snap), /^💰 图译订阅续费：demo\.myshopify\.com\n/);
  assert.match(formatAnnualCreditFeishuMessage(snap, { creditCycleIndex: 3 }), /^📦 图译年付额度发放：/);
  assert.match(formatAnnualCreditFeishuMessage(snap, { creditCycleIndex: 3 }), /\n账期窗：3$/);
  assert.equal(formatAnnualCreditFeishuMessage(snap, {}).includes("账期窗"), false);
  assert.match(formatCancelFeishuMessage(snap), /^📉 图译订阅取消：demo\.myshopify\.com\n/);
  assert.match(formatUninstallFeishuMessage(snap), /^🛑 图译店铺卸载：demo\.myshopify\.com\n/);
});

test("购积分含本次金额", () => {
  const text = formatPurchaseFeishuMessage(snap, { credits: 100_000, amountUsd: 1.99 });
  assert.match(text, /^💳 图译购买积分：demo\.myshopify\.com\n/);
  assert.match(text, /\n本次购买：100,000 Credits · \$1\.99\n/);
});

test("resolveAmountUsd 优先分再目录价", () => {
  assert.equal(resolveAmountUsd(199, "7.99"), 1.99);
  assert.equal(resolveAmountUsd(null, "7.99"), 7.99);
  assert.equal(resolveAmountUsd(null, "nope"), 0);
});

test("入账失败含阶段原因与快照", () => {
  const text = formatBillingFailureFeishuMessage({
    snap,
    stage: "subscribe",
    reason: "charge_guard",
    chargeGuardReason: "test_charge",
    gid: "gid://shopify/AppSubscription/1",
    shopifyPlanName: "Basic",
    amountCents: 799,
    currencyCode: "USD",
    test: true,
    env: "prod",
  });
  assert.match(text, /^⚠️ 图译入账失败：demo\.myshopify\.com\n/);
  assert.match(text, /\n阶段：订阅激活\n/);
  assert.match(text, /\n原因：入账闸拒绝（test_charge）\n/);
  assert.match(text, /\nGID：gid:\/\/shopify\/AppSubscription\/1\n/);
  assert.match(text, /\n订阅：是 · Basic\n/);
  assert.equal(text.includes("图译入账闸拒绝"), false);
});

test("套餐未匹配 / 对账跳过 / 安装赠分异常文案", () => {
  assert.match(
    formatBillingFailureFeishuMessage({
      snap,
      stage: "subscribe",
      reason: "plan_not_found",
      shopifyPlanName: "Unknown Plan",
    }),
    /\n原因：套餐未匹配\n/,
  );
  assert.match(
    formatBillingFailureFeishuMessage({
      snap,
      stage: "subscribe",
      reason: "reconcile_skip",
      detail: "graphql 500",
    }),
    /\n原因：对账跳过\n/,
  );
  const installFail = formatBillingFailureFeishuMessage({
    snap,
    stage: "install_grant",
    reason: "exception",
    detail: "db timeout",
  });
  assert.match(installFail, /\n阶段：安装赠分\n/);
  assert.match(installFail, /\n原因：入账异常\n/);
  assert.match(installFail, /\n详情：db timeout\n/);
});

test("失败飞书 6h 去重 key / bucket", () => {
  assert.equal(
    failureFeishuRedisKey(" demo.myshopify.com ", "subscribe", "exception"),
    "img:feishu:fail:demo.myshopify.com:subscribe:exception",
  );
  assert.equal(failureFeishuUsesDebounce("charge_guard"), false);
  assert.equal(failureFeishuUsesDebounce("exception"), true);
  assert.equal(failureFeishuUsesDebounce("reconcile_skip"), true);
  const windowMs = FAILURE_FEISHU_TTL_SEC * 1000;
  assert.equal(failureFeishuBucket(0), 0);
  assert.equal(failureFeishuBucket(windowMs - 1), 0);
  assert.equal(failureFeishuBucket(windowMs), 1);
  assert.equal(
    failureFeishuLogReference("annual_credit", "exception", 3),
    "annual_credit:exception:3",
  );
});

test("失败详情截断并去掉 url / token", () => {
  assert.equal(
    sanitizeFeishuErrorDetail("boom https://hooks.example/abc token=secret-value rest"),
    "boom [url] token=[redacted] rest",
  );
  assert.equal(sanitizeFeishuErrorDetail("   "), null);
  assert.equal(sanitizeFeishuErrorDetail("x".repeat(301)).length, 300);
});

test("员工店放行不是失败标题", () => {
  const text = formatChargeGuardFeishuMessage({
    action: "grant",
    env: "prod",
    shop: "demo.myshopify.com",
    shopEmail: "dev@shopify.com",
    test: true,
    shopifyPlanName: "Basic",
    amountCents: 799,
    currencyCode: "USD",
    gid: "gid://shopify/AppSubscription/1",
    reason: "staff_allowlist",
  });
  assert.match(text, /^图译入账校验\n/);
  assert.match(text, /\n动作：员工店放行\n/);
  assert.match(text, /\n原因：staff_allowlist$/);
  assert.equal(text.includes("入账失败"), false);
});
