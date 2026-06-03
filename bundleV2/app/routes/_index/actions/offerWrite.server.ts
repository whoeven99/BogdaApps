import prisma from "../../../db.server";
import { invalidateShopOffersCache } from "../../../shopOffersCache.server";
import { runOfferPostWriteSync } from "../../../server/offers/offerSync.server";
import {
  OFFER_TEXT_LIMITS,
  clampNumber,
  getInvalidIpCountryCodes,
  isCompleteBundleSingleBar,
  normalizeCustomerProfileFilters,
  normalizeCustomerSegments,
  normalizeIpCountryCodes,
  normalizeTargetMarkets,
  LONG_RUNNING_OFFER_END_TIME_ISO,
  FIXED_ONE_TIME_SUBTITLE,
  FIXED_ONE_TIME_TITLE,
  FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
  FIXED_SUBSCRIPTION_POSITION,
  parseCompleteBundleConfig,
  parseProgressiveGiftsConfig,
  progressiveGiftsConfigToStorableJson,
  sanitizeHexColor,
  sanitizeSingleLineText,
  normalizeOfferEndTimeForUi,
} from "../../../utils/offerParsing";
import { validateOwnedOfferAccess, resolveOfferPersistenceFields } from "../offerActionHelpers";
import {
  offerActionErrorResponse,
  resolveSessionShopName,
  isMissingOfferCampaignConfigColumnError,
  normalizeOfferNameKey,
  writeOfferWithRetry,
} from "../actionUtils";

type AdminType = {
  graphql: (query: string, opts?: { variables?: unknown }) => Promise<{ json: () => Promise<unknown> }>;
};

const LONG_RUNNING_OFFER_END_TIME = new Date(LONG_RUNNING_OFFER_END_TIME_ISO);

function sanitizeHexColorParam(raw: string | null | undefined, fallback: string): string {
  return sanitizeHexColor(raw, fallback);
}

function parseFormColors(formData: FormData) {
  return {
    accentColor: sanitizeHexColorParam(String(formData.get("accentColor") || ""), "#008060"),
    cardBackgroundColor: sanitizeHexColorParam(String(formData.get("cardBackgroundColor") || ""), "#ffffff"),
    borderColor: sanitizeHexColorParam(String(formData.get("borderColor") || ""), "#dfe3e8"),
    labelColor: sanitizeHexColorParam(String(formData.get("labelColor") || ""), "#ffffff"),
    titleColor: sanitizeHexColorParam(String(formData.get("titleColor") || ""), "#111111"),
    buttonPrimaryColor: sanitizeHexColorParam(String(formData.get("buttonPrimaryColor") || ""), "#008060"),
  };
}

export async function handleCreateOrUpdateOffer(
  admin: AdminType,
  session: { shop?: string | null },
  formData: FormData,
  intent: string,
): Promise<Response> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;

  const idRaw = String(formData.get("offerId") || "").trim();
  const nameRaw = String(formData.get("offerName") || "");
  const name = sanitizeSingleLineText(nameRaw, OFFER_TEXT_LIMITS.offerName);
  const cartTitle = sanitizeSingleLineText(formData.get("cartTitle"), OFFER_TEXT_LIMITS.cartTitle, "Bundle Discount");

  let offerType = String(formData.get("offerType") || "").trim();
  const layoutFormatRaw = String(formData.get("layoutFormat") || "").trim();
  const layoutFormat = ["vertical", "horizontal", "card", "compact"].includes(layoutFormatRaw)
    ? layoutFormatRaw
    : "vertical";

  let startTimeRaw = String(formData.get("startTime") || "").trim();
  let endTimeRaw = normalizeOfferEndTimeForUi(String(formData.get("endTime") || "").trim());
  let selectedProductsJson = String(formData.get("selectedProductsJson") || "");
  let discountRulesJson = String(formData.get("discountRulesJson") || "");
  const campaignConfigJsonRaw = String(formData.get("campaignConfigJson") || "").trim();
  const statusRaw = String(formData.get("status") || "");
  let status = statusRaw === "true";

  const totalBudgetRaw = formData.get("totalBudget");
  const dailyBudgetRaw = formData.get("dailyBudget");

  const customerSegments = normalizeCustomerSegments(
    formData.getAll("customerSegments").map((v) => String(v || "")),
  );
  const customerProfileFilters = normalizeCustomerProfileFilters(
    formData.getAll("customerProfileFilters").map((v) => String(v || "")),
  );
  const rawIpCountryCodes = formData.getAll("ipCountryCodes").map((v) => String(v || ""));
  const invalidIpCountryCodes = getInvalidIpCountryCodes(rawIpCountryCodes);
  const ipCountryCodes = normalizeIpCountryCodes(rawIpCountryCodes);
  const markets = normalizeTargetMarkets(formData.getAll("markets").map((v) => String(v || "")));

  const usageLimitPerCustomer = String(formData.get("usageLimitPerCustomer") || "unlimited");
  const couponEnabled = String(formData.get("couponEnabled") || "") === "true";
  const couponCode = sanitizeSingleLineText(formData.get("couponCode"), 64, "").toUpperCase();

  const colors = parseFormColors(formData);
  const titleFontSize = clampNumber(formData.get("titleFontSize"), 10, 36, 14);
  const titleFontWeightRaw = String(formData.get("titleFontWeight") || "600").trim();
  const titleFontWeight = ["400", "500", "600", "700"].includes(titleFontWeightRaw)
    ? titleFontWeightRaw
    : "600";
  const buttonText = sanitizeSingleLineText(
    formData.get("buttonText"),
    OFFER_TEXT_LIMITS.buttonText,
    "Add to Cart",
  );
  const showCustomButton = String(formData.get("showCustomButton") || "") !== "false";
  const subscriptionEnabled = String(formData.get("subscriptionEnabled") || "") === "true";
  const subscriptionTitle = sanitizeSingleLineText(formData.get("subscriptionTitle"), 60, "Subscribe & Save");
  const subscriptionSubtitle = sanitizeSingleLineText(
    formData.get("subscriptionSubtitle"),
    60,
    "Subscription pricing updates from your selling plan",
  );
  const title = sanitizeSingleLineText(
    formData.get("title"),
    OFFER_TEXT_LIMITS.widgetTitle,
    "Bundle & Save",
  );
  const scheduleTimezoneRaw = String(formData.get("scheduleTimezone") || "").trim();

  // Size guards
  if (selectedProductsJson.length > 50_000) {
    return offerActionErrorResponse("Selected products data is too large. Please reduce the number of products.", 400);
  }
  if (discountRulesJson.length > 50_000) {
    return offerActionErrorResponse("Discount rules data is too large. Please reduce the number of rules.", 400);
  }

  // Complete-bundle bar validation
  if (offerType === "complete-bundle") {
    const completeBundle = parseCompleteBundleConfig(selectedProductsJson);
    if (!completeBundle.bars.length) {
      return offerActionErrorResponse("Complete bundle requires at least one bar.", 400);
    }
    const hasInvalidBar = completeBundle.bars.some((bar) => {
      if (isCompleteBundleSingleBar(bar)) return false;
      const minQty = Math.max(1, Math.trunc(Number(bar.minQuantity) || 1));
      const maxQty = Math.max(minQty, Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1));
      return !bar.products.length || bar.products.length < minQty || maxQty > bar.products.length;
    });
    if (hasInvalidBar) {
      return offerActionErrorResponse(
        "Each complete bundle bar must have enough bundle items for its min/max quantity range.",
        400,
      );
    }
  }

  const progressiveGiftsJsonRaw = String(formData.get("progressiveGiftsJson") || "").trim();
  if (progressiveGiftsJsonRaw.length > 100_000) {
    return offerActionErrorResponse("Progressive gifts data is too large.", 400);
  }
  let progressiveGiftsSanitized = parseProgressiveGiftsConfig(null);
  if (progressiveGiftsJsonRaw) {
    try {
      progressiveGiftsSanitized = parseProgressiveGiftsConfig(
        JSON.parse(progressiveGiftsJsonRaw) as unknown,
      );
    } catch {
      return offerActionErrorResponse("Invalid progressive gifts JSON.", 400);
    }
  }

  let offerSettingsJson = JSON.stringify({
    title,
    layoutFormat,
    totalBudget:
      typeof totalBudgetRaw === "string" && totalBudgetRaw.trim()
        ? Math.max(0, clampNumber(totalBudgetRaw, 0, Number.MAX_SAFE_INTEGER, 0))
        : null,
    dailyBudget:
      typeof dailyBudgetRaw === "string" && dailyBudgetRaw.trim()
        ? Math.max(0, clampNumber(dailyBudgetRaw, 0, Number.MAX_SAFE_INTEGER, 0))
        : null,
    customerSegments: customerSegments.length ? customerSegments.join(",") : null,
    customerProfileFilters: customerProfileFilters.length ? customerProfileFilters.join(",") : null,
    ipCountryCodes: ipCountryCodes.length
      ? ipCountryCodes.map((v) => String(v).trim().toUpperCase()).join(",")
      : null,
    markets: markets.length ? markets.join(",") : null,
    usageLimitPerCustomer,
    ...colors,
    titleFontSize,
    titleFontWeight,
    buttonText,
    showCustomButton,
    subscriptionEnabled,
    subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
    subscriptionTitle,
    subscriptionSubtitle,
    oneTimeTitle: FIXED_ONE_TIME_TITLE,
    oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
    subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
    scheduleTimezone: scheduleTimezoneRaw || undefined,
    couponEnabled,
    couponCode,
    progressiveGifts: progressiveGiftsConfigToStorableJson(progressiveGiftsSanitized),
  });

  if (couponEnabled && !couponCode) {
    return offerActionErrorResponse("Coupon offers require a shared coupon code.", 400);
  }

  const persistenceResolution = resolveOfferPersistenceFields({
    campaignConfigJsonRaw,
    offerType,
    selectedProductsJson,
    discountRulesJson,
    offerSettingsJson,
    startTimeRaw,
    endTimeRaw,
    status,
    progressiveGiftsJson: JSON.stringify({
      progressiveGifts: progressiveGiftsConfigToStorableJson(progressiveGiftsSanitized),
    }),
  });
  if (!persistenceResolution.ok) {
    return offerActionErrorResponse(persistenceResolution.message, 400);
  }

  let campaignConfigJson: string | null = persistenceResolution.value.campaignConfigJson;
  offerType = persistenceResolution.value.offerType;
  selectedProductsJson = persistenceResolution.value.selectedProductsJson;
  discountRulesJson = persistenceResolution.value.discountRulesJson;
  offerSettingsJson = persistenceResolution.value.offerSettingsJson;
  status = persistenceResolution.value.status;
  startTimeRaw = persistenceResolution.value.startTimeRaw;
  endTimeRaw = persistenceResolution.value.endTimeRaw;

  const shopName = await resolveSessionShopName(admin, session);

  // Validation
  if (!name) return offerActionErrorResponse("Please enter an offer name.", 400);
  if (!cartTitle) return offerActionErrorResponse("Please enter a display title.", 400);
  if (markets.length === 0) {
    return offerActionErrorResponse(
      "Select at least one market or keep All markets enabled.",
      400,
    );
  }
  if (invalidIpCountryCodes.length > 0) {
    return offerActionErrorResponse(
      `Use 2-letter ISO country codes for IP targeting. Remove: ${invalidIpCountryCodes.join(", ")}.`,
      400,
    );
  }
  if (!startTimeRaw) return offerActionErrorResponse("Start time is required.", 400);

  const startTime = new Date(startTimeRaw);
  const endTime = endTimeRaw ? new Date(endTimeRaw) : new Date(LONG_RUNNING_OFFER_END_TIME);

  if (isNaN(startTime.getTime()) || (endTimeRaw && isNaN(endTime.getTime()))) {
    return offerActionErrorResponse("Invalid start or end time format.", 400);
  }
  if (endTimeRaw && endTime.getTime() <= startTime.getTime()) {
    return offerActionErrorResponse("End time must be after start time.", 400);
  }

  // For updates: verify ownership
  let existingOfferForUpdate: { id: string; shopName: string } | null = null;
  if (intent !== "create-offer") {
    existingOfferForUpdate = await prismaAny.offer.findUnique({
      where: { id: idRaw },
      select: { id: true, shopName: true },
    });
    const ownershipValidation = validateOwnedOfferAccess({
      idRaw,
      shopName,
      existingOffer: existingOfferForUpdate,
      missingIdMessage: "Missing offer ID, cannot update.",
    });
    if (!ownershipValidation.ok) {
      return offerActionErrorResponse(ownershipValidation.message, ownershipValidation.status);
    }
    existingOfferForUpdate = ownershipValidation.offer;
  }

  // Name uniqueness check (app-level, DB constraint is the final safety net via P2002)
  const nameKey = normalizeOfferNameKey(name);
  const siblingOffers = await prismaAny.offer.findMany({
    where: { shopName },
    select: { id: true, name: true },
  });
  const conflictingOffer = (siblingOffers as Array<{ id: string; name: string }>).find(
    (o) =>
      normalizeOfferNameKey(o.name) === nameKey &&
      (intent === "create-offer" || o.id !== existingOfferForUpdate?.id),
  );
  if (conflictingOffer) {
    return offerActionErrorResponse(
      `Offer name conflict. Submitted: "${name}". Existing: "${conflictingOffer.name}" (id: "${conflictingOffer.id}"). Shop: "${shopName}".`,
      409,
    );
  }

  const baseData = {
    name,
    cartTitle,
    offerType,
    startTime,
    endTime,
    status,
    campaignConfigJson,
    offerSettingsJson,
    selectedProductsJson: selectedProductsJson || null,
    discountRulesJson: discountRulesJson || null,
  };
  const createData = { ...baseData, shopName };
  const legacyCreateData = { ...createData, campaignConfigJson: undefined };
  const updateData = baseData;
  const legacyUpdateData = { ...updateData, campaignConfigJson: undefined };

  if (intent === "create-offer") {
    try {
      await writeOfferWithRetry(() => prismaAny.offer.create({ data: createData }));
    } catch (error: unknown) {
      if (isMissingOfferCampaignConfigColumnError(error)) {
        console.warn("[offer-create] campaignConfigJson column missing, retrying with legacy payload");
        try {
          await writeOfferWithRetry(() => prismaAny.offer.create({ data: legacyCreateData }));
        } catch (legacyError: unknown) {
          if ((legacyError as { code?: string })?.code === "P2002") {
            return offerActionErrorResponse(
              `Offer create hit a unique constraint. Submitted: "${name}". Shop: "${shopName}".`,
              409,
            );
          }
          console.error("offer create failed after legacy fallback", legacyError);
          return offerActionErrorResponse("Failed to create offer. Please try again later.", 500);
        }
      } else if ((error as { code?: string })?.code === "P2002") {
        return offerActionErrorResponse(
          `Offer create hit a unique constraint. Submitted: "${name}". Shop: "${shopName}".`,
          409,
        );
      } else {
        console.error("offer create failed", error);
        return offerActionErrorResponse("Failed to create offer. Please try again later.", 500);
      }
    }
  } else {
    try {
      await writeOfferWithRetry(() =>
        prismaAny.offer.update({ where: { id: idRaw }, data: updateData }),
      );
    } catch (error: unknown) {
      if (isMissingOfferCampaignConfigColumnError(error)) {
        console.warn("[offer-update] campaignConfigJson column missing, retrying with legacy payload");
        try {
          await writeOfferWithRetry(() =>
            prismaAny.offer.update({ where: { id: idRaw }, data: legacyUpdateData }),
          );
        } catch (legacyError: unknown) {
          if ((legacyError as { code?: string })?.code === "P2002") {
            return offerActionErrorResponse(
              `Offer update hit a unique constraint. Submitted: "${name}". Shop: "${shopName}".`,
              409,
            );
          }
          console.error("offer update failed after legacy fallback", legacyError);
          return offerActionErrorResponse("Failed to update offer. Please try again later.", 500);
        }
      } else if ((error as { code?: string })?.code === "P2002") {
        return offerActionErrorResponse(
          `Offer update hit a unique constraint. Submitted: "${name}". Shop: "${shopName}".`,
          409,
        );
      } else {
        console.error("offer update failed", error);
        return offerActionErrorResponse("Failed to update offer. Please try again later.", 500);
      }
    }
  }

  invalidateShopOffersCache(shopName);
  void runOfferPostWriteSync(admin, shopName).catch((error) => {
    console.error("Offer post-write sync crashed unexpectedly", { shopName, error });
  });

  const toastKey = intent === "create-offer" ? "create" : "update";
  return Response.json({
    success: true,
    toast: `${toastKey}-success-${Date.now()}`,
  });
}
