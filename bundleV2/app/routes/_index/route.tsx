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

function buildOfferMetafieldsInput(ownerId: string, offersPayload: string) {
  const env = resolveBundleEnvironment();
  const envOfferKey = `${BUNDLE_METAFIELD_BASE_KEY}-${env}`;
  const activeEnvPayload = JSON.stringify({
    env,
    updatedAt: new Date().toISOString(),
  });

  return [
    {
      ownerId,
      namespace: BUNDLE_METAFIELD_NAMESPACE,
      key: envOfferKey,
      type: "json",
      value: offersPayload,
    },
    {
      ownerId,
      namespace: BUNDLE_METAFIELD_NAMESPACE,
      key: BUNDLE_METAFIELD_ACTIVE_ENV_KEY,
      type: "json",
      value: activeEnvPayload,
    },
    // 兼容历史读路径，避免函数/主题未更新时出现空数据。
    {
      ownerId,
      namespace: BUNDLE_METAFIELD_NAMESPACE,
      key: BUNDLE_METAFIELD_BASE_KEY,
      type: "json",
      value: offersPayload,
    },
  ];
}

async function syncShopOffersMetafield(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  shopNameToSync: string,
): Promise<ShopOffersMetafieldSyncResult> {
  const prismaAny: any = prisma;
  try {
    const shopOffers = (await prismaAny.offer.findMany({
      where: { shopName: shopNameToSync },
      orderBy: { createdAt: "desc" },
    })) as OfferListItem[];

    const metafieldValue = JSON.stringify({
      updatedAt: new Date().toISOString(),
      offers: shopOffers,
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
      return {
        ok: false,
        message: shopIdJson.errors
          .map((e) => e.message || "unknown")
          .join("; "),
      };
    }

    const shopId = shopIdJson?.data?.shop?.id;
    if (!shopId) {
      return {
        ok: false,
        message: "Failed to get shop ID, Metafield update failed",
      };
    }

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
          metafields: buildOfferMetafieldsInput(shopId, metafieldValue),
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
      return {
        ok: false,
        message: metafieldsSetJson.errors
          .map((e) => e.message || "unknown")
          .join("; "),
      };
    }

    const userErrors = metafieldsSetJson?.data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      return {
        ok: false,
        message: userErrors.map((e) => e.message || "unknown").join("; "),
      };
    }

    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, message: msg || "Metafield sync failed" };
  }
}

export type StoreProductItem = {
  id: string;
  name: string;
  price: string;
  image: string;
};

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

async function fetchStoreProducts(admin: any): Promise<StoreProductItem[]> {
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
                featuredImage {
                  url
                }
                variants(first: 1) {
                  edges {
                    node {
                      price
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
          node?: {
            id?: string;
            title?: string;
            featuredImage?: { url?: string | null } | null;
            variants?: {
              edges?: Array<{ node?: { price?: string | null } | null }>;
            } | null;
          } | null;
        }>
      | undefined) ?? [];

  return productEdges
    .map((edge) => {
      const node = edge?.node;
      const priceRaw = node?.variants?.edges?.[0]?.node?.price;
      const image = node?.featuredImage?.url;
      if (!node?.id || !node.title) {
        return null;
      }
      return {
        id: node.id,
        name: node.title,
        price: priceRaw ? `$${priceRaw}` : "$0.00",
        image: image || "https://via.placeholder.com/60",
      };
    })
    .filter((item): item is StoreProductItem => item !== null);
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

  // product_detail_message.liquid -> product-detail-message.js
  // eslint-disable-next-line no-undef
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const appDisplayName = process.env.SHOPIFY_APP_NAME || process.env.APP_NAME;

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
  try {
    themeExtensionEnabled = await getThemeExtensionEnabled(
      admin,
      "bundlev2-theme-product-custom",
      "product_detail_message",
      apiKey,
      appDisplayName,
    );
  } catch (error) {
    console.error("Failed to check theme extension status", error);
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
    const storeProducts = await fetchStoreProducts(admin);
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

    if (selectedProductsJson.length > 50_000) {
      return offerActionErrorResponse("Selected products data is too large. Please reduce the number of products.", 400);
    }
    if (discountRulesJson.length > 50_000) {
      return offerActionErrorResponse("Discount rules data is too large. Please reduce the number of rules.", 400);
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

    const syncResult = await syncShopOffersMetafield(admin, shopName);
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
        const syncResult = await syncShopOffersMetafield(admin, shopNameToSync);
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
        const syncResult = await syncShopOffersMetafield(admin, shopNameToSync);
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
      <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px] relative">
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
            onViewAnalytics={() => setActiveTab("analytics")}
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
          <AnalyticsPage shop={shop} offers={offers} />
        )}
        {activeTab === "pricing" && (
          <PricingPage
            activeSubscriptions={billingSubscriptions}
            billingTestMode={billingTestMode}
          />
        )}
      </div>
    </AppProvider>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
