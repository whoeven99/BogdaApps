import assert from "node:assert/strict";
import test from "node:test";
import {
  collectionImageSourceRows,
  encodeCollectionImageRowId,
  parseCollectionImageRowId,
} from "./lib/collectionImages.mjs";
import { isLeftoverFileKey, leftoverUrlKeys } from "./lib/leftoverImages.mjs";
import { imageUrlKey, isCiwiTranslatedImageFilename } from "./lib/pictureUrlKey.mjs";

const FEATURED = "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/cover.jpg";
const BODY = "https://cdn.shopify.com/s/files/1/0610/1234/5678/files/body.jpg";
const FEATURED_QUERY = `${FEATURED}?v=9`;

test("集合扁平行 id 编解码", () => {
  const id = encodeCollectionImageRowId("gid://shopify/Collection/1", "files/cover.jpg");
  assert.equal(id, "gid://shopify/Collection/1|files/cover.jpg");
  assert.deepEqual(parseCollectionImageRowId(id), {
    collectionId: "gid://shopify/Collection/1",
    urlKey: "files/cover.jpg",
  });
  assert.equal(parseCollectionImageRowId("no-pipe"), null);
  assert.equal(parseCollectionImageRowId("|files/a.jpg"), null);
});

test("集合封面优先，正文同 urlKey 去重", () => {
  const rows = collectionImageSourceRows({
    id: "gid://shopify/Collection/1",
    title: "Summer",
    imageUrl: FEATURED,
    descriptionHtml: `<img src="${FEATURED_QUERY}" /><img src="${BODY}" />`,
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].urlKey, imageUrlKey(FEATURED));
  assert.equal(rows[0].usedIn[0].title, "Summer");
  assert.equal(rows[1].urlKey, imageUrlKey(BODY));
});

test("Files 差集只扣主题和集合，不扣商品/文章/页面", () => {
  const keys = ["files/theme.jpg", "files/col.jpg", "files/product.jpg", "files/other.jpg"];
  assert.deepEqual(
    leftoverUrlKeys(keys, {
      theme: ["files/theme.jpg"],
      collection: ["files/col.jpg"],
    }),
    ["files/product.jpg", "files/other.jpg"],
  );
});

test("译图文件名不进未分类", () => {
  assert.equal(isCiwiTranslatedImageFilename("files/banner-ciwi-ja.png"), true);
  assert.equal(isCiwiTranslatedImageFilename("files/banner.jpg"), false);
  assert.equal(
    isLeftoverFileKey("files/banner-ciwi-fr.jpg", { theme: [], collection: [] }),
    false,
  );
  assert.equal(isLeftoverFileKey("files/banner.jpg", { theme: [], collection: [] }), true);
  assert.equal(
    isLeftoverFileKey("files/banner.jpg", { theme: ["files/banner.jpg"], collection: [] }),
    false,
  );
});
