import { getImageRedisClient } from "~/server/redis.server";

export const STOREFRONT_COLLECT_PER_MINUTE_DEFAULT = 1;
export const STOREFRONT_COLLECT_WINDOW_SEC = 60;

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function collectRateLimitKey(shop: string): string {
  return `img:sf:rl:collect:${shop.trim()}`;
}

export function shouldAllowCollectCount(count: number, limit: number): boolean {
  return count <= limit;
}

export function resolveCollectPerMinute(
  env = process.env.STOREFRONT_COLLECT_PER_MINUTE,
): number {
  return parsePositiveInt(env, STOREFRONT_COLLECT_PER_MINUTE_DEFAULT);
}

type CollectRedis = {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
};

export async function tryAcquireCollectSlot(args: {
  redis: CollectRedis;
  shop: string;
  limit: number;
  windowSec: number;
}): Promise<boolean> {
  const shop = args.shop.trim();
  if (!shop) return false;
  try {
    const key = collectRateLimitKey(shop);
    const count = await args.redis.incr(key);
    if (count === 1) {
      try {
        await args.redis.expire(key, args.windowSec);
      } catch {
        /* keep slot */
      }
    }
    return shouldAllowCollectCount(count, args.limit);
  } catch {
    return false;
  }
}

export async function allowStorefrontCollect(shop: string): Promise<boolean> {
  try {
    const redis = getImageRedisClient();
    if (!redis) return false;
    return await tryAcquireCollectSlot({
      redis,
      shop,
      limit: resolveCollectPerMinute(),
      windowSec: STOREFRONT_COLLECT_WINDOW_SEC,
    });
  } catch {
    return false;
  }
}
