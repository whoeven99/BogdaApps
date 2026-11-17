/**
 * 与 app/server/picture/imageUrlKey.ts 同口径。
 * 回填脚本 / 单测用；改规则时两边一起改。
 */
const CDN_FILES_PATH = /^\/s\/files\/1\/(?:\d+\/){2,3}(.+)$/;
const STOREFRONT_CDN_PATH = /\/cdn\/shop\/(.+)$/;
const THEME_ID_PREFIX = /^t\/\d+\//;
const SHOPIFY_SIZE_SUFFIX =
  /_(?:(?:\d+x\d*)|(?:x\d+)|(?:\{width\}(?:x(?:\{height\}|\d+)?)?))(?:_crop_(?:top|center|bottom|left|right))?(?:@[23]x)?(?=\.[a-z0-9]+$)/i;
const EXTERNAL_IMAGE_KEY_PREFIX = "ext:";
const PICTURE_URL_KEY_MAX = 512;
export const URL_KEY_LOOKUP_MAX = 200;

function decodeFileName(file) {
  try {
    return decodeURIComponent(file);
  } catch {
    return file;
  }
}

export function stripShopifyImageSizeSuffix(pathOrKey) {
  const trimmed = String(pathOrKey ?? "").trim();
  if (!trimmed) return trimmed;
  const slash = trimmed.lastIndexOf("/");
  const dir = slash >= 0 ? trimmed.slice(0, slash + 1) : "";
  const file = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  return dir + decodeFileName(file).replace(SHOPIFY_SIZE_SUFFIX, "");
}

export function normalizeUrlKeys(raw) {
  if (!Array.isArray(raw)) return [];
  const keys = raw
    .filter((k) => typeof k === "string" && k.length > 0 && k.length <= 512)
    .map((k) => (k.startsWith("ext:") ? k : stripShopifyImageSizeSuffix(k)))
    .filter((k) => k.length > 0);
  return [...new Set(keys)].slice(0, URL_KEY_LOOKUP_MAX);
}

function parseUrl(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const candidate = trimmed.split(",")[0]?.trim().split(/\s+/)[0] ?? "";
  if (!candidate) return null;
  try {
    return new URL(candidate.startsWith("//") ? `https:${candidate}` : candidate);
  } catch {
    return null;
  }
}

export function imageUrlKey(url) {
  const parsed = parseUrl(url ?? "");
  if (!parsed) return null;
  const pathname = parsed.pathname;
  const cdn = parsed.hostname === "cdn.shopify.com" ? CDN_FILES_PATH.exec(pathname) : null;
  const key = (cdn?.[1] ?? STOREFRONT_CDN_PATH.exec(pathname)?.[1] ?? "").trim();
  if (!key) return null;
  return stripShopifyImageSizeSuffix(key.replace(THEME_ID_PREFIX, "")) || null;
}

export function isPrivateIpAddress(ip) {
  const raw = String(ip || "").trim().toLowerCase();
  if (!raw) return true;
  const v4mapped = raw.startsWith("::ffff:") ? raw.slice(7) : null;
  const v4 = v4mapped ?? (/^\d{1,3}(\.\d{1,3}){3}$/.test(raw) ? raw : null);
  if (v4) {
    const p = v4.split(".").map((n) => Number(n));
    if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = p;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 255) return true;
    return false;
  }
  if (raw === "::" || raw === "::1") return true;
  if (raw.startsWith("fc") || raw.startsWith("fd")) return true;
  if (raw.startsWith("fe80:")) return true;
  return false;
}

export function isBlockedImageHost(hostname) {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "metadata.google.internal") return true;
  if (isPrivateIpAddress(host)) return true;
  return false;
}

export function externalImageUrlKey(url) {
  if (imageUrlKey(url)) return null;
  const parsed = parseUrl(url ?? "");
  if (!parsed) return null;
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  const host = parsed.hostname.trim().toLowerCase().replace(/\.$/, "");
  if (isBlockedImageHost(host)) return null;
  const path = parsed.pathname || "/";
  const key = `${EXTERNAL_IMAGE_KEY_PREFIX}${host}${path}`;
  if (key.length > PICTURE_URL_KEY_MAX) return null;
  return key;
}

export function pictureUrlKey(url) {
  return imageUrlKey(url) ?? externalImageUrlKey(url) ?? "";
}
