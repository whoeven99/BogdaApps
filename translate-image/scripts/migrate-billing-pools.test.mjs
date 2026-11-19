import assert from "node:assert/strict";
import test from "node:test";
import {
  periodCreditsFromCatalog,
  splitLegacyRemaining,
} from "./lib/accountBalance.mjs";

const catalog = [
  { kind: "SUBSCRIPTION", shopifyPlanName: "Basic", billingInterval: "MONTHLY", credits: 200000 },
  { kind: "SUBSCRIPTION", shopifyPlanName: "Basic", billingInterval: "ANNUAL", credits: 200000 },
  { kind: "SUBSCRIPTION", shopifyPlanName: "Pro", billingInterval: "MONTHLY", credits: 600000 },
];

test("Catalog 一个月额度：月付/年付都取 credits 列", () => {
  assert.equal(periodCreditsFromCatalog("Basic", 0, catalog), 200000);
  assert.equal(periodCreditsFromCatalog("Basic", 1, catalog), 200000);
  assert.equal(periodCreditsFromCatalog("Pro", 0, catalog), 600000);
  assert.equal(periodCreditsFromCatalog("Free", 0, catalog), 0);
});

test("拆池包装：付费店 remaining 先填一个周期", () => {
  const period = periodCreditsFromCatalog("Basic", 0, catalog);
  assert.deepEqual(
    splitLegacyRemaining({ remaining: 350000, plan: 2, periodCredits: period }),
    { subscriptionCredits: 200000, purchasedCredits: 150000, usedCredits: 0 },
  );
});
