import assert from "node:assert/strict";
import test from "node:test";
import {
  appendImageListQuery,
  contentImageRowMatchesPreview,
  gidTail,
  legacySingleImageRedirectPath,
  legacyThirdPartyImageRedirectPath,
  resourceRowMatchesPreview,
  selectFailedContentRows,
} from "./lib/imageListDeepLink.mjs";

test("gidTail 取 GID 最后一段", () => {
  assert.equal(gidTail("gid://shopify/Product/1234567890"), "1234567890");
  assert.equal(gidTail("1234567890"), "1234567890");
  assert.equal(gidTail(""), "");
});

test("appendImageListQuery 叠 language / preview / failed", () => {
  assert.equal(
    appendImageListQuery("/app/products/1", { language: "fr", preview: "img" }),
    "/app/products/1?language=fr&preview=img",
  );
  assert.equal(
    appendImageListQuery("/app/product?language=fr", { failed: true }),
    "/app/product?language=fr&failed=1",
  );
  assert.equal(
    appendImageListQuery("/app/product?failed=1&language=fr", { failed: false }),
    "/app/product?language=fr",
  );
});

test("旧商品 / 文章单图 URL 进对应 L2 并带 preview", () => {
  assert.equal(
    legacySingleImageRedirectPath({
      type: "products",
      productId: "111",
      imageId: "222",
      language: "fr",
    }),
    "/app/products/111?language=fr&preview=222",
  );
  assert.equal(
    legacySingleImageRedirectPath({
      type: "articles",
      productId: "gid://shopify/Article/333",
      imageId: "gid://shopify/MediaImage/444",
    }),
    "/app/articles/333?preview=gid%3A%2F%2Fshopify%2FMediaImage%2F444",
  );
});

test("billing 回跳 /app/images 进商品 L2", () => {
  assert.equal(
    legacySingleImageRedirectPath({
      type: "images",
      productId: "111",
      imageId: "222",
    }),
    "/app/products/111?preview=222",
  );
});

test("主题类旧 URL 进扁平行 L1", () => {
  assert.equal(
    legacySingleImageRedirectPath({
      type: "online_store_theme",
      productId: "digest",
      imageId: "digest",
    }),
    "/app/theme?preview=digest",
  );
});

test("第三方旧单图有 pagePath 进 L2", () => {
  assert.equal(
    legacyThirdPartyImageRedirectPath({
      urlKey: "ext:cdn.example.com/a.jpg",
      pagePath: "/products/hat",
      language: "fr",
    }),
    "/app/third-party/pages/%2Fproducts%2Fhat?language=fr&preview=ext%3Acdn.example.com%2Fa.jpg",
  );
});

test("第三方旧单图无 pagePath 进 L1 仍带 preview", () => {
  assert.equal(
    legacyThirdPartyImageRedirectPath({
      urlKey: "ext:cdn.example.com/a.jpg",
    }),
    "/app/third-party?preview=ext%3Acdn.example.com%2Fa.jpg",
  );
});

test("preview 匹配 urlKey / 图片 URL / GID 尾段", () => {
  const row = {
    urlKey: "files/a.jpg",
    imageUrl: "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/a.jpg",
    productId: "gid://shopify/Product/111",
  };
  assert.equal(contentImageRowMatchesPreview(row, "files/a.jpg"), true);
  assert.equal(contentImageRowMatchesPreview(row, "gid://shopify/Product/111"), true);
  assert.equal(contentImageRowMatchesPreview(row, "12345678"), false);
  assert.equal(
    contentImageRowMatchesPreview(row, encodeURIComponent("files/a.jpg")),
    true,
  );
  assert.equal(
    resourceRowMatchesPreview({ id: "files/a.jpg", urlKey: "files/a.jpg", imageUrl: row.imageUrl }, "files/a.jpg"),
    true,
  );
});

test("失败筛选：本页有失败则只留本页，否则回退全局失败行", () => {
  const local = [
    { urlKey: "files/a.jpg", productId: "gid://shopify/Product/1" },
    { urlKey: "files/b.jpg", productId: "gid://shopify/Product/1" },
  ];
  const keys = new Set(["gid://shopify/Product/1::files/a.jpg"]);
  const fallback = [{ urlKey: "files/z.jpg" }];
  assert.deepEqual(selectFailedContentRows(local, keys, fallback), [local[0]]);
  assert.deepEqual(selectFailedContentRows(local, new Set(), fallback), fallback);
  const asMap = new Map([["gid://shopify/Product/1::files/a.jpg", { status: "FAILED" }]]);
  assert.deepEqual(selectFailedContentRows(local, asMap, fallback), [local[0]]);
});
