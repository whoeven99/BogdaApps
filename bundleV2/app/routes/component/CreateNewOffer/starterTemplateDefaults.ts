import type { PreviewItem } from "../BundlePreview/bundlePreviewShared";
import {
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
    case "bxgy":
      return {
        offerSettings: buildOfferSettings({
          title: "Buy More, Unlock Free Gifts",
          layoutFormat: "vertical",
        }),
        discountRules: [],
        bxgyDiscountRules: [
          {
            count: 0,
            buyQuantity: 0,
            getQuantity: 0,
            buyProductIds: [],
            getProductIds: [],
            discountPercent: 0,
            maxUsesPerOrder: 1,
            tierType: "single",
            title: "Single",
            subtitle: "Standard price",
            badge: "",
            isDefault: false,
          },
          {
            count: 1,
            buyQuantity: 1,
            getQuantity: 1,
            buyProductIds: [],
            getProductIds: [],
            discountPercent: 100,
            maxUsesPerOrder: 1,
            title: "Buy 1, get 1 free",
            subtitle: "Best starter offer",
            badge: "Save 50%",
            isDefault: true,
          },
          {
            count: 2,
            buyQuantity: 2,
            getQuantity: 3,
            buyProductIds: [],
            getProductIds: [],
            discountPercent: 100,
            maxUsesPerOrder: 1,
            title: "Buy 2, get 3 free",
            subtitle: "Higher-volume reward",
            badge: "Save 60%",
            isDefault: false,
          },
          {
            count: 3,
            buyQuantity: 3,
            getQuantity: 6,
            buyProductIds: [],
            getProductIds: [],
            discountPercent: 100,
            maxUsesPerOrder: 1,
            title: "Buy 3, get 6 free",
            subtitle: "Largest reward tier",
            badge: "Save 67%",
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
          {
            count: 0,
            discountPercent: 0,
            tierType: "single",
            title: "Single",
            subtitle: "Standard shipping applies",
            badge: "",
            isDefault: false,
          },
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
          {
            count: 0,
            discountPercent: 0,
            tierType: "single",
            title: "Single",
            subtitle: "Standard price",
            badge: "",
            isDefault: false,
          },
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
          {
            count: 0,
            discountPercent: 0,
            tierType: "single",
            title: "Single",
            subtitle: "Standard price",
            badge: "",
            isDefault: false,
          },
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
          {
            count: 2,
            discountPercent: 60,
            title: "Buy 1, get 1 free",
            subtitle: "Subscribe for the strongest savings",
            badge: "Save 60%",
            isDefault: true,
          },
          {
            count: 5,
            discountPercent: 68,
            title: "Buy 2, get 3 free",
            subtitle: "Best for repeat buyers",
            badge: "Save 68%",
            isDefault: false,
          },
          {
            count: 9,
            discountPercent: 73.3333,
            title: "Buy 3, get 6 free",
            subtitle: "Highest savings tier",
            badge: "Save 73%",
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
          {
            count: 0,
            giftQuantity: 0,
            giftProductIds: [],
            tierType: "single",
            title: "Single",
            subtitle: "Standard price",
            badge: "",
            isDefault: false,
          },
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
          {
            count: 0,
            discountPercent: 0,
            buyQuantity: 0,
            getQuantity: 0,
            buyProductIds: [],
            getProductIds: [],
            maxUsesPerOrder: 1,
            tierType: "single",
            title: "Single",
            subtitle: "Standard price",
            badge: "",
            isDefault: false,
          },
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
            subtitle: "Unlock a stronger mix-and-match discount",
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
          {
            count: 0,
            discountPercent: 0,
            tierType: "single",
            title: "Single",
            subtitle: "Standard price",
            badge: "",
            isDefault: false,
          },
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
