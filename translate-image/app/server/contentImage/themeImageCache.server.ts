import type { ImageResourceRow } from "./resourceImages.server";

export const THEME_IMAGE_CACHE_TTL_SEC = 180;
const CACHE_VERSION = "v1";

export type ThemeImageCacheRedis = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
};

export function themeImageCacheKey(shop: string): string {
  return `img:theme-images:${CACHE_VERSION}:${shop.trim()}`;
}

export async function defaultThemeImageRedis(): Promise<ThemeImageCacheRedis | null> {
  try {
    const { getImageRedisClient } = await import("~/server/redis.server");
    const client = getImageRedisClient();
    if (!client) return null;
    // ioredis `set` 的重载把第 3 参当成 callback，不能直接当成 ThemeImageCacheRedis。
    return {
      get: (key) => client.get(key),
      set: (key, value, mode, ttl) =>
        mode === "EX" && typeof ttl === "number"
          ? client.set(key, value, "EX", ttl)
          : client.set(key, value),
    };
  } catch {
    return null;
  }
}

export async function readThemeImageCache(
  shop: string,
  redis?: ThemeImageCacheRedis | null,
): Promise<ImageResourceRow[] | null> {
  if (!shop.trim() || !redis) return null;
  try {
    const raw = await redis.get(themeImageCacheKey(shop));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ImageResourceRow[];
  } catch {
    return null;
  }
}

export async function writeThemeImageCache(
  shop: string,
  rows: ImageResourceRow[],
  redis?: ThemeImageCacheRedis | null,
): Promise<void> {
  if (!shop.trim() || !redis) return;
  try {
    await redis.set(
      themeImageCacheKey(shop),
      JSON.stringify(rows),
      "EX",
      THEME_IMAGE_CACHE_TTL_SEC,
    );
  } catch (err) {
    console.warn("[contentImage] theme image cache write failed:", err);
  }
}
