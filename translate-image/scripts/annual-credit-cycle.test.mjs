import assert from "node:assert/strict";
import test from "node:test";
import {
  CREDIT_CYCLE_MS,
  collectGrantedAnnualCreditCycleIndexes,
  decideAnnualCreditGrant,
  getAnnualCreditCycleIndex,
  getAnnualYearWindow,
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
  const { yearStart } = getAnnualYearWindow(periodEnd);
  const now = new Date(yearStart.getTime() + CREDIT_CYCLE_MS + 24 * 60 * 60 * 1000);
  const current = getAnnualCreditCycleIndex(now, periodEnd);
  assert.ok(current >= 1);
  const d = decideAnnualCreditGrant({
    now,
    currentPeriodEnd: periodEnd,
    grantedCycleIndexes: [0],
  });
  assert.equal(d.action, "grant");
  assert.equal(d.creditCycleIndex, current);
});

test("ACTIVATED 无 index 计为 cycle 0", () => {
  const idx = collectGrantedAnnualCreditCycleIndexes(
    [
      {
        eventType: "SUBSCRIPTION_ACTIVATED",
        metadata: { billingPeriodEnd: periodEnd.toISOString() },
      },
    ],
    periodEnd,
  );
  assert.deepEqual(idx, [0]);
});
