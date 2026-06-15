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

const DEFAULT_CHECKBOX_UPSELLS_TITLE = "Add this offer to my order";
const DEFAULT_CHECKBOX_UPSELLS_SUBTITLE =
  "Customers can opt in before adding the bundle.";
const DEFAULT_STICKY_ADD_TO_CART_TITLE = "Ready to add this offer?";
const DEFAULT_STICKY_ADD_TO_CART_SUBTITLE =
  "Keep the bundle CTA visible while customers compare options.";
const DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT = "Add bundle";
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

function normalizeDateLikeValue(raw: unknown): string {
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

function sanitizeCheckboxUpsellsTitle(raw: unknown): string {
  return sanitizeSingleLineText(
    raw,
    OFFER_TEXT_LIMITS.widgetTitle,
    DEFAULT_CHECKBOX_UPSELLS_TITLE,
  );
}

function sanitizeCheckboxUpsellsSubtitle(raw: unknown): string {
  return sanitizeSingleLineText(raw, 120, DEFAULT_CHECKBOX_UPSELLS_SUBTITLE);
}

function sanitizeStickyAddToCartTitle(raw: unknown): string {
  return sanitizeSingleLineText(
    raw,
    OFFER_TEXT_LIMITS.widgetTitle,
    DEFAULT_STICKY_ADD_TO_CART_TITLE,
  );
}

function sanitizeStickyAddToCartSubtitle(raw: unknown): string {
  return sanitizeSingleLineText(raw, 120, DEFAULT_STICKY_ADD_TO_CART_SUBTITLE);
}

function sanitizeStickyAddToCartButtonText(raw: unknown): string {
  return sanitizeSingleLineText(
    raw,
    OFFER_TEXT_LIMITS.buttonText,
    DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT,
  );
}

/** 阶梯赠品（Progressive gifts）—嵌套在 offerSettingsJson.progressiveGifts */
export type ProgressiveGiftType = "free_shipping";

export type ProgressiveGiftUnlockMode = "tier_index" | "at_count";

export type ProgressiveGift = {
  id: string;
  type: ProgressiveGiftType;
  title: string;
  subtitle: string;
  imageUrl: string;
  unlockMode: ProgressiveGiftUnlockMode;
  /** 与店面前台 Bar 序号一致（1-based）：quantity-breaks 含「Single」为 Bar#1 */
  unlockTierIndex: number;
  /** unlockMode === at_count 时使用：购物车行数量达到该值即视为解锁 */
  unlockAtCount: number;
  /**
   * 免邮排除规则（可选）：仅当配送选项标价 amount（与结账货币一致）<= 该值时才应用 100% 折扣；
   * null/undefined 表示不限制（所有已解锁场景下的适用配送方式均可免邮）。
   */
  freeShippingMaxRateAmount: number | null;
};

export type ProgressiveGiftsConfig = {
  enabled: boolean;
  title: string;
  subtitle: string;
  layout: "vertical" | "horizontal" | "card" | "compact";
  hideGiftsUntilUnlocked: boolean;
  showLabelsForLockedGifts: boolean;
  gifts: ProgressiveGift[];
};

export const PROGRESSIVE_GIFTS_LINE_PROPERTY_TIER = "__ciwi_bundle_tier";
export const PROGRESSIVE_GIFTS_LINE_PROPERTY_OFFER_ID = "__ciwi_bundle_offer_id";

export const DEFAULT_PROGRESSIVE_GIFTS: ProgressiveGiftsConfig = {
  enabled: false,
  title: "Progressive gifts",
  subtitle: "",
  layout: "vertical",
  hideGiftsUntilUnlocked: false,
  showLabelsForLockedGifts: true,
  gifts: [],
};

const MAX_PROGRESSIVE_GIFTS = 12;

function randomGiftId(): string {
  return `gift_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function parseProgressiveGiftsConfig(
  raw: unknown,
): ProgressiveGiftsConfig {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...DEFAULT_PROGRESSIVE_GIFTS };
  }
  const o = raw as Record<string, unknown>;
  const layoutRaw = String(o.layout ?? "").trim();
  const layout: ProgressiveGiftsConfig["layout"] = [
    "vertical",
    "horizontal",
    "card",
    "compact",
  ].includes(layoutRaw)
    ? (layoutRaw as ProgressiveGiftsConfig["layout"])
    : "vertical";

  const giftsIn = Array.isArray(o.gifts) ? o.gifts : [];
  const gifts: ProgressiveGift[] = [];
  for (const item of giftsIn) {
    if (gifts.length >= MAX_PROGRESSIVE_GIFTS) break;
    if (!item || typeof item !== "object") continue;
    const g = item as Record<string, unknown>;
    const type = String(g.type ?? "").trim();
    if (type !== "free_shipping") continue;

    const unlockModeRaw = String(g.unlockMode ?? "tier_index").trim();
    const unlockMode: ProgressiveGiftUnlockMode =
      unlockModeRaw === "at_count" ? "at_count" : "tier_index";

    let unlockTierIndex = Math.trunc(Number(g.unlockTierIndex));
    if (!Number.isFinite(unlockTierIndex) || unlockTierIndex < 1) unlockTierIndex = 1;

    let unlockAtCount = Math.trunc(Number(g.unlockAtCount));
    if (!Number.isFinite(unlockAtCount) || unlockAtCount < 1) unlockAtCount = 1;

    const maxRate = parseNonNegativeNumberOrNull(g.freeShippingMaxRateAmount);

    const idRaw = String(g.id ?? "").trim();
    const id = idRaw || randomGiftId();

    gifts.push({
      id,
      type: "free_shipping",
      title: sanitizeSingleLineText(g.title, 120, "Free shipping"),
      subtitle: sanitizeSingleLineText(g.subtitle, 200, ""),
      imageUrl: sanitizeSingleLineText(g.imageUrl, 2048, ""),
      unlockMode,
      unlockTierIndex,
      unlockAtCount,
      freeShippingMaxRateAmount: maxRate,
    });
  }

  return {
    enabled: !!o.enabled,
    title: sanitizeSingleLineText(o.title, OFFER_TEXT_LIMITS.widgetTitle, DEFAULT_PROGRESSIVE_GIFTS.title),
    subtitle: sanitizeSingleLineText(o.subtitle, 200, ""),
    layout,
    hideGiftsUntilUnlocked: !!o.hideGiftsUntilUnlocked,
    showLabelsForLockedGifts: o.showLabelsForLockedGifts !== false,
    gifts,
  };
}

/** 写入 DB / metafield 前剔除多余字段，保持 schema 稳定 */
export function progressiveGiftsConfigToStorableJson(
  cfg: ProgressiveGiftsConfig,
): ProgressiveGiftsConfig {
  return parseProgressiveGiftsConfig(cfg as unknown as Record<string, unknown>);
}

export function parseProgressiveGiftsFromOfferSettingsJson(
  offerSettingsJson?: string | null,
): ProgressiveGiftsConfig {
  if (!offerSettingsJson) return { ...DEFAULT_PROGRESSIVE_GIFTS };
  try {
    const parsed = JSON.parse(offerSettingsJson) as Record<string, unknown>;
    return parseProgressiveGiftsConfig(parsed.progressiveGifts);
  } catch {
    return { ...DEFAULT_PROGRESSIVE_GIFTS };
  }
}

/** 判断某个赠品在当前「档位数 / 数量」下是否已解锁（店面前台与预览共用同一规则） */
export function isProgressiveGiftUnlocked(
  gift: ProgressiveGift,
  selectedBarIndex: number,
  lineQuantity: number,
): boolean {
  if (gift.unlockMode === "at_count") {
    const need = Math.max(1, Math.trunc(gift.unlockAtCount || 1));
    return Math.max(1, Math.trunc(lineQuantity)) >= need;
  }
  const needBar = Math.max(1, Math.trunc(gift.unlockTierIndex || 1));
  return Math.max(1, Math.trunc(selectedBarIndex)) >= needBar;
}

export type OfferSettings = {
  title: string;
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  totalBudget: number | null;
  dailyBudget: number | null;
  customerSegments: string | null;
  customerProfileFilters: string | null;
  ipCountryCodes: string | null;
  markets: string | null;
  usageLimitPerCustomer: string;
  accentColor: string;
  cardBackgroundColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  titleColor: string;
  borderColor: string;
  labelColor: string;
  buttonText: string;
  buttonPrimaryColor: string;
  showCustomButton: boolean;
  subscriptionEnabled: boolean;
  subscriptionPosition: typeof FIXED_SUBSCRIPTION_POSITION;
  subscriptionTitle: string;
  subscriptionSubtitle: string;
  oneTimeTitle: typeof FIXED_ONE_TIME_TITLE;
  oneTimeSubtitle: typeof FIXED_ONE_TIME_SUBTITLE;
  subscriptionDefaultSelected: typeof FIXED_SUBSCRIPTION_DEFAULT_SELECTED;
  compositionBarOrder?: string[];
  scheduleTimezone?: string;
  checkboxUpsellsEnabled: boolean;
  checkboxUpsellsTitle: string;
  checkboxUpsellsSubtitle: string;
  checkboxUpsellsDefaultChecked: boolean;
  stickyAddToCartEnabled: boolean;
  stickyAddToCartTitle: string;
  stickyAddToCartSubtitle: string;
  stickyAddToCartButtonText: string;
  couponEnabled: boolean;
  couponCode: string;
  progressiveGifts: ProgressiveGiftsConfig;
};

const ISO_COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;

function normalizeUniqueStringList(values: string[]): string[] {
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

function normalizeCsvField(
  rawValue: unknown,
  normalize: (values: string[]) => string[],
): string | null {
  if (typeof rawValue !== "string") return null;
  const normalized = normalize(rawValue.split(","));
  return normalized.length > 0 ? normalized.join(",") : null;
}

export function parseOfferSettings(offerSettingsJson?: string | null): OfferSettings {
  if (!offerSettingsJson) {
    return {
      title: "Bundle & Save",
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
      customerProfileFilters: null,
      ipCountryCodes: null,
      markets: null,
      usageLimitPerCustomer: "unlimited",
      accentColor: "#008060",
      cardBackgroundColor: "#ffffff",
      titleFontSize: 14,
      titleFontWeight: "600",
      titleColor: "#111111",
      borderColor: "#dfe3e8",
      labelColor: "#ffffff",
      buttonText: "Add to Cart",
      buttonPrimaryColor: "#008060",
      showCustomButton: true,
      subscriptionEnabled: false,
      subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
      subscriptionTitle: "Subscribe & Save",
      subscriptionSubtitle: "Subscription pricing updates from your selling plan",
      oneTimeTitle: FIXED_ONE_TIME_TITLE,
      oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
      subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
      scheduleTimezone: undefined,
      checkboxUpsellsEnabled: false,
      checkboxUpsellsTitle: DEFAULT_CHECKBOX_UPSELLS_TITLE,
      checkboxUpsellsSubtitle: DEFAULT_CHECKBOX_UPSELLS_SUBTITLE,
      checkboxUpsellsDefaultChecked: false,
      stickyAddToCartEnabled: false,
      stickyAddToCartTitle: DEFAULT_STICKY_ADD_TO_CART_TITLE,
      stickyAddToCartSubtitle: DEFAULT_STICKY_ADD_TO_CART_SUBTITLE,
      stickyAddToCartButtonText: DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT,
      couponEnabled: false,
      couponCode: "",
      progressiveGifts: { ...DEFAULT_PROGRESSIVE_GIFTS },
    };
  }

  try {
    const parsed = JSON.parse(offerSettingsJson) as Partial<OfferSettings> &
      Record<string, unknown>;
    const layout = parsed.layoutFormat;
    const layoutFormat: OfferSettings["layoutFormat"] = [
      "vertical",
      "horizontal",
      "card",
      "compact",
    ].includes(String(layout))
      ? (layout as OfferSettings["layoutFormat"])
      : "vertical";

    return {
      title: parsed.title || "Bundle & Save",
      layoutFormat,
      totalBudget:
        parsed.totalBudget !== undefined
          ? parseNonNegativeNumberOrNull(parsed.totalBudget)
          : null,
      dailyBudget:
        parsed.dailyBudget !== undefined
          ? parseNonNegativeNumberOrNull(parsed.dailyBudget)
          : null,
      customerSegments: normalizeCsvField(
        parsed.customerSegments,
        normalizeCustomerSegments,
      ),
      customerProfileFilters: normalizeCsvField(
        parsed.customerProfileFilters,
        normalizeCustomerProfileFilters,
      ),
      ipCountryCodes: normalizeCsvField(
        parsed.ipCountryCodes,
        normalizeIpCountryCodes,
      ),
      markets: normalizeCsvField(parsed.markets, normalizeTargetMarkets),
      usageLimitPerCustomer: parsed.usageLimitPerCustomer ?? "unlimited",
      accentColor: sanitizeHexColor(parsed.accentColor, "#008060"),
      cardBackgroundColor: sanitizeHexColor(parsed.cardBackgroundColor, "#ffffff"),
      titleFontSize: clampNumber(parsed.titleFontSize, 10, 36, 14),
      titleFontWeight: ["400", "500", "600", "700"].includes(String(parsed.titleFontWeight))
        ? String(parsed.titleFontWeight)
        : "600",
      titleColor: sanitizeHexColor(parsed.titleColor, "#111111"),
      borderColor: sanitizeHexColor(parsed.borderColor, "#dfe3e8"),
      labelColor: sanitizeHexColor(parsed.labelColor, "#ffffff"),
      buttonText: parsed.buttonText || "Add to Cart",
      buttonPrimaryColor: sanitizeHexColor(parsed.buttonPrimaryColor, "#008060"),
      showCustomButton: parsed.showCustomButton !== false,
      subscriptionEnabled: parsed.subscriptionEnabled === true,
      subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
      subscriptionTitle: parsed.subscriptionTitle || "Subscribe & Save",
      subscriptionSubtitle:
        parsed.subscriptionSubtitle ||
        "Subscription pricing updates from your selling plan",
      oneTimeTitle: FIXED_ONE_TIME_TITLE,
      oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
      subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
      compositionBarOrder: Array.isArray(parsed.compositionBarOrder)
        ? parsed.compositionBarOrder
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : undefined,
      scheduleTimezone: parsed.scheduleTimezone,
      checkboxUpsellsEnabled: parsed.checkboxUpsellsEnabled === true,
      checkboxUpsellsTitle: sanitizeCheckboxUpsellsTitle(
        parsed.checkboxUpsellsTitle,
      ),
      checkboxUpsellsSubtitle: sanitizeCheckboxUpsellsSubtitle(
        parsed.checkboxUpsellsSubtitle,
      ),
      checkboxUpsellsDefaultChecked: parsed.checkboxUpsellsDefaultChecked === true,
      stickyAddToCartEnabled: parsed.stickyAddToCartEnabled === true,
      stickyAddToCartTitle: sanitizeStickyAddToCartTitle(
        parsed.stickyAddToCartTitle,
      ),
      stickyAddToCartSubtitle: sanitizeStickyAddToCartSubtitle(
        parsed.stickyAddToCartSubtitle,
      ),
      stickyAddToCartButtonText: sanitizeStickyAddToCartButtonText(
        parsed.stickyAddToCartButtonText,
      ),
      couponEnabled: parsed.couponEnabled === true,
      couponCode: sanitizeSingleLineText(parsed.couponCode, 64, ""),
      progressiveGifts: parseProgressiveGiftsConfig(parsed.progressiveGifts),
    };
  } catch {
    return parseOfferSettings(null);
  }
}

export type DiscountRule = {
  id?: string;
  count: number;
  discountPercent: number;
  tierType?: "single" | "standard";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
  discountClass?: "product" | "order" | "shipping";
  offerKind?: "percentage_discount" | "free_gift" | "free_shipping";
  conditionType?: "item_quantity" | "cart_amount";
  amountThreshold?: number;
  rewardType?: "percentage_off" | "gift_product" | "free_shipping";
  rewardProductIds?: string[];
  giftQuantity?: number;
  logicType?: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
};

export type PerProductDiscountRule = {
  productId?: string;
  variantId?: string;
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

export type DifferentProductsDiscountRule = {
  id?: string;
  count: number;
  discountPercent: number;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  maxUsesPerOrder: number;
  tierType: "single" | "bxgy" | "simple";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
};

export type CampaignScope = {
  productIds: string[];
  markets: string[];
  customerSegments: string[];
  customerProfileFilters: string[];
  ipCountryCodes: string[];
};

export type QuantityBreakTier = {
  id?: string;
  qty: number;
  discountPercent: number;
  tierType?: "single" | "standard";
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
  discountClass?: "product" | "order" | "shipping";
  offerKind?: "percentage_discount" | "free_gift" | "free_shipping";
  conditionType?: "item_quantity" | "cart_amount";
  amountThreshold?: number;
  rewardType?: "percentage_off" | "gift_product" | "free_shipping";
  rewardProductIds?: string[];
  giftQuantity?: number;
  logicType?: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
};

export type QuantityBreaksLogicBlock = {
  id: string;
  type: "quantity-breaks";
  config: {
    tiers: QuantityBreakTier[];
  };
};

export type QuantityBreaksDifferentLogicBlock = {
  id: string;
  type: "quantity-breaks-different";
  config: {
    tiers: DifferentProductsDiscountRule[];
  };
};

export type OfferCardDisplayBlock = {
  id: string;
  type: "offer-card";
  logicBlockRef: string;
  config: {
    title: string;
    layoutFormat: OfferSettings["layoutFormat"];
    accentColor: string;
    cardBackgroundColor: string;
    borderColor: string;
    labelColor: string;
    titleFontSize: number;
    titleFontWeight: string;
    titleColor: string;
    buttonText: string;
    buttonPrimaryColor: string;
    showCustomButton: boolean;
  };
};

export type CountdownDisplayBlock = {
  id: string;
  type: "countdown";
  config: {
    endTimeMode: "campaign-end-time";
    label: string;
  };
};

export type CampaignSettings = {
  status: boolean;
  startTime: string;
  endTime: string;
  scheduleTimezone?: string;
  totalBudget: number | null;
  dailyBudget: number | null;
  usageLimitPerCustomer: string;
  compositionBarOrder?: string[];
  checkboxUpsellsEnabled: boolean;
  checkboxUpsellsTitle: string;
  checkboxUpsellsSubtitle: string;
  checkboxUpsellsDefaultChecked: boolean;
  stickyAddToCartEnabled: boolean;
  stickyAddToCartTitle: string;
  stickyAddToCartSubtitle: string;
  stickyAddToCartButtonText: string;
  couponEnabled: boolean;
  couponCode: string;
};

export type CampaignConfig = {
  version: 1;
  scope: CampaignScope;
  logicBlocks: LogicBlock[];
  displayBlocks: DisplayBlock[];
  settings: CampaignSettings;
};

export type BxgyDiscountRule = {
  id?: string;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxUsesPerOrder: number;
  /** Count threshold: promotion triggers when cart has this many items in buyProductIds */
  count: number;
  tierType?: "single" | "bxgy" | "simple";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
};

export type BxgyDisplayMeta = {
  buyQuantity: number;
  configuredGetQuantity: number;
  bundleQuantity: number;
  freeQuantity: number;
  semantics: "free_items" | "total_items";
  title: string;
  subtitle: string;
  price: string;
  saveLabel: string;
  summary: string;
};

export function getBxgyDisplayMeta(rule: {
  buyQuantity?: unknown;
  getQuantity?: unknown;
}): BxgyDisplayMeta {
  const buyQuantity = Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1));
  const configuredGetQuantity = Math.max(1, Math.trunc(Number(rule.getQuantity) || 1));
  const usesTotalItemsSemantics = configuredGetQuantity > buyQuantity;
  const bundleQuantity = usesTotalItemsSemantics
    ? configuredGetQuantity
    : buyQuantity + configuredGetQuantity;
  const freeQuantity = usesTotalItemsSemantics
    ? Math.max(1, bundleQuantity - buyQuantity)
    : configuredGetQuantity;

  if (usesTotalItemsSemantics) {
    return {
      buyQuantity,
      configuredGetQuantity,
      bundleQuantity,
      freeQuantity,
      semantics: "total_items",
      title: `Buy ${buyQuantity}, Get ${bundleQuantity}`,
      subtitle: "",
      price: "",
      saveLabel: "",
      summary: `Buy ${buyQuantity}, get ${bundleQuantity}`,
    };
  }

  return {
    buyQuantity,
    configuredGetQuantity,
    bundleQuantity,
    freeQuantity,
    semantics: "free_items",
    title: `Buy ${buyQuantity}, Get ${bundleQuantity}`,
    subtitle: "",
    price: "",
    saveLabel: "",
    summary: `Buy ${buyQuantity}, get ${bundleQuantity}`,
  };
}

const BXGY_AUTO_TITLE_PATTERN = /^buy\s*\d+\s*,\s*get\s*\d+(?:\s+(?:free|total))?$/i;
const BXGY_AUTO_SUBTITLE_PATTERN =
  /same product|reward item|cheapest eligible|bundle tier|paying for|total items/i;
const DIFFERENT_PRODUCTS_AUTO_TITLE_PATTERN = /^(any\s+\d+\s+items|rule)$/i;
const DIFFERENT_PRODUCTS_AUTO_SUBTITLE_PATTERN =
  /includes .* trigger product|mix any \d+ from \d+ (?:eligible|shared-pool) products|mix across \d+ (?:eligible|shared-pool) products/i;
const COMPLETE_BUNDLE_AUTO_TITLE_PATTERN = /^(single|bar #\d+|complete the bundle)$/i;
const COMPLETE_BUNDLE_AUTO_SUBTITLE_PATTERN =
  /standard price|pick \d+-\d+ bundle items|current product \+ \d+-\d+ bundle items from \d+ options/i;

function inferDisplayTextSource(
  explicitValue: unknown,
  autoPattern: RegExp,
): "auto" | "custom" {
  const normalizedValue = String(explicitValue ?? "").trim();
  if (!normalizedValue) return "auto";
  return autoPattern.test(normalizedValue) ? "auto" : "custom";
}

export function inferBxgyTitleSource(explicitTitle?: unknown): "auto" | "custom" {
  return inferDisplayTextSource(explicitTitle, BXGY_AUTO_TITLE_PATTERN);
}

export function inferBxgySubtitleSource(explicitSubtitle?: unknown): "auto" | "custom" {
  return inferDisplayTextSource(explicitSubtitle, BXGY_AUTO_SUBTITLE_PATTERN);
}

export function inferDifferentProductsTitleSource(
  explicitTitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitTitle, DIFFERENT_PRODUCTS_AUTO_TITLE_PATTERN);
}

export function inferDifferentProductsSubtitleSource(
  explicitSubtitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitSubtitle, DIFFERENT_PRODUCTS_AUTO_SUBTITLE_PATTERN);
}

export function inferCompleteBundleTitleSource(
  explicitTitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitTitle, COMPLETE_BUNDLE_AUTO_TITLE_PATTERN);
}

export function inferCompleteBundleSubtitleSource(
  explicitSubtitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitSubtitle, COMPLETE_BUNDLE_AUTO_SUBTITLE_PATTERN);
}

export function resolveBxgyDisplayTitle(
  rule: {
    buyQuantity?: unknown;
    getQuantity?: unknown;
  },
  explicitTitle?: unknown,
  explicitTitleSource?: "auto" | "custom",
): string {
  const normalizedTitle = String(explicitTitle ?? "").trim();
  if (explicitTitleSource === "custom" && normalizedTitle) {
    return normalizedTitle;
  }
  if (normalizedTitle && inferBxgyTitleSource(normalizedTitle) === "custom") {
    return normalizedTitle;
  }
  return getBxgyDisplayMeta(rule).title;
}

export function resolveBxgyDisplaySubtitle(
  explicitSubtitle?: unknown,
  explicitSubtitleSource?: "auto" | "custom",
): string {
  const normalizedSubtitle = String(explicitSubtitle ?? "").trim();
  if (!normalizedSubtitle) {
    return "";
  }
  if (explicitSubtitleSource === "custom") {
    return normalizedSubtitle;
  }
  if (inferBxgySubtitleSource(normalizedSubtitle) === "auto") {
    return "";
  }
  return normalizedSubtitle;
}

export type FreeGiftRule = {
  id?: string;
  count: number;
  giftQuantity: number;
  giftProductIds?: string[];
  tierType?: "single";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
};

export function isSingleDiscountRule(
  rule: Pick<DiscountRule, "tierType"> | null | undefined,
): boolean {
  return String(rule?.tierType || "") === "single";
}

export function buildDraftRuleId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function buildDeterministicLegacyId(prefix: string, parts: unknown[]): string {
  const normalized = parts
    .map((part) => {
      if (Array.isArray(part)) {
        return part.map((entry) => String(entry || "").trim()).filter(Boolean).join(",");
      }
      return String(part ?? "").trim();
    })
    .join("__")
    .replace(/[^a-zA-Z0-9,_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return normalized ? `${prefix}-${normalized}` : prefix;
}

export function createDefaultSingleDiscountRule(
  overrides: Partial<DiscountRule> = {},
): DiscountRule {
  const next = { ...overrides };
  return {
    id: next.id || "single-rule",
    count: 0,
    discountPercent: 0,
    tierType: "single",
    title: typeof next.title === "string" ? next.title : "Single",
    subtitle: typeof next.subtitle === "string" ? next.subtitle : "Standard price",
    badge: typeof next.badge === "string" ? next.badge : "",
    isDefault: next.isDefault === true,
    discountClass: "product",
    offerKind: "percentage_discount",
    conditionType: "item_quantity",
    rewardType: "percentage_off",
    rewardProductIds: [],
  };
}

export function normalizeDiscountRules(rules: DiscountRule[]): DiscountRule[] {
  if (!rules.length) return [];
  let singleRule: DiscountRule | null = null;
  const offerRules: DiscountRule[] = [];
  for (const rule of rules) {
    if (isSingleDiscountRule(rule)) {
      if (!singleRule) {
        singleRule = createDefaultSingleDiscountRule(rule);
      }
      continue;
    }
    const rewardType =
      rule.rewardType === "gift_product" || rule.rewardType === "free_shipping"
        ? rule.rewardType
        : "percentage_off";
    offerRules.push({
      ...rule,
      id: rule.id || buildDraftRuleId("discount_rule"),
      count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
      discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
      tierType: "standard",
      isDefault: !!rule.isDefault,
      rewardType,
      discountClass:
        rewardType === "gift_product"
          ? "order"
          : rewardType === "free_shipping"
            ? "shipping"
            : rule.discountClass === "order" || rule.discountClass === "shipping"
              ? rule.discountClass
              : "product",
      offerKind:
        rewardType === "gift_product"
          ? "free_gift"
          : rewardType === "free_shipping"
            ? "free_shipping"
            : "percentage_discount",
    });
  }
  if (!singleRule) {
    singleRule = createDefaultSingleDiscountRule();
  }
  offerRules.sort((a, b) => a.count - b.count);
  const orderedRules = [singleRule, ...offerRules];
  const explicitDefault = orderedRules.find((rule) => rule.isDefault);
  const fallbackDefault = offerRules[0] || singleRule;
  const defaultKey = explicitDefault?.id || fallbackDefault?.id || "";
  return orderedRules.map((rule) =>
    isSingleDiscountRule(rule)
      ? createDefaultSingleDiscountRule({
          ...rule,
          isDefault: defaultKey ? rule.id === defaultKey : false,
        })
      : {
          ...rule,
          id: rule.id || buildDraftRuleId("discount_rule"),
          tierType: "standard",
          isDefault: defaultKey ? rule.id === defaultKey : false,
        },
  );
}

export function isSingleDifferentProductsRule(
  rule: Pick<DifferentProductsDiscountRule, "tierType"> | null | undefined,
): boolean {
  return String(rule?.tierType || "") === "single";
}

export function createDefaultSingleDifferentProductsRule(
  overrides: Partial<DifferentProductsDiscountRule> = {},
): DifferentProductsDiscountRule {
  const next = { ...overrides };
  return {
    id: typeof next.id === "string" && next.id ? next.id : "different-products-single",
    count: 0,
    discountPercent: 0,
    buyQuantity: 0,
    getQuantity: 0,
    buyProductIds: [],
    getProductIds: [],
    maxUsesPerOrder: 1,
    tierType: "single",
    title: typeof next.title === "string" ? next.title : "Single",
    subtitle: typeof next.subtitle === "string" ? next.subtitle : "Standard price",
    badge: typeof next.badge === "string" ? next.badge : "",
    isDefault: next.isDefault === true,
  };
}

export function normalizeDifferentProductsDiscountRules(
  rules: DifferentProductsDiscountRule[],
): DifferentProductsDiscountRule[] {
  if (!rules.length) return [];
  let singleRule: DifferentProductsDiscountRule | null = null;
  const offerRules: DifferentProductsDiscountRule[] = [];
  for (const rule of rules) {
    if (isSingleDifferentProductsRule(rule)) {
      if (!singleRule) {
        singleRule = createDefaultSingleDifferentProductsRule(rule);
      }
      continue;
    }
    offerRules.push({
      ...rule,
      id: rule.id || buildDraftRuleId("different_products_rule"),
      count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
      buyQuantity: Math.max(
        1,
        Math.trunc(Number(rule.buyQuantity) || Number(rule.count) || 1),
      ),
      getQuantity:
        rule.tierType === "bxgy"
          ? Math.max(1, Math.trunc(Number(rule.getQuantity) || 1))
          : 0,
      discountPercent:
        rule.tierType === "bxgy"
          ? 100
          : Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
      maxUsesPerOrder: rule.tierType === "bxgy" ? 1 : 1,
      tierType: rule.tierType === "bxgy" ? "bxgy" : "simple",
      isDefault: !!rule.isDefault,
    });
  }
  if (!singleRule) {
    singleRule = createDefaultSingleDifferentProductsRule();
  }
  offerRules.sort((a, b) => a.count - b.count);
  const orderedRules = [singleRule, ...offerRules];
  const explicitDefault = orderedRules.find((rule) => rule.isDefault);
  const fallbackDefault = offerRules[0] || singleRule;
  const defaultKey = explicitDefault?.id || fallbackDefault?.id || "";
  return orderedRules.map((rule) => ({
    ...rule,
    isDefault: defaultKey ? rule.id === defaultKey : false,
  }));
}

export function isSingleBxgyRule(
  rule: Pick<BxgyDiscountRule, "tierType"> | null | undefined,
): boolean {
  return String(rule?.tierType || "") === "single";
}

export function createDefaultSingleBxgyRule(
  overrides: Partial<BxgyDiscountRule> = {},
): BxgyDiscountRule {
  const next = { ...overrides };
  return {
    id: typeof next.id === "string" && next.id ? next.id : "bxgy-single",
    count: 0,
    buyQuantity: 0,
    getQuantity: 0,
    buyProductIds: [],
    getProductIds: [],
    discountPercent: 0,
    maxUsesPerOrder: 1,
    tierType: "single",
    title: typeof next.title === "string" ? next.title : "Single",
    subtitle: typeof next.subtitle === "string" ? next.subtitle : "Standard price",
    badge: typeof next.badge === "string" ? next.badge : "",
    isDefault: next.isDefault === true,
  };
}

export function normalizeBxgyRules(rules: BxgyDiscountRule[]): BxgyDiscountRule[] {
  if (!rules.length) return [];
  let singleRule: BxgyDiscountRule | null = null;
  const offerRules: BxgyDiscountRule[] = [];
  for (const rule of rules) {
    if (isSingleBxgyRule(rule)) {
      if (!singleRule) {
        singleRule = createDefaultSingleBxgyRule(rule);
      }
      continue;
    }
    const normalizedBuyQuantity = Math.max(
      1,
      Math.trunc(Number(rule.buyQuantity) || Number(rule.count) || 1),
    );
    offerRules.push({
      ...rule,
      id: rule.id || buildDraftRuleId("bxgy_rule"),
      count: normalizedBuyQuantity,
      buyQuantity: normalizedBuyQuantity,
      getQuantity: Math.max(1, Math.trunc(Number(rule.getQuantity) || 1)),
      discountPercent: 100,
      maxUsesPerOrder: 1,
      tierType: "bxgy",
      isDefault: !!rule.isDefault,
    });
  }
  if (!singleRule) {
    singleRule = createDefaultSingleBxgyRule();
  }
  offerRules.sort((a, b) => a.count - b.count);
  const orderedRules = [singleRule, ...offerRules];
  const explicitDefault = orderedRules.find((rule) => rule.isDefault);
  const fallbackDefault = offerRules[0] || singleRule;
  const defaultKey = explicitDefault?.id || fallbackDefault?.id || "";
  return orderedRules.map((rule) => ({
    ...rule,
    isDefault: defaultKey ? rule.id === defaultKey : false,
  }));
}

export function isSingleFreeGiftRule(
  rule: Pick<FreeGiftRule, "tierType"> | null | undefined,
): boolean {
  return String(rule?.tierType || "") === "single";
}

export function createDefaultSingleFreeGiftRule(
  overrides: Partial<FreeGiftRule> = {},
): FreeGiftRule {
  const next = { ...overrides };
  return {
    id: typeof next.id === "string" && next.id ? next.id : "free-gift-single",
    count: 0,
    giftQuantity: 0,
    giftProductIds: [],
    tierType: "single",
    title: typeof next.title === "string" ? next.title : "Single",
    subtitle: typeof next.subtitle === "string" ? next.subtitle : "Standard price",
    badge: typeof next.badge === "string" ? next.badge : "",
    isDefault: next.isDefault === true,
  };
}

export function normalizeFreeGiftRules(rules: FreeGiftRule[]): FreeGiftRule[] {
  if (!rules.length) return [];
  let singleRule: FreeGiftRule | null = null;
  const offerRules: FreeGiftRule[] = [];
  for (const rule of rules) {
    if (isSingleFreeGiftRule(rule)) {
      if (!singleRule) {
        singleRule = createDefaultSingleFreeGiftRule(rule);
      }
      continue;
    }
    offerRules.push({
      ...rule,
      id: rule.id || buildDraftRuleId("free_gift_rule"),
      count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
      giftQuantity: Math.max(1, Math.trunc(Number(rule.giftQuantity) || 1)),
      tierType: undefined,
      isDefault: !!rule.isDefault,
    });
  }
  if (!singleRule) {
    singleRule = createDefaultSingleFreeGiftRule();
  }
  offerRules.sort((a, b) => a.count - b.count);
  const orderedRules = [singleRule, ...offerRules];
  const explicitDefault = orderedRules.find((rule) => rule.isDefault);
  const fallbackDefault = offerRules[0] || singleRule;
  const defaultKey = explicitDefault?.id || fallbackDefault?.id || "";
  return orderedRules.map((rule) => ({
    ...rule,
    isDefault: defaultKey ? rule.id === defaultKey : false,
  }));
}

export type BxgyLogicBlock = {
  id: string;
  type: "bxgy";
  config: {
    tiers: BxgyDiscountRule[];
  };
};

export type FreeGiftLogicBlock = {
  id: string;
  type: "free-gift";
  config: {
    triggerProductIds: string[];
    giftProductIds: string[];
    tiers: FreeGiftRule[];
  };
};

export type CompleteBundlePricingMode =
  | "full_price"
  | "percentage_off"
  | "amount_off"
  | "fixed_price";

export type CompleteBundleProduct = {
  productId: string;
  handle?: string;
  title?: string;
  image?: string;
  price?: string;
  defaultVariantId?: string;
  selectedVariantId?: string;
  selectionMode?: "product" | "variant";
  // 变体 option 值（如 Color/Size），用于前端预览回显
  selectedOptions?: Record<string, string>;
  /** 单件商品的定价：Full price / 百分比 / 立减金额 / 固定价 */
  pricing?: {
    mode: CompleteBundlePricingMode;
    value: number;
  };
  variants?: Array<{
    id: string;
    title: string;
    price?: string;
    selectedOptions?: Array<{ name: string; value: string }>;
  }>;
};

export type CompleteBundleBar = {
  id: string;
  type: "single" | "quantity-break-same";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  excludeTriggerProduct?: boolean;
  quantity: number;
  products: CompleteBundleProduct[];
  pricing: {
    mode: CompleteBundlePricingMode;
    value: number;
  };
};

export type CompleteBundleConfig = {
  triggerProductIds?: string[];
  bars: CompleteBundleBar[];
};

export type CompleteBundleLogicBlock = {
  id: string;
  type: "complete-bundle";
  config: CompleteBundleConfig;
};

export function isCompleteBundleSingleBar(
  bar: Pick<CompleteBundleBar, "type"> | null | undefined,
): boolean {
  return bar?.type === "single";
}

export function createDefaultCompleteBundleSingleBar(
  overrides: Partial<CompleteBundleBar> = {},
): CompleteBundleBar {
  return {
    id: String(overrides.id || "complete-bundle-single"),
    type: "single",
    title: typeof overrides.title === "string" ? overrides.title : "Single",
    titleSource:
      typeof overrides.titleSource === "string" ? overrides.titleSource : "auto",
    subtitle:
      typeof overrides.subtitle === "string" ? overrides.subtitle : "Standard price",
    subtitleSource:
      typeof overrides.subtitleSource === "string" ? overrides.subtitleSource : "auto",
    badge: typeof overrides.badge === "string" ? overrides.badge : "",
    isDefault: overrides.isDefault === true,
    minQuantity: 1,
    maxQuantity: 1,
    excludeTriggerProduct: false,
    quantity: 1,
    products: [],
    pricing: { mode: "full_price", value: 0 },
  };
}

export function normalizeCompleteBundleBars(
  bars: CompleteBundleBar[],
): CompleteBundleBar[] {
  const safeBars = Array.isArray(bars) ? bars : [];
  let singleBar: CompleteBundleBar | null = null;
  const bundleBars: CompleteBundleBar[] = [];

  for (const bar of safeBars) {
    if (!bar || typeof bar !== "object" || !String(bar.id || "").trim()) continue;
    if (isCompleteBundleSingleBar(bar)) {
      if (!singleBar) {
        singleBar = createDefaultCompleteBundleSingleBar(bar);
      }
      continue;
    }
    bundleBars.push({
      ...bar,
      // Historical payloads may still contain "bxgy"; normalize them to the
      // regular bundle bar type because complete-bundle is an order module.
      type: "quantity-break-same",
      title: String(bar.title || ""),
      titleSource:
        bar.titleSource === "custom"
          ? "custom"
          : inferCompleteBundleTitleSource(bar.title),
      subtitle: String(bar.subtitle || ""),
      subtitleSource:
        bar.subtitleSource === "custom"
          ? "custom"
          : inferCompleteBundleSubtitleSource(bar.subtitle),
      badge: String(bar.badge || ""),
      isDefault: !!bar.isDefault,
      minQuantity: Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
      maxQuantity: Math.max(
        Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
        Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
      ),
      excludeTriggerProduct: bar.excludeTriggerProduct !== false,
      quantity: Math.max(
        Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
        Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
      ),
      pricing: {
        mode: (
          ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
        ).includes(bar.pricing?.mode as CompleteBundlePricingMode)
          ? (bar.pricing.mode as CompleteBundlePricingMode)
          : "full_price",
        value: Number.isFinite(Number(bar.pricing?.value)) ? Number(bar.pricing?.value) : 0,
      },
      products: Array.isArray(bar.products) ? bar.products : [],
    });
  }

  if (!singleBar) {
    singleBar = createDefaultCompleteBundleSingleBar();
  }

  const orderedBars = [singleBar, ...bundleBars];
  const explicitDefaultBar = orderedBars.find((bar) => bar.isDefault);
  const fallbackDefaultBar = bundleBars[0] || singleBar;
  const defaultBarId = explicitDefaultBar?.id || fallbackDefaultBar.id;

  return orderedBars.map((bar) =>
    isCompleteBundleSingleBar(bar)
      ? createDefaultCompleteBundleSingleBar({
          ...bar,
          isDefault: bar.id === defaultBarId,
        })
      : {
          ...bar,
          badge: String(bar.badge || ""),
          isDefault: bar.id === defaultBarId,
        },
  );
}

export type SubscriptionLogicBlock = {
  id: string;
  type: "subscription";
  config: {
    enabled: boolean;
    position: typeof FIXED_SUBSCRIPTION_POSITION;
    title: string;
    subtitle: string;
    oneTimeTitle: typeof FIXED_ONE_TIME_TITLE;
    oneTimeSubtitle: typeof FIXED_ONE_TIME_SUBTITLE;
    defaultSelected: typeof FIXED_SUBSCRIPTION_DEFAULT_SELECTED;
    productIds: string[];
  };
};

export type LogicBlock =
  | QuantityBreaksLogicBlock
  | QuantityBreaksDifferentLogicBlock
  | BxgyLogicBlock
  | FreeGiftLogicBlock
  | CompleteBundleLogicBlock
  | SubscriptionLogicBlock;
export type DisplayBlock = OfferCardDisplayBlock | CountdownDisplayBlock;

export function parseDiscountRules(discountRulesJson?: string | null): DiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: DiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const isSingleTier = (item as { tierType?: unknown }).tierType === "single";
      const conditionType =
        (item as { conditionType?: unknown }).conditionType === "cart_amount"
          ? "cart_amount"
          : "item_quantity";
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (isSingleTier) {
        out.push(
          createDefaultSingleDiscountRule({
            id:
              typeof (item as { id?: unknown }).id === "string"
                ? (item as { id: string }).id
                : undefined,
            title: (item as { title?: string }).title || "",
            subtitle: (item as { subtitle?: string }).subtitle || "",
            badge: (item as { badge?: string }).badge || "",
            isDefault: !!(item as { isDefault?: boolean }).isDefault,
          }),
        );
        continue;
      }
      if (conditionType === "item_quantity" && (!Number.isFinite(count) || count < 1)) continue;
      if (
        conditionType === "cart_amount" &&
        !Number.isFinite(Number((item as { amountThreshold?: unknown }).amountThreshold))
      ) {
        continue;
      }
      if (
        (item as { rewardType?: unknown }).rewardType !== "free_shipping" &&
        !Number.isFinite(discountPercent)
      ) {
        continue;
      }
      out.push({
        id:
          typeof (item as { id?: unknown }).id === "string"
            ? (item as { id: string }).id
            : undefined,
        count:
          conditionType === "cart_amount"
            ? Math.max(1, Math.trunc(count || 1))
            : Math.trunc(count),
        discountPercent: Number.isFinite(discountPercent)
          ? Math.max(0, Math.min(100, discountPercent))
          : 0,
        tierType: "standard",
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
        discountClass:
          (item as { discountClass?: unknown }).discountClass === "order" ||
          (item as { discountClass?: unknown }).discountClass === "shipping"
            ? ((item as { discountClass: "order" | "shipping" }).discountClass)
            : "product",
        offerKind:
          (item as { offerKind?: unknown }).offerKind === "free_gift" ||
          (item as { offerKind?: unknown }).offerKind === "free_shipping"
            ? ((item as { offerKind: "free_gift" | "free_shipping" }).offerKind)
            : "percentage_discount",
        conditionType,
        amountThreshold: Number.isFinite(
          Number((item as { amountThreshold?: unknown }).amountThreshold),
        )
          ? Math.max(0, Number((item as { amountThreshold?: unknown }).amountThreshold))
          : undefined,
        rewardType:
          (item as { rewardType?: unknown }).rewardType === "gift_product" ||
          (item as { rewardType?: unknown }).rewardType === "free_shipping"
            ? ((item as { rewardType: "gift_product" | "free_shipping" }).rewardType)
            : "percentage_off",
        rewardProductIds: Array.isArray(
          (item as { rewardProductIds?: unknown }).rewardProductIds,
        )
          ? ((item as { rewardProductIds: unknown[] }).rewardProductIds)
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : [],
        giftQuantity: Number.isFinite(
          Number((item as { giftQuantity?: unknown }).giftQuantity),
        )
          ? Math.max(1, Math.trunc(Number((item as { giftQuantity?: unknown }).giftQuantity)))
          : undefined,
        logicType:
          (item as { logicType?: unknown }).logicType === "bxgy"
            ? "bxgy"
            : "standard",
        buyQuantity:
          (item as { logicType?: unknown }).logicType === "bxgy"
            ? Math.max(
                1,
                Math.trunc(
                  Number(
                    (item as { buyQuantity?: unknown; count?: unknown }).buyQuantity ??
                      (item as { count?: unknown }).count ??
                      2,
                  ),
                ),
              )
            : Number.isFinite(Number((item as { buyQuantity?: unknown }).buyQuantity))
              ? Math.max(1, Math.trunc(Number((item as { buyQuantity?: unknown }).buyQuantity)))
              : undefined,
        getQuantity: Number.isFinite(
          Number((item as { getQuantity?: unknown }).getQuantity),
        )
          ? Math.max(1, Math.trunc(Number((item as { getQuantity?: unknown }).getQuantity)))
          : undefined,
        maxUsesPerOrder:
          (item as { logicType?: unknown }).logicType === "bxgy"
            ? 1
            : Number.isFinite(Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder))
              ? Math.max(
                  1,
                  Math.trunc(Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder)),
                )
              : undefined,
      });
    }
    return normalizeDiscountRules(out);
  } catch {
    return [];
  }
}

function buildDefaultOfferCardConfig(
  settings: OfferSettings,
): OfferCardDisplayBlock["config"] {
  return {
    title: settings.title || "Bundle & Save",
    layoutFormat: settings.layoutFormat,
    accentColor: sanitizeHexColor(settings.accentColor, "#008060"),
    cardBackgroundColor: sanitizeHexColor(
      settings.cardBackgroundColor,
      "#ffffff",
    ),
    borderColor: sanitizeHexColor(settings.borderColor, "#dfe3e8"),
    labelColor: sanitizeHexColor(settings.labelColor, "#ffffff"),
    titleFontSize: clampNumber(settings.titleFontSize, 10, 36, 14),
    titleFontWeight: ["400", "500", "600", "700"].includes(
      String(settings.titleFontWeight),
    )
      ? String(settings.titleFontWeight)
      : "600",
    titleColor: sanitizeHexColor(settings.titleColor, "#111111"),
    buttonText: settings.buttonText || "Add to Cart",
    buttonPrimaryColor: sanitizeHexColor(
      settings.buttonPrimaryColor,
      "#008060",
    ),
    showCustomButton: settings.showCustomButton !== false,
  };
}

function sanitizeQuantityBreakTier(raw: unknown): QuantityBreakTier | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const tierType = item.tierType === "single" ? "single" : "standard";
  const qty = Math.trunc(Number(item.qty));
  const discountPercent = Number(item.discountPercent);
  if (tierType === "single") {
    return null;
  }
  if (!Number.isFinite(qty) || qty < 1) return null;
  if (!Number.isFinite(discountPercent)) return null;
  const stableId =
    typeof item.id === "string" && item.id
      ? item.id
      : buildDeterministicLegacyId("legacy-discount-rule", [
          qty,
          discountPercent,
          item.discountClass,
          item.offerKind,
          item.conditionType,
          item.amountThreshold,
          item.rewardType,
          item.rewardProductIds,
          item.giftQuantity,
          item.logicType,
          item.buyQuantity,
          item.getQuantity,
          item.maxUsesPerOrder,
        ]);
  return {
    id: stableId,
    qty,
    discountPercent: Math.max(0, Math.min(100, discountPercent)),
    tierType: "standard",
    title: typeof item.title === "string" ? item.title : "",
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    badge: typeof item.badge === "string" ? item.badge : "",
    isDefault: !!item.isDefault,
    discountClass:
      item.discountClass === "order" || item.discountClass === "shipping"
        ? item.discountClass
        : "product",
    offerKind:
      item.offerKind === "free_gift" || item.offerKind === "free_shipping"
        ? item.offerKind
        : "percentage_discount",
    conditionType: item.conditionType === "cart_amount" ? "cart_amount" : "item_quantity",
    amountThreshold: Number.isFinite(Number(item.amountThreshold))
      ? Math.max(0, Number(item.amountThreshold))
      : undefined,
    rewardType:
      item.rewardType === "gift_product" || item.rewardType === "free_shipping"
        ? item.rewardType
        : "percentage_off",
    rewardProductIds: Array.isArray(item.rewardProductIds)
      ? item.rewardProductIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [],
    giftQuantity: Number.isFinite(Number(item.giftQuantity))
      ? Math.max(1, Math.trunc(Number(item.giftQuantity)))
      : undefined,
    logicType: item.logicType === "bxgy" ? "bxgy" : "standard",
    buyQuantity: Number.isFinite(Number(item.buyQuantity))
      ? Math.max(1, Math.trunc(Number(item.buyQuantity)))
      : undefined,
    getQuantity: Number.isFinite(Number(item.getQuantity))
      ? Math.max(1, Math.trunc(Number(item.getQuantity)))
      : undefined,
    maxUsesPerOrder: Number.isFinite(Number(item.maxUsesPerOrder))
      ? Math.max(1, Math.trunc(Number(item.maxUsesPerOrder)))
      : undefined,
  };
}

function sanitizeBxgyTier(raw: unknown): BxgyDiscountRule | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (item.tierType === "single") {
    return null;
  }
  const count = Math.trunc(Number(item.count ?? item.buyQuantity));
  const buyQuantity = Math.trunc(Number(item.buyQuantity ?? item.count));
  const getQuantity = Math.trunc(Number(item.getQuantity));
  const discountPercent = item.logicType === "bxgy" ? 100 : Number(item.discountPercent);
  const maxUsesPerOrder = item.logicType === "bxgy" ? 1 : Math.trunc(Number(item.maxUsesPerOrder ?? 1));
  const buyProductIds = Array.isArray(item.buyProductIds)
    ? item.buyProductIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const getProductIds = Array.isArray(item.getProductIds)
    ? item.getProductIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(buyQuantity) || buyQuantity < 1) return null;
  if (!Number.isFinite(getQuantity) || getQuantity < 1) return null;
  if (!Number.isFinite(discountPercent)) return null;
  if (buyProductIds.length === 0) return null;
  const stableId =
    typeof item.id === "string" && item.id
      ? item.id
      : buildDeterministicLegacyId("legacy-bxgy-rule", [
          buyQuantity,
          getQuantity,
          discountPercent,
          buyProductIds,
          getProductIds,
          maxUsesPerOrder,
          item.title,
          item.subtitle,
          item.badge,
        ]);

  return {
    id: stableId,
    count: buyQuantity,
    buyQuantity,
    getQuantity,
    buyProductIds,
    getProductIds: getProductIds.length ? getProductIds : buyProductIds,
    discountPercent: Math.max(0, Math.min(100, discountPercent)),
    maxUsesPerOrder: Number.isFinite(maxUsesPerOrder) && maxUsesPerOrder > 0 ? maxUsesPerOrder : 1,
    title: typeof item.title === "string" ? item.title : "",
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    badge: typeof item.badge === "string" ? item.badge : "",
    isDefault: !!item.isDefault,
    tierType: "bxgy",
  };
}

function sanitizeDifferentProductsTier(
  raw: unknown,
): DifferentProductsDiscountRule | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const count = Math.trunc(Number(item.count));
  const buyQuantity = Math.trunc(Number(item.buyQuantity ?? item.count ?? 1));
  const getQuantity = Math.trunc(Number(item.getQuantity ?? 0));
  const discountPercent = item.tierType === "bxgy" ? 100 : Number(item.discountPercent);
  const maxUsesPerOrder = item.tierType === "bxgy" ? 1 : Math.trunc(Number(item.maxUsesPerOrder ?? 1));
  const buyProductIds = Array.isArray(item.buyProductIds)
    ? item.buyProductIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const getProductIds = Array.isArray(item.getProductIds)
    ? item.getProductIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const tierType =
    item.tierType === "single"
      ? "single"
      : item.tierType === "bxgy"
        ? "bxgy"
        : "simple";

  if (tierType === "single") {
    return null;
  }

  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(buyQuantity) || buyQuantity < 1) return null;
  if (!Number.isFinite(discountPercent)) return null;
  if (buyProductIds.length === 0) return null;
  if (tierType === "bxgy") {
    if (!Number.isFinite(getQuantity) || getQuantity < 1) return null;
    if (getProductIds.length === 0) return null;
  }
  const stableId =
    typeof item.id === "string" && item.id
      ? item.id
      : tierType === "bxgy"
        ? buildDeterministicLegacyId("legacy-different-products-bxgy", [
            buyQuantity,
            getQuantity,
            buyProductIds,
            getProductIds,
            discountPercent,
            maxUsesPerOrder,
            item.title,
            item.subtitle,
            item.badge,
          ])
        : buildDeterministicLegacyId("legacy-different-products-rule", [
            count,
            buyQuantity,
            buyProductIds,
            discountPercent,
            maxUsesPerOrder,
            item.title,
            item.subtitle,
            item.badge,
          ]);

  return {
    id: stableId,
    count: tierType === "bxgy" ? buyQuantity : count,
    discountPercent: Math.max(0, Math.min(100, discountPercent)),
    buyQuantity,
    getQuantity: tierType === "bxgy" ? getQuantity : 0,
    buyProductIds,
    getProductIds: tierType === "bxgy" ? (getProductIds.length ? getProductIds : buyProductIds) : [],
    maxUsesPerOrder:
      Number.isFinite(maxUsesPerOrder) && maxUsesPerOrder > 0
        ? maxUsesPerOrder
        : 1,
    tierType,
    title: typeof item.title === "string" ? item.title : "",
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    badge: typeof item.badge === "string" ? item.badge : "",
    isDefault: !!item.isDefault,
  };
}

function sanitizeFreeGiftTier(raw: unknown): FreeGiftRule | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  if (item.tierType === "single") {
    return null;
  }
  const count = Math.trunc(Number(item.count));
  const giftQuantity = Math.trunc(Number(item.giftQuantity));
  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(giftQuantity) || giftQuantity < 1) return null;
  const stableId =
    typeof item.id === "string" && item.id
      ? item.id
      : buildDeterministicLegacyId("legacy-free-gift-rule", [
          count,
          giftQuantity,
          item.title,
          item.subtitle,
          item.badge,
        ]);

  return {
    id: stableId,
    count,
    giftQuantity,
    tierType: undefined,
    title: typeof item.title === "string" ? item.title : "",
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    badge: typeof item.badge === "string" ? item.badge : "",
    isDefault: !!item.isDefault,
  };
}

function sanitizeSubscriptionLogicConfig(raw: unknown): SubscriptionLogicBlock["config"] | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const productIds = Array.isArray(item.productIds)
    ? item.productIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  return {
    enabled: item.enabled !== false,
    position: FIXED_SUBSCRIPTION_POSITION,
    title: sanitizeSingleLineText(item.title, 60, "Subscribe & Save"),
    subtitle: sanitizeSingleLineText(
      item.subtitle,
      60,
      "Subscription pricing updates from your selling plan",
    ),
    oneTimeTitle: FIXED_ONE_TIME_TITLE,
    oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
    defaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
    productIds,
  };
}

function sanitizeLogicBlock(raw: unknown): LogicBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const config = item.config;
  const configRecord =
    config && typeof config === "object" ? (config as Record<string, unknown>) : {};

  if (item.type === "quantity-breaks") {
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeQuantityBreakTier(tier))
      .filter((tier): tier is QuantityBreakTier => tier !== null)
      .sort((a, b) => a.qty - b.qty)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (tiers.length === 0) return null;

    return {
      id: typeof item.id === "string" && item.id ? item.id : "logic-quantity-breaks",
      type: "quantity-breaks",
      config: { tiers },
    };
  }

  if (item.type === "quantity-breaks-different") {
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeDifferentProductsTier(tier))
      .filter((tier): tier is DifferentProductsDiscountRule => tier !== null)
      .sort((a, b) => a.count - b.count)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (tiers.length === 0) return null;

    return {
      id:
        typeof item.id === "string" && item.id
          ? item.id
          : "logic-quantity-breaks-different",
      type: "quantity-breaks-different",
      config: { tiers },
    };
  }

  if (item.type === "bxgy") {
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeBxgyTier(tier))
      .filter((tier): tier is BxgyDiscountRule => tier !== null)
      .sort((a, b) => a.count - b.count)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (tiers.length === 0) return null;

    return {
      id: typeof item.id === "string" && item.id ? item.id : "logic-bxgy",
      type: "bxgy",
      config: { tiers },
    };
  }

  if (item.type === "free-gift") {
    const triggerProductIds = Array.isArray(configRecord.triggerProductIds)
      ? configRecord.triggerProductIds
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : [];
    const giftProductIds = Array.isArray(configRecord.giftProductIds)
      ? configRecord.giftProductIds
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : [];
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeFreeGiftTier(tier))
      .filter((tier): tier is FreeGiftRule => tier !== null)
      .sort((a, b) => a.count - b.count)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (triggerProductIds.length === 0 || giftProductIds.length === 0 || tiers.length === 0) {
      return null;
    }

    return {
      id: typeof item.id === "string" && item.id ? item.id : "logic-free-gift",
      type: "free-gift",
      config: {
        triggerProductIds,
        giftProductIds,
        tiers,
      },
    };
  }

  if (item.type === "complete-bundle") {
    const config = buildCompleteBundleConfig({
      triggerProductIds: Array.isArray(configRecord.triggerProductIds)
        ? configRecord.triggerProductIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [],
      bars: Array.isArray(configRecord.bars) ? configRecord.bars : [],
    });
    if (config.bars.length === 0 && (config.triggerProductIds?.length ?? 0) === 0) return null;
    return {
      id:
        typeof item.id === "string" && item.id ? item.id : "logic-complete-bundle",
      type: "complete-bundle",
      config,
    };
  }

  if (item.type === "subscription") {
    const config = sanitizeSubscriptionLogicConfig(configRecord);
    if (!config) return null;
    return {
      id:
        typeof item.id === "string" && item.id ? item.id : "logic-subscription",
      type: "subscription",
      config,
    };
  }

  return null;
}

function sanitizeDisplayBlock(raw: unknown): DisplayBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" && item.id ? item.id : "display-block";

  if (item.type === "offer-card") {
    const config =
      item.config && typeof item.config === "object"
        ? (item.config as Record<string, unknown>)
        : {};
    const layoutCandidate = String(config.layoutFormat || "vertical");
    const layoutFormat: OfferSettings["layoutFormat"] = [
      "vertical",
      "horizontal",
      "card",
      "compact",
    ].includes(layoutCandidate)
      ? (layoutCandidate as OfferSettings["layoutFormat"])
      : "vertical";
    return {
      id,
      type: "offer-card",
      logicBlockRef:
        typeof item.logicBlockRef === "string" && item.logicBlockRef
          ? item.logicBlockRef
          : "logic-quantity-breaks",
      config: {
        title: typeof config.title === "string" && config.title
          ? config.title
          : "Bundle & Save",
        layoutFormat,
        accentColor: sanitizeHexColor(config.accentColor, "#008060"),
        cardBackgroundColor: sanitizeHexColor(
          config.cardBackgroundColor,
          "#ffffff",
        ),
        borderColor: sanitizeHexColor(config.borderColor, "#dfe3e8"),
        labelColor: sanitizeHexColor(config.labelColor, "#ffffff"),
        titleFontSize: clampNumber(config.titleFontSize, 10, 36, 14),
        titleFontWeight: ["400", "500", "600", "700"].includes(
          String(config.titleFontWeight),
        )
          ? String(config.titleFontWeight)
          : "600",
        titleColor: sanitizeHexColor(config.titleColor, "#111111"),
        buttonText:
          typeof config.buttonText === "string" && config.buttonText
            ? config.buttonText
            : "Add to Cart",
        buttonPrimaryColor: sanitizeHexColor(
          config.buttonPrimaryColor,
          "#008060",
        ),
        showCustomButton: config.showCustomButton !== false,
      },
    };
  }

  if (item.type === "countdown") {
    const config =
      item.config && typeof item.config === "object"
        ? (item.config as Record<string, unknown>)
        : {};
    return {
      id,
      type: "countdown",
      config: {
        endTimeMode: "campaign-end-time",
        label:
          typeof config.label === "string" && config.label
            ? config.label
            : "Limited time offer",
      },
    };
  }

  return null;
}

export function parseCampaignConfig(
  campaignConfigJson?: string | null,
): CampaignConfig | null {
  if (!campaignConfigJson) return null;

  try {
    const parsed = JSON.parse(campaignConfigJson) as Record<string, unknown>;
    const scopeRaw =
      parsed.scope && typeof parsed.scope === "object"
        ? (parsed.scope as Record<string, unknown>)
        : {};
    const settingsRaw =
      parsed.settings && typeof parsed.settings === "object"
        ? (parsed.settings as Record<string, unknown>)
        : {};
    const logicBlocksRaw = Array.isArray(parsed.logicBlocks)
      ? parsed.logicBlocks
      : [];
    const displayBlocksRaw = Array.isArray(parsed.displayBlocks)
      ? parsed.displayBlocks
      : [];

    const logicBlocks = logicBlocksRaw
      .map((block) => sanitizeLogicBlock(block))
      .filter((block): block is LogicBlock => block !== null)
      .filter((block, index, blocks) => {
        // Historical campaign payloads may contain the same module repeated
        // multiple times with the same logic block id. Keep the first copy so
        // preview/runtime compilation does not duplicate rules.
        return index === blocks.findIndex((candidate) => candidate.id === block.id);
      });
    if (logicBlocks.length === 0) return null;

    const logicIds = new Set(logicBlocks.map((block) => block.id));
    const displayBlocks = displayBlocksRaw
      .map((block) => sanitizeDisplayBlock(block))
      .filter((block): block is DisplayBlock => block !== null)
      .filter((block) =>
        block.type === "offer-card" ? logicIds.has(block.logicBlockRef) : true,
      );

    return {
      version: 1,
      scope: {
        productIds: Array.isArray(scopeRaw.productIds)
          ? normalizeUniqueStringList(
              scopeRaw.productIds.map((id) => String(id || "").trim()),
            )
          : [],
        markets: Array.isArray(scopeRaw.markets)
          ? normalizeTargetMarkets(
              scopeRaw.markets.map((market) => String(market || "").trim()),
            )
          : ["all"],
        customerSegments: Array.isArray(scopeRaw.customerSegments)
          ? normalizeCustomerSegments(
              scopeRaw.customerSegments.map((segment) => String(segment || "").trim()),
            )
          : ["all"],
        customerProfileFilters: Array.isArray(scopeRaw.customerProfileFilters)
          ? normalizeCustomerProfileFilters(
              scopeRaw.customerProfileFilters.map((value) => String(value || "").trim()),
            )
          : [],
        ipCountryCodes: Array.isArray(scopeRaw.ipCountryCodes)
          ? normalizeIpCountryCodes(
              scopeRaw.ipCountryCodes.map((value) => String(value || "").trim()),
            )
          : [],
      },
      logicBlocks,
      displayBlocks,
      settings: {
        status: settingsRaw.status !== false,
        startTime:
          typeof settingsRaw.startTime === "string" ? settingsRaw.startTime : "",
        endTime: normalizeOfferEndTimeForUi(settingsRaw.endTime),
        scheduleTimezone:
          typeof settingsRaw.scheduleTimezone === "string"
            ? settingsRaw.scheduleTimezone
            : undefined,
        totalBudget:
          settingsRaw.totalBudget !== undefined
            ? parseNonNegativeNumberOrNull(settingsRaw.totalBudget)
            : null,
        dailyBudget:
          settingsRaw.dailyBudget !== undefined
            ? parseNonNegativeNumberOrNull(settingsRaw.dailyBudget)
            : null,
        usageLimitPerCustomer:
          typeof settingsRaw.usageLimitPerCustomer === "string" &&
          settingsRaw.usageLimitPerCustomer
            ? settingsRaw.usageLimitPerCustomer
            : "unlimited",
        compositionBarOrder: Array.isArray(settingsRaw.compositionBarOrder)
          ? settingsRaw.compositionBarOrder
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : undefined,
        checkboxUpsellsEnabled: settingsRaw.checkboxUpsellsEnabled === true,
        checkboxUpsellsTitle: sanitizeCheckboxUpsellsTitle(
          settingsRaw.checkboxUpsellsTitle,
        ),
        checkboxUpsellsSubtitle: sanitizeCheckboxUpsellsSubtitle(
          settingsRaw.checkboxUpsellsSubtitle,
        ),
        checkboxUpsellsDefaultChecked: settingsRaw.checkboxUpsellsDefaultChecked === true,
        stickyAddToCartEnabled: settingsRaw.stickyAddToCartEnabled === true,
        stickyAddToCartTitle: sanitizeStickyAddToCartTitle(
          settingsRaw.stickyAddToCartTitle,
        ),
        stickyAddToCartSubtitle: sanitizeStickyAddToCartSubtitle(
          settingsRaw.stickyAddToCartSubtitle,
        ),
        stickyAddToCartButtonText: sanitizeStickyAddToCartButtonText(
          settingsRaw.stickyAddToCartButtonText,
        ),
        couponEnabled: settingsRaw.couponEnabled === true,
        couponCode: sanitizeSingleLineText(settingsRaw.couponCode, 64, ""),
      },
    };
  } catch {
    return null;
  }
}

/** 写入主题 `ciwi-bundle-offers` 与 Function `ciwi-bundle-offers-fn`：排除后台已停用的活动。 */
export function isOfferPublishedForBundleMetafieldSync(offer: {
  status: boolean;
  campaignConfigJson?: string | null;
}): boolean {
  if (offer.status !== true) return false;
  const raw = offer.campaignConfigJson;
  if (raw == null || !String(raw).trim()) return true;
  const cfg = parseCampaignConfig(raw);
  if (cfg) return cfg.settings.status === true;
  try {
    const shallow = JSON.parse(String(raw)) as { settings?: { status?: unknown } };
    if (
      shallow?.settings &&
      typeof shallow.settings === "object" &&
      shallow.settings.status === false
    ) {
      return false;
    }
  } catch {
    // ignore
  }
  return true;
}

export function migrateLegacyOfferToCampaignConfig(params: {
  offerType?: string | null;
  selectedProductsJson?: string | null;
  discountRulesJson?: string | null;
  offerSettingsJson?: string | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  status?: boolean;
}): CampaignConfig {
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  const tiers = parseDiscountRules(params.discountRulesJson).map((rule) => ({
    id: rule.id,
    qty: rule.count,
    discountPercent: rule.discountPercent,
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
    discountClass: rule.discountClass,
    offerKind: rule.offerKind,
    conditionType: rule.conditionType,
    amountThreshold: rule.amountThreshold,
    rewardType: rule.rewardType,
    rewardProductIds: Array.isArray(rule.rewardProductIds) ? rule.rewardProductIds : [],
    giftQuantity: rule.giftQuantity,
    logicType: rule.logicType,
    buyQuantity: rule.buyQuantity,
    getQuantity: rule.getQuantity,
    maxUsesPerOrder: rule.maxUsesPerOrder,
  }));
  const productIds = parseSelectedProductIds(params.selectedProductsJson);
  const logicBlockId = "logic-quantity-breaks";
  const settings = {
    status: params.status !== false,
    startTime:
      params.startTime instanceof Date
        ? params.startTime.toISOString()
        : String(params.startTime || ""),
    endTime: normalizeOfferEndTimeForUi(params.endTime),
    scheduleTimezone: offerSettings.scheduleTimezone,
    totalBudget: offerSettings.totalBudget,
    dailyBudget: offerSettings.dailyBudget,
    usageLimitPerCustomer: offerSettings.usageLimitPerCustomer,
    compositionBarOrder: offerSettings.compositionBarOrder,
    checkboxUpsellsEnabled: offerSettings.checkboxUpsellsEnabled,
    checkboxUpsellsTitle: offerSettings.checkboxUpsellsTitle,
    checkboxUpsellsSubtitle: offerSettings.checkboxUpsellsSubtitle,
    checkboxUpsellsDefaultChecked: offerSettings.checkboxUpsellsDefaultChecked,
    stickyAddToCartEnabled: offerSettings.stickyAddToCartEnabled,
    stickyAddToCartTitle: offerSettings.stickyAddToCartTitle,
    stickyAddToCartSubtitle: offerSettings.stickyAddToCartSubtitle,
    stickyAddToCartButtonText: offerSettings.stickyAddToCartButtonText,
    couponEnabled: offerSettings.couponEnabled,
    couponCode: offerSettings.couponCode,
  };
  const targetingMarkets = normalizeTargetMarkets(
    offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
  );
  const targetingSegments = normalizeCustomerSegments(
    offerSettings.customerSegments ? offerSettings.customerSegments.split(",") : ["all"],
  );
  const targetingProfileFilters = normalizeCustomerProfileFilters(
    offerSettings.customerProfileFilters
      ? offerSettings.customerProfileFilters.split(",")
      : [],
  );
  const targetingIpCountryCodes = normalizeIpCountryCodes(
    offerSettings.ipCountryCodes ? offerSettings.ipCountryCodes.split(",") : [],
  );
  const offerType = String(params.offerType || "").trim();

  if (offerType === "bxgy") {
    let bxgySelectedProducts: { buyProducts?: string[]; getProducts?: string[] } = {};
    try {
      bxgySelectedProducts = JSON.parse(String(params.selectedProductsJson || "{}")) as {
        buyProducts?: string[];
        getProducts?: string[];
      };
    } catch {}
    const tiers = buildBxgyDiscountRulesJson(parseBxgyDiscountRules(params.discountRulesJson));
    const buyProducts = Array.isArray(bxgySelectedProducts.buyProducts)
      ? bxgySelectedProducts.buyProducts.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    const bxgyTiers =
      tiers.length > 0
        ? tiers
        : [
            {
              count: 2,
              buyQuantity: 2,
              getQuantity: 1,
              buyProductIds: buyProducts,
              getProductIds: buyProducts,
              discountPercent: 100,
              maxUsesPerOrder: 1,
              title: "",
              subtitle: "",
              badge: "",
              isDefault: true,
            },
          ];
    return {
      version: 1,
      scope: {
        productIds: Array.from(new Set(buyProducts)),
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-bxgy",
          type: "bxgy",
          config: { tiers: bxgyTiers },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-bxgy",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "quantity-breaks-different") {
    const differentProductsRules = buildDifferentProductsDiscountRulesJson(
      parseDifferentProductsDiscountRules(params.discountRulesJson),
    );
    const differentScopeProductIds = parseSelectedProductIds(
      params.selectedProductsJson,
    );
    const tiers =
      differentProductsRules.length > 0
        ? differentProductsRules
        : [
            {
              count: 2,
              discountPercent: 15,
              buyQuantity: 2,
              getQuantity: 0,
              buyProductIds: differentScopeProductIds,
              getProductIds: [],
              maxUsesPerOrder: 1,
              tierType: "simple" as const,
              title: "",
              subtitle: "",
              badge: "",
              isDefault: true,
            },
          ];
    return {
      version: 1,
      scope: {
        productIds: differentScopeProductIds,
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-quantity-breaks-different",
          type: "quantity-breaks-different",
          config: { tiers },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-quantity-breaks-different",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "free-gift") {
    const freeGiftSelectedProducts = parseFreeGiftSelectedProducts(
      params.selectedProductsJson,
    );
    const freeGiftRules = buildFreeGiftRulesJson(
      parseFreeGiftRules(params.discountRulesJson),
    );
    const triggerProducts = freeGiftSelectedProducts.triggerProducts;
    const giftProducts = freeGiftSelectedProducts.giftProducts;
    const tiers =
      freeGiftRules.length > 0
        ? freeGiftRules
        : [
            {
              count: 2,
              giftQuantity: 1,
              title: "",
              subtitle: "",
              badge: "",
              isDefault: true,
            },
          ];

    return {
      version: 1,
      scope: {
        productIds: Array.from(new Set(triggerProducts)),
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-free-gift",
          type: "free-gift",
          config: {
            triggerProductIds: triggerProducts,
            giftProductIds: giftProducts,
            tiers,
          },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-free-gift",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "complete-bundle") {
    const completeBundleConfig = buildCompleteBundleConfig(
      parseCompleteBundleConfig(params.selectedProductsJson),
    );
    return {
      version: 1,
      scope: {
        productIds: Array.from(new Set(completeBundleConfig.triggerProductIds ?? [])),
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-complete-bundle",
          type: "complete-bundle",
          config: completeBundleConfig,
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-complete-bundle",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "subscription") {
    return {
      version: 1,
      scope: {
        productIds,
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-subscription",
          type: "subscription",
          config: {
            enabled: offerSettings.subscriptionEnabled,
            position: FIXED_SUBSCRIPTION_POSITION,
            title: offerSettings.subscriptionTitle,
            subtitle: offerSettings.subscriptionSubtitle,
            oneTimeTitle: FIXED_ONE_TIME_TITLE,
            oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
            defaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
            productIds,
          },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-subscription",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  return {
    version: 1,
    scope: {
      productIds,
      markets: targetingMarkets,
      customerSegments: targetingSegments,
      customerProfileFilters: targetingProfileFilters,
      ipCountryCodes: targetingIpCountryCodes,
    },
    logicBlocks: [
      {
        id: logicBlockId,
        type: "quantity-breaks",
        config: {
          tiers:
            tiers.length > 0
              ? tiers
              : [
                  {
                    qty: 2,
                    discountPercent: 10,
                    title: "",
                    subtitle: "",
                    badge: "",
                    isDefault: true,
                  },
                ],
        },
      },
    ],
    displayBlocks: [
      {
        id: "display-offer-card",
        type: "offer-card",
        logicBlockRef: logicBlockId,
        config: buildDefaultOfferCardConfig(offerSettings),
      },
    ],
    settings,
  };
}

export type CampaignRuntimeModuleOutput = {
  offerType: string;
  selectedProductsJson: string | null;
  selectedProductsJsonForFunction: string | null;
  discountRulesJson: string | null;
  referencedProductIds: string[];
  storefrontHydration:
    | "none"
    | "complete-bundle"
    | "quantity-breaks-different";
};

export type CampaignRuntimeOutputs = {
  primaryOfferType: string | null;
  primaryModule: CampaignRuntimeModuleOutput | null;
  modules: {
    quantityBreaks: CampaignRuntimeModuleOutput | null;
    quantityBreaksDifferent: CampaignRuntimeModuleOutput | null;
    bxgy: CampaignRuntimeModuleOutput | null;
    freeGift: CampaignRuntimeModuleOutput | null;
    completeBundle: CampaignRuntimeModuleOutput | null;
    subscription: CampaignRuntimeModuleOutput | null;
  };
  referencedProductIds: string[];
};

function finalizeCampaignRuntimeModuleOutput(params: {
  offerType: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  referencedProductIds: string[];
  storefrontHydration?: CampaignRuntimeModuleOutput["storefrontHydration"];
}): CampaignRuntimeModuleOutput {
  return {
    offerType: params.offerType,
    selectedProductsJson: params.selectedProductsJson,
    selectedProductsJsonForFunction:
      params.selectedProductsJson == null
        ? null
        : trimSelectedProductsJsonForFunctionByOfferType(
            params.offerType,
            params.selectedProductsJson,
            (next) => {
              const trimmed = next.trim();
              return trimmed === "" ? null : trimmed;
            },
          ),
    discountRulesJson: params.discountRulesJson,
    referencedProductIds: normalizeUniqueStringList(params.referencedProductIds),
    storefrontHydration: params.storefrontHydration || "none",
  };
}

function buildLegacyQuantityBreakDiscountRules(
  tiers: QuantityBreakTier[],
): DiscountRule[] {
  return tiers.map((tier) => ({
    id: tier.id,
    count: tier.qty,
    discountPercent: tier.discountPercent,
    title: tier.title || "",
    subtitle: tier.subtitle || "",
    badge: tier.badge || "",
    isDefault: !!tier.isDefault,
    discountClass:
      tier.discountClass === "order" || tier.discountClass === "shipping"
        ? tier.discountClass
        : "product",
    offerKind:
      tier.offerKind === "free_gift" || tier.offerKind === "free_shipping"
        ? tier.offerKind
        : "percentage_discount",
    conditionType: tier.conditionType === "cart_amount" ? "cart_amount" : "item_quantity",
    amountThreshold: tier.amountThreshold,
    rewardType:
      tier.rewardType === "gift_product" || tier.rewardType === "free_shipping"
        ? tier.rewardType
        : "percentage_off",
    rewardProductIds: Array.isArray(tier.rewardProductIds)
      ? tier.rewardProductIds
      : [],
    giftQuantity: tier.giftQuantity,
    logicType: tier.logicType === "bxgy" ? "bxgy" : "standard",
    buyQuantity: tier.buyQuantity,
    getQuantity: tier.getQuantity,
    maxUsesPerOrder: tier.maxUsesPerOrder,
  }));
}

function isShippingDiscountRuleLike(rule: DiscountRule): boolean {
  return (
    rule.tierType !== "single" &&
    rule.rewardType === "free_shipping" &&
    rule.discountClass === "shipping"
  );
}

function isOrderDiscountRuleLike(rule: DiscountRule): boolean {
  return (
    rule.tierType !== "single" &&
    rule.rewardType === "percentage_off" &&
    rule.discountClass === "order"
  );
}

function isCouponConfigEnabled(
  config: CampaignConfig | null | undefined,
): boolean {
  return (
    config?.settings?.couponEnabled === true &&
    String(config.settings.couponCode || "").trim().length > 0
  );
}

function isShippingDiscountLikeRules(rules: DiscountRule[]): boolean {
  const configuredRules = rules.filter((rule) => rule.tierType !== "single");
  return configuredRules.length > 0 && configuredRules.every(isShippingDiscountRuleLike);
}

function isOrderDiscountLikeRules(rules: DiscountRule[]): boolean {
  const configuredRules = rules.filter((rule) => rule.tierType !== "single");
  return configuredRules.length > 0 && configuredRules.every(isOrderDiscountRuleLike);
}

function isShippingDiscountLikeQuantityBreaksBlock(
  block: QuantityBreaksLogicBlock | null | undefined,
): boolean {
  if (!block) return false;
  return isShippingDiscountLikeRules(
    buildLegacyQuantityBreakDiscountRules(block.config.tiers),
  );
}

function isOrderDiscountLikeQuantityBreaksBlock(
  block: QuantityBreaksLogicBlock | null | undefined,
): boolean {
  if (!block) return false;
  return isOrderDiscountLikeRules(
    buildLegacyQuantityBreakDiscountRules(block.config.tiers),
  );
}

export function compileCampaignRuntimeOutputs(
  config: CampaignConfig,
): CampaignRuntimeOutputs {
  const quantityBreaks = config.logicBlocks.find(
    (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
  );
  const quantityBreaksDifferent = config.logicBlocks.find(
    (block): block is QuantityBreaksDifferentLogicBlock =>
      block.type === "quantity-breaks-different",
  );
  const bxgy = config.logicBlocks.find(
    (block): block is BxgyLogicBlock => block.type === "bxgy",
  );
  const freeGift = config.logicBlocks.find(
    (block): block is FreeGiftLogicBlock => block.type === "free-gift",
  );
  const completeBundle = config.logicBlocks.find(
    (block): block is CompleteBundleLogicBlock => block.type === "complete-bundle",
  );
  const subscription = config.logicBlocks.find(
    (block): block is SubscriptionLogicBlock => block.type === "subscription",
  );

  const quantityBreaksOutput = quantityBreaks
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "quantity-breaks-same",
        selectedProductsJson:
          config.scope.productIds.length > 0
            ? JSON.stringify(config.scope.productIds.map((id) => ({ id })))
            : null,
        discountRulesJson:
          quantityBreaks.config.tiers.length > 0
            ? JSON.stringify(
                buildLegacyQuantityBreakDiscountRules(quantityBreaks.config.tiers),
              )
            : null,
        referencedProductIds: config.scope.productIds,
      })
    : null;

  const differentProductsRules = quantityBreaksDifferent
    ? buildDifferentProductsDiscountRulesJson(quantityBreaksDifferent.config.tiers)
    : [];
  const quantityBreaksDifferentScopeIds = normalizeUniqueStringList(
    differentProductsRules.flatMap((tier) => tier.buyProductIds),
  );
  const quantityBreaksDifferentOutput = quantityBreaksDifferent
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "quantity-breaks-different",
        selectedProductsJson: JSON.stringify({
          productIds:
            quantityBreaksDifferentScopeIds.length > 0
              ? quantityBreaksDifferentScopeIds
              : config.scope.productIds,
        }),
        discountRulesJson:
          differentProductsRules.length > 0
            ? JSON.stringify(differentProductsRules)
            : null,
        referencedProductIds: [
          ...(quantityBreaksDifferentScopeIds.length > 0
            ? quantityBreaksDifferentScopeIds
            : config.scope.productIds),
          ...differentProductsRules.flatMap((tier) => tier.buyProductIds),
        ],
        storefrontHydration: "quantity-breaks-different",
      })
    : null;

  const bxgyRules = bxgy ? buildBxgyDiscountRulesJson(bxgy.config.tiers) : [];
  const bxgyBuyProducts = Array.from(
    new Set(bxgyRules.flatMap((tier) => tier.buyProductIds)),
  );
  const bxgyGetProducts = Array.from(
    new Set(bxgyRules.flatMap((tier) => tier.getProductIds)),
  );
  const bxgyOutput = bxgy
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "bxgy",
        selectedProductsJson: JSON.stringify({
          buyProducts: bxgyBuyProducts,
        }),
        discountRulesJson: bxgyRules.length > 0 ? JSON.stringify(bxgyRules) : null,
        referencedProductIds: [...bxgyBuyProducts, ...bxgyGetProducts],
      })
    : null;

  const freeGiftRules = freeGift ? buildFreeGiftRulesJson(freeGift.config.tiers) : [];
  const freeGiftRewardProductIds = Array.from(
    new Set([
      ...(freeGift?.config.giftProductIds ?? []),
      ...freeGiftRules.flatMap((tier) => tier.giftProductIds || []),
    ]),
  );
  const freeGiftOutput = freeGift
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "free-gift",
        selectedProductsJson: JSON.stringify({
          triggerProducts: freeGift.config.triggerProductIds,
          giftProducts: freeGift.config.giftProductIds,
        }),
        discountRulesJson:
          freeGiftRules.length > 0 ? JSON.stringify(freeGiftRules) : null,
        referencedProductIds: [
          ...freeGift.config.triggerProductIds,
          ...freeGiftRewardProductIds,
        ],
      })
    : null;

  const completeBundleConfig = completeBundle
    ? buildCompleteBundleConfig(completeBundle.config)
    : null;
  const completeBundleDiscountRules =
    completeBundleConfig && completeBundleConfig.bars.length > 0
      ? JSON.stringify(
          completeBundleConfig.bars.map((bar) => ({
            id: bar.id,
            type: bar.type,
            title: bar.title || "",
            subtitle: bar.subtitle || "",
            badge: bar.badge || "",
            isDefault: !!bar.isDefault,
            quantity: bar.quantity,
            pricing: bar.pricing,
            products: bar.products.map((product) => ({
              productId: product.productId,
              pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
            })),
          })),
        )
      : null;
  const completeBundleOutput =
    completeBundle && completeBundleConfig
      ? finalizeCampaignRuntimeModuleOutput({
          offerType: "complete-bundle",
          selectedProductsJson: JSON.stringify({
            triggerProductIds: completeBundleConfig.triggerProductIds ?? [],
            bars: completeBundleConfig.bars,
          }),
          discountRulesJson: completeBundleDiscountRules,
          referencedProductIds: [
            ...(completeBundleConfig.triggerProductIds ?? []),
            ...completeBundleConfig.bars.flatMap((bar) =>
              bar.products.map((product) => product.productId),
            ),
          ],
          storefrontHydration: "complete-bundle",
        })
      : null;

  const subscriptionOutput = subscription
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "subscription",
        selectedProductsJson:
          subscription.config.productIds.length > 0
            ? JSON.stringify(
                subscription.config.productIds.map((id) => ({ id: String(id) })),
              )
            : null,
        discountRulesJson: null,
        referencedProductIds: subscription.config.productIds,
      })
    : null;

  const modules = {
    quantityBreaks: quantityBreaksOutput,
    quantityBreaksDifferent: quantityBreaksDifferentOutput,
    bxgy: bxgyOutput,
    freeGift: freeGiftOutput,
    completeBundle: completeBundleOutput,
    subscription: subscriptionOutput,
  };
  const primaryOfferType = getPrimaryOfferTypeFromCampaignConfig(config);
  const primaryModule =
    primaryOfferType === "quantity-breaks-same" ||
    primaryOfferType === "shipping-discount" ||
    primaryOfferType === "order-discount" ||
    primaryOfferType === "coupon"
      ? modules.quantityBreaks
      : primaryOfferType === "quantity-breaks-different"
        ? modules.quantityBreaksDifferent
        : primaryOfferType === "bxgy"
          ? modules.bxgy
          : primaryOfferType === "free-gift"
            ? modules.freeGift
            : primaryOfferType === "complete-bundle"
              ? modules.completeBundle
              : primaryOfferType === "subscription"
                ? modules.subscription
                : null;

  return {
    primaryOfferType,
    primaryModule,
    modules,
    referencedProductIds: normalizeUniqueStringList(
      Object.values(modules).flatMap((moduleOutput) =>
        moduleOutput ? moduleOutput.referencedProductIds : [],
      ),
    ),
  };
}

export function buildLegacyFieldsFromCampaignConfig(config: CampaignConfig): {
  offerType: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string;
} {
  const runtimeOutputs = compileCampaignRuntimeOutputs(config);
  const subscription = config.logicBlocks.find(
    (block): block is SubscriptionLogicBlock => block.type === "subscription",
  );
  const offerCard = config.displayBlocks.find(
    (block): block is OfferCardDisplayBlock => block.type === "offer-card",
  );

  const offerSettings = {
    title: offerCard?.config.title || "Bundle & Save",
    layoutFormat: offerCard?.config.layoutFormat || "vertical",
    totalBudget: config.settings.totalBudget,
    dailyBudget: config.settings.dailyBudget,
    customerSegments: normalizeCustomerSegments(config.scope.customerSegments).length
      ? normalizeCustomerSegments(config.scope.customerSegments).join(",")
      : null,
    customerProfileFilters: normalizeCustomerProfileFilters(
      config.scope.customerProfileFilters,
    ).length
      ? normalizeCustomerProfileFilters(config.scope.customerProfileFilters).join(",")
      : null,
    ipCountryCodes: normalizeIpCountryCodes(config.scope.ipCountryCodes).length
      ? normalizeIpCountryCodes(config.scope.ipCountryCodes).join(",")
      : null,
    markets: normalizeTargetMarkets(config.scope.markets).length
      ? normalizeTargetMarkets(config.scope.markets).join(",")
      : null,
    usageLimitPerCustomer: config.settings.usageLimitPerCustomer || "unlimited",
    compositionBarOrder: config.settings.compositionBarOrder,
    accentColor: offerCard?.config.accentColor || "#008060",
    cardBackgroundColor: offerCard?.config.cardBackgroundColor || "#ffffff",
    borderColor: offerCard?.config.borderColor || "#dfe3e8",
    labelColor: offerCard?.config.labelColor || "#ffffff",
    titleColor: offerCard?.config.titleColor || "#111111",
    buttonPrimaryColor: offerCard?.config.buttonPrimaryColor || "#008060",
    titleFontSize: offerCard?.config.titleFontSize ?? 14,
    titleFontWeight: offerCard?.config.titleFontWeight || "600",
    buttonText: offerCard?.config.buttonText || "Add to Cart",
    showCustomButton: offerCard?.config.showCustomButton !== false,
    subscriptionEnabled: subscription?.config.enabled ?? false,
    subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
    subscriptionTitle: subscription?.config.title ?? "Subscribe & Save",
    subscriptionSubtitle:
      subscription?.config.subtitle ??
      "Subscription pricing updates from your selling plan",
    oneTimeTitle: FIXED_ONE_TIME_TITLE,
    oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
    subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
    progressiveGifts: { ...DEFAULT_PROGRESSIVE_GIFTS },
    scheduleTimezone: config.settings.scheduleTimezone,
    checkboxUpsellsEnabled: config.settings.checkboxUpsellsEnabled,
    checkboxUpsellsTitle: sanitizeCheckboxUpsellsTitle(
      config.settings.checkboxUpsellsTitle,
    ),
    checkboxUpsellsSubtitle: sanitizeCheckboxUpsellsSubtitle(
      config.settings.checkboxUpsellsSubtitle,
    ),
    checkboxUpsellsDefaultChecked: config.settings.checkboxUpsellsDefaultChecked,
    stickyAddToCartEnabled: config.settings.stickyAddToCartEnabled,
    stickyAddToCartTitle: sanitizeStickyAddToCartTitle(
      config.settings.stickyAddToCartTitle,
    ),
    stickyAddToCartSubtitle: sanitizeStickyAddToCartSubtitle(
      config.settings.stickyAddToCartSubtitle,
    ),
    stickyAddToCartButtonText: sanitizeStickyAddToCartButtonText(
      config.settings.stickyAddToCartButtonText,
    ),
    couponEnabled: config.settings.couponEnabled === true,
    couponCode: sanitizeSingleLineText(config.settings.couponCode, 64, ""),
  } satisfies OfferSettings;
  const inferredPrimaryOfferType = runtimeOutputs.primaryOfferType;
  const primaryModuleOutput =
    runtimeOutputs.primaryModule ||
    Object.values(runtimeOutputs.modules).find((moduleOutput) => moduleOutput !== null) ||
    null;

  return {
    offerType:
      inferredPrimaryOfferType ||
      (runtimeOutputs.modules.quantityBreaks
        ? "quantity-breaks-same"
        : runtimeOutputs.modules.quantityBreaksDifferent
          ? "quantity-breaks-different"
          : runtimeOutputs.modules.bxgy
            ? "bxgy"
            : runtimeOutputs.modules.freeGift
              ? "free-gift"
              : runtimeOutputs.modules.completeBundle
                ? "complete-bundle"
                : subscription
                  ? "subscription"
                  : "campaign-builder"),
    selectedProductsJson: primaryModuleOutput?.selectedProductsJson ?? null,
    discountRulesJson: primaryModuleOutput?.discountRulesJson ?? null,
    offerSettingsJson: JSON.stringify(offerSettings),
  };
}

export function buildOfferSettingsJsonFromCampaignConfig(
  config: CampaignConfig,
  existingOfferSettingsJson?: string | null,
): string {
  const baseOfferSettings = parseOfferSettings(
    buildLegacyFieldsFromCampaignConfig(config).offerSettingsJson,
  );
  return JSON.stringify({
    ...baseOfferSettings,
    // Progressive gifts still live only in legacy offerSettingsJson for now.
    progressiveGifts: progressiveGiftsConfigToStorableJson(
      parseProgressiveGiftsFromOfferSettingsJson(existingOfferSettingsJson),
    ),
  } satisfies OfferSettings);
}

export function buildPersistedOfferFieldsFromCampaignConfig(
  config: CampaignConfig,
  existingOfferSettingsJson?: string | null,
): {
  offerType: string;
  selectedProductsJson: string | null;
  selectedProductsJsonForFunction: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string;
  referencedProductIds: string[];
  storefrontHydration: "none" | "complete-bundle" | "quantity-breaks-different";
} {
  const runtimeOutputs = compileCampaignRuntimeOutputs(config);
  const legacyFields = buildLegacyFieldsFromCampaignConfig(config);

  return {
    offerType: legacyFields.offerType,
    selectedProductsJson: legacyFields.selectedProductsJson ?? null,
    selectedProductsJsonForFunction:
      runtimeOutputs.primaryModule?.selectedProductsJsonForFunction ??
      (legacyFields.selectedProductsJson
        ? trimSelectedProductsJsonForFunction(
            legacyFields.offerType,
            legacyFields.selectedProductsJson,
          )
        : null),
    discountRulesJson:
      runtimeOutputs.primaryModule?.discountRulesJson ?? legacyFields.discountRulesJson,
    offerSettingsJson: buildOfferSettingsJsonFromCampaignConfig(
      config,
      existingOfferSettingsJson,
    ),
    referencedProductIds: runtimeOutputs.referencedProductIds,
    storefrontHydration: runtimeOutputs.primaryModule?.storefrontHydration ?? "none",
  };
}

function getOfferTypeFromLogicBlockType(type: string | undefined): string | null {
  if (type === "quantity-breaks") return "quantity-breaks-same";
  if (type === "quantity-breaks-different") return "quantity-breaks-different";
  if (type === "bxgy") return "bxgy";
  if (type === "free-gift") return "free-gift";
  if (type === "complete-bundle") return "complete-bundle";
  if (type === "subscription") return "subscription";
  return null;
}

export function getPrimaryOfferTypeFromCampaignConfig(
  config: CampaignConfig | null | undefined,
): string | null {
  const primaryBlock = config?.logicBlocks[0];
  if (
    primaryBlock?.type === "quantity-breaks" &&
    isCouponConfigEnabled(config) &&
    isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
  ) {
    return "coupon";
  }
  if (
    primaryBlock?.type === "quantity-breaks" &&
    isShippingDiscountLikeQuantityBreaksBlock(primaryBlock)
  ) {
    return "shipping-discount";
  }
  if (
    primaryBlock?.type === "quantity-breaks" &&
    isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
  ) {
    return "order-discount";
  }
  return getOfferTypeFromLogicBlockType(primaryBlock?.type);
}

export function resolveOfferTypeFromCampaignConfig(params: {
  offerType?: string | null;
  campaignConfigJson?: string | null;
}): string {
  const primaryOfferType = getPrimaryOfferTypeFromCampaignConfig(
    parseCampaignConfig(params.campaignConfigJson),
  );
  return primaryOfferType || String(params.offerType || "").trim() || "campaign-builder";
}

function isProgressiveGiftsTemplateLike(params: {
  offerType?: string | null;
  campaignConfigJson?: string | null;
  offerSettingsJson?: string | null;
}): boolean {
  const config = parseCampaignConfig(params.campaignConfigJson);
  const primaryOfferType = getPrimaryOfferTypeFromCampaignConfig(config);
  const normalizedOfferType = String(params.offerType || "").trim();
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  if (!offerSettings.progressiveGifts.enabled) {
    return false;
  }
  return (
    normalizedOfferType === "progressive-gifts" ||
    primaryOfferType === "quantity-breaks-same" ||
    (!primaryOfferType && normalizedOfferType === "quantity-breaks-same")
  );
}

function getLogicBlockDisplayType(type: string | undefined): string | null {
  if (type === "quantity-breaks") return "Quantity breaks";
  if (type === "quantity-breaks-different") {
    return "Quantity breaks (different products)";
  }
  if (type === "bxgy") return "Buy X Get Y";
  if (type === "free-gift") return "Free gift";
  if (type === "complete-bundle") return "Complete bundle";
  if (type === "subscription") return "Subscription";
  return null;
}

export function getOfferDisplayType(
  offerType: string,
  campaignConfigJson?: string | null,
  offerSettingsJson?: string | null,
): string {
  if (
    isProgressiveGiftsTemplateLike({
      offerType,
      campaignConfigJson,
      offerSettingsJson,
    })
  ) {
    const config = parseCampaignConfig(campaignConfigJson);
    const extraModuleCount = Math.max(0, (config?.logicBlocks.length || 0) - 1);
    return extraModuleCount > 0
      ? `Progressive gifts + ${extraModuleCount} module${extraModuleCount === 1 ? "" : "s"}`
      : "Progressive gifts";
  }
  const config = parseCampaignConfig(campaignConfigJson);
  const primaryBlock = config?.logicBlocks[0];
  const primaryLabel =
    primaryBlock?.type === "quantity-breaks" &&
    isCouponConfigEnabled(config) &&
    isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
      ? "Coupon"
      : primaryBlock?.type === "quantity-breaks" &&
          isShippingDiscountLikeQuantityBreaksBlock(primaryBlock)
        ? "Shipping discount"
        : primaryBlock?.type === "quantity-breaks" &&
            isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
          ? "Order discount"
          : getLogicBlockDisplayType(primaryBlock?.type);
  if (primaryLabel) {
    const extraModuleCount = Math.max(0, (config?.logicBlocks.length || 0) - 1);
    return extraModuleCount > 0
      ? `${primaryLabel} + ${extraModuleCount} module${extraModuleCount === 1 ? "" : "s"}`
      : primaryLabel;
  }
  if (offerType === "quantity-breaks-same") return "Quantity breaks";
  if (offerType === "shipping-discount") return "Shipping discount";
  if (offerType === "order-discount") return "Order discount";
  if (offerType === "coupon") return "Coupon";
  if (offerType === "quantity-breaks-different") {
    return "Quantity breaks (different products)";
  }
  if (offerType === "bxgy") return "Buy X Get Y";
  if (offerType === "free-gift") return "Free gift";
  if (offerType === "complete-bundle") return "Complete bundle";
  if (offerType === "subscription") return "Subscription";
  return offerType || "Campaign";
}

export function getOfferRulesText(params: {
  campaignConfigJson?: string | null;
  discountRulesJson?: string | null;
  offerSettingsJson?: string | null;
}): string {
  if (
    isProgressiveGiftsTemplateLike({
      offerType: "quantity-breaks-same",
      campaignConfigJson: params.campaignConfigJson,
      offerSettingsJson: params.offerSettingsJson,
    })
  ) {
    const config = parseCampaignConfig(params.campaignConfigJson);
    const quantityBreaks = config?.logicBlocks.find(
      (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
    );
    const milestoneCount = quantityBreaks?.config.tiers.length || 0;
    const progressiveGifts = parseOfferSettings(params.offerSettingsJson).progressiveGifts;
    const rewardCount = progressiveGifts.gifts.length;
    return `${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"}, ${rewardCount} reward slot${rewardCount === 1 ? "" : "s"}`;
  }
  const config = parseCampaignConfig(params.campaignConfigJson);
  if (config) {
    const quantityBreaks = config.logicBlocks.find(
      (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
    );
    const tiers = quantityBreaks?.config.tiers ?? [];
    if (tiers.length > 0) {
      return tiers
        .map((tier) =>
          tier.rewardType === "free_shipping"
            ? tier.conditionType === "cart_amount"
              ? `Spend ${tier.amountThreshold} Unlock Free Shipping`
              : `Buy ${tier.qty} Unlock Free Shipping`
            : tier.discountClass === "order"
              ? tier.conditionType === "cart_amount"
                ? `Spend ${tier.amountThreshold} Get ${tier.discountPercent}% Off Order`
                : `Buy ${tier.qty} Get ${tier.discountPercent}% Off Order`
            : `Buy ${tier.qty} Get ${tier.discountPercent}% Off`,
        )
        .join(", ");
    }
    const bxgy = config.logicBlocks.find(
      (block): block is BxgyLogicBlock => block.type === "bxgy",
    );
    const differentProducts = config.logicBlocks.find(
      (block): block is QuantityBreaksDifferentLogicBlock =>
        block.type === "quantity-breaks-different",
    );
    const differentProductsTiers = differentProducts?.config.tiers ?? [];
    if (differentProductsTiers.length > 0) {
      return differentProductsTiers
        .map((tier) =>
          tier.tierType === "bxgy"
            ? getBxgyDisplayMeta(tier).summary
            : `Buy ${tier.count} Get ${tier.discountPercent}% Off`,
        )
        .join(", ");
    }
    const bxgyTiers = bxgy?.config.tiers ?? [];
    if (bxgyTiers.length > 0) {
      return bxgyTiers
        .map((tier) => getBxgyDisplayMeta(tier).summary)
        .join(", ");
    }
    const freeGift = config.logicBlocks.find(
      (block): block is FreeGiftLogicBlock => block.type === "free-gift",
    );
    const freeGiftTiers = freeGift?.config.tiers ?? [];
    if (freeGift && freeGiftTiers.length > 0) {
      return freeGiftTiers
        .map(
          (tier) =>
            `Buy ${tier.count} Get ${tier.giftQuantity} free gift${tier.giftQuantity > 1 ? "s" : ""}`,
        )
        .join(", ");
    }
    const completeBundle = config.logicBlocks.find(
      (block): block is CompleteBundleLogicBlock => block.type === "complete-bundle",
    );
    if (completeBundle?.config.bars.length) {
      return `${completeBundle.config.bars.length} bundle bar${completeBundle.config.bars.length > 1 ? "s" : ""}`;
    }
    const subscription = config.logicBlocks.find(
      (block): block is SubscriptionLogicBlock => block.type === "subscription",
    );
    if (subscription) {
      return subscription.config.enabled
        ? `Subscription enabled for ${subscription.config.productIds.length || config.scope.productIds.length} product${(subscription.config.productIds.length || config.scope.productIds.length) > 1 ? "s" : ""}`
        : "Subscription block configured";
    }
  }

  const rules = parseDiscountRules(params.discountRulesJson);
  if (rules.length > 0) {
    return rules.map((rule) => `Buy ${rule.count} Get ${rule.discountPercent}% Off`).join(", ");
  }

  const bxgyRules = parseBxgyDiscountRules(params.discountRulesJson);
  if (bxgyRules.length > 0) {
    return bxgyRules
      .map((rule) => getBxgyDisplayMeta(rule).summary)
      .join(", ");
  }

  const freeGiftRules = parseFreeGiftRules(params.discountRulesJson);
  if (freeGiftRules.length > 0) {
    return freeGiftRules
      .map(
        (rule) =>
          `Buy ${rule.count} Get ${rule.giftQuantity} free gift${rule.giftQuantity > 1 ? "s" : ""}`,
      )
      .join(", ");
  }

  try {
    const parsed = JSON.parse(String(params.discountRulesJson || "null")) as unknown;
    if (Array.isArray(parsed) && parsed.some((item) => item && typeof item === "object" && "products" in (item as Record<string, unknown>))) {
      return `${parsed.length} bundle bar${parsed.length > 1 ? "s" : ""}`;
    }
  } catch {}

  return "-";
}

export function getOfferScheduleTimezone(params: {
  campaignConfigJson?: string | null;
  offerSettingsJson?: string | null;
  fallback?: string;
}): string {
  const config = parseCampaignConfig(params.campaignConfigJson);
  if (config?.settings.scheduleTimezone) {
    return config.settings.scheduleTimezone;
  }
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  return offerSettings.scheduleTimezone || params.fallback || "UTC";
}

export function parseSelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.productIds)) {
      return parsed.productIds
        .map((id: unknown) => String(id || "").trim())
        .filter(Boolean);
    }
    if (!Array.isArray(parsed)) return [];

    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        ids.push(item);
        continue;
      }

      if (item && typeof item === "object") {
        const id = (item as { id?: unknown }).id;
        if (typeof id === "string") ids.push(id);
        else if (typeof id === "number") ids.push(String(id));
      }
    }

    return ids;
  } catch {
    return [];
  }
}

export function parsePerProductDiscountRules(
  discountRulesJson?: string | null,
): PerProductDiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: PerProductDiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;

      const productId = (item as { productId?: unknown }).productId;
      const variantId = (item as { variantId?: unknown }).variantId;

      out.push({
        productId:
          typeof productId === "string" && productId ? productId : undefined,
        variantId:
          typeof variantId === "string" && variantId ? variantId : undefined,
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
      });
    }
    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

export function buildPerProductDiscountRulesJson(
  tiers: PerProductDiscountRule[],
): PerProductDiscountRule[] {
  const seen = new Set<string>();
  const out: PerProductDiscountRule[] = [];

  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;
    const key = `${tier.productId ?? ""}|${tier.variantId ?? ""}|${Math.trunc(tier.count)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      productId: tier.productId,
      variantId: tier.variantId,
      count: Math.trunc(tier.count),
      discountPercent: Math.max(0, Math.min(100, tier.discountPercent)),
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
    });
  }

  return out.sort((a, b) => a.count - b.count);
}

export function calculateQuantityBreakPricing(
  unitPrice: number,
  quantity: number,
  discountPercent: number,
): {
  originalTotal: number;
  discountedTotal: number;
  saved: number;
  discountedUnitPrice: number;
  originalUnitPrice: number;
} {
  const MONEY_SCALE = 10_000;
  const safeQty = Math.max(1, Math.trunc(Number(quantity) || 1));
  const safeDiscountPercent = Math.max(
    0,
    Math.min(100, Number(discountPercent) || 0),
  );
  const unitPriceScaled = Math.round(Number(unitPrice) * MONEY_SCALE);
  const originalTotalScaled = unitPriceScaled * safeQty;
  const discountedUnitPriceScaled = Math.round(
    unitPriceScaled * (1 - safeDiscountPercent / 100),
  );
  const discountedTotalScaled = Math.round(
    originalTotalScaled * (1 - safeDiscountPercent / 100),
  );
  const originalTotal = Math.round(originalTotalScaled / (MONEY_SCALE / 100)) / 100;
  const discountedTotal =
    Math.round(discountedTotalScaled / (MONEY_SCALE / 100)) / 100;
  const saved = Math.round((originalTotal - discountedTotal) * 100) / 100;
  const discountedUnitPrice =
    Math.round(discountedUnitPriceScaled / (MONEY_SCALE / 100)) / 100;

  return {
    originalTotal,
    discountedTotal,
    saved,
    discountedUnitPrice,
    originalUnitPrice: Number(unitPrice),
  };
}

export function parseFreeGiftSelectedProducts(selectedProductsJson?: string | null): {
  triggerProducts: string[];
  giftProducts: string[];
} {
  if (!selectedProductsJson) {
    return { triggerProducts: [], giftProducts: [] };
  }

  try {
    const parsed = JSON.parse(selectedProductsJson) as {
      triggerProducts?: unknown;
      giftProducts?: unknown;
    };
    return {
      triggerProducts: Array.isArray(parsed.triggerProducts)
        ? parsed.triggerProducts
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [],
      giftProducts: Array.isArray(parsed.giftProducts)
        ? parsed.giftProducts
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [],
    };
  } catch {
    return { triggerProducts: [], giftProducts: [] };
  }
}

export function parseBxgyDiscountRules(discountRulesJson?: string | null): BxgyDiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: BxgyDiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      if ((item as { tierType?: unknown }).tierType === "single") {
        out.push(
          createDefaultSingleBxgyRule({
            id:
              typeof (item as { id?: unknown }).id === "string"
                ? (item as { id: string }).id
                : undefined,
            title: (item as { title?: string }).title || "",
            subtitle: (item as { subtitle?: string }).subtitle || "",
            badge: (item as { badge?: string }).badge || "",
            isDefault: !!(item as { isDefault?: boolean }).isDefault,
          }),
        );
        continue;
      }
      
      const buyQuantity = Number(
        (item as { buyQuantity?: unknown; count?: unknown }).buyQuantity ??
          (item as { count?: unknown }).count,
      );
      const getQuantity = Number((item as { getQuantity?: unknown }).getQuantity);
      const tierType = (item as { tierType?: unknown }).tierType;
      
      const buyProductIds = (item as { buyProductIds?: unknown }).buyProductIds;
      const getProductIds = (item as { getProductIds?: unknown }).getProductIds;
      
      if (!Number.isFinite(buyQuantity) || buyQuantity < 1) continue;
      if (!Number.isFinite(getQuantity) || getQuantity < 1) continue;
      if (!Array.isArray(buyProductIds) || !buyProductIds.length) continue;
      if (!Array.isArray(getProductIds) || !getProductIds.length) continue;
      const normalizedBuyQuantity = Math.trunc(buyQuantity);
      
      out.push({
        id:
          typeof (item as { id?: unknown }).id === "string"
            ? (item as { id: string }).id
            : undefined,
        count: normalizedBuyQuantity,
        buyQuantity: normalizedBuyQuantity,
        getQuantity: Math.trunc(getQuantity),
        buyProductIds: buyProductIds.filter(id => typeof id === "string") as string[],
        getProductIds:
          getProductIds.filter(id => typeof id === "string") as string[],
        // Dedicated BXGY now uses a fixed free reward with one application per order.
        discountPercent: 100,
        maxUsesPerOrder: 1,
        // Legacy dedicated BXGY records may not persist tierType; treat them as BXGY by default.
        tierType: tierType === "simple" ? "simple" : "bxgy",
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
      });
    }
    
    // 按 count 排序，优先匹配数量多的规则
    return normalizeBxgyRules(out);
  } catch {
    return [];
  }
}

export function parseFreeGiftRules(discountRulesJson?: string | null): FreeGiftRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: FreeGiftRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      if ((item as { tierType?: unknown }).tierType === "single") {
        out.push(
          createDefaultSingleFreeGiftRule({
            id:
              typeof (item as { id?: unknown }).id === "string"
                ? (item as { id: string }).id
                : undefined,
            title: (item as { title?: string }).title || "",
            subtitle: (item as { subtitle?: string }).subtitle || "",
            badge: (item as { badge?: string }).badge || "",
            isDefault: !!(item as { isDefault?: boolean }).isDefault,
          }),
        );
        continue;
      }

      const count = Number((item as { count?: unknown }).count);
      const giftQuantity = Number((item as { giftQuantity?: unknown }).giftQuantity);
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(giftQuantity) || giftQuantity < 1) continue;

      out.push({
        id:
          typeof (item as { id?: unknown }).id === "string"
            ? (item as { id: string }).id
            : undefined,
        count: Math.trunc(count),
        giftQuantity: Math.trunc(giftQuantity),
        giftProductIds: Array.isArray((item as { giftProductIds?: unknown }).giftProductIds)
          ? ((item as { giftProductIds: unknown[] }).giftProductIds)
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : [],
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
      });
    }

    return normalizeFreeGiftRules(out);
  } catch {
    return [];
  }
}

/** Build BXGY discount rules JSON for DB storage — deduplicates by count, sorts ascending. */
export function buildBxgyDiscountRulesJson(tiers: BxgyDiscountRule[]): BxgyDiscountRule[] {
  const normalizedTiers = normalizeBxgyRules(tiers);
  const singleRule = normalizedTiers.find((tier) => isSingleBxgyRule(tier));
  const dedupedById = new Map<string, BxgyDiscountRule>();
  for (const tier of normalizedTiers) {
    if (isSingleBxgyRule(tier)) {
      continue;
    }
    const normalizedBuyQuantity = Math.max(
      1,
      Math.trunc(Number(tier.buyQuantity) || Number(tier.count) || 1),
    );
    if (!Number.isFinite(tier.getQuantity) || tier.getQuantity < 1) continue;
    const normalizedTier: BxgyDiscountRule = {
      id: tier.id || buildDraftRuleId("bxgy_rule"),
      count: normalizedBuyQuantity,
      buyQuantity: normalizedBuyQuantity,
      getQuantity: Math.trunc(tier.getQuantity),
      discountPercent: 100,
      maxUsesPerOrder: 1,
      buyProductIds: Array.isArray(tier.buyProductIds)
        ? tier.buyProductIds.filter(id => typeof id === "string")
        : [],
      getProductIds: Array.isArray(tier.getProductIds)
        ? tier.getProductIds.filter(id => typeof id === "string")
        : [],
      tierType: tier.tierType === "simple" ? "simple" : "bxgy",
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
    };
    dedupedById.set(normalizedTier.id || buildDeterministicLegacyId("bxgy-rule", [
      normalizedTier.buyQuantity,
      normalizedTier.getQuantity,
      normalizedTier.buyProductIds,
      normalizedTier.getProductIds,
      normalizedTier.title,
      normalizedTier.subtitle,
      normalizedTier.badge,
    ]), normalizedTier);
  }
  return normalizeBxgyRules([
    ...(singleRule ? [singleRule] : []),
    ...Array.from(dedupedById.values()),
  ]);
}

export function parseDifferentProductsDiscountRules(
  discountRulesJson?: string | null,
): DifferentProductsDiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: DifferentProductsDiscountRule[] = [];
    for (const item of parsed) {
      const tier = sanitizeDifferentProductsTier(item);
      if (tier) out.push(tier);
    }
    return normalizeDifferentProductsDiscountRules(out);
  } catch {
    return [];
  }
}

export function buildDifferentProductsDiscountRulesJson(
  tiers: DifferentProductsDiscountRule[],
): DifferentProductsDiscountRule[] {
  const normalizedTiers = normalizeDifferentProductsDiscountRules(tiers);
  const singleRule = normalizedTiers.find((tier) => isSingleDifferentProductsRule(tier));
  const dedupedById = new Map<string, DifferentProductsDiscountRule>();
  for (const tier of normalizedTiers) {
    if (isSingleDifferentProductsRule(tier)) {
      continue;
    }
    const sanitized = sanitizeDifferentProductsTier(tier);
    if (!sanitized) continue;
    dedupedById.set(
      sanitized.id ||
        buildDeterministicLegacyId("different-products-rule", [
          sanitized.tierType,
          sanitized.count,
          sanitized.buyQuantity,
          sanitized.getQuantity,
          sanitized.buyProductIds,
          sanitized.getProductIds,
          sanitized.discountPercent,
          sanitized.maxUsesPerOrder,
          sanitized.title,
          sanitized.subtitle,
          sanitized.badge,
        ]),
      sanitized,
    );
  }
  return normalizeDifferentProductsDiscountRules([
    ...(singleRule ? [singleRule] : []),
    ...Array.from(dedupedById.values()),
  ]);
}

export function buildFreeGiftRulesJson(tiers: FreeGiftRule[]): FreeGiftRule[] {
  const normalizedTiers = normalizeFreeGiftRules(tiers);
  const singleRule = normalizedTiers.find((tier) => isSingleFreeGiftRule(tier));
  const dedupedById = new Map<string, FreeGiftRule>();
  for (const tier of normalizedTiers) {
    if (isSingleFreeGiftRule(tier)) {
      continue;
    }
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.giftQuantity) || tier.giftQuantity < 1) continue;
    const normalizedTier: FreeGiftRule = {
      id: tier.id || buildDraftRuleId("free_gift_rule"),
      count: Math.trunc(tier.count),
      giftQuantity: Math.trunc(tier.giftQuantity),
      giftProductIds: Array.isArray(tier.giftProductIds)
        ? tier.giftProductIds.filter((id) => typeof id === "string")
        : [],
      tierType: undefined,
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
    };
    dedupedById.set(
      normalizedTier.id ||
        buildDeterministicLegacyId("free-gift-rule", [
          normalizedTier.count,
          normalizedTier.giftQuantity,
          normalizedTier.giftProductIds,
          normalizedTier.title,
          normalizedTier.subtitle,
          normalizedTier.badge,
        ]),
      normalizedTier,
    );
  }
  return normalizeFreeGiftRules([
    ...(singleRule ? [singleRule] : []),
    ...Array.from(dedupedById.values()),
  ]);
}

/** 主题 / 下拉选项展示：优先用显式 title，否则用 option 值拼接（与瘦 metafield 变体省略 title 兼容） */
function completeBundleVariantDisplayTitle(
  explicitTitle: unknown,
  selectedOptions: Array<{ name: string; value: string }>,
): string {
  const t = String(explicitTitle ?? "").trim();
  if (t) return t;
  if (!selectedOptions.length) return "";
  return selectedOptions
    .map((o) => String(o.value ?? "").trim())
    .filter(Boolean)
    .join(" / ");
}

export function parseCompleteBundleConfig(
  selectedProductsJson?: string | null,
): CompleteBundleConfig {
  if (!selectedProductsJson) return { triggerProductIds: [], bars: [] };
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    const parsedRecord = parsed as {
      productIds?: unknown[];
      triggerProductIds?: unknown[];
      bars?: unknown;
    };
    const rawTriggerProductIds = Array.isArray(parsedRecord.triggerProductIds)
      ? parsedRecord.triggerProductIds
      : Array.isArray(parsedRecord.productIds)
        ? parsedRecord.productIds
        : [];
    const triggerProductIds = rawTriggerProductIds
          .map((id) => String(id || "").trim())
          .filter(Boolean);
    const barsInput = parsedRecord.bars;
    if (!Array.isArray(barsInput)) return { triggerProductIds, bars: [] };

    const bars: CompleteBundleBar[] = [];
    for (const rawBar of barsInput) {
      if (!rawBar || typeof rawBar !== "object") continue;
      const id = String((rawBar as { id?: unknown }).id || "").trim();
      if (!id) continue;
      const typeRaw = String((rawBar as { type?: unknown }).type || "quantity-break-same");
      const type: CompleteBundleBar["type"] =
        typeRaw === "single"
          ? "single"
          : "quantity-break-same";
      const quantityNum = Number((rawBar as { quantity?: unknown }).quantity);
      const quantity = Number.isFinite(quantityNum) && quantityNum > 0 ? Math.trunc(quantityNum) : 1;
      const minQuantityRaw = Number((rawBar as { minQuantity?: unknown }).minQuantity);
      const minQuantity =
        Number.isFinite(minQuantityRaw) && minQuantityRaw > 0
          ? Math.trunc(minQuantityRaw)
          : 1;
      const maxQuantityRaw = Number((rawBar as { maxQuantity?: unknown }).maxQuantity);
      const maxQuantityCandidate =
        Number.isFinite(maxQuantityRaw) && maxQuantityRaw > 0
          ? Math.trunc(maxQuantityRaw)
          : quantity;
      const maxQuantity = Math.max(minQuantity, maxQuantityCandidate);
      const excludeTriggerProduct =
        (rawBar as { excludeTriggerProduct?: unknown }).excludeTriggerProduct !== false;

      const pricingRaw = (rawBar as { pricing?: unknown }).pricing;
      const modeRaw = String((pricingRaw as { mode?: unknown })?.mode || "full_price");
      const mode: CompleteBundlePricingMode = (
        ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
      ).includes(modeRaw as CompleteBundlePricingMode)
        ? (modeRaw as CompleteBundlePricingMode)
        : "full_price";
      const valueRaw = Number((pricingRaw as { value?: unknown })?.value);
      const value = Number.isFinite(valueRaw) ? valueRaw : 0;

      const productsRaw = (rawBar as { products?: unknown }).products;
      const products: CompleteBundleProduct[] = Array.isArray(productsRaw)
        ? productsRaw
            .filter((p) => p && typeof p === "object")
            .map((p) => {
              const productId = String((p as { productId?: unknown }).productId || "").trim();
              const variantsRaw = (p as { variants?: unknown }).variants;
              const productPricingRaw = (p as { pricing?: unknown }).pricing;
              const pModeRaw = String((productPricingRaw as { mode?: unknown })?.mode || "");
              const pMode: CompleteBundlePricingMode = (
                ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
              ).includes(pModeRaw as CompleteBundlePricingMode)
                ? (pModeRaw as CompleteBundlePricingMode)
                : "full_price";
              const pValueRaw = Number((productPricingRaw as { value?: unknown })?.value);
              const pValue = Number.isFinite(pValueRaw) ? pValueRaw : 0;
              return {
                productId,
                handle: String((p as { handle?: unknown }).handle || ""),
                title: String((p as { title?: unknown }).title || ""),
                image: String((p as { image?: unknown }).image || ""),
                price: String((p as { price?: unknown }).price || ""),
                defaultVariantId: String((p as { defaultVariantId?: unknown }).defaultVariantId || ""),
                selectedVariantId: String((p as { selectedVariantId?: unknown }).selectedVariantId || ""),
                selectionMode: (
                  String((p as { selectionMode?: unknown }).selectionMode || "") === "variant"
                    ? "variant"
                    : "product"
                ) as "product" | "variant",
                selectedOptions:
                  (p as { selectedOptions?: unknown }).selectedOptions &&
                  typeof (p as { selectedOptions?: unknown }).selectedOptions === "object"
                    ? ((p as { selectedOptions?: Record<string, string> }).selectedOptions || {})
                    : {},
                pricing: { mode: pMode, value: pValue },
                variants: Array.isArray(variantsRaw)
                  ? variantsRaw
                      .filter((v) => v && typeof v === "object")
                      .map((v) => {
                        const selectedOptions = Array.isArray(
                          (v as { selectedOptions?: unknown }).selectedOptions,
                        )
                          ? (
                              (v as { selectedOptions?: Array<{ name?: unknown; value?: unknown }> })
                                .selectedOptions || []
                            ).map((opt) => ({
                              name: String(opt.name || ""),
                              value: String(opt.value || ""),
                            }))
                          : [];
                        return {
                          id: String((v as { id?: unknown }).id || ""),
                          title: completeBundleVariantDisplayTitle(
                            (v as { title?: unknown }).title,
                            selectedOptions,
                          ),
                          price: String((v as { price?: unknown }).price || ""),
                          selectedOptions,
                        };
                      })
                  : [],
              };
            })
            .filter((p) => p.productId)
        : [];

      // 兼容旧数据：仅有 bar 级 pricing、商品未单独配置时，把 bar 的定价合并到第一件商品
      const allProductsDefaultPricing = products.every(
        (p) => p.pricing?.mode === "full_price" && (p.pricing?.value ?? 0) === 0,
      );
      if (products.length && allProductsDefaultPricing && (mode !== "full_price" || value !== 0)) {
        products[0] = { ...products[0], pricing: { mode, value } };
      }

      bars.push(
        type === "single"
          ? createDefaultCompleteBundleSingleBar({
              id,
              title: String((rawBar as { title?: unknown }).title || ""),
              subtitle: String((rawBar as { subtitle?: unknown }).subtitle || ""),
              badge: String((rawBar as { badge?: unknown }).badge || ""),
              isDefault: !!(rawBar as { isDefault?: unknown }).isDefault,
            })
          : {
              id,
              type,
              title: String((rawBar as { title?: unknown }).title || ""),
              subtitle: String((rawBar as { subtitle?: unknown }).subtitle || ""),
              badge: String((rawBar as { badge?: unknown }).badge || ""),
              isDefault: !!(rawBar as { isDefault?: unknown }).isDefault,
              minQuantity,
              maxQuantity,
              excludeTriggerProduct,
              quantity,
              pricing: { mode, value },
              products,
            },
      );
    }
    return { triggerProductIds, bars: normalizeCompleteBundleBars(bars) };
  } catch {
    return { triggerProductIds: [], bars: [] };
  }
}

export function buildCompleteBundleConfig(
  config: CompleteBundleConfig,
): CompleteBundleConfig {
  const bars = Array.isArray(config?.bars) ? config.bars : [];
  return {
    triggerProductIds: Array.isArray(config?.triggerProductIds)
      ? config.triggerProductIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [],
    bars: normalizeCompleteBundleBars(
      bars
        .filter((bar) => bar && typeof bar === "object" && String(bar.id || "").trim())
        .map((bar) => ({
          id: String(bar.id).trim(),
          type:
            bar.type === "single"
              ? "single"
              : "quantity-break-same",
          title: String(bar.title || ""),
          subtitle: String(bar.subtitle || ""),
          badge: String(bar.badge || ""),
          isDefault: !!bar.isDefault,
          minQuantity: Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
          maxQuantity: Math.max(
            Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
            Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
          ),
          excludeTriggerProduct: bar.excludeTriggerProduct !== false,
          quantity: Math.max(
            Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
            Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
          ),
          pricing: {
            mode: (
              ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
            ).includes(bar.pricing?.mode as CompleteBundlePricingMode)
              ? (bar.pricing.mode as CompleteBundlePricingMode)
              : "full_price",
            value: Number.isFinite(Number(bar.pricing?.value)) ? Number(bar.pricing?.value) : 0,
          },
          products: Array.isArray(bar.products)
            ? bar.products
                .filter((p) => p && typeof p === "object" && String(p.productId || "").trim())
                .map((p) => ({
                  productId: String(p.productId).trim(),
                  // 保留选中变体 ID，确保 storefront 仍可直接 /cart/add
                  selectedVariantId: String(p.selectedVariantId || ""),
                  selectionMode: p.selectionMode === "variant" ? "variant" : "product",
                  // 仅保留运行必需字段，展示数据统一按 productId 动态补全
                  pricing: (() => {
                    const pmRaw = String(p.pricing?.mode || "full_price");
                    const pm: CompleteBundlePricingMode = (
                      ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
                    ).includes(pmRaw as CompleteBundlePricingMode)
                      ? (pmRaw as CompleteBundlePricingMode)
                      : "full_price";
                    const pv = Number.isFinite(Number(p.pricing?.value))
                      ? Number(p.pricing?.value)
                      : 0;
                    return { mode: pm, value: pv };
                  })(),
                }))
            : [],
        })),
    ),
  };
}

function normalizeCompleteBundlePricingModeForFn(raw: unknown): CompleteBundlePricingMode {
  const m = String(raw || "full_price");
  if (
    m === "full_price" ||
    m === "percentage_off" ||
    m === "amount_off" ||
    m === "fixed_price"
  ) {
    return m;
  }
  return "full_price";
}

/**
 * Shopify Function 输入专用：裁剪 `selectedProductsJson`，去掉主题/预览用的大字段，
 * 降低 shop `ciwi-bundle-offers-fn` 与 automatic discount owner 瘦配置的 UTF-8 体积。
 * 不修改数据库中的原始 JSON，仅在 metafield 同步路径使用。
 */
export function trimSelectedProductsJsonForFunction(
  offerType: string,
  selectedProductsJson: string | null,
): string | null {
  if (selectedProductsJson == null || !String(selectedProductsJson).trim()) {
    return null;
  }
  const raw = String(selectedProductsJson);

  const finish = (next: string): string | null => {
    const t = next.trim();
    return t === "" ? null : t;
  };

  try {
    return trimSelectedProductsJsonForFunctionByOfferType(offerType, raw, finish);
  } catch {
    return finish(raw);
  }
}

export type FunctionDiscountClass = "PRODUCT" | "ORDER" | "SHIPPING";

export function trimOfferSettingsJsonForFunction(
  offerSettingsJson?: string | null,
): string | null {
  if (offerSettingsJson == null || !String(offerSettingsJson).trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(String(offerSettingsJson)) as {
      markets?: unknown;
      customerSegments?: unknown;
      customerProfileFilters?: unknown;
      ipCountryCodes?: unknown;
      couponEnabled?: unknown;
      couponCode?: unknown;
      quantity?: unknown;
      showQuantityBar?: unknown;
    };

    const next: Record<string, unknown> = {};
    if (typeof parsed.markets === "string" && parsed.markets.trim() && parsed.markets.trim() !== "all") {
      next.markets = parsed.markets.trim();
    }
    if (typeof parsed.customerSegments === "string" && parsed.customerSegments.trim()) {
      next.customerSegments = parsed.customerSegments.trim();
    }
    if (
      typeof parsed.customerProfileFilters === "string" &&
      parsed.customerProfileFilters.trim()
    ) {
      next.customerProfileFilters = parsed.customerProfileFilters.trim();
    }
    if (typeof parsed.ipCountryCodes === "string" && parsed.ipCountryCodes.trim()) {
      next.ipCountryCodes = parsed.ipCountryCodes.trim();
    }
    if (parsed.couponEnabled === true) {
      next.couponEnabled = true;
      if (typeof parsed.couponCode === "string" && parsed.couponCode.trim()) {
        next.couponCode = parsed.couponCode.trim();
      }
    }
    if (parsed.quantity === false) {
      next.quantity = false;
    }
    if (parsed.showQuantityBar === false) {
      next.showQuantityBar = false;
    }

    return JSON.stringify(next);
  } catch {
    return String(offerSettingsJson).trim() || null;
  }
}

const DISCOUNT_RULES_DISPLAY_ONLY_KEYS = new Set([
  "title",
  "subtitle",
  "titleSource",
  "subtitleSource",
  "badge",
  "isDefault",
  "offerKind",
  "id",
]);

export function trimDiscountRulesJsonForFunction(
  discountRulesJson?: string | null,
): string | null {
  if (discountRulesJson == null || !String(discountRulesJson).trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(String(discountRulesJson)) as unknown;
    if (!Array.isArray(parsed)) return String(discountRulesJson).trim() || null;
    const trimmed = parsed.map((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const r = item as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        if (!DISCOUNT_RULES_DISPLAY_ONLY_KEYS.has(k)) out[k] = v;
      }
      return out;
    });
    return JSON.stringify(trimmed);
  } catch {
    return String(discountRulesJson).trim() || null;
  }
}

export function resolveFunctionDiscountClassesForOffer(params: {
  offerType?: string | null;
  discountRulesJson?: string | null;
}): FunctionDiscountClass[] {
  const offerType = String(params.offerType || "").trim();
  const classes = new Set<FunctionDiscountClass>();

  if (
    offerType === "bxgy" ||
    offerType === "quantity-breaks-different" ||
    offerType === "subscription"
  ) {
    classes.add("PRODUCT");
  }

  if (offerType === "free-gift") {
    classes.add("ORDER");
  }

  if (offerType === "complete-bundle") {
    classes.add("PRODUCT");
  }

  const normalizedRules = parseDiscountRules(params.discountRulesJson);
  for (const rule of normalizedRules) {
    if (rule.tierType === "single") continue;
    if (rule.rewardType === "free_shipping" || rule.discountClass === "shipping") {
      classes.add("SHIPPING");
      continue;
    }
    if (rule.rewardType === "gift_product" || rule.discountClass === "order") {
      classes.add("ORDER");
      continue;
    }
    classes.add("PRODUCT");
  }

  if (classes.size === 0) {
    classes.add("PRODUCT");
  }

  return Array.from(classes);
}

type OfferTypeSelectedProductsPayloadParams = {
  offerType: string;
  selectedProductsData: unknown;
  selectedProductIds: string[];
  differentProductsSharedPoolProductIds: string[];
  buyProducts: string[];
  completeBundleBars: unknown[];
  freeGiftTriggerProducts: string[];
  freeGiftSharedGiftProductIds: string[];
};

type OfferTypeDiscountRulesPayloadParams = {
  offerType: string;
  quantityRulesPayload: unknown;
  differentProductsRulesPayload: unknown;
  bxgyRulesPayload: unknown;
  freeGiftRulesPayload: unknown;
};

type OfferTypePayloadStrategy = {
  buildSelectedProductsPayload: (
    params: OfferTypeSelectedProductsPayloadParams,
  ) => unknown;
  buildDiscountRulesPayload: (
    params: OfferTypeDiscountRulesPayloadParams,
  ) => unknown;
  trimSelectedProductsJsonForFunction: (
    raw: string,
    finish: (next: string) => string | null,
  ) => string | null;
};

const DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY: OfferTypePayloadStrategy = {
  buildSelectedProductsPayload: ({ selectedProductsData }) => selectedProductsData,
  buildDiscountRulesPayload: ({ quantityRulesPayload }) => quantityRulesPayload,
  trimSelectedProductsJsonForFunction: (raw, finish) => {
    const ids = parseSelectedProductIds(raw);
    if (ids.length) {
      return finish(JSON.stringify({ productIds: ids }));
    }
    return finish(raw);
  },
};

const OFFER_TYPE_PAYLOAD_STRATEGIES: Record<string, OfferTypePayloadStrategy> = {
  "quantity-breaks-different": {
    buildSelectedProductsPayload: ({ selectedProductIds, differentProductsSharedPoolProductIds }) => ({
      productIds:
        differentProductsSharedPoolProductIds.length > 0
          ? differentProductsSharedPoolProductIds
          : selectedProductIds,
    }),
    buildDiscountRulesPayload: ({ differentProductsRulesPayload }) =>
      differentProductsRulesPayload,
    trimSelectedProductsJsonForFunction: DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY.trimSelectedProductsJsonForFunction,
  },
  bxgy: {
    buildSelectedProductsPayload: ({ buyProducts }) => ({
      buyProducts,
    }),
    buildDiscountRulesPayload: ({ bxgyRulesPayload }) => bxgyRulesPayload,
    trimSelectedProductsJsonForFunction: (raw, finish) => {
      const parsed = JSON.parse(raw) as { buyProducts?: unknown; getProducts?: unknown };
      const buyProducts = Array.isArray(parsed.buyProducts)
        ? parsed.buyProducts.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      const getProducts = Array.isArray(parsed.getProducts)
        ? parsed.getProducts.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      return finish(JSON.stringify({ buyProducts, getProducts }));
    },
  },
  "complete-bundle": {
    buildSelectedProductsPayload: ({ selectedProductIds, completeBundleBars }) => ({
      productIds: selectedProductIds,
      bars: completeBundleBars,
    }),
    buildDiscountRulesPayload: ({ quantityRulesPayload }) => quantityRulesPayload,
    trimSelectedProductsJsonForFunction: (raw, finish) => {
      const cfg = parseCompleteBundleConfig(raw);
      if (!cfg.bars.length) {
        return finish(raw);
      }

      const bars = cfg.bars
        .map((bar) => {
          const id = String(bar.id || "").trim();
          if (!id) return null;

          const minQuantity = Math.max(1, Math.trunc(Number(bar.minQuantity) || 1));
          const maxQuantity = Math.max(
            minQuantity,
            Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
          );
          const quantity = Math.max(
            minQuantity,
            Math.trunc(Number(bar.quantity) || maxQuantity || 1),
          );

          const mode = normalizeCompleteBundlePricingModeForFn(bar.pricing?.mode);
          const value = Number.isFinite(Number(bar.pricing?.value))
            ? Number(bar.pricing?.value)
            : 0;

          const products = (Array.isArray(bar.products) ? bar.products : [])
            .map((p) => {
              const productId = String(p.productId || "").trim();
              if (!productId) return null;
              const pm = normalizeCompleteBundlePricingModeForFn(p.pricing?.mode);
              const pv = Number.isFinite(Number(p.pricing?.value))
                ? Number(p.pricing?.value)
                : 0;
              return {
                productId,
                selectedVariantId: String(p.selectedVariantId || ""),
                selectionMode: p.selectionMode === "variant" ? "variant" : "product",
                pricing: { mode: pm, value: pv },
              };
            })
            .filter(
              (
                row,
              ): row is {
                productId: string;
                selectedVariantId: string;
                selectionMode: "product" | "variant";
                pricing: { mode: CompleteBundlePricingMode; value: number };
              } => row !== null,
            );

          return {
            id,
            minQuantity,
            maxQuantity,
            quantity,
            excludeTriggerProduct: bar.excludeTriggerProduct !== false,
            pricing: { mode, value },
            products,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (!bars.length) {
        return finish(raw);
      }

      const productIds = (Array.isArray(cfg.triggerProductIds) ? cfg.triggerProductIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean);

      return finish(JSON.stringify({ productIds, bars }));
    },
  },
  subscription: {
    buildSelectedProductsPayload: ({ selectedProductsData }) => selectedProductsData,
    buildDiscountRulesPayload: () => [],
    trimSelectedProductsJsonForFunction:
      DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY.trimSelectedProductsJsonForFunction,
  },
  "free-gift": {
    buildSelectedProductsPayload: ({
      freeGiftTriggerProducts,
      freeGiftSharedGiftProductIds,
    }) => ({
      triggerProducts: freeGiftTriggerProducts,
      giftProducts: freeGiftSharedGiftProductIds,
    }),
    buildDiscountRulesPayload: ({ freeGiftRulesPayload }) => freeGiftRulesPayload,
    trimSelectedProductsJsonForFunction: (raw, finish) => {
      const { triggerProducts, giftProducts } = parseFreeGiftSelectedProducts(raw);
      return finish(JSON.stringify({ triggerProducts, giftProducts }));
    },
  },
};

function getOfferTypePayloadStrategy(offerType: string): OfferTypePayloadStrategy {
  return OFFER_TYPE_PAYLOAD_STRATEGIES[offerType] || DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY;
}

export function buildSelectedProductsPayloadForOfferType(
  params: OfferTypeSelectedProductsPayloadParams,
): unknown {
  return getOfferTypePayloadStrategy(params.offerType).buildSelectedProductsPayload(params);
}

export function buildDiscountRulesPayloadForOfferType(
  params: OfferTypeDiscountRulesPayloadParams,
): unknown {
  return getOfferTypePayloadStrategy(params.offerType).buildDiscountRulesPayload(params);
}

function trimSelectedProductsJsonForFunctionByOfferType(
  offerType: string,
  raw: string,
  finish: (next: string) => string | null,
): string | null {
  return getOfferTypePayloadStrategy(offerType).trimSelectedProductsJsonForFunction(
    raw,
    finish,
  );
}
