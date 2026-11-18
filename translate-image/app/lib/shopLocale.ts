export function normalizeLocaleToken(locale: string): string {
  return locale.trim().toLowerCase().replace(/_/g, "-");
}

const LOCALE_ALIAS_GROUPS: readonly (readonly string[])[] = [
  ["zh-cn", "zh-hans"],
  ["zh-tw", "zh-hant", "zh-hk"],
];

export function localePrefixTokens(locales: readonly string[]): Set<string> {
  const tokens = new Set<string>();
  for (const locale of locales) {
    const token = normalizeLocaleToken(locale);
    if (!token) continue;
    tokens.add(token);
    for (const group of LOCALE_ALIAS_GROUPS) {
      if (!group.includes(token)) continue;
      for (const alias of group) tokens.add(alias);
    }
  }
  return tokens;
}

const LOCALE_SEGMENT_RE = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/;

function looksLikeLocaleSegment(segment: string): boolean {
  return LOCALE_SEGMENT_RE.test(normalizeLocaleToken(segment));
}

function firstPathSegment(pathname: string): string {
  const raw = pathname.trim();
  if (!raw) return "";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/+$/, "") || "/";
  if (trimmed === "/") return "";
  return trimmed.split("/").filter(Boolean)[0] ?? "";
}

export function resolveShopLocale(
  raw: string | null | undefined,
  shopLocales: readonly string[],
): string | null {
  const token = normalizeLocaleToken(raw ?? "");
  if (!token || shopLocales.length === 0) return null;

  const byNorm = new Map<string, string>();
  for (const loc of shopLocales) {
    const normalized = normalizeLocaleToken(loc);
    if (normalized && !byNorm.has(normalized)) byNorm.set(normalized, loc);
  }

  const exact = byNorm.get(token);
  if (exact) return exact;

  for (const group of LOCALE_ALIAS_GROUPS) {
    if (!group.includes(token)) continue;
    for (const alias of group) {
      const hit = byNorm.get(alias);
      if (hit) return hit;
    }
  }

  const base = token.split("-")[0] ?? "";
  if (!base) return null;
  const baseHit = byNorm.get(base);
  if (baseHit) return baseHit;
  for (const [normalized, loc] of byNorm) {
    if (normalized.split("-")[0] === base) return loc;
  }
  return null;
}

export function resolveCollectTargetCode(args: {
  languageCode?: string | null;
  rawPagePath?: string | null;
  shopLocales: readonly string[];
  primaryLocale: string;
}): string | null {
  const languageCode = String(args.languageCode ?? "").trim();
  if (languageCode) return resolveShopLocale(languageCode, args.shopLocales);

  const raw = args.rawPagePath?.trim() ?? "";
  if (raw) {
    const first = firstPathSegment(raw);
    if (first && looksLikeLocaleSegment(first)) {
      const fromPath = resolveShopLocale(first, args.shopLocales);
      if (fromPath) return fromPath;
    }
  }
  return resolveShopLocale(args.primaryLocale, args.shopLocales);
}

export function stripShopLocalePrefix(
  pathname: string,
  locales: readonly string[],
): string | null {
  const raw = pathname.trim();
  if (!raw) return null;
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/+$/, "") || "/";
  if (trimmed === "/") return "/";
  const localeSet = localePrefixTokens(locales);
  if (localeSet.size === 0) return trimmed;
  const segments = trimmed.split("/").filter(Boolean);
  const first = segments[0];
  if (!first || !localeSet.has(normalizeLocaleToken(first))) return trimmed;
  const rest = segments.slice(1);
  return rest.length === 0 ? "/" : `/${rest.join("/")}`;
}

export function applyShopLocalePrefix(
  pathname: string,
  selectedLocale: string,
  primaryLocale?: string,
): string {
  const raw = pathname.trim();
  if (!raw) return "/";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const canonical = withSlash.replace(/\/+$/, "") || "/";
  const selected = normalizeLocaleToken(selectedLocale);
  if (!selected) return canonical;
  const primary = primaryLocale ? normalizeLocaleToken(primaryLocale) : "";
  if (primary && selected === primary) return canonical;
  return canonical === "/" ? `/${selected}` : `/${selected}${canonical}`;
}

export function displaySwitcherPagePath(
  pagePath: string,
  selectedLocale: string,
  locales: readonly string[],
  primaryLocale?: string,
): string {
  const canonical = stripShopLocalePrefix(pagePath, locales) ?? (pagePath.trim() || "/");
  return applyShopLocalePrefix(canonical, selectedLocale, primaryLocale);
}

export function encodeSwitcherPagePathParam(pagePath: string): string {
  return encodeURIComponent(pagePath);
}

export function decodeSwitcherPagePathParam(param: string): string | null {
  if (!param.trim()) return null;
  try {
    return decodeURIComponent(param);
  } catch {
    return null;
  }
}

export const THIRD_PARTY_LIST_PATH = "/app/third-party";
export const SWITCHER_IMAGE_PAGE_SIZE = 50;
export const SWITCHER_PAGE_SEARCH_MAX = 128;

export function normalizeSwitcherPageSearch(q?: string | null): string {
  return String(q ?? "").trim().toLowerCase().slice(0, SWITCHER_PAGE_SEARCH_MAX);
}

export function matchesSwitcherPageSearch(
  pagePath: string,
  displayPath: string,
  q?: string | null,
): boolean {
  const needle = normalizeSwitcherPageSearch(q);
  if (!needle) return true;
  return (
    pagePath.toLowerCase().includes(needle) || displayPath.toLowerCase().includes(needle)
  );
}

export function thirdPartyListHref(extra?: {
  language?: string;
  q?: string;
  after?: string;
}): string {
  const params = new URLSearchParams();
  if (extra?.language) params.set("language", extra.language);
  const q = extra?.q?.trim();
  if (q) params.set("q", q);
  if (extra?.after) params.set("after", extra.after);
  const s = params.toString();
  return s ? `${THIRD_PARTY_LIST_PATH}?${s}` : THIRD_PARTY_LIST_PATH;
}

export function thirdPartyPagePath(
  pagePath: string,
  language?: string,
  q?: string,
): string {
  const path = `${THIRD_PARTY_LIST_PATH}/pages/${encodeSwitcherPagePathParam(pagePath)}`;
  const params = new URLSearchParams();
  if (language) params.set("language", language);
  const query = q?.trim();
  if (query) params.set("q", query);
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

export function thirdPartyImagePath(
  urlKey: string,
  extra?: { pagePath?: string; language?: string; q?: string },
): string {
  const path = `${THIRD_PARTY_LIST_PATH}/image/${encodeURIComponent(urlKey)}`;
  const params = new URLSearchParams();
  if (extra?.pagePath) params.set("pagePath", extra.pagePath);
  if (extra?.language) params.set("language", extra.language);
  const query = extra?.q?.trim();
  if (query) params.set("q", query);
  const s = params.toString();
  return s ? `${path}?${s}` : path;
}

export type SwitcherPageSighting = {
  pagePath: string;
  urlKey: string;
  imageBeforeUrl: string;
  lastSeenAt: Date;
};

export type SwitcherPageSummary = {
  pagePath: string;
  coverUrl: string | null;
  translated: number;
  total: number;
  lastSeenAt: Date;
};

export function summarizeSwitcherPages(
  sightings: SwitcherPageSighting[],
  translatedKeys: Iterable<string>,
): SwitcherPageSummary[] {
  const translated = new Set(translatedKeys);
  const byPath = new Map<string, { lastSeenAt: Date; coverUrl: string | null; keys: Set<string> }>();
  for (const row of sightings) {
    const current = byPath.get(row.pagePath) ?? {
      lastSeenAt: row.lastSeenAt,
      coverUrl: row.imageBeforeUrl,
      keys: new Set<string>(),
    };
    current.keys.add(row.urlKey);
    if (row.lastSeenAt >= current.lastSeenAt) {
      current.lastSeenAt = row.lastSeenAt;
      current.coverUrl = row.imageBeforeUrl || current.coverUrl;
    }
    byPath.set(row.pagePath, current);
  }
  return [...byPath.entries()]
    .map(([pagePath, info]) => ({
      pagePath,
      coverUrl: info.coverUrl,
      translated: [...info.keys].filter((key) => translated.has(key)).length,
      total: info.keys.size,
      lastSeenAt: info.lastSeenAt,
    }))
    .sort((a, b) => {
      const byTime = b.lastSeenAt.getTime() - a.lastSeenAt.getTime();
      return byTime !== 0 ? byTime : a.pagePath.localeCompare(b.pagePath);
    });
}

export function pickDefaultTargetLocale(
  locales: Array<{ locale: string; primary?: boolean }>,
): string {
  const firstTarget = locales.find((row) => !row.primary);
  return firstTarget?.locale || locales[0]?.locale || "";
}
