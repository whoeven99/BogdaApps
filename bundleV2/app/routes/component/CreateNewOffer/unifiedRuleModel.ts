import {
  isSingleDiscountRule,
  type DiscountRule,
} from "../../../utils/offerParsing";

export type DiscountTypeId =
  | "quantity_break"
  | "order_discount"
  | "free_shipping"
  | "free_gift"
  | "bxgy";

export const DISCOUNT_TYPE_OPTIONS = [
  { label: "Quantity break", value: "quantity_break" },
  { label: "BXGY", value: "bxgy" },
  { label: "Order discount", value: "order_discount" },
  { label: "Free shipping", value: "free_shipping" },
  { label: "Free gift", value: "free_gift" },
] as Array<{ label: string; value: DiscountTypeId }>;

export const CONDITION_TYPE_OPTIONS = [
  { label: "Item quantity", value: "item_quantity" },
  { label: "Cart amount", value: "cart_amount" },
] as Array<{ label: string; value: "item_quantity" | "cart_amount" }>;

export const REWARD_TYPE_OPTIONS = [
  { label: "Percentage off", value: "percentage_off" },
  { label: "Gift product", value: "gift_product" },
  { label: "Free shipping", value: "free_shipping" },
] as Array<{
  label: string;
  value: "percentage_off" | "gift_product" | "free_shipping";
}>;

export type UnifiedRuleIssue = {
  ruleIndex?: number;
  message: string;
  severity: "error" | "warning";
};

function buildRuleId() {
  return `rule_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function normalizeUnifiedRule(rule: DiscountRule): DiscountRule {
  const conditionType =
    rule.conditionType === "cart_amount" ? "cart_amount" : "item_quantity";
  const rewardType =
    rule.rewardType === "gift_product" || rule.rewardType === "free_shipping"
      ? rule.rewardType
      : "percentage_off";
  const discountClass =
    rewardType === "gift_product"
      ? "order"
      : rewardType === "free_shipping"
        ? "shipping"
        : rule.discountClass === "order" || rule.discountClass === "shipping"
          ? rule.discountClass
          : "product";
  const normalizedBuyQuantity = Math.max(1, Math.trunc(Number(rule.buyQuantity) || 2));
  const normalizedGetQuantity = Math.max(1, Math.trunc(Number(rule.getQuantity) || 1));
  const isBxgy = rule.logicType === "bxgy";

  return {
    id: rule.id || buildRuleId(),
    tierType: isSingleDiscountRule(rule) ? "single" : undefined,
    count: isBxgy
      ? normalizedBuyQuantity
      : Math.max(1, Math.trunc(Number(rule.count) || 1)),
    discountPercent: isBxgy
      ? 100
      : Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
    discountClass,
    offerKind:
      rewardType === "gift_product"
        ? "free_gift"
        : rewardType === "free_shipping"
          ? "free_shipping"
          : "percentage_discount",
    conditionType,
    amountThreshold:
      conditionType === "cart_amount"
        ? Math.max(0, Number(rule.amountThreshold) || 0)
        : undefined,
    rewardType,
    rewardProductIds: Array.isArray(rule.rewardProductIds)
      ? rule.rewardProductIds.map(String).filter(Boolean)
      : [],
    giftQuantity:
      rewardType === "gift_product"
        ? Math.max(1, Math.trunc(Number(rule.giftQuantity) || 1))
        : undefined,
    logicType: isBxgy ? "bxgy" : "standard",
    buyQuantity: normalizedBuyQuantity,
    getQuantity: normalizedGetQuantity,
    maxUsesPerOrder: isBxgy ? 1 : Math.max(1, Math.trunc(Number(rule.maxUsesPerOrder) || 1)),
  };
}

export function normalizeUnifiedRules(rules: DiscountRule[]): DiscountRule[] {
  return rules.map(normalizeUnifiedRule);
}

export function createRuleFromTemplate(
  template:
    | "product_discount"
    | "order_discount"
    | "shipping_discount"
    | "free_gift"
    | "bxgy",
): DiscountRule {
  if (template === "shipping_discount") {
    return normalizeUnifiedRule({
      id: buildRuleId(),
      count: 2,
      discountPercent: 0,
      discountClass: "shipping",
      offerKind: "free_shipping",
      conditionType: "item_quantity",
      rewardType: "free_shipping",
    });
  }

  if (template === "free_gift") {
    return normalizeUnifiedRule({
      id: buildRuleId(),
      count: 2,
      discountPercent: 0,
      discountClass: "order",
      offerKind: "free_gift",
      conditionType: "item_quantity",
      rewardType: "gift_product",
      giftQuantity: 1,
      rewardProductIds: [],
    });
  }

  if (template === "bxgy") {
    return normalizeUnifiedRule({
      id: buildRuleId(),
      count: 2,
      discountPercent: 100,
      logicType: "bxgy",
      discountClass: "product",
      offerKind: "percentage_discount",
      conditionType: "item_quantity",
      rewardType: "percentage_off",
      buyQuantity: 2,
      getQuantity: 1,
      maxUsesPerOrder: 1,
    });
  }

  return normalizeUnifiedRule({
    id: buildRuleId(),
    count: 2,
    discountPercent: 15,
    discountClass: template === "order_discount" ? "order" : "product",
    offerKind: "percentage_discount",
    conditionType: "item_quantity",
    rewardType: "percentage_off",
  });
}

export function getDiscountTypeFromRule(rule: DiscountRule): DiscountTypeId {
  const normalized = normalizeUnifiedRule(rule);
  if (normalized.logicType === "bxgy") return "bxgy";
  if (normalized.rewardType === "gift_product") return "free_gift";
  if (normalized.rewardType === "free_shipping") return "free_shipping";
  if (normalized.discountClass === "order") return "order_discount";
  return "quantity_break";
}

export function applyDiscountType(rule: DiscountRule, discountType: DiscountTypeId): DiscountRule {
  const normalized = normalizeUnifiedRule(rule);

  if (discountType === "free_shipping") {
    return syncRuleDependencies({
      ...normalized,
      logicType: "standard",
      discountClass: "shipping",
      offerKind: "free_shipping",
      rewardType: "free_shipping",
      discountPercent: 0,
    });
  }

  if (discountType === "free_gift") {
    return syncRuleDependencies({
      ...normalized,
      logicType: "standard",
      discountClass: "order",
      offerKind: "free_gift",
      rewardType: "gift_product",
      giftQuantity: Math.max(1, Math.trunc(Number(normalized.giftQuantity) || 1)),
      discountPercent: 0,
    });
  }

  if (discountType === "order_discount") {
    return syncRuleDependencies({
      ...normalized,
      logicType: "standard",
      discountClass: "order",
      offerKind: "percentage_discount",
      rewardType: "percentage_off",
      discountPercent: Math.max(1, Number(normalized.discountPercent) || 15),
    });
  }

  if (discountType === "bxgy") {
    return syncRuleDependencies({
      ...normalized,
      logicType: "bxgy",
      discountClass: "product",
      offerKind: "percentage_discount",
      conditionType: "item_quantity",
      rewardType: "percentage_off",
      count: Math.max(1, Math.trunc(Number(normalized.buyQuantity) || 2)),
      discountPercent: 100,
      buyQuantity: Math.max(1, Math.trunc(Number(normalized.buyQuantity) || 2)),
      getQuantity: Math.max(1, Math.trunc(Number(normalized.getQuantity) || 1)),
      maxUsesPerOrder: 1,
    });
  }

  return syncRuleDependencies({
    ...normalized,
    logicType: "standard",
    discountClass: "product",
    offerKind: "percentage_discount",
    rewardType: "percentage_off",
    discountPercent: Math.max(1, Number(normalized.discountPercent) || 15),
  });
}

export function syncRuleDependencies(rule: DiscountRule): DiscountRule {
  const normalized = normalizeUnifiedRule(rule);

  if (normalized.discountClass === "shipping") {
    return {
      ...normalized,
      offerKind: "free_shipping",
      rewardType: "free_shipping",
      discountPercent: 0,
      rewardProductIds: [],
      giftQuantity: undefined,
      logicType: "standard",
    };
  }

  if (normalized.rewardType === "free_shipping") {
    return {
      ...normalized,
      discountClass: "shipping",
      offerKind: "free_shipping",
      discountPercent: 0,
      rewardProductIds: [],
      giftQuantity: undefined,
      logicType: "standard",
    };
  }

  if (normalized.rewardType === "gift_product") {
    return {
      ...normalized,
      discountClass: "order",
      offerKind: "free_gift",
      discountPercent: 0,
      giftQuantity: Math.max(1, Math.trunc(Number(normalized.giftQuantity) || 1)),
      logicType: "standard",
    };
  }

  if (normalized.logicType === "bxgy") {
    const normalizedBuyQuantity = Math.max(1, Math.trunc(Number(normalized.buyQuantity) || 2));
    return {
      ...normalized,
      count: normalizedBuyQuantity,
      discountPercent: 100,
      discountClass: "product",
      offerKind: "percentage_discount",
      conditionType: "item_quantity",
      rewardType: "percentage_off",
      rewardProductIds: [],
      giftQuantity: undefined,
      buyQuantity: normalizedBuyQuantity,
      getQuantity: Math.max(1, Math.trunc(Number(normalized.getQuantity) || 1)),
      maxUsesPerOrder: 1,
    };
  }

  if (normalized.discountClass === "product") {
    return {
      ...normalized,
      offerKind: "percentage_discount",
      conditionType: "item_quantity",
      amountThreshold: undefined,
      rewardProductIds: [],
      giftQuantity: undefined,
      buyQuantity: undefined,
      getQuantity: undefined,
      maxUsesPerOrder: undefined,
    };
  }

  return {
    ...normalized,
    offerKind: "percentage_discount",
    rewardProductIds: [],
    giftQuantity: undefined,
    buyQuantity: undefined,
    getQuantity: undefined,
    maxUsesPerOrder: undefined,
  };
}

export function supportsCartAmountCondition(rule: DiscountRule): boolean {
  const normalized = normalizeUnifiedRule(rule);
  if (normalized.logicType === "bxgy") return false;
  if (
    normalized.discountClass === "order" &&
    (normalized.rewardType === "percentage_off" ||
      normalized.rewardType === "gift_product")
  ) {
    return true;
  }
  if (
    normalized.discountClass === "shipping" &&
    normalized.rewardType === "free_shipping"
  ) {
    return true;
  }
  return false;
}

export function getConditionTypeOptionsForRule(rule: DiscountRule) {
  return supportsCartAmountCondition(rule)
    ? CONDITION_TYPE_OPTIONS
    : CONDITION_TYPE_OPTIONS.filter((option) => option.value === "item_quantity");
}

export function isExecutableDiscountRule(rule: DiscountRule): boolean {
  const normalized = normalizeUnifiedRule(rule);
  if (
    normalized.logicType === "bxgy" &&
    normalized.discountClass === "product" &&
    normalized.conditionType === "item_quantity" &&
    normalized.rewardType === "percentage_off"
  ) {
    return (
      Number.isFinite(Number(normalized.buyQuantity)) &&
      Number(normalized.buyQuantity) >= 1 &&
      Number.isFinite(Number(normalized.getQuantity)) &&
      Number(normalized.getQuantity) >= 1
    );
  }
  if (
    normalized.discountClass === "product" &&
    normalized.conditionType === "item_quantity" &&
    normalized.rewardType === "percentage_off"
  ) {
    return true;
  }
  if (
    normalized.discountClass === "order" &&
    normalized.rewardType === "percentage_off" &&
    (normalized.conditionType === "item_quantity" ||
      normalized.conditionType === "cart_amount")
  ) {
    return true;
  }
  if (
    normalized.discountClass === "shipping" &&
    normalized.rewardType === "free_shipping" &&
    (normalized.conditionType === "item_quantity" ||
      normalized.conditionType === "cart_amount")
  ) {
    return true;
  }
  return false;
}

export function getRuleRewardOptions(discountClass: DiscountRule["discountClass"]) {
  if (discountClass === "shipping") {
    return REWARD_TYPE_OPTIONS.filter((option) => option.value === "free_shipping");
  }
  return REWARD_TYPE_OPTIONS.filter((option) => option.value !== "free_shipping");
}

export function getUnifiedRuleIssues(rules: DiscountRule[]): UnifiedRuleIssue[] {
  const normalizedRules = normalizeUnifiedRules(rules);
  const issues: UnifiedRuleIssue[] = [];

  normalizedRules.forEach((rule, index) => {
    const threshold =
      rule.conditionType === "cart_amount"
        ? Number(rule.amountThreshold) || 0
        : rule.count;

    if (rule.conditionType === "cart_amount" && !supportsCartAmountCondition(rule)) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message:
          "Cart amount triggers are currently supported only for order discounts, free gift rules, and free shipping rules.",
      });
    }

    if (rule.conditionType === "cart_amount" && threshold <= 0) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "Cart amount rules must use a threshold greater than 0.",
      });
    }

    if (rule.conditionType === "item_quantity" && rule.count < 1) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "Item quantity rules must use a quantity of at least 1.",
      });
    }

    if (
      !isSingleDiscountRule(rule) &&
      rule.rewardType === "percentage_off" &&
      rule.discountPercent <= 0
    ) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "Percentage rewards must use a discount greater than 0%.",
      });
    }

    if (rule.rewardType === "free_shipping" && rule.discountClass !== "shipping") {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "Free shipping rewards must use the Shipping discount class.",
      });
    }

    if (
      rule.logicType === "bxgy" &&
      (!Number.isFinite(Number(rule.buyQuantity)) || Number(rule.buyQuantity) < 1)
    ) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "BXGY rules must use a buy quantity of at least 1.",
      });
    }

    if (
      rule.logicType === "bxgy" &&
      (!Number.isFinite(Number(rule.getQuantity)) || Number(rule.getQuantity) < 1)
    ) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "BXGY rules must use a get quantity of at least 1.",
      });
    }
  });

  return issues;
}

export function getUnifiedRuleBlockingMessage(rules: DiscountRule[]): string | null {
  const issues = getUnifiedRuleIssues(rules).filter(
    (issue) => issue.severity === "error",
  );
  if (issues.length > 0) {
    return issues[0].message;
  }

  const unsupportedRule = normalizeUnifiedRules(rules).find(
    (rule) => !isExecutableDiscountRule(rule),
  );
  if (unsupportedRule) {
    if (unsupportedRule.rewardType === "gift_product") {
      return "Free gift is publish-ready in the dedicated Free Gift flow with a trigger pool and gift products. Unified gift-product rules inside the selected-products flow are still draft-only.";
    }
    return "Some rule combinations are not supported yet. Supported combinations are: product percentage by item quantity (including BXGY same-product free tiers with valid buy/get quantities), order percentage by item quantity or cart amount, and free shipping by item quantity or cart amount.";
  }

  return null;
}
