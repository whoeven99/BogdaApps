import {
  buildBxgyDiscountRulesJson,
  buildCompleteBundleConfig,
  buildDifferentProductsDiscountRulesJson,
  buildFreeGiftRulesJson,
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

function getBxgyRewardBarCount(ctx: CampaignBuilderRegistryContext) {
  return ctx.bxgyDiscountRules.filter(
    (rule) => Array.isArray(rule.getProductIds) && rule.getProductIds.length > 0,
  ).length;
}

function getFreeGiftRewardBarCount(ctx: CampaignBuilderRegistryContext) {
  return ctx.freeGiftRules.filter(
    (rule) => Array.isArray(rule.giftProductIds) && rule.giftProductIds.length > 0,
  ).length;
}

function getBxgyRewardProductCount(ctx: CampaignBuilderRegistryContext) {
  return new Set(
    ctx.bxgyDiscountRules.flatMap((rule) =>
      Array.isArray(rule.getProductIds) ? rule.getProductIds : [],
    ),
  ).size;
}

function getFreeGiftRewardProductCount(ctx: CampaignBuilderRegistryContext) {
  return new Set(
    ctx.freeGiftRules.flatMap((rule) =>
      Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
    ),
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
  "quantity-breaks-different": {
    logicBlockLabel: "Quantity Breaks",
    logicBlockDescription:
      "Configure quantity-break tiers for different product combinations while keeping the standard offer-card style.",
    stepTwoDescription:
      "Select the campaign products, then define each tier and the eligible product pool tied to that tier.",
  },
  bxgy: {
    logicBlockLabel: "Buy X Get Y",
    logicBlockDescription:
      "Promote a buy-and-reward mechanic with a global trigger pool and bar-specific reward products.",
    stepTwoDescription:
      "Choose the global Buy trigger pool, then configure reward products and quantities inside each BXGY bar.",
  },
  "complete-bundle": {
    logicBlockLabel: "Complete Bundle",
    logicBlockDescription:
      "Present multi-bar bundle combinations with per-product pricing and variant previews.",
    stepTwoDescription:
      "Build each bundle bar, attach the right products, and control how the combined offer is priced.",
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

export function getCampaignBuilderMeta(
  offerType: OfferTypeId,
): CampaignBuilderMeta {
  return META_BY_OFFER_TYPE[offerType];
}

export function getCampaignScopeSummary(
  ctx: CampaignBuilderRegistryContext,
): string {
  switch (ctx.offerType) {
    case "quantity-breaks-different":
      return `${ctx.selectedProductsData.length} products available for tier product pools`;
    case "bxgy":
      return `${ctx.buyProducts.length} products in the global Buy pool, ${getBxgyRewardBarCount(ctx)} bars with reward products`;
    case "complete-bundle": {
      const uniqueProductCount = new Set(
        ctx.completeBundleBars.flatMap((bar) =>
          bar.products.map((product) => String(product.productId)),
        ),
      ).size;
      return `${ctx.selectedProductsData.length} trigger products, ${uniqueProductCount} bundled products`;
    }
    case "free-gift":
      return `${ctx.freeGiftTriggerProducts.length} products in the global trigger pool, ${getFreeGiftRewardBarCount(ctx)} bars with gift products`;
    default:
      return `${ctx.selectedProductsData.length} selected products`;
  }
}

export function getCampaignLogicSummary(
  ctx: CampaignBuilderRegistryContext,
): string {
  switch (ctx.offerType) {
    case "quantity-breaks-different": {
      const uniqueScopedProducts = new Set(
        ctx.differentProductsDiscountRules.flatMap((rule) => rule.buyProductIds),
      ).size;
      return `${ctx.differentProductsDiscountRules.length} quantity-break tiers across ${uniqueScopedProducts} scoped products`;
    }
    case "bxgy": {
      const bestDiscount = ctx.bxgyDiscountRules.reduce(
        (max, rule) => Math.max(max, rule.discountPercent),
        0,
      );
      return `${ctx.bxgyDiscountRules.length} BXGY bars, ${getBxgyRewardProductCount(ctx)} reward products, up to ${bestDiscount}% off`;
    }
    case "complete-bundle": {
      return `${ctx.normalizedDiscountRules.length} quantity bars + ${ctx.completeBundleBars.length} bundle group${ctx.completeBundleBars.length > 1 ? "s" : ""}`;
    }
    case "subscription":
      return ctx.subscriptionEnabled
        ? `Subscription enabled for ${ctx.selectedProductsData.length} products`
        : "Subscription block configured but disabled";
    case "free-gift": {
      const bestGiftQty = ctx.freeGiftRules.reduce(
        (max, rule) => Math.max(max, rule.giftQuantity),
        0,
      );
      return `${ctx.freeGiftRules.length} gift bars, ${getFreeGiftRewardProductCount(ctx)} reward products, up to ${bestGiftQty} free gift${bestGiftQty > 1 ? "s" : ""}`;
    }
    default: {
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
  }
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
    new Set(ctx.unifiedRulesSnapshot.map((rule) => rule.publishSupport)),
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
  switch (ctx.offerType) {
    case "quantity-breaks-different":
      return {
        productIds: ctx.selectedProductsData.map((product) => String(product.id)),
      };
    case "bxgy":
      return {
        buyProducts: ctx.buyProducts,
        getProducts: Array.from(
          new Set(
            ctx.bxgyDiscountRules.flatMap((rule) =>
              Array.isArray(rule.getProductIds) ? rule.getProductIds : [],
            ),
          ),
        ),
      };
    case "complete-bundle":
      return {
        productIds: ctx.selectedProductsData.map((product) => String(product.id)),
        bars: buildCompleteBundleConfig({ bars: ctx.completeBundleBars }).bars,
      };
    case "free-gift":
      return {
        triggerProducts: ctx.freeGiftTriggerProducts,
        giftProducts: Array.from(
          new Set(
            ctx.freeGiftRules.flatMap((rule) =>
              Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
            ),
          ),
        ),
      };
    default:
      return ctx.selectedProductsData;
  }
}

export function buildDiscountRulesPayload(
  ctx: CampaignBuilderRegistryContext,
  buildQuantityRulesJson: (rules: DraftDiscountRule[]) => unknown,
): unknown {
  switch (ctx.offerType) {
    case "quantity-breaks-different":
      return buildDifferentProductsDiscountRulesJson(
        ctx.differentProductsDiscountRules,
      );
    case "bxgy":
      return buildBxgyDiscountRulesJson(ctx.bxgyDiscountRules);
    case "complete-bundle":
      return buildQuantityRulesJson(ctx.normalizedDiscountRules);
    case "free-gift":
      return buildFreeGiftRulesJson(ctx.freeGiftRules);
    default:
      return buildQuantityRulesJson(ctx.normalizedDiscountRules);
  }
}

export function validateScopeAndLogicStep(
  ctx: CampaignBuilderRegistryContext,
): string | null {
  switch (ctx.offerType) {
    case "quantity-breaks-different":
      return ctx.selectedProductsData.length === 0 ||
        ctx.differentProductsDiscountRules.length === 0
        ? "Please select campaign products and configure at least one quantity-break tier."
        : null;
    case "bxgy":
      return ctx.buyProducts.length === 0 ||
        ctx.bxgyDiscountRules.some(
          (rule) => !Array.isArray(rule.getProductIds) || rule.getProductIds.length === 0,
        )
        ? "Please select the global Buy pool and configure reward products inside every BXGY bar."
        : null;
    case "complete-bundle": {
      const hasNoTriggerProducts = ctx.selectedProductsData.length === 0;
      const hasNoQuantityBars = ctx.normalizedDiscountRules.length === 0;
      const hasEmptyBar = ctx.completeBundleBars.some(
        (bar) => bar.products.length === 0,
      );
      return hasNoTriggerProducts || hasNoQuantityBars || hasEmptyBar
        ? "Please select trigger products, configure at least one quantity-break bar, and add products to every bundle group."
        : null;
    }
    case "free-gift":
      return ctx.freeGiftTriggerProducts.length === 0 ||
        ctx.freeGiftRules.some(
          (rule) => !Array.isArray(rule.giftProductIds) || rule.giftProductIds.length === 0,
        ) ||
        ctx.freeGiftRules.length === 0
        ? "Please configure the global trigger pool, gift products inside every free-gift bar, and at least one free-gift bar."
        : null;
    default:
      return ctx.selectedProductsData.length === 0
        ? "Please select at least one product."
        : null;
  }
}

export function validateFinalSubmitScopeAndLogic(
  ctx: CampaignBuilderRegistryContext,
): string | null {
  switch (ctx.offerType) {
    case "quantity-breaks-different":
      return ctx.selectedProductsData.length === 0 ||
        ctx.differentProductsDiscountRules.length === 0
        ? "Quantity breaks for different products require campaign products and at least one configured tier."
        : null;
    case "bxgy":
      return ctx.buyProducts.length === 0 ||
        ctx.bxgyDiscountRules.some(
          (rule) => !Array.isArray(rule.getProductIds) || rule.getProductIds.length === 0,
        )
        ? "For BXGY offers, you must configure the global Buy pool and reward products inside every BXGY bar."
        : null;
    case "complete-bundle": {
      const hasNoTriggerProducts = ctx.selectedProductsData.length === 0;
      const hasNoQuantityBars = ctx.normalizedDiscountRules.length === 0;
      const hasInvalidBar = ctx.completeBundleBars.some(
        (bar) =>
          !bar.products?.length ||
          !Number.isFinite(Number(bar.quantity)) ||
          Number(bar.quantity) < 1,
      );
      return hasNoTriggerProducts ||
        hasNoQuantityBars ||
        ctx.completeBundleBars.length === 0 ||
        hasInvalidBar
        ? "Complete bundle offers require trigger products, at least one quantity-break bar, and a valid bundle group with products."
        : null;
    }
    case "free-gift":
      return ctx.freeGiftTriggerProducts.length === 0 ||
        ctx.freeGiftRules.some(
          (rule) => !Array.isArray(rule.giftProductIds) || rule.giftProductIds.length === 0,
        ) ||
        ctx.freeGiftRules.length === 0
        ? "Free gift offers require a global trigger pool, gift products inside every free-gift bar, and at least one bar."
        : null;
    default:
      return null;
  }
}
