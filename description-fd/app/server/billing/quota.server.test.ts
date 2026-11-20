import assert from "node:assert/strict";
import { test } from "node:test";
import { remainingCredits, billableCredits, toCounterDto } from "./quota.server";

test("remaining is pools minus used", () => {
  assert.equal(
    remainingCredits({
      subscriptionCredits: 0,
      purchasedCredits: 1000,
      trialCredits: 0,
      usedCredits: 200,
    }),
    800,
  );
});

test("billable is ceil of tokens times 1.5", () => {
  assert.equal(billableCredits(10, 0), 15);
  assert.equal(billableCredits(1, 0), 2);
});

test("counter dto keeps pricing-page field names", () => {
  assert.deepEqual(
    toCounterDto({
      subscriptionCredits: 0,
      purchasedCredits: 500000,
      trialCredits: 0,
      usedCredits: 12,
    }),
    { allToken: 500000, userToken: 12 },
  );
});
