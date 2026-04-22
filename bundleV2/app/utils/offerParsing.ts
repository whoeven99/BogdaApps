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
    };
  } catch {
    return parseOfferSettings(null);
  }
}

export type DiscountRule = {
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

/**
 * Quantity break rule tied to a specific product or variant.
 * Used for "quantity-breaks-same" when the offer has selected products —
 * each product can have its own set of tiers (product-level pricing).
 *
 * The `productId` / `variantId` fields are optional for backwards compatibility:
 * if omitted, the rule applies to all products in the offer (the old behavior).
 *
 * Rules are matched by productId first, then variantId, then global (no ID).
 */
export type PerProductDiscountRule = {
  /** Optional product GID — if set, this tier only applies to this product */
  productId?: string;
  /** Optional variant GID — if set, this tier only applies to this variant */
  variantId?: string;
  /** Quantity threshold: tier applies when cart quantity >= this value */
  count: number;
  /** Discount percentage (0–100) */
  discountPercent: number;
  /** Custom title for this tier (e.g. "2 Pack", "Duo") */
  title?: string;
  /** Custom subtitle (e.g. "You save 15%") */
  subtitle?: string;
  /** Badge text (e.g. "Most Popular") */
  badge?: string;
  /** Whether this tier is the default selected one */
  isDefault?: boolean;
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

/** Discount rule for "Quantity breaks for different products" */
export type DifferentProductsDiscountRule = {
  /** Cart quantity threshold across all different eligible products */
  count: number;
  discountPercent: number;
  /** Number of items customer needs to buy */
  buyQuantity: number;
  /** Number of items customer gets with discount */
  getQuantity: number;
  /** Product IDs that customer needs to buy */
  buyProductIds: string[];
  /** Product IDs that customer gets with discount (empty means same as buyProductIds) */
  getProductIds: string[];
  /** Max uses per order */
  maxUsesPerOrder: number;
  /** Tier type: 'bxgy' = Buy X Get Y mode, 'simple' = flat discount mode */
  tierType: "bxgy" | "simple";
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

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

/**
 * Parse per-product discount rules from JSON.
 * Supports the new format with productId/variantId fields (backwards compatible
 * with plain DiscountRule entries where those fields are absent).
 */
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
        productId: typeof productId === "string" && productId ? productId : undefined,
        variantId: typeof variantId === "string" && variantId ? variantId : undefined,
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

/**
 * Build a cleaned, sorted per-product discount rules JSON array.
 * Deduplicates by (productId, variantId, count) composite key.
 */
export function buildPerProductDiscountRulesJson(
  tiers: PerProductDiscountRule[],
): PerProductDiscountRule[] {
  const seen = new Set<string>();
  const out: PerProductDiscountRule[] = [];

  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;

    const key = `${tier.productId ?? ""}|${tier.variantId ?? ""}|${tier.count}`;
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

/**
 * High-precision pricing calculation for quantity breaks.
 * Uses integer math internally (scaled ×10000) to avoid floating-point errors,
 * rounds to cents only at the final step.
 *
 * @param unitPrice  Unit price per item (in dollars/euros, e.g. 29.99)
 * @param quantity   Number of items being purchased
 * @param discountPercent  Discount percentage (0–100)
 * @returns All pricing values in the same unit as unitPrice
 */
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

export function parseSelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);

    // New structured format for quantity-breaks-different: { productIds: [...] }
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.productIds)) {
      return parsed.productIds
        .filter((id: unknown) => typeof id === "string")
        .map(String);
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
      if (!item || typeof item !== "object") continue;

      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number((item as { discountPercent?: unknown }).discountPercent);
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;

      const buyQuantity = Number((item as { buyQuantity?: unknown }).buyQuantity) || 1;
      const getQuantity = Number((item as { getQuantity?: unknown }).getQuantity) || 0;
      const maxUsesPerOrder = Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder) || 1;
      const tierType = (item as { tierType?: string }).tierType;
      const validTierType: "bxgy" | "simple" =
        tierType === "bxgy" ? "bxgy" : "simple";

      const buyProductIds = (item as { buyProductIds?: unknown }).buyProductIds;
      const getProductIds = (item as { getProductIds?: unknown }).getProductIds;

      if (!Array.isArray(buyProductIds) || !buyProductIds.length) continue;

      out.push({
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        buyQuantity: Math.max(1, Math.trunc(buyQuantity)),
        getQuantity: Math.max(0, Math.trunc(getQuantity)),
        buyProductIds: buyProductIds.filter((id: unknown) => typeof id === "string") as string[],
        getProductIds: Array.isArray(getProductIds) ? getProductIds.filter((id: unknown) => typeof id === "string") as string[] : [],
        maxUsesPerOrder: Math.max(1, Math.trunc(maxUsesPerOrder)),
        tierType: validTierType,
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

export function buildDifferentProductsDiscountRulesJson(
  tiers: DifferentProductsDiscountRule[],
): DifferentProductsDiscountRule[] {
  const dedupedByCount = new Map<number, DifferentProductsDiscountRule>();
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;
    dedupedByCount.set(Math.trunc(tier.count), {
      count: Math.trunc(tier.count),
      discountPercent: Math.max(0, Math.min(100, tier.discountPercent)),
      buyQuantity: Math.max(1, Math.trunc(tier.buyQuantity || 1)),
      getQuantity: Math.max(0, Math.trunc(tier.getQuantity || 0)),
      buyProductIds: Array.isArray(tier.buyProductIds)
        ? tier.buyProductIds.filter((id: unknown) => typeof id === "string")
        : [],
      getProductIds: Array.isArray(tier.getProductIds)
        ? tier.getProductIds.filter((id: unknown) => typeof id === "string")
        : [],
      maxUsesPerOrder: Math.max(1, Math.trunc(tier.maxUsesPerOrder || 1)),
      tierType: tier.tierType === "bxgy" ? "bxgy" : "simple",
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
    });
  }
  return Array.from(dedupedByCount.values()).sort((a, b) => a.count - b.count);
}
