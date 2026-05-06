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
  scheduleTimezone?: string;
  /** Progressive gifts（阶梯赠品）配置：直接以对象存储在 offer settings JSON 中。 */
  progressiveGifts: ProgressiveGiftsConfig;
  /** 订阅（selling plan）相关配置，旧数据可能不存在 */
  subscriptionEnabled?: boolean;
  subscriptionPosition?: string;
  subscriptionTitle?: string;
  subscriptionSubtitle?: string;
  oneTimeTitle?: string;
  oneTimeSubtitle?: string;
  subscriptionDefaultSelected?: boolean;
  enableMultiProductBundle?: boolean;
  chooseButtonText?: string;
  chooseButtonColor?: string;
  chooseButtonSize?: number;
  chooseImageSize?: number;
  /** A/B 与旧版两组折扣比例等配置（仅存 JSON，结构与 parseAbTestOfferSettingsBlock 对齐） */
  abTest?: Record<string, unknown>;
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
      scheduleTimezone: undefined,
      progressiveGifts: parseProgressiveGiftsConfig(null),
      subscriptionEnabled: undefined,
      subscriptionPosition: undefined,
      subscriptionTitle: undefined,
      subscriptionSubtitle: undefined,
      oneTimeTitle: undefined,
      oneTimeSubtitle: undefined,
      subscriptionDefaultSelected: undefined,
      enableMultiProductBundle: false,
      chooseButtonText: "Choose",
      chooseButtonColor: "#111111",
      chooseButtonSize: 28,
      chooseImageSize: 40,
      abTest: undefined,
    };
  }

  try {
    const parsed = JSON.parse(offerSettingsJson) as Partial<OfferSettings>;
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
      scheduleTimezone: parsed.scheduleTimezone,
      progressiveGifts: parseProgressiveGiftsConfig((parsed as any).progressiveGifts ?? null),
      subscriptionEnabled:
        typeof parsed.subscriptionEnabled === "boolean" ? parsed.subscriptionEnabled : undefined,
      subscriptionPosition:
        typeof parsed.subscriptionPosition === "string" ? parsed.subscriptionPosition : undefined,
      subscriptionTitle: typeof parsed.subscriptionTitle === "string" ? parsed.subscriptionTitle : undefined,
      subscriptionSubtitle:
        typeof parsed.subscriptionSubtitle === "string" ? parsed.subscriptionSubtitle : undefined,
      oneTimeTitle: typeof parsed.oneTimeTitle === "string" ? parsed.oneTimeTitle : undefined,
      oneTimeSubtitle: typeof parsed.oneTimeSubtitle === "string" ? parsed.oneTimeSubtitle : undefined,
      subscriptionDefaultSelected:
        typeof parsed.subscriptionDefaultSelected === "boolean"
          ? parsed.subscriptionDefaultSelected
          : undefined,
      enableMultiProductBundle:
        typeof parsed.enableMultiProductBundle === "boolean"
          ? parsed.enableMultiProductBundle
          : false,
      chooseButtonText:
        typeof parsed.chooseButtonText === "string"
          ? parsed.chooseButtonText
          : "Choose",
      chooseButtonColor: sanitizeHexColor(
        parsed.chooseButtonColor,
        "#111111",
      ),
      chooseButtonSize: clampNumber(parsed.chooseButtonSize, 24, 44, 28),
      chooseImageSize: clampNumber(parsed.chooseImageSize, 24, 64, 40),
      abTest:
        parsed.abTest && typeof parsed.abTest === "object"
          ? (parsed.abTest as Record<string, unknown>)
          : undefined,
    };
  } catch {
    return parseOfferSettings(null);
  }
}

/**
 * 折扣规则：历史上存在多种规则形态（quantity breaks、bxgy、free gift、complete bundle 等）。
 * 这里采用「宽类型」以兼容旧数据与不同编辑器模块共享。
 */
export type DiscountRule = {
  id?: string;
  count: number;
  discountPercent: number;
  /** 阶梯计价模式（编辑器与预览） */
  priceMode?: "percentage_off" | "full_price" | "amount_off" | "fixed_price";
  discountValue?: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
  // 统一规则编辑器中会用到的字段（允许缺省）
  logicType?: "standard" | "bxgy";
  rewardType?: "percentage_off" | "gift_product" | "free_shipping";
  conditionType?: "item_quantity" | "cart_amount";
  discountClass?: "order" | "shipping" | "product";
  offerKind?: "percentage_discount" | "free_gift" | "free_shipping";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
  giftQuantity?: number;
  rewardProductIds?: string[];
  buyProductIds?: string[];
  getProductIds?: string[];
  tierType?: "bxgy" | "simple";
  amountThreshold?: number;
  // 其它扩展字段
  [k: string]: unknown;
};

export function parseDiscountRules(discountRulesJson?: string | null): DiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: DiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      const count = Number(record.count);
      const discountPercent = Number(record.discountPercent);
      const id = typeof record.id === "string" ? record.id : undefined;

      // count/discountPercent 是旧 quantity breaks 规则的核心字段；若缺失则原样保留（供其它规则类型使用）
      const normalized = { ...(record as any), id } as DiscountRule;
      normalized.count = Number.isFinite(count) && count >= 1 ? Math.trunc(count) : 1;
      normalized.discountPercent = Number.isFinite(discountPercent)
        ? Math.max(0, Math.min(100, discountPercent))
        : 0;

      out.push(normalized);
    }
    out.sort((a, b) => Number(a.count ?? 0) - Number(b.count ?? 0));
    return out;
  } catch {
    return [];
  }
}

export function parseSelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
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

// -----------------------------
// Progressive gifts（阶梯赠品）
// -----------------------------

export type ProgressiveGiftUnlockMode = "tier_index" | "at_count";

export type ProgressiveGift = {
  id: string;
  type: "free_shipping";
  title: string;
  subtitle: string;
  imageUrl: string;
  unlockMode: ProgressiveGiftUnlockMode;
  /** unlockMode=tier_index：达到指定档位（1-based）后解锁 */
  unlockTierIndex: number;
  /** unlockMode=at_count：达到指定购物车数量后解锁 */
  unlockAtCount: number;
  /** free shipping 限额（可空） */
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

export function parseProgressiveGiftsConfig(input: unknown): ProgressiveGiftsConfig {
  const fallback: ProgressiveGiftsConfig = {
    enabled: false,
    title: "Progressive gifts",
    subtitle: "",
    layout: "vertical",
    hideGiftsUntilUnlocked: false,
    showLabelsForLockedGifts: true,
    gifts: [],
  };
  if (!input) return fallback;
  if (typeof input === "string") {
    try {
      return parseProgressiveGiftsConfig(JSON.parse(input));
    } catch {
      return fallback;
    }
  }
  if (typeof input !== "object") return fallback;

  const obj = input as Record<string, unknown>;
  const giftsRaw = Array.isArray(obj.gifts) ? obj.gifts : [];
  const gifts: ProgressiveGift[] = giftsRaw
    .map((g) => {
      if (!g || typeof g !== "object") return null;
      const r = g as Record<string, unknown>;
      const unlockMode = (r.unlockMode === "at_count" ? "at_count" : "tier_index") as ProgressiveGiftUnlockMode;
      const unlockTierIndex = Math.max(1, Math.trunc(Number(r.unlockTierIndex) || 1));
      const unlockAtCount = Math.max(1, Math.trunc(Number(r.unlockAtCount) || 1));
      const maxRate = r.freeShippingMaxRateAmount;
      const freeShippingMaxRateAmount =
        maxRate === null || maxRate === undefined
          ? null
          : Number.isFinite(Number(maxRate))
            ? Number(maxRate)
            : null;
      const id = String(r.id || "").trim();
      if (!id) return null;
      return {
        id,
        type: "free_shipping",
        title: sanitizeSingleLineText(r.title, 80, "Free shipping"),
        subtitle: sanitizeSingleLineText(r.subtitle, 120, ""),
        imageUrl: sanitizeSingleLineText(r.imageUrl, 600, ""),
        unlockMode,
        unlockTierIndex,
        unlockAtCount,
        freeShippingMaxRateAmount,
      } satisfies ProgressiveGift;
    })
    .filter(Boolean) as ProgressiveGift[];

  const layout = ["vertical", "horizontal", "card", "compact"].includes(String(obj.layout))
    ? (String(obj.layout) as ProgressiveGiftsConfig["layout"])
    : fallback.layout;

  return {
    enabled: obj.enabled === true,
    title: sanitizeSingleLineText(obj.title, 80, fallback.title),
    subtitle: sanitizeSingleLineText(obj.subtitle, 200, ""),
    layout,
    hideGiftsUntilUnlocked: obj.hideGiftsUntilUnlocked === true,
    showLabelsForLockedGifts: obj.showLabelsForLockedGifts !== false,
    gifts,
  };
}

export function progressiveGiftsConfigToStorableJson(
  cfg: ProgressiveGiftsConfig,
): ProgressiveGiftsConfig {
  // 历史上这里叫 toStorableJson，但实际我们是把对象直接放入 offerSettingsJson 的 JSON 中。
  // 为兼容旧调用点，保持函数名不变，但返回归一化后的对象。
  return parseProgressiveGiftsConfig(cfg);
}

export function isProgressiveGiftUnlocked(
  gift: ProgressiveGift,
  selectedBarIndex: number,
  assumedLineQty: number,
): boolean {
  const barIndex = Math.max(1, Math.trunc(Number(selectedBarIndex) || 1));
  const qty = Math.max(0, Math.trunc(Number(assumedLineQty) || 0));
  if (gift.unlockMode === "at_count") return qty >= Math.max(1, gift.unlockAtCount || 1);
  return barIndex >= Math.max(1, gift.unlockTierIndex || 1);
}

// -----------------------------
// Complete bundle（组合包）配置
// -----------------------------

export type CompleteBundlePricingMode =
  | "full_price"
  | "percentage_off"
  | "amount_off"
  | "fixed_price";

export type CompleteBundleVariantOption = {
  name: string;
  value: string;
};

export type CompleteBundleVariant = {
  id: string;
  title?: string;
  price?: string;
  selectedOptions?: CompleteBundleVariantOption[];
};

export type CompleteBundleProduct = {
  productId: string;
  handle?: string;
  title?: string;
  image?: string;
  price?: string;
  defaultVariantId?: string;
  selectedVariantId?: string;
  selectedOptions?: Record<string, string>;
  variants?: CompleteBundleVariant[];
  /** 部分 JSON 在 bar 内联存 per-product 定价（编辑器使用） */
  pricing?: { mode: CompleteBundlePricingMode; value: number };
};

export type CompleteBundleBar = {
  id: string;
  type: "quantity-break-same" | "bxgy";
  title: string;
  subtitle: string;
  quantity: number;
  pricing: { mode: CompleteBundlePricingMode; value: number };
  products: CompleteBundleProduct[];
  [k: string]: unknown;
};

export function parseCompleteBundleConfig(selectedProductsJson?: string | null): {
  bars: CompleteBundleBar[];
} {
  if (!selectedProductsJson) return { bars: [] };
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    if (!parsed || typeof parsed !== "object") return { bars: [] };
    const obj = parsed as Record<string, unknown>;
    const barsRaw = Array.isArray(obj.bars) ? obj.bars : [];
    const bars: CompleteBundleBar[] = barsRaw
      .map((bar) => {
        if (!bar || typeof bar !== "object") return null;
        const b = bar as Record<string, unknown>;
        const id = String(b.id || "").trim() || `bar_${Math.random().toString(36).slice(2, 8)}`;
        const type =
          b.type === "bxgy" ? "bxgy" : ("quantity-break-same" as const);
        const title = sanitizeSingleLineText(b.title, 80, "Complete bundle");
        const subtitle = sanitizeSingleLineText(b.subtitle, 120, "");
        const quantity = Math.max(0, Math.trunc(Number(b.quantity) || 0));
        const pricingRaw = (b.pricing && typeof b.pricing === "object" ? b.pricing : {}) as Record<
          string,
          unknown
        >;
        const mode =
          pricingRaw.mode === "percentage_off"
            ? "percentage_off"
            : pricingRaw.mode === "amount_off"
              ? "amount_off"
              : pricingRaw.mode === "fixed_price"
                ? "fixed_price"
                : ("full_price" as const);
        const value = Number.isFinite(Number(pricingRaw.value)) ? Number(pricingRaw.value) : 0;

        const productsRaw = Array.isArray(b.products) ? b.products : [];
        const products: CompleteBundleProduct[] = productsRaw
          .map((p) => {
            if (!p || typeof p !== "object") return null;
            const r = p as Record<string, unknown>;
            const productId = String(r.productId || "").trim();
            if (!productId) return null;
            return { ...r, productId } as CompleteBundleProduct;
          })
          .filter(Boolean) as CompleteBundleProduct[];
        return {
          ...b,
          id,
          type,
          title,
          subtitle,
          quantity,
          pricing: { mode, value },
          products,
        } as CompleteBundleBar;
      })
      .filter(Boolean) as CompleteBundleBar[];
    return { bars };
  } catch {
    return { bars: [] };
  }
}

// -----------------------------
// Legacy / campaign config（兼容导出）
// -----------------------------

export type CampaignConfig = {
  scope: { productIds: string[] };
  logicBlocks: unknown[];
  settings: { status: boolean; startTime?: string; endTime?: string };
  legacy?: {
    offerType?: string;
    selectedProductsJson?: string;
    discountRulesJson?: string;
    offerSettingsJson?: string;
  };
  [k: string]: unknown;
};

export function parseCampaignConfig(raw: string): CampaignConfig | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const scopeRaw = (obj.scope && typeof obj.scope === "object" ? obj.scope : {}) as Record<string, unknown>;
    const productIds = Array.isArray(scopeRaw.productIds)
      ? scopeRaw.productIds.map((x) => String(x || "").trim()).filter(Boolean)
      : [];
    const logicBlocks = Array.isArray(obj.logicBlocks) ? obj.logicBlocks : [];
    const settingsRaw = (obj.settings && typeof obj.settings === "object" ? obj.settings : {}) as Record<string, unknown>;
    const settings = {
      status:
        typeof settingsRaw.status === "boolean"
          ? settingsRaw.status
          : String(settingsRaw.status || "").toUpperCase() === "ACTIVE",
      startTime: typeof settingsRaw.startTime === "string" ? settingsRaw.startTime : undefined,
      endTime: typeof settingsRaw.endTime === "string" ? settingsRaw.endTime : undefined,
    };
    return {
      ...(obj as CampaignConfig),
      scope: { productIds },
      logicBlocks,
      settings,
    };
  } catch {
    return null;
  }
}

export function buildLegacyFieldsFromCampaignConfig(cfg: CampaignConfig): {
  offerType: string;
  selectedProductsJson: string;
  discountRulesJson: string;
  offerSettingsJson: string;
} {
  const offerType = String(cfg?.legacy?.offerType || (cfg as any)?.offerType || "").trim() || "quantity-breaks";
  const selectedProductsJson = String(cfg?.legacy?.selectedProductsJson || "");
  const discountRulesJson = String(cfg?.legacy?.discountRulesJson || "");
  const offerSettingsJson =
    String(cfg?.legacy?.offerSettingsJson || "") || JSON.stringify(parseOfferSettings(null));
  return { offerType, selectedProductsJson, discountRulesJson, offerSettingsJson };
}

export function migrateLegacyOfferToCampaignConfig(input: {
  offerType: string;
  selectedProductsJson: string;
  discountRulesJson: string;
  offerSettingsJson: string;
  startTime?: string | null;
  endTime?: string | null;
  status?: boolean | null;
}): CampaignConfig {
  const productIds = parseSelectedProductIds(input.selectedProductsJson);
  return {
    scope: { productIds },
    logicBlocks: [],
    settings: {
      status: Boolean(input.status),
      startTime: input.startTime || "",
      endTime: input.endTime || "",
    },
    legacy: {
      offerType: input.offerType,
      selectedProductsJson: input.selectedProductsJson,
      discountRulesJson: input.discountRulesJson,
      offerSettingsJson: input.offerSettingsJson,
    },
  };
}

// free-gift：选品结构包含触发商品与赠品商品
export function parseFreeGiftSelectedProducts(selectedProductsJson?: string | null): {
  triggerProducts: string[];
  giftProducts: string[];
} {
  if (!selectedProductsJson) return { triggerProducts: [], giftProducts: [] };
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    if (!parsed || typeof parsed !== "object") {
      // 兼容：如果旧数据就是数组，视为 triggerProducts
      return { triggerProducts: parseSelectedProductIds(selectedProductsJson), giftProducts: [] };
    }
    const obj = parsed as Record<string, unknown>;
    const triggerProducts = parseSelectedProductIds(JSON.stringify(obj.triggerProducts ?? []));
    const giftProducts = parseSelectedProductIds(JSON.stringify(obj.giftProducts ?? []));
    return { triggerProducts, giftProducts };
  } catch {
    return { triggerProducts: [], giftProducts: [] };
  }
}

// 旧编辑器/注册表兼容：这些 builder 在当前实现中退化为 stringify（避免 TS 缺导出报错）
export type BxgyDiscountRule = DiscountRule & {
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  maxUsesPerOrder: number;
  conditionType?: undefined;
  rewardType?: undefined;
};

export type DifferentProductsDiscountRule = DiscountRule & {
  tierType: "bxgy" | "simple";
  buyProductIds: string[];
  getProductIds: string[];
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
  conditionType?: undefined;
  rewardType?: undefined;
};

export type FreeGiftRule = DiscountRule & {
  giftQuantity: number;
  conditionType?: "quantity_threshold";
  triggerProducts?: string[];
  giftProducts?: string[];
};

export function buildFreeGiftRulesJson(rules: unknown): string {
  return JSON.stringify(rules ?? []);
}
export function buildDifferentProductsDiscountRulesJson(rules: unknown): string {
  return JSON.stringify(rules ?? []);
}
export function buildBxgyDiscountRulesJson(rules: unknown): string {
  return JSON.stringify(rules ?? []);
}
export function buildCompleteBundleConfig(config: unknown): string {
  return JSON.stringify(config ?? {});
}

export function parseBxgyDiscountRules(
  discountRulesJson?: string | null,
): BxgyDiscountRule[] {
  if (!discountRulesJson) return [];
  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: BxgyDiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const count = Number(r.count);
      const buyQuantity = Number(r.buyQuantity);
      const getQuantity = Number(r.getQuantity);
      const discountPercent = Number(r.discountPercent);
      const maxUsesPerOrderRaw = Number(r.maxUsesPerOrder);
      const maxUsesPerOrder = Number.isFinite(maxUsesPerOrderRaw)
        ? maxUsesPerOrderRaw
        : 1;
      const buyProductIds = Array.isArray(r.buyProductIds)
        ? r.buyProductIds.filter((id): id is string => typeof id === "string")
        : [];
      const getProductIds = Array.isArray(r.getProductIds)
        ? r.getProductIds.filter((id): id is string => typeof id === "string")
        : [];

      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(buyQuantity) || buyQuantity < 1) continue;
      if (!Number.isFinite(getQuantity) || getQuantity < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      if (!buyProductIds.length || !getProductIds.length) continue;

      out.push({
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        buyQuantity: Math.trunc(buyQuantity),
        getQuantity: Math.trunc(getQuantity),
        buyProductIds,
        getProductIds,
        maxUsesPerOrder: Math.max(1, Math.trunc(maxUsesPerOrder)),
      });
    }

    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

export function parseDifferentProductDiscountRules(
  discountRulesJson?: string | null,
): DifferentProductDiscountRule[] {
  if (!discountRulesJson) return [];
  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: DifferentProductDiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const r = item as Record<string, unknown>;
      const count = Number(r.count);
      const discountPercent = Number(r.discountPercent);
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;

      const tierRaw = String(r.tierType || "simple");
      const tierType: "bxgy" | "simple" = tierRaw === "bxgy" ? "bxgy" : "simple";
      const buyProductIds = Array.isArray(r.buyProductIds)
        ? r.buyProductIds.filter((id): id is string => typeof id === "string")
        : [];
      const getProductIds = Array.isArray(r.getProductIds)
        ? r.getProductIds.filter((id): id is string => typeof id === "string")
        : [];
      const buyQuantity = Number(r.buyQuantity);
      const getQuantity = Number(r.getQuantity);
      const maxUsesPerOrder = Number(r.maxUsesPerOrder);

      out.push({
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        tierType,
        buyProductIds,
        getProductIds,
        buyQuantity: Number.isFinite(buyQuantity)
          ? Math.trunc(buyQuantity)
          : undefined,
        getQuantity: Number.isFinite(getQuantity)
          ? Math.trunc(getQuantity)
          : undefined,
        maxUsesPerOrder: Number.isFinite(maxUsesPerOrder)
          ? Math.max(1, Math.trunc(maxUsesPerOrder))
          : undefined,
      });
    }

    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

/** 与历史上 singular 命名的 builder 对齐 */
export const buildDifferentProductDiscountRulesJson =
  buildDifferentProductsDiscountRulesJson;

/**
 * 编辑器态「不同商品」档位（允许缺 tierType / buyProductIds，保存前由表单补齐）。
 * 持久化对齐见 DifferentProductsDiscountRule。
 */
export type DifferentProductDiscountRule = DiscountRule & {
  tierType?: "bxgy" | "simple";
  buyProductIds?: string[];
  getProductIds?: string[];
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
};

export function getOfferScheduleTimezone(input: {
  campaignConfigJson?: string | null | undefined;
  offerSettingsJson?: string | null | undefined;
  fallback: string;
}): string {
  // 优先从 offerSettingsJson 取，其次尝试从 campaignConfigJson 中取，最终 fallback。
  const bySettings = input.offerSettingsJson ? parseOfferSettings(input.offerSettingsJson).scheduleTimezone : null;
  if (bySettings) return bySettings;

  if (input.campaignConfigJson) {
    const parsed = parseCampaignConfig(input.campaignConfigJson);
    const tz = typeof (parsed as any)?.settings?.timezone === "string" ? String((parsed as any).settings.timezone) : "";
    if (tz) return tz;
  }
  return input.fallback;
}

export function getOfferDisplayType(offerType: unknown, _campaignConfigJson?: unknown): string {
  const t = String(offerType || "").trim();
  return t || "unknown";
}

export function getOfferRulesText(input: { campaignConfigJson?: string | null | undefined; discountRulesJson?: string | null | undefined }): string {
  // 列表页展示用的简要文本：优先用 campaignConfigJson 的规则数；否则退化为 tiers 数。
  const campaign = input.campaignConfigJson ? parseCampaignConfig(input.campaignConfigJson) : null;
  if (campaign) {
    const blocks = Array.isArray((campaign as any).logicBlocks) ? (campaign as any).logicBlocks : [];
    if (blocks.length) return `${blocks.length} rules`;
  }
  const tiers = parseDiscountRules(input.discountRulesJson || null);
  return tiers.length ? `${tiers.length} tiers` : "";
}

// --- A/B（与 zz/feature/20260427/abTest 对齐，实现见独立模块） ---
export {
  computeEvenTrafficWeights,
  normalizeTrafficWeights,
  parseAbTestOfferSettingsBlock,
  type AbTestVariantStored,
  type AbTestOfferSettingsStored,
  type AbTestQuantityDiscountRule,
} from "./offerParsingAbTest";
