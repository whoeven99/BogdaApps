import assert from "node:assert/strict";
import test from "node:test";
import {
  getRemainingCredits,
  settlePoolsAtRenewal,
  clearSubscriptionOnCancel,
  splitLegacyRemaining,
  quotaAliases,
  settleExpiredInstallTrialCredits,
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

test("未拆池时回退旧 purchasePoints-usedPoints", () => {
  assert.deepEqual(
    quotaAliases({
      subscriptionCredits: 0,
      purchasedCredits: 0,
      trialCredits: 0,
      usedCredits: 0,
      purchasePoints: 90000,
      usedPoints: 10000,
    }),
    { purchasePoints: 90000, usedPoints: 10000, remaining: 80000 },
  );
});

test("已拆池时 purchasePoints 为三池之和", () => {
  assert.deepEqual(
    quotaAliases({
      subscriptionCredits: 200000,
      purchasedCredits: 50000,
      trialCredits: 0,
      usedCredits: 10000,
      purchasePoints: 999999,
      usedPoints: 1,
    }),
    { purchasePoints: 250000, usedPoints: 10000, remaining: 240000 },
  );
});

test("试用到期：未到期不结算", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const next = settleExpiredInstallTrialCredits(
    {
      usedCredits: 0,
      trialInstallCredits: 50000,
      trialInstallExpiresAt: new Date("2026-07-01T00:00:00.000Z"),
      trialBonusCredits: 0,
      trialBonusExpiresAt: null,
    },
    now,
  );
  assert.equal(next.settled, false);
  assert.equal(next.trialInstallCredits, 50000);
});

test("试用到期：先扣已用再清 leftover", () => {
  const now = new Date("2026-07-02T00:00:00.000Z");
  const next = settleExpiredInstallTrialCredits(
    {
      usedCredits: 10000,
      trialInstallCredits: 50000,
      trialInstallExpiresAt: new Date("2026-07-01T00:00:00.000Z"),
      trialBonusCredits: 0,
      trialBonusExpiresAt: null,
    },
    now,
  );
  assert.equal(next.settled, true);
  assert.equal(next.trialInstallCredits, 0);
  assert.equal(next.trialCredits, 0);
  assert.equal(next.usedCredits, 0);
  assert.equal(next.lots[0]?.leftover, 40000);
  assert.equal(next.lots[0]?.consumed, 10000);
});

test("两笔都到期：FIFO 先安装再礼包", () => {
  const now = new Date("2026-08-01T00:00:00.000Z");
  const next = settleExpiredInstallTrialCredits(
    {
      usedCredits: 60000,
      trialInstallCredits: 50000,
      trialInstallExpiresAt: new Date("2026-07-01T00:00:00.000Z"),
      trialBonusCredits: 100000,
      trialBonusExpiresAt: new Date("2026-07-15T00:00:00.000Z"),
    },
    now,
  );
  assert.equal(next.settled, true);
  assert.equal(next.trialInstallCredits, 0);
  assert.equal(next.trialBonusCredits, 0);
  assert.equal(next.usedCredits, 0);
  assert.equal(next.lots[0]?.kind, "install");
  assert.equal(next.lots[0]?.consumed, 50000);
  assert.equal(next.lots[0]?.leftover, 0);
  assert.equal(next.lots[1]?.kind, "bonus");
  assert.equal(next.lots[1]?.consumed, 10000);
  assert.equal(next.lots[1]?.leftover, 90000);
});

test("首订礼包可立刻收回 leftover", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");
  const next = settleExpiredInstallTrialCredits(
    {
      usedCredits: 20000,
      trialInstallCredits: 0,
      trialInstallExpiresAt: null,
      trialBonusCredits: 100000,
      trialBonusExpiresAt: new Date("2026-07-01T00:00:00.000Z"),
    },
    now,
    { forceLots: ["bonus"] },
  );
  assert.equal(next.settled, true);
  assert.equal(next.trialBonusCredits, 0);
  assert.equal(next.usedCredits, 0);
  assert.equal(next.lots[0]?.grantKind, "basic_first_pay_bonus_revoked");
  assert.equal(next.lots[0]?.leftover, 80000);
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
