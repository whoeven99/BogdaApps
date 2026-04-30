import type {
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  DiscountRule,
  FreeGiftRule,
  BxgyDiscountRule,
} from "../../../utils/offerParsing";
import type { OfferTypeId } from "./offerTypeOptions";

export type UnifiedRuleType =
  | "quantity_break"
  | "order_discount"
  | "free_shipping"
  | "free_gift"
  | "bxgy"
  | "complete_bundle"
  | "subscription";

export type UnifiedRuleScope =
  | {
      kind: "selected_products";
    }
  | {
      kind: "shared_product_pool";
      productIds: string[];
    }
  | {
      kind: "buy_get_products";
      buyProductIds: string[];
      getProductIds: string[];
    }
  | {
      kind: "trigger_gift_products";
      triggerProductIds: string[];
      giftProductIds: string[];
    }
  | {
      kind: "bundle_bar_products";
      barId: string;
      productIds: string[];
    }
  | {
      kind: "subscription_products";
      productIds: string[];
    };

export type UnifiedRuleCondition =
  | {
      kind: "item_quantity";
      count: number;
    }
  | {
      kind: "cart_amount";
      amountThreshold: number;
    }
  | {
      kind: "buy_x_get_y";
      triggerCount: number;
      buyQuantity: number;
      getQuantity: number;
      maxUsesPerOrder: number;
    }
  | {
      kind: "bundle_completion";
      quantity: number;
    }
  | {
      kind: "subscription_toggle";
    };

export type UnifiedRuleReward =
  | {
      kind: "percentage_off";
      discountClass: "product" | "order";
      discountPercent: number;
    }
  | {
      kind: "free_shipping";
    }
  | {
      kind: "gift_product";
      giftQuantity: number;
    }
  | {
      kind: "bundle_pricing";
      pricingMode: CompleteBundleBar["pricing"]["mode"];
      pricingValue: number;
    }
  | {
      kind: "subscription_message";
      enabled: boolean;
    };

export type UnifiedRulePresentation = {
  title: string;
  subtitle: string;
  badge: string;
  isDefault: boolean;
};

export type UnifiedRulePublishSupport =
  | "supported"
  | "draft_only";

export type UnifiedRuleNode = {
  id: string;
  type: UnifiedRuleType;
  sourceOfferType: OfferTypeId;
  scope: UnifiedRuleScope;
  condition: UnifiedRuleCondition;
  reward: UnifiedRuleReward;
  presentation: UnifiedRulePresentation;
  publishSupport: UnifiedRulePublishSupport;
};

export type OfferTypeRuleCapability = {
  offerType: OfferTypeId;
  primaryRuleTypes: UnifiedRuleType[];
  scopeModel:
    | "selected_products"
    | "shared_product_pool"
    | "buy_get_products"
    | "trigger_gift_products"
    | "bundle_bar_products"
    | "subscription_products";
  publishSupport: UnifiedRulePublishSupport;
  notes: string;
};

export const OFFER_TYPE_RULE_CAPABILITIES: OfferTypeRuleCapability[] = [
  {
    offerType: "quantity-breaks-same",
    primaryRuleTypes: [
      "quantity_break",
      "order_discount",
      "free_shipping",
      "free_gift",
      "bxgy",
    ],
    scopeModel: "selected_products",
    publishSupport: "supported",
    notes:
      "Standard quantity/order/shipping rules are publishable; unified BXGY remains draft-only.",
  },
  {
    offerType: "quantity-breaks-different",
    primaryRuleTypes: ["quantity_break", "bxgy"],
    scopeModel: "shared_product_pool",
    publishSupport: "supported",
    notes: "Uses a shared product pool and mixed rule list.",
  },
  {
    offerType: "bxgy",
    primaryRuleTypes: ["bxgy"],
    scopeModel: "buy_get_products",
    publishSupport: "supported",
    notes: "Uses dedicated buy/get product scopes and bar-level reward products.",
  },
  {
    offerType: "free-gift",
    primaryRuleTypes: ["free_gift", "free_shipping"],
    scopeModel: "trigger_gift_products",
    publishSupport: "supported",
    notes: "Trigger scope and gift scope are configured separately.",
  },
  {
    offerType: "complete-bundle",
    primaryRuleTypes: ["complete_bundle", "bxgy"],
    scopeModel: "bundle_bar_products",
    publishSupport: "supported",
    notes: "Complete-bundle components follow the current Step 2 component flow.",
  },
  {
    offerType: "subscription",
    primaryRuleTypes: ["subscription"],
    scopeModel: "subscription_products",
    publishSupport: "supported",
    notes: "Subscription messaging is configured as a Step 2 component.",
  },
];

export function getDiscountRuleType(rule: DiscountRule): UnifiedRuleType {
  if (rule.logicType === "bxgy") return "bxgy";
  if (rule.rewardType === "gift_product") return "free_gift";
  if (rule.rewardType === "free_shipping") return "free_shipping";
  if (rule.discountClass === "order") return "order_discount";
  return "quantity_break";
}

export function buildDiscountRuleCondition(rule: DiscountRule): UnifiedRuleCondition {
  if (rule.logicType === "bxgy") {
    return {
      kind: "buy_x_get_y",
      triggerCount: Math.max(1, Math.trunc(Number(rule.count) || 1)),
      buyQuantity: Math.max(1, Math.trunc(Number(rule.buyQuantity) || 2)),
      getQuantity: Math.max(1, Math.trunc(Number(rule.getQuantity) || 1)),
      maxUsesPerOrder: Math.max(1, Math.trunc(Number(rule.maxUsesPerOrder) || 1)),
    };
  }

  if (rule.conditionType === "cart_amount") {
    return {
      kind: "cart_amount",
      amountThreshold: Math.max(0, Number(rule.amountThreshold) || 0),
    };
  }

  return {
    kind: "item_quantity",
    count: Math.max(1, Math.trunc(Number(rule.count) || 1)),
  };
}

export function buildDiscountRuleReward(rule: DiscountRule): UnifiedRuleReward {
  if (rule.rewardType === "gift_product") {
    return {
      kind: "gift_product",
      giftQuantity: Math.max(1, Math.trunc(Number(rule.giftQuantity) || 1)),
    };
  }

  if (rule.rewardType === "free_shipping") {
    return {
      kind: "free_shipping",
    };
  }

  return {
    kind: "percentage_off",
    discountClass: rule.discountClass === "order" ? "order" : "product",
    discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
  };
}

export function buildDiscountRulePresentation(rule: DiscountRule): UnifiedRulePresentation {
  return {
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
  };
}

export function getRuleCapability(offerType: OfferTypeId): OfferTypeRuleCapability {
  return OFFER_TYPE_RULE_CAPABILITIES.find(
    (entry) => entry.offerType === offerType,
  ) as OfferTypeRuleCapability;
}

export function getUnifiedRuleTypeLabel(type: UnifiedRuleType): string {
  switch (type) {
    case "quantity_break":
      return "Quantity Break";
    case "order_discount":
      return "Order Discount";
    case "free_shipping":
      return "Free Shipping";
    case "free_gift":
      return "Free Gift";
    case "bxgy":
      return "BXGY";
    case "complete_bundle":
      return "Complete Bundle";
    case "subscription":
      return "Subscription";
    default:
      return "Rule";
  }
}

export function describeUnifiedRuleScope(scope: UnifiedRuleScope): string {
  switch (scope.kind) {
    case "selected_products":
      return "Selected products";
    case "shared_product_pool":
      return `${scope.productIds.length} products in shared pool`;
    case "buy_get_products":
      return `${scope.buyProductIds.length} products in global Buy pool, ${scope.getProductIds.length} reward products in this bar`;
    case "trigger_gift_products":
      return `${scope.triggerProductIds.length} products in global trigger pool, ${scope.giftProductIds.length} gift products in this bar`;
    case "bundle_bar_products":
      return `${scope.productIds.length} products in this bundle bar`;
    case "subscription_products":
      return `${scope.productIds.length} subscription products`;
    default:
      return "Scope";
  }
}

export function describeUnifiedRuleCondition(condition: UnifiedRuleCondition): string {
  switch (condition.kind) {
    case "item_quantity":
      return `Item quantity >= ${condition.count}`;
    case "cart_amount":
      return `Cart amount >= ${condition.amountThreshold}`;
    case "buy_x_get_y":
      return `Buy ${condition.buyQuantity}, get ${condition.getQuantity}, trigger at ${condition.triggerCount}`;
    case "bundle_completion":
      return `Complete bundle quantity ${condition.quantity}`;
    case "subscription_toggle":
      return "Subscription mode toggle";
    default:
      return "Condition";
  }
}

export function describeUnifiedRuleReward(reward: UnifiedRuleReward): string {
  switch (reward.kind) {
    case "percentage_off":
      return `${reward.discountClass} discount ${reward.discountPercent}%`;
    case "free_shipping":
      return "Free shipping";
    case "gift_product":
      return `${reward.giftQuantity} gift item${reward.giftQuantity === 1 ? "" : "s"}`;
    case "bundle_pricing":
      return `${reward.pricingMode} (${reward.pricingValue})`;
    case "subscription_message":
      return reward.enabled ? "Subscription message enabled" : "Subscription message disabled";
    default:
      return "Reward";
  }
}

export function getPublishSupportLabel(support: UnifiedRulePublishSupport): string {
  switch (support) {
    case "supported":
      return "Publish-ready";
    case "draft_only":
      return "Draft only";
    default:
      return "Support";
  }
}

export type ExistingRuleSets = {
  offerType: OfferTypeId;
  selectedProductIds: string[];
  buyProductIds: string[];
  getProductIds: string[];
  freeGiftTriggerProductIds: string[];
  freeGiftGiftProductIds: string[];
  discountRules: DiscountRule[];
  bxgyDiscountRules: BxgyDiscountRule[];
  freeGiftRules: FreeGiftRule[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  completeBundleBars: CompleteBundleBar[];
  subscriptionEnabled: boolean;
};
