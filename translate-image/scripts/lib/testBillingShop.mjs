export const HARDCODED_TEST_BILLING_SHOPS = ["ciwishop.myshopify.com"];

export function normalizeShop(shop) {
  return String(shop || "").trim().toLowerCase();
}

export function isShopifyDotComEmail(email) {
  if (!email) return false;
  const trimmed = String(email).trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return false;
  if (trimmed.indexOf("@") !== at) return false;
  return trimmed.slice(at + 1) === "shopify.com";
}

function extraShopsFromEnv(env) {
  const raw = String(env?.BILLING_TEST_SHOPS || "").trim();
  if (!raw) return [];
  return raw.split(",").map((s) => normalizeShop(s)).filter(Boolean);
}

export function isProdTestBillingShop(shop, emails = [], env = process.env) {
  const domain = normalizeShop(shop);
  const allow = new Set([
    ...HARDCODED_TEST_BILLING_SHOPS,
    ...extraShopsFromEnv(env),
  ]);
  if (allow.has(domain)) return true;
  return (emails || []).some((item) => isShopifyDotComEmail(item));
}

export function shouldCreateTestCharge(shop, emails = [], env = process.env) {
  if (String(env?.BILLING_TEST || "").trim() === "true") return true;
  if (env?.NODE_ENV === "development" || env?.NODE_ENV === "test") return true;
  return isProdTestBillingShop(shop, emails, env);
}
