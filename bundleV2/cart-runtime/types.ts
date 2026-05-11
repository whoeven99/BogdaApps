export type CartMoneyFormat =
  | "amount"
  | "amount_no_decimals"
  | "amount_with_comma_separator"
  | "amount_no_decimals_with_comma_separator"
  | "amount_with_apostrophe_separator"
  | "amount_no_decimals_with_space_separator"
  | "amount_with_space_separator"
  | "amount_with_period_and_space_separator";

export type CartTaxDisplay = "inclusive" | "exclusive" | "unknown";

export type CartMarketContext = {
  marketId: string;
  marketName: string;
  currencyCode: string;
  currencySymbol: string;
  moneyFormat: CartMoneyFormat;
  locale: string;
  taxDisplay: CartTaxDisplay;
  exchangeRate?: number;
};

export type CartLineItemOption = {
  name: string;
  value: string;
};

export type CartLineItemProperty = {
  name: string;
  value: string;
};

export type CartSubscriptionInfo = {
  planName: string;
  interval: string;
};

export type CartItem = {
  id: string;
  line?: number;
  productId?: string;
  variantId?: string;
  productTitle: string;
  variantTitle: string;
  optionsWithValues: CartLineItemOption[];
  quantity: number;
  priceMinor: number;
  compareAtMinor?: number | null;
  image: string;
  vendor?: string;
  properties?: CartLineItemProperty[];
  subscription?: CartSubscriptionInfo;
};

export type CartTimerOverrides = {
  enabled?: boolean;
  durationSeconds?: number;
  textTemplate?: string;
};

export type CartPromotionsOverrides = {
  enabled?: boolean;
  freeShippingThresholdMinor?: number;
  successMessage?: string;
  progressMessage?: string;
};

export type CartUpsellItem = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  priceMinor: number;
  compareAtMinor?: number | null;
  ctaLabel?: string;
  variantId?: string;
};

export type CartUpsellOverrides = {
  enabled?: boolean;
  title?: string;
  items?: CartUpsellItem[];
};

export type CartSettingsOverrides = {
  timerOverrides?: CartTimerOverrides;
  promotionsOverrides?: CartPromotionsOverrides;
  upsellOverrides?: CartUpsellOverrides;
};

export type CartState = {
  market: CartMarketContext;
  items: CartItem[];
  overrides: CartSettingsOverrides;
};

export type CartAction =
  | { type: "market/replace"; payload: CartMarketContext }
  | { type: "items/set"; payload: CartItem[] }
  | { type: "items/update"; payload: { id: string; item: CartItem } }
  | { type: "items/remove"; payload: { id: string } }
  | { type: "overrides/update-timer"; payload: CartTimerOverrides }
  | { type: "overrides/update-promotions"; payload: CartPromotionsOverrides }
  | { type: "overrides/update-upsell"; payload: CartUpsellOverrides };

export type CartDerived = {
  items: CartItem[];
  subtotalMinor: number;
  compareAtSubtotalMinor: number;
  timerText: string;
  timerLeftSeconds: number;
  promotionsEnabled: boolean;
  promotionsProgressPct: number;
  promotionsText: string;
};
