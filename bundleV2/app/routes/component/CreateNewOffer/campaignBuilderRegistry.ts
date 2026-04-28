import {
  buildBxgyDiscountRulesJson,
  buildCompleteBundleConfig,
  buildDifferentProductsDiscountRulesJson,
  buildFreeGiftRulesJson,
} from "../../../utils/offerParsing";
import type { CampaignDraft, DraftDiscountRule } from "./campaignDraft";
import type { OfferTypeId } from "./offerTypeOptions";

export type CampaignBuilderRegistryContext = CampaignDraft;

type CampaignBuilderMeta = {
  logicBlockLabel: string;
  logicBlockDescription: string;
  stepTwoDescription: string;
};

const META_BY_OFFER_TYPE: Record<OfferTypeId, CampaignBuilderMeta> = {
  "quantity-breaks-same": {
    logicBlockLabel: "Quantity Breaks",
    logicBlockDescription:
      "Reward larger quantities of the same product with progressively better pricing.",
    stepTwoDescription:
      "Select the products in scope and define the quantity tiers that drive the promotion.",
  },
  "quantity-breaks-different": {
    logicBlockLabel: "Cross-product Quantity Breaks",
    logicBlockDescription:
      "Mix simple quantity discounts and BXGY-style tiers across a shared pool of different products.",
    stepTwoDescription:
      "Select the shared product pool, then configure the cross-product tiers customers can unlock.",
  },
  bxgy: {
    logicBlockLabel: "Buy X Get Y",
    logicBlockDescription:
      "Promote a buy-and-reward mechanic with separate buy and get product groups.",
    stepTwoDescription:
      "Choose the buy and get product groups, then define the reward tiers customers can unlock.",
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
      "Reward shoppers with a free gift after they reach the trigger quantity for selected products.",
    stepTwoDescription:
      "Choose trigger and gift products, then define the quantity tiers that unlock each free gift reward.",
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
      return `${ctx.selectedProductsData.length} products in the shared pool`;
    case "bxgy":
      return `${ctx.buyProducts.length} buy products + ${ctx.getProducts.length} get products`;
    case "complete-bundle": {
      const uniqueProductCount = new Set(
        ctx.completeBundleBars.flatMap((bar) =>
          bar.products.map((product) => String(product.productId)),
        ),
      ).size;
      return `${uniqueProductCount} products across ${ctx.completeBundleBars.length} bars`;
    }
    case "free-gift":
      return `${ctx.freeGiftTriggerProducts.length} trigger products + ${ctx.giftProductsData.length} gift products`;
    default:
      return `${ctx.selectedProductsData.length} selected products`;
  }
}

export function getCampaignLogicSummary(
  ctx: CampaignBuilderRegistryContext,
): string {
  switch (ctx.offerType) {
    case "quantity-breaks-different": {
      const bxgyTierCount = ctx.differentProductsDiscountRules.filter(
        (rule) => rule.tierType === "bxgy",
      ).length;
      const simpleTierCount = ctx.differentProductsDiscountRules.length - bxgyTierCount;
      return `${simpleTierCount} simple tiers, ${bxgyTierCount} BXGY tiers`;
    }
    case "bxgy": {
      const bestDiscount = ctx.bxgyDiscountRules.reduce(
        (max, rule) => Math.max(max, rule.discountPercent),
        0,
      );
      return `${ctx.bxgyDiscountRules.length} BXGY tiers, up to ${bestDiscount}% off`;
    }
    case "complete-bundle": {
      const bxgyBars = ctx.completeBundleBars.filter(
        (bar) => bar.type === "bxgy",
      ).length;
      const quantityBars = ctx.completeBundleBars.length - bxgyBars;
      return `${quantityBars} quantity bars, ${bxgyBars} BXGY bars`;
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
      return `${ctx.freeGiftRules.length} gift tiers, up to ${bestGiftQty} free gift${bestGiftQty > 1 ? "s" : ""}`;
    }
    default: {
      const bestDiscount = ctx.normalizedDiscountRules.reduce(
        (max, rule) => Math.max(max, rule.discountPercent),
        0,
      );
      return `${ctx.normalizedDiscountRules.length} quantity tiers, up to ${bestDiscount}% off`;
    }
  }
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
      return { buyProducts: ctx.buyProducts, getProducts: ctx.getProducts };
    case "complete-bundle":
      return buildCompleteBundleConfig({ bars: ctx.completeBundleBars });
    case "free-gift":
      return {
        triggerProducts: ctx.freeGiftTriggerProducts,
        giftProducts: ctx.giftProductsData.map((product) => String(product.id)),
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
      return ctx.completeBundleBars.map((bar) => ({
        id: bar.id,
        type: bar.type,
        quantity: bar.quantity,
        pricing: bar.pricing,
        products: bar.products.map((product) => ({
          productId: product.productId,
          pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
        })),
      }));
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
        ? "Please select the shared product pool and configure at least one cross-product tier."
        : null;
    case "bxgy":
      return ctx.buyProducts.length === 0 || ctx.getProducts.length === 0
        ? "Please select both Buy and Get products for a BXGY offer."
        : null;
    case "complete-bundle": {
      const hasEmptyBar = ctx.completeBundleBars.some(
        (bar) => bar.products.length === 0,
      );
      return hasEmptyBar
        ? "Please select products for every bundle bar."
        : null;
    }
    case "free-gift":
      return ctx.freeGiftTriggerProducts.length === 0 ||
        ctx.giftProductsData.length === 0 ||
        ctx.freeGiftRules.length === 0
        ? "Please configure trigger products, gift products, and at least one free gift tier."
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
        ? "Cross-product quantity breaks require a shared product pool and at least one tier."
        : null;
    case "bxgy":
      return ctx.buyProducts.length === 0 || ctx.getProducts.length === 0
        ? "For BXGY offers, you must select both Buy Products and Get Products."
        : null;
    case "complete-bundle": {
      const hasInvalidBar = ctx.completeBundleBars.some(
        (bar) =>
          !bar.products?.length ||
          !Number.isFinite(Number(bar.quantity)) ||
          Number(bar.quantity) < 1,
      );
      return hasInvalidBar
        ? "Each bundle bar must contain at least one product and a valid quantity."
        : null;
    }
    case "free-gift":
      return ctx.freeGiftTriggerProducts.length === 0 ||
        ctx.giftProductsData.length === 0 ||
        ctx.freeGiftRules.length === 0
        ? "Free gift offers require trigger products, gift products, and at least one gift tier."
        : null;
    default:
      return null;
  }
}
