import {
  FIXED_SUBSCRIPTION_POSITION,
  FIXED_ONE_TIME_TITLE,
  FIXED_ONE_TIME_SUBTITLE,
  FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
} from "./sanitize";
import type { OfferSettings } from "./offerSettings";

export type DiscountRule = {
  id?: string;
  count: number;
  discountPercent: number;
  tierType?: "single" | "standard";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
  discountClass?: "product" | "order" | "shipping";
  offerKind?: "percentage_discount" | "free_gift" | "free_shipping";
  conditionType?: "item_quantity" | "cart_amount";
  amountThreshold?: number;
  rewardType?: "percentage_off" | "gift_product" | "free_shipping";
  rewardProductIds?: string[];
  giftQuantity?: number;
  logicType?: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
};

export type PerProductDiscountRule = {
  productId?: string;
  variantId?: string;
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

export type DifferentProductsDiscountRule = {
  id?: string;
  count: number;
  discountPercent: number;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  maxUsesPerOrder: number;
  tierType: "single" | "bxgy" | "simple";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
};

export type CampaignScope = {
  productIds: string[];
  markets: string[];
  customerSegments: string[];
  customerProfileFilters: string[];
  ipCountryCodes: string[];
};

export type QuantityBreakTier = {
  id?: string;
  qty: number;
  discountPercent: number;
  tierType?: "single" | "standard";
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
  discountClass?: "product" | "order" | "shipping";
  offerKind?: "percentage_discount" | "free_gift" | "free_shipping";
  conditionType?: "item_quantity" | "cart_amount";
  amountThreshold?: number;
  rewardType?: "percentage_off" | "gift_product" | "free_shipping";
  rewardProductIds?: string[];
  giftQuantity?: number;
  logicType?: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
};

export type QuantityBreaksLogicBlock = {
  id: string;
  type: "quantity-breaks";
  config: {
    tiers: QuantityBreakTier[];
  };
};

export type QuantityBreaksDifferentLogicBlock = {
  id: string;
  type: "quantity-breaks-different";
  config: {
    tiers: DifferentProductsDiscountRule[];
  };
};

export type OfferCardDisplayBlock = {
  id: string;
  type: "offer-card";
  logicBlockRef: string;
  config: {
    title: string;
    layoutFormat: OfferSettings["layoutFormat"];
    accentColor: string;
    cardBackgroundColor: string;
    borderColor: string;
    labelColor: string;
    titleFontSize: number;
    titleFontWeight: string;
    titleColor: string;
    buttonText: string;
    buttonPrimaryColor: string;
    showCustomButton: boolean;
  };
};

export type CountdownDisplayBlock = {
  id: string;
  type: "countdown";
  config: {
    endTimeMode: "campaign-end-time";
    label: string;
  };
};

export type CampaignSettings = {
  status: boolean;
  startTime: string;
  endTime: string;
  scheduleTimezone?: string;
  totalBudget: number | null;
  dailyBudget: number | null;
  usageLimitPerCustomer: string;
  compositionBarOrder?: string[];
  checkboxUpsellsEnabled: boolean;
  checkboxUpsellsTitle: string;
  checkboxUpsellsSubtitle: string;
  checkboxUpsellsDefaultChecked: boolean;
  stickyAddToCartEnabled: boolean;
  stickyAddToCartTitle: string;
  stickyAddToCartSubtitle: string;
  stickyAddToCartButtonText: string;
  couponEnabled: boolean;
  couponCode: string;
};

export type CampaignConfig = {
  version: 1;
  scope: CampaignScope;
  logicBlocks: LogicBlock[];
  displayBlocks: DisplayBlock[];
  settings: CampaignSettings;
};

export type BxgyDiscountRule = {
  id?: string;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxUsesPerOrder: number;
  /** Count threshold: promotion triggers when cart has this many items in buyProductIds */
  count: number;
  tierType?: "single" | "bxgy" | "simple";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
};

export type BxgyDisplayMeta = {
  buyQuantity: number;
  configuredGetQuantity: number;
  bundleQuantity: number;
  freeQuantity: number;
  semantics: "free_items" | "total_items";
  title: string;
  subtitle: string;
  price: string;
  saveLabel: string;
  summary: string;
};

export function getBxgyDisplayMeta(rule: {
  buyQuantity?: unknown;
  getQuantity?: unknown;
}): BxgyDisplayMeta {
  const buyQuantity = Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1));
  const configuredGetQuantity = Math.max(1, Math.trunc(Number(rule.getQuantity) || 1));
  const usesTotalItemsSemantics = configuredGetQuantity > buyQuantity;
  const bundleQuantity = usesTotalItemsSemantics
    ? configuredGetQuantity
    : buyQuantity + configuredGetQuantity;
  const freeQuantity = usesTotalItemsSemantics
    ? Math.max(1, bundleQuantity - buyQuantity)
    : configuredGetQuantity;

  if (usesTotalItemsSemantics) {
    return {
      buyQuantity,
      configuredGetQuantity,
      bundleQuantity,
      freeQuantity,
      semantics: "total_items",
      title: `Buy ${buyQuantity}, Get ${bundleQuantity}`,
      subtitle: "",
      price: "",
      saveLabel: "",
      summary: `Buy ${buyQuantity}, get ${bundleQuantity}`,
    };
  }

  return {
    buyQuantity,
    configuredGetQuantity,
    bundleQuantity,
    freeQuantity,
    semantics: "free_items",
    title: `Buy ${buyQuantity}, Get ${bundleQuantity}`,
    subtitle: "",
    price: "",
    saveLabel: "",
    summary: `Buy ${buyQuantity}, get ${bundleQuantity}`,
  };
}

const BXGY_AUTO_TITLE_PATTERN = /^buy\s*\d+\s*,\s*get\s*\d+(?:\s+(?:free|total))?$/i;
const BXGY_AUTO_SUBTITLE_PATTERN =
  /same product|reward item|cheapest eligible|bundle tier|paying for|total items/i;
const DIFFERENT_PRODUCTS_AUTO_TITLE_PATTERN = /^(any\s+\d+\s+items|rule)$/i;
const DIFFERENT_PRODUCTS_AUTO_SUBTITLE_PATTERN =
  /includes .* trigger product|mix any \d+ from \d+ (?:eligible|shared-pool) products|mix across \d+ (?:eligible|shared-pool) products/i;
const COMPLETE_BUNDLE_AUTO_TITLE_PATTERN = /^(single|bar #\d+|complete the bundle)$/i;
const COMPLETE_BUNDLE_AUTO_SUBTITLE_PATTERN =
  /standard price|pick \d+-\d+ bundle items|current product \+ \d+-\d+ bundle items from \d+ options/i;

function inferDisplayTextSource(
  explicitValue: unknown,
  autoPattern: RegExp,
): "auto" | "custom" {
  const normalizedValue = String(explicitValue ?? "").trim();
  if (!normalizedValue) return "auto";
  return autoPattern.test(normalizedValue) ? "auto" : "custom";
}

export function inferBxgyTitleSource(explicitTitle?: unknown): "auto" | "custom" {
  return inferDisplayTextSource(explicitTitle, BXGY_AUTO_TITLE_PATTERN);
}

export function inferBxgySubtitleSource(explicitSubtitle?: unknown): "auto" | "custom" {
  return inferDisplayTextSource(explicitSubtitle, BXGY_AUTO_SUBTITLE_PATTERN);
}

export function inferDifferentProductsTitleSource(
  explicitTitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitTitle, DIFFERENT_PRODUCTS_AUTO_TITLE_PATTERN);
}

export function inferDifferentProductsSubtitleSource(
  explicitSubtitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitSubtitle, DIFFERENT_PRODUCTS_AUTO_SUBTITLE_PATTERN);
}

export function inferCompleteBundleTitleSource(
  explicitTitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitTitle, COMPLETE_BUNDLE_AUTO_TITLE_PATTERN);
}

export function inferCompleteBundleSubtitleSource(
  explicitSubtitle?: unknown,
): "auto" | "custom" {
  return inferDisplayTextSource(explicitSubtitle, COMPLETE_BUNDLE_AUTO_SUBTITLE_PATTERN);
}

export function resolveBxgyDisplayTitle(
  rule: {
    buyQuantity?: unknown;
    getQuantity?: unknown;
  },
  explicitTitle?: unknown,
  explicitTitleSource?: "auto" | "custom",
): string {
  const normalizedTitle = String(explicitTitle ?? "").trim();
  if (explicitTitleSource === "custom" && normalizedTitle) {
    return normalizedTitle;
  }
  if (normalizedTitle && inferBxgyTitleSource(normalizedTitle) === "custom") {
    return normalizedTitle;
  }
  return getBxgyDisplayMeta(rule).title;
}

export function resolveBxgyDisplaySubtitle(
  explicitSubtitle?: unknown,
  explicitSubtitleSource?: "auto" | "custom",
): string {
  const normalizedSubtitle = String(explicitSubtitle ?? "").trim();
  if (!normalizedSubtitle) {
    return "";
  }
  if (explicitSubtitleSource === "custom") {
    return normalizedSubtitle;
  }
  if (inferBxgySubtitleSource(normalizedSubtitle) === "auto") {
    return "";
  }
  return normalizedSubtitle;
}

export type FreeGiftRule = {
  id?: string;
  count: number;
  giftQuantity: number;
  giftProductIds?: string[];
  tierType?: "single";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
};

export type BxgyLogicBlock = {
  id: string;
  type: "bxgy";
  config: {
    tiers: BxgyDiscountRule[];
  };
};

export type FreeGiftLogicBlock = {
  id: string;
  type: "free-gift";
  config: {
    triggerProductIds: string[];
    giftProductIds: string[];
    tiers: FreeGiftRule[];
  };
};

export type CompleteBundlePricingMode =
  | "full_price"
  | "percentage_off"
  | "amount_off"
  | "fixed_price";

export type CompleteBundleProduct = {
  productId: string;
  handle?: string;
  title?: string;
  image?: string;
  price?: string;
  defaultVariantId?: string;
  selectedVariantId?: string;
  selectionMode?: "product" | "variant";
  // 变体 option 值（如 Color/Size），用于前端预览回显
  selectedOptions?: Record<string, string>;
  /** 单件商品的定价：Full price / 百分比 / 立减金额 / 固定价 */
  pricing?: {
    mode: CompleteBundlePricingMode;
    value: number;
  };
  variants?: Array<{
    id: string;
    title: string;
    price?: string;
    selectedOptions?: Array<{ name: string; value: string }>;
  }>;
};

export type CompleteBundleBar = {
  id: string;
  type: "single" | "quantity-break-same";
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  excludeTriggerProduct?: boolean;
  quantity: number;
  products: CompleteBundleProduct[];
  pricing: {
    mode: CompleteBundlePricingMode;
    value: number;
  };
};

export type CompleteBundleConfig = {
  triggerProductIds?: string[];
  bars: CompleteBundleBar[];
};

export type CompleteBundleLogicBlock = {
  id: string;
  type: "complete-bundle";
  config: CompleteBundleConfig;
};

export type SubscriptionLogicBlock = {
  id: string;
  type: "subscription";
  config: {
    enabled: boolean;
    position: typeof FIXED_SUBSCRIPTION_POSITION;
    title: string;
    subtitle: string;
    oneTimeTitle: typeof FIXED_ONE_TIME_TITLE;
    oneTimeSubtitle: typeof FIXED_ONE_TIME_SUBTITLE;
    defaultSelected: typeof FIXED_SUBSCRIPTION_DEFAULT_SELECTED;
    productIds: string[];
  };
};

export type LogicBlock =
  | QuantityBreaksLogicBlock
  | QuantityBreaksDifferentLogicBlock
  | BxgyLogicBlock
  | FreeGiftLogicBlock
  | CompleteBundleLogicBlock
  | SubscriptionLogicBlock;
export type DisplayBlock = OfferCardDisplayBlock | CountdownDisplayBlock;
