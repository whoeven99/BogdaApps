import {
  buildPersistedOfferFieldsFromCampaignConfig,
  migrateLegacyOfferToCampaignConfig,
  parseCampaignConfig,
} from "../../utils/offerParsing";

export type ParsedCampaignConfig = NonNullable<ReturnType<typeof parseCampaignConfig>>;

export function validateCampaignConfigForPersistence(
  config: ParsedCampaignConfig,
): string | null {
  if (config.scope.productIds.length === 0) {
    return "Please select at least one product.";
  }
  if (config.scope.markets.length === 0) {
    return "Select at least one market or keep All markets enabled.";
  }
  if (!config.settings.startTime) {
    return "Start time is required.";
  }

  const parsedStartTime = new Date(config.settings.startTime);
  const parsedEndTime = config.settings.endTime ? new Date(config.settings.endTime) : null;
  if (
    isNaN(parsedStartTime.getTime()) ||
    (parsedEndTime && isNaN(parsedEndTime.getTime()))
  ) {
    return "Invalid start or end time format.";
  }
  if (parsedEndTime && parsedEndTime.getTime() <= parsedStartTime.getTime()) {
    return "End time must be after start time.";
  }
  if (
    config.displayBlocks.some((block) => block.type === "countdown") &&
    !config.settings.endTime
  ) {
    return "Countdown requires an end time.";
  }
  if (config.logicBlocks.length === 0) {
    return "Please add at least one promotion rule.";
  }
  if (
    config.settings.couponEnabled === true &&
    !String(config.settings.couponCode || "").trim()
  ) {
    return "Coupon offers require a shared coupon code.";
  }
  return null;
}

export type OfferPersistenceResolutionInput = {
  campaignConfigJsonRaw: string;
  offerType: string;
  selectedProductsJson: string;
  discountRulesJson: string;
  offerSettingsJson: string;
  startTimeRaw: string;
  endTimeRaw: string;
  status: boolean;
  progressiveGiftsJson: string;
};

export type OfferPersistenceResolution = {
  normalizedCampaignConfig: ParsedCampaignConfig;
  campaignConfigJson: string;
  offerType: string;
  selectedProductsJson: string;
  discountRulesJson: string;
  offerSettingsJson: string;
  status: boolean;
  startTimeRaw: string;
  endTimeRaw: string;
};

export function resolveOfferPersistenceFields(
  input: OfferPersistenceResolutionInput,
):
  | { ok: true; value: OfferPersistenceResolution }
  | { ok: false; message: string } {
  if (input.selectedProductsJson.length > 50_000) {
    return {
      ok: false,
      message: "Selected products data is too large. Please reduce the number of products.",
    };
  }
  if (input.discountRulesJson.length > 50_000) {
    return {
      ok: false,
      message: "Discount rules data is too large. Please reduce the number of rules.",
    };
  }
  if (input.campaignConfigJsonRaw.length > 100_000) {
    return {
      ok: false,
      message: "Campaign configuration is too large. Please simplify the campaign.",
    };
  }

  const normalizedCampaignConfig = input.campaignConfigJsonRaw
    ? parseCampaignConfig(input.campaignConfigJsonRaw)
    : migrateLegacyOfferToCampaignConfig({
        offerType: input.offerType,
        selectedProductsJson: input.selectedProductsJson,
        discountRulesJson: input.discountRulesJson,
        offerSettingsJson: input.offerSettingsJson,
        startTime: input.startTimeRaw,
        endTime: input.endTimeRaw,
        status: input.status,
      });

  if (!normalizedCampaignConfig) {
    return {
      ok: false,
      message: "Invalid campaign configuration.",
    };
  }

  const validationError = validateCampaignConfigForPersistence(normalizedCampaignConfig);
  if (validationError) {
    return {
      ok: false,
      message: validationError,
    };
  }

  const persistedFields = buildPersistedOfferFieldsFromCampaignConfig(
    normalizedCampaignConfig,
    input.progressiveGiftsJson,
  );

  return {
    ok: true,
    value: {
      normalizedCampaignConfig,
      campaignConfigJson: JSON.stringify(normalizedCampaignConfig),
      offerType: persistedFields.offerType,
      selectedProductsJson: persistedFields.selectedProductsJson || "",
      discountRulesJson: persistedFields.discountRulesJson || "",
      offerSettingsJson: persistedFields.offerSettingsJson,
      status: normalizedCampaignConfig.settings.status,
      startTimeRaw: normalizedCampaignConfig.settings.startTime || input.startTimeRaw,
      endTimeRaw: normalizedCampaignConfig.settings.endTime || input.endTimeRaw,
    },
  };
}

export type OwnedOfferRecord = {
  id: string;
  shopName: string;
};

export function validateOwnedOfferAccess(params: {
  idRaw: string;
  shopName: string;
  existingOffer: OwnedOfferRecord | null;
  missingIdMessage: string;
  notFoundMessage?: string;
}):
  | { ok: true; offer: OwnedOfferRecord }
  | { ok: false; status: number; message: string } {
  if (!params.idRaw.trim()) {
    return {
      ok: false,
      status: 400,
      message: params.missingIdMessage,
    };
  }
  if (
    !params.existingOffer ||
    String(params.existingOffer.shopName || "").trim() !== params.shopName.trim()
  ) {
    return {
      ok: false,
      status: 404,
      message: params.notFoundMessage || "Offer not found.",
    };
  }
  return {
    ok: true,
    offer: params.existingOffer,
  };
}

export function buildOfferStatusCampaignConfigJson(params: {
  campaignConfigJson?: string | null;
  nextStatus: boolean;
}): string | null {
  const rawCampaignConfigJson = params.campaignConfigJson ?? null;
  const parsedCampaignConfig = parseCampaignConfig(rawCampaignConfigJson);
  if (parsedCampaignConfig) {
    return JSON.stringify({
      ...parsedCampaignConfig,
      settings: {
        ...parsedCampaignConfig.settings,
        status: params.nextStatus,
      },
    });
  }
  if (rawCampaignConfigJson) {
    try {
      const shallowConfig = JSON.parse(String(rawCampaignConfigJson)) as {
        settings?: Record<string, unknown>;
        [key: string]: unknown;
      };
      return JSON.stringify({
        ...shallowConfig,
        settings: {
          ...(shallowConfig.settings && typeof shallowConfig.settings === "object"
            ? shallowConfig.settings
            : {}),
          status: params.nextStatus,
        },
      });
    } catch {
      return rawCampaignConfigJson;
    }
  }
  return rawCampaignConfigJson;
}
