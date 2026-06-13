import prisma from "../../../db.server";
import { invalidateShopOffersCache } from "../../../shopOffersCache.server";
import { runOfferPostWriteSync } from "../../../server/offers/offerSync.server";
import { validateOwnedOfferAccess } from "../offerActionHelpers";
import { offerActionErrorResponse, resolveSessionShopName } from "../actionUtils";

type AdminType = {
  graphql: (query: string, opts?: { variables?: unknown }) => Promise<{ json: () => Promise<unknown> }>;
};

export async function handleDeleteOffer(
  admin: AdminType,
  session: { shop?: string | null },
  formData: FormData,
): Promise<Response> {
  const idRaw = String(formData.get("offerId") || "").trim();
  if (!idRaw) {
    return new Response("Missing offer id", { status: 400 });
  }

  const shopName = await resolveSessionShopName(admin, session);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  let shopNameToSync: string | undefined;

  try {
    const offerToDelete = await prismaAny.offer.findUnique({
      where: { id: idRaw },
      select: { id: true, shopName: true },
    });

    const ownershipValidation = validateOwnedOfferAccess({
      idRaw,
      shopName,
      existingOffer: offerToDelete,
      missingIdMessage: "Missing offer id",
    });
    if (!ownershipValidation.ok) {
      return new Response(ownershipValidation.message, { status: ownershipValidation.status });
    }

    shopNameToSync = offerToDelete?.shopName as string | undefined;
    await prismaAny.offer.delete({ where: { id: idRaw }, select: { id: true } });
  } catch (error) {
    console.error("delete-offer failed", error);
    return offerActionErrorResponse("Delete offer failed.", 500);
  }

  if (shopNameToSync) {
    invalidateShopOffersCache(String(shopNameToSync));
    void runOfferPostWriteSync(admin, shopNameToSync, {
      trigger: "delete-offer",
      offerId: idRaw,
    }).catch((error) => {
      console.error("Offer post-write sync crashed unexpectedly", { shopName: shopNameToSync, error });
    });
  }

  return Response.json({ success: true, toast: `delete-success-${Date.now()}` });
}
