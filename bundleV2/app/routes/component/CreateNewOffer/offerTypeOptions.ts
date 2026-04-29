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
      "Offer simple or BXGY-style quantity breaks across a shared pool of different products",
    primaryDiscountScope: "Product discounts",
    primaryRuleType: "Mixed quantity break",
  },
  {
    id: "bxgy",
    name: "Buy X, Get Y (BXGY)",
    description:
      "Buy X products and get Y products with discount (e.g., Buy 2 get 1 free)",
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
