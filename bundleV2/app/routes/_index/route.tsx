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
} from "react-router";
import {
  authenticate,
  ensureCartLinesAutomaticDiscount,
  syncCartLinesAutomaticDiscountMetafield,
} from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DashboardPage } from "../page/DashboardPage";
import { AllOffersPage } from "../page/AllOffersPage";
import { AnalyticsPage } from "../page/AnalyticsPage";
import { PricingPage } from "../page/PricingPage";
import { CreateNewOffer } from "../component/CreateNewOffer/CreateNewOffer";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
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
  clampNumber,
  parseCompleteBundleConfig,
  parseSelectedProductIds,
  sanitizeHexColor,
  sanitizeSingleLineText,
} from "../../utils/offerParsing";

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

function sanitizeHexColorParam(
  raw: string | null | undefined,
  fallback: string,
): string {
  return sanitizeHexColor(raw, fallback);
}

type ShopOffersMetafieldSyncResult =
  | { ok: true }
  | { ok: false; message: string };

const BUNDLE_METAFIELD_NAMESPACE = "ciwi_bundle";
const BUNDLE_METAFIELD_BASE_KEY = "ciwi-bundle-offers";
const BUNDLE_METAFIELD_ACTIVE_ENV_KEY = "ciwi-bundle-offers-active-env";
const BUNDLE_METAFIELD_ENABLED_PROD_KEY = "ciwi-bundle-enabled-prod";
const BUNDLE_METAFIELD_ENABLED_TEST_KEY = "ciwi-bundle-enabled-test";
const PROD_SHOPIFY_API_KEY = "bfc13ad696f2a8d2a77ba6eee1e26966";
const TEST_SHOPIFY_API_KEY = "ab25ea895c6df574ae9ff70e9c7731c5";

type BundleEnvironment = "prod" | "test";

function resolveBundleEnvironment(): BundleEnvironment {
  const explicit =
    String(process.env.BUNDLE_ENV || process.env.APP_ENV || "")
      .trim()
      .toLowerCase();
  if (explicit === "prod" || explicit === "production") return "prod";
  if (explicit === "test" || explicit === "staging") return "test";

  const apiKey = String(process.env.SHOPIFY_API_KEY || "").trim();
  if (apiKey === PROD_SHOPIFY_API_KEY) return "prod";
  if (apiKey === TEST_SHOPIFY_API_KEY) return "test";

  return process.env.NODE_ENV === "production" ? "prod" : "test";
}

function buildOfferMetafieldsInput(
  ownerId: string,
  offersPayload: string,
  _themeExtensionEnabled: boolean,
) {
  return [
    {
      ownerId,
      namespace: BUNDLE_METAFIELD_NAMESPACE,
      key: BUNDLE_METAFIELD_BASE_KEY,
      type: "json",
      value: offersPayload,
    },
  ];
}

function buildHydratedCompleteBundleSelectedProductsJson(
  selectedProductsJson: string | null | undefined,
  storeProductMap: Map<string, StoreProductItem>,
): string | null {
  if (!selectedProductsJson) return null;
  const config = parseCompleteBundleConfig(selectedProductsJson);
  if (!config.bars.length) return selectedProductsJson;

  const bars = config.bars.map((bar) => ({
    ...bar,
    products: (bar.products || []).map((product) => {
      const hit = storeProductMap.get(String(product.productId || ""));
      if (!hit) return product;
      const variants = Array.isArray(hit.variants) ? hit.variants : [];
      const preferredVariantId = String(product.selectedVariantId || "");
      const selectedVariant =
        variants.find((variant) => String(variant.id) === preferredVariantId) || variants[0];

      return {
        ...product,
        handle: hit.handle || product.handle || "",
        title: hit.name || product.title || "",
        image: hit.image || product.image || "",
        price: selectedVariant?.price || product.price || hit.price || "",
        defaultVariantId: String(variants[0]?.id || product.defaultVariantId || ""),
        selectedVariantId:
          String(selectedVariant?.id || product.selectedVariantId || variants[0]?.id || ""),
        selectedOptions:
          product.selectedOptions && Object.keys(product.selectedOptions).length > 0
            ? product.selectedOptions
            : Object.fromEntries(
                (selectedVariant?.selectedOptions || []).map((opt) => [opt.name, opt.value]),
              ),
        variants,
      };
    }),
  }));

  return JSON.stringify({ bars });
}

async function buildCompactOffersPayload(
  admin: any,
  shopOffers: OfferListItem[],
): Promise<string> {
  // 仅同步 status=true 的活动，避免无效活动占用 payload 体积并干扰函数计算
  const activeOffers = shopOffers.filter((offer) => offer.status === true);
  // 中文注释：DB 里仍保持轻量 selectedProductsJson，但同步到 storefront 时按 productId 补齐展示字段。
  const completeBundleProductIds = collectReferencedProductIds(
    activeOffers.filter((offer) => offer.offerType === "complete-bundle"),
  );
  const storeProducts =
    completeBundleProductIds.length > 0
      ? await fetchStoreProducts(admin, completeBundleProductIds)
      : [];
  const storeProductMap = new Map(
    storeProducts.map((product) => [String(product.id || ""), product]),
  );

  // 仅保留主题与 Function 运行所需字段，避免 payload 过大导致运行时读取失败
  const compactOffers = activeOffers.map((offer) => ({
    id: offer.id,
    name: offer.name,
    cartTitle: offer.cartTitle,
    status: offer.status,
    startTime: offer.startTime,
    endTime: offer.endTime,
    selectedProductsJson:
      offer.offerType === "complete-bundle"
        ? buildHydratedCompleteBundleSelectedProductsJson(
            offer.selectedProductsJson,
            storeProductMap,
          )
        : offer.selectedProductsJson ?? null,
    discountRulesJson: offer.discountRulesJson ?? null,
    offerSettingsJson: offer.offerSettingsJson ?? null,
    offerType: offer.offerType,
  }));
  return JSON.stringify({
    updatedAt: new Date().toISOString(),
    offers: compactOffers,
  });
}

async function syncShopOffersMetafield(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  shopNameToSync: string,
  themeExtensionEnabled: boolean,
): Promise<ShopOffersMetafieldSyncResult> {
  const prismaAny: any = prisma;
  try {
    console.log("[offers-sync] start syncShopOffersMetafield", {
      shopName: shopNameToSync,
      themeExtensionEnabled,
    });
    const shopOffers = (await prismaAny.offer.findMany({
      where: { shopName: shopNameToSync },
      orderBy: { createdAt: "desc" },
    })) as OfferListItem[];
    console.log("[offers-sync] loaded offers from db", {
      shopName: shopNameToSync,
      offerCount: shopOffers.length,
      offerIds: shopOffers.map((o) => o.id),
    });

    const fullPayload = JSON.stringify({
      updatedAt: new Date().toISOString(),
      offers: shopOffers,
    });
    const metafieldValue = await buildCompactOffersPayload(admin, shopOffers);
    console.log("[offers-sync] payload size snapshot", {
      totalOffers: shopOffers.length,
      activeOffers: shopOffers.filter((offer) => offer.status === true).length,
      fullPayloadLength: fullPayload.length,
      compactPayloadLength: metafieldValue.length,
      reducedBy: fullPayload.length - metafieldValue.length,
    });

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

    console.log("[offers-sync] writing shop metafield", {
      shopId,
      namespace: BUNDLE_METAFIELD_NAMESPACE,
      key: BUNDLE_METAFIELD_BASE_KEY,
      payloadLength: metafieldValue.length,
    });
    const metafieldsSetResponse = await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            id
            key
            namespace
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
      {
        variables: {
          metafields: buildOfferMetafieldsInput(
            shopId,
            metafieldValue,
            themeExtensionEnabled,
          ),
        },
      },
    );

    const metafieldsSetJson = (await metafieldsSetResponse.json()) as {
      data?: {
        metafieldsSet?: {
          userErrors?: Array<{ message?: string }>;
        };
      };
      errors?: Array<{ message?: string }>;
    };

    if (metafieldsSetJson.errors?.length) {
      console.error("[offers-sync] metafieldsSet graphql errors", metafieldsSetJson.errors);
      return {
        ok: false,
        message: metafieldsSetJson.errors
          .map((e) => e.message || "unknown")
          .join("; "),
      };
    }

    const userErrors = metafieldsSetJson?.data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.error("[offers-sync] metafieldsSet userErrors", userErrors);
      return {
        ok: false,
        message: userErrors.map((e) => e.message || "unknown").join("; "),
      };
    }

    // 关键：Discount Function 运行时优先从 discount owner 读取配置。
    // 这里把同一份 offers JSON 同步到自动折扣本身，避免 shop.metafield 在 Function 侧不可见。
    console.log("[offers-sync] ensure automatic discount before owner metafield sync");
    await ensureCartLinesAutomaticDiscount(admin);
    console.log("[offers-sync] syncing offers into automatic discount owner metafields");
    const discountSyncResult = await syncCartLinesAutomaticDiscountMetafield(
      admin,
      metafieldValue,
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

export type StoreProductItem = {
  id: string;
  name: string;
  handle: string;
  price: string;
  image: string;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    selectedOptions: Array<{ name: string; value: string }>;
  }>;
};

type AdminProductNode = {
  id?: string;
  title?: string;
  handle?: string;
  featuredImage?: { url?: string | null } | null;
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
  shop: string;
  apiKey: string;
  ianaTimezone: string;
  themeExtensionEnabled: boolean;
  billingSubscriptions: Array<{ name: string; status: string }>;
  billingTestMode: boolean;
};

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

function collectReferencedProductIds(offers: OfferListItem[]): string[] {
  const ids = new Set<string>();
  for (const offer of offers) {
    if (offer.offerType === "complete-bundle") {
      const config = parseCompleteBundleConfig(offer.selectedProductsJson);
      for (const bar of config.bars) {
        for (const product of bar.products || []) {
          const productId = String(product.productId || "").trim();
          if (productId) ids.add(productId);
        }
      }
      continue;
    }

    const selectedIds =
      offer.offerType === "bxgy"
        ? parseBxgySelectedProductIds(offer.selectedProductsJson)
        : parseSelectedProductIds(offer.selectedProductsJson);
    for (const productId of selectedIds) {
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
  let productsResponse;
  let productsJson;
  try {
    productsResponse = await admin.graphql(
      `#graphql
        query AppProducts {
          products(first: 100) {
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
              }
            }
          }
        }
      `,
    );
    productsJson = await productsResponse.json();
  } catch (error) {
    console.error("Failed to fetch or parse products GraphQL response", error);
    return [];
  }

  const productEdges =
    (productsJson?.data?.products?.edges as
      | Array<{
          node?: AdminProductNode;
        }>
      | undefined) ?? [];

  const productMap = new Map<string, StoreProductItem>();
  for (const edge of productEdges) {
    const mapped = mapAdminProductNodeToStoreProductItem(edge?.node);
    if (mapped) productMap.set(mapped.id, mapped);
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
            server: process.env.SHOPIFY_APP_URL || "",
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
const collectTypedBlocks = (
  node: unknown,
  out: Array<Record<string, any>>,
): void => {
  if (node === null || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectTypedBlocks(item, out);
    return;
  }
  const rec = node as Record<string, unknown>;
  if (typeof rec.type === "string") {
    out.push(rec);
  }
  for (const v of Object.values(rec)) {
    collectTypedBlocks(v, out);
  }
};

/**
 * App embed status for a single theme extension block (e.g. product_detail_message -> product-detail-message.js).
 * Matches editor deep-link form: `appEmbed={client_id}/{blockHandle}` e.g. `1cdf.../product_detail_message`.
 * `type` in JSON may be `.../apps/{client_id}/blocks/{handle}/...` or `.../apps/{client_id}/{handle}/...`.
 */
const getThemeExtensionEnabled = async (
  admin: any,
  extensionHandle: string,
  /** Liquid filename base, e.g. product_detail_message for product_detail_message.liquid */
  blockHandle: string,
  /** SHOPIFY_API_KEY / app client id - required to match real storefront block types */
  appClientId: string,
  /** App display name from shopify.app.*.toml (will be normalized to slug for matching) */
  appName?: string,
): Promise<boolean> => {
  try {
    const response = await admin.graphql(
      `#graphql
        query MainThemeSettingsData {
          themes(first: 1, roles: [MAIN]) {
            edges {
              node {
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
    const content =
      json?.data?.themes?.edges?.[0]?.node?.files?.nodes?.[0]?.body?.content;

    if (!content || typeof content !== "string") {
      return false;
    }

    // Some themes may include comments in settings_data content.
    // Strip JS-style comments before JSON.parse for compatibility.
    const normalizedContent = content
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

    let settingsData;
    try {
      settingsData = JSON.parse(normalizedContent);
    } catch (e) {
      console.error("[theme-extension] failed to parse settings_data.json", e);
      return false;
    }
    const blockEntries: Array<Record<string, any>> = [];
    collectTypedBlocks(settingsData, blockEntries);

    const handleKebab = blockHandle.replace(/_/g, "-");
    const blockPathSegments = [
      `/blocks/${blockHandle}/`,
      `/blocks/${handleKebab}/`,
    ];

    const appNameSlug = String(appName || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

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

    const matchesEmbedFromEditorUrl = (blockType: string) => {
      if (!appClientId) return false;
      if (
        blockType.includes(`/apps/${appClientId}/${blockHandle}/`) ||
        blockType.includes(`/apps/${appClientId}/${handleKebab}/`)
      ) {
        return true;
      }
      return blockPathSegments.some((seg) => blockType.includes(seg));
    };

    for (const block of blockEntries) {
      const blockType = String(block?.type || "");
      const matchesBlock = matchesEmbedFromEditorUrl(blockType);
      if (!matchesBlock) continue;
      const matchedByApp = isOurAppBlock(blockType);
      if (!matchedByApp) {
        console.log("[theme-extension] skipped block from other app", {
          extensionHandle,
          blockHandle,
          appClientId,
          appName,
          appNameSlug,
          blockType,
        });
        continue;
      }
      const enabled = block?.disabled !== true;
      console.log("[theme-extension] matched embed block", {
        extensionHandle,
        blockHandle,
        appClientId,
        appNameSlug,
        blockType,
        matchedByApp,
        disabled: block?.disabled,
        enabled,
      });
      return enabled;
    }

    console.log("[theme-extension] no matched embed block", {
      extensionHandle,
      blockHandle,
      appClientId,
      appNameSlug,
      scannedBlockCount: blockEntries.length,
    });
  } catch (error) {
    console.error("Failed to read theme extension status", error);
  }

  return false;
};

async function getCurrentThemeExtensionEnabled(admin: any): Promise<boolean> {
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const appDisplayName = process.env.SHOPIFY_APP_NAME || process.env.APP_NAME;
  try {
    return await getThemeExtensionEnabled(
      admin,
      "bundlev2-theme-product-custom",
      "product_detail_message",
      apiKey,
      appDisplayName,
    );
  } catch (error) {
    console.error("Failed to check theme extension status", error);
    return false;
  }
}

async function syncBundleEnabledMetafield(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  themeExtensionEnabled: boolean,
): Promise<void> {
  try {
    const env = resolveBundleEnvironment();
    const envEnabledKey =
      env === "prod"
        ? BUNDLE_METAFIELD_ENABLED_PROD_KEY
        : BUNDLE_METAFIELD_ENABLED_TEST_KEY;
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
    };
    const shopId = shopIdJson?.data?.shop?.id;
    if (!shopId) return;

    await admin.graphql(
      `#graphql
      mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors {
            message
          }
        }
      }
    `,
      {
        variables: {
          metafields: [
            {
              ownerId: shopId,
              namespace: BUNDLE_METAFIELD_NAMESPACE,
              key: envEnabledKey,
              type: "json",
              value: JSON.stringify({
                enabled: themeExtensionEnabled,
                env,
                updatedAt: new Date().toISOString(),
              }),
            },
          ],
        },
      },
    );
  } catch (error) {
    console.error("Failed to sync bundle enabled metafield", error);
  }
}

/** Normalize offer name to a unique key */
function normalizeOfferNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

import { AppProvider } from "@shopify/shopify-app-react-router/react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Ensure web pixel exists
  void ensureWebPixel(admin, session.shop).catch((error) => {
    console.error("Failed to ensure web pixel exists", error);
  });
  void ensureCartLinesAutomaticDiscount(admin).catch((error) => {
    console.error("Failed to ensure automatic app discount exists", error);
  });

  // eslint-disable-next-line no-undef
  const apiKey = process.env.SHOPIFY_API_KEY || "";

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

  let themeExtensionEnabled = false;
  themeExtensionEnabled = await getCurrentThemeExtensionEnabled(admin);
  void syncBundleEnabledMetafield(admin, themeExtensionEnabled);
  void syncShopOffersMetafield(admin, session.shop, themeExtensionEnabled).catch((error) => {
    console.error("Failed to sync shop offers metafield in loader", error);
  });

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
    shop: session.shop,
    apiKey,
    ianaTimezone,
    themeExtensionEnabled,
    billingSubscriptions,
    billingTestMode: billingIsTestCharge(),
  } satisfies IndexLoaderData);
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
    const offerType = String(formData.get("offerType") || "").trim();
    const layoutFormatRaw = String(formData.get("layoutFormat") || "").trim();
    const layoutFormat = ["vertical", "horizontal", "card", "compact"].includes(
      layoutFormatRaw,
    )
      ? layoutFormatRaw
      : "vertical";
    const startTimeRaw = String(formData.get("startTime") || "").trim();
    const endTimeRaw = String(formData.get("endTime") || "").trim();
    const selectedProductsJson = String(
      formData.get("selectedProductsJson") || "",
    );
    const discountRulesJson = String(formData.get("discountRulesJson") || "");

    // Status is checked, defaults to false if not provided or explicitly 'false'
    const statusRaw = String(formData.get("status") || "");
    const status = statusRaw === "true";

    const totalBudgetRaw = formData.get("totalBudget");
    const dailyBudgetRaw = formData.get("dailyBudget");

    const customerSegments = formData.getAll("customerSegments") as string[];
    const markets = formData.getAll("markets") as string[];

    const usageLimitPerCustomer = String(
      formData.get("usageLimitPerCustomer") || "unlimited",
    );

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

    const offerSettingsJson = JSON.stringify({
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
      scheduleTimezone: scheduleTimezoneRaw || undefined,
    });

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
    if (!startTimeRaw || !endTimeRaw) {
      return offerActionErrorResponse("Start time and end time are required.", 400);
    }

    const startTime = new Date(startTimeRaw);
    const endTime = new Date(endTimeRaw);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return offerActionErrorResponse("Invalid start or end time format.", 400);
    }
    if (endTime.getTime() <= startTime.getTime()) {
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
      offerSettingsJson,
      selectedProductsJson: selectedProductsJson || null,
      discountRulesJson: discountRulesJson || null,
    };

    const url = new URL(request.url);

    if (intent === "create-offer") {
      try {
        await writeOfferWithRetry(() => prismaAny.offer.create({ data }));
        url.searchParams.set("toast", `create-success-${Date.now()}`);
      } catch (error: any) {
        if (
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
        if (
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

    const themeExtensionEnabled = await getCurrentThemeExtensionEnabled(admin);
    const syncResult = await syncShopOffersMetafield(
      admin,
      shopName,
      themeExtensionEnabled,
    );
    if (!syncResult.ok) {
      console.error("syncShopOffersMetafield failed after offer write", {
        shopName,
        message: syncResult.message,
      });
      return offerActionErrorResponse(
        `Failed to sync data: ${syncResult.message}`,
        502,
      );
    }

    invalidateShopOffersCache(shopName);

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

    // Sync metafield
    try {
      const shopNameToSync = updatedOffer?.shopName as string | undefined;
      if (shopNameToSync) {
        const themeExtensionEnabled = await getCurrentThemeExtensionEnabled(admin);
        const syncResult = await syncShopOffersMetafield(
          admin,
          shopNameToSync,
          themeExtensionEnabled,
        );
        if (!syncResult.ok) {
          console.error("Failed to sync offers metafield after toggle", {
            shopNameToSync,
            message: syncResult.message,
          });
        }
      }
    } catch (error) {
      console.error("Failed to sync offers metafield after toggle", error);
    }

    if (updatedOffer?.shopName) {
      invalidateShopOffersCache(String(updatedOffer.shopName));
    }

    return Response.json({ success: true, toast: `toggle-success-${Date.now()}` });
  }

  if (intent === "delete-offer") {
    const idRaw = String(formData.get("offerId") || "").trim();
    if (!idRaw) {
      return new Response("Missing offer id", { status: 400 });
    }

    const prismaAny: any = prisma;

    // Find shopName to sync metafield
    let shopNameToSync: string | undefined;
    try {
      const offerToDelete = await prismaAny.offer.findUnique({
        where: { id: idRaw },
      });
      shopNameToSync = offerToDelete?.shopName as string | undefined;

      await prismaAny.offer.delete({
        where: { id: idRaw },
      });
    } catch (error) {
      console.error("delete-offer failed", error);
      return offerActionErrorResponse("Delete offer failed.", 500);
    }

    // Sync metafield after deleting offer
    try {
      if (shopNameToSync) {
        const themeExtensionEnabled = await getCurrentThemeExtensionEnabled(admin);
        const syncResult = await syncShopOffersMetafield(
          admin,
          shopNameToSync,
          themeExtensionEnabled,
        );
        if (!syncResult.ok) {
          console.error("Failed to sync offers metafield after delete", {
            shopNameToSync,
            message: syncResult.message,
          });
        }
      }
    } catch (error) {
      console.error("Failed to sync offers metafield after delete", error);
    }

    if (shopNameToSync) {
      invalidateShopOffersCache(shopNameToSync);
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
    shop,
    apiKey,
    ianaTimezone,
    themeExtensionEnabled,
    billingSubscriptions,
    billingTestMode,
  } = useLoaderData() as IndexLoaderData;
  const actionData = useActionData() as { toast?: string } | undefined;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HomeTabKey>("dashboard");
  const [showCreateOffer, setShowCreateOffer] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [analyticsOfferId, setAnalyticsOfferId] = useState<string | null>(null);
  const offersFetcher = useFetcher<{ offers: OfferListItem[] }>();
  const storeProductsFetcher = useFetcher<{ storeProducts: StoreProductItem[] }>();
  const lastOffersRefreshToastRef = useRef<string | null>(null);

  const offers = offersFetcher.data?.offers ?? [];
  const storeProducts = storeProductsFetcher.data?.storeProducts ?? [];
  const isOffersLoading =
    !offersFetcher.data?.offers && offersFetcher.state !== "idle";
  const isStoreProductsLoading =
    (showCreateOffer || !!editingOfferId) &&
    !storeProductsFetcher.data?.storeProducts &&
    storeProductsFetcher.state !== "idle";

  const toast = searchParams.get("toast") || actionData?.toast;

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
    if (toast?.startsWith("create-success")) {
      setToastMessage("Offer created successfully");
      setShowCreateOffer(false);
      setEditingOfferId(null);
    } else if (toast?.startsWith("update-success")) {
      setToastMessage("Offer updated successfully");
      setShowCreateOffer(false);
      setEditingOfferId(null);
    } else if (toast?.startsWith("delete-success")) {
      setToastMessage("Offer deleted successfully");
      setShowCreateOffer(false);
      setEditingOfferId(null);
    } else if (toast?.startsWith("toggle-success")) {
      setToastMessage("Offer status updated successfully");
    } else {
      setToastMessage(null);
    }
  }, [toast]);

  useEffect(() => {
    if (!toast || !toastMessage) return;

    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      next.delete("toast");
      navigate(
        {
          search: next.toString() ? `?${next.toString()}` : "",
        },
        { replace: true },
      );
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
    const shouldLoadStoreProducts = showCreateOffer || !!editingOfferId;
    if (!shouldLoadStoreProducts) return;
    if (storeProductsFetcher.data?.storeProducts) return;
    if (storeProductsFetcher.state !== "idle") return;

    storeProductsFetcher.submit(
      { intent: "load-store-products" },
      { method: "post" },
    );
  }, [
    showCreateOffer,
    editingOfferId,
    storeProductsFetcher,
    storeProductsFetcher.data,
    storeProductsFetcher.state,
  ]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 max-w-[1280px] w-full mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px] relative">
          {toastMessage && (
          <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm !text-white px-4 py-2 rounded shadow-lg text-sm font-sans">
            {toastMessage}
          </div>
        )}
        {/* Tabs */}
        {!showCreateOffer && !editingOfferId && (
          <nav className="flex flex-col sm:flex-row gap-[8px] sm:gap-[16px] items-stretch sm:items-start pb-0 mb-[16px] sm:mb-[24px] border-b border-[#e3e8ed]">
            <button
              type="button"
              onClick={() => {
                setShowCreateOffer(false);
                setActiveTab("dashboard");
              }}
              className={`px-[16px] py-[12px] text-center sm:text-left cursor-pointer transition-all border-b-2 ${activeTab === "dashboard" ? "border-[#008060] text-[#1c1f23]" : "border-transparent hover:border-[#8c9196] text-[#5c6166]"}`}
            >
              <span
                className={`font-sans leading-[24px] text-[14px] font-medium tracking-normal ${activeTab === "dashboard" ? "text-[#1c1f23]" : "text-[#5c6166]"}`}
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
              className={`px-[16px] py-[12px] text-center sm:text-left cursor-pointer transition-all border-b-2 ${activeTab === "offers" ? "border-[#008060] text-[#1c1f23]" : "border-transparent hover:border-[#8c9196] text-[#5c6166]"}`}
            >
              <span
                className={`font-sans leading-[24px] text-[14px] font-medium tracking-normal ${activeTab === "offers" ? "text-[#1c1f23]" : "text-[#5c6166]"}`}
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
              className={`px-[16px] py-[12px] text-center sm:text-left cursor-pointer transition-all border-b-2 ${activeTab === "analytics" ? "border-[#008060] text-[#1c1f23]" : "border-transparent hover:border-[#8c9196] text-[#5c6166]"}`}
            >
              <span
                className={`font-sans leading-[24px] text-[14px] font-medium tracking-normal ${activeTab === "analytics" ? "text-[#1c1f23]" : "text-[#5c6166]"}`}
              >
                Analytics
              </span>
            </button>

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
            ianaTimezone={ianaTimezone}
            themeExtensionEnabled={themeExtensionEnabled}
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
            shop={shop}
            apiKey={apiKey}
            onCreateOffer={() => {
              setShowCreateOffer(true);
              setEditingOfferId(null);
            }}
            onEditOffer={(id) => {
              setEditingOfferId(id);
              setShowCreateOffer(false);
            }}
          />
        )}
        {(showCreateOffer || editingOfferId) &&
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
                setShowCreateOffer(false);
                setEditingOfferId(null);
              }}
              initialOffer={editingOfferId ? offers.find(o => o.id === editingOfferId) as any : undefined}
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
        <div className="py-8 text-center text-sm text-[#666] w-full">
          <a 
            href="mailto:support@ciwi.ai" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="mx-3 text-[#666] hover:text-[#008060] transition-colors"
          >
            Contact Us
          </a>
          |
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
