export function hasMigratedPools(account) {
  return (
    Math.max(0, account.subscriptionCredits | 0) +
      Math.max(0, account.purchasedCredits | 0) +
      Math.max(0, account.trialCredits | 0) +
      Math.max(0, account.usedCredits | 0) >
    0
  );
}

export function quotaAliases(account) {
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
  const purchasePoints = Math.max(0, account.purchasePoints | 0);
  const usedPoints = Math.max(0, account.usedPoints | 0);
  return {
    purchasePoints,
    usedPoints,
    remaining: Math.max(0, purchasePoints - usedPoints),
  };
}

export function getRemainingCredits(account) {
  const total =
    Math.max(0, account.subscriptionCredits | 0) +
    Math.max(0, account.purchasedCredits | 0) +
    Math.max(0, account.trialCredits | 0);
  return Math.max(0, total - Math.max(0, account.usedCredits | 0));
}

export function settlePoolsAtRenewal(account) {
  let remaining = Math.max(0, Math.floor(account.usedCredits));
  const next = {
    subscriptionCredits: Math.max(0, Math.floor(account.subscriptionCredits)),
    purchasedCredits: Math.max(0, Math.floor(account.purchasedCredits)),
    trialCredits: Math.max(0, Math.floor(account.trialCredits)),
  };
  const total = next.subscriptionCredits + next.purchasedCredits + next.trialCredits;
  if (remaining <= 0 || remaining > total) return next;
  for (const key of ["trialCredits", "subscriptionCredits", "purchasedCredits"]) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, next[key]);
    next[key] -= take;
    remaining -= take;
  }
  return next;
}

export function clearSubscriptionOnCancel(account) {
  const previous = Math.max(0, account.subscriptionCredits | 0);
  const removed = Math.min(previous, Math.max(0, account.creditsPerPeriod | 0));
  return {
    subscriptionCredits: previous - removed,
    purchasedCredits: Math.max(0, account.purchasedCredits | 0),
  };
}

export function periodCreditsFromCatalog(planType, feeType, rows) {
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

export const TRIAL_LOT_REFERENCE_ID = {
  install: "install_credits",
  bonus: "basic_first_pay_bonus",
};

export const TRIAL_LOT_GRANT_KIND = {
  install: "install_credits_expired",
  bonus: "basic_first_pay_bonus_expired",
  bonusRevoked: "basic_first_pay_bonus_revoked",
};

function isDueTrialLot(credits, expiresAt, now) {
  if (credits <= 0 || !expiresAt) return false;
  return now.getTime() >= new Date(expiresAt).getTime();
}

function shouldExpireTrialLot(kind, credits, expiresAt, now, forceLots) {
  if (credits <= 0) return false;
  if (forceLots?.includes(kind)) return true;
  return isDueTrialLot(credits, expiresAt, now);
}

export function earliestTrialLotExpiresAt(
  installCredits,
  installExpiresAt,
  bonusCredits,
  bonusExpiresAt,
) {
  const dates = [];
  if (installCredits > 0 && installExpiresAt) dates.push(new Date(installExpiresAt));
  if (bonusCredits > 0 && bonusExpiresAt) dates.push(new Date(bonusExpiresAt));
  if (dates.length === 0) return null;
  return dates.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b));
}

export function settleExpiredInstallTrialCredits(account, now = new Date(), options) {
  const install = Math.max(0, account.trialInstallCredits | 0);
  const bonus = Math.max(0, account.trialBonusCredits | 0);
  const used = Math.max(0, account.usedCredits | 0);
  const forceLots = options?.forceLots;
  const expireInstall = shouldExpireTrialLot(
    "install",
    install,
    account.trialInstallExpiresAt,
    now,
    forceLots,
  );
  const expireBonus = shouldExpireTrialLot(
    "bonus",
    bonus,
    account.trialBonusExpiresAt,
    now,
    forceLots,
  );
  if (!expireInstall && !expireBonus) {
    return {
      trialInstallCredits: install,
      trialInstallExpiresAt: account.trialInstallExpiresAt ?? null,
      trialBonusCredits: bonus,
      trialBonusExpiresAt: account.trialBonusExpiresAt ?? null,
      trialCredits: install + bonus,
      usedCredits: used,
      settled: false,
      lots: [],
    };
  }

  const usedTrial = Math.min(used, install + bonus);
  const attrInstall = Math.min(usedTrial, install);
  const attrBonus = usedTrial - attrInstall;
  const lots = [];
  let nextInstall = install;
  let nextInstallExp = account.trialInstallExpiresAt ?? null;
  let nextBonus = bonus;
  let nextBonusExp = account.trialBonusExpiresAt ?? null;
  let nextUsed = used;

  if (expireInstall) {
    lots.push({
      kind: "install",
      consumed: attrInstall,
      leftover: install - attrInstall,
      referenceId: TRIAL_LOT_REFERENCE_ID.install,
      grantKind: TRIAL_LOT_GRANT_KIND.install,
      expiresAt: account.trialInstallExpiresAt
        ? new Date(account.trialInstallExpiresAt).toISOString()
        : null,
    });
    nextUsed -= attrInstall;
    nextInstall = 0;
    nextInstallExp = null;
  }
  if (expireBonus) {
    lots.push({
      kind: "bonus",
      consumed: attrBonus,
      leftover: bonus - attrBonus,
      referenceId: TRIAL_LOT_REFERENCE_ID.bonus,
      grantKind: forceLots?.includes("bonus")
        ? TRIAL_LOT_GRANT_KIND.bonusRevoked
        : TRIAL_LOT_GRANT_KIND.bonus,
      expiresAt: account.trialBonusExpiresAt
        ? new Date(account.trialBonusExpiresAt).toISOString()
        : null,
    });
    nextUsed -= attrBonus;
    nextBonus = 0;
    nextBonusExp = null;
  }

  return {
    trialInstallCredits: nextInstall,
    trialInstallExpiresAt: nextInstallExp,
    trialBonusCredits: nextBonus,
    trialBonusExpiresAt: nextBonusExp,
    trialCredits: nextInstall + nextBonus,
    usedCredits: nextUsed,
    settled: true,
    lots,
  };
}

export function splitLegacyRemaining({ remaining, plan, periodCredits }) {
  const leftover = Math.max(0, Math.floor(remaining));
  const period = Math.max(0, Math.floor(periodCredits));
  const subscriptionCredits = Number(plan) > 1 ? Math.min(leftover, period) : 0;
  return {
    subscriptionCredits,
    purchasedCredits: leftover - subscriptionCredits,
    usedCredits: 0,
  };
}
