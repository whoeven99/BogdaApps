import type { ThemeEditorTarget, ThemeExtensionDetectionDebug } from "../../server/shopify/theme.server";
import type { StoreProductItem } from "../../server/shopify/products.server";

export type OfferListItem = {
  id: string;
  name: string;
  cartTitle: string;
  offerType: string;
  startTime: string | Date;
  endTime: string | Date;
  status: boolean;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  campaignConfigJson?: string | null;
  exposurePV?: number | null;
  addToCartPV?: number | null;
  gmv?: number | null;
  conversion?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export type OfferActionErrorPayload = {
  _offerActionError: true;
  message: string;
};

export type MarketItem = {
  id: string;
  name: string;
  handle: string;
};

export type IndexLoaderData = {
  offers?: OfferListItem[];
  storeProducts?: StoreProductItem[];
  markets: MarketItem[];
  themeTargets: ThemeEditorTarget[];
  shop: string;
  themeEditorStoreId: string;
  themeEditorThemeId: string;
  apiKey: string;
  ianaTimezone: string;
  themeExtensionEnabled: boolean;
  themeExtensionDetectionFailed: boolean;
  themeExtensionDebug?: ThemeExtensionDetectionDebug;
  themeExtensionMatchedThemeId?: string;
};
