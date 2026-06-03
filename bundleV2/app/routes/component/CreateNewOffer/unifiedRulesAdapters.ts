import type {
  CampaignConfig,
  BxgyDiscountRule,
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  DiscountRule,
  FreeGiftRule,
  QuantityBreakTier,
} from "../../../utils/offerParsing";
import {
  buildDraftRuleId,
  inferBxgySubtitleSource,
  inferBxgyTitleSource,
  inferCompleteBundleSubtitleSource,
  inferCompleteBundleTitleSource,
  inferDifferentProductsSubtitleSource,
  inferDifferentProductsTitleSource,
  getPrimaryOfferTypeFromCampaignConfig,
  isCompleteBundleSingleBar,
  isSingleBxgyRule,
  isSingleDifferentProductsRule,
  isSingleFreeGiftRule,
} from "../../../utils/offerParsing";
import type { OfferTypeId } from "./offerTypeOptions";
import {
  buildDiscountRuleCondition,
  buildDiscountRulePresentation,
  buildDiscountRuleReward,
  getDiscountRuleType,
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";
import { isExecutableDiscountRule } from "./unifiedRuleModel";

function buildNodeId(prefix: string, index: number, fallback?: string) {
  return fallback || `${prefix}-${index + 1}`;
}

function inferDefaultPresentationSource(value: string | undefined): "auto" | "custom" {
  return String(value || "").trim() ? "custom" : "auto";
}

function buildBasePresentation(rule: {
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
  sourceKind?: "bxgy" | "different_products" | "complete_bundle" | "default";
}) {
  const sourceKind = rule.sourceKind || "default";
  const inferredTitleSource =
    sourceKind === "bxgy"
      ? inferBxgyTitleSource(rule.title)
      : sourceKind === "different_products"
        ? inferDifferentProductsTitleSource(rule.title)
        : sourceKind === "complete_bundle"
          ? inferCompleteBundleTitleSource(rule.title)
          : inferDefaultPresentationSource(rule.title);
  const inferredSubtitleSource =
    sourceKind === "bxgy"
      ? inferBxgySubtitleSource(rule.subtitle)
      : sourceKind === "different_products"
        ? inferDifferentProductsSubtitleSource(rule.subtitle)
        : sourceKind === "complete_bundle"
          ? inferCompleteBundleSubtitleSource(rule.subtitle)
          : inferDefaultPresentationSource(rule.subtitle);
  return {
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    titleSource: rule.titleSource || inferredTitleSource,
    subtitleSource: rule.subtitleSource || inferredSubtitleSource,
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
  };
}

function buildDiscountRuleFromTier(
  tier: QuantityBreakTier,
  index: number,
): DiscountRule {
  return {
    id: tier.id || buildDraftRuleId("discount_rule"),
    count: Math.max(1, Math.trunc(Number(tier.qty) || 1)),
    discountPercent: Math.max(0, Math.min(100, Number(tier.discountPercent) || 0)),
    tierType: "standard",
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
    rewardProductIds: Array.isArray(tier.rewardProductIds) ? tier.rewardProductIds : [],
    giftQuantity: tier.giftQuantity,
    logicType: tier.logicType === "bxgy" ? "bxgy" : "standard",
    buyQuantity: tier.buyQuantity,
    getQuantity: tier.getQuantity,
    maxUsesPerOrder: tier.maxUsesPerOrder,
  };
}

function resolveQuantityBreakSourceOfferType(config: CampaignConfig): OfferTypeId {
  const primaryOfferType = getPrimaryOfferTypeFromCampaignConfig(config);
  if (
    primaryOfferType === "quantity-breaks-same" ||
    primaryOfferType === "shipping-discount" ||
    primaryOfferType === "order-discount" ||
    primaryOfferType === "coupon"
  ) {
    return primaryOfferType;
  }
  return "quantity-breaks-same";
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
    publishSupport: isExecutableDiscountRule(rule) ? "supported" : "draft_only",
  }));
}

export function adaptBxgyRules(
  rules: BxgyDiscountRule[],
  fallbackBuyProductIds: string[],
  fallbackGetProductIds: string[],
): UnifiedRuleNode[] {
  return rules.map((rule, index) => ({
    id: buildNodeId("bxgy-rule", index, rule.id),
    type: isSingleBxgyRule(rule) ? "single_purchase" : "bxgy",
    sourceOfferType: "bxgy",
    scope: {
      kind: "buy_get_products",
      buyProductIds:
        rule.buyProductIds.length > 0 ? rule.buyProductIds : fallbackBuyProductIds,
      getProductIds:
        rule.getProductIds.length > 0
          ? rule.getProductIds
          : fallbackGetProductIds.length > 0
            ? fallbackGetProductIds
            : rule.buyProductIds.length > 0
              ? rule.buyProductIds
              : fallbackBuyProductIds,
    },
    condition: isSingleBxgyRule(rule)
      ? {
          kind: "single_purchase",
        }
      : {
          kind: "buy_x_get_y",
          triggerCount: Math.max(1, Math.trunc(Number(rule.count) || 1)),
          buyQuantity: Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1)),
          getQuantity: Math.max(1, Math.trunc(Number(rule.getQuantity) || 1)),
          maxUsesPerOrder: Math.max(1, Math.trunc(Number(rule.maxUsesPerOrder) || 1)),
        },
    reward: isSingleBxgyRule(rule)
      ? {
          kind: "standard_price",
        }
      : {
          kind: "percentage_off",
          discountClass: "product",
          discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
        },
    presentation: buildBasePresentation({ ...rule, sourceKind: "bxgy" }),
    publishSupport: isSingleBxgyRule(rule) ? "draft_only" : "supported",
  }));
}

export function adaptFreeGiftRules(
  rules: FreeGiftRule[],
  triggerProductIds: string[],
  fallbackGiftProductIds: string[],
): UnifiedRuleNode[] {
  return rules.map((rule, index) => ({
    id: buildNodeId("free-gift-rule", index, rule.id),
    type: isSingleFreeGiftRule(rule) ? "single_purchase" : "free_gift",
    sourceOfferType: "free-gift",
    scope: {
      kind: "trigger_gift_products",
      triggerProductIds,
      giftProductIds:
        Array.isArray(rule.giftProductIds) && rule.giftProductIds.length > 0
          ? rule.giftProductIds
          : fallbackGiftProductIds,
    },
    condition: isSingleFreeGiftRule(rule)
      ? {
          kind: "single_purchase",
        }
      : {
          kind: "item_quantity",
          count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
        },
    reward: isSingleFreeGiftRule(rule)
      ? {
          kind: "standard_price",
        }
      : {
          kind: "gift_product",
          giftQuantity: Math.max(1, Math.trunc(Number(rule.giftQuantity) || 1)),
        },
    presentation: buildBasePresentation(rule),
    publishSupport: isSingleFreeGiftRule(rule) ? "draft_only" : "supported",
  }));
}

export function adaptDifferentProductsRules(
  rules: DifferentProductsDiscountRule[],
  fallbackSharedProductIds: string[] = [],
): UnifiedRuleNode[] {
  const sharedProductPoolIds = Array.from(
    new Set(fallbackSharedProductIds.map((id) => String(id || "").trim()).filter(Boolean)),
  );
  return rules.map((rule, index) => ({
    id: buildNodeId("different-products-rule", index, rule.id),
    type: isSingleDifferentProductsRule(rule)
      ? "single_purchase"
      : rule.tierType === "bxgy"
        ? "bxgy"
        : "quantity_break",
    sourceOfferType: "quantity-breaks-different",
    scope:
      isSingleDifferentProductsRule(rule)
        ? {
            kind: "shared_product_pool" as const,
            productIds: sharedProductPoolIds,
          }
        : rule.tierType === "bxgy"
        ? {
            kind: "buy_get_products" as const,
            buyProductIds: sharedProductPoolIds,
            getProductIds: sharedProductPoolIds,
          }
        : {
            kind: "shared_product_pool" as const,
            productIds: sharedProductPoolIds,
          },
    condition:
      isSingleDifferentProductsRule(rule)
        ? {
            kind: "single_purchase" as const,
          }
        : rule.tierType === "bxgy"
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
    reward: isSingleDifferentProductsRule(rule)
      ? {
          kind: "standard_price",
        }
      : {
          kind: "percentage_off",
          discountClass: "product",
          discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
        },
    presentation: buildBasePresentation({ ...rule, sourceKind: "different_products" }),
    publishSupport: isSingleDifferentProductsRule(rule) ? "draft_only" : "supported",
  }));
}

export function adaptCompleteBundleBars(
  bars: CompleteBundleBar[],
): UnifiedRuleNode[] {
  return bars.map((bar, index) =>
    isCompleteBundleSingleBar(bar)
      ? {
          id: buildNodeId("complete-bundle-bar", index, bar.id),
          type: "single_purchase",
          sourceOfferType: "complete-bundle",
          scope: {
            kind: "selected_products",
          },
          condition: {
            kind: "single_purchase",
          },
          reward: {
            kind: "standard_price",
          },
          presentation: buildBasePresentation({ ...bar, sourceKind: "complete_bundle" }),
          publishSupport: "supported",
        }
      : {
          id: buildNodeId("complete-bundle-bar", index, bar.id),
          type: "complete_bundle",
          sourceOfferType: "complete-bundle",
          scope: {
            kind: "bundle_bar_products",
            barId: bar.id,
            productIds: bar.products.map((product) => String(product.productId)),
          },
          condition: {
            kind: "bundle_completion",
            quantity: Math.max(1, Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1)),
          },
          reward: {
            kind: "bundle_pricing",
            pricingMode: bar.pricing.mode,
            pricingValue: Number(bar.pricing.value) || 0,
          },
          presentation: buildBasePresentation({ ...bar, sourceKind: "complete_bundle" }),
          publishSupport: "supported",
        },
  );
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
        titleSource: "custom",
        subtitleSource: "auto",
        badge: "",
        isDefault: enabled,
      },
      publishSupport: "supported",
    },
  ];
}

export function buildUnifiedRulesSnapshotFromCampaignConfig(
  config: CampaignConfig | null,
): UnifiedRuleNode[] {
  if (!config) return [];

  const quantityBreakOfferType = resolveQuantityBreakSourceOfferType(config);

  return config.logicBlocks.flatMap((block) => {
    switch (block.type) {
      case "quantity-breaks":
        return adaptDiscountRules(
          quantityBreakOfferType,
          block.config.tiers.map((tier, index) => buildDiscountRuleFromTier(tier, index)),
        );
      case "quantity-breaks-different":
        return adaptDifferentProductsRules(block.config.tiers);
      case "bxgy": {
        const fallbackBuyProductIds = Array.from(
          new Set(
            block.config.tiers.flatMap((rule) =>
              Array.isArray(rule.buyProductIds) ? rule.buyProductIds : [],
            ),
          ),
        );
        const fallbackGetProductIds = Array.from(
          new Set(
            block.config.tiers.flatMap((rule) =>
              Array.isArray(rule.getProductIds) ? rule.getProductIds : [],
            ),
          ),
        );
        return adaptBxgyRules(
          block.config.tiers,
          fallbackBuyProductIds,
          fallbackGetProductIds,
        );
      }
      case "free-gift":
        return adaptFreeGiftRules(
          block.config.tiers,
          block.config.triggerProductIds,
          block.config.giftProductIds,
        );
      case "complete-bundle":
        return adaptCompleteBundleBars(block.config.bars);
      case "subscription":
        return adaptSubscriptionRule(block.config.productIds, block.config.enabled);
      default:
        return [];
    }
  });
}
