import {
  buildBxgyDiscountRulesJson,
  buildDiscountRulesPayloadForOfferType,
  buildDifferentProductsDiscountRulesJson,
  buildFreeGiftRulesJson,
  isCompleteBundleSingleBar,
  buildSelectedProductsPayloadForOfferType,
} from "../../../utils/offerParsing";
import type { CampaignDraft, DraftDiscountRule } from "./campaignDraft";
import type { OfferTypeId } from "./offerTypeOptions";
import {
  getUnifiedRuleTypeLabel,
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";

export type CampaignBuilderRegistryContext = CampaignDraft;

type CampaignBuilderMeta = {
  logicBlockLabel: string;
  logicBlockDescription: string;
  stepTwoDescription: string;
};

type CampaignBuilderBehavior = {
  getScopeSummary?: (ctx: CampaignBuilderRegistryContext) => string;
  getLogicSummary?: (ctx: CampaignBuilderRegistryContext) => string;
  validateScopeAndLogicStep?: (
    ctx: CampaignBuilderRegistryContext,
  ) => string | null;
  validateFinalSubmitScopeAndLogic?: (
    ctx: CampaignBuilderRegistryContext,
  ) => string | null;
};

function getRulesBySource(
  ctx: CampaignBuilderRegistryContext,
  sourceOfferType: OfferTypeId,
): UnifiedRuleNode[] {
  return ctx.unifiedRulesSnapshot.filter(
    (rule) => rule.sourceOfferType === sourceOfferType,
  );
}

function countRulesByConditionKind(
  rules: UnifiedRuleNode[],
  kind: UnifiedRuleNode["condition"]["kind"],
): number {
  return rules.filter((rule) => rule.condition.kind === kind).length;
}

function filterRulesByConditionKind(
  rules: UnifiedRuleNode[],
  kind: UnifiedRuleNode["condition"]["kind"],
): UnifiedRuleNode[] {
  return rules.filter((rule) => rule.condition.kind === kind);
}

function filterRulesByRewardKind(
  rules: UnifiedRuleNode[],
  kind: UnifiedRuleNode["reward"]["kind"],
): UnifiedRuleNode[] {
  return rules.filter((rule) => rule.reward.kind === kind);
}

function filterRulesByScopeKind(
  rules: UnifiedRuleNode[],
  kind: UnifiedRuleNode["scope"]["kind"],
): UnifiedRuleNode[] {
  return rules.filter((rule) => rule.scope.kind === kind);
}

function getMaxPercentageReward(rules: UnifiedRuleNode[]): number {
  return rules.reduce((max, rule) => {
    if (rule.reward.kind !== "percentage_off") return max;
    return Math.max(max, Number(rule.reward.discountPercent) || 0);
  }, 0);
}

function getUniqueScopeProductCount(rules: UnifiedRuleNode[]): number {
  return new Set(
    rules.flatMap((rule) => {
      switch (rule.scope.kind) {
        case "selected_products":
          return [];
        case "shared_product_pool":
          return rule.scope.productIds;
        case "buy_get_products":
          return [...rule.scope.buyProductIds, ...rule.scope.getProductIds];
        case "trigger_gift_products":
          return [...rule.scope.triggerProductIds, ...rule.scope.giftProductIds];
        case "bundle_bar_products":
          return rule.scope.productIds;
        case "subscription_products":
          return rule.scope.productIds;
        default:
          return [];
      }
    }),
  ).size;
}

function getDefaultScopeSummary(ctx: CampaignBuilderRegistryContext): string {
  return `${ctx.selectedProductsData.length} selected products`;
}

function getDefaultLogicSummary(ctx: CampaignBuilderRegistryContext): string {
  const rules = getRulesBySource(ctx, ctx.offerType).filter(
    (rule) => rule.type !== "single_purchase",
  );
  const bxgyTierCount = rules.filter((rule) => rule.type === "bxgy").length;
  const standardRuleCount = rules.length - bxgyTierCount;
  const amountRuleCount = countRulesByConditionKind(rules, "cart_amount");
  const quantityRuleCount = standardRuleCount - amountRuleCount;
  const bestDiscount = getMaxPercentageReward(rules);
  const standardSummary =
    amountRuleCount > 0
      ? `${quantityRuleCount} quantity rules, ${amountRuleCount} amount rules`
      : `${standardRuleCount} standard rules`;
  return bxgyTierCount > 0
    ? `${standardSummary}, ${bxgyTierCount} BXGY tiers, up to ${bestDiscount}% off`
    : `${standardSummary}, up to ${bestDiscount}% off`;
}

function getDefaultScopeAndLogicValidation(
  ctx: CampaignBuilderRegistryContext,
): string | null {
  return ctx.selectedProductsData.length === 0
    ? "Please select at least one product."
    : null;
}

function getCompleteBundleRules(
  ctx: CampaignBuilderRegistryContext,
): UnifiedRuleNode[] {
  return filterRulesByRewardKind(
    filterRulesByConditionKind(
      filterRulesByScopeKind(
        getRulesBySource(ctx, "complete-bundle").filter(
          (rule) => rule.type === "complete_bundle",
        ),
        "bundle_bar_products",
      ),
      "bundle_completion",
    ),
    "bundle_pricing",
  );
}

function getCompleteBundleValidationState(ctx: CampaignBuilderRegistryContext) {
  const hasNoTriggerProducts = ctx.selectedProductsData.length === 0;
  const triggerIds = new Set(
    ctx.selectedProductsData.map((product) => String(product.id || "")),
  );
  const hasInvalidBar = ctx.completeBundleBars.some((bar) => {
    if (isCompleteBundleSingleBar(bar)) {
      return false;
    }
    const min = Math.max(1, Math.trunc(Number(bar.minQuantity) || 1));
    const max = Math.max(
      min,
      Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
    );
    const overlapsTrigger = bar.products.some((product) =>
      triggerIds.has(String(product.productId || "")),
    );
    return !bar.products?.length || bar.products.length < min || max < min || overlapsTrigger;
  });
  return {
    hasNoTriggerProducts,
    hasInvalidBar,
  };
}

function getCompleteBundleScopedProductCount(rules: UnifiedRuleNode[]): number {
  return new Set(
    rules.flatMap((rule) =>
      rule.scope.kind === "bundle_bar_products" ? rule.scope.productIds : [],
    ),
  ).size;
}

function getFreeGiftRules(ctx: CampaignBuilderRegistryContext): UnifiedRuleNode[] {
  return filterRulesByRewardKind(
    filterRulesByScopeKind(
      getRulesBySource(ctx, "free-gift").filter(
        (rule) => rule.type === "free_gift",
      ),
      "trigger_gift_products",
    ),
    "gift_product",
  );
}

function getFreeGiftRewardBarCount(rules: UnifiedRuleNode[]): number {
  return rules.filter(
    (rule) =>
      rule.scope.kind === "trigger_gift_products" &&
      rule.scope.giftProductIds.length > 0,
  ).length;
}

function getFreeGiftRewardProductCount(rules: UnifiedRuleNode[]): number {
  return new Set(
    rules.flatMap((rule) =>
      rule.scope.kind === "trigger_gift_products" ? rule.scope.giftProductIds : [],
    ),
  ).size;
}

function getFreeGiftTriggerProductCount(
  ctx: CampaignBuilderRegistryContext,
  rules: UnifiedRuleNode[],
): number {
  const firstGiftRule = rules.find(
    (rule) => rule.scope.kind === "trigger_gift_products",
  );
  return firstGiftRule?.scope.kind === "trigger_gift_products"
    ? firstGiftRule.scope.triggerProductIds.length
    : ctx.freeGiftTriggerProducts.length;
}

function getMaxGiftQuantity(rules: UnifiedRuleNode[]): number {
  return rules.reduce((max, rule) => {
    if (rule.reward.kind !== "gift_product") return max;
    return Math.max(max, rule.reward.giftQuantity);
  }, 0);
}

function hasFreeGiftScopeGap(rules: UnifiedRuleNode[]): boolean {
  return rules.some(
    (rule) =>
      rule.scope.kind === "trigger_gift_products" &&
      (rule.scope.triggerProductIds.length === 0 ||
        rule.scope.giftProductIds.length === 0),
  );
}

const META_BY_OFFER_TYPE: Record<OfferTypeId, CampaignBuilderMeta> = {
  "quantity-breaks-same": {
    logicBlockLabel: "Quantity Breaks",
    logicBlockDescription:
      "Reward larger quantities of the same product with progressively better pricing.",
    stepTwoDescription:
      "Select the products in scope and define the pricing, order, shipping, or gift rules that drive the promotion.",
  },
  "shipping-discount": {
    logicBlockLabel: "Shipping Discount",
    logicBlockDescription:
      "Unlock free shipping with item-quantity or cart-amount rules across the selected product scope.",
    stepTwoDescription:
      "Select the trigger products, then configure the free-shipping tiers customers can unlock at checkout.",
  },
  "order-discount": {
    logicBlockLabel: "Order Discount",
    logicBlockDescription:
      "Unlock order-level percentage discounts with item-quantity or cart-amount rules across the selected product scope.",
    stepTwoDescription:
      "Select the trigger products, then configure the order-discount tiers customers can unlock once the scoped items qualify.",
  },
  coupon: {
    logicBlockLabel: "Coupon Offer",
    logicBlockDescription:
      "Require a shared coupon code before shoppers can unlock an order-level percentage discount.",
    stepTwoDescription:
      "Select the trigger products, then configure the order-discount tiers that become eligible after the shared coupon code is entered.",
  },
  "quantity-breaks-different": {
    logicBlockLabel: "Quantity Breaks",
    logicBlockDescription:
      "Configure quantity-break tiers for different product combinations while keeping the standard offer-card style.",
    stepTwoDescription:
      "Select the campaign products, then define each tier and the eligible product pool tied to that tier.",
  },
  bxgy: {
    logicBlockLabel: "Buy X, Get Y",
    logicBlockDescription:
      "Promote a same-product BXGY mechanic across the selected product pool, including free-item and total-item bundles.",
    stepTwoDescription:
      "Choose the BXGY product pool, then configure each bar as Buy X, Get Y with the quantity semantics you need.",
  },
  "complete-bundle": {
    logicBlockLabel: "Complete Bundle",
    logicBlockDescription:
      "Attach bundle-item pools to the current PDP product and discount the whole bundle together.",
    stepTwoDescription:
      "Select the trigger products, build each bundle bar, and control min/max bundle-item selection plus whole-bundle pricing.",
  },
  subscription: {
    logicBlockLabel: "Subscription",
    logicBlockDescription:
      "Show a subscription purchase mode alongside one-time purchase messaging.",
    stepTwoDescription:
      "Pick the products that participate and configure how subscription and one-time purchase options are presented.",
  },
  "free-gift": {
    logicBlockLabel: "Free Gift",
    logicBlockDescription:
      "Reward shoppers with a global trigger pool and bar-specific gift rewards.",
    stepTwoDescription:
      "Choose the global trigger pool, then configure gift products and quantities inside each free-gift bar. The current publish-ready path adds the gift line on storefront and discounts it in cart.",
  },
};

const BEHAVIOR_BY_OFFER_TYPE: Record<OfferTypeId, CampaignBuilderBehavior> = {
  "quantity-breaks-same": {},
  "shipping-discount": {
    getLogicSummary: (ctx) => {
      const shippingRules = getRulesBySource(ctx, "shipping-discount").filter(
        (rule) => rule.reward.kind === "free_shipping",
      );
      const amountRules = countRulesByConditionKind(shippingRules, "cart_amount");
      const quantityRules = shippingRules.length - amountRules;
      return `${shippingRules.length} shipping tier${shippingRules.length === 1 ? "" : "s"}, ${quantityRules} quantity, ${amountRules} amount`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "shipping-discount").length === 0
        ? "Please select campaign products and configure at least one free-shipping tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "shipping-discount").length === 0
        ? "Shipping discount offers require selected products and at least one free-shipping tier."
        : null,
  },
  "order-discount": {
    getLogicSummary: (ctx) => {
      const orderRules = getRulesBySource(ctx, "order-discount").filter(
        (rule) =>
          rule.reward.kind === "percentage_off" &&
          rule.reward.discountClass === "order",
      );
      const amountRules = countRulesByConditionKind(orderRules, "cart_amount");
      const quantityRules = orderRules.length - amountRules;
      const bestDiscount = getMaxPercentageReward(orderRules);
      return `${orderRules.length} order tier${orderRules.length === 1 ? "" : "s"}, ${quantityRules} quantity, ${amountRules} amount, up to ${bestDiscount}% off`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "order-discount").length === 0
        ? "Please select campaign products and configure at least one order-discount tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "order-discount").length === 0
        ? "Order discount offers require selected products and at least one order-discount tier."
        : null,
  },
  coupon: {
    getLogicSummary: (ctx) => {
      const orderRules = getRulesBySource(ctx, "coupon").filter(
        (rule) =>
          rule.reward.kind === "percentage_off" &&
          rule.reward.discountClass === "order",
      );
      const bestDiscount = getMaxPercentageReward(orderRules);
      return `${orderRules.length} coupon tier${orderRules.length === 1 ? "" : "s"}, shared code gating, up to ${bestDiscount}% off`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "coupon").length === 0
        ? "Please select campaign products and configure at least one coupon discount tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "coupon").length === 0
        ? "Coupon offers require selected products and at least one coupon discount tier."
        : null,
  },
  "quantity-breaks-different": {
    getScopeSummary: (ctx) =>
      `${ctx.selectedProductsData.length} products available for tier product pools`,
    getLogicSummary: (ctx) => {
      const rules = getRulesBySource(ctx, "quantity-breaks-different");
      const uniqueScopedProducts = getUniqueScopeProductCount(rules);
      return `${rules.length} quantity-break tiers across ${uniqueScopedProducts} scoped products`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "quantity-breaks-different").length === 0
        ? "Please select campaign products and configure at least one quantity-break tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      getRulesBySource(ctx, "quantity-breaks-different").length === 0
        ? "Quantity breaks for different products require campaign products and at least one configured tier."
        : null,
  },
  bxgy: {
    getScopeSummary: (ctx) =>
      `${getUniqueScopeProductCount(getRulesBySource(ctx, "bxgy"))} products in the BXGY pool`,
    getLogicSummary: (ctx) => {
      const rules = getRulesBySource(ctx, "bxgy");
      const bestBundleQty = rules.reduce(
        (max, rule) =>
          rule.condition.kind === "buy_x_get_y"
            ? Math.max(max, Math.max(rule.condition.getQuantity, rule.condition.buyQuantity))
            : max,
        0,
      );
      return `${rules.length} BXGY bars, up to ${bestBundleQty} items in one bundle`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.buyProducts.length === 0 || getRulesBySource(ctx, "bxgy").length === 0
        ? "Please select the BXGY product pool and configure at least one BXGY bar."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.buyProducts.length === 0 || getRulesBySource(ctx, "bxgy").length === 0
        ? "For BXGY offers, you must configure the BXGY product pool and at least one BXGY bar."
        : null,
  },
  "complete-bundle": {
    getScopeSummary: (ctx) => {
      const completeBundleRules = getCompleteBundleRules(ctx);
      const uniqueProductCount =
        getCompleteBundleScopedProductCount(completeBundleRules);
      return `${ctx.selectedProductsData.length} trigger products, ${uniqueProductCount} bundle items`;
    },
    getLogicSummary: (ctx) => {
      const completeBundleRules = getCompleteBundleRules(ctx);
      return `${completeBundleRules.length} complete-bundle bar${completeBundleRules.length === 1 ? "" : "s"} with trigger + whole-bundle pricing`;
    },
    validateScopeAndLogicStep: (ctx) => {
      const { hasNoTriggerProducts, hasInvalidBar } =
        getCompleteBundleValidationState(ctx);
      const completeBundleRules = getCompleteBundleRules(ctx);
      return hasNoTriggerProducts ||
        hasInvalidBar ||
        completeBundleRules.length === 0
        ? "Please select trigger products, keep bundle-item pools different from the trigger product, and make sure every bar has enough items for its min/max rule."
        : null;
    },
    validateFinalSubmitScopeAndLogic: (ctx) => {
      const { hasNoTriggerProducts, hasInvalidBar } =
        getCompleteBundleValidationState(ctx);
      const completeBundleRules = getCompleteBundleRules(ctx);
      return hasNoTriggerProducts ||
        completeBundleRules.length === 0 ||
        hasInvalidBar
        ? "Complete bundle offers require trigger products, bundle-item pools that exclude the trigger product, and valid min/max item limits in every bar."
        : null;
    },
  },
  subscription: {
    getLogicSummary: (ctx) =>
      ctx.subscriptionEnabled
        ? `Subscription enabled for ${ctx.selectedProductsData.length} products`
        : "Subscription block configured but disabled",
    validateFinalSubmitScopeAndLogic: () => null,
  },
  "free-gift": {
    getScopeSummary: (ctx) => {
      const freeGiftRules = getFreeGiftRules(ctx);
      return `${getFreeGiftTriggerProductCount(ctx, freeGiftRules)} products in the global trigger pool, ${getFreeGiftRewardBarCount(freeGiftRules)} bars with gift products`;
    },
    getLogicSummary: (ctx) => {
      const freeGiftRules = getFreeGiftRules(ctx);
      const bestGiftQty = getMaxGiftQuantity(freeGiftRules);
      return `${freeGiftRules.length} gift bars, ${getFreeGiftRewardProductCount(freeGiftRules)} reward products, up to ${bestGiftQty} free gift${bestGiftQty > 1 ? "s" : ""}`;
    },
    validateScopeAndLogicStep: (ctx) => {
      const freeGiftRules = getFreeGiftRules(ctx);
      return freeGiftRules.length === 0 || hasFreeGiftScopeGap(freeGiftRules)
        ? "Please configure the global trigger pool, the shared gift product pool, and at least one free-gift bar."
        : null;
    },
    validateFinalSubmitScopeAndLogic: (ctx) => {
      const freeGiftRules = getFreeGiftRules(ctx);
      return freeGiftRules.length === 0 || hasFreeGiftScopeGap(freeGiftRules)
        ? "Free gift offers require a global trigger pool, a shared gift product pool, and at least one bar."
        : null;
    },
  },
};

function getCampaignBuilderBehavior(
  offerType: OfferTypeId,
): CampaignBuilderBehavior {
  return BEHAVIOR_BY_OFFER_TYPE[offerType];
}

export function getCampaignBuilderMeta(
  offerType: OfferTypeId,
): CampaignBuilderMeta {
  return META_BY_OFFER_TYPE[offerType];
}

export function getCampaignScopeSummary(
  ctx: CampaignBuilderRegistryContext,
): string {
  return (
    getCampaignBuilderBehavior(ctx.offerType).getScopeSummary?.(ctx) ||
    getDefaultScopeSummary(ctx)
  );
}

export function getCampaignLogicSummary(
  ctx: CampaignBuilderRegistryContext,
): string {
  return (
    getCampaignBuilderBehavior(ctx.offerType).getLogicSummary?.(ctx) ||
    getDefaultLogicSummary(ctx)
  );
}

export function getCampaignRuleTypeSummary(
  ctx: CampaignBuilderRegistryContext,
): string {
  const uniqueTypes = Array.from(
    new Set(ctx.unifiedRulesSnapshot.map((rule) => rule.type)),
  );

  if (uniqueTypes.length === 0) {
    return "No rules yet";
  }

  return uniqueTypes.map((type) => getUnifiedRuleTypeLabel(type)).join(", ");
}

export function getCampaignPublishSupportSummary(
  ctx: CampaignBuilderRegistryContext,
): string {
  const publishStates = Array.from(
    new Set(
      ctx.unifiedRulesSnapshot
        .filter((rule) => rule.type !== "single_purchase")
        .map((rule) => rule.publishSupport),
    ),
  );

  if (publishStates.length === 0) {
    return "Add bars to continue";
  }

  if (publishStates.includes("draft_only")) {
    return "Contains draft-only bars";
  }

  return "Ready in current flow";
}

export function buildSelectedProductsPayload(
  ctx: CampaignBuilderRegistryContext,
): unknown {
  return buildSelectedProductsPayloadForOfferType({
    offerType: ctx.offerType,
    selectedProductsData: ctx.selectedProductsData,
    selectedProductIds: ctx.selectedProductsData.map((product) => String(product.id)),
    buyProducts: ctx.buyProducts,
    completeBundleBars: ctx.completeBundleBars,
    freeGiftTriggerProducts: ctx.freeGiftTriggerProducts,
    freeGiftSharedGiftProductIds: ctx.freeGiftSharedGiftProductIds,
  });
}

export function buildDiscountRulesPayload(
  ctx: CampaignBuilderRegistryContext,
  buildQuantityRulesJson: (rules: DraftDiscountRule[]) => unknown,
): unknown {
  return buildDiscountRulesPayloadForOfferType({
    offerType: ctx.offerType,
    quantityRulesPayload: buildQuantityRulesJson(ctx.discountRules),
    differentProductsRulesPayload: buildDifferentProductsDiscountRulesJson(
      ctx.differentProductsDiscountRules,
    ),
    bxgyRulesPayload: buildBxgyDiscountRulesJson(ctx.bxgyDiscountRules),
    freeGiftRulesPayload: buildFreeGiftRulesJson(ctx.freeGiftRules),
  });
}

export function validateScopeAndLogicStep(
  ctx: CampaignBuilderRegistryContext,
): string | null {
  return (
    getCampaignBuilderBehavior(ctx.offerType).validateScopeAndLogicStep?.(ctx) ||
    getDefaultScopeAndLogicValidation(ctx)
  );
}

export function validateFinalSubmitScopeAndLogic(
  ctx: CampaignBuilderRegistryContext,
): string | null {
  return (
    getCampaignBuilderBehavior(ctx.offerType).validateFinalSubmitScopeAndLogic?.(
      ctx,
    ) || null
  );
}
