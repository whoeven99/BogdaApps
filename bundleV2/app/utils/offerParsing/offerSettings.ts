import {
  sanitizeHexColor,
  clampNumber,
  parseNonNegativeNumberOrNull,
  sanitizeSingleLineText,
  sanitizeCheckboxUpsellsTitle,
  sanitizeCheckboxUpsellsSubtitle,
  sanitizeStickyAddToCartTitle,
  sanitizeStickyAddToCartSubtitle,
  sanitizeStickyAddToCartButtonText,
  normalizeCsvField,
  normalizeTargetMarkets,
  normalizeCustomerSegments,
  normalizeCustomerProfileFilters,
  normalizeIpCountryCodes,
  FIXED_SUBSCRIPTION_POSITION,
  FIXED_ONE_TIME_TITLE,
  FIXED_ONE_TIME_SUBTITLE,
  FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
  DEFAULT_CHECKBOX_UPSELLS_TITLE,
  DEFAULT_CHECKBOX_UPSELLS_SUBTITLE,
  DEFAULT_STICKY_ADD_TO_CART_TITLE,
  DEFAULT_STICKY_ADD_TO_CART_SUBTITLE,
  DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT,
} from "./sanitize";
import {
  ProgressiveGiftsConfig,
  DEFAULT_PROGRESSIVE_GIFTS,
  parseProgressiveGiftsConfig,
} from "./progressiveGifts";

export type OfferSettings = {
  title: string;
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  totalBudget: number | null;
  dailyBudget: number | null;
  customerSegments: string | null;
  customerProfileFilters: string | null;
  ipCountryCodes: string | null;
  markets: string | null;
  usageLimitPerCustomer: string;
  accentColor: string;
  cardBackgroundColor: string;
  titleFontSize: number;
  titleFontWeight: string;
  titleColor: string;
  borderColor: string;
  labelColor: string;
  buttonText: string;
  buttonPrimaryColor: string;
  showCustomButton: boolean;
  subscriptionEnabled: boolean;
  subscriptionPosition: typeof FIXED_SUBSCRIPTION_POSITION;
  subscriptionTitle: string;
  subscriptionSubtitle: string;
  oneTimeTitle: typeof FIXED_ONE_TIME_TITLE;
  oneTimeSubtitle: typeof FIXED_ONE_TIME_SUBTITLE;
  subscriptionDefaultSelected: typeof FIXED_SUBSCRIPTION_DEFAULT_SELECTED;
  compositionBarOrder?: string[];
  scheduleTimezone?: string;
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
  progressiveGifts: ProgressiveGiftsConfig;
};

export function parseOfferSettings(offerSettingsJson?: string | null): OfferSettings {
  if (!offerSettingsJson) {
    return {
      title: "Bundle & Save",
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
      customerProfileFilters: null,
      ipCountryCodes: null,
      markets: null,
      usageLimitPerCustomer: "unlimited",
      accentColor: "#008060",
      cardBackgroundColor: "#ffffff",
      titleFontSize: 14,
      titleFontWeight: "600",
      titleColor: "#111111",
      borderColor: "#dfe3e8",
      labelColor: "#ffffff",
      buttonText: "Add to Cart",
      buttonPrimaryColor: "#008060",
      showCustomButton: true,
      subscriptionEnabled: false,
      subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
      subscriptionTitle: "Subscribe & Save",
      subscriptionSubtitle: "Subscription pricing updates from your selling plan",
      oneTimeTitle: FIXED_ONE_TIME_TITLE,
      oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
      subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
      scheduleTimezone: undefined,
      checkboxUpsellsEnabled: false,
      checkboxUpsellsTitle: DEFAULT_CHECKBOX_UPSELLS_TITLE,
      checkboxUpsellsSubtitle: DEFAULT_CHECKBOX_UPSELLS_SUBTITLE,
      checkboxUpsellsDefaultChecked: false,
      stickyAddToCartEnabled: false,
      stickyAddToCartTitle: DEFAULT_STICKY_ADD_TO_CART_TITLE,
      stickyAddToCartSubtitle: DEFAULT_STICKY_ADD_TO_CART_SUBTITLE,
      stickyAddToCartButtonText: DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT,
      couponEnabled: false,
      couponCode: "",
      progressiveGifts: { ...DEFAULT_PROGRESSIVE_GIFTS },
    };
  }

  try {
    const parsed = JSON.parse(offerSettingsJson) as Partial<OfferSettings> &
      Record<string, unknown>;
    const layout = parsed.layoutFormat;
    const layoutFormat: OfferSettings["layoutFormat"] = [
      "vertical",
      "horizontal",
      "card",
      "compact",
    ].includes(String(layout))
      ? (layout as OfferSettings["layoutFormat"])
      : "vertical";

    return {
      title: parsed.title || "Bundle & Save",
      layoutFormat,
      totalBudget:
        parsed.totalBudget !== undefined
          ? parseNonNegativeNumberOrNull(parsed.totalBudget)
          : null,
      dailyBudget:
        parsed.dailyBudget !== undefined
          ? parseNonNegativeNumberOrNull(parsed.dailyBudget)
          : null,
      customerSegments: normalizeCsvField(
        parsed.customerSegments,
        normalizeCustomerSegments,
      ),
      customerProfileFilters: normalizeCsvField(
        parsed.customerProfileFilters,
        normalizeCustomerProfileFilters,
      ),
      ipCountryCodes: normalizeCsvField(
        parsed.ipCountryCodes,
        normalizeIpCountryCodes,
      ),
      markets: normalizeCsvField(parsed.markets, normalizeTargetMarkets),
      usageLimitPerCustomer: parsed.usageLimitPerCustomer ?? "unlimited",
      accentColor: sanitizeHexColor(parsed.accentColor, "#008060"),
      cardBackgroundColor: sanitizeHexColor(parsed.cardBackgroundColor, "#ffffff"),
      titleFontSize: clampNumber(parsed.titleFontSize, 10, 36, 14),
      titleFontWeight: ["400", "500", "600", "700"].includes(String(parsed.titleFontWeight))
        ? String(parsed.titleFontWeight)
        : "600",
      titleColor: sanitizeHexColor(parsed.titleColor, "#111111"),
      borderColor: sanitizeHexColor(parsed.borderColor, "#dfe3e8"),
      labelColor: sanitizeHexColor(parsed.labelColor, "#ffffff"),
      buttonText: parsed.buttonText || "Add to Cart",
      buttonPrimaryColor: sanitizeHexColor(parsed.buttonPrimaryColor, "#008060"),
      showCustomButton: parsed.showCustomButton !== false,
      subscriptionEnabled: parsed.subscriptionEnabled === true,
      subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
      subscriptionTitle: parsed.subscriptionTitle || "Subscribe & Save",
      subscriptionSubtitle:
        parsed.subscriptionSubtitle ||
        "Subscription pricing updates from your selling plan",
      oneTimeTitle: FIXED_ONE_TIME_TITLE,
      oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
      subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
      compositionBarOrder: Array.isArray(parsed.compositionBarOrder)
        ? parsed.compositionBarOrder
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : undefined,
      scheduleTimezone: parsed.scheduleTimezone,
      checkboxUpsellsEnabled: parsed.checkboxUpsellsEnabled === true,
      checkboxUpsellsTitle: sanitizeCheckboxUpsellsTitle(
        parsed.checkboxUpsellsTitle,
      ),
      checkboxUpsellsSubtitle: sanitizeCheckboxUpsellsSubtitle(
        parsed.checkboxUpsellsSubtitle,
      ),
      checkboxUpsellsDefaultChecked: parsed.checkboxUpsellsDefaultChecked === true,
      stickyAddToCartEnabled: parsed.stickyAddToCartEnabled === true,
      stickyAddToCartTitle: sanitizeStickyAddToCartTitle(
        parsed.stickyAddToCartTitle,
      ),
      stickyAddToCartSubtitle: sanitizeStickyAddToCartSubtitle(
        parsed.stickyAddToCartSubtitle,
      ),
      stickyAddToCartButtonText: sanitizeStickyAddToCartButtonText(
        parsed.stickyAddToCartButtonText,
      ),
      couponEnabled: parsed.couponEnabled === true,
      couponCode: sanitizeSingleLineText(parsed.couponCode, 64, ""),
      progressiveGifts: parseProgressiveGiftsConfig(parsed.progressiveGifts),
    };
  } catch {
    return parseOfferSettings(null);
  }
}
