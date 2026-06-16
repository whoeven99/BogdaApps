import {
  fetchStoreProducts,
  fetchProductsByIds,
  fetchStoreCollections,
  fetchStoreProductCount,
  fetchProductIdsInCollections,
} from "../../../server/shopify/products.server";
import { collectReferencedProductIds } from "../../../server/offers/offerPayload.server";
import type { OfferListItem } from "../types";

type AdminType = {
  graphql: (
    query: string,
    opts?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
};

/**
 * Builder 打开时的上下文：不再扫全店，只取
 * ① 现有 offer 引用到的商品（编辑回填用）、② collection 列表、③ 商品总数（全店已选判定）。
 * 新增/批量选择由 resourcePicker 与按需 action（expand-collections / load-all-products）承担。
 */
export async function handleLoadStoreProducts(
  admin: AdminType,
  offers: OfferListItem[],
): Promise<Response> {
  const referencedIds = collectReferencedProductIds(offers);
  const [storeProducts, storeCollections, totalStoreProductCount] = await Promise.all([
    referencedIds.length > 0 ? fetchProductsByIds(admin, referencedIds) : Promise.resolve([]),
    fetchStoreCollections(admin),
    fetchStoreProductCount(admin),
  ]);
  return Response.json({ storeProducts, storeCollections, totalStoreProductCount });
}

/** 展开所选 collection → 去重商品 id（详情由前端 resourcePicker 回填）。 */
export async function handleExpandCollections(
  admin: AdminType,
  collectionIds: string[],
): Promise<Response> {
  const productIds = await fetchProductIdsInCollections(admin, collectionIds);
  return Response.json({ productIds });
}

/** 全量轻量商品（select-all / invert / exclude 点击时按需加载）。 */
export async function handleLoadAllProducts(admin: AdminType): Promise<Response> {
  const storeProducts = await fetchStoreProducts(admin);
  return Response.json({ storeProducts });
}
