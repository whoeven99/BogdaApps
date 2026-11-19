import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJobCompleteTemplateData,
  buildPurchaseTemplateData,
  buildRenewalTemplateData,
  buildSubscribeTemplateData,
  formatDurationMinutes,
  formatUtcDate,
  maskEmail,
  merchantTimes,
  planNameForEmail,
  shouldSendRenewalEmail,
} from "./lib/emailFormat.mjs";

test("merchantTimes floors credits / 2000", () => {
  assert.equal(merchantTimes(200000), 100);
  assert.equal(merchantTimes(1999), 0);
});

test("shouldSendRenewalEmail skips first charge after trial", () => {
  assert.equal(shouldSendRenewalEmail({ hadTrial: false, priorRenewalCount: 0 }), true);
  assert.equal(shouldSendRenewalEmail({ hadTrial: true, priorRenewalCount: 0 }), false);
  assert.equal(shouldSendRenewalEmail({ hadTrial: true, priorRenewalCount: 1 }), true);
});

test("planNameForEmail appends yearly", () => {
  assert.equal(planNameForEmail("Basic", "ANNUAL"), "Basic yearly");
  assert.equal(planNameForEmail("Pro", "MONTHLY"), "Pro");
});

test("purchase template uses /2000", () => {
  const data = buildPurchaseTemplateData({
    name: "Ada",
    purchasedCredits: 20000,
    remainingCredits: 220000,
    purchaseTime: new Date(Date.UTC(2026, 10, 19)),
  });
  assert.equal(data.credits_purchased, "10");
  assert.equal(data.credits_total, "110");
  assert.equal(data.purchase_time, "2026-11-19");
});

test("subscribe template uses Shopify period dates", () => {
  const data = buildSubscribeTemplateData({
    name: "Ada",
    shopifyPlanName: "Basic",
    billingInterval: "ANNUAL",
    creditsPerPeriod: 200000,
    periodStart: new Date(Date.UTC(2026, 0, 1)),
    periodEnd: new Date(Date.UTC(2027, 0, 1)),
  });
  assert.equal(data.plan_name, "Basic yearly");
  assert.equal(data.image_limit, "100");
  assert.equal(data.activation_date, "2026-01-01");
  assert.equal(data.next_billing_date, "2027-01-01");
});

test("job complete uses raw credits not /2000", () => {
  const data = buildJobCompleteTemplateData({
    name: "Ada",
    targetLanguage: "zh-CN",
    total: 10,
    done: 7,
    failed: 1,
    skipped: 2,
    createdAt: new Date("2026-11-19T00:00:00.000Z"),
    finishedAt: new Date("2026-11-19T00:12:01.000Z"),
    creditsUsed: 14000,
    creditsRemaining: 186000,
  });
  assert.equal(data.image_count, "7");
  assert.equal(data.credits_used, "14,000");
  assert.equal(data.credits_remaining, "186,000");
  assert.equal(data.duration, "13 min");
  assert.match(data.target_language, /zh-CN/);
});

test("formatDurationMinutes floors up to at least 1", () => {
  assert.equal(
    formatDurationMinutes("2026-11-19T00:00:00.000Z", "2026-11-19T00:00:10.000Z"),
    "1 min",
  );
});

test("maskEmail hides local part", () => {
  assert.equal(maskEmail("owner@shop.com"), "ow***@shop.com");
});

test("formatUtcDate is UTC date only", () => {
  assert.equal(formatUtcDate(new Date("2026-11-19T23:30:00.000Z")), "2026-11-19");
});
