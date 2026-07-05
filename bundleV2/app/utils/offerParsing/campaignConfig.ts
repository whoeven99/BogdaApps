import {
  sanitizeHexColor,
  clampNumber,
  parseNonNegativeNumberOrNull,
  sanitizeSingleLineText,
  normalizeOfferEndTimeForUi,
  normalizeUniqueStringList,
  normalizeTargetMarkets,
  normalizeCustomerSegments,
  normalizeCustomerProfileFilters,
  normalizeIpCountryCodes,
  normalizeDateLikeValue,
  sanitizeCheckboxUpsellsTitle,
  sanitizeCheckboxUpsellsSubtitle,
  sanitizeStickyAddToCartTitle,
  sanitizeStickyAddToCartSubtitle,
  sanitizeStickyAddToCartButtonText,
  FIXED_SUBSCRIPTION_POSITION,
  FIXED_ONE_TIME_TITLE,
  FIXED_ONE_TIME_SUBTITLE,
  FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
} from "./sanitize";
import type { OfferSettings } from "./offerSettings";
import { parseOfferSettings } from "./offerSettings";
import type {
  CampaignConfig,
  CampaignScope,
  CampaignSettings,
  LogicBlock,
  DisplayBlock,
  QuantityBreaksLogicBlock,
  QuantityBreaksDifferentLogicBlock,
  BxgyLogicBlock,
  FreeGiftLogicBlock,
  CompleteBundleLogicBlock,
  CompleteBundleConfig,
  SubscriptionLogicBlock,
  QuantityBreakTier,
  OfferCardDisplayBlock,
  CountdownDisplayBlock,
  DiscountRule,
  BxgyDiscountRule,
  DifferentProductsDiscountRule,
  FreeGiftRule,
  BxgyDisplayMeta,
} from "./types";
import {
  getBxgyDisplayMeta,
} from "./types";
import {
  isSingleDiscountRule,
  parseDiscountRules,
  normalizeDiscountRules,
  buildDraftRuleId,
  sanitizeQuantityBreakTier,
  sanitizeBxgyTier,
  sanitizeDifferentProductsTier,
  sanitizeFreeGiftTier,
  parseSelectedProductIds,
  parseBxgyDiscountRules,
  parseFreeGiftRules,
  parseFreeGiftSelectedProducts,
  parseDifferentProductsDiscountRules,
  buildBxgyDiscountRulesJson,
  buildDifferentProductsDiscountRulesJson,
  buildFreeGiftRulesJson,
} from "./discountRules";
import {
  isCompleteBundleSingleBar,
  createDefaultCompleteBundleSingleBar,
  normalizeCompleteBundleBars,
  parseCompleteBundleConfig,
  buildCompleteBundleConfig,
} from "./completeBundle";
import {
  trimSelectedProductsJsonForFunction,
} from "./trimPayload";
import {
  DEFAULT_PROGRESSIVE_GIFTS,
  progressiveGiftsConfigToStorableJson,
  parseProgressiveGiftsFromOfferSettingsJson,
} from "./progressiveGifts";

function buildDefaultOfferCardConfig(
  settings: OfferSettings,
): OfferCardDisplayBlock["config"] {
  return {
    title: settings.title || "Bundle & Save",
    layoutFormat: settings.layoutFormat,
    accentColor: sanitizeHexColor(settings.accentColor, "#008060"),
    cardBackgroundColor: sanitizeHexColor(
      settings.cardBackgroundColor,
      "#ffffff",
    ),
    borderColor: sanitizeHexColor(settings.borderColor, "#dfe3e8"),
    labelColor: sanitizeHexColor(settings.labelColor, "#ffffff"),
    titleFontSize: clampNumber(settings.titleFontSize, 10, 36, 14),
    titleFontWeight: ["400", "500", "600", "700"].includes(
      String(settings.titleFontWeight),
    )
      ? String(settings.titleFontWeight)
      : "600",
    titleColor: sanitizeHexColor(settings.titleColor, "#111111"),
    buttonText: settings.buttonText || "Add to Cart",
    buttonPrimaryColor: sanitizeHexColor(
      settings.buttonPrimaryColor,
      "#008060",
    ),
    showCustomButton: settings.showCustomButton !== false,
  };
}

function sanitizeSubscriptionLogicConfig(raw: unknown): SubscriptionLogicBlock["config"] | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const productIds = Array.isArray(item.productIds)
    ? item.productIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];
  return {
    enabled: item.enabled !== false,
    position: FIXED_SUBSCRIPTION_POSITION,
    title: sanitizeSingleLineText(item.title, 60, "Subscribe & Save"),
    subtitle: sanitizeSingleLineText(
      item.subtitle,
      60,
      "Subscription pricing updates from your selling plan",
    ),
    oneTimeTitle: FIXED_ONE_TIME_TITLE,
    oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
    defaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
    productIds,
  };
}

function sanitizeLogicBlock(raw: unknown): LogicBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const config = item.config;
  const configRecord =
    config && typeof config === "object" ? (config as Record<string, unknown>) : {};

  if (item.type === "quantity-breaks") {
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeQuantityBreakTier(tier))
      .filter((tier): tier is QuantityBreakTier => tier !== null)
      .sort((a, b) => a.qty - b.qty)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (tiers.length === 0) return null;

    return {
      id: typeof item.id === "string" && item.id ? item.id : "logic-quantity-breaks",
      type: "quantity-breaks",
      config: { tiers },
    };
  }

  if (item.type === "quantity-breaks-different") {
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeDifferentProductsTier(tier))
      .filter((tier): tier is DifferentProductsDiscountRule => tier !== null)
      .sort((a, b) => a.count - b.count)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (tiers.length === 0) return null;

    return {
      id:
        typeof item.id === "string" && item.id
          ? item.id
          : "logic-quantity-breaks-different",
      type: "quantity-breaks-different",
      config: { tiers },
    };
  }

  if (item.type === "bxgy") {
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeBxgyTier(tier))
      .filter((tier): tier is BxgyDiscountRule => tier !== null)
      .sort((a, b) => a.count - b.count)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (tiers.length === 0) return null;

    return {
      id: typeof item.id === "string" && item.id ? item.id : "logic-bxgy",
      type: "bxgy",
      config: { tiers },
    };
  }

  if (item.type === "free-gift") {
    const triggerProductIds = Array.isArray(configRecord.triggerProductIds)
      ? configRecord.triggerProductIds
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : [];
    const giftProductIds = Array.isArray(configRecord.giftProductIds)
      ? configRecord.giftProductIds
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : [];
    const tiersRaw = Array.isArray(configRecord.tiers) ? configRecord.tiers : [];
    const tiers = tiersRaw
      .map((tier) => sanitizeFreeGiftTier(tier))
      .filter((tier): tier is FreeGiftRule => tier !== null)
      .sort((a, b) => a.count - b.count)
      .filter((tier, index, arr) => index === arr.findIndex((it) => it.id === tier.id));

    if (triggerProductIds.length === 0 || giftProductIds.length === 0 || tiers.length === 0) {
      return null;
    }

    return {
      id: typeof item.id === "string" && item.id ? item.id : "logic-free-gift",
      type: "free-gift",
      config: {
        triggerProductIds,
        giftProductIds,
        tiers,
      },
    };
  }

  if (item.type === "complete-bundle") {
    const config = buildCompleteBundleConfig({
      triggerProductIds: Array.isArray(configRecord.triggerProductIds)
        ? configRecord.triggerProductIds
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [],
      bars: Array.isArray(configRecord.bars) ? configRecord.bars : [],
    });
    if (config.bars.length === 0 && (config.triggerProductIds?.length ?? 0) === 0) return null;
    return {
      id:
        typeof item.id === "string" && item.id ? item.id : "logic-complete-bundle",
      type: "complete-bundle",
      config,
    };
  }

  if (item.type === "subscription") {
    const config = sanitizeSubscriptionLogicConfig(configRecord);
    if (!config) return null;
    return {
      id:
        typeof item.id === "string" && item.id ? item.id : "logic-subscription",
      type: "subscription",
      config,
    };
  }

  return null;
}

function sanitizeDisplayBlock(raw: unknown): DisplayBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const id = typeof item.id === "string" && item.id ? item.id : "display-block";

  if (item.type === "offer-card") {
    const config =
      item.config && typeof item.config === "object"
        ? (item.config as Record<string, unknown>)
        : {};
    const layoutCandidate = String(config.layoutFormat || "vertical");
    const layoutFormat: OfferSettings["layoutFormat"] = [
      "vertical",
      "horizontal",
      "card",
      "compact",
    ].includes(layoutCandidate)
      ? (layoutCandidate as OfferSettings["layoutFormat"])
      : "vertical";
    return {
      id,
      type: "offer-card",
      logicBlockRef:
        typeof item.logicBlockRef === "string" && item.logicBlockRef
          ? item.logicBlockRef
          : "logic-quantity-breaks",
      config: {
        title: typeof config.title === "string" && config.title
          ? config.title
          : "Bundle & Save",
        layoutFormat,
        accentColor: sanitizeHexColor(config.accentColor, "#008060"),
        cardBackgroundColor: sanitizeHexColor(
          config.cardBackgroundColor,
          "#ffffff",
        ),
        borderColor: sanitizeHexColor(config.borderColor, "#dfe3e8"),
        labelColor: sanitizeHexColor(config.labelColor, "#ffffff"),
        titleFontSize: clampNumber(config.titleFontSize, 10, 36, 14),
        titleFontWeight: ["400", "500", "600", "700"].includes(
          String(config.titleFontWeight),
        )
          ? String(config.titleFontWeight)
          : "600",
        titleColor: sanitizeHexColor(config.titleColor, "#111111"),
        buttonText:
          typeof config.buttonText === "string" && config.buttonText
            ? config.buttonText
            : "Add to Cart",
        buttonPrimaryColor: sanitizeHexColor(
          config.buttonPrimaryColor,
          "#008060",
        ),
        showCustomButton: config.showCustomButton !== false,
      },
    };
  }

  if (item.type === "countdown") {
    const config =
      item.config && typeof item.config === "object"
        ? (item.config as Record<string, unknown>)
        : {};
    return {
      id,
      type: "countdown",
      config: {
        endTimeMode: "campaign-end-time",
        label:
          typeof config.label === "string" && config.label
            ? config.label
            : "Limited time offer",
      },
    };
  }

  return null;
}

export function parseCampaignConfig(
  campaignConfigJson?: string | null,
): CampaignConfig | null {
  if (!campaignConfigJson) return null;

  try {
    const parsed = JSON.parse(campaignConfigJson) as Record<string, unknown>;
    const scopeRaw =
      parsed.scope && typeof parsed.scope === "object"
        ? (parsed.scope as Record<string, unknown>)
        : {};
    const settingsRaw =
      parsed.settings && typeof parsed.settings === "object"
        ? (parsed.settings as Record<string, unknown>)
        : {};
    const logicBlocksRaw = Array.isArray(parsed.logicBlocks)
      ? parsed.logicBlocks
      : [];
    const displayBlocksRaw = Array.isArray(parsed.displayBlocks)
      ? parsed.displayBlocks
      : [];

    const logicBlocks = logicBlocksRaw
      .map((block) => sanitizeLogicBlock(block))
      .filter((block): block is LogicBlock => block !== null)
      .filter((block, index, blocks) => {
        // Historical campaign payloads may contain the same module repeated
        // multiple times with the same logic block id. Keep the first copy so
        // preview/runtime compilation does not duplicate rules.
        return index === blocks.findIndex((candidate) => candidate.id === block.id);
      });
    if (logicBlocks.length === 0) return null;

    const logicIds = new Set(logicBlocks.map((block) => block.id));
    const displayBlocks = displayBlocksRaw
      .map((block) => sanitizeDisplayBlock(block))
      .filter((block): block is DisplayBlock => block !== null)
      .filter((block) =>
        block.type === "offer-card" ? logicIds.has(block.logicBlockRef) : true,
      );

    return {
      version: 1,
      scope: {
        productIds: Array.isArray(scopeRaw.productIds)
          ? normalizeUniqueStringList(
              scopeRaw.productIds.map((id) => String(id || "").trim()),
            )
          : [],
        markets: Array.isArray(scopeRaw.markets)
          ? normalizeTargetMarkets(
              scopeRaw.markets.map((market) => String(market || "").trim()),
            )
          : ["all"],
        customerSegments: Array.isArray(scopeRaw.customerSegments)
          ? normalizeCustomerSegments(
              scopeRaw.customerSegments.map((segment) => String(segment || "").trim()),
            )
          : ["all"],
        customerProfileFilters: Array.isArray(scopeRaw.customerProfileFilters)
          ? normalizeCustomerProfileFilters(
              scopeRaw.customerProfileFilters.map((value) => String(value || "").trim()),
            )
          : [],
        ipCountryCodes: Array.isArray(scopeRaw.ipCountryCodes)
          ? normalizeIpCountryCodes(
              scopeRaw.ipCountryCodes.map((value) => String(value || "").trim()),
            )
          : [],
      },
      logicBlocks,
      displayBlocks,
      settings: {
        status: settingsRaw.status !== false,
        startTime:
          typeof settingsRaw.startTime === "string" ? settingsRaw.startTime : "",
        endTime: normalizeOfferEndTimeForUi(settingsRaw.endTime),
        scheduleTimezone:
          typeof settingsRaw.scheduleTimezone === "string"
            ? settingsRaw.scheduleTimezone
            : undefined,
        totalBudget:
          settingsRaw.totalBudget !== undefined
            ? parseNonNegativeNumberOrNull(settingsRaw.totalBudget)
            : null,
        dailyBudget:
          settingsRaw.dailyBudget !== undefined
            ? parseNonNegativeNumberOrNull(settingsRaw.dailyBudget)
            : null,
        usageLimitPerCustomer:
          typeof settingsRaw.usageLimitPerCustomer === "string" &&
          settingsRaw.usageLimitPerCustomer
            ? settingsRaw.usageLimitPerCustomer
            : "unlimited",
        compositionBarOrder: Array.isArray(settingsRaw.compositionBarOrder)
          ? settingsRaw.compositionBarOrder
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : undefined,
        checkboxUpsellsEnabled: settingsRaw.checkboxUpsellsEnabled === true,
        checkboxUpsellsTitle: sanitizeCheckboxUpsellsTitle(
          settingsRaw.checkboxUpsellsTitle,
        ),
        checkboxUpsellsSubtitle: sanitizeCheckboxUpsellsSubtitle(
          settingsRaw.checkboxUpsellsSubtitle,
        ),
        checkboxUpsellsDefaultChecked: settingsRaw.checkboxUpsellsDefaultChecked === true,
        stickyAddToCartEnabled: settingsRaw.stickyAddToCartEnabled === true,
        stickyAddToCartTitle: sanitizeStickyAddToCartTitle(
          settingsRaw.stickyAddToCartTitle,
        ),
        stickyAddToCartSubtitle: sanitizeStickyAddToCartSubtitle(
          settingsRaw.stickyAddToCartSubtitle,
        ),
        stickyAddToCartButtonText: sanitizeStickyAddToCartButtonText(
          settingsRaw.stickyAddToCartButtonText,
        ),
        couponEnabled: settingsRaw.couponEnabled === true,
        couponCode: sanitizeSingleLineText(settingsRaw.couponCode, 64, ""),
      },
    };
  } catch {
    return null;
  }
}

/** 写入主题 `ciwi-bundle-offers` 与 Function `ciwi-bundle-offers-fn`：排除后台已停用的活动 */
export function isOfferPublishedForBundleMetafieldSync(offer: {
  status: boolean;
  campaignConfigJson?: string | null;
}): boolean {
  if (offer.status !== true) return false;
  const raw = offer.campaignConfigJson;
  if (raw == null || !String(raw).trim()) return true;
  const cfg = parseCampaignConfig(raw);
  if (cfg) return cfg.settings.status === true;
  try {
    const shallow = JSON.parse(String(raw)) as { settings?: { status?: unknown } };
    if (
      shallow?.settings &&
      typeof shallow.settings === "object" &&
      shallow.settings.status === false
    ) {
      return false;
    }
  } catch {
    // ignore
  }
  return true;
}

export function migrateLegacyOfferToCampaignConfig(params: {
  offerType?: string | null;
  selectedProductsJson?: string | null;
  discountRulesJson?: string | null;
  offerSettingsJson?: string | null;
  startTime?: string | Date | null;
  endTime?: string | Date | null;
  status?: boolean;
}): CampaignConfig {
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  const tiers = parseDiscountRules(params.discountRulesJson).map((rule) => ({
    id: rule.id,
    qty: rule.count,
    discountPercent: rule.discountPercent,
    title: rule.title || "",
    subtitle: rule.subtitle || "",
    badge: rule.badge || "",
    isDefault: !!rule.isDefault,
    discountClass: rule.discountClass,
    offerKind: rule.offerKind,
    conditionType: rule.conditionType,
    amountThreshold: rule.amountThreshold,
    rewardType: rule.rewardType,
    rewardProductIds: Array.isArray(rule.rewardProductIds) ? rule.rewardProductIds : [],
    giftQuantity: rule.giftQuantity,
    logicType: rule.logicType,
    buyQuantity: rule.buyQuantity,
    getQuantity: rule.getQuantity,
    maxUsesPerOrder: rule.maxUsesPerOrder,
  }));
  const productIds = parseSelectedProductIds(params.selectedProductsJson);
  const logicBlockId = "logic-quantity-breaks";
  const settings = {
    status: params.status !== false,
    startTime:
      params.startTime instanceof Date
        ? params.startTime.toISOString()
        : String(params.startTime || ""),
    endTime: normalizeOfferEndTimeForUi(params.endTime),
    scheduleTimezone: offerSettings.scheduleTimezone,
    totalBudget: offerSettings.totalBudget,
    dailyBudget: offerSettings.dailyBudget,
    usageLimitPerCustomer: offerSettings.usageLimitPerCustomer,
    compositionBarOrder: offerSettings.compositionBarOrder,
    checkboxUpsellsEnabled: offerSettings.checkboxUpsellsEnabled,
    checkboxUpsellsTitle: offerSettings.checkboxUpsellsTitle,
    checkboxUpsellsSubtitle: offerSettings.checkboxUpsellsSubtitle,
    checkboxUpsellsDefaultChecked: offerSettings.checkboxUpsellsDefaultChecked,
    stickyAddToCartEnabled: offerSettings.stickyAddToCartEnabled,
    stickyAddToCartTitle: offerSettings.stickyAddToCartTitle,
    stickyAddToCartSubtitle: offerSettings.stickyAddToCartSubtitle,
    stickyAddToCartButtonText: offerSettings.stickyAddToCartButtonText,
    couponEnabled: offerSettings.couponEnabled,
    couponCode: offerSettings.couponCode,
  };
  const targetingMarkets = normalizeTargetMarkets(
    offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
  );
  const targetingSegments = normalizeCustomerSegments(
    offerSettings.customerSegments ? offerSettings.customerSegments.split(",") : ["all"],
  );
  const targetingProfileFilters = normalizeCustomerProfileFilters(
    offerSettings.customerProfileFilters
      ? offerSettings.customerProfileFilters.split(",")
      : [],
  );
  const targetingIpCountryCodes = normalizeIpCountryCodes(
    offerSettings.ipCountryCodes ? offerSettings.ipCountryCodes.split(",") : [],
  );
  const offerType = String(params.offerType || "").trim();

  if (offerType === "bxgy") {
    let bxgySelectedProducts: { buyProducts?: string[]; getProducts?: string[] } = {};
    try {
      bxgySelectedProducts = JSON.parse(String(params.selectedProductsJson || "{}")) as {
        buyProducts?: string[];
        getProducts?: string[];
      };
    } catch {}
    const tiers = buildBxgyDiscountRulesJson(parseBxgyDiscountRules(params.discountRulesJson));
    const buyProducts = Array.isArray(bxgySelectedProducts.buyProducts)
      ? bxgySelectedProducts.buyProducts.map((id) => String(id || "").trim()).filter(Boolean)
      : [];
    const bxgyTiers =
      tiers.length > 0
        ? tiers
        : [
            {
              count: 2,
              buyQuantity: 2,
              getQuantity: 1,
              buyProductIds: buyProducts,
              getProductIds: buyProducts,
              discountPercent: 100,
              maxUsesPerOrder: 1,
              title: "",
              subtitle: "",
              badge: "",
              isDefault: true,
            },
          ];
    return {
      version: 1,
      scope: {
        productIds: Array.from(new Set(buyProducts)),
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-bxgy",
          type: "bxgy",
          config: { tiers: bxgyTiers },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-bxgy",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "quantity-breaks-different") {
    const differentProductsRules = buildDifferentProductsDiscountRulesJson(
      parseDifferentProductsDiscountRules(params.discountRulesJson),
    );
    const differentScopeProductIds = parseSelectedProductIds(
      params.selectedProductsJson,
    );
    const tiers =
      differentProductsRules.length > 0
        ? differentProductsRules
        : [
            {
              count: 2,
              discountPercent: 15,
              buyQuantity: 2,
              getQuantity: 0,
              buyProductIds: differentScopeProductIds,
              getProductIds: [],
              maxUsesPerOrder: 1,
              tierType: "simple" as const,
              title: "",
              subtitle: "",
              badge: "",
              isDefault: true,
            },
          ];
    return {
      version: 1,
      scope: {
        productIds: differentScopeProductIds,
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-quantity-breaks-different",
          type: "quantity-breaks-different",
          config: { tiers },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-quantity-breaks-different",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "free-gift") {
    const freeGiftSelectedProducts = parseFreeGiftSelectedProducts(
      params.selectedProductsJson,
    );
    const freeGiftRules = buildFreeGiftRulesJson(
      parseFreeGiftRules(params.discountRulesJson),
    );
    const triggerProducts = freeGiftSelectedProducts.triggerProducts;
    const giftProducts = freeGiftSelectedProducts.giftProducts;
    const tiers =
      freeGiftRules.length > 0
        ? freeGiftRules
        : [
            {
              count: 2,
              giftQuantity: 1,
              title: "",
              subtitle: "",
              badge: "",
              isDefault: true,
            },
          ];

    return {
      version: 1,
      scope: {
        productIds: Array.from(new Set(triggerProducts)),
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-free-gift",
          type: "free-gift",
          config: {
            triggerProductIds: triggerProducts,
            giftProductIds: giftProducts,
            tiers,
          },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-free-gift",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "complete-bundle") {
    const completeBundleConfig = buildCompleteBundleConfig(
      parseCompleteBundleConfig(params.selectedProductsJson),
    );
    return {
      version: 1,
      scope: {
        productIds: Array.from(new Set(completeBundleConfig.triggerProductIds ?? [])),
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-complete-bundle",
          type: "complete-bundle",
          config: completeBundleConfig,
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-complete-bundle",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  if (offerType === "subscription") {
    return {
      version: 1,
      scope: {
        productIds,
        markets: targetingMarkets,
        customerSegments: targetingSegments,
        customerProfileFilters: targetingProfileFilters,
        ipCountryCodes: targetingIpCountryCodes,
      },
      logicBlocks: [
        {
          id: "logic-subscription",
          type: "subscription",
          config: {
            enabled: offerSettings.subscriptionEnabled,
            position: FIXED_SUBSCRIPTION_POSITION,
            title: offerSettings.subscriptionTitle,
            subtitle: offerSettings.subscriptionSubtitle,
            oneTimeTitle: FIXED_ONE_TIME_TITLE,
            oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
            defaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
            productIds,
          },
        },
      ],
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: "logic-subscription",
          config: buildDefaultOfferCardConfig(offerSettings),
        },
      ],
      settings,
    };
  }

  return {
    version: 1,
    scope: {
      productIds,
      markets: targetingMarkets,
      customerSegments: targetingSegments,
      customerProfileFilters: targetingProfileFilters,
      ipCountryCodes: targetingIpCountryCodes,
    },
    logicBlocks: [
      {
        id: logicBlockId,
        type: "quantity-breaks",
        config: {
          tiers:
            tiers.length > 0
              ? tiers
              : [
                  {
                    qty: 2,
                    discountPercent: 10,
                    title: "",
                    subtitle: "",
                    badge: "",
                    isDefault: true,
                  },
                ],
        },
      },
    ],
    displayBlocks: [
      {
        id: "display-offer-card",
        type: "offer-card",
        logicBlockRef: logicBlockId,
        config: buildDefaultOfferCardConfig(offerSettings),
      },
    ],
    settings,
  };
}

export type CampaignRuntimeModuleOutput = {
  offerType: string;
  selectedProductsJson: string | null;
  selectedProductsJsonForFunction: string | null;
  discountRulesJson: string | null;
  referencedProductIds: string[];
  storefrontHydration:
    | "none"
    | "complete-bundle"
    | "quantity-breaks-different";
};

export type CampaignRuntimeOutputs = {
  primaryOfferType: string | null;
  primaryModule: CampaignRuntimeModuleOutput | null;
  modules: {
    quantityBreaks: CampaignRuntimeModuleOutput | null;
    quantityBreaksDifferent: CampaignRuntimeModuleOutput | null;
    bxgy: CampaignRuntimeModuleOutput | null;
    freeGift: CampaignRuntimeModuleOutput | null;
    completeBundle: CampaignRuntimeModuleOutput | null;
    subscription: CampaignRuntimeModuleOutput | null;
  };
  referencedProductIds: string[];
};

function finalizeCampaignRuntimeModuleOutput(params: {
  offerType: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  referencedProductIds: string[];
  storefrontHydration?: CampaignRuntimeModuleOutput["storefrontHydration"];
}): CampaignRuntimeModuleOutput {
  return {
    offerType: params.offerType,
    selectedProductsJson: params.selectedProductsJson,
    selectedProductsJsonForFunction:
      params.selectedProductsJson == null
        ? null
        : trimSelectedProductsJsonForFunction(
            params.offerType,
            params.selectedProductsJson,
          ),
    discountRulesJson: params.discountRulesJson,
    referencedProductIds: normalizeUniqueStringList(params.referencedProductIds),
    storefrontHydration: params.storefrontHydration || "none",
  };
}

function buildLegacyQuantityBreakDiscountRules(
  tiers: QuantityBreakTier[],
): DiscountRule[] {
  return tiers.map((tier) => ({
    id: tier.id,
    count: tier.qty,
    discountPercent: tier.discountPercent,
    title: tier.title || "",
    subtitle: tier.subtitle || "",
    badge: tier.badge || "",
    isDefault: !!tier.isDefault,
    discountClass:
      tier.discountClass === "order" || tier.discountClass === "shipping"
        ? tier.discountClass
        : "product",
    offerKind:
      tier.offerKind === "free_gift" || tier.offerKind === "free_shipping"
        ? tier.offerKind
        : "percentage_discount",
    conditionType: tier.conditionType === "cart_amount" ? "cart_amount" : "item_quantity",
    amountThreshold: tier.amountThreshold,
    rewardType:
      tier.rewardType === "gift_product" || tier.rewardType === "free_shipping"
        ? tier.rewardType
        : "percentage_off",
    rewardProductIds: Array.isArray(tier.rewardProductIds)
      ? tier.rewardProductIds
      : [],
    giftQuantity: tier.giftQuantity,
    logicType: tier.logicType === "bxgy" ? "bxgy" : "standard",
    buyQuantity: tier.buyQuantity,
    getQuantity: tier.getQuantity,
    maxUsesPerOrder: tier.maxUsesPerOrder,
  }));
}

function isShippingDiscountRuleLike(rule: DiscountRule): boolean {
  return (
    rule.tierType !== "single" &&
    rule.rewardType === "free_shipping" &&
    rule.discountClass === "shipping"
  );
}

function isOrderDiscountRuleLike(rule: DiscountRule): boolean {
  return (
    rule.tierType !== "single" &&
    rule.rewardType === "percentage_off" &&
    rule.discountClass === "order"
  );
}

function isCouponConfigEnabled(
  config: CampaignConfig | null | undefined,
): boolean {
  return (
    config?.settings?.couponEnabled === true &&
    String(config.settings.couponCode || "").trim().length > 0
  );
}

function isShippingDiscountLikeRules(rules: DiscountRule[]): boolean {
  const configuredRules = rules.filter((rule) => rule.tierType !== "single");
  return configuredRules.length > 0 && configuredRules.every(isShippingDiscountRuleLike);
}

function isOrderDiscountLikeRules(rules: DiscountRule[]): boolean {
  const configuredRules = rules.filter((rule) => rule.tierType !== "single");
  return configuredRules.length > 0 && configuredRules.every(isOrderDiscountRuleLike);
}

function isShippingDiscountLikeQuantityBreaksBlock(
  block: QuantityBreaksLogicBlock | null | undefined,
): boolean {
  if (!block) return false;
  return isShippingDiscountLikeRules(
    buildLegacyQuantityBreakDiscountRules(block.config.tiers),
  );
}

function isOrderDiscountLikeQuantityBreaksBlock(
  block: QuantityBreaksLogicBlock | null | undefined,
): boolean {
  if (!block) return false;
  return isOrderDiscountLikeRules(
    buildLegacyQuantityBreakDiscountRules(block.config.tiers),
  );
}

export function compileCampaignRuntimeOutputs(
  config: CampaignConfig,
): CampaignRuntimeOutputs {
  const quantityBreaks = config.logicBlocks.find(
    (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
  );
  const quantityBreaksDifferent = config.logicBlocks.find(
    (block): block is QuantityBreaksDifferentLogicBlock =>
      block.type === "quantity-breaks-different",
  );
  const bxgy = config.logicBlocks.find(
    (block): block is BxgyLogicBlock => block.type === "bxgy",
  );
  const freeGift = config.logicBlocks.find(
    (block): block is FreeGiftLogicBlock => block.type === "free-gift",
  );
  const completeBundle = config.logicBlocks.find(
    (block): block is CompleteBundleLogicBlock => block.type === "complete-bundle",
  );
  const subscription = config.logicBlocks.find(
    (block): block is SubscriptionLogicBlock => block.type === "subscription",
  );

  const quantityBreaksOutput = quantityBreaks
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "quantity-breaks-same",
        selectedProductsJson:
          config.scope.productIds.length > 0
            ? JSON.stringify(config.scope.productIds.map((id) => ({ id })))
            : null,
        discountRulesJson:
          quantityBreaks.config.tiers.length > 0
            ? JSON.stringify(
                buildLegacyQuantityBreakDiscountRules(quantityBreaks.config.tiers),
              )
            : null,
        referencedProductIds: config.scope.productIds,
      })
    : null;

  const differentProductsRules = quantityBreaksDifferent
    ? buildDifferentProductsDiscountRulesJson(quantityBreaksDifferent.config.tiers)
    : [];
  const quantityBreaksDifferentScopeIds = normalizeUniqueStringList(
    differentProductsRules.flatMap((tier) => tier.buyProductIds),
  );
  const quantityBreaksDifferentOutput = quantityBreaksDifferent
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "quantity-breaks-different",
        selectedProductsJson: JSON.stringify({
          productIds:
            quantityBreaksDifferentScopeIds.length > 0
              ? quantityBreaksDifferentScopeIds
              : config.scope.productIds,
        }),
        discountRulesJson:
          differentProductsRules.length > 0
            ? JSON.stringify(differentProductsRules)
            : null,
        referencedProductIds: [
          ...(quantityBreaksDifferentScopeIds.length > 0
            ? quantityBreaksDifferentScopeIds
            : config.scope.productIds),
          ...differentProductsRules.flatMap((tier) => tier.buyProductIds),
        ],
        storefrontHydration: "quantity-breaks-different",
      })
    : null;

  const bxgyRules = bxgy ? buildBxgyDiscountRulesJson(bxgy.config.tiers) : [];
  const bxgyBuyProducts = Array.from(
    new Set(bxgyRules.flatMap((tier) => tier.buyProductIds)),
  );
  const bxgyGetProducts = Array.from(
    new Set(bxgyRules.flatMap((tier) => tier.getProductIds)),
  );
  const bxgyOutput = bxgy
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "bxgy",
        selectedProductsJson: JSON.stringify({
          buyProducts: bxgyBuyProducts,
        }),
        discountRulesJson: bxgyRules.length > 0 ? JSON.stringify(bxgyRules) : null,
        referencedProductIds: [...bxgyBuyProducts, ...bxgyGetProducts],
      })
    : null;

  const freeGiftRules = freeGift ? buildFreeGiftRulesJson(freeGift.config.tiers) : [];
  const freeGiftRewardProductIds = Array.from(
    new Set([
      ...(freeGift?.config.giftProductIds ?? []),
      ...freeGiftRules.flatMap((tier) => tier.giftProductIds || []),
    ]),
  );
  const freeGiftOutput = freeGift
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "free-gift",
        selectedProductsJson: JSON.stringify({
          triggerProducts: freeGift.config.triggerProductIds,
          giftProducts: freeGift.config.giftProductIds,
        }),
        discountRulesJson:
          freeGiftRules.length > 0 ? JSON.stringify(freeGiftRules) : null,
        referencedProductIds: [
          ...freeGift.config.triggerProductIds,
          ...freeGiftRewardProductIds,
        ],
      })
    : null;

  const completeBundleConfig = completeBundle
    ? buildCompleteBundleConfig(completeBundle.config)
    : null;
  const completeBundleDiscountRules =
    completeBundleConfig && completeBundleConfig.bars.length > 0
      ? JSON.stringify(
          completeBundleConfig.bars.map((bar) => ({
            id: bar.id,
            type: bar.type,
            title: bar.title || "",
            subtitle: bar.subtitle || "",
            badge: bar.badge || "",
            isDefault: !!bar.isDefault,
            quantity: bar.quantity,
            pricing: bar.pricing,
            products: bar.products.map((product) => ({
              productId: product.productId,
              pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
            })),
          })),
        )
      : null;
  const completeBundleOutput =
    completeBundle && completeBundleConfig
      ? finalizeCampaignRuntimeModuleOutput({
          offerType: "complete-bundle",
          selectedProductsJson: JSON.stringify({
            triggerProductIds: completeBundleConfig.triggerProductIds ?? [],
            bars: completeBundleConfig.bars,
          }),
          discountRulesJson: completeBundleDiscountRules,
          referencedProductIds: [
            ...(completeBundleConfig.triggerProductIds ?? []),
            ...completeBundleConfig.bars.flatMap((bar) =>
              bar.products.map((product) => product.productId),
            ),
          ],
          storefrontHydration: "complete-bundle",
        })
      : null;

  const subscriptionOutput = subscription
    ? finalizeCampaignRuntimeModuleOutput({
        offerType: "subscription",
        selectedProductsJson:
          subscription.config.productIds.length > 0
            ? JSON.stringify(
                subscription.config.productIds.map((id) => ({ id: String(id) })),
              )
            : null,
        discountRulesJson: null,
        referencedProductIds: subscription.config.productIds,
      })
    : null;

  const modules = {
    quantityBreaks: quantityBreaksOutput,
    quantityBreaksDifferent: quantityBreaksDifferentOutput,
    bxgy: bxgyOutput,
    freeGift: freeGiftOutput,
    completeBundle: completeBundleOutput,
    subscription: subscriptionOutput,
  };
  const primaryOfferType = getPrimaryOfferTypeFromCampaignConfig(config);
  const primaryModule =
    primaryOfferType === "quantity-breaks-same" ||
    primaryOfferType === "shipping-discount" ||
    primaryOfferType === "order-discount" ||
    primaryOfferType === "coupon"
      ? modules.quantityBreaks
      : primaryOfferType === "quantity-breaks-different"
        ? modules.quantityBreaksDifferent
        : primaryOfferType === "bxgy"
          ? modules.bxgy
          : primaryOfferType === "free-gift"
            ? modules.freeGift
            : primaryOfferType === "complete-bundle"
              ? modules.completeBundle
              : primaryOfferType === "subscription"
                ? modules.subscription
                : null;

  return {
    primaryOfferType,
    primaryModule,
    modules,
    referencedProductIds: normalizeUniqueStringList(
      Object.values(modules).flatMap((moduleOutput) =>
        moduleOutput ? moduleOutput.referencedProductIds : [],
      ),
    ),
  };
}

export function buildLegacyFieldsFromCampaignConfig(config: CampaignConfig): {
  offerType: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string;
} {
  const runtimeOutputs = compileCampaignRuntimeOutputs(config);
  const subscription = config.logicBlocks.find(
    (block): block is SubscriptionLogicBlock => block.type === "subscription",
  );
  const offerCard = config.displayBlocks.find(
    (block): block is OfferCardDisplayBlock => block.type === "offer-card",
  );

  const offerSettings = {
    title: offerCard?.config.title || "Bundle & Save",
    layoutFormat: offerCard?.config.layoutFormat || "vertical",
    totalBudget: config.settings.totalBudget,
    dailyBudget: config.settings.dailyBudget,
    customerSegments: normalizeCustomerSegments(config.scope.customerSegments).length
      ? normalizeCustomerSegments(config.scope.customerSegments).join(",")
      : null,
    customerProfileFilters: normalizeCustomerProfileFilters(
      config.scope.customerProfileFilters,
    ).length
      ? normalizeCustomerProfileFilters(config.scope.customerProfileFilters).join(",")
      : null,
    ipCountryCodes: normalizeIpCountryCodes(config.scope.ipCountryCodes).length
      ? normalizeIpCountryCodes(config.scope.ipCountryCodes).join(",")
      : null,
    markets: normalizeTargetMarkets(config.scope.markets).length
      ? normalizeTargetMarkets(config.scope.markets).join(",")
      : null,
    usageLimitPerCustomer: config.settings.usageLimitPerCustomer || "unlimited",
    compositionBarOrder: config.settings.compositionBarOrder,
    accentColor: offerCard?.config.accentColor || "#008060",
    cardBackgroundColor: offerCard?.config.cardBackgroundColor || "#ffffff",
    borderColor: offerCard?.config.borderColor || "#dfe3e8",
    labelColor: offerCard?.config.labelColor || "#ffffff",
    titleColor: offerCard?.config.titleColor || "#111111",
    buttonPrimaryColor: offerCard?.config.buttonPrimaryColor || "#008060",
    titleFontSize: offerCard?.config.titleFontSize ?? 14,
    titleFontWeight: offerCard?.config.titleFontWeight || "600",
    buttonText: offerCard?.config.buttonText || "Add to Cart",
    showCustomButton: offerCard?.config.showCustomButton !== false,
    subscriptionEnabled: subscription?.config.enabled ?? false,
    subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
    subscriptionTitle: subscription?.config.title ?? "Subscribe & Save",
    subscriptionSubtitle:
      subscription?.config.subtitle ??
      "Subscription pricing updates from your selling plan",
    oneTimeTitle: FIXED_ONE_TIME_TITLE,
    oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
    subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
    progressiveGifts: { ...DEFAULT_PROGRESSIVE_GIFTS },
    scheduleTimezone: config.settings.scheduleTimezone,
    checkboxUpsellsEnabled: config.settings.checkboxUpsellsEnabled,
    checkboxUpsellsTitle: sanitizeCheckboxUpsellsTitle(
      config.settings.checkboxUpsellsTitle,
    ),
    checkboxUpsellsSubtitle: sanitizeCheckboxUpsellsSubtitle(
      config.settings.checkboxUpsellsSubtitle,
    ),
    checkboxUpsellsDefaultChecked: config.settings.checkboxUpsellsDefaultChecked,
    stickyAddToCartEnabled: config.settings.stickyAddToCartEnabled,
    stickyAddToCartTitle: sanitizeStickyAddToCartTitle(
      config.settings.stickyAddToCartTitle,
    ),
    stickyAddToCartSubtitle: sanitizeStickyAddToCartSubtitle(
      config.settings.stickyAddToCartSubtitle,
    ),
    stickyAddToCartButtonText: sanitizeStickyAddToCartButtonText(
      config.settings.stickyAddToCartButtonText,
    ),
    couponEnabled: config.settings.couponEnabled === true,
    couponCode: sanitizeSingleLineText(config.settings.couponCode, 64, ""),
  } satisfies OfferSettings;
  const inferredPrimaryOfferType = runtimeOutputs.primaryOfferType;
  const primaryModuleOutput =
    runtimeOutputs.primaryModule ||
    Object.values(runtimeOutputs.modules).find((moduleOutput) => moduleOutput !== null) ||
    null;

  return {
    offerType:
      inferredPrimaryOfferType ||
      (runtimeOutputs.modules.quantityBreaks
        ? "quantity-breaks-same"
        : runtimeOutputs.modules.quantityBreaksDifferent
          ? "quantity-breaks-different"
          : runtimeOutputs.modules.bxgy
            ? "bxgy"
            : runtimeOutputs.modules.freeGift
              ? "free-gift"
              : runtimeOutputs.modules.completeBundle
                ? "complete-bundle"
                : subscription
                  ? "subscription"
                  : "campaign-builder"),
    selectedProductsJson: primaryModuleOutput?.selectedProductsJson ?? null,
    discountRulesJson: primaryModuleOutput?.discountRulesJson ?? null,
    offerSettingsJson: JSON.stringify(offerSettings),
  };
}

export function buildOfferSettingsJsonFromCampaignConfig(
  config: CampaignConfig,
  existingOfferSettingsJson?: string | null,
): string {
  const baseOfferSettings = parseOfferSettings(
    buildLegacyFieldsFromCampaignConfig(config).offerSettingsJson,
  );
  return JSON.stringify({
    ...baseOfferSettings,
    // Progressive gifts still live only in legacy offerSettingsJson for now.
    progressiveGifts: progressiveGiftsConfigToStorableJson(
      parseProgressiveGiftsFromOfferSettingsJson(existingOfferSettingsJson),
    ),
  } satisfies OfferSettings);
}

export function buildPersistedOfferFieldsFromCampaignConfig(
  config: CampaignConfig,
  existingOfferSettingsJson?: string | null,
): {
  offerType: string;
  selectedProductsJson: string | null;
  selectedProductsJsonForFunction: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string;
  referencedProductIds: string[];
  storefrontHydration: "none" | "complete-bundle" | "quantity-breaks-different";
} {
  const runtimeOutputs = compileCampaignRuntimeOutputs(config);
  const legacyFields = buildLegacyFieldsFromCampaignConfig(config);

  return {
    offerType: legacyFields.offerType,
    selectedProductsJson: legacyFields.selectedProductsJson ?? null,
    selectedProductsJsonForFunction:
      runtimeOutputs.primaryModule?.selectedProductsJsonForFunction ??
      (legacyFields.selectedProductsJson
        ? trimSelectedProductsJsonForFunction(
            legacyFields.offerType,
            legacyFields.selectedProductsJson,
          )
        : null),
    discountRulesJson:
      runtimeOutputs.primaryModule?.discountRulesJson ?? legacyFields.discountRulesJson,
    offerSettingsJson: buildOfferSettingsJsonFromCampaignConfig(
      config,
      existingOfferSettingsJson,
    ),
    referencedProductIds: runtimeOutputs.referencedProductIds,
    storefrontHydration: runtimeOutputs.primaryModule?.storefrontHydration ?? "none",
  };
}

function getOfferTypeFromLogicBlockType(type: string | undefined): string | null {
  if (type === "quantity-breaks") return "quantity-breaks-same";
  if (type === "quantity-breaks-different") return "quantity-breaks-different";
  if (type === "bxgy") return "bxgy";
  if (type === "free-gift") return "free-gift";
  if (type === "complete-bundle") return "complete-bundle";
  if (type === "subscription") return "subscription";
  return null;
}

export function getPrimaryOfferTypeFromCampaignConfig(
  config: CampaignConfig | null | undefined,
): string | null {
  const primaryBlock = config?.logicBlocks[0];
  if (
    primaryBlock?.type === "quantity-breaks" &&
    isCouponConfigEnabled(config) &&
    isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
  ) {
    return "coupon";
  }
  if (
    primaryBlock?.type === "quantity-breaks" &&
    isShippingDiscountLikeQuantityBreaksBlock(primaryBlock)
  ) {
    return "shipping-discount";
  }
  if (
    primaryBlock?.type === "quantity-breaks" &&
    isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
  ) {
    return "order-discount";
  }
  return getOfferTypeFromLogicBlockType(primaryBlock?.type);
}

export function resolveOfferTypeFromCampaignConfig(params: {
  offerType?: string | null;
  campaignConfigJson?: string | null;
}): string {
  const primaryOfferType = getPrimaryOfferTypeFromCampaignConfig(
    parseCampaignConfig(params.campaignConfigJson),
  );
  return primaryOfferType || String(params.offerType || "").trim() || "campaign-builder";
}

function isProgressiveGiftsTemplateLike(params: {
  offerType?: string | null;
  campaignConfigJson?: string | null;
  offerSettingsJson?: string | null;
}): boolean {
  const config = parseCampaignConfig(params.campaignConfigJson);
  const primaryOfferType = getPrimaryOfferTypeFromCampaignConfig(config);
  const normalizedOfferType = String(params.offerType || "").trim();
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  if (!offerSettings.progressiveGifts.enabled) {
    return false;
  }
  return (
    normalizedOfferType === "progressive-gifts" ||
    primaryOfferType === "quantity-breaks-same" ||
    (!primaryOfferType && normalizedOfferType === "quantity-breaks-same")
  );
}

function getLogicBlockDisplayType(type: string | undefined): string | null {
  if (type === "quantity-breaks") return "Quantity breaks";
  if (type === "quantity-breaks-different") {
    return "Quantity breaks (different products)";
  }
  if (type === "bxgy") return "Buy X Get Y";
  if (type === "free-gift") return "Free gift";
  if (type === "complete-bundle") return "Complete bundle";
  if (type === "subscription") return "Subscription";
  return null;
}

export function getOfferDisplayType(
  offerType: string,
  campaignConfigJson?: string | null,
  offerSettingsJson?: string | null,
): string {
  if (
    isProgressiveGiftsTemplateLike({
      offerType,
      campaignConfigJson,
      offerSettingsJson,
    })
  ) {
    const config = parseCampaignConfig(campaignConfigJson);
    const extraModuleCount = Math.max(0, (config?.logicBlocks.length || 0) - 1);
    return extraModuleCount > 0
      ? `Progressive gifts + ${extraModuleCount} module${extraModuleCount === 1 ? "" : "s"}`
      : "Progressive gifts";
  }
  const config = parseCampaignConfig(campaignConfigJson);
  const primaryBlock = config?.logicBlocks[0];
  const primaryLabel =
    primaryBlock?.type === "quantity-breaks" &&
    isCouponConfigEnabled(config) &&
    isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
      ? "Coupon"
      : primaryBlock?.type === "quantity-breaks" &&
          isShippingDiscountLikeQuantityBreaksBlock(primaryBlock)
        ? "Shipping discount"
        : primaryBlock?.type === "quantity-breaks" &&
            isOrderDiscountLikeQuantityBreaksBlock(primaryBlock)
          ? "Order discount"
          : getLogicBlockDisplayType(primaryBlock?.type);
  if (primaryLabel) {
    const extraModuleCount = Math.max(0, (config?.logicBlocks.length || 0) - 1);
    return extraModuleCount > 0
      ? `${primaryLabel} + ${extraModuleCount} module${extraModuleCount === 1 ? "" : "s"}`
      : primaryLabel;
  }
  if (offerType === "quantity-breaks-same") return "Quantity breaks";
  if (offerType === "shipping-discount") return "Shipping discount";
  if (offerType === "order-discount") return "Order discount";
  if (offerType === "coupon") return "Coupon";
  if (offerType === "quantity-breaks-different") {
    return "Quantity breaks (different products)";
  }
  if (offerType === "bxgy") return "Buy X Get Y";
  if (offerType === "free-gift") return "Free gift";
  if (offerType === "complete-bundle") return "Complete bundle";
  if (offerType === "subscription") return "Subscription";
  return offerType || "Campaign";
}

export function getOfferRulesText(params: {
  campaignConfigJson?: string | null;
  discountRulesJson?: string | null;
  offerSettingsJson?: string | null;
}): string {
  if (
    isProgressiveGiftsTemplateLike({
      offerType: "quantity-breaks-same",
      campaignConfigJson: params.campaignConfigJson,
      offerSettingsJson: params.offerSettingsJson,
    })
  ) {
    const config = parseCampaignConfig(params.campaignConfigJson);
    const quantityBreaks = config?.logicBlocks.find(
      (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
    );
    const milestoneCount = quantityBreaks?.config.tiers.length || 0;
    const progressiveGifts = parseOfferSettings(params.offerSettingsJson).progressiveGifts;
    const rewardCount = progressiveGifts.gifts.length;
    return `${milestoneCount} milestone${milestoneCount === 1 ? "" : "s"}, ${rewardCount} reward slot${rewardCount === 1 ? "" : "s"}`;
  }
  const config = parseCampaignConfig(params.campaignConfigJson);
  if (config) {
    const quantityBreaks = config.logicBlocks.find(
      (block): block is QuantityBreaksLogicBlock => block.type === "quantity-breaks",
    );
    const tiers = quantityBreaks?.config.tiers ?? [];
    if (tiers.length > 0) {
      return tiers
        .map((tier) =>
          tier.rewardType === "free_shipping"
            ? tier.conditionType === "cart_amount"
              ? `Spend ${tier.amountThreshold} Unlock Free Shipping`
              : `Buy ${tier.qty} Unlock Free Shipping`
            : tier.discountClass === "order"
              ? tier.conditionType === "cart_amount"
                ? `Spend ${tier.amountThreshold} Get ${tier.discountPercent}% Off Order`
                : `Buy ${tier.qty} Get ${tier.discountPercent}% Off Order`
              : `Buy ${tier.qty} Get ${tier.discountPercent}% Off`,
        )
        .join(", ");
    }
    const bxgy = config.logicBlocks.find(
      (block): block is BxgyLogicBlock => block.type === "bxgy",
    );
    const differentProducts = config.logicBlocks.find(
      (block): block is QuantityBreaksDifferentLogicBlock =>
        block.type === "quantity-breaks-different",
    );
    const differentProductsTiers = differentProducts?.config.tiers ?? [];
    if (differentProductsTiers.length > 0) {
      return differentProductsTiers
        .map((tier) =>
          tier.tierType === "bxgy"
            ? getBxgyDisplayMeta(tier).summary
            : `Buy ${tier.count} Get ${tier.discountPercent}% Off`,
        )
        .join(", ");
    }
    const bxgyTiers = bxgy?.config.tiers ?? [];
    if (bxgyTiers.length > 0) {
      return bxgyTiers
        .map((tier) => getBxgyDisplayMeta(tier).summary)
        .join(", ");
    }
    const freeGift = config.logicBlocks.find(
      (block): block is FreeGiftLogicBlock => block.type === "free-gift",
    );
    const freeGiftTiers = freeGift?.config.tiers ?? [];
    if (freeGift && freeGiftTiers.length > 0) {
      return freeGiftTiers
        .map(
          (tier) =>
            `Buy ${tier.count} Get ${tier.giftQuantity} free gift${tier.giftQuantity > 1 ? "s" : ""}`,
        )
        .join(", ");
    }
    const completeBundle = config.logicBlocks.find(
      (block): block is CompleteBundleLogicBlock => block.type === "complete-bundle",
    );
    if (completeBundle?.config.bars.length) {
      return `${completeBundle.config.bars.length} bundle bar${completeBundle.config.bars.length > 1 ? "s" : ""}`;
    }
    const subscription = config.logicBlocks.find(
      (block): block is SubscriptionLogicBlock => block.type === "subscription",
    );
    if (subscription) {
      return subscription.config.enabled
        ? `Subscription enabled for ${subscription.config.productIds.length || config.scope.productIds.length} product${(subscription.config.productIds.length || config.scope.productIds.length) > 1 ? "s" : ""}`
        : "Subscription block configured";
    }
  }

  const rules = parseDiscountRules(params.discountRulesJson);
  if (rules.length > 0) {
    return rules.map((rule) => `Buy ${rule.count} Get ${rule.discountPercent}% Off`).join(", ");
  }

  const bxgyRules = parseBxgyDiscountRules(params.discountRulesJson);
  if (bxgyRules.length > 0) {
    return bxgyRules
      .map((rule) => getBxgyDisplayMeta(rule).summary)
      .join(", ");
  }

  const freeGiftRules = parseFreeGiftRules(params.discountRulesJson);
  if (freeGiftRules.length > 0) {
    return freeGiftRules
      .map(
        (rule) =>
          `Buy ${rule.count} Get ${rule.giftQuantity} free gift${rule.giftQuantity > 1 ? "s" : ""}`,
      )
      .join(", ");
  }

  try {
    const parsed = JSON.parse(String(params.discountRulesJson || "null")) as unknown;
    if (Array.isArray(parsed) && parsed.some((item) => item && typeof item === "object" && "products" in (item as Record<string, unknown>))) {
      return `${parsed.length} bundle bar${parsed.length > 1 ? "s" : ""}`;
    }
  } catch {}

  return "-";
}

export function getOfferScheduleTimezone(params: {
  campaignConfigJson?: string | null;
  offerSettingsJson?: string | null;
  fallback?: string;
}): string {
  const config = parseCampaignConfig(params.campaignConfigJson);
  if (config?.settings.scheduleTimezone) {
    return config.settings.scheduleTimezone;
  }
  const offerSettings = parseOfferSettings(params.offerSettingsJson);
  return offerSettings.scheduleTimezone || params.fallback || "UTC";
}
