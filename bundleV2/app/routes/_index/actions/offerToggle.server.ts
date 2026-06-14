import prisma from "../../../db.server";
import { invalidateShopOffersCache } from "../../../shopOffersCache.server";
import { runOfferPostWriteSync } from "../../../server/offers/offerSync.server";
import { buildOfferStatusCampaignConfigJson, validateOwnedOfferAccess } from "../offerActionHelpers";
import {
  isMissingOfferCampaignConfigColumnError,
  offerActionErrorResponse,
  resolveSessionShopName,
  writeOfferWithRetry,
} from "../actionUtils";

type AdminType = {
  graphql: (
    query: string,
    opts?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
};

export async function handleToggleOfferStatus(
  admin: AdminType,
  session: { shop?: string | null },
  formData: FormData,
): Promise<Response> {
  const idRaw = String(formData.get("offerId") || "").trim();
  const nextStatusRaw = String(formData.get("nextStatus") || "").trim();

  if (!idRaw) {
    return new Response("Missing offer id", { status: 400 });
  }

  const nextStatus = nextStatusRaw === "true";
  const shopName = await resolveSessionShopName(admin, session);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;

  const legacyOfferSelect = { id: true, shopName: true } as const;

  let updatedOffer: { shopName?: string | null } | null = null;
  try {
    let existingOffer: {
      id: string;
      shopName: string;
      campaignConfigJson?: string | null;
    } | null;

    try {
      existingOffer = await prismaAny.offer.findUnique({
        where: { id: idRaw },
        select: { id: true, shopName: true, campaignConfigJson: true },
      });
    } catch (readError) {
      if (!isMissingOfferCampaignConfigColumnError(readError)) throw readError;
      console.warn(
        "[toggle-offer-status] campaignConfigJson column missing, using legacy offer read",
      );
      existingOffer = await prismaAny.offer.findUnique({
        where: { id: idRaw },
        select: legacyOfferSelect,
      });
      if (existingOffer) {
        existingOffer = { ...existingOffer, campaignConfigJson: null };
      }
    }

    if (!existingOffer) {
      return new Response("Offer not found", { status: 404 });
    }

    const ownershipValidation = validateOwnedOfferAccess({
      idRaw,
      shopName,
      existingOffer,
      missingIdMessage: "Missing offer id",
    });
    if (!ownershipValidation.ok) {
      return new Response(ownershipValidation.message, { status: ownershipValidation.status });
    }

    const nextCampaignConfigJson = buildOfferStatusCampaignConfigJson({
      campaignConfigJson: existingOffer.campaignConfigJson,
      nextStatus,
    });

    const updateData = {
      status: nextStatus,
      campaignConfigJson: nextCampaignConfigJson,
    };
    const legacyUpdateData = { status: nextStatus };

    try {
      updatedOffer = await writeOfferWithRetry(() =>
        prismaAny.offer.update({
          where: { id: idRaw },
          data: updateData,
        }),
      );
    } catch (updateError) {
      if (!isMissingOfferCampaignConfigColumnError(updateError)) throw updateError;
      console.warn(
        "[toggle-offer-status] campaignConfigJson column missing, retrying status-only update",
      );
      updatedOffer = await writeOfferWithRetry(() =>
        prismaAny.offer.update({
          where: { id: idRaw },
          data: legacyUpdateData,
        }),
      );
    }
  } catch (error) {
    console.error("toggle-offer-status update failed", error);
    return offerActionErrorResponse("Toggle status failed.", 500);
  }

  const shopNameToSync = updatedOffer?.shopName as string | undefined;
  if (shopNameToSync) {
    invalidateShopOffersCache(String(shopNameToSync));
    void runOfferPostWriteSync(admin, shopNameToSync, {
      trigger: "toggle-offer-status",
      offerId: idRaw,
    }).catch((error) => {
      console.error("Offer post-write sync crashed unexpectedly", { shopName: shopNameToSync, error });
    });
  }

  return Response.json({ success: true, toast: `toggle-success-${Date.now()}` });
}
