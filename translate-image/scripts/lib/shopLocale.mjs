export function normalizeLocaleToken(locale) {
  return String(locale ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

const LOCALE_ALIAS_GROUPS = [
  ["zh-cn", "zh-hans"],
  ["zh-tw", "zh-hant", "zh-hk"],
];

export function localePrefixTokens(locales) {
  const tokens = new Set();
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

function looksLikeLocaleSegment(segment) {
  return LOCALE_SEGMENT_RE.test(normalizeLocaleToken(segment));
}

function firstPathSegment(pathname) {
  const raw = pathname.trim();
  if (!raw) return "";
  const withSlash = raw.startsWith("/") ? raw : `/${raw}`;
  const trimmed = withSlash.replace(/\/+$/, "") || "/";
  if (trimmed === "/") return "";
  return trimmed.split("/").filter(Boolean)[0] ?? "";
}

export function resolveShopLocale(raw, shopLocales) {
  const token = normalizeLocaleToken(raw ?? "");
  if (!token || !shopLocales?.length) return null;

  const byNorm = new Map();
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

export function resolveCollectTargetCode(args) {
  const languageCode = String(args.languageCode ?? "").trim();
  if (languageCode) {
    return resolveShopLocale(languageCode, args.shopLocales);
  }
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

export function stripShopLocalePrefix(pathname, locales) {
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

export function applyShopLocalePrefix(pathname, selectedLocale, primaryLocale) {
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

export function displaySwitcherPagePath(pagePath, selectedLocale, locales, primaryLocale) {
  const canonical = stripShopLocalePrefix(pagePath, locales) ?? (pagePath.trim() || "/");
  return applyShopLocalePrefix(canonical, selectedLocale, primaryLocale);
}

export function encodeSwitcherPagePathParam(pagePath) {
  return encodeURIComponent(pagePath);
}

export function decodeSwitcherPagePathParam(param) {
  if (!String(param ?? "").trim()) return null;
  try {
    return decodeURIComponent(param);
  } catch {
    return null;
  }
}
