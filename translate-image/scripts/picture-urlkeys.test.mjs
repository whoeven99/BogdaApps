import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  normalizeUrlKeys,
  pictureUrlKey,
  stripShopifyImageSizeSuffix,
} from "./lib/pictureUrlKey.mjs";

const STOREFRONT_CACHE_MAX_KEY_PART_LENGTH = 96;

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

test("pictureUrlKey Shopify CDN 剥尺寸并丢掉店铺 id 前缀", () => {
  assert.equal(
    pictureUrlKey("https://cdn.shopify.com/s/files/1/0610/1234/5678/files/a_720x.jpg?v=1"),
    "files/a.jpg",
  );
  assert.equal(
    pictureUrlKey("//shop.com/cdn/shop/files/a.jpg?v=1&width=600"),
    "files/a.jpg",
  );
  assert.equal(
    pictureUrlKey("https://cdn.shopify.com/s/files/1/0264/0391/products/a_1024x1024@2x.jpg"),
    "products/a.jpg",
  );
  assert.equal(
    pictureUrlKey(
      "https://cdn.shopify.com/s/files/1/0610/1234/5678/t/88421/assets/banner_{width}.jpg",
    ),
    "assets/banner.jpg",
  );
});

test("pictureUrlKey 外部 https 走 ext:，不剥文件名尺寸", () => {
  assert.equal(
    pictureUrlKey("https://cdn.example.com/hero_720x.jpg?w=1"),
    "ext:cdn.example.com/hero_720x.jpg",
  );
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
