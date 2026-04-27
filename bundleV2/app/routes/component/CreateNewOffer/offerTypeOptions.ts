export type OfferTypeId =
  | "quantity-breaks-same"
  | "bxgy"
  | "complete-bundle"
  | "subscription";

export type OfferTypeOption = {
  id: OfferTypeId;
  name: string;
  description: string;
};

export const OFFER_TYPE_OPTIONS: OfferTypeOption[] = [
  {
    id: "quantity-breaks-same",
    name: "Quantity breaks for the same product",
    description:
      "Offer discounts when customers buy multiple quantities of the same product",
  },
  {
    id: "bxgy",
    name: "Buy X, Get Y (BXGY)",
    description:
      "Buy X products and get Y products with discount (e.g., Buy 2 get 1 free)",
  },
  {
    id: "complete-bundle",
    name: "Complete the bundle",
    description:
      "Create multiple bundle bars and let customers choose product variants/options",
  },
  {
    id: "subscription",
    name: "Subscription",
    description:
      "Show subscription purchase option below bundle bars for products that support selling plans",
  },
];
