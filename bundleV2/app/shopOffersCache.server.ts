import type { Offer } from "@prisma/client";
import prisma from "./db.server";

const cache = new Map<string, Offer[]>();

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isMissingOfferCampaignConfigColumnError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("campaignconfigjson") &&
    (
      message.includes("no such column") ||
      message.includes("has no column named") ||
      message.includes("column does not exist")
    )
  );
}

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

  let rows: Offer[];
  try {
    rows = await prisma.offer.findMany({
      where: { shopName: key },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (!isMissingOfferCampaignConfigColumnError(error)) {
      throw error;
    }
    console.warn(
      "[shop-offers-cache] campaignConfigJson column missing, using legacy select",
    );
    const legacyRows = await prisma.offer.findMany({
      where: { shopName: key },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shopName: true,
        status: true,
        name: true,
        cartTitle: true,
        offerType: true,
        discountRulesJson: true,
        selectedProductsJson: true,
        offerSettingsJson: true,
        startTime: true,
        endTime: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    rows = legacyRows.map((row) => ({
      ...row,
      campaignConfigJson: null,
    })) as Offer[];
  }

  cache.set(key, rows);
  return rows;
}
