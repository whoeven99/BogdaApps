import { fetchStoreProducts } from "../../../server/shopify/products.server";
import { collectReferencedProductIds } from "../../../server/offers/offerPayload.server";
import type { OfferListItem } from "../types";

type AdminType = {
  graphql: (query: string, opts?: { variables?: unknown }) => Promise<{ json: () => Promise<unknown> }>;
};

export async function handleLoadStoreProducts(
  admin: AdminType,
  offers: OfferListItem[],
): Promise<Response> {
  const storeProducts = await fetchStoreProducts(admin, collectReferencedProductIds(offers));
  return Response.json({ storeProducts });
}
