import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalShopifyImageUrl,
  imageUrlKey,
} from "./lib/pictureUrlKey.mjs";

function groupProductResourceImages(args) {
  const owner = { id: args.productId, title: args.title };
  const seen = new Set();
  const rows = [];
  const push = (url, productId) => {
    const key = imageUrlKey(url);
    const canonical = canonicalShopifyImageUrl(url);
    if (!key || !canonical || seen.has(key)) return;
    seen.add(key);
    rows.push({
      urlKey: key,
      imageUrl: canonical,
      usedIn: [owner],
      ...(productId ? { productId } : {}),
    });
  };
  for (const url of args.mediaUrls) push(url, args.productId);
  for (const url of args.bodyUrls) push(url);
  return rows;
}

test("相册优先于正文同一 urlKey", () => {
  const media = "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/a.jpg";
  const bodySame = "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/a.jpg?v=9";
  const bodyOther = "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/b.jpg";
  const rows = groupProductResourceImages({
    productId: "gid://shopify/Product/1",
    title: "Hat",
    mediaUrls: [media],
    bodyUrls: [bodySame, bodyOther],
  });
  assert.equal(rows.length, 2);
  const aKey = imageUrlKey(media);
  const a = rows.find((r) => r.urlKey === aKey);
  assert.equal(a.productId, "gid://shopify/Product/1");
  const b = rows.find((r) => r !== a);
  assert.equal(b.productId || "", "");
});
