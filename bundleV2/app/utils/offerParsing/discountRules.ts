import type {
  DiscountRule,
  DifferentProductsDiscountRule,
  BxgyDiscountRule,
  FreeGiftRule,
  PerProductDiscountRule,
  QuantityBreakTier,
} from "./types";

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

export function sanitizeQuantityBreakTier(raw: unknown): QuantityBreakTier | null {
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

export function sanitizeBxgyTier(raw: unknown): BxgyDiscountRule | null {
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

export function sanitizeDifferentProductsTier(
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

export function sanitizeFreeGiftTier(raw: unknown): FreeGiftRule | null {
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
        discountPercent: 100,
        maxUsesPerOrder: 1,
        tierType: tierType === "simple" ? "simple" : "bxgy",
        title: (item as { title?: string }).title || "",
        subtitle: (item as { subtitle?: string }).subtitle || "",
        badge: (item as { badge?: string }).badge || "",
        isDefault: !!(item as { isDefault?: boolean }).isDefault,
      });
    }
    
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
