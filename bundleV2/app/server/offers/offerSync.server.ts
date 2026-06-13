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
import type { OfferListItem } from "../../routes/_index/types";

type AdminType = {
  graphql: (query: string, opts?: { variables?: unknown }) => Promise<{ json: () => Promise<unknown> }>;
};

type SyncResult = { ok: true } | { ok: false; message: string };

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
        name: true,
        cartTitle: true,
        offerType: true,
        startTime: true,
        endTime: true,
        status: true,
        selectedProductsJson: true,
        discountRulesJson: true,
        offerSettingsJson: true,
        exposurePV: true,
        addToCartPV: true,
        gmv: true,
        conversion: true,
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
): Promise<SyncResult> {
  try {
    const shopOffers = await loadShopOffersForSync(shopNameToSync);
    const functionMetafieldValue = await buildCompactOffersPayload(shopOffers);
    console.log("[offers-sync][function-owner] syncing payload", {
      shopName: shopNameToSync,
      offerCount: shopOffers.length,
      activeOffers: shopOffers.filter(isOfferPublishedForBundleMetafieldSync).length,
      payloadLength: functionMetafieldValue.length,
    });
    await reconcileBundleAutomaticDiscounts(admin);
    const discountSyncResult = await syncCartLinesAutomaticDiscountMetafield(
      admin,
      functionMetafieldValue,
    );
    if (!discountSyncResult.ok) {
      console.error("[offers-sync][function-owner] sync failed", discountSyncResult);
      return discountSyncResult;
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[offers-sync][function-owner] unexpected exception", { shopName: shopNameToSync, message });
    return { ok: false, message };
  }
}

export async function syncShopOffersMetafield(
  admin: AdminType,
  shopNameToSync: string,
): Promise<SyncResult> {
  try {
    console.log("[offers-sync] start syncShopOffersMetafield", { shopName: shopNameToSync });
    const shopOffers = await loadShopOffersForSync(shopNameToSync);
    console.log("[offers-sync] loaded offers from db", {
      shopName: shopNameToSync,
      offerCount: shopOffers.length,
    });

    const functionMetafieldValue = await buildCompactOffersPayload(shopOffers);
    const storefrontStructured = await buildStorefrontOffersStructured(admin, shopOffers);
    const mergedStorefrontPreview = JSON.stringify({
      updatedAt: storefrontStructured.updatedAt,
      offers: storefrontStructured.offers,
    });

    // 后台写入路径的兜底告警。正常情况下 offerWrite 的字节守卫已在保存前拦截超限；
    // 这里再记一次（例如批量导入 / 历史数据走到此路径时），便于排查。
    const functionInputUtf8Bytes = measureUtf8Bytes(functionMetafieldValue);
    if (functionInputUtf8Bytes > FUNCTION_OFFERS_MAX_BYTES) {
      console.warn("[offers-sync] compact offers JSON exceeds Shopify Function input limit (~10kB)", {
        utf8Bytes: functionInputUtf8Bytes,
        limit: FUNCTION_OFFERS_MAX_BYTES,
        key: BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
      });
    }

    const shopIdResponse = await admin.graphql(`#graphql query ShopId { shop { id } }`);
    const shopIdJson = (await shopIdResponse.json()) as {
      data?: { shop?: { id?: string } };
      errors?: Array<{ message?: string }>;
    };

    if (shopIdJson.errors?.length) {
      return {
        ok: false,
        message: shopIdJson.errors.map((e) => e.message || "unknown").join("; "),
      };
    }

    const shopId = shopIdJson?.data?.shop?.id;
    if (!shopId) return { ok: false, message: "Failed to get shop ID, Metafield update failed" };

    const shardSync = await reconcileShopOfferShardedMetafields(admin, shopId, {
      syncAtIso: storefrontStructured.updatedAt,
      storefrontOffersPayload: mergedStorefrontPreview,
      functionOffersCompactPayload: functionMetafieldValue,
    });
    if (!shardSync.ok) {
      console.error("[offers-sync] sharded metafield sync failed", shardSync);
      return shardSync;
    }

    const discountSyncResult = await syncFunctionOwnerOffersMetafield(admin, shopNameToSync);
    if (!discountSyncResult.ok) {
      console.error("[offers-sync] sync discount owner metafield failed", discountSyncResult);
      return discountSyncResult;
    }

    console.log("[offers-sync] success", { shopName: shopNameToSync, shopId });
    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("[offers-sync] unexpected exception", error);
    return { ok: false, message: msg || "Metafield sync failed" };
  }
}

const OFFER_POST_WRITE_SYNC_TIMEOUT_MS = 8_000;
const offerPostWriteSyncScheduler = createShopOfferSyncScheduler();

export async function runOfferPostWriteSync(admin: AdminType, shopName: string): Promise<void> {
  const syncTask = offerPostWriteSyncScheduler.schedule(shopName, async () => {
    const syncResult = await syncShopOffersMetafield(admin, shopName);
    if (!syncResult.ok) {
      console.error("syncShopOffersMetafield failed after offer write", {
        shopName,
        message: syncResult.message,
      });
    }
  });

  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      syncTask,
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(() => {
          console.error("Offer post-write sync timed out; save will still succeed", {
            shopName,
            timeoutMs: OFFER_POST_WRITE_SYNC_TIMEOUT_MS,
          });
          resolve();
        }, OFFER_POST_WRITE_SYNC_TIMEOUT_MS);
      }),
    ]);
  } catch (error) {
    console.error("Offer post-write sync crashed unexpectedly", { shopName, error });
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
