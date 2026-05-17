import { useEffect, useRef, useState } from "react";
import {
  useActionData,
  useFetcher,
  useLoaderData,
  useNavigate,
  useSearchParams,
  type ActionFunctionArgs,
  type HeadersFunction,
  type LoaderFunctionArgs,
  type ShouldRevalidateFunctionArgs,
} from "react-router";
import {
  authenticate,
  reconcileBundleAutomaticDiscounts,
  syncCartLinesAutomaticDiscountMetafield,
} from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DashboardPage } from "../page/DashboardPage";
import { AllOffersPage } from "../page/AllOffersPage";
import { AnalyticsPage } from "../page/AnalyticsPage";
import { PricingPage } from "../page/PricingPage";
import { CreateNewOffer } from "../component/CreateNewOffer/CreateNewOffer";
import { OfferTypeSelection } from "../component/CreateNewOffer/OfferTypeSelection";
import prisma from "../../db.server";
import {
  getCachedShopOffers,
  invalidateShopOffersCache,
} from "../../shopOffersCache.server";
import {
  BILLING_PLANS,
  billingIsTestCharge,
  buildBillingReturnUrl,
  isBillingCycle,
  isBillingPlanId,
  subscriptionDisplayName,
} from "../../billing";
import {
  createRecurringSubscription,
  fetchActiveSubscriptions,
} from "../../billing.server";
import {
  OFFER_TEXT_LIMITS,
  buildPersistedOfferFieldsFromCampaignConfig,
  clampNumber,
  getInvalidIpCountryCodes,
  normalizeCustomerProfileFilters,
  normalizeCustomerSegments,
  normalizeIpCountryCodes,
  normalizeTargetMarkets,
  LONG_RUNNING_OFFER_END_TIME_ISO,
  parseProgressiveGiftsConfig,
  progressiveGiftsConfigToStorableJson,
  parseCompleteBundleConfig,
  parseDifferentProductsDiscountRules,
  parseFreeGiftRules,
  parseFreeGiftSelectedProducts,
  parseSelectedProductIds,
  migrateLegacyOfferToCampaignConfig,
  parseCampaignConfig,
  sanitizeHexColor,
  sanitizeSingleLineText,
  trimSelectedProductsJsonForFunction,
  isOfferPublishedForBundleMetafieldSync,
  normalizeOfferEndTimeForUi,
  resolveOfferTypeFromCampaignConfig,
} from "../../utils/offerParsing";
import { sanitizeEnvLikeValue, sanitizeUrlLikeEnvValue } from "../../utils/env";
import {
  BUNDLE_METAFIELD_ENABLED_KEY,
  BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
  BUNDLE_STOREFRONT_OFFERS_KEY,
} from "../../utils/bundleShopMetafieldKeys";
import { reconcileShopOfferShardedMetafields } from "../../utils/bundleShopOfferMetafields.server";
import { BUNDLE_THEME_PRODUCT_PLUGIN } from "../../utils/themePlugins";
import type { OfferTypeId } from "../component/CreateNewOffer/offerTypeOptions";

type OfferListItem = {
  id: string;
  name: string;
  cartTitle: string;
  offerType: string;
  startTime: string;
  endTime: string;
  status: boolean;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  campaignConfigJson?: string | null;
  exposurePV?: number | null;
  addToCartPV?: number | null;
  gmv?: number | null;
  conversion?: number | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type OfferActionErrorPayload = {
  _offerActionError: true;
  message: string;
};

function offerActionErrorResponse(message: string, status: number) {
  return Response.json(
    {
      _offerActionError: true as const,
      message,
    } satisfies OfferActionErrorPayload,
    { status },
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isMissingOfferCampaignConfigColumnError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("campaignconfigjson") &&
    (
      message.includes("no such column") ||
      message.includes("has no column named") ||
      message.includes("column does not exist")
    )
  );
}

function sanitizeHexColorParam(
  raw: string | null | undefined,
  fallback: string,
): string {
  return sanitizeHexColor(raw, fallback);
}

type ShopOffersMetafieldSyncResult =
  | { ok: true }
  | { ok: false; message: string };

const LONG_RUNNING_OFFER_END_TIME = new Date(LONG_RUNNING_OFFER_END_TIME_ISO);

/**
 * 主题与购物车 Function 仅需变体 id/价/option；写入 shop metafield 时去掉冗余 title 与重复字段以控制体积。
 * （主题 parse 会从 selectedOptions 拼回展示文案；Function 不读 variants。）
 */
function slimVariantsForBundleStorefrontMetafield(
  variants: StoreProductItem["variants"] | undefined,
): Array<{ id: string; price: string; selectedOptions: Array<{ name: string; value: string }> }> {
  if (!Array.isArray(variants)) return [];
  return variants
    .filter((v) => v && typeof v === "object" && v.id)
    .map((v) => ({
      id: String(v.id),
      price: String(v.price ?? ""),
      selectedOptions: Array.isArray(v.selectedOptions)
        ? v.selectedOptions
            .filter((opt) => opt && typeof opt === "object")
            .map((opt) => ({
              name: String(opt.name ?? ""),
              value: String(opt.value ?? ""),
            }))
        : [],
    }));
}

function slimVariantsFromStoredProductShape(
  raw: unknown,
): Array<{ id: string; price: string; selectedOptions: Array<{ name: string; value: string }> }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v && typeof v === "object" && (v as { id?: unknown }).id)
    .map((v) => {
      const selectedOptions = Array.isArray((v as { selectedOptions?: unknown }).selectedOptions)
        ? ((v as { selectedOptions: Array<{ name?: unknown; value?: unknown }> }).selectedOptions || [])
            .filter((opt) => opt && typeof opt === "object")
            .map((opt) => ({
              name: String(opt.name ?? ""),
              value: String(opt.value ?? ""),
            }))
        : [];
      return {
        id: String((v as { id?: unknown }).id ?? ""),
        price: String((v as { price?: unknown }).price ?? ""),
        selectedOptions,
      };
    })
    .filter((row) => row.id);
}

function buildHydratedCompleteBundleSelectedProductsJson(
  selectedProductsJson: string | null | undefined,
  storeProductMap: Map<string, StoreProductItem>,
): string | null {
  if (!selectedProductsJson) return null;
  const config = parseCompleteBundleConfig(selectedProductsJson);
  if (!config.bars.length) return selectedProductsJson;

  const bars = config.bars.map((bar) => ({
    id: bar.id,
    type: bar.type,
    title: bar.title,
    subtitle: bar.subtitle,
    minQuantity: bar.minQuantity,
    maxQuantity: bar.maxQuantity,
    excludeTriggerProduct: bar.excludeTriggerProduct,
    quantity: bar.quantity,
    pricing: bar.pricing,
    products: (bar.products || []).map((product) => {
      const hit = storeProductMap.get(String(product.productId || ""));
      if (!hit) {
        return {
          productId: product.productId,
          handle: product.handle ?? "",
          title: product.title ?? "",
          image: product.image ?? "",
          price: product.price ?? "",
          defaultVariantId: product.defaultVariantId ?? "",
          selectedVariantId:
            String(product.selectedVariantId || product.defaultVariantId || ""),
          selectedOptions:
            product.selectedOptions && typeof product.selectedOptions === "object"
              ? product.selectedOptions
              : {},
          pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
          variants: slimVariantsFromStoredProductShape(product.variants),
        };
      }
      const variants = Array.isArray(hit.variants) ? hit.variants : [];
      const preferredVariantId = String(product.selectedVariantId || "");
      const selectedVariant =
        variants.find((variant) => String(variant.id) === preferredVariantId) || variants[0];

      return {
        productId: product.productId,
        handle: hit.handle || product.handle || "",
        title: hit.name || product.title || "",
        image: hit.image || product.image || "",
        price: selectedVariant?.price || product.price || hit.price || "",
        defaultVariantId: String(variants[0]?.id || product.defaultVariantId || ""),
        selectedVariantId: String(
          selectedVariant?.id || product.selectedVariantId || variants[0]?.id || "",
        ),
        selectedOptions:
          product.selectedOptions && Object.keys(product.selectedOptions).length > 0
            ? product.selectedOptions
            : Object.fromEntries(
                (selectedVariant?.selectedOptions || []).map((opt) => [opt.name, opt.value]),
              ),
        pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
        variants: slimVariantsForBundleStorefrontMetafield(variants),
      };
    }),
  }));

  return JSON.stringify({ bars });
}

function buildHydratedDifferentProductsSelectedProductsJson(
  selectedProductsJson: string | null | undefined,
  discountRulesJson: string | null | undefined,
  storeProductMap: Map<string, StoreProductItem>,
): string | null {
  const referencedIds = Array.from(
    new Set([
      ...parseSelectedProductIds(selectedProductsJson),
      ...parseDifferentProductsDiscountRules(discountRulesJson).flatMap((rule) => [
        ...(Array.isArray(rule.buyProductIds) ? rule.buyProductIds : []),
        ...(Array.isArray(rule.getProductIds) ? rule.getProductIds : []),
      ]),
    ]),
  );

  if (!referencedIds.length) return selectedProductsJson ?? null;

  const hydratedCatalog = referencedIds
    .map((productId) => {
      const hit = storeProductMap.get(String(productId || ""));
      if (!hit) return null;
      const firstVariant = Array.isArray(hit.variants) ? hit.variants[0] : null;
      return {
        id: hit.id,
        handle: hit.handle || "",
        title: hit.name || "",
        image: hit.image || "",
        price: firstVariant?.price || hit.price || "",
        selectedVariantId: String(firstVariant?.id || ""),
        variants: slimVariantsForBundleStorefrontMetafield(
          Array.isArray(hit.variants) ? hit.variants : undefined,
        ),
      };
    })
    .filter(
      (
        product,
      ): product is {
        id: string;
        handle: string;
        title: string;
        image: string;
        price: string;
        selectedVariantId: string;
        variants: ReturnType<typeof slimVariantsForBundleStorefrontMetafield>;
      } => Boolean(product?.id),
    );

  return hydratedCatalog.length > 0
    ? JSON.stringify(hydratedCatalog)
    : selectedProductsJson ?? null;
}

function compileOfferRuntimeSyncData(offer: OfferListItem): {
  offerType: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  referencedProductIds: string[];
  storefrontHydration: "none" | "complete-bundle" | "quantity-breaks-different";
} {
  const parsedCampaignConfig = parseCampaignConfig(offer.campaignConfigJson);
  if (parsedCampaignConfig) {
    const persistedFields = buildPersistedOfferFieldsFromCampaignConfig(
      parsedCampaignConfig,
      offer.offerSettingsJson,
    );
    return {
      offerType: persistedFields.offerType,
      selectedProductsJson: persistedFields.selectedProductsJsonForFunction,
      discountRulesJson: persistedFields.discountRulesJson,
      offerSettingsJson: persistedFields.offerSettingsJson,
      referencedProductIds: persistedFields.referencedProductIds,
      storefrontHydration: persistedFields.storefrontHydration,
    };
  }

  const effectiveOfferType = resolveOfferTypeFromCampaignConfig({
    offerType: offer.offerType,
    campaignConfigJson: offer.campaignConfigJson,
  });

  return {
    offerType: effectiveOfferType,
    selectedProductsJson: trimSelectedProductsJsonForFunction(
      effectiveOfferType,
      offer.selectedProductsJson,
    ),
    discountRulesJson: offer.discountRulesJson ?? null,
    offerSettingsJson: offer.offerSettingsJson ?? null,
    referencedProductIds: collectLegacyReferencedProductIds(offer),
    storefrontHydration:
      effectiveOfferType === "complete-bundle"
        ? "complete-bundle"
        : effectiveOfferType === "quantity-breaks-different"
          ? "quantity-breaks-different"
          : "none",
  };
}

async function buildCompactOffersPayload(
  shopOffers: OfferListItem[],
  themeExtensionEnabled = true,
): Promise<string> {
  // 仅同步后台仍「启用」的活动，避免无效活动占用 payload 体积并干扰函数计算
  const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
  // 先生成 Function 可安全消费的瘦 payload，避免 complete-bundle 展示字段把 metafield 撑爆。
  const compactOffers = activeOffers.map((offer) => {
    const runtimeSyncData = compileOfferRuntimeSyncData(offer);
    return {
      id: offer.id,
      name: offer.name,
      cartTitle: offer.cartTitle,
      status: offer.status,
      startTime: offer.startTime,
      endTime: offer.endTime,
      selectedProductsJson: runtimeSyncData.selectedProductsJson,
      discountRulesJson: runtimeSyncData.discountRulesJson,
      offerSettingsJson: runtimeSyncData.offerSettingsJson,
      offerType: runtimeSyncData.offerType,
    };
  });
  return JSON.stringify({
    updatedAt: new Date().toISOString(),
    themeExtensionEnabled: Boolean(themeExtensionEnabled),
    offers: compactOffers,
  });
}

async function buildStorefrontOffersStructured(
  admin: any,
  shopOffers: OfferListItem[],
  themeExtensionEnabled: boolean,
): Promise<{
  updatedAt: string;
  offers: Array<{
    id: string;
    name?: string;
    cartTitle?: string;
    status?: boolean;
    startTime?: string;
    endTime?: string;
    selectedProductsJson?: string | null;
    discountRulesJson?: string | null;
    offerSettingsJson?: string | null;
    offerType?: string;
  }>;
}> {
  const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
  const compiledActiveOffers = activeOffers.map((offer) => ({
    offer,
    runtimeSyncData: compileOfferRuntimeSyncData(offer),
  }));
  const compactPayload = await buildCompactOffersPayload(shopOffers, themeExtensionEnabled);
  const compactPayloadParsed = JSON.parse(compactPayload) as {
    updatedAt?: string;
    themeExtensionEnabled?: boolean;
    offers?: Array<{
      id?: string;
      name?: string;
      cartTitle?: string;
      status?: boolean;
      startTime?: string;
      endTime?: string;
      selectedProductsJson?: string | null;
      discountRulesJson?: string | null;
      offerSettingsJson?: string | null;
      offerType?: string;
    }>;
  };

  // storefront 需要补齐前台直接渲染所需的商品展示字段，避免主题脚本首次渲染时缺少 title/handle/image。
  const storefrontCatalogProductIds = collectReferencedProductIds(
    compiledActiveOffers
      .filter(
        ({ runtimeSyncData }) =>
          runtimeSyncData.storefrontHydration === "complete-bundle" ||
          runtimeSyncData.storefrontHydration === "quantity-breaks-different",
      )
      .map(({ offer }) => offer),
  );
  const storeProducts =
    storefrontCatalogProductIds.length > 0
      ? await fetchStoreProducts(admin, storefrontCatalogProductIds)
      : [];
  const storeProductMap = new Map(
    storeProducts.map((product) => [String(product.id || ""), product]),
  );

  const storefrontOffers = (compactPayloadParsed.offers || []).map((offer) => {
    const matchedCompiledOffer = compiledActiveOffers.find(
      ({ offer: activeOffer }) => String(activeOffer.id) === String(offer.id || ""),
    );
    const hydrationMode = matchedCompiledOffer?.runtimeSyncData.storefrontHydration || "none";
    const effectiveOfferType =
      matchedCompiledOffer?.runtimeSyncData.offerType ||
      resolveOfferTypeFromCampaignConfig({
        offerType: offer.offerType,
      });
    return {
      ...offer,
      offerType: effectiveOfferType,
      selectedProductsJson:
        hydrationMode === "complete-bundle"
          ? buildHydratedCompleteBundleSelectedProductsJson(
              offer.selectedProductsJson,
              storeProductMap,
            )
          : hydrationMode === "quantity-breaks-different"
            ? buildHydratedDifferentProductsSelectedProductsJson(
                offer.selectedProductsJson,
                offer.discountRulesJson,
                storeProductMap,
              )
            : offer.selectedProductsJson ?? null,
    };
  });

  const updatedAt = compactPayloadParsed.updatedAt || new Date().toISOString();
  const offers = storefrontOffers
    .map((offer) => ({
      ...offer,
      id: String(offer.id || "").trim(),
    }))
    .filter((offer) => offer.id);

  return {
    updatedAt,
    offers,
  };
}

async function loadShopOffersForSync(shopNameToSync: string): Promise<OfferListItem[]> {
  const prismaAny: any = prisma;
  try {
    return (await prismaAny.offer.findMany({
      where: { shopName: shopNameToSync },
      orderBy: { createdAt: "desc" },
    })) as OfferListItem[];
  } catch (error) {
    if (!isMissingOfferCampaignConfigColumnError(error)) {
      throw error;
    }
    console.warn(
      "[offers-sync] campaignConfigJson column missing, falling back to legacy offer read",
    );
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
    return legacyRows.map((offer: any) => ({
      ...offer,
      campaignConfigJson: null,
    })) as OfferListItem[];
  }
}

async function syncFunctionOwnerOffersMetafield(
  admin: any,
  shopNameToSync: string,
): Promise<ShopOffersMetafieldSyncResult> {
  try {
    const shopOffers = await loadShopOffersForSync(shopNameToSync);
    const themeExtensionDetection = await getCurrentThemeExtensionEnabled(admin);
    const functionMetafieldValue = await buildCompactOffersPayload(
      shopOffers,
      themeExtensionDetection.enabled,
    );
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
      console.error("[offers-sync][function-owner] sync failed", {
        shopName: shopNameToSync,
        message: discountSyncResult.message,
      });
      return discountSyncResult;
    }
    console.log("[offers-sync][function-owner] sync success", {
      shopName: shopNameToSync,
      offerCount: shopOffers.length,
    });
    return { ok: true };
  } catch (error) {
    const message = getErrorMessage(error);
    console.error("[offers-sync][function-owner] unexpected exception", {
      shopName: shopNameToSync,
      message,
    });
    return { ok: false, message };
  }
}

async function syncShopOffersMetafield(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  shopNameToSync: string,
  themeExtensionEnabled: boolean,
): Promise<ShopOffersMetafieldSyncResult> {
  try {
    console.log("[offers-sync] start syncShopOffersMetafield", {
      shopName: shopNameToSync,
      themeExtensionEnabled,
    });
    const shopOffers = await loadShopOffersForSync(shopNameToSync);
    console.log("[offers-sync] loaded offers from db", {
      shopName: shopNameToSync,
      offerCount: shopOffers.length,
      offerIds: shopOffers.map((o) => o.id),
    });

    const functionMetafieldValue = await buildCompactOffersPayload(
      shopOffers,
      themeExtensionEnabled,
    );

    const storefrontStructured = await buildStorefrontOffersStructured(
      admin,
      shopOffers,
      themeExtensionEnabled,
    );
    const mergedStorefrontPreview = JSON.stringify({
      updatedAt: storefrontStructured.updatedAt,
      offers: storefrontStructured.offers,
    });
    console.log("[offers-sync] payload size snapshot", {
      totalOffers: shopOffers.length,
      activeOffers: shopOffers.filter(isOfferPublishedForBundleMetafieldSync).length,
      mergedStorefrontPreviewLength: mergedStorefrontPreview.length,
      functionPayloadLength: functionMetafieldValue.length,
      storefrontOfferRows: storefrontStructured.offers.length,
      functionReducedBy: mergedStorefrontPreview.length - functionMetafieldValue.length,
    });

    const functionInputUtf8Bytes = new TextEncoder().encode(functionMetafieldValue).length;
    if (functionInputUtf8Bytes > 10_000) {
      console.warn(
        "[offers-sync] compact offers JSON exceeds Shopify Function single-metafield input limit (~10kB UTF-8); cart/delivery Functions may receive null",
        {
          utf8Bytes: functionInputUtf8Bytes,
          key: BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
        },
      );
    }

    const shopIdResponse = await admin.graphql(
      `#graphql
      query ShopId {
        shop {
          id
        }
      }
    `,
    );

    const shopIdJson = (await shopIdResponse.json()) as {
      data?: { shop?: { id?: string } };
      errors?: Array<{ message?: string }>;
    };

    if (shopIdJson.errors?.length) {
      console.error("[offers-sync] shop id query graphql errors", shopIdJson.errors);
      return {
        ok: false,
        message: shopIdJson.errors
          .map((e) => e.message || "unknown")
          .join("; "),
      };
    }

    const shopId = shopIdJson?.data?.shop?.id;
    if (!shopId) {
      console.error("[offers-sync] shop id missing in response", { shopIdJson });
      return {
        ok: false,
        message: "Failed to get shop ID, Metafield update failed",
      };
    }

    console.log("[offers-sync] writing shop bundle metafields", {
      shopId,
      namespace: "ciwi_bundle",
      storefrontOffersKey: BUNDLE_STOREFRONT_OFFERS_KEY,
      storefrontPayloadLength: mergedStorefrontPreview.length,
      functionInputKey: BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
      functionInputPayloadLength: functionMetafieldValue.length,
    });

    const shardSync = await reconcileShopOfferShardedMetafields(admin, shopId, {
      syncAtIso: storefrontStructured.updatedAt,
      storefrontOffersPayload: mergedStorefrontPreview,
      functionOffersCompactPayload: functionMetafieldValue,
      themeExtensionEnabled,
    });
    if (!shardSync.ok) {
      console.error("[offers-sync] sharded metafield sync failed", {
        message: shardSync.message,
      });
      return shardSync;
    }

    console.log("[offers-sync] syncing offers into automatic discount owner metafields");
    const discountSyncResult = await syncFunctionOwnerOffersMetafield(
      admin,
      shopNameToSync,
    );
    if (!discountSyncResult.ok) {
      console.error("[offers-sync] sync discount owner metafield failed", {
        message: discountSyncResult.message,
      });
      return discountSyncResult;
    }

    console.log("[offers-sync] success", {
      shopName: shopNameToSync,
      shopId,
      offerCount: shopOffers.length,
    });
    return { ok: true };
  } catch (error) {
    console.error("[offers-sync] unexpected exception", error);
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, message: msg || "Metafield sync failed" };
  }
}

const OFFER_POST_WRITE_SYNC_TIMEOUT_MS = 8_000;

async function runOfferPostWriteSync(admin: any, shopName: string): Promise<void> {
  const syncTask = (async () => {
    const functionOwnerSyncResult = await syncFunctionOwnerOffersMetafield(
      admin,
      shopName,
    );
    if (!functionOwnerSyncResult.ok) {
      console.error("syncFunctionOwnerOffersMetafield failed after offer write", {
        shopName,
        message: functionOwnerSyncResult.message,
      });
    }

    const themeExtensionDetection = await getCurrentThemeExtensionEnabled(admin);
    const syncResult = await syncShopOffersMetafield(
      admin,
      shopName,
      themeExtensionDetection.enabled,
    );
    if (!syncResult.ok) {
      console.error("syncShopOffersMetafield failed after offer write", {
        shopName,
        message: syncResult.message,
      });
    }
  })();

  try {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
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
    if (timeoutId) clearTimeout(timeoutId);
  } catch (error) {
    console.error("Offer post-write sync crashed unexpectedly", {
      shopName,
      error,
    });
  }
}

export type StoreProductItem = {
  id: string;
  name: string;
  handle: string;
  price: string;
  image: string;
  collections: Array<{
    id: string;
    title: string;
  }>;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    selectedOptions: Array<{ name: string; value: string }>;
  }>;
  hasSubscription: boolean;
};

type AdminProductNode = {
  id?: string;
  title?: string;
  handle?: string;
  featuredImage?: { url?: string | null } | null;
  collections?: {
    edges?: Array<{
      node?: {
        id?: string | null;
        title?: string | null;
      } | null;
    }>;
  } | null;
  variants?: {
    edges?: Array<{
      node?: {
        id?: string | null;
        title?: string | null;
        price?: string | null;
        selectedOptions?: Array<{
          name?: string | null;
          value?: string | null;
        } | null> | null;
      } | null;
    }>;
  } | null;
  sellingPlanGroups?: {
    edges?: Array<{ node?: { id?: string | null } | null }>;
  } | null;
} | null;

export type MarketItem = {
  id: string;
  name: string;
  handle: string;
};

export type IndexLoaderData = {
  offers?: OfferListItem[];
  storeProducts?: StoreProductItem[];
  markets: MarketItem[];
  themeTargets: ThemeEditorTarget[];
  shop: string;
  apiKey: string;
  ianaTimezone: string;
  themeExtensionEnabled: boolean;
  themeExtensionDetectionFailed: boolean;
  themeExtensionDebug?: ThemeExtensionDetectionDebug;
  themeExtensionMatchedThemeId?: string;
  billingSubscriptions: Array<{ name: string; status: string }>;
  billingTestMode: boolean;
};

export type ThemeEditorTarget = {
  id: string;
  name: string;
  role: string;
};

type ThemeExtensionDebugEntry = {
  entryKey: string | null;
  blockType: string;
  disabled?: boolean;
  hasSettings: boolean;
};

type ThemeExtensionMatchedEntry = ThemeExtensionDebugEntry & {
  matchedByApp: boolean;
  matchedByUid: boolean;
  matchedByHandleOnly: boolean;
  enabled: boolean;
};

type ThemeExtensionThemeDebug = {
  id: string;
  name: string;
  role: string;
  hasSettingsData: boolean;
  parseOk?: boolean;
  totalBlockEntries?: number;
  appRelatedEntries?: ThemeExtensionDebugEntry[];
  matchedEntries?: ThemeExtensionMatchedEntry[];
  result?: string;
};

export type ThemeExtensionDetectionDebug = {
  pluginKey: string;
  extensionHandle: string;
  extensionUid: string;
  embedHandle: string;
  appClientId: string;
  appName: string;
  appNameSlug: string;
  enabled: boolean;
  scannedThemeCount: number;
  scannedBlockCount: number;
  themes: ThemeExtensionThemeDebug[];
  matchedTheme?: {
    id: string;
    name: string;
    role: string;
    entryKey: string | null;
    blockType: string;
  };
  error?: string;
};

async function fetchThemeEditorTargets(admin: any): Promise<ThemeEditorTarget[]> {
  try {
    const response = await admin.graphql(
      `#graphql
        query ThemeEditorTargets {
          themes(first: 20) {
            edges {
              node {
                id
                name
                role
              }
            }
          }
        }
      `,
    );
    const json = await response.json();
    const themeNodes =
      json?.data?.themes?.edges
        ?.map((edge: { node?: Record<string, any> | null }) => edge?.node)
        .filter(Boolean) ?? [];
    const priorityByRole: Record<string, number> = {
      MAIN: 0,
      UNPUBLISHED: 1,
      DEVELOPMENT: 2,
      DEMO: 3,
    };

    return themeNodes
      .map((theme: any) => ({
        id: String(theme?.id || ""),
        name: String(theme?.name || "").trim(),
        role: String(theme?.role || "").trim(),
      }))
      .filter((theme: ThemeEditorTarget) => theme.id && theme.name)
      .sort((left: ThemeEditorTarget, right: ThemeEditorTarget) => {
        const leftPriority = priorityByRole[left.role] ?? 99;
        const rightPriority = priorityByRole[right.role] ?? 99;
        if (leftPriority !== rightPriority) return leftPriority - rightPriority;
        return left.name.localeCompare(right.name);
      });
  } catch (error) {
    console.error("[theme-extension] failed to fetch theme editor targets", error);
    return [];
  }
}

async function fetchShopOffers(shop: string): Promise<OfferListItem[]> {
  try {
    const prismaOffers = await getCachedShopOffers(shop);
    return prismaOffers as unknown as OfferListItem[];
  } catch (error) {
    console.error("Failed to get cached shop offers", error);
    return [];
  }
}

function mapAdminProductNodeToStoreProductItem(
  node: AdminProductNode | undefined,
): StoreProductItem | null {
  const priceRaw = node?.variants?.edges?.[0]?.node?.price;
  const image = node?.featuredImage?.url;
  if (!node?.id || !node.title) {
    return null;
  }
  return {
    id: node.id,
    name: node.title,
    handle: String(node.handle || ""),
    price: priceRaw ? `$${priceRaw}` : "$0.00",
    image: image || "https://via.placeholder.com/60",
    collections:
      node.collections?.edges
        ?.map((edge) => edge?.node)
        .filter((collection): collection is NonNullable<typeof collection> => Boolean(collection?.id))
        .map((collection) => ({
          id: String(collection.id || ""),
          title: String(collection.title || ""),
        })) || [],
    variants:
      node.variants?.edges
        ?.map((edgeV) => edgeV?.node)
        .filter((v): v is NonNullable<typeof v> => Boolean(v?.id))
        .map((v) => ({
          id: String(v.id || ""),
          title: String(v.title || ""),
          price: String(v.price || ""),
          selectedOptions: Array.isArray(v.selectedOptions)
            ? v.selectedOptions
                .filter((opt): opt is NonNullable<typeof opt> => Boolean(opt))
                .map((opt) => ({
                  name: String(opt.name || ""),
                  value: String(opt.value || ""),
                }))
            : [],
        })) || [],
    hasSubscription:
      ((node?.sellingPlanGroups?.edges as Array<unknown> | undefined) ?? []).length > 0,
  };
}

function parseBxgySelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];
  try {
    const parsed = JSON.parse(selectedProductsJson) as {
      buyProducts?: unknown;
      getProducts?: unknown;
    };
    return [
      ...(Array.isArray(parsed.buyProducts) ? parsed.buyProducts : []),
      ...(Array.isArray(parsed.getProducts) ? parsed.getProducts : []),
    ]
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collectLegacyReferencedProductIds(offer: OfferListItem): string[] {
  const effectiveOfferType = resolveOfferTypeFromCampaignConfig({
    offerType: offer.offerType,
    campaignConfigJson: offer.campaignConfigJson,
  });
  if (effectiveOfferType === "complete-bundle") {
    const config = parseCompleteBundleConfig(offer.selectedProductsJson);
    return Array.from(
      new Set(
        config.bars.flatMap((bar) =>
          (bar.products || []).map((product) => String(product.productId || "").trim()),
        ),
      ),
    ).filter(Boolean);
  }

  if (effectiveOfferType === "quantity-breaks-different") {
    const selectedIds = parseSelectedProductIds(offer.selectedProductsJson);
    const ruleIds = parseDifferentProductsDiscountRules(
      offer.discountRulesJson,
    ).flatMap((rule) => [
      ...(Array.isArray(rule.buyProductIds) ? rule.buyProductIds : []),
      ...(Array.isArray(rule.getProductIds) ? rule.getProductIds : []),
    ]);
    return Array.from(new Set([...selectedIds, ...ruleIds])).filter(Boolean);
  }

  return Array.from(
    new Set(
      effectiveOfferType === "bxgy"
        ? parseBxgySelectedProductIds(offer.selectedProductsJson)
        : effectiveOfferType === "free-gift"
          ? [
              ...parseFreeGiftSelectedProducts(offer.selectedProductsJson).triggerProducts,
              ...parseFreeGiftSelectedProducts(offer.selectedProductsJson).giftProducts,
              ...parseFreeGiftRules(offer.discountRulesJson).flatMap((rule) =>
                Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
              ),
            ]
          : parseSelectedProductIds(offer.selectedProductsJson),
    ),
  ).filter(Boolean);
}

function collectReferencedProductIds(offers: OfferListItem[]): string[] {
  const ids = new Set<string>();
  for (const offer of offers) {
    const runtimeSyncData = compileOfferRuntimeSyncData(offer);
    for (const productId of runtimeSyncData.referencedProductIds) {
      const normalized = String(productId || "").trim();
      if (normalized) ids.add(normalized);
    }
  }
  return Array.from(ids);
}

async function fetchStoreProducts(
  admin: any,
  includeProductIds: string[] = [],
): Promise<StoreProductItem[]> {
  const productMap = new Map<string, StoreProductItem>();
  let cursor: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;

  while (hasNextPage && pageCount < 10) {
    let productsJson: any;
    try {
      const productsResponse: any = await admin.graphql(
        `#graphql
          query AppProducts($after: String) {
            products(first: 100, after: $after) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  id
                  title
                  handle
                  options {
                    name
                  }
                  featuredImage {
                    url
                  }
                  collections(first: 20) {
                    edges {
                      node {
                        id
                        title
                      }
                    }
                  }
                  variants(first: 50) {
                    edges {
                      node {
                        id
                        title
                        price
                        selectedOptions {
                          name
                          value
                        }
                      }
                    }
                  }
                  sellingPlanGroups(first: 1) {
                    edges {
                      node {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        `,
        { variables: { after: cursor } },
      );
      productsJson = await productsResponse.json();
    } catch (error) {
      console.error("Failed to fetch or parse products GraphQL response", error);
      return Array.from(productMap.values());
    }

    const productEdges =
      (productsJson?.data?.products?.edges as
        | Array<{
            node?: AdminProductNode;
          }>
        | undefined) ?? [];

    for (const edge of productEdges) {
      const mapped = mapAdminProductNodeToStoreProductItem(edge?.node);
      if (mapped) productMap.set(mapped.id, mapped);
    }

    hasNextPage = Boolean(productsJson?.data?.products?.pageInfo?.hasNextPage);
    cursor = String(productsJson?.data?.products?.pageInfo?.endCursor || "") || null;
    pageCount += 1;
  }

  const missingIds = Array.from(
    new Set(
      includeProductIds
        .map((id) => String(id || "").trim())
        .filter((id) => id && !productMap.has(id)),
    ),
  );

  // 中文注释：编辑历史 offer 时，把已引用但不在前 100 个里的商品也补进来，避免预览只显示 productId。
  for (let i = 0; i < missingIds.length; i += 50) {
    const batchIds = missingIds.slice(i, i + 50);
    try {
      const byIdsResponse = await admin.graphql(
        `#graphql
          query ProductsByIds($ids: [ID!]!) {
            nodes(ids: $ids) {
              ... on Product {
                id
                title
                handle
                featuredImage {
                  url
                }
              collections(first: 20) {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
                variants(first: 50) {
                  edges {
                    node {
                      id
                      title
                      price
                      selectedOptions {
                        name
                        value
                      }
                    }
                  }
                }
                sellingPlanGroups(first: 1) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
            }
          }
        `,
        { variables: { ids: batchIds } },
      );
      const byIdsJson = await byIdsResponse.json();
      const nodes = Array.isArray(byIdsJson?.data?.nodes)
        ? (byIdsJson.data.nodes as AdminProductNode[])
        : [];
      for (const node of nodes) {
        const mapped = mapAdminProductNodeToStoreProductItem(node);
        if (mapped) productMap.set(mapped.id, mapped);
      }
    } catch (error) {
      console.error("Failed to fetch referenced products by ids", {
        batchIds,
        error,
      });
    }
  }

  return Array.from(productMap.values());
}

const ensureWebPixel = async (admin: any, shop: string) => {
  let currentWebPixelId: string | undefined;

  try {
    const queryResponse = await admin.graphql(
      `#graphql
        query CurrentWebPixel {
          webPixel {
            id
          }
        }
      `,
    );
    const queryJson = await queryResponse.json();
    currentWebPixelId = queryJson?.data?.webPixel?.id as string | undefined;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    if (!errorMessage.includes("No web pixel was found for this app")) {
      throw error;
    }
    currentWebPixelId = undefined;
  }

  console.log("[web-pixel] query result", {
    shop,
    currentWebPixelId,
  });

  if (currentWebPixelId) return;

  const createResponse = await admin.graphql(
    `#graphql
      mutation WebPixelCreate($webPixel: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixel) {
          userErrors {
            field
            message
            code
          }
          webPixel {
            id
            settings
          }
        }
      }
    `,
    {
      variables: {
        webPixel: {
          settings: {
            shopName: shop,
            server: sanitizeUrlLikeEnvValue(process.env.SHOPIFY_APP_URL),
          },
        },
      },
    },
  );
  const createJson = await createResponse.json();
  const createResult = createJson?.data?.webPixelCreate;
  const userErrors = createResult?.userErrors || [];

  if (userErrors.length > 0) {
    console.error("[web-pixel] create userErrors", { shop, userErrors });
    return;
  }

  console.log("[web-pixel] created", {
    shop,
    id: createResult?.webPixel?.id,
  });
};

/**
 * Collect objects that look like theme JSON blocks (have string `type`).
 * App embeds may live under `current.blocks` or nested elsewhere in settings_data.
 */
type ThemeBlockEntry = {
  block: Record<string, any>;
  entryKey: string | null;
};

const collectThemeBlockEntries = (
  node: unknown,
  out: ThemeBlockEntry[],
  entryKey: string | null = null,
): void => {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectThemeBlockEntries(item, out, entryKey);
    return;
  }
  const rec = node as Record<string, unknown>;
  if (typeof rec.type === "string" || entryKey) {
    out.push({
      block: rec as Record<string, any>,
      entryKey,
    });
  }
  for (const [key, value] of Object.entries(rec)) {
    collectThemeBlockEntries(value, out, key);
  }
};

/**
 * App embed status for a single theme extension block (e.g. product_detail_message -> product-detail-message.js).
 * Defaults to the MAIN theme to avoid broader theme-scan access regressions.
 * Matches editor deep-link form: `appEmbed={client_id}/{blockHandle}` e.g. `1cdf.../product_detail_message`.
 * In settings_data, Shopify may persist app embeds as generic block types like
 * `shopify://apps/{app-slug}/blocks/app-embed/{extensionUid}` rather than the liquid block filename.
 */
const getThemeExtensionEnabledAcrossThemes = async (
  admin: any,
  pluginKey: string,
  extensionHandle: string,
  /** Liquid filename bases, e.g. product_detail_message for product_detail_message.liquid */
  blockHandles: string[],
  extensionUid: string,
  /** SHOPIFY_API_KEY / app client id - required to match real storefront block types */
  appClientId: string,
  /** App display name from shopify.app.*.toml (will be normalized to slug for matching) */
  appName?: string,
): Promise<{
  enabled: boolean;
  debug: ThemeExtensionDetectionDebug;
}> => {
  const debug: ThemeExtensionDetectionDebug = {
    pluginKey,
    extensionHandle,
    extensionUid,
    embedHandle: blockHandles[0] || "",
    appClientId,
    appName: String(appName || ""),
    appNameSlug: "",
    enabled: false,
    scannedThemeCount: 0,
    scannedBlockCount: 0,
    themes: [],
  };
  try {
    const response = await admin.graphql(
      `#graphql
        query ThemeSettingsDataAcrossThemes {
          themes(first: 20) {
            edges {
              node {
                id
                name
                role
                files(filenames: ["config/settings_data.json"], first: 1) {
                  nodes {
                    ... on OnlineStoreThemeFile {
                      body {
                        ... on OnlineStoreThemeFileBodyText {
                          content
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `,
    );
    const json = await response.json();
    const graphqlErrors = Array.isArray(json?.errors) ? json.errors : [];
    const themeNodes =
      json?.data?.themes?.edges
        ?.map((edge: { node?: Record<string, any> | null }) => edge?.node)
        .filter(Boolean) ?? [];
    if (graphqlErrors.length > 0) {
      debug.error = graphqlErrors
        .map((item: { message?: string }) => String(item?.message || "").trim())
        .filter(Boolean)
        .join(" | ");
      console.error("[theme-extension] graphql errors while scanning themes", {
        errors: graphqlErrors,
        recoveredThemeCount: themeNodes.length,
      });
      if (themeNodes.length === 0) {
        return { enabled: false, debug };
      }
    }
    debug.scannedThemeCount = themeNodes.length;
    const normalizedBlockHandles = Array.from(
      new Set(blockHandles.map((handle) => String(handle || "").trim()).filter(Boolean)),
    );
    console.error("[theme-extension] scanning themes", {
      pluginKey,
      extensionHandle,
      blockHandles: normalizedBlockHandles,
      extensionUid,
      appClientId,
      appName,
      themeCount: themeNodes.length,
      themes: themeNodes.map((theme: any) => ({
        id: theme?.id,
        name: theme?.name,
        role: theme?.role,
        hasSettingsData: Boolean(theme?.files?.nodes?.[0]?.body?.content),
      })),
    });

    const handleKebabs = normalizedBlockHandles.map((handle) => handle.replace(/_/g, "-"));
    const embedHandleCandidates = [
      ...normalizedBlockHandles.map((handle) => `${appClientId}/${handle}`),
      ...handleKebabs.map((handle) => `${appClientId}/${handle}`),
    ].filter(Boolean);
    const blockPathSegments = [
      ...normalizedBlockHandles.map((handle) => `/blocks/${handle}/`),
      ...handleKebabs.map((handle) => `/blocks/${handle}/`),
    ];
    const embedUidSegments = [
      extensionUid ? `/blocks/app-embed/${extensionUid}` : "",
      ...normalizedBlockHandles.map((handle) =>
        extensionUid ? `/blocks/${handle}/${extensionUid}` : "",
      ),
      ...handleKebabs.map((handle) =>
        extensionUid ? `/blocks/${handle}/${extensionUid}` : "",
      ),
    ].filter(Boolean);

    const appNameSlug = String(appName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    debug.appNameSlug = appNameSlug;

    const isOurAppBlock = (blockType: string) => {
      if (!appClientId && !extensionHandle) return false;
      if (appClientId && blockType.includes(`/apps/${appClientId}/`))
        return true;
      if (extensionHandle && blockType.includes(`/apps/${extensionHandle}/`))
        return true;
      if (appNameSlug && blockType.includes(`/apps/${appNameSlug}/`))
        return true;
      return false;
    };

    const hasEditorEmbedHandle = (value: string | null | undefined) => {
      if (!value) return false;
      return embedHandleCandidates.some((candidate) => value.includes(candidate));
    };

    const matchesEmbedFromEditorUrl = (
      blockType: string,
      entryKey: string | null,
    ) => {
      if (hasEditorEmbedHandle(entryKey)) {
        return true;
      }
      if (!appClientId) return false;
      if (
        normalizedBlockHandles.some((handle) =>
          blockType.includes(`/apps/${appClientId}/${handle}/`),
        ) ||
        handleKebabs.some((handle) =>
          blockType.includes(`/apps/${appClientId}/${handle}/`),
        )
      ) {
        return true;
      }
      if (embedUidSegments.some((seg) => blockType.includes(seg))) {
        return true;
      }
      return blockPathSegments.some((seg) => blockType.includes(seg));
    };

    const isLikelyThemeEmbedBlock = (block: Record<string, any>) => {
      if ("disabled" in block) return true;
      if ("settings" in block) return true;
      return false;
    };

    let scannedBlockCount = 0;

    for (const theme of themeNodes) {
      const content = theme?.files?.nodes?.[0]?.body?.content;
      const themeDebug: ThemeExtensionThemeDebug = {
        id: String(theme?.id || ""),
        name: String(theme?.name || ""),
        role: String(theme?.role || ""),
        hasSettingsData: Boolean(content && typeof content === "string"),
        matchedEntries: [],
      };
      debug.themes.push(themeDebug);
      if (!content || typeof content !== "string") {
        themeDebug.result = "missing-settings-data";
        console.error("[theme-extension] theme missing settings_data", {
          themeId: theme?.id,
          themeName: theme?.name,
          themeRole: theme?.role,
        });
        continue;
      }

      // Some themes may include comments in settings_data content.
      // Strip JS-style comments before JSON.parse for compatibility.
      const normalizedContent = content
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

      let settingsData;
      try {
        settingsData = JSON.parse(normalizedContent);
        themeDebug.parseOk = true;
      } catch (e) {
        themeDebug.parseOk = false;
        themeDebug.result = "parse-failed";
        console.error("[theme-extension] failed to parse settings_data.json", {
          themeId: theme?.id,
          themeName: theme?.name,
          themeRole: theme?.role,
          error: e,
        });
        continue;
      }

      const blockEntries: ThemeBlockEntry[] = [];
      collectThemeBlockEntries(settingsData, blockEntries);
      scannedBlockCount += blockEntries.length;
      debug.scannedBlockCount = scannedBlockCount;
      themeDebug.totalBlockEntries = blockEntries.length;
      const appRelatedEntries = blockEntries
        .filter(({ block, entryKey }) => {
          const blockType = String(block?.type || "");
          return (
            Boolean(entryKey && entryKey.includes("/")) ||
            blockType.includes("shopify://apps/") ||
            blockType.includes("/apps/") ||
            blockType.includes("/blocks/")
          );
        })
        .slice(0, 12)
        .map(({ block, entryKey }) => ({
          entryKey,
          blockType: String(block?.type || ""),
          disabled: block?.disabled,
          hasSettings: "settings" in block,
        }));
      themeDebug.appRelatedEntries = appRelatedEntries;
      console.error("[theme-extension] theme scan summary", {
        themeId: theme?.id,
        themeName: theme?.name,
        themeRole: theme?.role,
        totalBlockEntries: blockEntries.length,
        appRelatedEntryCount: appRelatedEntries.length,
        appRelatedEntries,
      });

      for (const { block, entryKey } of blockEntries) {
        const blockType = String(block?.type || "");
        const matchesBlock = matchesEmbedFromEditorUrl(blockType, entryKey);
        if (!matchesBlock) continue;
        const matchedByApp = hasEditorEmbedHandle(entryKey) || isOurAppBlock(blockType);
        const matchedByUid = Boolean(
          extensionUid && embedUidSegments.some((seg) => blockType.includes(seg)),
        );
        const matchedByHandleOnly =
          !matchedByApp && !matchedByUid && isLikelyThemeEmbedBlock(block);
        const enabled = block?.disabled !== true;
        themeDebug.matchedEntries?.push({
          entryKey,
          blockType,
          disabled: block?.disabled,
          hasSettings: "settings" in block,
          matchedByApp,
          matchedByUid,
          matchedByHandleOnly,
          enabled,
        });
        console.error("[theme-extension] matched embed block", {
          extensionHandle,
          blockHandles: normalizedBlockHandles,
          extensionUid,
          appClientId,
          appNameSlug,
          themeId: theme?.id,
          themeName: theme?.name,
          themeRole: theme?.role,
          entryKey,
          blockType,
          matchedByApp,
          matchedByUid,
          matchedByHandleOnly,
          disabled: block?.disabled,
          enabled,
        });
        if (enabled && (matchedByApp || matchedByUid || matchedByHandleOnly)) {
          themeDebug.result = "enabled-match";
          debug.enabled = true;
          debug.matchedTheme = {
            id: String(theme?.id || ""),
            name: String(theme?.name || ""),
            role: String(theme?.role || ""),
            entryKey,
            blockType,
          };
          console.error("[theme-extension] enabled theme embed detected", {
            themeId: theme?.id,
            themeName: theme?.name,
            themeRole: theme?.role,
            entryKey,
            blockType,
          });
          return { enabled: true, debug };
        }
      }

      themeDebug.result = themeDebug.matchedEntries?.length
        ? "matched-but-disabled"
        : "no-match-in-theme";
      console.error("[theme-extension] no enabled embed in theme", {
        themeId: theme?.id,
        themeName: theme?.name,
        themeRole: theme?.role,
      });
    }

    console.error("[theme-extension] no matched embed block", {
      extensionHandle,
      blockHandles: normalizedBlockHandles,
      extensionUid,
      appClientId,
      appNameSlug,
      scannedThemeCount: themeNodes.length,
      scannedBlockCount,
    });
  } catch (error) {
    debug.error = error instanceof Error ? error.message : JSON.stringify(error);
    console.error("Failed to read theme extension status", error);
  }

  return { enabled: false, debug };
};

async function getCurrentThemeExtensionEnabled(admin: any): Promise<{
  enabled: boolean;
  debug: ThemeExtensionDetectionDebug;
}> {
  const apiKey = sanitizeEnvLikeValue(process.env.SHOPIFY_API_KEY);
  const appDisplayName =
    sanitizeEnvLikeValue(process.env.SHOPIFY_APP_NAME) ||
    sanitizeEnvLikeValue(process.env.APP_NAME);
  try {
    console.error("[theme-extension] start detection", {
      apiKey,
      appDisplayName,
      pluginKey: BUNDLE_THEME_PRODUCT_PLUGIN.key,
      extensionHandle: BUNDLE_THEME_PRODUCT_PLUGIN.extensionHandle,
      extensionUid: BUNDLE_THEME_PRODUCT_PLUGIN.extensionUid,
      embedHandle: BUNDLE_THEME_PRODUCT_PLUGIN.embedHandle,
    });
    return await getThemeExtensionEnabledAcrossThemes(
      admin,
      BUNDLE_THEME_PRODUCT_PLUGIN.key,
      BUNDLE_THEME_PRODUCT_PLUGIN.extensionHandle,
      BUNDLE_THEME_PRODUCT_PLUGIN.blockHandles ??
        [BUNDLE_THEME_PRODUCT_PLUGIN.embedHandle],
      BUNDLE_THEME_PRODUCT_PLUGIN.extensionUid,
      apiKey,
      appDisplayName,
    );
  } catch (error) {
    console.error("Failed to check theme extension status", error);
    return {
      enabled: false,
      debug: {
        pluginKey: BUNDLE_THEME_PRODUCT_PLUGIN.key,
        extensionHandle: BUNDLE_THEME_PRODUCT_PLUGIN.extensionHandle,
        extensionUid: BUNDLE_THEME_PRODUCT_PLUGIN.extensionUid,
        embedHandle: BUNDLE_THEME_PRODUCT_PLUGIN.embedHandle,
        appClientId: apiKey,
        appName: String(appDisplayName || ""),
        appNameSlug: "",
        enabled: false,
        scannedThemeCount: 0,
        scannedBlockCount: 0,
        themes: [],
        error: error instanceof Error ? error.message : JSON.stringify(error),
      },
    };
  }
}

/** Normalize offer name to a unique key */
function normalizeOfferNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

import { AppProvider } from "@shopify/shopify-app-react-router/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const functionOwnerSyncResult = await syncFunctionOwnerOffersMetafield(
    admin,
    session.shop,
  );
  if (!functionOwnerSyncResult.ok) {
    console.error("Failed to sync function owner offers metafield in loader", {
      shopName: session.shop,
      message: functionOwnerSyncResult.message,
    });
  }

  // eslint-disable-next-line no-undef
  const apiKey = sanitizeEnvLikeValue(process.env.SHOPIFY_API_KEY);

  // 获取商店时区
  let ianaTimezone = "UTC";
  try {
    const tzResponse = await admin.graphql(
      `#graphql
        query ShopTimezone {
          shop {
            ianaTimezone
          }
        }
      `,
    );
    const tzJson = await tzResponse.json();
    if (tzJson?.data?.shop?.ianaTimezone) {
      ianaTimezone = tzJson.data.shop.ianaTimezone;
    }
  } catch (error) {
    console.error("Failed to fetch shop timezone", error);
  }

  const themeExtensionDetection = await getCurrentThemeExtensionEnabled(admin);
  const themeExtensionEnabled = themeExtensionDetection.enabled;
  const themeExtensionDetectionFailed = Boolean(themeExtensionDetection.debug?.error);
  const themeTargets = await fetchThemeEditorTargets(admin);

  const syncResult = await syncShopOffersMetafield(
    admin,
    session.shop,
    themeExtensionEnabled,
  );
  if (!syncResult.ok) {
    console.error("Failed to sync shop offers metafield in loader", {
      shopName: session.shop,
      message: syncResult.message,
    });
  }
  if (themeExtensionDetectionFailed) {
    console.error("[theme-extension] theme detection failed (shop offers metafield still attempted)", {
      shopName: session.shop,
      error: themeExtensionDetection.debug?.error,
    });
  }

  let markets: MarketItem[] = [];
  try {
    const marketsResponse = await admin.graphql(
      `#graphql
        query ShopMarkets {
          markets(first: 250) {
            edges {
              node {
                id
                name
                handle
              }
            }
          }
        }
      `
    );
    const marketsJson = (await marketsResponse.json()) as any;
    if (marketsJson.errors) {
      console.error("GraphQL errors fetching markets:", marketsJson.errors);
    }
    const marketEdges = marketsJson?.data?.markets?.edges || [];
    markets = marketEdges.map((edge: any) => ({
      id: edge.node.id,
      name: edge.node.name,
      handle: edge.node.handle,
    }));
  } catch (error) {
    console.error("Failed to fetch shop markets", error);
  }

  let billingSubscriptions: Array<{ name: string; status: string }> = [];
  try {
    billingSubscriptions = await fetchActiveSubscriptions(admin);
  } catch (error) {
    console.error("[billing] loader fetch failed", error);
  }

  return Response.json({
    markets,
    themeTargets,
    shop: session.shop,
    apiKey,
    ianaTimezone,
    themeExtensionEnabled,
    themeExtensionDetectionFailed,
    themeExtensionDebug: themeExtensionDetection.debug,
    themeExtensionMatchedThemeId: themeExtensionDetection.debug?.matchedTheme?.id,
    billingSubscriptions,
    billingTestMode: billingIsTestCharge(),
  } satisfies IndexLoaderData);
};

const SKIP_INDEX_REVALIDATE_INTENTS = new Set([
  "create-offer",
  "update-offer",
  "toggle-offer-status",
  "delete-offer",
  "load-offers",
  "load-store-products",
  "get-product-subscription-status",
]);

export const shouldRevalidate = ({
  formData,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) => {
  const intent = String(formData?.get("intent") || "").trim();
  if (SKIP_INDEX_REVALIDATE_INTENTS.has(intent)) {
    return false;
  }
  return defaultShouldRevalidate;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const prismaAny: any = prisma;
  let intent = formData.get("intent");

  if (intent === "load-store-products") {
    const offers = await fetchShopOffers(session.shop);
    const storeProducts = await fetchStoreProducts(
      admin,
      collectReferencedProductIds(offers),
    );
    return Response.json({ storeProducts });
  }
  if (intent === "get-product-subscription-status") {
    const productId = String(formData.get("productId") || "").trim();
    if (!productId) {
      return Response.json(
        { ok: false as const, error: "Missing product ID" },
        { status: 400 },
      );
    }

    try {
      const response = await admin.graphql(
        `#graphql
          query GetProductSubscriptionStatus($id: ID!) {
            product(id: $id) {
              id
              title
              sellingPlanGroups(first: 10) {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
              requiresSellingPlan
            }
          }
        `,
        {
          variables: {
            id: productId,
          },
        },
      );
      const json = (await response.json()) as {
        data?: {
          product?: {
            id?: string;
            title?: string;
            requiresSellingPlan?: boolean;
            sellingPlanGroups?: {
              edges?: Array<{
                node?: {
                  id?: string;
                  name?: string;
                } | null;
              }>;
            };
          } | null;
        };
        errors?: unknown;
      };

      if (json.errors) {
        console.error("GraphQL errors fetching product subscription status:", json.errors);
      }

      const product = json.data?.product;
      const sellingPlanGroups =
        product?.sellingPlanGroups?.edges
          ?.map((edge) => edge?.node)
          .filter(
            (
              node,
            ): node is {
              id?: string;
              name?: string;
            } => !!node,
          ) ?? [];

      return Response.json({
        ok: true as const,
        product: {
          id: product?.id ?? productId,
          title: product?.title ?? "",
          requiresSellingPlan: product?.requiresSellingPlan === true,
          sellingPlanGroups,
          hasSubscription:
            product?.requiresSellingPlan === true || sellingPlanGroups.length > 0,
        },
      });
    } catch (error) {
      console.error("Failed to fetch product subscription status", error);
      return Response.json(
        { ok: false as const, error: "Failed to fetch product subscription status" },
        { status: 500 },
      );
    }
  }
  if (intent === "load-offers") {
    const offers = await fetchShopOffers(session.shop);
    return Response.json({ offers });
  }

  if (intent === "billing-subscribe") {
    const plan = String(formData.get("plan") || "");
    const cycle = String(formData.get("cycle") || "");
    if (!isBillingPlanId(plan) || !isBillingCycle(cycle)) {
      return Response.json(
        { ok: false as const, error: "Invalid billing plan or cycle" },
        { status: 400 },
      );
    }
    const name = subscriptionDisplayName(plan, cycle);
    const { monthlyUsd, yearlyUsd } = BILLING_PLANS[plan];
    const amount = cycle === "monthly" ? monthlyUsd : yearlyUsd;
    const interval = cycle === "monthly" ? "EVERY_30_DAYS" : "ANNUAL";
    const returnUrl = buildBillingReturnUrl(request);
    const result = await createRecurringSubscription(admin, {
      name,
      amount,
      interval,
      returnUrl,
      trialDays: 14,
    });
    if (!result.ok) {
      return Response.json(
        { ok: false as const, error: result.error },
        { status: 400 },
      );
    }

    try {
      await prismaAny.billingInitLog.create({
        data: {
          shopName: session.shop,
          planId: plan,
          cycle,
          subscriptionName: name,
          amount,
          currencyCode: "USD",
          shopifySubscriptionId: result.shopifySubscriptionId,
          testCharge: billingIsTestCharge(),
        },
      });
    } catch (logError) {
      console.error("[billing] BillingInitLog create failed", logError);
    }

    return Response.json({
      ok: true as const,
      confirmationUrl: result.confirmationUrl,
      testCharge: billingIsTestCharge(),
    });
  }

  const isTransientDbWriteError = (error: unknown) => {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : JSON.stringify(error);
    const upper = String(message || "").toUpperCase();
    return (
      upper.includes("SQLITE_BUSY") ||
      upper.includes("SQLITE_LOCKED") ||
      upper.includes("DEADLOCK") ||
      upper.includes("TIMED OUT")
    );
  };

  async function writeOfferWithRetry<T>(writeFn: () => Promise<T>) {
    try {
      return await writeFn();
    } catch (error) {
      if (!isTransientDbWriteError(error)) {
        throw error;
      }
      console.warn("offer write failed once, retrying...", error);
      await new Promise((resolve) => setTimeout(resolve, 150));
      return writeFn();
    }
  }

  console.log("action intent", intent);

  // Return error if action fails
  if (!intent) {
    const hasId = formData.get("offerId");
    intent = hasId ? "update-offer" : "create-offer";
  }

  if (intent === "create-offer" || intent === "update-offer") {
    const idRaw = String(formData.get("offerId") || "").trim();
    const nameRaw = String(formData.get("offerName") || "");
    const name = sanitizeSingleLineText(
      nameRaw,
      OFFER_TEXT_LIMITS.offerName,
    );
    const cartTitle = sanitizeSingleLineText(
      formData.get("cartTitle"),
      OFFER_TEXT_LIMITS.cartTitle,
      "Bundle Discount",
    );
    let offerType = String(formData.get("offerType") || "").trim();
    const layoutFormatRaw = String(formData.get("layoutFormat") || "").trim();
    const layoutFormat = ["vertical", "horizontal", "card", "compact"].includes(
      layoutFormatRaw,
    )
      ? layoutFormatRaw
      : "vertical";
    let startTimeRaw = String(formData.get("startTime") || "").trim();
    let endTimeRaw = String(formData.get("endTime") || "").trim();
    endTimeRaw = normalizeOfferEndTimeForUi(endTimeRaw);
    let selectedProductsJson = String(
      formData.get("selectedProductsJson") || "",
    );
    let discountRulesJson = String(formData.get("discountRulesJson") || "");
    const campaignConfigJsonRaw = String(
      formData.get("campaignConfigJson") || "",
    ).trim();

    // Status is checked, defaults to false if not provided or explicitly 'false'
    const statusRaw = String(formData.get("status") || "");
    let status = statusRaw === "true";

    const totalBudgetRaw = formData.get("totalBudget");
    const dailyBudgetRaw = formData.get("dailyBudget");

    const customerSegments = normalizeCustomerSegments(
      formData.getAll("customerSegments").map((value) => String(value || "")),
    );
    const customerProfileFilters = normalizeCustomerProfileFilters(
      formData.getAll("customerProfileFilters").map((value) => String(value || "")),
    );
    const rawIpCountryCodes = formData
      .getAll("ipCountryCodes")
      .map((value) => String(value || ""));
    const invalidIpCountryCodes = getInvalidIpCountryCodes(rawIpCountryCodes);
    const ipCountryCodes = normalizeIpCountryCodes(rawIpCountryCodes);
    const markets = normalizeTargetMarkets(
      formData.getAll("markets").map((value) => String(value || "")),
    );

    const usageLimitPerCustomer = String(
      formData.get("usageLimitPerCustomer") || "unlimited",
    );
    const couponEnabled = String(formData.get("couponEnabled") || "") === "true";
    const couponCode = sanitizeSingleLineText(
      formData.get("couponCode"),
      64,
      "",
    ).toUpperCase();

    const accentColor = sanitizeHexColorParam(
      String(formData.get("accentColor") || ""),
      "#008060",
    );
    const cardBackgroundColor = sanitizeHexColorParam(
      String(formData.get("cardBackgroundColor") || ""),
      "#ffffff",
    );
    const borderColor = sanitizeHexColorParam(
      String(formData.get("borderColor") || ""),
      "#dfe3e8",
    );
    const labelColor = sanitizeHexColorParam(
      String(formData.get("labelColor") || ""),
      "#ffffff",
    );
    const titleColor = sanitizeHexColorParam(
      String(formData.get("titleColor") || ""),
      "#111111",
    );
    const buttonPrimaryColor = sanitizeHexColorParam(
      String(formData.get("buttonPrimaryColor") || ""),
      "#008060",
    );

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
    const showCustomButtonRaw = String(formData.get("showCustomButton") || "");
    const showCustomButton = showCustomButtonRaw !== "false";
    const subscriptionEnabledRaw = String(
      formData.get("subscriptionEnabled") || "",
    );
    const subscriptionEnabled = subscriptionEnabledRaw === "true";
    const subscriptionPositionRaw = String(
      formData.get("subscriptionPosition") || "below-bundle-bars",
    ).trim();
    const subscriptionPosition = ["below-bundle-bars"].includes(
      subscriptionPositionRaw,
    )
      ? subscriptionPositionRaw
      : "below-bundle-bars";
    const subscriptionTitle = sanitizeSingleLineText(
      formData.get("subscriptionTitle"),
      60,
      "Subscribe & Save 20%",
    );
    const subscriptionSubtitle = sanitizeSingleLineText(
      formData.get("subscriptionSubtitle"),
      60,
      "Delivered weekly",
    );
    const oneTimeTitle = sanitizeSingleLineText(
      formData.get("oneTimeTitle"),
      60,
      "One-time purchase",
    );
    const oneTimeSubtitle = sanitizeSingleLineText(
      formData.get("oneTimeSubtitle"),
      60,
      "",
    );
    const subscriptionDefaultSelectedRaw = String(
      formData.get("subscriptionDefaultSelected") || "",
    );
    const subscriptionDefaultSelected =
      subscriptionDefaultSelectedRaw === "true";

    const title = sanitizeSingleLineText(
      formData.get("title"),
      OFFER_TEXT_LIMITS.widgetTitle,
      "Bundle & Save",
    );

    const scheduleTimezoneRaw = String(formData.get("scheduleTimezone") || "").trim();

    if (selectedProductsJson.length > 50_000) {
      return offerActionErrorResponse("Selected products data is too large. Please reduce the number of products.", 400);
    }
    if (discountRulesJson.length > 50_000) {
      return offerActionErrorResponse("Discount rules data is too large. Please reduce the number of rules.", 400);
    }
    if (offerType === "complete-bundle") {
      const completeBundle = parseCompleteBundleConfig(selectedProductsJson);
      if (!completeBundle.bars.length) {
        return offerActionErrorResponse(
          "Complete bundle requires at least one bar.",
          400,
        );
      }
      const hasInvalidBar = completeBundle.bars.some(
        (bar) => !bar.products.length || !Number.isFinite(Number(bar.quantity)) || Number(bar.quantity) < 1,
      );
      if (hasInvalidBar) {
        return offerActionErrorResponse(
          "Each complete bundle bar must have products and a valid quantity.",
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
      customerSegments: customerSegments.length
        ? customerSegments.join(",")
        : null,
      customerProfileFilters: customerProfileFilters.length
        ? customerProfileFilters.join(",")
        : null,
      ipCountryCodes: ipCountryCodes.length
        ? ipCountryCodes.map((value) => String(value).trim().toUpperCase()).join(",")
        : null,
      markets: markets.length ? markets.join(",") : null,
      usageLimitPerCustomer,
      accentColor,
      cardBackgroundColor,
      borderColor,
      labelColor,
      titleColor,
      buttonPrimaryColor,
      titleFontSize,
      titleFontWeight,
      buttonText,
      showCustomButton,
      subscriptionEnabled,
      subscriptionPosition,
      subscriptionTitle,
      subscriptionSubtitle,
      oneTimeTitle,
      oneTimeSubtitle,
      subscriptionDefaultSelected,
      scheduleTimezone: scheduleTimezoneRaw || undefined,
      couponEnabled,
      couponCode,
      progressiveGifts: progressiveGiftsConfigToStorableJson(progressiveGiftsSanitized),
    });

    if (couponEnabled && !couponCode) {
      return offerActionErrorResponse("Coupon offers require a shared coupon code.", 400);
    }

    let campaignConfigJson: string | null = null;

    if (selectedProductsJson.length > 50_000) {
      return offerActionErrorResponse("Selected products data is too large. Please reduce the number of products.", 400);
    }
    if (discountRulesJson.length > 50_000) {
      return offerActionErrorResponse("Discount rules data is too large. Please reduce the number of rules.", 400);
    }
    if (campaignConfigJsonRaw.length > 100_000) {
      return offerActionErrorResponse("Campaign configuration is too large. Please simplify the campaign.", 400);
    }

    if (campaignConfigJsonRaw) {
      const parsedCampaignConfig = parseCampaignConfig(campaignConfigJsonRaw);
      if (!parsedCampaignConfig) {
        return offerActionErrorResponse("Invalid campaign configuration.", 400);
      }
      if (parsedCampaignConfig.scope.productIds.length === 0) {
        return offerActionErrorResponse("Please select at least one product.", 400);
      }
      if (parsedCampaignConfig.scope.markets.length === 0) {
        return offerActionErrorResponse(
          "Select at least one market or keep All markets enabled.",
          400,
        );
      }
      if (!parsedCampaignConfig.settings.startTime) {
        return offerActionErrorResponse("Start time is required.", 400);
      }
      const parsedStartTime = new Date(parsedCampaignConfig.settings.startTime);
      const parsedEndTime = parsedCampaignConfig.settings.endTime
        ? new Date(parsedCampaignConfig.settings.endTime)
        : null;
      if (
        isNaN(parsedStartTime.getTime()) ||
        (parsedEndTime && isNaN(parsedEndTime.getTime()))
      ) {
        return offerActionErrorResponse("Invalid start or end time format.", 400);
      }
      if (
        parsedEndTime &&
        parsedEndTime.getTime() <= parsedStartTime.getTime()
      ) {
        return offerActionErrorResponse("End time must be after start time.", 400);
      }
      const hasCountdownBlock = parsedCampaignConfig.displayBlocks.some(
        (block) => block.type === "countdown",
      );
      if (hasCountdownBlock && !parsedCampaignConfig.settings.endTime) {
        return offerActionErrorResponse("Countdown requires an end time.", 400);
      }
      if (parsedCampaignConfig.logicBlocks.length === 0) {
        return offerActionErrorResponse("Please add at least one promotion rule.", 400);
      }
      if (
        parsedCampaignConfig.settings.couponEnabled === true &&
        !String(parsedCampaignConfig.settings.couponCode || "").trim()
      ) {
        return offerActionErrorResponse("Coupon offers require a shared coupon code.", 400);
      }
      const persistedFields = buildPersistedOfferFieldsFromCampaignConfig(
        parsedCampaignConfig,
        JSON.stringify({
          progressiveGifts: progressiveGiftsConfigToStorableJson(progressiveGiftsSanitized),
        }),
      );
      campaignConfigJson = JSON.stringify(parsedCampaignConfig);
      offerType = persistedFields.offerType;
      if (!selectedProductsJson) {
        selectedProductsJson = persistedFields.selectedProductsJson || "";
      }
      discountRulesJson = persistedFields.discountRulesJson || discountRulesJson;
      offerSettingsJson = persistedFields.offerSettingsJson;
      status = parsedCampaignConfig.settings.status;
      startTimeRaw = parsedCampaignConfig.settings.startTime || startTimeRaw;
      endTimeRaw = parsedCampaignConfig.settings.endTime || endTimeRaw;
    } else {
      const derivedCampaignConfig = migrateLegacyOfferToCampaignConfig({
        offerType,
        selectedProductsJson,
        discountRulesJson,
        offerSettingsJson,
        startTime: startTimeRaw,
        endTime: endTimeRaw,
        status,
      });
      campaignConfigJson = JSON.stringify(derivedCampaignConfig);
    }

    // Store which Shopify shop this offer belongs to.
    // `session.shop` is typically the shop's domain. As a fallback, use GraphQL `shop.name`.
    let shopName = String((session as any)?.shop ?? "");
    if (!shopName) {
      const shopNameResponse = await admin.graphql(
        `#graphql
        query ShopName {
          shop {
            name
          }
        }`,
      );
      const shopNameJson = await shopNameResponse.json();
      shopName = shopNameJson?.data?.shop?.name ?? "";
    }

    if (!name) {
      return offerActionErrorResponse("Please enter an offer name.", 400);
    }
    if (!cartTitle) {
      return offerActionErrorResponse("Please enter a display title.", 400);
    }
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
    if (!startTimeRaw) {
      return offerActionErrorResponse("Start time is required.", 400);
    }

    const startTime = new Date(startTimeRaw);
    const endTime = endTimeRaw
      ? new Date(endTimeRaw)
      : new Date(LONG_RUNNING_OFFER_END_TIME);

    if (isNaN(startTime.getTime()) || (endTimeRaw && isNaN(endTime.getTime()))) {
      return offerActionErrorResponse("Invalid start or end time format.", 400);
    }
    if (endTimeRaw && endTime.getTime() <= startTime.getTime()) {
      return offerActionErrorResponse("End time must be after start time.", 400);
    }

    const nameKey = normalizeOfferNameKey(name);
    const siblingOffers = await prismaAny.offer.findMany({
      where: { shopName },
      select: { id: true, name: true },
    });
    const nameTaken = siblingOffers.some(
      (o: { id: string; name: string }) =>
        normalizeOfferNameKey(o.name) === nameKey &&
        (intent === "create-offer" || o.id !== idRaw),
    );
    if (nameTaken) {
      return offerActionErrorResponse(
        "An offer with this name already exists. Please choose a different name.",
        409,
      );
    }

    const data = {
      shopName,
      // name 被作为唯一标识
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
    const legacyData = {
      ...data,
      campaignConfigJson: undefined,
    };

    const url = new URL(request.url);

    if (intent === "create-offer") {
      try {
        await writeOfferWithRetry(() => prismaAny.offer.create({ data }));
        url.searchParams.set("toast", `create-success-${Date.now()}`);
      } catch (error: any) {
        if (isMissingOfferCampaignConfigColumnError(error)) {
          console.warn(
            "[offer-create] campaignConfigJson column missing, retrying with legacy payload only",
          );
          try {
            await writeOfferWithRetry(() => prismaAny.offer.create({ data: legacyData }));
            url.searchParams.set("toast", `create-success-${Date.now()}`);
          } catch (legacyError: any) {
            if (legacyError.code === "P2002") {
              return offerActionErrorResponse(
                "An offer with this name already exists. Please choose a different name.",
                409,
              );
            }
            console.error("offer create failed after legacy fallback", {
              error: legacyError,
              form: {
                nameRaw,
                offerType,
                startTimeRaw,
                endTimeRaw,
                selectedProductsJson,
                discountRulesJson,
                offerSettingsJson,
              },
            });
            return offerActionErrorResponse("Failed to create offer. Please try again later.", 500);
          }
        } else if (
          error.code === "P2002"
        ) {
          return offerActionErrorResponse(
            "An offer with this name already exists. Please choose a different name.",
            409,
          );
        }
        console.error("offer create failed", {
          error,
          form: {
            nameRaw,
            offerType,
            startTimeRaw,
            endTimeRaw,
            selectedProductsJson,
            discountRulesJson,
            offerSettingsJson,
          },
        });
        return offerActionErrorResponse("Failed to create offer. Please try again later.", 500);
      }
    } else {
      if (!idRaw) {
        return offerActionErrorResponse("Missing offer ID, cannot update.", 400);
      }
      try {
        await writeOfferWithRetry(() =>
          prismaAny.offer.update({
            where: { id: idRaw },
            data,
          }),
        );
        url.searchParams.set("toast", `update-success-${Date.now()}`);
      } catch (error: any) {
        if (isMissingOfferCampaignConfigColumnError(error)) {
          console.warn(
            "[offer-update] campaignConfigJson column missing, retrying with legacy payload only",
          );
          try {
            await writeOfferWithRetry(() =>
              prismaAny.offer.update({
                where: { id: idRaw },
                data: legacyData,
              }),
            );
            url.searchParams.set("toast", `update-success-${Date.now()}`);
          } catch (legacyError: any) {
            if (legacyError.code === "P2002") {
              return offerActionErrorResponse(
                "An offer with this name already exists. Please choose a different name.",
                409,
              );
            }
            console.error("offer update failed after legacy fallback", {
              error: legacyError,
              form: {
                idRaw,
                nameRaw,
                offerType,
                startTimeRaw,
                endTimeRaw,
                selectedProductsJson,
                discountRulesJson,
                offerSettingsJson,
              },
            });
            return offerActionErrorResponse("Failed to update offer. Please try again later.", 500);
          }
        } else if (
          error.code === "P2002"
        ) {
          return offerActionErrorResponse(
            "An offer with this name already exists. Please choose a different name.",
            409,
          );
        }
        console.error("offer update failed", {
          error,
          form: {
            idRaw,
            nameRaw,
            offerType,
            startTimeRaw,
            endTimeRaw,
            selectedProductsJson,
            discountRulesJson,
            offerSettingsJson,
          },
        });
        return offerActionErrorResponse("Failed to update offer. Please try again later.", 500);
      }
    }

    invalidateShopOffersCache(shopName);
    void runOfferPostWriteSync(admin, shopName).catch((error) => {
      console.error("Offer post-write sync crashed unexpectedly", {
        shopName,
        error,
      });
    });

    return Response.json({
      success: true,
      toast: url.searchParams.get("toast"),
    });
  }

  if (intent === "toggle-offer-status") {
    const idRaw = String(formData.get("offerId") || "").trim();
    const nextStatusRaw = String(formData.get("nextStatus") || "").trim();

    if (!idRaw) {
      return new Response("Missing offer id", { status: 400 });
    }

    const nextStatus = nextStatusRaw === "true";

    let updatedOffer;
    try {
      updatedOffer = await prismaAny.offer.update({
        where: { id: idRaw },
        data: { status: nextStatus },
      });
    } catch (error) {
      console.error("toggle-offer-status update failed", error);
      return offerActionErrorResponse("Toggle status failed.", 500);
    }

    const shopNameToSync = updatedOffer?.shopName as string | undefined;
    if (shopNameToSync) {
      invalidateShopOffersCache(String(shopNameToSync));
      void runOfferPostWriteSync(admin, shopNameToSync).catch((error) => {
        console.error("Offer post-write sync crashed unexpectedly", {
          shopName: shopNameToSync,
          error,
        });
      });
    }

    return Response.json({ success: true, toast: `toggle-success-${Date.now()}` });
  }

  if (intent === "delete-offer") {
    const idRaw = String(formData.get("offerId") || "").trim();
    if (!idRaw) {
      return new Response("Missing offer id", { status: 400 });
    }

    // Find shopName to sync metafield
    let shopNameToSync: string | undefined;
    try {
      const offerToDelete = await prismaAny.offer.findUnique({
        where: { id: idRaw },
        select: {
          id: true,
          shopName: true,
        },
      });
      shopNameToSync = offerToDelete?.shopName as string | undefined;

      await prismaAny.offer.delete({
        where: { id: idRaw },
        select: {
          id: true,
        },
      });
    } catch (error) {
      console.error("delete-offer failed", error);
      return offerActionErrorResponse("Delete offer failed.", 500);
    }

    if (shopNameToSync) {
      invalidateShopOffersCache(String(shopNameToSync));
      void runOfferPostWriteSync(admin, shopNameToSync).catch((error) => {
        console.error("Offer post-write sync crashed unexpectedly", {
          shopName: shopNameToSync,
          error,
        });
      });
    }

    return Response.json({ success: true, toast: `delete-success-${Date.now()}` });
  }

  return new Response(`Unknown intent: ${String(intent || "")}`, {
    status: 400,
  });
};

type HomeTabKey = "dashboard" | "offers" | "analytics" | "pricing";

export default function Index() {
  const {
    markets,
    themeTargets,
    shop,
    apiKey,
    ianaTimezone,
    themeExtensionEnabled,
    themeExtensionDetectionFailed,
    themeExtensionDebug,
    themeExtensionMatchedThemeId,
    billingSubscriptions,
    billingTestMode,
  } = useLoaderData() as IndexLoaderData;
  const actionData = useActionData() as
    | { toast?: string }
    | { _offerActionError: true; message: string }
    | undefined;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HomeTabKey>("dashboard");
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [createOfferType, setCreateOfferType] = useState<OfferTypeId | null>(null);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [analyticsOfferId, setAnalyticsOfferId] = useState<string | null>(null);
  const offersFetcher = useFetcher<{ offers: OfferListItem[] }>();
  const storeProductsFetcher = useFetcher<{ storeProducts: StoreProductItem[] }>();
  const lastOffersRefreshToastRef = useRef<string | null>(null);

  const offers = offersFetcher.data?.offers ?? [];
  const storeProducts = storeProductsFetcher.data?.storeProducts ?? [];
  const isOffersLoading =
    !offersFetcher.data?.offers && offersFetcher.state !== "idle";
  const shouldShowOfferBuilder = Boolean(editingOfferId || (showCreateOffer && createOfferType));
  const isStoreProductsLoading =
    shouldShowOfferBuilder &&
    !storeProductsFetcher.data?.storeProducts &&
    storeProductsFetcher.state !== "idle";

  const toast =
    searchParams.get("toast") ||
    (actionData && "toast" in actionData ? actionData.toast : undefined);

  useEffect(() => {
    if (searchParams.get("billing_return") !== "1") return;
    setActiveTab("pricing");
    const next = new URLSearchParams(searchParams);
    next.delete("billing_return");
    navigate(
      { search: next.toString() ? `?${next.toString()}` : "" },
      { replace: true },
    );
  }, [searchParams, navigate]);

  useEffect(() => {
    if (actionData && "_offerActionError" in actionData && actionData._offerActionError) {
      setToastMessage(actionData.message);
      return;
    }
    if (toast?.startsWith("create-success")) {
      setToastMessage("Offer created successfully");
      setActiveTab("offers");
      setShowCreateOffer(false);
      setCreateOfferType(null);
      setEditingOfferId(null);
    } else if (toast?.startsWith("update-success")) {
      setToastMessage("Offer updated successfully");
      setActiveTab("offers");
      setShowCreateOffer(false);
      setCreateOfferType(null);
      setEditingOfferId(null);
    } else if (toast?.startsWith("delete-success")) {
      setToastMessage("Offer deleted successfully");
      setShowCreateOffer(false);
      setCreateOfferType(null);
      setEditingOfferId(null);
    } else if (toast?.startsWith("toggle-success")) {
      setToastMessage("Offer status updated successfully");
    } else {
      setToastMessage(null);
    }
  }, [toast, actionData]);

  useEffect(() => {
    if (!toastMessage) return;

    const timer = setTimeout(() => {
      if (toast) {
        const next = new URLSearchParams(searchParams);
        next.delete("toast");
        navigate(
          {
            search: next.toString() ? `?${next.toString()}` : "",
          },
          { replace: true },
        );
      }
      setToastMessage(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast, toastMessage, navigate, searchParams]);

  useEffect(() => {
    if (offersFetcher.data?.offers) return;
    if (offersFetcher.state !== "idle") return;
    offersFetcher.submit({ intent: "load-offers" }, { method: "post" });
  }, [offersFetcher, offersFetcher.data, offersFetcher.state]);

  useEffect(() => {
    const shouldRefresh =
      toast?.startsWith("create-success") ||
      toast?.startsWith("update-success") ||
      toast?.startsWith("delete-success") ||
      toast?.startsWith("toggle-success");
    if (!shouldRefresh) {
      lastOffersRefreshToastRef.current = null;
      return;
    }
    if (lastOffersRefreshToastRef.current === toast) return;
    if (offersFetcher.state !== "idle") return;
    lastOffersRefreshToastRef.current = toast || null;
    offersFetcher.submit({ intent: "load-offers" }, { method: "post" });
  }, [toast, offersFetcher, offersFetcher.state]);

  useEffect(() => {
    const shouldLoadStoreProducts = shouldShowOfferBuilder;
    if (!shouldLoadStoreProducts) return;
    if (storeProductsFetcher.data?.storeProducts) return;
    if (storeProductsFetcher.state !== "idle") return;

    storeProductsFetcher.submit(
      { intent: "load-store-products" },
      { method: "post" },
    );
  }, [
    shouldShowOfferBuilder,
    storeProductsFetcher,
    storeProductsFetcher.data,
    storeProductsFetcher.state,
  ]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 max-w-[1280px] w-full mx-auto px-[16px] sm:px-[24px] pt-[12px] sm:pt-[16px] relative">
          {toastMessage && (
          <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm !text-white px-4 py-2 rounded shadow-lg text-sm font-sans">
            {toastMessage}
          </div>
        )}
        {/* Tabs */}
        {!showCreateOffer && !editingOfferId && (
          <nav className="mb-[12px] sm:mb-[16px] overflow-x-auto">
            <div className="inline-flex min-w-max gap-[6px] rounded-[10px] border border-[#e5e7eb] bg-white p-[4px]">
            <button
              type="button"
              onClick={() => {
                setShowCreateOffer(false);
                setActiveTab("dashboard");
              }}
              className={`rounded-[8px] px-[12px] py-[8px] text-center cursor-pointer transition-all ${
                activeTab === "dashboard"
                  ? "bg-[#f6f6f7] text-[#1c1f23]"
                  : "text-[#5c6166] hover:bg-[#f6f6f7] hover:text-[#1c1f23]"
              }`}
            >
              <span
                className={`font-sans leading-[20px] text-[13px] font-medium tracking-normal ${activeTab === "dashboard" ? "text-[#1c1f23]" : "text-[#5c6166]"}`}
              >
                Dashboard
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCreateOffer(false);
                setActiveTab("offers");
              }}
              className={`rounded-[8px] px-[12px] py-[8px] text-center cursor-pointer transition-all ${
                activeTab === "offers"
                  ? "bg-[#f6f6f7] text-[#1c1f23]"
                  : "text-[#5c6166] hover:bg-[#f6f6f7] hover:text-[#1c1f23]"
              }`}
            >
              <span
                className={`font-sans leading-[20px] text-[13px] font-medium tracking-normal ${activeTab === "offers" ? "text-[#1c1f23]" : "text-[#5c6166]"}`}
              >
                All Offers
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowCreateOffer(false);
                setActiveTab("analytics");
              }}
              className={`rounded-[8px] px-[12px] py-[8px] text-center cursor-pointer transition-all ${
                activeTab === "analytics"
                  ? "bg-[#f6f6f7] text-[#1c1f23]"
                  : "text-[#5c6166] hover:bg-[#f6f6f7] hover:text-[#1c1f23]"
              }`}
            >
              <span
                className={`font-sans leading-[20px] text-[13px] font-medium tracking-normal ${activeTab === "analytics" ? "text-[#1c1f23]" : "text-[#5c6166]"}`}
              >
                Analytics
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateOffer(false);
                setActiveTab("pricing");
              }}
              className={`rounded-[8px] px-[12px] py-[8px] text-center cursor-pointer transition-all ${
                activeTab === "pricing"
                  ? "bg-[#f6f6f7] text-[#1c1f23]"
                  : "text-[#5c6166] hover:bg-[#f6f6f7] hover:text-[#1c1f23]"
              }`}
            >
              <span
                className={`font-sans leading-[20px] text-[13px] font-medium tracking-normal ${activeTab === "pricing" ? "text-[#1c1f23]" : "text-[#5c6166]"}`}
              >
                Pricing
              </span>
            </button>
            </div>
          </nav>
        )}

        {/* Tab content */}
        {activeTab === "dashboard" && !showCreateOffer && !editingOfferId && (
          <DashboardPage
            offers={offers}
            offersLoading={isOffersLoading}
            storeProducts={storeProducts}
            markets={markets}
            shop={shop}
            apiKey={apiKey}
            themeTargets={themeTargets}
            themeExtensionMatchedThemeId={themeExtensionMatchedThemeId}
            ianaTimezone={ianaTimezone}
            themeExtensionEnabled={themeExtensionEnabled}
            themeExtensionDetectionFailed={themeExtensionDetectionFailed}
            themeExtensionError={themeExtensionDebug?.error}
            onViewAllOffers={() => setActiveTab("offers")}
            onViewAnalytics={(offerId) => {
              if (offerId) {
                setAnalyticsOfferId(offerId);
              } else {
                setAnalyticsOfferId(null);
              }
              setActiveTab("analytics");
            }}
            onCreateOffer={() => {
              setShowCreateOffer(true);
              setCreateOfferType(null);
              setEditingOfferId(null);
              setActiveTab("offers");
            }}
          />
        )}
        {activeTab === "offers" && !showCreateOffer && !editingOfferId && (
          <AllOffersPage
            offers={offers}
            offersLoading={isOffersLoading}
            ianaTimezone={ianaTimezone}
            themeExtensionEnabled={themeExtensionEnabled}
            themeExtensionDetectionFailed={themeExtensionDetectionFailed}
            shop={shop}
            apiKey={apiKey}
            themeTargets={themeTargets}
            themeExtensionMatchedThemeId={themeExtensionMatchedThemeId}
            onCreateOffer={() => {
              setShowCreateOffer(true);
              setCreateOfferType(null);
              setEditingOfferId(null);
            }}
            onEditOffer={(id) => {
              setEditingOfferId(id);
              setShowCreateOffer(false);
              setCreateOfferType(null);
            }}
          />
        )}
        {showCreateOffer && !createOfferType && !editingOfferId && (
          <OfferTypeSelection
            onBack={() => {
              setShowCreateOffer(false);
              setCreateOfferType(null);
              setEditingOfferId(null);
            }}
            onSelect={(offerType) => {
              setCreateOfferType(offerType);
            }}
          />
        )}
        {(shouldShowOfferBuilder || editingOfferId) &&
          (isStoreProductsLoading ? (
            <div className="bg-white rounded-[12px] border border-[#e3e8ed] p-[24px] shadow-sm">
              <div className="animate-pulse space-y-[12px]">
                <div className="h-[24px] w-[220px] bg-[#f1f2f4] rounded-[6px]" />
                <div className="h-[16px] w-[320px] bg-[#f1f2f4] rounded-[6px]" />
                <div className="h-[16px] w-[280px] bg-[#f1f2f4] rounded-[6px]" />
                <div className="h-[120px] w-full bg-[#f1f2f4] rounded-[8px]" />
              </div>
              <p className="mt-[12px] text-[13px] text-[#6d7175]">
                Loading products for offer editor...
              </p>
            </div>
          ) : (
            <CreateNewOffer
              onBack={() => {
                if (editingOfferId) {
                  setShowCreateOffer(false);
                  setEditingOfferId(null);
                  return;
                }
                setCreateOfferType(null);
              }}
              initialOffer={editingOfferId ? offers.find(o => o.id === editingOfferId) as any : undefined}
              initialOfferType={createOfferType ?? undefined}
              storeProducts={storeProducts}
              markets={markets}
              existingOffers={offers.map((o) => ({
                id: o.id,
                name: o.name,
                cartTitle: o.cartTitle,
                offerType: o.offerType,
              }))}
            />
          ))}
        {activeTab === "analytics" && (
          <AnalyticsPage 
            shop={shop} 
            offers={offers} 
            defaultOfferId={analyticsOfferId} 
          />
        )}
        {activeTab === "pricing" && (
          <PricingPage
            activeSubscriptions={billingSubscriptions}
            billingTestMode={billingTestMode}
          />
        )}
        </div>
        <div className="mt-[8px] mb-[24px] flex w-full flex-wrap items-center justify-center gap-[10px] rounded-[12px] border border-[#e9edf1] bg-[#fcfcfd] px-[16px] py-[14px] text-[13px] text-[#666]">
          <a
            href="mailto:support@ciwi.ai" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mx-3 text-[#666] hover:text-[#008060] transition-colors"
          >
            Contact Us
          </a>
          <span className="text-[#c4cdd5]">|</span>
          <a
            href="https://iw73s3ld6wy.feishu.cn/wiki/UEumwgOLJi90rEknevWcZp7HnQg?from=from_copylink" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mx-3 text-[#666] hover:text-[#008060] transition-colors"
          >
            User Guide
          </a>
        </div>
      </div>
    </AppProvider>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
