import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

const URL_KEY_LOOKUP_MAX = 200;
const STOREFRONT_CACHE_MAX_KEY_PART_LENGTH = 96;
const SHOPIFY_SIZE_SUFFIX =
  /_(?:(?:\d+x\d*)|(?:x\d+)|(?:\{width\}(?:x(?:\{height\}|\d+)?)?))(?:_crop_(?:top|center|bottom|left|right))?(?:@[23]x)?(?=\.[a-z0-9]+$)/i;

function stripShopifyImageSizeSuffix(pathOrKey) {
  const trimmed = String(pathOrKey ?? "").trim();
  if (!trimmed) return trimmed;
  const slash = trimmed.lastIndexOf("/");
  const dir = slash >= 0 ? trimmed.slice(0, slash + 1) : "";
  const file = slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
  let decoded = file;
  try {
    decoded = decodeURIComponent(file);
  } catch {
    decoded = file;
  }
  return dir + decoded.replace(SHOPIFY_SIZE_SUFFIX, "");
}

function normalizeUrlKeys(raw) {
  if (!Array.isArray(raw)) return [];
  const keys = raw
    .filter((k) => typeof k === "string" && k.length > 0 && k.length <= 512)
    .map((k) => (k.startsWith("ext:") ? k : stripShopifyImageSizeSuffix(k)))
    .filter((k) => k.length > 0);
  return [...new Set(keys)].slice(0, URL_KEY_LOOKUP_MAX);
}

function normalizeStorefrontCacheKeyPart(part) {
  const safe = part.replace(/\s+/g, "_");
  if (safe.length <= STOREFRONT_CACHE_MAX_KEY_PART_LENGTH) return safe;
  return createHash("sha1").update(safe).digest("base64url");
}

test("normalizeUrlKeys 去重并丢掉空串", () => {
  assert.deepEqual(normalizeUrlKeys(["files/a.jpg", "files/a.jpg", ""]), ["files/a.jpg"]);
});

test("normalizeUrlKeys 非数组返回空", () => {
  assert.deepEqual(normalizeUrlKeys("files/a.jpg"), []);
});

test("normalizeUrlKeys 最多 200 个", () => {
  const keys = Array.from({ length: 250 }, (_, i) => `files/${i}.jpg`);
  assert.equal(normalizeUrlKeys(keys).length, 200);
});

test("stripShopifyImageSizeSuffix 剥 _720x / _{width} / @2x", () => {
  assert.equal(stripShopifyImageSizeSuffix("files/a_720x.jpg"), "files/a.jpg");
  assert.equal(stripShopifyImageSizeSuffix("files/a_1024x1024@2x.jpg"), "files/a.jpg");
  assert.equal(stripShopifyImageSizeSuffix("files/a_{width}.jpg"), "files/a.jpg");
  assert.equal(stripShopifyImageSizeSuffix("files/a_%7Bwidth%7D.jpg"), "files/a.jpg");
  assert.equal(stripShopifyImageSizeSuffix("files/a.jpg"), "files/a.jpg");
});

test("stripShopifyImageSizeSuffix 不剥 Amazon 风格原名", () => {
  assert.equal(
    stripShopifyImageSizeSuffix("files/foo_AC_SX720_.jpg"),
    "files/foo_AC_SX720_.jpg",
  );
});

test("normalizeUrlKeys 把带尺寸后缀的 key 并到规范 key", () => {
  assert.deepEqual(normalizeUrlKeys(["files/a_720x.jpg", "files/a.jpg"]), ["files/a.jpg"]);
});

test("normalizeUrlKeys 不剥 ext: 外部 key", () => {
  assert.deepEqual(normalizeUrlKeys(["ext:cdn.example.com/hero_720x.jpg"]), [
    "ext:cdn.example.com/hero_720x.jpg",
  ]);
});

test("normalizeStorefrontCacheKeyPart 短 extra 原样保留", () => {
  const part = "files/a.jpg";
  assert.equal(normalizeStorefrontCacheKeyPart(part), part);
});

test("normalizeStorefrontCacheKeyPart 超 96 字符走 sha1", () => {
  const part = "k".repeat(97);
  const hashed = normalizeStorefrontCacheKeyPart(part);
  assert.equal(hashed, createHash("sha1").update(part).digest("base64url"));
  assert.ok(hashed.length < part.length);
});
