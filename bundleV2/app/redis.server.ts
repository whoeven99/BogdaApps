import Redis from "ioredis";

// 若要连接到不同的 Redis 服务器，您可以修改 `.env` 文件中的以下环境变量。
const redisUrl = `rediss://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;
console.log("[redis] Redis URL:", redisUrl);
let redis: Redis;

declare global {
  var __redis: Redis | undefined;
}

// 这能防止我们在开发环境中建立过多的连接。
if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "test") {
  redis = new Redis(redisUrl);
} else {
  if (!global.__redis) {
    global.__redis = new Redis(redisUrl);
  }
  redis = global.__redis;
}

let bogdaRateCache: Record<string, string> | null = null;

async function preloadBogdaRate() {
  if (bogdaRateCache) {
    return;
  }
  try {
    const rate = await redis.hgetall("bogda:rate");
    if (rate && Object.keys(rate).length > 0) {
      bogdaRateCache = rate;
      console.log("[redis] Bogda rate loaded from Redis.", bogdaRateCache);
    } else {
        console.log("[redis] No bogda:rate found in Redis or the hash is empty.");
    }
  } catch (error) {
    console.error("[redis] Failed to load bogda rate from Redis:", error);
  }
}

// 在模块首次加载时预加载数据。
preloadBogdaRate();

export function getBogdaRate() {
  return bogdaRateCache;
}

export { redis };
