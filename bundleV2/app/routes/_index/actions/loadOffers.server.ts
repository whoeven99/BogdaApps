import { getCachedShopOffers } from "../../../shopOffersCache.server";

export async function handleLoadOffers(shopName: string): Promise<Response> {
  try {
    const offers = await getCachedShopOffers(shopName);
    return Response.json({ offers });
  } catch (error) {
    console.error("Failed to get cached shop offers", error);
    return Response.json({ offers: [] });
  }
}
