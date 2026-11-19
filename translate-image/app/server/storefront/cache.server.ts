import { createHash } from "node:crypto";
import { getImageRedisClient } from "~/server/redis.server";
import type { BaseResponse } from "./response.server";

/**
 * 店面 App Proxy 读路径的 Redis 缓存。
 * 只用于 storefront；admin 仍直查库。
 * 失效用 per-(kind, shop) 版本号 INCR，禁止 KEYS/SCAN。
 * 前缀 `img:sf`，与 TSF 的 `tsf:sf` 隔离。
 */

export type StorefrontCacheKind = "picture";

const KEY_PREFIX = "img:sf";
const TTL_SECONDS = 300;
const VERSION_TTL_SECONDS = 30 * 24 * 60 * 60;
export const STOREFRONT_CACHE_MAX_KEY_PART_LENGTH = 96;

function tryGetRedis() {
  try {
    return getImageRedisClient();
  } catch (err) {
    console.warn("[sf-cache] Redis 不可用，回源直查:", err);
    return null;
  }
}

/** extra 超长则 sha1，避免 urlKeys 把 Redis key 撑爆。 */
export function normalizeStorefrontCacheKeyPart(part: string): string {
  const safe = part.replace(/\s+/g, "_");
  if (safe.length <= STOREFRONT_CACHE_MAX_KEY_PART_LENGTH) return safe;
  return createHash("sha1").update(safe).digest("base64url");
}

function versionKey(kind: StorefrontCacheKind, shop: string): string {
  return `${KEY_PREFIX}:ver:${kind}:${shop}`;
}

function dataKey(
  kind: StorefrontCacheKind,
  shop: string,
  version: string,
  extra: string[],
): string {
  const tail = extra.map(normalizeStorefrontCacheKeyPart).join(":");
  const base = `${KEY_PREFIX}:${kind}:${shop}:v${version}`;
  return tail ? `${base}:${tail}` : base;
}

export async function readThroughStorefrontCache<T>(
  kind: StorefrontCacheKind,
  shop: string,
  extra: string[],
  load: () => Promise<BaseResponse<T>>,
): Promise<BaseResponse<T>> {
  const redis = tryGetRedis();
  if (!redis) return load();

  let key: string | null = null;
  try {
    const version = (await redis.get(versionKey(kind, shop))) ?? "0";
    key = dataKey(kind, shop, version, extra);
    const cached = await redis.get(key);
    if (cached) return JSON.parse(cached) as BaseResponse<T>;
  } catch (err) {
    console.warn(`[sf-cache] 读失败 kind=${kind} shop=${shop}:`, err);
    return load();
  }

  const result = await load();
  if (result.success) {
    try {
      await redis.set(key, JSON.stringify(result), "EX", TTL_SECONDS);
    } catch (err) {
      console.warn(`[sf-cache] 写失败 kind=${kind} shop=${shop}:`, err);
    }
  }
  return result;
}

export async function invalidateStorefrontCache(
  kind: StorefrontCacheKind,
  shop: string,
): Promise<void> {
  const redis = tryGetRedis();
  if (!redis) return;
  const key = versionKey(kind, shop);
  try {
    await redis.incr(key);
    await redis.expire(key, VERSION_TTL_SECONDS);
  } catch (err) {
    console.warn(`[sf-cache] 失效失败 kind=${kind} shop=${shop}:`, err);
  }
}
