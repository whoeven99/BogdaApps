/**
 * Shopify CDN 图片的规范路径，App 选图 / Worker 落库 / 店面换图三处同口径。
 *
 * 同一张图在后台与店面会以不同形态出现：
 * - `https://cdn.shopify.com/s/files/1/0610/1234/5678/files/a.jpg?v=1`
 * - `//shop.com/cdn/shop/files/a.jpg?v=1&width=600`
 * - 老店 `https://cdn.shopify.com/s/files/1/0264/0391/products/a.jpg`
 * - 主题资产 `https://cdn.shopify.com/s/files/1/0610/1234/5678/t/88421/assets/banner.jpg`
 * - 老式缩略 `files/a_720x.jpg` / `a_1024x1024@2x.jpg`（主题 `img_url`）
 * - 主题 srcset 占位 `a_{width}.jpg` / `a_%7Bwidth%7D.jpg`
 * 前三者归一成 `files/a.jpg` / `products/a.jpg`；主题资产去掉 `t/{themeId}/`，成 `assets/banner.jpg`。
 * 尺寸后缀剥掉，与 `?width=` 形态落到同一 key。Amazon `_AC_SX720_` 这类原名不动。
 *
 * 店面 `ciwi-ui.js` `contentImageUrlKey` / `stripShopifyImageSizeSuffix` 必须同步。
 * 非 Shopify 图的规范 key 是 `ext:{host}{pathname}`，query/hash 不进 key；店面必须同步。
 */
const CDN_FILES_PATH = /^\/s\/files\/1\/(?:\d+\/){2,3}(.+)$/;
const STOREFRONT_CDN_PATH = /\/cdn\/shop\/(.+)$/;
/** 主题 CDN 带 `t/{themeId}/`，换主题后 ID 会变，不进 urlKey。 */
const THEME_ID_PREFIX = /^t\/\d+\//;
/** `_720x` / `_1024x1024` / `_x450` / `_{width}` + 可选 crop / `@2x`，紧贴扩展名。 */
const SHOPIFY_SIZE_SUFFIX =
  /_(?:(?:\d+x\d*)|(?:x\d+)|(?:\{width\}(?:x(?:\{height\}|\d+)?)?))(?:_crop_(?:top|center|bottom|left|right))?(?:@[23]x)?(?=\.[a-z0-9]+$)/i;

function decodeFileName(file: string): string {
  try {
    return decodeURIComponent(file);
  } catch {
    return file;
  }
}

/** 剥文件名上的 Shopify 老式尺寸。已是规范 key / 路径也可再跑一遍。 */
export function stripShopifyImageSizeSuffix(pathOrKey: string): string {
  const trimmed = String(pathOrKey ?? "").trim();
  if (!trimmed) return trimmed;
  const slash = trimmed.lastIndexOf("/");
  const dir = slash >= 0 ? trimmed.slice(0, slash + 1) : "";
  const file = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  return dir + decodeFileName(file).replace(SHOPIFY_SIZE_SUFFIX, "");
}

/** 店面一次最多查的 urlKey 数，对齐 TSF。 */
export const URL_KEY_LOOKUP_MAX = 200;

/** 查询侧归一：剥 `_720x` / `_{width}`，`ext:` 原样保留。 */
export function normalizeUrlKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const keys = raw
    .filter((k): k is string => typeof k === "string" && k.length > 0 && k.length <= 512)
    .map((k) => (k.startsWith("ext:") ? k : stripShopifyImageSizeSuffix(k)))
    .filter((k) => k.length > 0);
  return [...new Set(keys)].slice(0, URL_KEY_LOOKUP_MAX);
}

function parseUrl(raw: string): URL | null {
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

export function imageUrlKey(url: string | null | undefined): string | null {
  const parsed = parseUrl(url ?? "");
  if (!parsed) return null;
  const pathname = parsed.pathname;
  const cdn = parsed.hostname === "cdn.shopify.com" ? CDN_FILES_PATH.exec(pathname) : null;
  const key = (cdn?.[1] ?? STOREFRONT_CDN_PATH.exec(pathname)?.[1] ?? "").trim();
  if (!key) return null;
  return stripShopifyImageSizeSuffix(key.replace(THEME_ID_PREFIX, "")) || null;
}

/** 我们上传到 Files 的译图文件名 / urlKey（`foo-ciwi-ja.png`）。未分类列表要排除这些。 */
const CIWI_TRANSLATED_FILENAME = /-ciwi-[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/i;

export function isCiwiTranslatedImageFilename(nameOrKey: string): boolean {
  const name = String(nameOrKey ?? "").split(/[\\/]/).pop() ?? "";
  return CIWI_TRANSLATED_FILENAME.test(name);
}

export function isShopifyCdnImageUrl(url: string | null | undefined): boolean {
  return imageUrlKey(url) !== null;
}

export const EXTERNAL_IMAGE_KEY_PREFIX = "ext:";
export const PICTURE_URL_KEY_MAX = 512;

export function isPrivateIpAddress(ip: string): boolean {
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

export function isBlockedImageHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase().replace(/\.$/, "");
  if (!host) return true;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  if (host === "metadata.google.internal") return true;
  if (isPrivateIpAddress(host)) return true;
  return false;
}

export function externalImageUrlKey(url: string | null | undefined): string | null {
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

export function pictureUrlKey(url: string | null | undefined): string | null {
  return imageUrlKey(url) ?? externalImageUrlKey(url);
}

/** 去掉 query / hash 的 https 地址，作为内容图 `UserPicture.imageBeforeUrl`。 */
export function canonicalShopifyImageUrl(url: string): string | null {
  if (!imageUrlKey(url)) return null;
  const parsed = parseUrl(url)!;
  parsed.pathname = stripShopifyImageSizeSuffix(parsed.pathname);
  parsed.search = "";
  parsed.hash = "";
  parsed.protocol = "https:";
  return parsed.toString();
}

const IMG_TAG = /<img\b[^>]*>/gi;
const IMG_SRC_ATTR = /\s(?:data-)?src\s*=\s*(["'])(.*?)\1/i;
const IMG_ALT_ATTR = /\salt\s*=\s*(["'])(.*?)\1/i;

export type ShopifyHtmlImage = { url: string; alt: string };

function decodeHtmlAttr(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** 抽出富文本里的 Shopify CDN 图片及 alt（按 urlKey 去重，保持出现顺序）。空 alt 也保留。 */
export function extractShopifyImagesFromHtml(
  html: string | null | undefined,
): ShopifyHtmlImage[] {
  const seen = new Set<string>();
  const out: ShopifyHtmlImage[] = [];
  for (const match of String(html ?? "").matchAll(IMG_TAG)) {
    const tag = match[0] ?? "";
    const srcMatch = IMG_SRC_ATTR.exec(tag);
    const src = decodeHtmlAttr(srcMatch?.[2] ?? "").trim();
    const key = imageUrlKey(src);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const altMatch = IMG_ALT_ATTR.exec(tag);
    out.push({ url: src, alt: decodeHtmlAttr(altMatch?.[2] ?? "").trim() });
  }
  return out;
}

/** 抽出富文本里的 Shopify CDN 图片（按 urlKey 去重，保持出现顺序）。 */
export function extractShopifyImageUrlsFromHtml(html: string | null | undefined): string[] {
  return extractShopifyImagesFromHtml(html).map((item) => item.url);
}

/** 下载原图时让 Shopify CDN 先缩到 `width` 以内，控制送模型的体积。 */
export function shopifyCdnImageUrlWithWidth(url: string, width: number): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;
  parsed.searchParams.set("width", String(width));
  return parsed.toString();
}
