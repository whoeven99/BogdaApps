import assert from "node:assert/strict";
import test from "node:test";
import {
  getRemainingCredits,
  settlePoolsAtRenewal,
  clearSubscriptionOnCancel,
  splitLegacyRemaining,
  quotaAliases,
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
