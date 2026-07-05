// =============================================================================
// Barrel: re-exports all public API from the offerParsing module
// =============================================================================

// -- sanitize.ts: utility functions & constants --
export {
  normalizeOfferNameKey,
  sanitizeHexColor,
  OFFER_TEXT_LIMITS,
  LONG_RUNNING_OFFER_END_TIME_ISO,
  FIXED_SUBSCRIPTION_POSITION,
  FIXED_ONE_TIME_TITLE,
  FIXED_ONE_TIME_SUBTITLE,
  FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
  sanitizeSingleLineText,
  clampNumber,
  parseNonNegativeNumberOrNull,
  isLongRunningOfferEndTime,
  normalizeOfferEndTimeForUi,
  normalizeUniqueStringList,
  normalizeDateLikeValue,
  sanitizeCheckboxUpsellsTitle,
  sanitizeCheckboxUpsellsSubtitle,
  sanitizeStickyAddToCartTitle,
  sanitizeStickyAddToCartSubtitle,
  sanitizeStickyAddToCartButtonText,
  normalizeCsvField,
  normalizeTargetMarkets,
  normalizeCustomerSegments,
  normalizeCustomerProfileFilters,
  normalizeDraftIpCountryCodes,
  normalizeIpCountryCodes,
  getInvalidIpCountryCodes,
  DEFAULT_CHECKBOX_UPSELLS_TITLE,
  DEFAULT_CHECKBOX_UPSELLS_SUBTITLE,
  DEFAULT_STICKY_ADD_TO_CART_TITLE,
  DEFAULT_STICKY_ADD_TO_CART_SUBTITLE,
  DEFAULT_STICKY_ADD_TO_CART_BUTTON_TEXT,
} from "./sanitize";

// -- progressiveGifts.ts: progressive gift types & parsing --
export {
  PROGRESSIVE_GIFTS_LINE_PROPERTY_TIER,
  PROGRESSIVE_GIFTS_LINE_PROPERTY_OFFER_ID,
  DEFAULT_PROGRESSIVE_GIFTS,
  parseProgressiveGiftsConfig,
  progressiveGiftsConfigToStorableJson,
  parseProgressiveGiftsFromOfferSettingsJson,
  isProgressiveGiftUnlocked,
} from "./progressiveGifts";
export type {
  ProgressiveGiftType,
  ProgressiveGiftUnlockMode,
  ProgressiveGift,
  ProgressiveGiftsConfig,
} from "./progressiveGifts";

// -- offerSettings.ts: OfferSettings type & parsing --
export { parseOfferSettings } from "./offerSettings";
export type { OfferSettings } from "./offerSettings";

// -- types.ts: all type definitions & display helpers --
export {
  getBxgyDisplayMeta,
  inferBxgyTitleSource,
  inferBxgySubtitleSource,
  inferDifferentProductsTitleSource,
  inferDifferentProductsSubtitleSource,
  inferCompleteBundleTitleSource,
  inferCompleteBundleSubtitleSource,
  resolveBxgyDisplayTitle,
  resolveBxgyDisplaySubtitle,
} from "./types";
export type {
  DiscountRule,
  PerProductDiscountRule,
  DifferentProductsDiscountRule,
  CampaignScope,
  QuantityBreakTier,
  QuantityBreaksLogicBlock,
  QuantityBreaksDifferentLogicBlock,
  OfferCardDisplayBlock,
  CountdownDisplayBlock,
  CampaignSettings,
  CampaignConfig,
  BxgyDiscountRule,
  BxgyDisplayMeta,
  FreeGiftRule,
  BxgyLogicBlock,
  FreeGiftLogicBlock,
  CompleteBundlePricingMode,
  CompleteBundleProduct,
  CompleteBundleBar,
  CompleteBundleConfig,
  CompleteBundleLogicBlock,
  SubscriptionLogicBlock,
  LogicBlock,
  DisplayBlock,
} from "./types";

// -- discountRules.ts: discount rules parsing & normalization --
export {
  isSingleDiscountRule,
  buildDraftRuleId,
  createDefaultSingleDiscountRule,
  normalizeDiscountRules,
  isSingleDifferentProductsRule,
  createDefaultSingleDifferentProductsRule,
  normalizeDifferentProductsDiscountRules,
  isSingleBxgyRule,
  createDefaultSingleBxgyRule,
  normalizeBxgyRules,
  isSingleFreeGiftRule,
  createDefaultSingleFreeGiftRule,
  normalizeFreeGiftRules,
  parseDiscountRules,
  sanitizeQuantityBreakTier,
  sanitizeBxgyTier,
  sanitizeDifferentProductsTier,
  sanitizeFreeGiftTier,
  parseSelectedProductIds,
  parsePerProductDiscountRules,
  buildPerProductDiscountRulesJson,
  calculateQuantityBreakPricing,
  parseFreeGiftSelectedProducts,
  parseBxgyDiscountRules,
  parseFreeGiftRules,
  buildBxgyDiscountRulesJson,
  parseDifferentProductsDiscountRules,
  buildDifferentProductsDiscountRulesJson,
  buildFreeGiftRulesJson,
} from "./discountRules";

// -- completeBundle.ts: complete-bundle types & config building --
export {
  isCompleteBundleSingleBar,
  createDefaultCompleteBundleSingleBar,
  normalizeCompleteBundleBars,
  parseCompleteBundleConfig,
  buildCompleteBundleConfig,
} from "./completeBundle";

// -- campaignConfig.ts: campaign config parsing & compilation --
export {
  parseCampaignConfig,
  isOfferPublishedForBundleMetafieldSync,
  migrateLegacyOfferToCampaignConfig,
  compileCampaignRuntimeOutputs,
  buildLegacyFieldsFromCampaignConfig,
  buildOfferSettingsJsonFromCampaignConfig,
  buildPersistedOfferFieldsFromCampaignConfig,
  getPrimaryOfferTypeFromCampaignConfig,
  resolveOfferTypeFromCampaignConfig,
  getOfferDisplayType,
  getOfferRulesText,
  getOfferScheduleTimezone,
} from "./campaignConfig";
export type {
  CampaignRuntimeModuleOutput,
  CampaignRuntimeOutputs,
} from "./campaignConfig";

// -- trimPayload.ts: function payload trimming & packaging --
export {
  FUNCTION_PACK_PRODUCT_IDS_THRESHOLD,
  packProductIdsForFunctionPayload,
  trimSelectedProductsJsonForFunction,
  trimOfferSettingsJsonForFunction,
  trimDiscountRulesJsonForFunction,
  resolveFunctionDiscountClassesForOffer,
  buildSelectedProductsPayloadForOfferType,
  buildDiscountRulesPayloadForOfferType,
} from "./trimPayload";
export type { FunctionDiscountClass } from "./trimPayload";
