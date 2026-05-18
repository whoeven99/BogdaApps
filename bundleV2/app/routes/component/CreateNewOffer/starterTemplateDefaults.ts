import type { PreviewItem } from "../BundlePreview/bundlePreviewShared";
import {
  createDefaultSingleBxgyRule,
  createDefaultSingleDifferentProductsRule,
  createDefaultSingleDiscountRule,
  createDefaultSingleFreeGiftRule,
  parseOfferSettings,
  type BxgyDiscountRule,
  type CompleteBundleBar,
  type DifferentProductsDiscountRule,
  type DiscountRule,
  type FreeGiftRule,
  type OfferSettings,
} from "../../../utils/offerParsing";
import type { OfferTypeId } from "./offerTypeOptions";

export type StarterTemplateDefaults = {
  offerSettings: OfferSettings;
  discountRules: DiscountRule[];
  bxgyDiscountRules: BxgyDiscountRule[];
  freeGiftRules: FreeGiftRule[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  completeBundleBars: CompleteBundleBar[];
  showCountdownBlock: boolean;
  countdownLabel: string;
  previewFallbackItems?: PreviewItem[];
};

export const COMPLETE_BUNDLE_TEMPLATE_PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: "starter-complete-bundle-base",
    title: "FetchLink C10 GPS Wireless Dog Fence with 2K Camera - ciwi",
    subtitle: "Standard price",
    price: "EUR65.00",
  },
  {
    id: "starter-complete-bundle-offer",
    title: "Complete the bundle",
    subtitle: "Save EUR49.00!",
    price: "EUR196.00",
    original: "EUR245.00",
    featured: true,
    saveLabel: "SAVE EUR49.00",
    products: [
      {
        image: "https://via.placeholder.com/48",
        name: "FetchLink C10 GPS Wireless Dog Fence with 2K Camera - ciwi",
      },
      {
        image: "https://via.placeholder.com/48",
        name: "Casual Pink Mountain Landscape Printed White Pullover",
      },
    ],
  },
];

export const SHIPPING_DISCOUNT_TEMPLATE_PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: "starter-shipping-single",
    title: "Single",
    subtitle: "Standard shipping applies",
    price: "Shipping calculated at checkout",
  },
  {
    id: "starter-shipping-duo",
    title: "Buy 2 items",
    subtitle: "Unlock free shipping",
    price: "FREE SHIPPING",
    featured: true,
    badge: "Shipping perk",
    saveLabel: "TRIGGER AT 2",
  },
  {
    id: "starter-shipping-threshold",
    title: "Spend €120",
    subtitle: "Cart threshold unlock",
    price: "FREE SHIPPING",
    badge: "Cart amount",
    saveLabel: "AT €120",
  },
];

export const ORDER_DISCOUNT_TEMPLATE_PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: "starter-order-single",
    title: "Single",
    subtitle: "Standard price",
    price: "EUR65.00",
  },
  {
    id: "starter-order-duo",
    title: "Buy 2 items",
    subtitle: "Unlock 10% off your order",
    price: "EUR58.50",
    featured: true,
    badge: "Order-wide",
    saveLabel: "SAVE 10%",
  },
  {
    id: "starter-order-threshold",
    title: "Spend EUR120",
    subtitle: "Unlock 15% off your order",
    price: "15% OFF",
    badge: "Cart amount",
    saveLabel: "SAVE 15%",
  },
];

export const COUPON_TEMPLATE_PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: "starter-coupon-single",
    title: "Enter code SAVE15",
    subtitle: "Coupon required at checkout",
    price: "15% OFF",
  },
  {
    id: "starter-coupon-duo",
    title: "Buy 2 items",
    subtitle: "Unlock 15% off your order with SAVE15",
    price: "15% OFF",
    featured: true,
    badge: "Coupon code",
    saveLabel: "CODE SAVE15",
  },
];

export const PROGRESSIVE_GIFTS_TEMPLATE_PREVIEW_ITEMS: PreviewItem[] = [
  {
    id: "starter-progressive-single",
    title: "Single",
    subtitle: "Standard price",
    price: "EUR65.00",
  },
  {
    id: "starter-progressive-duo",
    title: "Build 2 items",
    subtitle: "Unlock the first reward milestone",
    price: "EUR110.50",
    featured: true,
    badge: "Milestone 1",
    saveLabel: "UNLOCK REWARD",
  },
  {
    id: "starter-progressive-trio",
    title: "Build 3 items",
    subtitle: "Unlock the next milestone reward",
    price: "EUR156.00",
    badge: "Milestone 2",
    saveLabel: "NEXT REWARD",
  },
];

function buildOfferSettings(
  overrides: Partial<OfferSettings> = {},
): OfferSettings {
  const base = parseOfferSettings(null);
  return {
    ...base,
    ...overrides,
    progressiveGifts: overrides.progressiveGifts
      ? {
          ...overrides.progressiveGifts,
          gifts: overrides.progressiveGifts.gifts.map((gift) => ({ ...gift })),
        }
      : {
          ...base.progressiveGifts,
          gifts: base.progressiveGifts.gifts.map((gift) => ({ ...gift })),
        },
  };
}

export function getStarterTemplateDefaults(
  offerType: OfferTypeId,
): StarterTemplateDefaults {
  switch (offerType) {
    case "progressive-gifts":
      return {
        offerSettings: buildOfferSettings({
          title: "Build Your Reward Track",
          layoutFormat: "vertical",
          progressiveGifts: {
            enabled: true,
            title: "Progressive rewards",
            subtitle: "Unlock extra perks as shoppers move up the milestones",
            layout: "vertical",
            hideGiftsUntilUnlocked: false,
            showLabelsForLockedGifts: true,
            gifts: [
              {
                id: "starter-progressive-gift-1",
                type: "free_shipping",
                title: "Free shipping",
                subtitle: "Unlocked at milestone 2",
                imageUrl: "",
                unlockMode: "tier_index",
                unlockTierIndex: 2,
                unlockAtCount: 2,
                freeShippingMaxRateAmount: null,
              },
            ],
          },
        }),
        discountRules: [
          createDefaultSingleDiscountRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
          }),
          {
            count: 2,
            discountPercent: 15,
            title: "Build 2 items",
            subtitle: "Unlock the first reward milestone",
            badge: "Milestone 1",
            isDefault: true,
          },
          {
            count: 3,
            discountPercent: 20,
            title: "Build 3 items",
            subtitle: "Unlock the next milestone reward",
            badge: "Milestone 2",
            isDefault: false,
          },
        ],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time offer",
        previewFallbackItems: PROGRESSIVE_GIFTS_TEMPLATE_PREVIEW_ITEMS,
      };
    case "bxgy":
      return {
        offerSettings: buildOfferSettings({
          title: "Buy More, Unlock Better Value",
          layoutFormat: "vertical",
        }),
        discountRules: [],
        bxgyDiscountRules: [
          createDefaultSingleBxgyRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
          }),
          {
            count: 2,
            buyQuantity: 2,
            getQuantity: 1,
            buyProductIds: [],
            getProductIds: [],
            discountPercent: 100,
            maxUsesPerOrder: 1,
            title: "Buy 2, get 3",
            subtitle: "",
            badge: "Save 33%",
            isDefault: true,
          },
          {
            count: 3,
            buyQuantity: 3,
            getQuantity: 2,
            buyProductIds: [],
            getProductIds: [],
            discountPercent: 100,
            maxUsesPerOrder: 1,
            title: "Buy 3, get 5",
            subtitle: "",
            badge: "Save 40%",
            isDefault: false,
          },
          {
            count: 4,
            buyQuantity: 4,
            getQuantity: 4,
            buyProductIds: [],
            getProductIds: [],
            discountPercent: 100,
            maxUsesPerOrder: 1,
            title: "Buy 4, get 8",
            subtitle: "",
            badge: "Save 50%",
            isDefault: false,
          },
        ],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time offer",
      };
    case "complete-bundle":
      return {
        offerSettings: buildOfferSettings({
          title: "Complete The Bundle",
          layoutFormat: "card",
        }),
        discountRules: [
          createDefaultSingleDiscountRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
          }),
          {
            count: 2,
            discountPercent: 20,
            title: "Bundle trigger",
            subtitle: "Unlock the complete bundle offer",
            isDefault: true,
          },
        ],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [
          {
            id: "starter-complete-bundle-single",
            type: "single",
            title: "Single",
            subtitle: "Standard price",
            badge: "",
            isDefault: true,
            minQuantity: 1,
            maxQuantity: 1,
            excludeTriggerProduct: false,
            quantity: 1,
            products: [],
            pricing: { mode: "full_price", value: 0 },
          },
          {
            id: "starter-complete-bundle-bar",
            type: "quantity-break-same",
            title: "Complete the bundle",
            subtitle: "Choose bundle items and unlock one discount for the whole bundle",
            badge: "",
            isDefault: false,
            minQuantity: 1,
            maxQuantity: 3,
            excludeTriggerProduct: true,
            quantity: 3,
            products: [],
            pricing: { mode: "percentage_off", value: 15 },
          },
        ],
        showCountdownBlock: false,
        countdownLabel: "Limited time offer",
        previewFallbackItems: COMPLETE_BUNDLE_TEMPLATE_PREVIEW_ITEMS,
      };
    case "shipping-discount":
      return {
        offerSettings: buildOfferSettings({
          title: "Free Shipping Unlock",
          layoutFormat: "vertical",
        }),
        discountRules: [
          createDefaultSingleDiscountRule({
            title: "Single",
            subtitle: "Standard shipping applies",
            isDefault: false,
            discountClass: "shipping",
            offerKind: "free_shipping",
            rewardType: "free_shipping",
          }),
          {
            count: 2,
            discountPercent: 0,
            discountClass: "shipping",
            offerKind: "free_shipping",
            conditionType: "item_quantity",
            rewardType: "free_shipping",
            title: "Buy 2 items",
            subtitle: "Unlock free shipping",
            badge: "Shipping perk",
            isDefault: true,
          },
          {
            count: 1,
            discountPercent: 0,
            discountClass: "shipping",
            offerKind: "free_shipping",
            conditionType: "cart_amount",
            amountThreshold: 120,
            rewardType: "free_shipping",
            title: "Spend €120",
            subtitle: "Cart threshold unlock",
            badge: "Cart amount",
            isDefault: false,
          },
        ],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time shipping offer",
        previewFallbackItems: SHIPPING_DISCOUNT_TEMPLATE_PREVIEW_ITEMS,
      };
    case "order-discount":
      return {
        offerSettings: buildOfferSettings({
          title: "Order Discount Unlock",
          layoutFormat: "vertical",
        }),
        discountRules: [
          createDefaultSingleDiscountRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
            discountClass: "order",
          }),
          {
            count: 2,
            discountPercent: 10,
            discountClass: "order",
            offerKind: "percentage_discount",
            conditionType: "item_quantity",
            rewardType: "percentage_off",
            title: "Buy 2 items",
            subtitle: "Unlock 10% off your order",
            badge: "Order-wide",
            isDefault: true,
          },
          {
            count: 1,
            discountPercent: 15,
            discountClass: "order",
            offerKind: "percentage_discount",
            conditionType: "cart_amount",
            amountThreshold: 120,
            rewardType: "percentage_off",
            title: "Spend EUR120",
            subtitle: "Unlock 15% off your order",
            badge: "Cart amount",
            isDefault: false,
          },
        ],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time order offer",
        previewFallbackItems: ORDER_DISCOUNT_TEMPLATE_PREVIEW_ITEMS,
      };
    case "coupon":
      return {
        offerSettings: buildOfferSettings({
          title: "Coupon Unlock",
          layoutFormat: "vertical",
          couponEnabled: true,
          couponCode: "SAVE15",
        }),
        discountRules: [
          createDefaultSingleDiscountRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
            discountClass: "order",
          }),
          {
            count: 2,
            discountPercent: 15,
            discountClass: "order",
            offerKind: "percentage_discount",
            conditionType: "item_quantity",
            rewardType: "percentage_off",
            title: "Buy 2 items",
            subtitle: "Unlock 15% off your order with SAVE15",
            badge: "Coupon code",
            isDefault: true,
          },
        ],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time coupon offer",
        previewFallbackItems: COUPON_TEMPLATE_PREVIEW_ITEMS,
      };
    case "subscription":
      return {
        offerSettings: buildOfferSettings({
          title: "Subscribe & Save",
          layoutFormat: "vertical",
          subscriptionEnabled: true,
          subscriptionTitle: "Subscribe & Save 20%",
          subscriptionSubtitle: "Delivered weekly",
          oneTimeTitle: "One-time purchase",
          oneTimeSubtitle: "",
          subscriptionDefaultSelected: true,
        }),
        discountRules: [
          createDefaultSingleDiscountRule({
            title: "Single",
            subtitle: "One-time price",
            isDefault: false,
          }),
          {
            count: 2,
            discountPercent: 20,
            title: "2-pack subscription",
            subtitle: "A light recurring option for first-time subscribers",
            badge: "Save 20%",
            isDefault: true,
          },
          {
            count: 3,
            discountPercent: 30,
            title: "3-pack subscription",
            subtitle: "A balanced recurring option for repeat buyers",
            badge: "Save 30%",
            isDefault: false,
          },
          {
            count: 4,
            discountPercent: 40,
            title: "4-pack subscription",
            subtitle: "A higher-commitment option with capped savings",
            badge: "Save 40%",
            isDefault: false,
          },
        ],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time offer",
      };
    case "free-gift":
      return {
        offerSettings: buildOfferSettings({
          title: "Free Gift Offer",
          layoutFormat: "vertical",
        }),
        discountRules: [],
        bxgyDiscountRules: [],
        freeGiftRules: [
          createDefaultSingleFreeGiftRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
          }),
          {
            count: 2,
            giftQuantity: 1,
            title: "Buy 2 items",
            subtitle: "Unlock 1 free mini gift",
            badge: "Gift included",
            isDefault: true,
          },
          {
            count: 3,
            giftQuantity: 2,
            title: "Buy 3 items",
            subtitle: "Unlock 2 free gifts",
            badge: "",
            isDefault: false,
          },
        ],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time offer",
      };
    case "quantity-breaks-different":
      return {
        offerSettings: buildOfferSettings({
          title: "Mix & Match Bundle",
          layoutFormat: "vertical",
        }),
        discountRules: [],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [
          createDefaultSingleDifferentProductsRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
          }),
          {
            count: 2,
            discountPercent: 15,
            buyQuantity: 2,
            getQuantity: 0,
            buyProductIds: [],
            getProductIds: [],
            maxUsesPerOrder: 1,
            tierType: "simple",
            title: "Any 2 items",
            subtitle: "You save 15%",
            badge: "Recommended",
            isDefault: true,
          },
          {
            count: 3,
            discountPercent: 20,
            buyQuantity: 3,
            getQuantity: 0,
            buyProductIds: [],
            getProductIds: [],
            maxUsesPerOrder: 1,
            tierType: "simple",
            title: "Any 3 items",
            subtitle: "Unlock a higher mix-and-match discount",
            badge: "Best value",
            isDefault: false,
          },
        ],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time offer",
      };
    case "quantity-breaks-same":
    default:
      return {
        offerSettings: buildOfferSettings({
          title: "Bundle & Save",
          layoutFormat: "vertical",
        }),
        discountRules: [
          createDefaultSingleDiscountRule({
            title: "Single",
            subtitle: "Standard price",
            isDefault: false,
          }),
          {
            count: 2,
            discountPercent: 15,
            title: "Duo",
            subtitle: "You save 15%",
            badge: "Recommended",
            isDefault: true,
          },
        ],
        bxgyDiscountRules: [],
        freeGiftRules: [],
        differentProductsDiscountRules: [],
        completeBundleBars: [],
        showCountdownBlock: false,
        countdownLabel: "Limited time offer",
      };
  }
}
