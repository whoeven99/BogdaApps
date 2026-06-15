export function normalizeOfferNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function sanitizeHexColor(raw: unknown, fallback: string): string {
  const t = String(raw ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{8}$/.test(t)) return `#${t.slice(1, 7)}`.toLowerCase();
  return fallback;
}

export const OFFER_TEXT_LIMITS = {
  offerName: 80,
  cartTitle: 80,
  widgetTitle: 60,
  buttonText: 30,
} as const;

export const LONG_RUNNING_OFFER_END_TIME_ISO = "2999-12-31T23:59:59.000Z";
const LONG_RUNNING_OFFER_END_TIME_MS = Date.parse(LONG_RUNNING_OFFER_END_TIME_ISO);

export const DEFAULT_CHECKBOX_UPSELLS_TITLE = "Add this offer to my order";
export const DEFAULT_CHECKBOX_UPSELLS_SUBTITLE =
  "Customers can opt in before adding the bundle.";
export const DEFAULT_STICKY_ADD_TO_CART_TITLE = "Ready to add this offer?";
export const DEFAULT_STICKY_ADD_TO_CART_SUBTITLE =
  "Keep the bundle CTA visible while customers compare options.";
export const DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT = "Add bundle";
export const FIXED_SUBSCRIPTION_POSITION = "below-bundle-bars" as const;
export const FIXED_ONE_TIME_TITLE = "One-time purchase";
export const FIXED_ONE_TIME_SUBTITLE = "Uses the current product price";
export const FIXED_SUBSCRIPTION_DEFAULT_SELECTED = false;

export function sanitizeSingleLineText(
  raw: unknown,
  maxLen: number,
  fallback = "",
): string {
  let out = "";
  for (const ch of String(raw ?? "")) {
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x200b && code <= 0x200d) || code === 0xfeff) continue;
    if (code <= 0x1f || code === 0x7f) {
      out += " ";
      continue;
    }
    out += ch;
  }
  const s = out.replace(/\s+/g, " ").trim();
  if (!s) return fallback;
  if (Number.isFinite(maxLen) && maxLen > 0) return s.slice(0, maxLen);
  return s;
}

export function clampNumber(
  raw: unknown,
  min: number,
  max: number,
  fallback: number,
): number {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = Number(raw);
  else n = Number.NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function parseNonNegativeNumberOrNull(raw: unknown): number | null {
  let n: number;
  if (typeof raw === "number") n = raw;
  else if (typeof raw === "string") n = Number(raw);
  else n = Number.NaN;
  if (!Number.isFinite(n)) return null;
  return n < 0 ? 0 : n;
}

export function normalizeDateLikeValue(raw: unknown): string {
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? "" : raw.toISOString();
  }
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? trimmed : parsed.toISOString();
}

export function isLongRunningOfferEndTime(raw: unknown): boolean {
  const normalized = normalizeDateLikeValue(raw);
  if (!normalized) return false;
  const parsedMs = Date.parse(normalized);
  if (Number.isNaN(parsedMs)) return false;
  return parsedMs === LONG_RUNNING_OFFER_END_TIME_MS;
}

export function normalizeOfferEndTimeForUi(raw: unknown): string {
  const normalized = normalizeDateLikeValue(raw);
  if (!normalized || isLongRunningOfferEndTime(normalized)) return "";
  return normalized;
}

export function sanitizeCheckboxUpsellsTitle(raw: unknown): string {
  return sanitizeSingleLineText(
    raw,
    OFFER_TEXT_LIMITS.widgetTitle,
    DEFAULT_CHECKBOX_UPSELLS_TITLE,
  );
}

export function sanitizeCheckboxUpsellsSubtitle(raw: unknown): string {
  return sanitizeSingleLineText(raw, 120, DEFAULT_CHECKBOX_UPSELLS_SUBTITLE);
}

export function sanitizeStickyAddToCartTitle(raw: unknown): string {
  return sanitizeSingleLineText(
    raw,
    OFFER_TEXT_LIMITS.widgetTitle,
    DEFAULT_STICKY_ADD_TO_CART_TITLE,
  );
}

export function sanitizeStickyAddToCartSubtitle(raw: unknown): string {
  return sanitizeSingleLineText(raw, 120, DEFAULT_STICKY_ADD_TO_CART_SUBTITLE);
}

export function sanitizeStickyAddToCartButtonText(raw: unknown): string {
  return sanitizeSingleLineText(
    raw,
    OFFER_TEXT_LIMITS.buttonText,
    DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT,
  );
}

const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

export function normalizeUniqueStringList(values: string[]): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => String(value || "").trim())
        .filter(Boolean),
    ),
  );
}

export function normalizeTargetMarkets(values: string[]): string[] {
  const normalized = normalizeUniqueStringList(values);
  return normalized.some((value) => value.toLowerCase() === "all")
    ? ["all"]
    : normalized;
}

export function normalizeCustomerSegments(values: string[]): string[] {
  const normalized = normalizeUniqueStringList(values);
  if (normalized.length === 0) return ["all"];
  return normalized.some((value) => value.toLowerCase() === "all")
    ? ["all"]
    : normalized;
}

export function normalizeCustomerProfileFilters(values: string[]): string[] {
  return normalizeUniqueStringList(values);
}

export function normalizeDraftIpCountryCodes(values: string[]): string[] {
  return normalizeUniqueStringList(
    values.map((value) => String(value || "").trim().toUpperCase()),
  );
}

export function normalizeIpCountryCodes(values: string[]): string[] {
  return normalizeDraftIpCountryCodes(values).filter((value) =>
    ISO_COUNTRY_CODE_REGEX.test(value),
  );
}

export function getInvalidIpCountryCodes(values: string[]): string[] {
  return normalizeDraftIpCountryCodes(values).filter(
    (value) => !ISO_COUNTRY_CODE_REGEX.test(value),
  );
}

export function normalizeCsvField(
  rawValue: unknown,
  normalize: (values: string[]) => string[],
): string | null {
  if (typeof rawValue !== "string") return null;
  const normalized = normalize(rawValue.split(","));
  return normalized.length > 0 ? normalized.join(",") : null;
}
