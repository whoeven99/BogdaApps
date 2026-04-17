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

async function updateBogdaRate() {
  try {
    const rate = await redis.hgetall("bogda:rate");
    if (rate && Object.keys(rate).length > 0) {
      bogdaRateCache = rate;
      console.log("[redis] Bogda rate cache updated from Redis.", bogdaRateCache);
    } else {
      console.log(
        "[redis] No bogda:rate found in Redis or the hash is empty. Cache not updated.",
      );
    }
  } catch (error) {
    console.error("[redis] Failed to update bogda rate from Redis:", error);
  }
}

function scheduleDailyUpdate() {
  const now = new Date();

  // 计算明天 00:05:00 (UTC)
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 5, 0, 0);

  const timeToMidnight = tomorrow.getTime() - now.getTime();

  console.log(
    `[redis] Next bogda rate update scheduled in ${
      timeToMidnight / (1000 * 60 * 60)
    } hours.`,
  );

  setTimeout(() => {
    updateBogdaRate();
    
    // 之后每24小时执行一次
    setInterval(updateBogdaRate, 24 * 60 * 60 * 1000);
  }, timeToMidnight);
}

// 在模块首次加载时预加载数据，并安排每日更新。
updateBogdaRate();
scheduleDailyUpdate();

export function getBogdaRate() {
  return bogdaRateCache;
}

export { redis };
