/** 年付额度周期纯函数：只从 Shopify/本地 currentPeriodEnd 对齐，禁止用 createdAt。 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const CREDIT_CYCLE_DAYS = 30;
export const ANNUAL_BILLING_DAYS = 365;
export const CREDIT_CYCLE_MS = CREDIT_CYCLE_DAYS * DAY_MS;
export const ANNUAL_BILLING_MS = ANNUAL_BILLING_DAYS * DAY_MS;
export const MAX_ANNUAL_CREDIT_GRANTS = 12;

export function getAnnualYearWindow(currentPeriodEnd) {
  return {
    yearEnd: currentPeriodEnd,
    yearStart: new Date(currentPeriodEnd.getTime() - ANNUAL_BILLING_MS),
  };
}

export function getAnnualCreditCycleIndex(now, currentPeriodEnd) {
  const { yearStart, yearEnd } = getAnnualYearWindow(currentPeriodEnd);
  const ts = typeof now === "number" ? now : now.getTime();
  const clamped = Math.min(Math.max(ts, yearStart.getTime()), yearEnd.getTime() - 1);
  const elapsed = Math.max(0, clamped - yearStart.getTime());
  return Math.min(
    MAX_ANNUAL_CREDIT_GRANTS - 1,
    Math.floor(elapsed / CREDIT_CYCLE_MS),
  );
}

export function getAnnualCreditWindow(currentPeriodEnd, cycleIndex) {
  const { yearStart } = getAnnualYearWindow(currentPeriodEnd);
  const idx = Math.max(
    0,
    Math.min(MAX_ANNUAL_CREDIT_GRANTS - 1, Math.floor(cycleIndex)),
  );
  return {
    start: new Date(yearStart.getTime() + idx * CREDIT_CYCLE_MS),
    end: new Date(yearStart.getTime() + (idx + 1) * CREDIT_CYCLE_MS),
  };
}

function parseMetadata(raw) {
  if (raw == null) return {};
  if (typeof raw === "object" && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function samePeriodEndIso(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return a === b;
  return Math.abs(da.getTime() - db.getTime()) < 2000;
}

function clampCycleIndex(raw) {
  return Math.max(0, Math.min(MAX_ANNUAL_CREDIT_GRANTS - 1, Math.floor(raw)));
}

function readCreditCycleIndex(meta) {
  const raw = meta.creditCycleIndex;
  if (typeof raw === "number" && Number.isFinite(raw)) return clampCycleIndex(raw);
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return clampCycleIndex(n);
  }
  return null;
}

export function collectGrantedAnnualCreditCycleIndexes(logs, currentPeriodEnd) {
  const periodEndIso = currentPeriodEnd.toISOString();
  const indexes = new Set();

  for (const log of logs) {
    const eventType = String(log.eventType || "");
    if (eventType !== "SUBSCRIPTION_ACTIVATED" && eventType !== "SUBSCRIPTION_RENEWED") {
      continue;
    }
    const meta = parseMetadata(log.metadata);
    const billingPeriodEnd = meta.billingPeriodEnd;
    if (typeof billingPeriodEnd !== "string" || !billingPeriodEnd) continue;
    if (!samePeriodEndIso(billingPeriodEnd, periodEndIso)) continue;

    const idx = readCreditCycleIndex(meta);
    if (idx != null) {
      indexes.add(idx);
      continue;
    }
    if (eventType === "SUBSCRIPTION_ACTIVATED") indexes.add(0);
  }

  return [...indexes].sort((a, b) => a - b);
}

export function countGrantsForBillingPeriod(logs, currentPeriodEnd) {
  return collectGrantedAnnualCreditCycleIndexes(logs, currentPeriodEnd).length;
}

export function getExpectedAnnualGrants(now, currentPeriodEnd) {
  const ts = typeof now === "number" ? now : now.getTime();
  if (ts >= currentPeriodEnd.getTime()) return MAX_ANNUAL_CREDIT_GRANTS;
  return Math.min(
    MAX_ANNUAL_CREDIT_GRANTS,
    getAnnualCreditCycleIndex(ts, currentPeriodEnd) + 1,
  );
}

export function getNextAnnualCreditGrantAt(currentPeriodEnd, grantedCycleIndexes) {
  const indexes = [
    ...new Set(
      grantedCycleIndexes
        .filter((i) => typeof i === "number" && Number.isFinite(i))
        .map((i) => clampCycleIndex(i)),
    ),
  ];
  const nextIndex = indexes.length === 0 ? 0 : Math.max(...indexes) + 1;
  if (nextIndex >= MAX_ANNUAL_CREDIT_GRANTS) return null;
  const { yearStart, yearEnd } = getAnnualYearWindow(currentPeriodEnd);
  const next = new Date(yearStart.getTime() + nextIndex * CREDIT_CYCLE_MS);
  if (next.getTime() >= yearEnd.getTime()) return null;
  return next;
}

export function decideAnnualCreditGrant(params) {
  const now = params.now ?? Date.now();
  const ts = typeof now === "number" ? now : now.getTime();
  const currentCycleIndex = getAnnualCreditCycleIndex(ts, params.currentPeriodEnd);
  const expectedGrants = getExpectedAnnualGrants(ts, params.currentPeriodEnd);
  const grantedCycleIndexes = [
    ...new Set(
      params.grantedCycleIndexes
        .filter((i) => typeof i === "number" && Number.isFinite(i))
        .map((i) => clampCycleIndex(i)),
    ),
  ].sort((a, b) => a - b);
  const grantedCount = grantedCycleIndexes.length;

  if (grantedCycleIndexes.includes(currentCycleIndex)) {
    const exhausted =
      grantedCount >= MAX_ANNUAL_CREDIT_GRANTS ||
      (currentCycleIndex >= MAX_ANNUAL_CREDIT_GRANTS - 1 &&
        grantedCycleIndexes.includes(MAX_ANNUAL_CREDIT_GRANTS - 1));
    return {
      action: "skip",
      reason: exhausted ? "annual_grants_exhausted" : "not_due_yet",
      grantedCount,
      expectedGrants,
      currentCycleIndex,
    };
  }

  if (grantedCycleIndexes.length === 0) {
    return {
      action: "skip",
      reason: "migration_assumed_granted",
      grantedCount: 0,
      expectedGrants,
      currentCycleIndex,
    };
  }

  const maxGranted = Math.max(...grantedCycleIndexes);
  if (currentCycleIndex > maxGranted + 1) {
    return {
      action: "skip",
      reason: "migration_assumed_granted",
      grantedCount,
      expectedGrants,
      currentCycleIndex,
    };
  }

  if (currentCycleIndex === maxGranted + 1) {
    return {
      action: "grant",
      creditCycleIndex: currentCycleIndex,
      grantedCount,
      currentCycleIndex,
      expectedGrants,
    };
  }

  return {
    action: "skip",
    reason: "not_due_yet",
    grantedCount,
    expectedGrants,
    currentCycleIndex,
  };
}
