import assert from "node:assert/strict";
import test from "node:test";
import { resolveImageTranslateConfirmState } from "./lib/imageTranslateConfirmState.mjs";
import { isClaimEligible } from "./lib/imageTranslateClaim.mjs";
import { controlTransition } from "./lib/imageTranslateJobControl.mjs";

test("够全量 → ready", () => {
  const s = resolveImageTranslateConfirmState({
    count: 10,
    creditsPerImage: 2000,
    remainingCredits: 20000,
    quotaOfferMode: "paid",
  });
  assert.equal(s.scenario, "ready");
  assert.equal(s.canStartPartial, false);
  assert.equal(s.requiredCredits, 20000);
});

test("只够部分 → insufficient_paid + partial", () => {
  const s = resolveImageTranslateConfirmState({
    count: 10,
    creditsPerImage: 2000,
    remainingCredits: 5000,
    quotaOfferMode: "paid",
  });
  assert.equal(s.canStartPartial, true);
  assert.equal(s.affordableCount, 2);
});

test("一张都不够走 offerMode", () => {
  const cases = [
    ["trial", "insufficient_trial"],
    ["pricing", "insufficient_pricing"],
    ["paid", "insufficient_paid"],
  ];
  for (const [mode, scenario] of cases) {
    const s = resolveImageTranslateConfirmState({
      count: 3,
      creditsPerImage: 2000,
      remainingCredits: 100,
      quotaOfferMode: mode,
    });
    assert.equal(s.canStartPartial, false);
    assert.equal(s.affordableCount, 0);
    assert.equal(s.scenario, scenario);
  }
});

test("remaining null 当 ready", () => {
  const s = resolveImageTranslateConfirmState({
    count: 2,
    creditsPerImage: 2000,
    remainingCredits: null,
    quotaOfferMode: "paid",
  });
  assert.equal(s.scenario, "ready");
});

test("心跳过期可认领", () => {
  const now = Date.parse("2026-11-18T12:00:00.000Z");
  const staleMs = 10 * 60 * 1000;
  assert.equal(isClaimEligible({ status: "QUEUED", heartbeatAt: null, now, staleMs }), true);
  assert.equal(
    isClaimEligible({
      status: "RUNNING",
      heartbeatAt: "2026-11-18T11:49:00.000Z",
      now,
      staleMs,
    }),
    true,
  );
  assert.equal(
    isClaimEligible({
      status: "RUNNING",
      heartbeatAt: "2026-11-18T11:55:00.000Z",
      now,
      staleMs,
    }),
    false,
  );
  assert.equal(isClaimEligible({ status: "PAUSED", heartbeatAt: null, now, staleMs }), false);
});

test("pause/resume/cancel from", () => {
  assert.deepEqual(controlTransition("pause").from, ["QUEUED", "RUNNING"]);
  assert.equal(controlTransition("pause").status, "PAUSED");
  assert.equal(controlTransition("pause").pauseReason, "MANUAL");
  assert.deepEqual(controlTransition("resume").from, ["PAUSED"]);
  assert.equal(controlTransition("resume").status, "QUEUED");
  assert.deepEqual(controlTransition("cancel").from, ["QUEUED", "RUNNING", "PAUSED"]);
  assert.equal(controlTransition("bogus"), null);
});
