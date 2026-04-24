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
  enableMultiProductBundle?: boolean;
  chooseButtonText?: string;
  chooseButtonColor?: string;
  chooseButtonSize?: number;
  chooseImageSize?: number;
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
      enableMultiProductBundle: false,
      chooseButtonText: "Choose",
      chooseButtonColor: "#111111",
      chooseButtonSize: 28,
      chooseImageSize: 40,
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
      enableMultiProductBundle: parsed.enableMultiProductBundle === true,
      chooseButtonText: parsed.chooseButtonText || "Choose",
      chooseButtonColor: sanitizeHexColor(parsed.chooseButtonColor, "#111111"),
      chooseButtonSize: clampNumber(parsed.chooseButtonSize, 24, 44, 28),
      chooseImageSize: clampNumber(parsed.chooseImageSize, 24, 64, 40),
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

export type DifferentProductPackSlot = {
  slotId: string;
  defaultProductId: string | null;
  allowChooseOther: boolean;
  quantity: number;
};

export type DifferentProductDiscountRule = {
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
  packItems: DifferentProductPackSlot[];
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

export function parseSelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed === "object") {
        const pool = (parsed as { productPool?: unknown }).productPool;
        if (Array.isArray(pool)) {
          const ids: string[] = [];
          for (const item of pool) {
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
        }
      }
      return [];
    }

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
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      const rawPackItems = (item as { packItems?: unknown }).packItems;
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      if (!Array.isArray(rawPackItems)) continue;

      // 解析每个 pack 槽位，容错处理旧数据和脏数据
      const packItems: DifferentProductPackSlot[] = rawPackItems
        .map((slot, slotIdx) => {
          if (!slot || typeof slot !== "object") return null;
          const slotIdRaw = (slot as { slotId?: unknown }).slotId;
          const defaultProductIdRaw = (slot as { defaultProductId?: unknown }).defaultProductId;
          const allowChooseOtherRaw = (slot as { allowChooseOther?: unknown }).allowChooseOther;
          const quantityRaw = Number((slot as { quantity?: unknown }).quantity);
          return {
            slotId:
              typeof slotIdRaw === "string" && slotIdRaw.trim()
                ? slotIdRaw.trim()
                : `slot-${slotIdx + 1}`,
            defaultProductId:
              typeof defaultProductIdRaw === "string" && defaultProductIdRaw.trim()
                ? defaultProductIdRaw.trim()
                : null,
            allowChooseOther: allowChooseOtherRaw === true,
            quantity:
              Number.isFinite(quantityRaw) && quantityRaw >= 1
                ? Math.trunc(quantityRaw)
                : 1,
          } satisfies DifferentProductPackSlot;
        })
        .filter(Boolean) as DifferentProductPackSlot[];

      if (!packItems.length) continue;
      out.push({
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
        packItems,
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

export function buildDifferentProductDiscountRulesJson(
  tiers: DifferentProductDiscountRule[],
): DifferentProductDiscountRule[] {
  const dedupedByCount = new Map<number, DifferentProductDiscountRule>();
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;
    if (!Array.isArray(tier.packItems) || !tier.packItems.length) continue;

    // 统一序列化槽位字段，避免前后端字段不一致
    const normalizedPackItems = tier.packItems
      .map((slot, idx) => ({
        slotId:
          typeof slot.slotId === "string" && slot.slotId.trim()
            ? slot.slotId.trim()
            : `slot-${idx + 1}`,
        defaultProductId:
          typeof slot.defaultProductId === "string" && slot.defaultProductId.trim()
            ? slot.defaultProductId.trim()
            : null,
        allowChooseOther: slot.allowChooseOther === true,
        quantity:
          Number.isFinite(slot.quantity) && slot.quantity >= 1
            ? Math.trunc(slot.quantity)
            : 1,
      }))
      .filter((slot) => Boolean(slot.slotId));
    if (!normalizedPackItems.length) continue;

    dedupedByCount.set(Math.trunc(tier.count), {
      count: Math.trunc(tier.count),
      discountPercent: Math.max(0, Math.min(100, tier.discountPercent)),
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
      packItems: normalizedPackItems,
    });
  }

  return Array.from(dedupedByCount.values()).sort((a, b) => a.count - b.count);
}
