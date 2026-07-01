export type OfferTypeId =
  | "quantity-breaks-same"
  | "progressive-gifts"
  | "shipping-discount"
  | "order-discount"
  | "coupon"
  | "quantity-breaks-different"
  | "bxgy"
  | "complete-bundle"
  | "subscription"
  | "free-gift";

export type OfferTypeOption = {
  id: OfferTypeId;
  name: string;
  description: string;
  primaryDiscountScope: string;
  primaryRuleType: string;
};

export const OFFER_TYPE_OPTIONS: OfferTypeOption[] = [
  {
    id: "quantity-breaks-same",
    name: "Quantity breaks for the same product",
    description:
      "Offer discounts when customers buy multiple quantities of the same product",
    primaryDiscountScope: "Product and order discounts",
    primaryRuleType: "Quantity break",
  },
  {
    id: "progressive-gifts",
    name: "Progressive gifts",
    description:
      "Build milestone-based rewards where quantity tiers unlock a separate progressive reward track",
    primaryDiscountScope: "Milestone rewards",
    primaryRuleType: "Reward track",
  },
  {
    id: "shipping-discount",
    name: "Free shipping tiers",
    description:
      "Unlock free shipping with item-quantity or cart-amount tiers while keeping the same selected product scope",
    primaryDiscountScope: "Shipping discounts",
    primaryRuleType: "Free shipping",
  },
  {
    id: "order-discount",
    name: "Order discount tiers",
    description:
      "Unlock order-level percentage discounts with item-quantity or cart-amount tiers across the selected product scope",
    primaryDiscountScope: "Order discounts",
    primaryRuleType: "Order discount",
  },
  {
    id: "coupon",
    name: "Coupon offer",
    description:
      "Require a shared coupon code before applying an order-level percentage discount across the selected product scope",
    primaryDiscountScope: "Coupon-triggered order discounts",
    primaryRuleType: "Shared code",
  },
  {
    id: "quantity-breaks-different",
    name: "Quantity breaks for different products",
    description:
      "Offer quantity breaks across different products using one shared offer-level product pool",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "Quantity break",
  },
  {
    id: "bxgy",
    name: "Buy X, Get Y (BXGY)",
    description:
      "Set up same-product BXGY offers with escalating quantity tiers such as Buy 2, Get 3 or Buy 3, Get 5",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "BXGY",
  },
  {
    id: "complete-bundle",
    name: "Complete the bundle",
    description:
      "Create bundle bars where the current product and selected bundle items receive one combined discount",
    primaryDiscountScope: "Order discounts",
    primaryRuleType: "Whole-bundle discount",
  },
  {
    id: "subscription",
    name: "Subscription",
    description:
      "Show one-time and subscription purchase options for products that support selling plans",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "Subscription upsell",
  },
  {
    id: "free-gift",
    name: "Free gift",
    description:
      "Reward customers with one or more free gift products after they reach a quantity threshold",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "Free gift",
  },
];

const HIDDEN_OFFER_TYPE_IDS: OfferTypeId[] = [
  "shipping-discount",
  "order-discount",
  "coupon",
  "free-gift",
  "progressive-gifts",
  "quantity-breaks-different",
  "subscription",
];

export function getVisibleOfferTypeOptions(
  selectedOfferType?: OfferTypeId,
): OfferTypeOption[] {
  return OFFER_TYPE_OPTIONS.filter(
    (option) =>
      !HIDDEN_OFFER_TYPE_IDS.includes(option.id) || option.id === selectedOfferType,
  );
}
