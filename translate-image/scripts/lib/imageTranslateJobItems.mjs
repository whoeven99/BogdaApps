import {
  canonicalShopifyImageUrl,
  imageUrlKey,
  pictureUrlKey,
} from "./pictureUrlKey.mjs";

export const IMAGE_TRANSLATE_JOB_KINDS = ["content", "product"];

export const CONTENT_IMAGE_JOB_MAX_ITEMS = 500;
export const IMAGE_RESOURCE_BULK_SELECT_MAX = 20;

export function parseImageTranslateJobKind(value) {
  return value === "product" ? "product" : "content";
}

export function imageRowKey(row) {
  return row.productId ? `${row.productId}::${row.urlKey}` : row.urlKey;
}

export function dedupeByImageRowKey(items) {
  const seen = new Set();
  const rows = [];
  for (const item of items) {
    const key = imageRowKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(item);
  }
  return rows;
}

export function dedupeFailedImageItems(items) {
  return dedupeByImageRowKey(items);
}

export function isResourceImagesBatchTruncated(
  requestedCount,
  hitItemCap,
  selectMax = IMAGE_RESOURCE_BULK_SELECT_MAX,
) {
  return requestedCount > selectMax || hitItemCap;
}

export function normalizeImageJobItems(items, kind) {
  const byKey = new Map();
  for (const item of items ?? []) {
    const raw = String(item?.imageUrl ?? "");
    const shopifyKey = imageUrlKey(raw);
    if (kind === "product" && !shopifyKey) continue;
    const key = pictureUrlKey(raw);
    const url = shopifyKey ? canonicalShopifyImageUrl(raw) : key ? raw : null;
    const productId = kind === "content" ? "" : String(item?.productId ?? "").trim();
    if (!key || !url) continue;
    const mapKey = productId ? `${productId}::${key}` : key;
    if (byKey.has(mapKey)) continue;
    byKey.set(mapKey, {
      urlKey: key,
      imageUrl: url,
      resourceTitle: item.title?.slice(0, 200) || null,
      productId,
    });
  }
  return [...byKey.values()];
}
