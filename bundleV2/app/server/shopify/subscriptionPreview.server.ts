export type SubscriptionPreviewPolicyNode = {
  adjustmentType?: string | null;
  adjustmentValue?:
    | { amount?: string | null; currencyCode?: string | null }
    | { percentage?: number | null }
    | null;
  afterCycle?: number | null;
};

export type SubscriptionPreviewPlan = {
  sellingPlanId: string;
  sellingPlanName: string;
  billingLabel: string;
  subscriptionPrice: number;
  compareAtPrice: number;
  savingsAmount: number;
  savingsPercent: number;
};

export function parseSubscriptionPreviewMoney(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatSubscriptionPreviewInterval(
  interval?: string | null,
  intervalCount?: number | null,
): string {
  const normalizedInterval = String(interval || "").toLowerCase();
  const normalizedCount = Math.max(1, Number(intervalCount) || 1);
  const unitMap: Record<string, string> = {
    day: "day",
    week: "week",
    month: "month",
    year: "year",
  };
  const unit = unitMap[normalizedInterval] || "delivery";
  if (normalizedCount === 1) return `Billed every ${unit}`;
  return `Billed every ${normalizedCount} ${unit}s`;
}

export function resolveSubscriptionPreviewPricing(
  basePrice: number | null,
  policies: SubscriptionPreviewPolicyNode[],
): {
  subscriptionPrice: number;
  compareAtPrice: number;
  savingsAmount: number;
  savingsPercent: number;
} | null {
  if (basePrice == null) return null;

  if (policies.length === 0) {
    return { subscriptionPrice: basePrice, compareAtPrice: basePrice, savingsAmount: 0, savingsPercent: 0 };
  }

  const primaryPolicy =
    policies.find((p) => p && (p.afterCycle == null || p.afterCycle <= 1)) || policies[0];
  if (!primaryPolicy) return null;

  const adjustmentType = String(primaryPolicy.adjustmentType || "").toUpperCase();
  let nextPrice: number | null = null;

  if (adjustmentType === "PERCENTAGE") {
    const percentage = Number(
      (primaryPolicy.adjustmentValue as { percentage?: number } | null)?.percentage,
    );
    if (Number.isFinite(percentage)) nextPrice = Math.max(0, basePrice * (1 - percentage / 100));
  } else if (adjustmentType === "FIXED_AMOUNT") {
    const amount = parseSubscriptionPreviewMoney(
      (primaryPolicy.adjustmentValue as { amount?: string | null } | null)?.amount,
    );
    if (amount != null) nextPrice = Math.max(0, basePrice - amount);
  } else if (adjustmentType === "PRICE") {
    const amount = parseSubscriptionPreviewMoney(
      (primaryPolicy.adjustmentValue as { amount?: string | null } | null)?.amount,
    );
    if (amount != null) nextPrice = Math.max(0, amount);
  }

  if (nextPrice == null) return null;

  const savingsAmount = Math.max(0, basePrice - nextPrice);
  const savingsPercent =
    basePrice > 0 && savingsAmount > 0 ? Math.round((savingsAmount / basePrice) * 100) : 0;

  return { subscriptionPrice: nextPrice, compareAtPrice: basePrice, savingsAmount, savingsPercent };
}
