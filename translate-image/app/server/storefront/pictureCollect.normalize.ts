import { externalImageUrlKey, imageUrlKey } from "~/server/picture/imageUrlKey";

export const SWITCHER_IMAGE_MAX_PER_REQUEST = 100;
export const SWITCHER_IMAGE_TOTAL_CAP = 10000;
export const SWITCHER_IMAGE_CAP_EVICT_MAX = 500;
export const SWITCHER_IMAGE_URL_MAX = 2048;
export const SWITCHER_IMAGE_PATH_MAX = 512;
export const SWITCHER_IMAGE_ON_CONFLICT_BIND_COUNT = 7;

export function resolveSwitcherImageTotalCap(
  envValue = process.env.SWITCHER_IMAGE_TOTAL_CAP,
): number {
  const n = Number(envValue);
  if (!Number.isFinite(n) || n <= 0) return SWITCHER_IMAGE_TOTAL_CAP;
  return Math.min(100_000, Math.floor(n));
}

export type SwitcherImageCollectItem = {
  urlKey: string;
  imageBeforeUrl: string;
};

function normalizePagePath(raw: unknown): string | null {
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

export function normalizeSwitcherCollectInput(body: {
  images?: unknown;
  pagePath?: unknown;
}): { items: SwitcherImageCollectItem[]; pagePath: string | null } {
  const pagePath = normalizePagePath(body.pagePath);
  const raw = Array.isArray(body.images) ? body.images : [];
  const seen = new Set<string>();
  const items: SwitcherImageCollectItem[] = [];
  for (const entry of raw) {
    if (items.length >= SWITCHER_IMAGE_MAX_PER_REQUEST) break;
    if (!entry || typeof entry !== "object") continue;
    const rec = entry as Record<string, unknown>;
    const src =
      (typeof rec.src === "string" && rec.src) ||
      (typeof rec.imageBeforeUrl === "string" && rec.imageBeforeUrl) ||
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

export function shouldWriteSwitcherImagePage(
  pagePath: string | null,
  targetCode: string | null,
): boolean {
  return Boolean(pagePath && targetCode);
}

export function planSwitcherCollectWrites(args: {
  items: SwitcherImageCollectItem[];
  existingKeys: Iterable<string>;
  total?: number;
  cap?: number;
}): {
  toUpdate: SwitcherImageCollectItem[];
  toInsert: SwitcherImageCollectItem[];
  skipped: number;
} {
  const have = new Set(args.existingKeys);
  return {
    toUpdate: args.items.filter((i) => have.has(i.urlKey)),
    toInsert: args.items.filter((i) => !have.has(i.urlKey)),
    skipped: 0,
  };
}

export function switcherImageCapOverflow(
  total: number,
  cap = SWITCHER_IMAGE_TOTAL_CAP,
): number {
  if (!Number.isFinite(total) || total <= cap) return 0;
  return Math.min(Math.floor(total - cap), SWITCHER_IMAGE_CAP_EVICT_MAX);
}

export function buildSwitcherImageOnConflictInsertSql(rowCount: number): string {
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

export function switcherImageOnConflictBindValues(args: {
  shop: string;
  items: SwitcherImageCollectItem[];
  pagePath: string | null;
  nowIso: string;
  ids: string[];
}): unknown[] {
  if (args.ids.length !== args.items.length) {
    throw new Error("switcherImageOnConflictBindValues: ids length must match items");
  }
  const binds: unknown[] = [];
  for (let i = 0; i < args.items.length; i++) {
    const item = args.items[i]!;
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

export function isSwitcherImageUniqueConstraint(err: unknown): boolean {
  let cur: unknown = err;
  for (let depth = 0; depth < 4 && cur != null; depth++) {
    const msg = cur instanceof Error ? cur.message : String(cur);
    if (
      /UNIQUE constraint failed.*SwitcherImage/i.test(msg) ||
      (/SQLITE_CONSTRAINT/i.test(msg) && /SwitcherImage\.(shop|urlKey)/i.test(msg))
    ) {
      return true;
    }
    cur =
      cur && typeof cur === "object" && "cause" in cur
        ? (cur as { cause?: unknown }).cause
        : undefined;
  }
  return false;
}
