import Redis from "ioredis";

let singleton: Redis | undefined;
let missingLogged = false;

function renderKvUrl(): string {
  return String(process.env.RENDER_KV ?? "").trim();
}

/**
 * 店面缓存用 Redis。只连 `RENDER_KV`；未配置返回 null，调用方直查 Turso。
 * 不打印连接串。
 */
export function getImageRedisClient(): Redis | null {
  const url = renderKvUrl();
  if (!url) {
    if (!missingLogged) {
      missingLogged = true;
      console.warn("[redis] RENDER_KV missing, storefront cache off");
    }
    return null;
  }
  if (singleton) return singleton;
  console.info("[redis] RENDER_KV set");
  singleton = new Redis(url, {
    maxRetriesPerRequest: 2,
    connectTimeout: 10_000,
    connectionName: "ciwi-image-web",
  });
  return singleton;
}
