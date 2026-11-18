import { getImageRedisClient } from "~/server/redis.server";
import { postShopGraphql } from "~/server/shop/shopAdminToken.server";

const CACHE_TTL_SECONDS = 3600;

export type ShopLocalesSnapshot = {
  locales: string[];
  primary: string;
};

function cacheKey(shop: string): string {
  return `img:shop-locales:${shop.trim()}`;
}

function parseSnapshot(raw: string | null): ShopLocalesSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ShopLocalesSnapshot;
    if (!Array.isArray(parsed.locales)) return null;
    return {
      locales: parsed.locales.map((locale) => String(locale)).filter(Boolean),
      primary: String(parsed.primary || ""),
    };
  } catch {
    return null;
  }
}

async function fetchShopLocalesFromShopify(shop: string): Promise<ShopLocalesSnapshot> {
  const data = await postShopGraphql({
    shop,
    path: "shopLocales",
    query: `query ShopLocales {
      shopLocales { locale primary }
    }`,
  });
  const raw = Array.isArray(data?.data?.shopLocales) ? data.data.shopLocales : [];
  const rows: Array<{ locale?: string; primary?: boolean }> = raw.filter(
    (row: unknown): row is { locale?: string; primary?: boolean } =>
      Boolean(row) && typeof row === "object",
  );
  const locales = rows
    .map((row) => String(row.locale || "").trim())
    .filter((locale): locale is string => Boolean(locale));
  const primary =
    rows.find((row) => row.primary)?.locale?.trim() || locales[0] || "";
  return { locales: [...new Set(locales)], primary };
}

export async function loadCachedShopLocales(shop: string): Promise<ShopLocalesSnapshot> {
  const redis = getImageRedisClient();
  const key = cacheKey(shop);
  if (redis) {
    try {
      const cached = parseSnapshot(await redis.get(key));
      if (cached) return cached;
    } catch {
      /* fall through */
    }
  }
  const snapshot = await fetchShopLocalesFromShopify(shop);
  if (redis && snapshot.locales.length) {
    try {
      await redis.set(key, JSON.stringify(snapshot), "EX", CACHE_TTL_SECONDS);
    } catch {
      /* ignore */
    }
  }
  return snapshot;
}
