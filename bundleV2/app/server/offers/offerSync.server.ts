import prisma from "../../db.server";
import {
  reconcileBundleAutomaticDiscounts,
  syncCartLinesAutomaticDiscountMetafield,
} from "../../shopify.server";
import { isOfferPublishedForBundleMetafieldSync } from "../../utils/offerParsing";
import { reconcileShopOfferShardedMetafields } from "../../utils/bundleShopOfferMetafields.server";
import {
  BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
} from "../../utils/bundleShopMetafieldKeys";
import { createShopOfferSyncScheduler } from "../../routes/_index/offerSyncScheduler";
import {
  buildCompactOffersPayload,
  buildStorefrontOffersStructured,
  measureUtf8Bytes,
  FUNCTION_OFFERS_MAX_BYTES,
} from "./offerPayload.server";
import {
  logOfferMetafieldSyncFailure,
  logOfferMetafieldSyncPhase,
  type OfferMetafieldSyncContext,
} from "./offerSyncLog.server";
import type { OfferListItem } from "../../routes/_index/types";

type AdminType = {
  graphql: (query: string, opts?: { variables?: unknown }) => Promise<{ json: () => Promise<unknown> }>;
};

type SyncResult = { ok: true } | { ok: false; message: string; step?: string };

function isMissingCampaignConfigColumn(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes("campaignconfigjson") &&
    (msg.includes("no such column") ||
      msg.includes("has no column named") ||
      msg.includes("column does not exist"))
  );
}

export async function loadShopOffersForSync(shopNameToSync: string): Promise<OfferListItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  try {
    return (await prismaAny.offer.findMany({
      where: { shopName: shopNameToSync },
      orderBy: { createdAt: "desc" },
    })) as OfferListItem[];
  } catch (error) {
    if (!isMissingCampaignConfigColumn(error)) throw error;
    console.warn("[offers-sync] campaignConfigJson column missing, falling back to legacy offer read");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const legacyRows = await prismaAny.offer.findMany({
      where: { shopName: shopNameToSync },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shopName: true,
        name: true,
        cartTitle: true,
        offerType: true,
        startTime: true,
        endTime: true,
        status: true,
        selectedProductsJson: true,
        discountRulesJson: true,
        offerSettingsJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return legacyRows.map((offer: any) => ({ ...offer, campaignConfigJson: null })) as OfferListItem[];
  }
}

async function syncFunctionOwnerOffersMetafield(
  admin: AdminType,
  shopNameToSync: string,
  syncContext: OfferMetafieldSyncContext,
): Promise<SyncResult> {
  try {
    const shopOffers = await loadShopOffersForSync(shopNameToSync);
    const functionMetafieldValue = await buildCompactOffersPayload(shopOffers);
    const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
    logOfferMetafieldSyncPhase("discount-metafields-ok", shopNameToSync, syncContext, {
      step: "discount-sync-start",
      offerCount: shopOffers.length,
      activeOfferCount: activeOffers.length,
      compactPayloadBytes: measureUtf8Bytes(functionMetafieldValue),
    });
    await reconcileBundleAutomaticDiscounts(admin);
    const discountSyncResult = await syncCartLinesAutomaticDiscountMetafield(
      admin,
      functionMetafieldValue,
    );
    if (!discountSyncResult.ok) {
      logOfferMetafieldSyncPhase("discount-metafields-failed", shopNameToSync, syncContext, {
        message: discountSyncResult.message,
      });
      return { ...discountSyncResult, step: "discount-metafields" };
    }
    logOfferMetafieldSyncPhase("discount-metafields-ok", shopNameToSync, syncContext, {
      step: "discount-sync-complete",
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    logOfferMetafieldSyncFailure(shopNameToSync, syncContext, "discount-metafields", error);
    return { ok: false, message, step: "discount-metafields" };
  }
}

export async function syncShopOffersMetafield(
  admin: AdminType,
  shopNameToSync: string,
  syncContext: OfferMetafieldSyncContext = { trigger: "loader" },
): Promise<SyncResult> {
  const startedAt = Date.now();
  logOfferMetafieldSyncPhase("start", shopNameToSync, syncContext);

  try {
    const shopOffers = await loadShopOffersForSync(shopNameToSync);
    const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
    logOfferMetafieldSyncPhase("db-loaded", shopNameToSync, syncContext, {
      offerCount: shopOffers.length,
      activeOfferCount: activeOffers.length,
      durationMs: Date.now() - startedAt,
    });

    let functionMetafieldValue: string;
    try {
      functionMetafieldValue = await buildCompactOffersPayload(shopOffers);
    } catch (error) {
      logOfferMetafieldSyncFailure(shopNameToSync, syncContext, "compact-payload-built", error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, message, step: "compact-payload-built" };
    }
    logOfferMetafieldSyncPhase("compact-payload-built", shopNameToSync, syncContext, {
      compactPayloadBytes: measureUtf8Bytes(functionMetafieldValue),
      activeOfferCount: activeOffers.length,
    });

    let storefrontStructured: Awaited<ReturnType<typeof buildStorefrontOffersStructured>>;
    try {
      storefrontStructured = await buildStorefrontOffersStructured(admin, shopOffers);
    } catch (error) {
      logOfferMetafieldSyncFailure(shopNameToSync, syncContext, "storefront-built", error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, message, step: "storefront-built" };
    }
    const mergedStorefrontPreview = JSON.stringify({
      updatedAt: storefrontStructured.updatedAt,
      offers: storefrontStructured.offers,
    });
    logOfferMetafieldSyncPhase("storefront-built", shopNameToSync, syncContext, {
      syncAt: storefrontStructured.updatedAt,
      storefrontOfferCount: storefrontStructured.offers.length,
      storefrontPayloadBytes: measureUtf8Bytes(mergedStorefrontPreview),
    });

    const functionInputUtf8Bytes = measureUtf8Bytes(functionMetafieldValue);
    if (functionInputUtf8Bytes > FUNCTION_OFFERS_MAX_BYTES) {
      console.warn("[offers-sync] compact offers JSON exceeds Shopify Function input limit (~10kB)", {
        utf8Bytes: functionInputUtf8Bytes,
        limit: FUNCTION_OFFERS_MAX_BYTES,
        key: BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
      });
    }

    let shopId: string | undefined;
    try {
      const shopIdResponse = await admin.graphql(`#graphql query ShopId { shop { id } }`);
      const shopIdJson = (await shopIdResponse.json()) as {
        data?: { shop?: { id?: string } };
        errors?: Array<{ message?: string }>;
      };

      if (shopIdJson.errors?.length) {
        const message = shopIdJson.errors.map((e) => e.message || "unknown").join("; ");
        logOfferMetafieldSyncFailure(shopNameToSync, syncContext, "shop-id-resolved", message);
        return { ok: false, message, step: "shop-id-resolved" };
      }

      shopId = shopIdJson?.data?.shop?.id;
    } catch (error) {
      logOfferMetafieldSyncFailure(shopNameToSync, syncContext, "shop-id-resolved", error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      return { ok: false, message, step: "shop-id-resolved" };
    }

    if (!shopId) {
      const message = "Failed to get shop ID, Metafield update failed";
      logOfferMetafieldSyncFailure(shopNameToSync, syncContext, "shop-id-resolved", message);
      return { ok: false, message, step: "shop-id-resolved" };
    }

    logOfferMetafieldSyncPhase("shop-id-resolved", shopNameToSync, syncContext, { shopId });

    const shardSync = await reconcileShopOfferShardedMetafields(admin, shopId, {
      syncAtIso: storefrontStructured.updatedAt,
      storefrontOffersPayload: mergedStorefrontPreview,
      functionOffersCompactPayload: functionMetafieldValue,
    });
    if (!shardSync.ok) {
      logOfferMetafieldSyncPhase("shop-metafields-failed", shopNameToSync, syncContext, {
        message: shardSync.message,
      });
      return { ...shardSync, step: "shop-metafields" };
    }

    logOfferMetafieldSyncPhase("shop-metafields-ok", shopNameToSync, syncContext, {
      shopId,
      syncAt: storefrontStructured.updatedAt,
      keys: ["ciwi-bundle-offer-sync-at", "ciwi-bundle-offers", "ciwi-bundle-offers-fn"],
      storefrontPayloadBytes: measureUtf8Bytes(mergedStorefrontPreview),
      functionPreviewPayloadBytes: measureUtf8Bytes(functionMetafieldValue),
    });

    const discountSyncResult = await syncFunctionOwnerOffersMetafield(
      admin,
      shopNameToSync,
      syncContext,
    );
    if (!discountSyncResult.ok) {
      return discountSyncResult;
    }

    logOfferMetafieldSyncPhase("complete", shopNameToSync, syncContext, {
      shopId,
      offerCount: shopOffers.length,
      activeOfferCount: activeOffers.length,
      durationMs: Date.now() - startedAt,
      result: "success",
    });
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    logOfferMetafieldSyncFailure(shopNameToSync, syncContext, "unexpected", error, {
      durationMs: Date.now() - startedAt,
    });
    return { ok: false, message: msg || "Metafield sync failed", step: "unexpected" };
  }
}

const OFFER_POST_WRITE_SYNC_TIMEOUT_MS = 8_000;
const offerPostWriteSyncScheduler = createShopOfferSyncScheduler();

export async function runOfferPostWriteSync(
  admin: AdminType,
  shopName: string,
  syncContext: OfferMetafieldSyncContext = { trigger: "loader" },
): Promise<void> {
  const startedAt = Date.now();

  const syncTask = offerPostWriteSyncScheduler.schedule(shopName, async () => {
    const syncResult = await syncShopOffersMetafield(admin, shopName, syncContext);
    if (!syncResult.ok) {
      logOfferMetafieldSyncFailure(shopName, syncContext, syncResult.step || "syncShopOffersMetafield", syncResult.message, {
        path: "post-write",
        durationMs: Date.now() - startedAt,
      });
    }
  });

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      syncTask,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          logOfferMetafieldSyncPhase("timed-out", shopName, syncContext, {
            path: "post-write",
            timeoutMs: OFFER_POST_WRITE_SYNC_TIMEOUT_MS,
            durationMs: Date.now() - startedAt,
          });
          resolve();
        }, OFFER_POST_WRITE_SYNC_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    logOfferMetafieldSyncFailure(shopName, syncContext, "post-write-crash", error, {
      durationMs: Date.now() - startedAt,
    });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
