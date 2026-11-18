/**
 * 集合扁平行 id 与封面/描述拆图。与 collectionImages.server.ts 同口径。
 */
import {
  canonicalShopifyImageUrl,
  imageUrlKey,
} from "./pictureUrlKey.mjs";

const IMG_SRC_ATTR = /\bsrc\s*=\s*(["'])(.*?)\1/gi;

export function encodeCollectionImageRowId(collectionId, urlKey) {
  return `${collectionId}|${urlKey}`;
}

export function parseCollectionImageRowId(id) {
  const trimmed = String(id ?? "").trim();
  const sep = trimmed.indexOf("|");
  if (sep <= 0) return null;
  const collectionId = trimmed.slice(0, sep).trim();
  const urlKey = trimmed.slice(sep + 1).trim();
  if (!collectionId || !urlKey) return null;
  return { collectionId, urlKey };
}

function extractShopifyImageUrlsFromHtml(html) {
  const urls = [];
  const seen = new Set();
  const source = String(html ?? "");
  for (const match of source.matchAll(IMG_SRC_ATTR)) {
    const url = String(match[2] ?? "").trim();
    const key = imageUrlKey(url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    urls.push(url);
  }
  return urls;
}

export function collectionImageSourceRows(input) {
  const owner = { id: input.id, title: input.title };
  const seen = new Set();
  const rows = [];
  const push = (url) => {
    const raw = String(url ?? "").trim();
    if (!raw) return;
    const key = imageUrlKey(raw);
    const canonical = canonicalShopifyImageUrl(raw);
    if (!key || !canonical || seen.has(key)) return;
    seen.add(key);
    rows.push({ urlKey: key, imageUrl: canonical, usedIn: [owner] });
  };
  push(input.imageUrl);
  for (const url of extractShopifyImageUrlsFromHtml(input.descriptionHtml ?? "")) push(url);
  return rows;
}
