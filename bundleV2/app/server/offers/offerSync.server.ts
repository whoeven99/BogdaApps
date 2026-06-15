import prisma from "../../db.server";
import {
  syncCartLinesAutomaticDiscountMetafield,
} from "../../shopify.server";
import { isOfferPublishedForBundleMetafieldSync } from "../../utils/offerParsing";
import { reconcileShopOfferShardedMetafields } from "../../utils/bundleShopOfferMetafields.server";
import {
  BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
  BUNDLE_SHOP_METAFIELD_NAMESPACE,
  BUNDLE_OFFER_SYNC_AT_KEY,
} from "../../utils/bundleShopMetafieldKeys";
import { createShopOfferSyncScheduler } from "../../routes/_index/offerSyncScheduler";
import {
  buildCompactOffersPayload,
  buildStorefrontOffersStructured,
  measureUtf8Bytes,
  offersFitWithinShardLimits,
  FUNCTION_OFFERS_MAX_BYTES,
} from "./offerPayload.server";
import {
  logOfferMetafieldSyncFailure,
  logOfferMetafieldSyncPhase,
  type OfferMetafieldSyncContext,
} from "./offerSyncLog.server";
import type { OfferListItem } from "../../routes/_index/types";

type AdminType = {
  graphql: (
    query: string,
    opts?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
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
  shopOffers: OfferListItem[],
  functionMetafieldValue: string,
): Promise<SyncResult> {
  try {
    const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
    logOfferMetafieldSyncPhase("discount-metafields-ok", shopNameToSync, syncContext, {
      step: "discount-sync-start",
      offerCount: shopOffers.length,
      activeOfferCount: activeOffers.length,
      compactPayloadBytes: measureUtf8Bytes(functionMetafieldValue),
    });
    // 不再每次保存都 reconcile（重）：discount 节点在 afterAuth 建好；
    // syncCartLinesAutomaticDiscountMetafield 内部在"找不到 owner"时会自愈式补跑一次。
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

    const functionInputUtf8Bytes = measureUtf8Bytes(functionMetafieldValue);
    if (functionInputUtf8Bytes > FUNCTION_OFFERS_MAX_BYTES) {
      console.warn("[offers-sync] compact offers JSON exceeds Shopify Function input limit (~10kB)", {
        utf8Bytes: functionInputUtf8Bytes,
        limit: FUNCTION_OFFERS_MAX_BYTES,
        key: BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
      });
    }

    // 真正会导致结账折扣静默失效的是「某个 discount class 的分片放不下而被丢弃」，
    // 聚合字节数不溢出也可能某一类溢出。这里按 class 校验并显式上报。
    const shardFit = offersFitWithinShardLimits(functionMetafieldValue);
    if (!shardFit.ok) {
      console.error("[offers-sync] offers overflow per-class shard limit; some offers will be DROPPED at checkout", {
        overflowClasses: shardFit.overflowClasses,
        limitPerShard: FUNCTION_OFFERS_MAX_BYTES,
      });
      logOfferMetafieldSyncPhase("shard-overflow", shopNameToSync, syncContext, {
        overflowClasses: shardFit.overflowClasses,
      });
    }

    // 结账折扣（Function owner metafield）与前台展示（Shop metafield）是两个独立目的，
    // 解耦：函数 owner 同步失败不再阻断主题 metafield 写入，反之亦然；末尾聚合上报。
    const discountSyncResult = await syncFunctionOwnerOffersMetafield(
      admin,
      shopNameToSync,
      syncContext,
      shopOffers,
      functionMetafieldValue,
    );
    if (!discountSyncResult.ok) {
      logOfferMetafieldSyncPhase("discount-metafields-failed", shopNameToSync, syncContext, {
        message: discountSyncResult.message,
        note: "continuing to storefront metafield write despite checkout-discount sync failure",
      });
    }

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

    let shopId: string | undefined;
    try {
      const shopIdResponse = await admin.graphql(
        `#graphql
          query ShopId {
            shop { id }
          }
        `,
      );
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

    // 主题 metafield 已写成功；若结账折扣同步此前失败，仍把该失败作为最终结果上报。
    if (!discountSyncResult.ok) {
      return { ...discountSyncResult, step: "discount-metafields" };
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

/**
 * Loader 兜底自愈，每 10 分钟也强制重写一次（防御外部把 metafield 改坏/清空）。
 * 在这个窗口内、且 DB 自上次写入后无变化时，loader 跳过整轮重写。
 */
const LOADER_SYNC_MAX_STALENESS_MS = 10 * 60 * 1000;

/** 读 shop 上一次写 offers 的时间戳（ISO）；读不到返回 null（按需触发同步）。 */
async function readShopOfferSyncAt(admin: AdminType): Promise<string | null> {
  try {
    const resp = await admin.graphql(
      `#graphql
        query OfferSyncAt {
          shop {
            metafield(namespace: "${BUNDLE_SHOP_METAFIELD_NAMESPACE}", key: "${BUNDLE_OFFER_SYNC_AT_KEY}") {
              value
            }
          }
        }
      `,
    );
    const json = (await resp.json()) as {
      data?: { shop?: { metafield?: { value?: string | null } | null } };
    };
    return json?.data?.shop?.metafield?.value ?? null;
  } catch (error) {
    console.warn("[offers-sync] failed to read sync-at metafield; will sync", error);
    return null;
  }
}

/** 廉价聚合：店铺 offer 数量 + 最新 updatedAt（毫秒）。出错时强制同步。 */
async function readOfferDbState(
  shopNameToSync: string,
): Promise<{ count: number; maxUpdatedAtMs: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaAny = prisma as any;
  try {
    const agg = await prismaAny.offer.aggregate({
      where: { shopName: shopNameToSync },
      _max: { updatedAt: true },
      _count: { _all: true },
    });
    return {
      count: agg?._count?._all ?? 0,
      maxUpdatedAtMs: agg?._max?.updatedAt ? new Date(agg._max.updatedAt).getTime() : 0,
    };
  } catch (error) {
    console.warn("[offers-sync] failed to aggregate offers; will sync", error);
    return { count: -1, maxUpdatedAtMs: Number.MAX_SAFE_INTEGER };
  }
}

/**
 * loader 用：仅当 offer 数据自上次写入后有变化、或已超过周期性自愈窗口时才真正同步。
 * 写路径（runOfferPostWriteSync）已负责变更后的即时同步，故 loader 默认是廉价空转。
 */
export async function syncShopOffersMetafieldIfStale(
  admin: AdminType,
  shopNameToSync: string,
  syncContext: OfferMetafieldSyncContext = { trigger: "loader" },
): Promise<SyncResult> {
  const [syncAtRaw, dbState] = await Promise.all([
    readShopOfferSyncAt(admin),
    readOfferDbState(shopNameToSync),
  ]);

  const syncAtMs = syncAtRaw ? Date.parse(syncAtRaw) : NaN;
  const hasSyncAt = Number.isFinite(syncAtMs);
  const periodicRefreshDue = !hasSyncAt || Date.now() - syncAtMs > LOADER_SYNC_MAX_STALENESS_MS;
  const dataUnchanged = hasSyncAt && dbState.maxUpdatedAtMs <= syncAtMs;

  if (dataUnchanged && !periodicRefreshDue) {
    logOfferMetafieldSyncPhase("skipped-fresh", shopNameToSync, syncContext, {
      syncAt: syncAtRaw,
      offerCount: dbState.count,
      maxUpdatedAtMs: dbState.maxUpdatedAtMs,
    });
    return { ok: true };
  }

  return syncShopOffersMetafield(admin, shopNameToSync, syncContext);
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
