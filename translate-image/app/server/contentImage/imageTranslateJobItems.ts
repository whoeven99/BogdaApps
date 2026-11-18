import {
  canonicalShopifyImageUrl,
  imageUrlKey,
  pictureUrlKey,
} from "~/server/picture/imageUrlKey";

export const IMAGE_TRANSLATE_JOB_KINDS = ["content", "product"] as const;
export type ImageTranslateJobKind = (typeof IMAGE_TRANSLATE_JOB_KINDS)[number];

export type JobItemInput = { imageUrl: string; title?: string; productId?: string };

export const CONTENT_IMAGE_JOB_MAX_ITEMS = 500;
export const IMAGE_RESOURCE_BULK_SELECT_MAX = 20;

export function parseImageTranslateJobKind(value: unknown): ImageTranslateJobKind {
  return value === "product" ? "product" : "content";
}

export function imageRowKey(row: { urlKey: string; productId?: string | null }): string {
  return row.productId ? `${row.productId}::${row.urlKey}` : row.urlKey;
}

export function dedupeByImageRowKey<T extends { urlKey: string; productId?: string | null }>(
  items: T[],
): T[] {
  const seen = new Set<string>();
  const rows: T[] = [];
  for (const item of items) {
    const key = imageRowKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(item);
  }
  return rows;
}

export function dedupeFailedImageItems<T extends { urlKey: string; productId: string }>(
  items: T[],
): T[] {
  return dedupeByImageRowKey(items);
}

export function isResourceImagesBatchTruncated(
  requestedCount: number,
  hitItemCap: boolean,
  selectMax = IMAGE_RESOURCE_BULK_SELECT_MAX,
): boolean {
  return requestedCount > selectMax || hitItemCap;
}

export function normalizeImageJobItems(
  items: JobItemInput[],
  kind: ImageTranslateJobKind,
): Array<{ urlKey: string; imageUrl: string; resourceTitle: string | null; productId: string }> {
  const byKey = new Map<
    string,
    { urlKey: string; imageUrl: string; resourceTitle: string | null; productId: string }
  >();
  for (const item of items) {
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
