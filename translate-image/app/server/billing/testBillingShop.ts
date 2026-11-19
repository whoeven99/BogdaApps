export const HARDCODED_TEST_BILLING_SHOPS = ["ciwishop.myshopify.com"];

export type BillingEnvLike = {
  BILLING_TEST?: string;
  BILLING_TEST_SHOPS?: string;
  NODE_ENV?: string;
};

export function normalizeShop(shop: string | null | undefined): string {
  return String(shop || "").trim().toLowerCase();
}

export function isShopifyDotComEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const trimmed = String(email).trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return false;
  if (trimmed.indexOf("@") !== at) return false;
  return trimmed.slice(at + 1) === "shopify.com";
}

function extraShopsFromEnv(env: BillingEnvLike): string[] {
  const raw = String(env?.BILLING_TEST_SHOPS || "").trim();
  if (!raw) return [];
  return raw.split(",").map((s) => normalizeShop(s)).filter(Boolean);
}

export function isProdTestBillingShop(
  shop: string,
  emails: Array<string | null | undefined> = [],
  env: BillingEnvLike = process.env,
): boolean {
  const domain = normalizeShop(shop);
  const allow = new Set([
    ...HARDCODED_TEST_BILLING_SHOPS,
    ...extraShopsFromEnv(env),
  ]);
  if (allow.has(domain)) return true;
  return emails.some((item) => isShopifyDotComEmail(item));
}

export function shouldCreateTestCharge(
  shop: string,
  emails: Array<string | null | undefined> = [],
  env: BillingEnvLike = process.env,
): boolean {
  if (String(env?.BILLING_TEST || "").trim() === "true") return true;
  if (env?.NODE_ENV === "development" || env?.NODE_ENV === "test") return true;
  return isProdTestBillingShop(shop, emails, env);
}
