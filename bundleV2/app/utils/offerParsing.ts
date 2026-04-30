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

/** 阶梯赠品（Progressive gifts）— 嵌套在 offerSettingsJson.progressiveGifts */
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
  productBundleEnabled: boolean;
  productBundleTitle: string;
  productBundleSubtitle: string;
  productBundleMinQuantity: number;
  productBundleProductIds: string[];
  subscriptionEnabled: boolean;
  subscriptionPosition: "below-bundle-bars";
  subscriptionTitle: string;
  subscriptionSubtitle: string;
  oneTimeTitle: string;
  oneTimeSubtitle: string;
  subscriptionDefaultSelected: boolean;
  compositionBarOrder?: string[];
  scheduleTimezone?: string;
  checkboxUpsellsEnabled: boolean;
  stickyAddToCartEnabled: boolean;
  progressiveGifts: ProgressiveGiftsConfig;
};

export function parseOfferSettings(offerSettingsJson?: string | null): OfferSettings {
  if (!offerSettingsJson) {
    return {
      title: "Bundle & Save",
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
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
      productBundleEnabled: false,
      productBundleTitle: "Build your bundle",
      productBundleSubtitle: "Choose products to unlock the bundle offer",
      productBundleMinQuantity: 2,
      productBundleProductIds: [],
      subscriptionEnabled: false,
      subscriptionPosition: "below-bundle-bars",
      subscriptionTitle: "Subscribe & Save 20%",
      subscriptionSubtitle: "Delivered weekly",
      oneTimeTitle: "One-time purchase",
      oneTimeSubtitle: "",
      subscriptionDefaultSelected: true,
      scheduleTimezone: undefined,
      checkboxUpsellsEnabled: false,
      stickyAddToCartEnabled: false,
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
      customerSegments:
        parsed.customerSegments !== undefined ? parsed.customerSegments ?? null : null,
      markets: parsed.markets !== undefined ? parsed.markets ?? null : null,
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
      subscriptionPosition: "below-bundle-bars",
      subscriptionTitle: parsed.subscriptionTitle || "Subscribe & Save 20%",
      subscriptionSubtitle: parsed.subscriptionSubtitle || "Delivered weekly",
      oneTimeTitle: parsed.oneTimeTitle || "One-time purchase",
      oneTimeSubtitle: parsed.oneTimeSubtitle || "",
      subscriptionDefaultSelected: parsed.subscriptionDefaultSelected !== false,
      compositionBarOrder: Array.isArray(parsed.compositionBarOrder)
        ? parsed.compositionBarOrder
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : undefined,
      scheduleTimezone: parsed.scheduleTimezone,
      productBundleEnabled: parsed.productBundleEnabled === true,
      productBundleTitle:
        typeof parsed.productBundleTitle === "string" && parsed.productBundleTitle
          ? parsed.productBundleTitle
          : "Build your bundle",
      productBundleSubtitle:
        typeof parsed.productBundleSubtitle === "string"
          ? parsed.productBundleSubtitle
          : "Choose products to unlock the bundle offer",
      productBundleMinQuantity: clampNumber(parsed.productBundleMinQuantity, 1, 20, 2),
      productBundleProductIds: Array.isArray(parsed.productBundleProductIds)
        ? parsed.productBundleProductIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [],
      checkboxUpsellsEnabled: parsed.checkboxUpsellsEnabled === true,
      stickyAddToCartEnabled: parsed.stickyAddToCartEnabled === true,
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
  count: number;
  discountPercent: number;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  maxUsesPerOrder: number;
  tierType: "bxgy" | "simple";
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

export type CampaignScope = {
  productIds: string[];
  markets: string[];
  customerSegments: string[];
};

export type QuantityBreakTier = {
  qty: number;
  discountPercent: number;
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
  stickyAddToCartEnabled: boolean;
};

export type CampaignConfig = {
  version: 1;
  scope: CampaignScope;
  logicBlocks: LogicBlock[];
  displayBlocks: DisplayBlock[];
  settings: CampaignSettings;
};

export type BxgyDiscountRule = {
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxUsesPerOrder: number;
  /** Count threshold: promotion triggers when cart has this many items in buyProductIds */
  count: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

export type FreeGiftRule = {
  count: number;
  giftQuantity: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

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
  type: "quantity-break-same" | "bxgy";
  title?: string;
  subtitle?: string;
  quantity: number;
  products: CompleteBundleProduct[];
  pricing: {
    mode: CompleteBundlePricingMode;
    value: number;
  };
};

export type CompleteBundleConfig = {
  bars: CompleteBundleBar[];
};

export type CompleteBundleLogicBlock = {
  id: string;
  type: "complete-bundle";
  config: CompleteBundleConfig;
};

export type SubscriptionLogicBlock = {
  id: string;
  type: "subscription";
  config: {
    enabled: boolean;
    position: "below-bundle-bars";
    title: string;
    subtitle: string;
    oneTimeTitle: string;
    oneTimeSubtitle: string;
    defaultSelected: boolean;
    productIds: string[];
  };
};

export type ProductBundleLogicBlock = {
  id: string;
  type: "product-bundle";
  config: {
    enabled: boolean;
    title: string;
    subtitle: string;
    minQuantity: number;
    productIds: string[];
  };
};

export type LogicBlock =
  | QuantityBreaksLogicBlock
  | QuantityBreaksDifferentLogicBlock
  | BxgyLogicBlock
  | FreeGiftLogicBlock
  | CompleteBundleLogicBlock
  | SubscriptionLogicBlock
  | ProductBundleLogicBlock;
export type DisplayBlock = OfferCardDisplayBlock | CountdownDisplayBlock;

export function parseDiscountRules(discountRulesJson?: string | null): DiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: DiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      out.push({
        id:
          typeof (item as { id?: unknown }).id === "string"
            ? (item as { id: string }).id
            : undefined,
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
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
        conditionType:
          (item as { conditionType?: unknown }).conditionType === "cart_amount"
            ? "cart_amount"
            : "item_quantity",
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
        buyQuantity: Number.isFinite(
          Number((item as { buyQuantity?: unknown }).buyQuantity),
        )
          ? Math.max(1, Math.trunc(Number((item as { buyQuantity?: unknown }).buyQuantity)))
          : undefined,
        getQuantity: Number.isFinite(
          Number((item as { getQuantity?: unknown }).getQuantity),
        )
          ? Math.max(1, Math.trunc(Number((item as { getQuantity?: unknown }).getQuantity)))
          : undefined,
        maxUsesPerOrder: Number.isFinite(
          Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder),
        )
          ? Math.max(
              1,
              Math.trunc(Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder)),
            )
          : undefined,
      });
    }
    out.sort((a, b) => a.count - b.count);
    return out;
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
  const qty = Math.trunc(Number(item.qty));
  const discountPercent = Number(item.discountPercent);
  if (!Number.isFinite(qty) || qty < 1) return null;
  if (!Number.isFinite(discountPercent)) return null;
  return {
    qty,
    discountPercent: Math.max(0, Math.min(100, discountPercent)),
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
  const count = Math.trunc(Number(item.count));
  const buyQuantity = Math.trunc(Number(item.buyQuantity));
  const getQuantity = Math.trunc(Number(item.getQuantity));
  const discountPercent = Number(item.discountPercent);
  const maxUsesPerOrder = Math.trunc(Number(item.maxUsesPerOrder ?? 1));
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
  if (buyProductIds.length === 0 || getProductIds.length === 0) return null;

  return {
    count,
    buyQuantity,
    getQuantity,
    buyProductIds,
    getProductIds,
    discountPercent: Math.max(0, Math.min(100, discountPercent)),
    maxUsesPerOrder: Number.isFinite(maxUsesPerOrder) && maxUsesPerOrder > 0 ? maxUsesPerOrder : 1,
    title: typeof item.title === "string" ? item.title : "",
    subtitle: typeof item.subtitle === "string" ? item.subtitle : "",
    badge: typeof item.badge === "string" ? item.badge : "",
    isDefault: !!item.isDefault,
  };
}

function sanitizeDifferentProductsTier(
  raw: unknown,
): DifferentProductsDiscountRule | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const count = Math.trunc(Number(item.count));
  const buyQuantity = Math.trunc(Number(item.buyQuantity ?? 1));
  const getQuantity = Math.trunc(Number(item.getQuantity ?? 0));
  const discountPercent = Number(item.discountPercent);
  const maxUsesPerOrder = Math.trunc(Number(item.maxUsesPerOrder ?? 1));
  const buyProductIds = Array.isArray(item.buyProductIds)
    ? item.buyProductIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const getProductIds = Array.isArray(item.getProductIds)
    ? item.getProductIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  const tierType = item.tierType === "bxgy" ? "bxgy" : "simple";

  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(buyQuantity) || buyQuantity < 1) return null;
  if (!Number.isFinite(discountPercent)) return null;
  if (buyProductIds.length === 0) return null;
  if (tierType === "bxgy") {
    if (!Number.isFinite(getQuantity) || getQuantity < 1) return null;
    if (getProductIds.length === 0) return null;
  }

  return {
    count,
    discountPercent: Math.max(0, Math.min(100, discountPercent)),
    buyQuantity,
    getQuantity: tierType === "bxgy" ? getQuantity : 0,
    buyProductIds,
    getProductIds: tierType === "bxgy" ? getProductIds : [],
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
  const count = Math.trunc(Number(item.count));
  const giftQuantity = Math.trunc(Number(item.giftQuantity));
  if (!Number.isFinite(count) || count < 1) return null;
  if (!Number.isFinite(giftQuantity) || giftQuantity < 1) return null;

  return {
    count,
    giftQuantity,
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
    position: "below-bundle-bars",
    title: sanitizeSingleLineText(item.title, 60, "Subscribe & Save 20%"),
    subtitle: sanitizeSingleLineText(item.subtitle, 60, "Delivered weekly"),
    oneTimeTitle: sanitizeSingleLineText(item.oneTimeTitle, 60, "One-time purchase"),
    oneTimeSubtitle: sanitizeSingleLineText(item.oneTimeSubtitle, 60, ""),
    defaultSelected: item.defaultSelected !== false,
    productIds,
  };
}

function sanitizeProductBundleLogicConfig(
  raw: unknown,
): ProductBundleLogicBlock["config"] | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const productIds = Array.isArray(item.productIds)
    ? item.productIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  return {
    enabled: item.enabled !== false,
    title: sanitizeSingleLineText(item.title, 60, "Build your bundle"),
    subtitle: sanitizeSingleLineText(
      item.subtitle,
      80,
      "Choose products to unlock the bundle offer",
    ),
    minQuantity: clampNumber(item.minQuantity, 1, 20, 2),
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
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.qty === tier.qty));

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
      .filter(
        (tier, index, arr) =>
          index === arr.findIndex((it) => it.count === tier.count),
      );

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
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.count === tier.count));

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
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.count === tier.count));

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
    const config = buildCompleteBundleConfig(
      parseCompleteBundleConfig(JSON.stringify({ bars: configRecord.bars || [] })),
    );
    if (config.bars.length === 0) return null;
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

  if (item.type === "product-bundle") {
    const config = sanitizeProductBundleLogicConfig(configRecord);
    if (!config) return null;
    return {
      id:
        typeof item.id === "string" && item.id ? item.id : "logic-product-bundle",
      type: "product-bundle",
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
      .filter((block): block is LogicBlock => block !== null);
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
          ? scopeRaw.productIds
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : [],
        markets: Array.isArray(scopeRaw.markets)
          ? scopeRaw.markets
              .map((market) => String(market || "").trim())
              .filter(Boolean)
          : ["all"],
        customerSegments: Array.isArray(scopeRaw.customerSegments)
          ? scopeRaw.customerSegments
              .map((segment) => String(segment || "").trim())
              .filter(Boolean)
          : ["all"],
      },
      logicBlocks,
      displayBlocks,
      settings: {
        status: settingsRaw.status !== false,
        startTime:
          typeof settingsRaw.startTime === "string" ? settingsRaw.startTime : "",
        endTime: typeof settingsRaw.endTime === "string" ? settingsRaw.endTime : "",
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
        stickyAddToCartEnabled: settingsRaw.stickyAddToCartEnabled === true,
      },
    };
  } catch {
    return null;
  }
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
    qty: rule.count,
    discountPercent: rule.discountPercent,
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
  }));
  const productIds = parseSelectedProductIds(params.selectedProductsJson);
  const logicBlockId = "logic-quantity-breaks";
  const settings = {
    status: params.status !== false,
    startTime:
      params.startTime instanceof Date
        ? params.startTime.toISOString()
        : String(params.startTime || ""),
    endTime:
      params.endTime instanceof Date
        ? params.endTime.toISOString()
        : String(params.endTime || ""),
    scheduleTimezone: offerSettings.scheduleTimezone,
    totalBudget: offerSettings.totalBudget,
    dailyBudget: offerSettings.dailyBudget,
    usageLimitPerCustomer: offerSettings.usageLimitPerCustomer,
    compositionBarOrder: offerSettings.compositionBarOrder,
    checkboxUpsellsEnabled: offerSettings.checkboxUpsellsEnabled,
    stickyAddToCartEnabled: offerSettings.stickyAddToCartEnabled,
  };
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
    const getProducts = Array.isArray(bxgySelectedProducts.getProducts)
      ? bxgySelectedProducts.getProducts.map((id) => String(id || "").trim()).filter(Boolean)
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
              getProductIds: getProducts,
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
        productIds: Array.from(new Set([...buyProducts, ...getProducts])),
        markets: offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
        customerSegments: offerSettings.customerSegments
          ? offerSettings.customerSegments.split(",")
          : ["all"],
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
        markets: offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
        customerSegments: offerSettings.customerSegments
          ? offerSettings.customerSegments.split(",")
          : ["all"],
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
        productIds: Array.from(new Set([...triggerProducts, ...giftProducts])),
        markets: offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
        customerSegments: offerSettings.customerSegments
          ? offerSettings.customerSegments.split(",")
          : ["all"],
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
        productIds: Array.from(
          new Set(
            completeBundleConfig.bars.flatMap((bar) =>
              bar.products.map((product) => product.productId),
            ),
          ),
        ),
        markets: offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
        customerSegments: offerSettings.customerSegments
          ? offerSettings.customerSegments.split(",")
          : ["all"],
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
        markets: offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
        customerSegments: offerSettings.customerSegments
          ? offerSettings.customerSegments.split(",")
          : ["all"],
      },
      logicBlocks: [
        {
          id: "logic-subscription",
          type: "subscription",
          config: {
            enabled: offerSettings.subscriptionEnabled,
            position: offerSettings.subscriptionPosition,
            title: offerSettings.subscriptionTitle,
            subtitle: offerSettings.subscriptionSubtitle,
            oneTimeTitle: offerSettings.oneTimeTitle,
            oneTimeSubtitle: offerSettings.oneTimeSubtitle,
            defaultSelected: offerSettings.subscriptionDefaultSelected,
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

  const productBundleLogicBlock =
    offerSettings.productBundleEnabled && offerSettings.productBundleProductIds.length > 0
      ? [
          {
            id: "logic-product-bundle",
            type: "product-bundle" as const,
            config: {
              enabled: true,
              title: offerSettings.productBundleTitle,
              subtitle: offerSettings.productBundleSubtitle,
              minQuantity: offerSettings.productBundleMinQuantity,
              productIds: offerSettings.productBundleProductIds,
            },
          },
        ]
      : [];

  return {
    version: 1,
    scope: {
      productIds,
      markets: offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
      customerSegments: offerSettings.customerSegments
        ? offerSettings.customerSegments.split(",")
        : ["all"],
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
      ...productBundleLogicBlock,
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

export function buildLegacyFieldsFromCampaignConfig(config: CampaignConfig): {
  offerType: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string;
} {
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
  const productBundle = config.logicBlocks.find(
    (block): block is ProductBundleLogicBlock => block.type === "product-bundle",
  );
  const offerCard = config.displayBlocks.find(
    (block): block is OfferCardDisplayBlock => block.type === "offer-card",
  );

  const discountRules = (quantityBreaks?.config.tiers ?? []).map((tier) => ({
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
  const bxgyRules = buildBxgyDiscountRulesJson(bxgy?.config.tiers ?? []);
  const differentProductsRules = buildDifferentProductsDiscountRulesJson(
    quantityBreaksDifferent?.config.tiers ?? [],
  );
  const bxgyBuyProducts = Array.from(
    new Set(bxgyRules.flatMap((tier) => tier.buyProductIds)),
  );
  const bxgyGetProducts = Array.from(
    new Set(bxgyRules.flatMap((tier) => tier.getProductIds)),
  );
  const freeGiftRules = buildFreeGiftRulesJson(freeGift?.config.tiers ?? []);
  const completeBundleConfig = completeBundle
    ? buildCompleteBundleConfig(completeBundle.config)
    : { bars: [] };

  const offerSettings = {
    title: offerCard?.config.title || "Bundle & Save",
    layoutFormat: offerCard?.config.layoutFormat || "vertical",
    totalBudget: config.settings.totalBudget,
    dailyBudget: config.settings.dailyBudget,
    customerSegments: config.scope.customerSegments.length
      ? config.scope.customerSegments.join(",")
      : null,
    markets: config.scope.markets.length ? config.scope.markets.join(",") : null,
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
    productBundleEnabled: productBundle?.config.enabled ?? false,
    productBundleTitle: productBundle?.config.title ?? "Build your bundle",
    productBundleSubtitle:
      productBundle?.config.subtitle ?? "Choose products to unlock the bundle offer",
    productBundleMinQuantity: productBundle?.config.minQuantity ?? 2,
    productBundleProductIds: productBundle?.config.productIds ?? [],
    subscriptionEnabled: subscription?.config.enabled ?? false,
    subscriptionPosition: subscription?.config.position ?? "below-bundle-bars",
    subscriptionTitle: subscription?.config.title ?? "Subscribe & Save 20%",
    subscriptionSubtitle: subscription?.config.subtitle ?? "Delivered weekly",
    oneTimeTitle: subscription?.config.oneTimeTitle ?? "One-time purchase",
    oneTimeSubtitle: subscription?.config.oneTimeSubtitle ?? "",
    subscriptionDefaultSelected: subscription?.config.defaultSelected ?? true,
    progressiveGifts: { ...DEFAULT_PROGRESSIVE_GIFTS },
    scheduleTimezone: config.settings.scheduleTimezone,
    checkboxUpsellsEnabled: config.settings.checkboxUpsellsEnabled,
    stickyAddToCartEnabled: config.settings.stickyAddToCartEnabled,
  } satisfies OfferSettings;

  return {
    offerType: quantityBreaks
      ? "quantity-breaks-same"
      : quantityBreaksDifferent
        ? "quantity-breaks-different"
      : bxgy
        ? "bxgy"
        : freeGift
          ? "free-gift"
        : completeBundle
          ? "complete-bundle"
          : subscription
            ? "subscription"
        : "campaign-builder",
    selectedProductsJson:
      quantityBreaksDifferent
        ? JSON.stringify({
            productIds: config.scope.productIds,
          })
      : bxgy
        ? JSON.stringify({
            buyProducts: bxgyBuyProducts,
            getProducts: bxgyGetProducts,
          })
        : freeGift
          ? JSON.stringify({
              triggerProducts: freeGift.config.triggerProductIds,
              giftProducts: freeGift.config.giftProductIds,
            })
        : completeBundle
          ? JSON.stringify(completeBundleConfig)
        : config.scope.productIds.length > 0
        ? JSON.stringify(config.scope.productIds.map((id) => ({ id })))
        : null,
    discountRulesJson:
      quantityBreaks && discountRules.length > 0
        ? JSON.stringify(discountRules)
        : quantityBreaksDifferent && differentProductsRules.length > 0
          ? JSON.stringify(differentProductsRules)
        : bxgy && bxgyRules.length > 0
          ? JSON.stringify(bxgyRules)
          : freeGift && freeGiftRules.length > 0
            ? JSON.stringify(freeGiftRules)
          : completeBundle && completeBundleConfig.bars.length > 0
            ? JSON.stringify(
                completeBundleConfig.bars.map((bar) => ({
                  id: bar.id,
                  type: bar.type,
                  quantity: bar.quantity,
                  pricing: bar.pricing,
                  products: bar.products.map((product) => ({
                    productId: product.productId,
                    pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
                  })),
                })),
              )
          : null,
    offerSettingsJson: JSON.stringify(offerSettings),
  };
}

export function getOfferDisplayType(
  offerType: string,
  campaignConfigJson?: string | null,
): string {
  const config = parseCampaignConfig(campaignConfigJson);
  const primaryBlock = config?.logicBlocks[0];
  if (primaryBlock?.type === "quantity-breaks") return "Quantity breaks";
  if (primaryBlock?.type === "quantity-breaks-different") {
    return "Quantity breaks (different products)";
  }
  if (primaryBlock?.type === "bxgy") return "Buy X Get Y";
  if (primaryBlock?.type === "free-gift") return "Free gift";
  if (primaryBlock?.type === "complete-bundle") return "Complete bundle";
  if (primaryBlock?.type === "subscription") return "Subscription";
  if (offerType === "quantity-breaks-same") return "Quantity breaks";
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
}): string {
  const config = parseCampaignConfig(params.campaignConfigJson);
  if (config) {
    const quantityBreaks = config.logicBlocks.find(
      (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
    );
    const tiers = quantityBreaks?.config.tiers ?? [];
    if (tiers.length > 0) {
      return tiers
        .map((tier) => `Buy ${tier.qty} Get ${tier.discountPercent}% Off`)
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
            ? `Buy ${tier.buyQuantity} Get ${tier.getQuantity} ${tier.discountPercent === 100 ? "Free" : `${tier.discountPercent}% Off`}`
            : `Buy ${tier.count} Get ${tier.discountPercent}% Off`,
        )
        .join(", ");
    }
    const bxgyTiers = bxgy?.config.tiers ?? [];
    if (bxgyTiers.length > 0) {
      return bxgyTiers
        .map(
          (tier) =>
            `Buy ${tier.buyQuantity} Get ${tier.getQuantity} ${tier.discountPercent === 100 ? "Free" : `${tier.discountPercent}% Off`}`,
        )
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
    const productBundle = config.logicBlocks.find(
      (block): block is ProductBundleLogicBlock => block.type === "product-bundle",
    );
    if (productBundle?.config.enabled) {
      return `Product bundle module for ${productBundle.config.productIds.length} product${productBundle.config.productIds.length > 1 ? "s" : ""}`;
    }
  }

  const rules = parseDiscountRules(params.discountRulesJson);
  if (rules.length > 0) {
    return rules.map((rule) => `Buy ${rule.count} Get ${rule.discountPercent}% Off`).join(", ");
  }

  const bxgyRules = parseBxgyDiscountRules(params.discountRulesJson);
  if (bxgyRules.length > 0) {
    return bxgyRules
      .map(
        (rule) =>
          `Buy ${rule.buyQuantity} Get ${rule.getQuantity} ${rule.discountPercent === 100 ? "Free" : `${rule.discountPercent}% Off`}`,
      )
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
      
      const buyQuantity = Number((item as { buyQuantity?: unknown }).buyQuantity);
      const getQuantity = Number((item as { getQuantity?: unknown }).getQuantity);
      const discountPercent = Number((item as { discountPercent?: unknown }).discountPercent);
      const maxUsesPerOrder = Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder) || 1;
      
      const buyProductIds = (item as { buyProductIds?: unknown }).buyProductIds;
      const getProductIds = (item as { getProductIds?: unknown }).getProductIds;
      
      const count = Number((item as { count?: unknown }).count);
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(buyQuantity) || buyQuantity < 1) continue;
      if (!Number.isFinite(getQuantity) || getQuantity < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      if (!Array.isArray(buyProductIds) || !buyProductIds.length) continue;
      if (!Array.isArray(getProductIds) || !getProductIds.length) continue;
      
      out.push({
        count: Math.trunc(count),
        buyQuantity: Math.trunc(buyQuantity),
        getQuantity: Math.trunc(getQuantity),
        buyProductIds: buyProductIds.filter(id => typeof id === "string") as string[],
        getProductIds: getProductIds.filter(id => typeof id === "string") as string[],
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        maxUsesPerOrder: Math.max(1, Math.trunc(maxUsesPerOrder)),
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
      });
    }
    
    // 按 count 排序，优先匹配数量多的规则
    out.sort((a, b) => a.count - b.count);
    return out;
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

      const count = Number((item as { count?: unknown }).count);
      const giftQuantity = Number((item as { giftQuantity?: unknown }).giftQuantity);
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(giftQuantity) || giftQuantity < 1) continue;

      out.push({
        count: Math.trunc(count),
        giftQuantity: Math.trunc(giftQuantity),
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

/** Build BXGY discount rules JSON for DB storage — deduplicates by count, sorts ascending. */
export function buildBxgyDiscountRulesJson(tiers: BxgyDiscountRule[]): BxgyDiscountRule[] {
  const dedupedByCount = new Map<number, BxgyDiscountRule>();
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.buyQuantity) || tier.buyQuantity < 1) continue;
    if (!Number.isFinite(tier.getQuantity) || tier.getQuantity < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;
    dedupedByCount.set(Math.trunc(tier.count), {
      count: Math.trunc(tier.count),
      buyQuantity: Math.trunc(tier.buyQuantity),
      getQuantity: Math.trunc(tier.getQuantity),
      discountPercent: Math.max(0, Math.min(100, tier.discountPercent)),
      maxUsesPerOrder: Math.max(1, Math.trunc(tier.maxUsesPerOrder || 1)),
      buyProductIds: Array.isArray(tier.buyProductIds)
        ? tier.buyProductIds.filter(id => typeof id === "string")
        : [],
      getProductIds: Array.isArray(tier.getProductIds)
        ? tier.getProductIds.filter(id => typeof id === "string")
        : [],
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
    });
  }
  return Array.from(dedupedByCount.values()).sort((a, b) => a.count - b.count);
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

    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

export function buildDifferentProductsDiscountRulesJson(
  tiers: DifferentProductsDiscountRule[],
): DifferentProductsDiscountRule[] {
  const dedupedByCount = new Map<number, DifferentProductsDiscountRule>();
  for (const tier of tiers) {
    const sanitized = sanitizeDifferentProductsTier(tier);
    if (!sanitized) continue;
    dedupedByCount.set(sanitized.count, sanitized);
  }
  return Array.from(dedupedByCount.values()).sort((a, b) => a.count - b.count);
}

export function buildFreeGiftRulesJson(tiers: FreeGiftRule[]): FreeGiftRule[] {
  const dedupedByCount = new Map<number, FreeGiftRule>();
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.giftQuantity) || tier.giftQuantity < 1) continue;
    dedupedByCount.set(Math.trunc(tier.count), {
      count: Math.trunc(tier.count),
      giftQuantity: Math.trunc(tier.giftQuantity),
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
    });
  }
  return Array.from(dedupedByCount.values()).sort((a, b) => a.count - b.count);
}

export function parseCompleteBundleConfig(
  selectedProductsJson?: string | null,
): CompleteBundleConfig {
  if (!selectedProductsJson) return { bars: [] };
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    const barsInput = (parsed as { bars?: unknown })?.bars;
    if (!Array.isArray(barsInput)) return { bars: [] };

    const bars: CompleteBundleBar[] = [];
    for (const rawBar of barsInput) {
      if (!rawBar || typeof rawBar !== "object") continue;
      const id = String((rawBar as { id?: unknown }).id || "").trim();
      if (!id) continue;
      const typeRaw = String((rawBar as { type?: unknown }).type || "quantity-break-same");
      const type: CompleteBundleBar["type"] =
        typeRaw === "bxgy" ? "bxgy" : "quantity-break-same";
      const quantityNum = Number((rawBar as { quantity?: unknown }).quantity);
      const quantity = Number.isFinite(quantityNum) && quantityNum > 0 ? Math.trunc(quantityNum) : 1;

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
                selectedOptions:
                  (p as { selectedOptions?: unknown }).selectedOptions &&
                  typeof (p as { selectedOptions?: unknown }).selectedOptions === "object"
                    ? ((p as { selectedOptions?: Record<string, string> }).selectedOptions || {})
                    : {},
                pricing: { mode: pMode, value: pValue },
                variants: Array.isArray(variantsRaw)
                  ? variantsRaw
                      .filter((v) => v && typeof v === "object")
                      .map((v) => ({
                        id: String((v as { id?: unknown }).id || ""),
                        title: String((v as { title?: unknown }).title || ""),
                        price: String((v as { price?: unknown }).price || ""),
                        selectedOptions: Array.isArray((v as { selectedOptions?: unknown }).selectedOptions)
                          ? ((v as { selectedOptions?: Array<{ name?: unknown; value?: unknown }> }).selectedOptions || [])
                              .map((opt) => ({
                                name: String(opt.name || ""),
                                value: String(opt.value || ""),
                              }))
                          : [],
                      }))
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

      bars.push({
        id,
        type,
        title: String((rawBar as { title?: unknown }).title || ""),
        subtitle: String((rawBar as { subtitle?: unknown }).subtitle || ""),
        quantity,
        pricing: { mode, value },
        products,
      });
    }
    return { bars };
  } catch {
    return { bars: [] };
  }
}

export function buildCompleteBundleConfig(
  config: CompleteBundleConfig,
): CompleteBundleConfig {
  const bars = Array.isArray(config?.bars) ? config.bars : [];
  return {
    bars: bars
      .filter((bar) => bar && typeof bar === "object" && String(bar.id || "").trim())
      .map((bar) => ({
        id: String(bar.id).trim(),
        type: bar.type === "bxgy" ? "bxgy" : "quantity-break-same",
        title: String(bar.title || ""),
        subtitle: String(bar.subtitle || ""),
        quantity: Math.max(1, Math.trunc(Number(bar.quantity) || 1)),
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
                // 仅保留运行必需字段，展示数据统一按 productId 动态补全
                pricing: (() => {
                  const pmRaw = String(p.pricing?.mode || "full_price");
                  const pm: CompleteBundlePricingMode = (
                    ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
                  ).includes(pmRaw as CompleteBundlePricingMode)
                    ? (pmRaw as CompleteBundlePricingMode)
                    : "full_price";
                  const pv = Number.isFinite(Number(p.pricing?.value)) ? Number(p.pricing?.value) : 0;
                  return { mode: pm, value: pv };
                })(),
              }))
          : [],
      })),
  };
}
