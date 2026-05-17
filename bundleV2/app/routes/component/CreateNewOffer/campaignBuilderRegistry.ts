import {
  buildBxgyDiscountRulesJson,
  buildDiscountRulesPayloadForOfferType,
  buildDifferentProductsDiscountRulesJson,
  buildFreeGiftRulesJson,
  buildSelectedProductsPayloadForOfferType,
  getBxgyDisplayMeta,
} from "../../../utils/offerParsing";
import type { CampaignDraft, DraftDiscountRule } from "./campaignDraft";
import type { OfferTypeId } from "./offerTypeOptions";
import {
  getUnifiedRuleTypeLabel,
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

function getDefaultScopeSummary(ctx: CampaignBuilderRegistryContext): string {
  return `${ctx.selectedProductsData.length} selected products`;
}

function getDefaultLogicSummary(ctx: CampaignBuilderRegistryContext): string {
  const bxgyTierCount = ctx.normalizedDiscountRules.filter(
    (rule) => rule.logicType === "bxgy",
  ).length;
  const standardRuleCount = ctx.normalizedDiscountRules.length - bxgyTierCount;
  const amountRuleCount = ctx.normalizedDiscountRules.filter(
    (rule) =>
      rule.logicType !== "bxgy" && rule.conditionType === "cart_amount",
  ).length;
  const quantityRuleCount = standardRuleCount - amountRuleCount;
  const bestDiscount = ctx.normalizedDiscountRules.reduce(
    (max, rule) => Math.max(max, rule.discountPercent),
    0,
  );
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

function getCompleteBundleValidationState(ctx: CampaignBuilderRegistryContext) {
  const hasNoTriggerProducts = ctx.selectedProductsData.length === 0;
  const triggerIds = new Set(
    ctx.selectedProductsData.map((product) => String(product.id || "")),
  );
  const hasInvalidBar = ctx.completeBundleBars.some((bar) => {
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

function getFreeGiftRewardBarCount(ctx: CampaignBuilderRegistryContext) {
  return ctx.freeGiftRules.filter(
    (rule) =>
      Array.isArray(rule.giftProductIds) && rule.giftProductIds.length > 0
        ? true
        : ctx.freeGiftSharedGiftProductIds.length > 0,
  ).length;
}

function getFreeGiftRewardProductCount(ctx: CampaignBuilderRegistryContext) {
  return new Set(
    [
      ...ctx.freeGiftSharedGiftProductIds,
      ...ctx.freeGiftRules.flatMap((rule) =>
        Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
      ),
    ],
  ).size;
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
      const shippingRules = ctx.normalizedDiscountRules.filter(
        (rule) => rule.rewardType === "free_shipping",
      );
      const amountRules = shippingRules.filter(
        (rule) => rule.conditionType === "cart_amount",
      ).length;
      const quantityRules = shippingRules.length - amountRules;
      return `${shippingRules.length} shipping tier${shippingRules.length === 1 ? "" : "s"}, ${quantityRules} quantity, ${amountRules} amount`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 || ctx.normalizedDiscountRules.length === 0
        ? "Please select campaign products and configure at least one free-shipping tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 || ctx.normalizedDiscountRules.length === 0
        ? "Shipping discount offers require selected products and at least one free-shipping tier."
        : null,
  },
  "order-discount": {
    getLogicSummary: (ctx) => {
      const orderRules = ctx.normalizedDiscountRules.filter(
        (rule) => rule.discountClass === "order" && rule.rewardType === "percentage_off",
      );
      const amountRules = orderRules.filter(
        (rule) => rule.conditionType === "cart_amount",
      ).length;
      const quantityRules = orderRules.length - amountRules;
      const bestDiscount = orderRules.reduce(
        (max, rule) => Math.max(max, Number(rule.discountPercent) || 0),
        0,
      );
      return `${orderRules.length} order tier${orderRules.length === 1 ? "" : "s"}, ${quantityRules} quantity, ${amountRules} amount, up to ${bestDiscount}% off`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 || ctx.normalizedDiscountRules.length === 0
        ? "Please select campaign products and configure at least one order-discount tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 || ctx.normalizedDiscountRules.length === 0
        ? "Order discount offers require selected products and at least one order-discount tier."
        : null,
  },
  coupon: {
    getLogicSummary: (ctx) => {
      const orderRules = ctx.normalizedDiscountRules.filter(
        (rule) => rule.discountClass === "order" && rule.rewardType === "percentage_off",
      );
      const bestDiscount = orderRules.reduce(
        (max, rule) => Math.max(max, Number(rule.discountPercent) || 0),
        0,
      );
      return `${orderRules.length} coupon tier${orderRules.length === 1 ? "" : "s"}, shared code gating, up to ${bestDiscount}% off`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 || ctx.normalizedDiscountRules.length === 0
        ? "Please select campaign products and configure at least one coupon discount tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 || ctx.normalizedDiscountRules.length === 0
        ? "Coupon offers require selected products and at least one coupon discount tier."
        : null,
  },
  "quantity-breaks-different": {
    getScopeSummary: (ctx) =>
      `${ctx.selectedProductsData.length} products available for tier product pools`,
    getLogicSummary: (ctx) => {
      const uniqueScopedProducts = new Set(
        ctx.differentProductsDiscountRules.flatMap((rule) => rule.buyProductIds),
      ).size;
      return `${ctx.differentProductsDiscountRules.length} quantity-break tiers across ${uniqueScopedProducts} scoped products`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      ctx.differentProductsDiscountRules.length === 0
        ? "Please select campaign products and configure at least one quantity-break tier."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.selectedProductsData.length === 0 ||
      ctx.differentProductsDiscountRules.length === 0
        ? "Quantity breaks for different products require campaign products and at least one configured tier."
        : null,
  },
  bxgy: {
    getScopeSummary: (ctx) => `${ctx.buyProducts.length} products in the BXGY pool`,
    getLogicSummary: (ctx) => {
      const bestBundleQty = ctx.bxgyDiscountRules.reduce(
        (max, rule) => Math.max(max, getBxgyDisplayMeta(rule).bundleQuantity),
        0,
      );
      return `${ctx.bxgyDiscountRules.length} BXGY bars, up to ${bestBundleQty} items in one bundle`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.buyProducts.length === 0 || ctx.bxgyDiscountRules.length === 0
        ? "Please select the BXGY product pool and configure at least one BXGY bar."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.buyProducts.length === 0 || ctx.bxgyDiscountRules.length === 0
        ? "For BXGY offers, you must configure the BXGY product pool and at least one BXGY bar."
        : null,
  },
  "complete-bundle": {
    getScopeSummary: (ctx) => {
      const uniqueProductCount = new Set(
        ctx.completeBundleBars.flatMap((bar) =>
          bar.products.map((product) => String(product.productId)),
        ),
      ).size;
      return `${ctx.selectedProductsData.length} trigger products, ${uniqueProductCount} bundle items`;
    },
    getLogicSummary: (ctx) =>
      `${ctx.completeBundleBars.length} complete-bundle bar${ctx.completeBundleBars.length === 1 ? "" : "s"} with trigger + whole-bundle pricing`,
    validateScopeAndLogicStep: (ctx) => {
      const { hasNoTriggerProducts, hasInvalidBar } =
        getCompleteBundleValidationState(ctx);
      return hasNoTriggerProducts ||
        hasInvalidBar ||
        ctx.completeBundleBars.length === 0
        ? "Please select trigger products, keep bundle-item pools different from the trigger product, and make sure every bar has enough items for its min/max rule."
        : null;
    },
    validateFinalSubmitScopeAndLogic: (ctx) => {
      const { hasNoTriggerProducts, hasInvalidBar } =
        getCompleteBundleValidationState(ctx);
      return hasNoTriggerProducts ||
        ctx.completeBundleBars.length === 0 ||
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
    getScopeSummary: (ctx) =>
      `${ctx.freeGiftTriggerProducts.length} products in the global trigger pool, ${getFreeGiftRewardBarCount(ctx)} bars with gift products`,
    getLogicSummary: (ctx) => {
      const bestGiftQty = ctx.freeGiftRules.reduce(
        (max, rule) => Math.max(max, rule.giftQuantity),
        0,
      );
      return `${ctx.freeGiftRules.length} gift bars, ${getFreeGiftRewardProductCount(ctx)} reward products, up to ${bestGiftQty} free gift${bestGiftQty > 1 ? "s" : ""}`;
    },
    validateScopeAndLogicStep: (ctx) =>
      ctx.freeGiftTriggerProducts.length === 0 ||
      ctx.freeGiftSharedGiftProductIds.length === 0 ||
      ctx.freeGiftRules.length === 0
        ? "Please configure the global trigger pool, the shared gift product pool, and at least one free-gift bar."
        : null,
    validateFinalSubmitScopeAndLogic: (ctx) =>
      ctx.freeGiftTriggerProducts.length === 0 ||
      ctx.freeGiftSharedGiftProductIds.length === 0 ||
      ctx.freeGiftRules.length === 0
        ? "Free gift offers require a global trigger pool, a shared gift product pool, and at least one bar."
        : null,
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
    quantityRulesPayload: buildQuantityRulesJson(ctx.normalizedDiscountRules),
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
