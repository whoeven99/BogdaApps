export type PreviewMoneyFormat =
  | "amount"
  | "amount_no_decimals"
  | "amount_with_comma_separator"
  | "amount_no_decimals_with_comma_separator"
  | "amount_with_apostrophe_separator"
  | "amount_no_decimals_with_space_separator"
  | "amount_with_space_separator"
  | "amount_with_period_and_space_separator";

export type TaxDisplay = "inclusive" | "exclusive" | "unknown";

export type PreviewMarketContext = {
  marketId: string;
  marketName: string;
  currencyCode: string;
  currencySymbol: string;
  moneyFormat: PreviewMoneyFormat;
  locale: string;
  taxDisplay: TaxDisplay;
  exchangeRate?: number;
};

export type PreviewMarketContextMap = {
  currentMarketId: string;
  contexts: Record<string, PreviewMarketContext>;
};

export type PreviewLineItemOption = {
  name: string;
  value: string;
};

export type PreviewLineItemProperty = {
  name: string;
  value: string;
};

export type PreviewCartItem = {
  id: string;
  productId?: string;
  variantId?: string;
  productTitle: string;
  variantTitle: string;
  optionsWithValues: PreviewLineItemOption[];
  quantity: number;
  priceMinor: number;
  compareAtMinor?: number | null;
  image: string;
  vendor?: string;
  properties?: PreviewLineItemProperty[];
};

export type PreviewTimerOverrides = {
  enabled?: boolean;
  durationSeconds?: number;
  textTemplate?: string;
};

export type PreviewPromotionsOverrides = {
  enabled?: boolean;
  freeShippingThresholdMinor?: number;
  successMessage?: string;
  progressMessage?: string;
};

export type PreviewUpsellItem = {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  priceMinor: number;
  compareAtMinor?: number | null;
  ctaLabel?: string;
};

export type PreviewUpsellOverrides = {
  enabled?: boolean;
  title?: string;
  items?: PreviewUpsellItem[];
};

export type PreviewSettings = {
  marketId: string;
  items: PreviewCartItem[];
  timerOverrides?: PreviewTimerOverrides;
  promotionsOverrides?: PreviewPromotionsOverrides;
  upsellOverrides?: PreviewUpsellOverrides;
};

export type PreviewState = {
  market: PreviewMarketContext;
  settings: PreviewSettings;
};

export type PreviewAction =
  | { type: "market/replace"; payload: PreviewMarketContext }
  | { type: "settings/replace"; payload: PreviewSettings }
  | { type: "settings/update-items"; payload: PreviewCartItem[] }
  | { type: "settings/update-item"; payload: { id: string; item: PreviewCartItem } }
  | { type: "settings/remove-item"; payload: { id: string } }
  | { type: "settings/update-timer"; payload: PreviewTimerOverrides }
  | { type: "settings/update-promotions"; payload: PreviewPromotionsOverrides }
  | { type: "settings/update-upsell"; payload: PreviewUpsellOverrides };
