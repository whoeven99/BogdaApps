import type {
  BxgyDiscountRule,
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  DiscountRule,
  FreeGiftRule,
} from "../../../utils/offerParsing";
import type { OfferTypeId } from "./offerTypeOptions";
import {
  buildDiscountRuleCondition,
  buildDiscountRulePresentation,
  buildDiscountRuleReward,
  getDiscountRuleType,
  type ExistingRuleSets,
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";

function buildNodeId(prefix: string, index: number, fallback?: string) {
  return fallback || `${prefix}-${index + 1}`;
}

function buildBasePresentation(rule: {
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
}) {
  return {
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
  };
}

export function adaptDiscountRules(
  offerType: OfferTypeId,
  rules: DiscountRule[],
): UnifiedRuleNode[] {
  return rules.map((rule, index) => ({
    id: buildNodeId("discount-rule", index, rule.id),
    type: getDiscountRuleType(rule),
    sourceOfferType: offerType,
    scope: {
      kind: "selected_products",
    },
    condition: buildDiscountRuleCondition(rule),
    reward: buildDiscountRuleReward(rule),
    presentation: buildDiscountRulePresentation(rule),
    publishSupport: rule.logicType === "bxgy" ? "draft_only" : "supported",
  }));
}

export function adaptBxgyRules(
  rules: BxgyDiscountRule[],
  buyProductIds: string[],
  fallbackGetProductIds: string[],
): UnifiedRuleNode[] {
  return rules.map((rule, index) => ({
    id: buildNodeId("bxgy-rule", index),
    type: "bxgy",
    sourceOfferType: "bxgy",
    scope: {
      kind: "buy_get_products",
      buyProductIds,
      getProductIds:
        Array.isArray(rule.getProductIds) && rule.getProductIds.length > 0
          ? rule.getProductIds
          : fallbackGetProductIds,
    },
    condition: {
      kind: "buy_x_get_y",
      triggerCount: Math.max(1, Math.trunc(Number(rule.count) || 1)),
      buyQuantity: Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1)),
      getQuantity: Math.max(1, Math.trunc(Number(rule.getQuantity) || 1)),
      maxUsesPerOrder: Math.max(1, Math.trunc(Number(rule.maxUsesPerOrder) || 1)),
    },
    reward: {
      kind: "percentage_off",
      discountClass: "product",
      discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
    },
    presentation: buildBasePresentation(rule),
    publishSupport: "supported",
  }));
}

export function adaptFreeGiftRules(
  rules: FreeGiftRule[],
  triggerProductIds: string[],
  fallbackGiftProductIds: string[],
): UnifiedRuleNode[] {
  return rules.map((rule, index) => ({
    id: buildNodeId("free-gift-rule", index),
    type: "free_gift",
    sourceOfferType: "free-gift",
    scope: {
      kind: "trigger_gift_products",
      triggerProductIds,
      giftProductIds:
        Array.isArray(rule.giftProductIds) && rule.giftProductIds.length > 0
          ? rule.giftProductIds
          : fallbackGiftProductIds,
    },
    condition: {
      kind: "item_quantity",
      count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
    },
    reward: {
      kind: "gift_product",
      giftQuantity: Math.max(1, Math.trunc(Number(rule.giftQuantity) || 1)),
    },
    presentation: buildBasePresentation(rule),
    publishSupport: "supported",
  }));
}

export function adaptDifferentProductsRules(
  rules: DifferentProductsDiscountRule[],
): UnifiedRuleNode[] {
  return rules.map((rule, index) => ({
    id: buildNodeId("different-products-rule", index),
    type: rule.tierType === "bxgy" ? "bxgy" : "quantity_break",
    sourceOfferType: "quantity-breaks-different",
    scope:
      rule.tierType === "bxgy"
        ? {
            kind: "buy_get_products" as const,
            buyProductIds: rule.buyProductIds,
            getProductIds: rule.getProductIds.length > 0 ? rule.getProductIds : rule.buyProductIds,
          }
        : {
            kind: "shared_product_pool" as const,
            productIds: rule.buyProductIds,
          },
    condition:
      rule.tierType === "bxgy"
        ? {
            kind: "buy_x_get_y" as const,
            triggerCount: Math.max(1, Math.trunc(Number(rule.count) || 1)),
            buyQuantity: Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1)),
            getQuantity: Math.max(1, Math.trunc(Number(rule.getQuantity) || 1)),
            maxUsesPerOrder: Math.max(1, Math.trunc(Number(rule.maxUsesPerOrder) || 1)),
          }
        : {
            kind: "item_quantity" as const,
            count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
          },
    reward: {
      kind: "percentage_off",
      discountClass: "product",
      discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
    },
    presentation: buildBasePresentation(rule),
    publishSupport: "supported",
  }));
}

export function adaptCompleteBundleBars(
  bars: CompleteBundleBar[],
): UnifiedRuleNode[] {
  return bars.map((bar, index) => ({
    id: buildNodeId("complete-bundle-bar", index, bar.id),
    type: bar.type === "bxgy" ? "bxgy" : "complete_bundle",
    sourceOfferType: "complete-bundle",
    scope: {
      kind: "bundle_bar_products",
      barId: bar.id,
      productIds: bar.products.map((product) => String(product.productId)),
    },
    condition:
      bar.type === "bxgy"
        ? {
            kind: "buy_x_get_y",
            triggerCount: Math.max(1, Math.trunc(Number(bar.quantity) || 1)),
            buyQuantity: Math.max(1, Math.trunc(Number(bar.quantity) || 1)),
            getQuantity: 1,
            maxUsesPerOrder: 1,
          }
        : {
            kind: "bundle_completion",
            quantity: Math.max(1, Math.trunc(Number(bar.quantity) || 1)),
          },
    reward: {
      kind: "bundle_pricing",
      pricingMode: bar.pricing.mode,
      pricingValue: Number(bar.pricing.value) || 0,
    },
    presentation: buildBasePresentation(bar),
    publishSupport: "supported",
  }));
}

export function adaptSubscriptionRule(
  selectedProductIds: string[],
  enabled: boolean,
): UnifiedRuleNode[] {
  return [
    {
      id: "subscription-rule",
      type: "subscription",
      sourceOfferType: "subscription",
      scope: {
        kind: "subscription_products",
        productIds: selectedProductIds,
      },
      condition: {
        kind: "subscription_toggle",
      },
      reward: {
        kind: "subscription_message",
        enabled,
      },
      presentation: {
        title: "Subscription",
        subtitle: "",
        badge: "",
        isDefault: enabled,
      },
      publishSupport: "supported",
    },
  ];
}

export function buildUnifiedRulesSnapshot(
  input: ExistingRuleSets,
): UnifiedRuleNode[] {
  switch (input.offerType) {
    case "bxgy":
      return adaptBxgyRules(
        input.bxgyDiscountRules,
        input.buyProductIds,
        input.getProductIds,
      );
    case "free-gift":
      return adaptFreeGiftRules(
        input.freeGiftRules,
        input.freeGiftTriggerProductIds,
        input.freeGiftGiftProductIds,
      );
    case "quantity-breaks-different":
      return adaptDifferentProductsRules(input.differentProductsDiscountRules);
    case "complete-bundle":
      return adaptCompleteBundleBars(input.completeBundleBars);
    case "subscription":
      return adaptSubscriptionRule(
        input.selectedProductIds,
        input.subscriptionEnabled,
      );
    case "quantity-breaks-same":
    default:
      return adaptDiscountRules(input.offerType, input.discountRules);
  }
}
