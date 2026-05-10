export type OfferTypeId =
  | "quantity-breaks-same"
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
    id: "quantity-breaks-different",
    name: "Quantity breaks for different products",
    description:
      "Offer quantity breaks across different products while assigning eligible product pools per tier",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "Quantity break",
  },
  {
    id: "bxgy",
    name: "Buy X, Get Y Free (BXGY)",
    description:
      "Set up same-product Buy X, Get Y Free offers (for example, Buy 2, Get 1 Free)",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "BXGY",
  },
  {
    id: "complete-bundle",
    name: "Complete the bundle",
    description:
      "Create multiple bundle bars and let customers choose product variants/options",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "Bundle completion",
  },
  {
    id: "subscription",
    name: "Subscription",
    description:
      "Show subscription purchase option below bundle bars for products that support selling plans",
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

const HIDDEN_OFFER_TYPE_IDS: OfferTypeId[] = ["free-gift"];

export function getVisibleOfferTypeOptions(
  selectedOfferType?: OfferTypeId,
): OfferTypeOption[] {
  return OFFER_TYPE_OPTIONS.filter(
    (option) =>
      !HIDDEN_OFFER_TYPE_IDS.includes(option.id) || option.id === selectedOfferType,
  );
}
