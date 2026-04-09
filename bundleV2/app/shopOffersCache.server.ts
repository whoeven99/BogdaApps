import type { Offer } from "@prisma/client";
import prisma from "./db.server";

const cache = new Map<string, Offer[]>();

export function normalizeShopOffersCacheKey(shopName: string): string {
  return shopName.trim();
}

/** 后台改 offer / 同步 metafield 后调用，避免 pixel 或其它读路径吃到旧列表。 */
export function invalidateShopOffersCache(shopName: string): void {
  const key = normalizeShopOffersCacheKey(shopName);
  if (!key) return;
  cache.delete(key);
  console.log("[shop-offers-cache] invalidated", { shopName: key });
}

/**
 * 按店铺缓存 `Offer.findMany({ where: { shopName } })` 结果。
 * 供 admin loader、后续 webpixer 读库等复用。
 */
export async function getCachedShopOffers(shopName: string): Promise<Offer[]> {
  const key = normalizeShopOffersCacheKey(shopName);
  if (!key) return [];

  const hit = cache.get(key);
  if (hit) return hit;

  const rows = await prisma.offer.findMany({
    where: { shopName: key },
    orderBy: { createdAt: "desc" },
  });

  cache.set(key, rows);
  return rows;
}
