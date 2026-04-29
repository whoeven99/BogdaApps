import type { DiscountRule } from "../../../utils/offerParsing";

export const DISCOUNT_CLASS_OPTIONS = [
  { label: "Product discount", value: "product" },
  { label: "Order discount", value: "order" },
  { label: "Shipping discount", value: "shipping" },
] as Array<{ label: string; value: "product" | "order" | "shipping" }>;

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
  const discountClass =
    rule.discountClass === "order" || rule.discountClass === "shipping"
      ? rule.discountClass
      : "product";
  const conditionType =
    rule.conditionType === "cart_amount" ? "cart_amount" : "item_quantity";
  const rewardType =
    rule.rewardType === "gift_product" || rule.rewardType === "free_shipping"
      ? rule.rewardType
      : "percentage_off";

  return {
    id: rule.id || buildRuleId(),
    count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
    discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
    discountClass,
    offerKind:
      rule.offerKind === "free_gift" || rule.offerKind === "free_shipping"
        ? rule.offerKind
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
    | "free_gift",
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
      discountClass: "product",
      offerKind: "free_gift",
      conditionType: "item_quantity",
      rewardType: "gift_product",
      giftQuantity: 1,
      rewardProductIds: [],
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
    };
  }

  if (normalized.rewardType === "gift_product") {
    return {
      ...normalized,
      discountClass: "product",
      offerKind: "free_gift",
      discountPercent: 0,
      giftQuantity: Math.max(1, Math.trunc(Number(normalized.giftQuantity) || 1)),
    };
  }

  return {
    ...normalized,
    offerKind: "percentage_discount",
    rewardProductIds: [],
    giftQuantity: undefined,
  };
}

export function isExecutableDiscountRule(rule: DiscountRule): boolean {
  const normalized = normalizeUnifiedRule(rule);
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
  const seenKeys = new Map<string, number>();

  normalizedRules.forEach((rule, index) => {
    const threshold =
      rule.conditionType === "cart_amount"
        ? Number(rule.amountThreshold) || 0
        : rule.count;

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

    if (rule.rewardType === "percentage_off" && rule.discountPercent <= 0) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "Percentage rewards must use a discount greater than 0%.",
      });
    }

    if (rule.rewardType === "gift_product") {
      if (rule.discountClass !== "product") {
        issues.push({
          ruleIndex: index,
          severity: "error",
          message: "Gift product rewards must use the Product discount class.",
        });
      }
      if (!rule.rewardProductIds?.length) {
        issues.push({
          ruleIndex: index,
          severity: "error",
          message: "Gift product rewards must select at least one reward product.",
        });
      }
    }

    if (rule.rewardType === "free_shipping" && rule.discountClass !== "shipping") {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: "Free shipping rewards must use the Shipping discount class.",
      });
    }

    const duplicateKey = [
      rule.discountClass,
      rule.conditionType,
      threshold,
      rule.rewardType,
      rule.discountPercent,
      (rule.rewardProductIds || []).join(","),
      rule.giftQuantity || 0,
    ].join("|");

    if (seenKeys.has(duplicateKey)) {
      issues.push({
        ruleIndex: index,
        severity: "error",
        message: `Rule ${index + 1} duplicates rule ${seenKeys.get(duplicateKey)! + 1}.`,
      });
    } else {
      seenKeys.set(duplicateKey, index);
    }

    if (!isExecutableDiscountRule(rule)) {
      issues.push({
        ruleIndex: index,
        severity: "warning",
        message:
          "This rule is captured in the new rule model, but the current execution layer does not fully support this combination yet.",
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
    return "Gift product rewards and other unsupported combinations cannot be published yet. Supported combinations are: product percentage by item quantity, order percentage by item quantity or cart amount, and free shipping by item quantity or cart amount.";
  }

  return null;
}
