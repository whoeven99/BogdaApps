import assert from "node:assert/strict";
import test from "node:test";
import {
  findImageLikeNode,
  gidTail,
  mediaNodeMatches,
  mediaToImageConnection,
  pickPicturesByLanguage,
  productImageLookupIds,
} from "../app/server/picture/productMedia.ts";

const mediaId = "gid://shopify/MediaImage/111";
const sourceId = "gid://shopify/ImageSource/222";
const node = { id: mediaId, imageSourceId: sourceId, url: "https://cdn/a.jpg", altText: "bee" };

test("gidTail 取 GID 末段，也接受纯数字", () => {
  assert.equal(gidTail(mediaId), "111");
  assert.equal(gidTail("222"), "222");
  assert.equal(gidTail(""), "");
});

test("同一 media 节点：MediaImage / ImageSource / 旧 ProductImage 末段都能命中", () => {
  assert.equal(mediaNodeMatches(node, mediaId), true);
  assert.equal(mediaNodeMatches(node, sourceId), true);
  assert.equal(mediaNodeMatches(node, "gid://shopify/ProductImage/111"), true);
  assert.equal(mediaNodeMatches(node, "111"), true);
  assert.equal(mediaNodeMatches(node, "222"), true);
  assert.equal(mediaNodeMatches(node, "gid://shopify/ProductImage/222"), true);
  assert.equal(mediaNodeMatches(node, "999"), false);
});

test("mediaToImageConnection 用 MediaImage.id，并保留 ImageSource id", () => {
  const mapped = mediaToImageConnection({
    edges: [
      {
        node: {
          id: mediaId,
          image: { id: sourceId, url: "https://cdn/a.jpg", altText: "bee" },
        },
      },
      { node: { id: "gid://shopify/Video/1" } },
    ],
  });
  assert.equal(mapped.edges.length, 1);
  assert.equal(mapped.edges[0].node.id, mediaId);
  assert.equal(mapped.edges[0].node.imageSourceId, sourceId);
  assert.equal(findImageLikeNode(mapped.edges, "gid://shopify/ProductImage/111")?.url, "https://cdn/a.jpg");
  assert.equal(findImageLikeNode(mapped.edges, "222")?.id, mediaId);
  assert.equal(findImageLikeNode(mapped.edges, "999"), null);
});

test("productImageLookupIds 含 MediaImage / ImageSource / 旧 ProductImage", () => {
  const ids = productImageLookupIds({ mediaId, imageSourceId: sourceId });
  for (const id of [
    mediaId,
    sourceId,
    "gid://shopify/ProductImage/111",
    "gid://shopify/ProductImage/222",
  ]) {
    assert.equal(ids.includes(id), true, id);
  }
  assert.equal(new Set(ids).size, ids.length);
});

test("pickPicturesByLanguage 同一语言优先有译图的旧 ProductImage 行", () => {
  const preferred = mediaId;
  const picked = pickPicturesByLanguage(
    [
      {
        id: 2,
        imageId: preferred,
        languageCode: "de",
        imageAfterUrl: null,
        altAfterTranslation: null,
      },
      {
        id: 1,
        imageId: "gid://shopify/ProductImage/555",
        languageCode: "de",
        imageAfterUrl: "https://cdn/translated.jpg",
        altAfterTranslation: null,
      },
    ],
    preferred,
  );
  assert.equal(picked.length, 1);
  assert.equal(picked[0].imageId, "gid://shopify/ProductImage/555");
});
