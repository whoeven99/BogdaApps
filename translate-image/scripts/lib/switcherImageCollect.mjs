import { externalImageUrlKey, imageUrlKey } from "./pictureUrlKey.mjs";

export const SWITCHER_IMAGE_MAX_PER_REQUEST = 100;
export const SWITCHER_IMAGE_TOTAL_CAP = 10000;
export const SWITCHER_IMAGE_CAP_EVICT_MAX = 500;
export const SWITCHER_IMAGE_URL_MAX = 2048;
export const SWITCHER_IMAGE_PATH_MAX = 512;
export const STOREFRONT_COLLECT_PER_MINUTE_DEFAULT = 1;
export const STOREFRONT_COLLECT_WINDOW_SEC = 60;
export const SWITCHER_IMAGE_ON_CONFLICT_BIND_COUNT = 7;

export function resolveSwitcherImageTotalCap(envValue) {
  const n = Number(envValue);
  if (!Number.isFinite(n) || n <= 0) return SWITCHER_IMAGE_TOTAL_CAP;
  return Math.min(100_000, Math.floor(n));
}

function parsePositiveInt(raw, fallback) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

export function resolveCollectPerMinute(env) {
  return parsePositiveInt(env, STOREFRONT_COLLECT_PER_MINUTE_DEFAULT);
}

export function collectRateLimitKey(shop) {
  return `img:sf:rl:collect:${String(shop ?? "").trim()}`;
}

export function shouldAllowCollectCount(count, limit) {
  return count <= limit;
}

function normalizePagePath(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let path = trimmed;
  try {
    if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("//")) {
      path = new URL(trimmed.startsWith("//") ? `https:${trimmed}` : trimmed).pathname;
    }
  } catch {
    path = trimmed.split("?")[0] ?? trimmed;
  }
  path = path.trim();
  if (!path) return null;
  return path.slice(0, SWITCHER_IMAGE_PATH_MAX);
}

export function normalizeSwitcherCollectInput(body) {
  const pagePath = normalizePagePath(body?.pagePath);
  const raw = Array.isArray(body?.images) ? body.images : [];
  const seen = new Set();
  const items = [];
  for (const entry of raw) {
    if (items.length >= SWITCHER_IMAGE_MAX_PER_REQUEST) break;
    if (!entry || typeof entry !== "object") continue;
    const src =
      (typeof entry.src === "string" && entry.src) ||
      (typeof entry.imageBeforeUrl === "string" && entry.imageBeforeUrl) ||
      "";
    if (!src || src.length > SWITCHER_IMAGE_URL_MAX) continue;
    if (/^(data:|blob:)/i.test(src)) continue;
    if (imageUrlKey(src)) continue;
    const urlKey = externalImageUrlKey(src);
    if (!urlKey || seen.has(urlKey)) continue;
    seen.add(urlKey);
    items.push({ urlKey, imageBeforeUrl: src });
  }
  return { items, pagePath };
}

export function shouldWriteSwitcherImagePage(pagePath, targetCode) {
  return Boolean(pagePath && targetCode);
}

export function planSwitcherCollectWrites(args) {
  const have = new Set(args.existingKeys);
  return {
    toUpdate: args.items.filter((i) => have.has(i.urlKey)),
    toInsert: args.items.filter((i) => !have.has(i.urlKey)),
    skipped: 0,
  };
}

export function switcherImageCapOverflow(total, cap = SWITCHER_IMAGE_TOTAL_CAP) {
  if (!Number.isFinite(total) || total <= cap) return 0;
  return Math.min(Math.floor(total - cap), SWITCHER_IMAGE_CAP_EVICT_MAX);
}

export function buildSwitcherImageOnConflictInsertSql(rowCount) {
  if (!Number.isInteger(rowCount) || rowCount <= 0) {
    throw new Error("buildSwitcherImageOnConflictInsertSql: rowCount must be a positive integer");
  }
  const row = "(?, ?, ?, ?, ?, ?, ?)";
  const values = Array.from({ length: rowCount }, () => row).join(", ");
  return (
    `INSERT INTO SwitcherImage (id, shop, urlKey, imageBeforeUrl, lastPagePath, lastSeenAt, updatedAt) ` +
    `VALUES ${values} ` +
    `ON CONFLICT(shop, urlKey) DO UPDATE SET ` +
    `imageBeforeUrl = excluded.imageBeforeUrl, ` +
    `lastPagePath = excluded.lastPagePath, ` +
    `lastSeenAt = excluded.lastSeenAt, ` +
    `updatedAt = excluded.updatedAt`
  );
}

export function switcherImageOnConflictBindValues(args) {
  if (args.ids.length !== args.items.length) {
    throw new Error("switcherImageOnConflictBindValues: ids length must match items");
  }
  const binds = [];
  for (let i = 0; i < args.items.length; i++) {
    const item = args.items[i];
    binds.push(
      args.ids[i],
      args.shop,
      item.urlKey,
      item.imageBeforeUrl,
      args.pagePath,
      args.nowIso,
      args.nowIso,
    );
  }
  return binds;
}

export function isSwitcherImageUniqueConstraint(err) {
  let cur = err;
  for (let depth = 0; depth < 4 && cur != null; depth++) {
    const msg = cur instanceof Error ? cur.message : String(cur);
    if (
      /UNIQUE constraint failed.*SwitcherImage/i.test(msg) ||
      (/SQLITE_CONSTRAINT/i.test(msg) && /SwitcherImage\.(shop|urlKey)/i.test(msg))
    ) {
      return true;
    }
    cur = cur && typeof cur === "object" && "cause" in cur ? cur.cause : undefined;
  }
  return false;
}

export async function tryAcquireCollectSlot(args) {
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
