export const JAVA_SNAPSHOT_SUBSCRIPTION_GID = "java-snapshot";
export const JAVA_SNAPSHOT_PERIOD_KEY = "once";
export const JAVA_SNAPSHOT_KIND = "java-snapshot";

export function javaSnapshotGrantGid(shop: string): string {
  return `java-snapshot:${shop}`;
}

export function isRealShopifySubscriptionGid(gid: string | null | undefined): boolean {
  return typeof gid === "string" && gid.startsWith("gid://shopify/AppSubscription/");
}

export function computeTrialEndsAt(
  createdAt: string | Date | null | undefined,
  trialDays: number | string | null | undefined,
): string | null {
  const days = Number(trialDays);
  if (!Number.isFinite(days) || days <= 0) return null;
  const start = new Date(createdAt ?? "");
  if (Number.isNaN(start.getTime())) return null;
  return new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function isInFreePlanTime(
  trialEndsAt: string | Date | null | undefined,
  nowIso: string = new Date().toISOString(),
): boolean {
  if (!trialEndsAt) return false;
  const end = new Date(trialEndsAt);
  const now = new Date(nowIso);
  if (Number.isNaN(end.getTime()) || Number.isNaN(now.getTime())) return false;
  return end.getTime() > now.getTime();
}

export function inferHasUsedTrial(args: {
  hasUsedTrial: boolean;
  plan: number;
  grantCount: number;
}): boolean {
  if (args.hasUsedTrial) return true;
  if (Number(args.plan) > 1) return true;
  if (Number(args.grantCount) > 0) return true;
  return false;
}

export function shouldShowTrialStartedModal(args: {
  isNew: boolean | null;
  isInFreePlanTime: boolean;
  hasShownLocal: boolean;
}): boolean {
  return args.isNew === false && args.isInFreePlanTime === true && args.hasShownLocal !== true;
}
