import assert from "node:assert/strict";
import test from "node:test";
import {
  JAVA_SNAPSHOT_SUBSCRIPTION_GID,
  computeTrialEndsAt,
  inferHasUsedTrial,
  isInFreePlanTime,
  isRealShopifySubscriptionGid,
  shouldShowTrialStartedModal,
} from "./lib/billingState.mjs";

test("isRealShopifySubscriptionGid 只认 AppSubscription GID", () => {
  assert.equal(
    isRealShopifySubscriptionGid("gid://shopify/AppSubscription/123"),
    true,
  );
  assert.equal(isRealShopifySubscriptionGid(JAVA_SNAPSHOT_SUBSCRIPTION_GID), false);
  assert.equal(isRealShopifySubscriptionGid(""), false);
  assert.equal(isRealShopifySubscriptionGid(null), false);
});

test("computeTrialEndsAt = createdAt + trialDays；trialDays<=0 为 null", () => {
  assert.equal(
    computeTrialEndsAt("2026-11-17T00:00:00.000Z", 5),
    "2026-11-22T00:00:00.000Z",
  );
  assert.equal(computeTrialEndsAt("2026-11-17T00:00:00.000Z", 0), null);
  assert.equal(computeTrialEndsAt("bad", 5), null);
});

test("isInFreePlanTime 只在未到期时为 true", () => {
  assert.equal(isInFreePlanTime("2099-01-01T00:00:00.000Z", "2026-11-17T00:00:00.000Z"), true);
  assert.equal(isInFreePlanTime("2020-01-01T00:00:00.000Z", "2026-11-17T00:00:00.000Z"), false);
  assert.equal(isInFreePlanTime(null, "2026-11-17T00:00:00.000Z"), false);
});

test("inferHasUsedTrial：显式标记 / 付费套餐 / 已有 grant 都算用过", () => {
  assert.equal(inferHasUsedTrial({ hasUsedTrial: true, plan: 1, grantCount: 0 }), true);
  assert.equal(inferHasUsedTrial({ hasUsedTrial: false, plan: 2, grantCount: 0 }), true);
  assert.equal(inferHasUsedTrial({ hasUsedTrial: false, plan: 1, grantCount: 1 }), true);
  assert.equal(inferHasUsedTrial({ hasUsedTrial: false, plan: 1, grantCount: 0 }), false);
});

test("试用成功弹窗：非新客 + 仍在试用窗 + 本地未展示过", () => {
  assert.equal(
    shouldShowTrialStartedModal({ isNew: false, isInFreePlanTime: true, hasShownLocal: false }),
    true,
  );
  assert.equal(
    shouldShowTrialStartedModal({ isNew: false, isInFreePlanTime: true, hasShownLocal: true }),
    false,
  );
  assert.equal(
    shouldShowTrialStartedModal({ isNew: false, isInFreePlanTime: false, hasShownLocal: false }),
    false,
  );
  assert.equal(
    shouldShowTrialStartedModal({ isNew: true, isInFreePlanTime: true, hasShownLocal: false }),
    false,
  );
});
