import type {
  CartItem,
  CartLineItemOption,
  CartLineItemProperty,
  CartMarketContext,
  CartMoneyFormat,
  CartPromotionsOverrides,
  CartSettingsOverrides,
  CartTaxDisplay,
  CartTimerOverrides,
  CartUpsellItem,
  CartUpsellOverrides,
} from "../../cart-runtime/types";

export type PreviewMoneyFormat = CartMoneyFormat;

export type TaxDisplay = CartTaxDisplay;

export type PreviewMarketContext = CartMarketContext;

export type PreviewMarketContextMap = {
  currentMarketId: string;
  contexts: Record<string, PreviewMarketContext>;
};

export type PreviewLineItemOption = CartLineItemOption;

export type PreviewLineItemProperty = CartLineItemProperty;

export type PreviewCartItem = CartItem;

export type PreviewTimerOverrides = CartTimerOverrides;

export type PreviewPromotionsOverrides = CartPromotionsOverrides;

export type PreviewUpsellItem = CartUpsellItem;

export type PreviewUpsellOverrides = CartUpsellOverrides;

export type PreviewSettings = {
  marketId: string;
  items: PreviewCartItem[];
} & CartSettingsOverrides;

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
