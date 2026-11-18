import assert from "node:assert/strict";
import test from "node:test";
import {
  parseImageTranslateJobKind,
  imageRowKey,
  dedupeByImageRowKey,
  normalizeImageJobItems,
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
} from "./lib/imageTranslateJobItems.mjs";

const SHOPIFY_A = "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/a.jpg";
const SHOPIFY_A_V2 = "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/a.jpg?v=2";

test("kind 只有 product 为 product", () => {
  assert.equal(parseImageTranslateJobKind("product"), "product");
  assert.equal(parseImageTranslateJobKind("content"), "content");
  assert.equal(parseImageTranslateJobKind("nope"), "content");
});

test("rowKey：有 productId 则 gid::urlKey", () => {
  assert.equal(
    imageRowKey({ urlKey: "files/a.jpg", productId: "gid://shopify/Product/1" }),
    "gid://shopify/Product/1::files/a.jpg",
  );
  assert.equal(imageRowKey({ urlKey: "files/a.jpg", productId: "" }), "files/a.jpg");
});

test("product kind 丢非 Shopify URL；content 保留 ext:", () => {
  const product = normalizeImageJobItems(
    [{ imageUrl: "https://cdn.judgeme.com/a.jpg", productId: "gid://shopify/Product/1" }],
    "product",
  );
  assert.equal(product.length, 0);
  const content = normalizeImageJobItems(
    [{ imageUrl: "https://cdn.judgeme.com/a.jpg?width=100", title: "Review" }],
    "content",
  );
  assert.equal(content.length, 1);
  assert.ok(content[0].urlKey.startsWith("ext:"));
  assert.equal(content[0].productId, "");
});

test("同 urlKey×productId 去重，帽常量", () => {
  assert.equal(CONTENT_IMAGE_JOB_MAX_ITEMS, 500);
  assert.equal(IMAGE_RESOURCE_BULK_SELECT_MAX, 20);
  const rows = normalizeImageJobItems(
    [
      { imageUrl: SHOPIFY_A, productId: "gid://shopify/Product/1" },
      { imageUrl: SHOPIFY_A_V2, productId: "gid://shopify/Product/1" },
    ],
    "product",
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].urlKey, "files/a.jpg");
  assert.equal(isResourceImagesBatchTruncated(21, false), true);
  assert.equal(isResourceImagesBatchTruncated(20, true), true);
  assert.equal(isResourceImagesBatchTruncated(2, false), false);
});

test("dedupeByImageRowKey 保序", () => {
  const rows = dedupeByImageRowKey([
    { urlKey: "files/a.jpg", productId: "p1" },
    { urlKey: "files/b.jpg", productId: "" },
    { urlKey: "files/a.jpg", productId: "p1" },
  ]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].urlKey, "files/a.jpg");
  assert.equal(rows[1].urlKey, "files/b.jpg");
});
