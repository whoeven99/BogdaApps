export const JAVA_SNAPSHOT_SUBSCRIPTION_GID = "java-snapshot";
export const JAVA_SNAPSHOT_PERIOD_KEY = "once";
export const JAVA_SNAPSHOT_KIND = "java-snapshot";

export function javaSnapshotGrantGid(shop) {
  return `java-snapshot:${shop}`;
}

export function isRealShopifySubscriptionGid(gid) {
  return typeof gid === "string" && gid.startsWith("gid://shopify/AppSubscription/");
}

export function computeTrialEndsAt(createdAt, trialDays) {
  const days = Number(trialDays);
  if (!Number.isFinite(days) || days <= 0) return null;
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isInFreePlanTime(trialEndsAt, nowIso = new Date().toISOString()) {
  if (!trialEndsAt) return false;
  const end = new Date(trialEndsAt);
  const now = new Date(nowIso);
  if (Number.isNaN(end.getTime()) || Number.isNaN(now.getTime())) return false;
  return end.getTime() > now.getTime();
}

export function inferHasUsedTrial({ hasUsedTrial, plan, grantCount }) {
  if (hasUsedTrial) return true;
  if (Number(plan) > 1) return true;
  if (Number(grantCount) > 0) return true;
  return false;
}

export function shouldShowTrialStartedModal({ isNew, isInFreePlanTime, hasShownLocal }) {
  return isNew === false && isInFreePlanTime === true && hasShownLocal !== true;
}
