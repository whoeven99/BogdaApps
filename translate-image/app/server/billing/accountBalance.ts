export type CreditPoolBalances = {
  subscriptionCredits: number;
  purchasedCredits: number;
  trialCredits: number;
};

export type AccountBalanceFields = CreditPoolBalances & {
  usedCredits: number;
};

export type QuotaAliasAccount = AccountBalanceFields & {
  purchasePoints?: number;
  usedPoints?: number;
};

export function hasMigratedPools(account: AccountBalanceFields): boolean {
  return (
    Math.max(0, account.subscriptionCredits | 0) +
      Math.max(0, account.purchasedCredits | 0) +
      Math.max(0, account.trialCredits | 0) +
      Math.max(0, account.usedCredits | 0) >
    0
  );
}

export function quotaAliases(account: QuotaAliasAccount): {
  purchasePoints: number;
  usedPoints: number;
  remaining: number;
} {
  if (hasMigratedPools(account)) {
    const purchasePoints =
      Math.max(0, account.subscriptionCredits | 0) +
      Math.max(0, account.purchasedCredits | 0) +
      Math.max(0, account.trialCredits | 0);
    const usedPoints = Math.max(0, account.usedCredits | 0);
    return {
      purchasePoints,
      usedPoints,
      remaining: getRemainingCredits(account),
    };
  }
  const purchasePoints = Math.max(0, Number(account.purchasePoints ?? 0));
  const usedPoints = Math.max(0, Number(account.usedPoints ?? 0));
  return {
    purchasePoints,
    usedPoints,
    remaining: Math.max(0, purchasePoints - usedPoints),
  };
}

export function getRemainingCredits(account: AccountBalanceFields): number {
  const total =
    Math.max(0, account.subscriptionCredits | 0) +
    Math.max(0, account.purchasedCredits | 0) +
    Math.max(0, account.trialCredits | 0);
  return Math.max(0, total - Math.max(0, account.usedCredits | 0));
}

export function settlePoolsAtRenewal(account: AccountBalanceFields): CreditPoolBalances {
  let remaining = Math.max(0, Math.floor(account.usedCredits));
  const next: CreditPoolBalances = {
    subscriptionCredits: Math.max(0, Math.floor(account.subscriptionCredits)),
    purchasedCredits: Math.max(0, Math.floor(account.purchasedCredits)),
    trialCredits: Math.max(0, Math.floor(account.trialCredits)),
  };
  const total = next.subscriptionCredits + next.purchasedCredits + next.trialCredits;
  if (remaining <= 0 || remaining > total) return next;
  for (const key of ["trialCredits", "subscriptionCredits", "purchasedCredits"] as const) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, next[key]);
    next[key] -= take;
    remaining -= take;
  }
  return next;
}

export function clearSubscriptionOnCancel(account: {
  subscriptionCredits: number;
  purchasedCredits: number;
  creditsPerPeriod: number;
}): { subscriptionCredits: number; purchasedCredits: number } {
  const previous = Math.max(0, account.subscriptionCredits | 0);
  const removed = Math.min(previous, Math.max(0, account.creditsPerPeriod | 0));
  return {
    subscriptionCredits: previous - removed,
    purchasedCredits: Math.max(0, account.purchasedCredits | 0),
  };
}

export function periodCreditsFromCatalog(
  planType: string | null | undefined,
  feeType: number | string | null | undefined,
  rows: Array<{
    kind?: string | null;
    shopifyPlanName?: string | null;
    billingInterval?: string | null;
    credits?: number | null;
  }>,
): number {
  const interval = Number(feeType) === 1 ? "ANNUAL" : "MONTHLY";
  const name = String(planType || "");
  const hit = (rows || []).find(
    (row) =>
      row.kind === "SUBSCRIPTION" &&
      row.shopifyPlanName === name &&
      row.billingInterval === interval,
  );
  return hit ? Math.max(0, Math.floor(Number(hit.credits) || 0)) : 0;
}

export function splitLegacyRemaining(args: {
  remaining: number;
  plan: number;
  periodCredits: number;
}): { subscriptionCredits: number; purchasedCredits: number; usedCredits: number } {
  const leftover = Math.max(0, Math.floor(args.remaining));
  const period = Math.max(0, Math.floor(args.periodCredits));
  const subscriptionCredits = Number(args.plan) > 1 ? Math.min(leftover, period) : 0;
  return {
    subscriptionCredits,
    purchasedCredits: leftover - subscriptionCredits,
    usedCredits: 0,
  };
}
