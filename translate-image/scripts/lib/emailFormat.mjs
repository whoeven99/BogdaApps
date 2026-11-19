export function formatUsNumber(n) {
  return Number(n).toLocaleString("en-US");
}

export function merchantTimes(credits) {
  return Math.floor(Number(credits) / 2000);
}

export function formatUtcDate(value) {
  const d = value instanceof Date ? value : new Date(value);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function formatDurationMinutes(startedAt, finishedAt) {
  const start = startedAt instanceof Date ? startedAt : new Date(startedAt);
  const end = finishedAt instanceof Date ? finishedAt : new Date(finishedAt);
  const ms = Math.max(0, end.getTime() - start.getTime());
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  return `${minutes} min`;
}

export function displayLanguageName(code) {
  const raw = String(code || "").trim() || "—";
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(raw);
    return name && name !== raw ? `${name} (${raw})` : raw;
  } catch {
    return raw;
  }
}

export function planNameForEmail(shopifyPlanName, billingInterval) {
  const name = String(shopifyPlanName || "").trim() || "Plan";
  return String(billingInterval).toUpperCase() === "ANNUAL" ? `${name} yearly` : name;
}

export function shouldSendRenewalEmail(params) {
  if (params.hadTrial) return params.priorRenewalCount >= 1;
  return true;
}

export function maskEmail(email) {
  const trimmed = String(email || "").trim();
  const at = trimmed.indexOf("@");
  if (at <= 0) return "(invalid)";
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  return `${local.slice(0, Math.min(2, local.length))}***@${domain}`;
}

export function buildWelcomeTemplateData(name) {
  return { name };
}

export function buildPurchaseTemplateData(params) {
  return {
    name: params.name,
    credits_purchased: formatUsNumber(merchantTimes(params.purchasedCredits)),
    credits_total: formatUsNumber(merchantTimes(params.remainingCredits)),
    purchase_time: formatUtcDate(params.purchaseTime),
  };
}

export function buildSubscribeTemplateData(params) {
  return {
    name: params.name,
    plan_name: planNameForEmail(params.shopifyPlanName, params.billingInterval),
    image_limit: formatUsNumber(merchantTimes(params.creditsPerPeriod)),
    activation_date: formatUtcDate(params.periodStart),
    next_billing_date: formatUtcDate(params.periodEnd),
  };
}

export function buildRenewalTemplateData(params) {
  return {
    name: params.name,
    plan_name: planNameForEmail(params.shopifyPlanName, params.billingInterval),
    new_cycle_images: formatUsNumber(merchantTimes(params.creditsPerPeriod)),
    current_image_balance: formatUsNumber(merchantTimes(params.remainingCredits)),
  };
}

export function buildJobCompleteTemplateData(params) {
  return {
    name: params.name,
    target_language: displayLanguageName(params.targetLanguage),
    total_images: formatUsNumber(params.total),
    image_count: formatUsNumber(params.done),
    failed_count: formatUsNumber(params.failed),
    skipped_count: formatUsNumber(params.skipped),
    duration: formatDurationMinutes(params.createdAt, params.finishedAt),
    credits_used: formatUsNumber(params.creditsUsed),
    credits_remaining: formatUsNumber(params.creditsRemaining),
  };
}
