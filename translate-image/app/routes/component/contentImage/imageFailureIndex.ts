import { imageRowKey, type ContentImageJobItem } from "./contentImageClient";

export type RecentImageFailureIndex = {
  /** 按图行 key 最近失败记录（用于 L2 / 扁平行状态）。 */
  byRowKey: Map<string, ContentImageJobItem>;
  /** 商品 GID → 该资源下失败张数（用于 L1 目录行）。 */
  failuresByResourceId: Map<string, number>;
  total: number;
};

export function buildRecentImageFailureIndex(
  items: ContentImageJobItem[],
): RecentImageFailureIndex {
  const byRowKey = new Map<string, ContentImageJobItem>();
  const failuresByResourceId = new Map<string, number>();
  let total = 0;
  for (const item of items) {
    if (item.status !== "FAILED") continue;
    total += 1;
    const key = imageRowKey({ urlKey: item.urlKey, productId: item.productId });
    byRowKey.set(key, item);
    if (item.productId) {
      failuresByResourceId.set(
        item.productId,
        (failuresByResourceId.get(item.productId) ?? 0) + 1,
      );
    }
  }
  return { byRowKey, failuresByResourceId, total };
}
