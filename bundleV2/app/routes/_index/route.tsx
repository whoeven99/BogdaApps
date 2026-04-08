import { useEffect, useState } from "react";
import {
  useLoaderData,
  useNavigate,
  useSearchParams,
  type ActionFunctionArgs,
  type HeadersFunction,
  type LoaderFunctionArgs,
} from "react-router";
import { redirect } from "react-router";
import { authenticate } from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DashboardPage } from "../DashboardPage";
import { AllOffersPage } from "../AllOffersPage";
import { PricingPage } from "../PricingPage";
import { CreateNewOffer } from "../component/CreateNewOffer";
import prisma from "../../db.server";

type OfferListItem = {
  id: string;
  name: string;
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
};

export type StoreProductItem = {
  id: string;
  name: string;
  price: string;
  image: string;
};

export type IndexLoaderData = {
  offers: OfferListItem[];
  storeProducts: StoreProductItem[];
  shop: string;
  apiKey: string;
  themeExtensionEnabled: boolean;
};

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
const collectTypedBlocks = (node: unknown, out: Array<Record<string, any>>): void => {
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
 * App embed status for a single theme extension block (e.g. product_detail_message → product-detail-message.js).
 * Matches editor deep-link form: `appEmbed={client_id}/{blockHandle}` e.g. `1cdf.../product_detail_message`.
 * `type` in JSON may be `.../apps/{client_id}/blocks/{handle}/...` or `.../apps/{client_id}/{handle}/...`.
 */
const getThemeExtensionEnabled = async (
  admin: any,
  extensionHandle: string,
  /** Liquid filename base, e.g. product_detail_message for product_detail_message.liquid */
  blockHandle: string,
  /** SHOPIFY_API_KEY / app client id — required to match real storefront block types */
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
    const settingsData = JSON.parse(normalizedContent);
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
      if (appClientId && blockType.includes(`/apps/${appClientId}/`)) return true;
      if (extensionHandle && blockType.includes(`/apps/${extensionHandle}/`))
        return true;
      if (appNameSlug && blockType.includes(`/apps/${appNameSlug}/`)) return true;
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

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  try {
    await ensureWebPixel(admin, session.shop);
  } catch (error) {
    console.error("Failed to ensure web pixel exists", error);
  }

  const prismaAny: any = prisma;
  const prismaOffers = await prismaAny.offer.findMany({
    orderBy: { createdAt: "desc" },
  });

  const offers = prismaOffers as OfferListItem[];

  const productsResponse = await admin.graphql(
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
  const productsJson = await productsResponse.json();
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

  const storeProducts: StoreProductItem[] = productEdges
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
        price: priceRaw ? `€${priceRaw}` : "€0.00",
        image: image || "https://via.placeholder.com/60",
      };
    })
    .filter((item): item is StoreProductItem => item !== null);

  // product_detail_message.liquid → product-detail-message.js
  // eslint-disable-next-line no-undef
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  const appDisplayName =
    process.env.SHOPIFY_APP_NAME || process.env.APP_NAME || "Ciwi:bundlev2(Test)";
  const themeExtensionEnabled = await getThemeExtensionEnabled(
    admin,
    "bundlev2-theme-product-custom",
    "product_detail_message",
    apiKey,
    appDisplayName,
  );

  return Response.json({
    offers,
    storeProducts,
    shop: session.shop,
    themeExtensionEnabled,
    apiKey,
  } satisfies IndexLoaderData);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  let intent = formData.get("intent");
  const prismaAny: any = prisma;

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

  // 兼容 fallback：如果没有显式 intent，但有 offerId，则视为更新，否则视为创建
  if (!intent) {
    const hasId = formData.get("offerId");
    intent = hasId ? "update-offer" : "create-offer";
  }

  if (intent === "create-offer" || intent === "update-offer") {
    const idRaw = String(formData.get("offerId") || "").trim();
    const nameRaw = String(formData.get("name") || "");
    const name = nameRaw.trim();
    const offerType = String(formData.get("offerType") || "").trim();
    const layoutFormat = String(formData.get("layoutFormat") || "")
      .trim() || "vertical";
    const startTimeRaw = String(formData.get("startTime") || "");
    const endTimeRaw = String(formData.get("endTime") || "");
    const selectedProductsJson = String(formData.get("selectedProductsJson") || "");
    const discountRulesJson = String(formData.get("discountRulesJson") || "");

    const totalBudget = formData.get("totalBudget");
    const dailyBudget = formData.get("dailyBudget");

    const customerSegments = formData.getAll("customerSegments") as string[];
    const markets = formData.getAll("markets") as string[];

    const usageLimitPerCustomer = String(
      formData.get("usageLimitPerCustomer") || "unlimited",
    );

    const offerSettingsJson = JSON.stringify({
      layoutFormat,
      totalBudget: totalBudget ? Number(totalBudget) : null,
      dailyBudget: dailyBudget ? Number(dailyBudget) : null,
      customerSegments: customerSegments.length
        ? customerSegments.join(",")
        : null,
      markets: markets.length ? markets.join(",") : null,
      usageLimitPerCustomer,
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
      return new Response("Offer name is required", { status: 400 });
    }
    if (!startTimeRaw || !endTimeRaw) {
      return new Response("Missing required schedule fields", { status: 400 });
    }

    const startTime = new Date(startTimeRaw);
    const endTime = new Date(endTimeRaw);

    const data = {
      shopName,
      // 保留中间空格（validation 用 trim 后的 name）
      name: nameRaw,
      offerType,
      startTime,
      endTime,
      offerSettingsJson,
      selectedProductsJson: selectedProductsJson || null,
      discountRulesJson: discountRulesJson || null,
    };

    const url = new URL(request.url);

    if (intent === "create-offer") {
      try {
        await writeOfferWithRetry(() => prismaAny.offer.create({ data }));
        url.searchParams.set("toast", "create-success");
      } catch (error) {
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
        return new Response("Offer create failed (see server logs).", {
          status: 500,
        });
      }
    } else {
      if (!idRaw) {
        return new Response("Missing offer id", { status: 400 });
      }
      try {
        await writeOfferWithRetry(() =>
          prismaAny.offer.update({
            where: { id: idRaw },
            data,
          }),
        );
        url.searchParams.set("toast", "update-success");
      } catch (error) {
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
        return new Response("Offer update failed (see server logs).", {
          status: 500,
        });
      }
    }

    // Prisma 写入成功后，同步当前 shop 的 offers 到 shop metafield
    try {
      const syncOffersMetafield = async (shopNameToSync: string) => {
        // 1. 只查询当前 shopName 下的 offers
        const shopOffers = (await prismaAny.offer.findMany({
          where: { shopName: shopNameToSync },
          orderBy: { createdAt: "desc" },
        })) as OfferListItem[];

        const metafieldValue = JSON.stringify({
          updatedAt: new Date().toISOString(),
          offers: shopOffers,
        });

        // 2. 查询当前 shop 的 GID
        const shopIdResponse = await admin.graphql(
          `#graphql
          query ShopId {
            shop {
              id
            }
          }
        `,
        );

        const shopIdJson = await shopIdResponse.json();
        const shopId = shopIdJson?.data?.shop?.id as string | undefined;

        if (!shopId) {
          console.error(
            "Failed to resolve shop id for metafield sync",
            shopIdJson,
          );
          return;
        }

        // 3. 写入 shop metafield：namespace=ciwi_bundle, key=ciwi-bundle-offers
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
              metafields: [
                {
                  ownerId: shopId,
                  namespace: "ciwi_bundle",
                  key: "ciwi-bundle-offers",
                  type: "json",
                  value: metafieldValue,
                },
              ],
            },
          },
        );

        const metafieldsSetJson = await metafieldsSetResponse.json();
        const userErrors =
          metafieldsSetJson?.data?.metafieldsSet?.userErrors || [];

        if (userErrors.length > 0) {
          console.error("metafieldsSet userErrors", userErrors);
        }
      };

      await syncOffersMetafield(shopName);
    } catch (error) {
      console.error("Failed to sync offers metafield", error);
    }

    return redirect(url.pathname + "?" + url.searchParams.toString());
  }

  if (intent === "toggle-offer-status") {
    const idRaw = String(formData.get("offerId") || "").trim();
    const nextStatusRaw = String(formData.get("nextStatus") || "").trim();

    if (!idRaw) {
      return new Response("Missing offer id", { status: 400 });
    }

    const nextStatus = nextStatusRaw === "true";

    const updatedOffer = await prismaAny.offer.update({
      where: { id: idRaw },
      data: { status: nextStatus },
    });

    // 同步 metafield，保证前端/扩展端实时生效
    try {
      const shopNameToSync = updatedOffer?.shopName as string | undefined;
      if (shopNameToSync) {
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

        const shopIdJson = await shopIdResponse.json();
        const shopId = shopIdJson?.data?.shop?.id as string | undefined;

        if (shopId) {
          await admin.graphql(
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
                metafields: [
                  {
                    ownerId: shopId,
                    namespace: "ciwi_bundle",
                    key: "ciwi-bundle-offers",
                    type: "json",
                    value: metafieldValue,
                  },
                ],
              },
            },
          );
        }
      }
    } catch (error) {
      console.error("Failed to sync offers metafield after toggle", error);
    }

    const url = new URL(request.url);
    url.searchParams.set("toast", "toggle-success");

    return redirect(url.pathname + "?" + url.searchParams.toString());
  }

  if (intent === "delete-offer") {
    const idRaw = String(formData.get("offerId") || "").trim();
    if (!idRaw) {
      return new Response("Missing offer id", { status: 400 });
    }

    const prismaAny: any = prisma;

    // 删除前先拿到 shopName（用于同步 metafield）
    const offerToDelete = await prismaAny.offer.findUnique({
      where: { id: idRaw },
    });
    const shopNameToSync = offerToDelete?.shopName as string | undefined;

    await prismaAny.offer.delete({
      where: { id: idRaw },
    });

    // 同步 metafield，保证扩展端不再使用已删除 offer
    try {
      if (shopNameToSync) {
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

        const shopIdJson = await shopIdResponse.json();
        const shopId = shopIdJson?.data?.shop?.id as string | undefined;

        if (shopId) {
          await admin.graphql(
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
                metafields: [
                  {
                    ownerId: shopId,
                    namespace: "ciwi_bundle",
                    key: "ciwi-bundle-offers",
                    type: "json",
                    value: metafieldValue,
                  },
                ],
              },
            },
          );
        }
      }
    } catch (error) {
      console.error("Failed to sync offers metafield after delete", error);
    }

    const url = new URL(request.url);
    url.searchParams.set("toast", "delete-success");

    return redirect(url.pathname + "?" + url.searchParams.toString());
  }

  return new Response(`Unknown intent: ${String(intent || "")}`, {
    status: 400,
  });
};

type HomeTabKey = "dashboard" | "offers" | "pricing";

export default function Index() {
  const { offers, storeProducts, shop, apiKey, themeExtensionEnabled } =
    useLoaderData() as IndexLoaderData;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<HomeTabKey>("dashboard");
  const [showCreateOffer, setShowCreateOffer] = useState(false);

  const toast = searchParams.get("toast");

  useEffect(() => {
    if (toast === "create-success") {
      setToastMessage("Offer 创建成功");
      setShowCreateOffer(false);
      setActiveTab("dashboard");
    } else if (toast === "update-success") {
      setToastMessage("Offer 更新成功");
      setShowCreateOffer(false);
      setActiveTab("dashboard");
    } else if (toast === "delete-success") {
      setToastMessage("Offer 删除成功");
      setShowCreateOffer(false);
      setActiveTab("dashboard");
    } else if (toast === "toggle-success") {
      setToastMessage("Offer 状态已更新");
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

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px] relative">
      {toastMessage && (
        <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2 bg-[#108043] text-white px-4 py-2 rounded shadow-lg text-sm font-['Inter']">
          {toastMessage}
        </div>
      )}
      {/* Tabs */}
      <nav className="bg-white flex flex-col sm:flex-row gap-[8px] sm:gap-[16px] items-stretch sm:items-start pb-0 px-[16px] pt-[16px] rounded-[8px] mb-[16px] sm:mb-[24px]">
        <button
          type="button"
          onClick={() => {
            setShowCreateOffer(false);
            setActiveTab("dashboard");
          }}
          className={`rounded-[4px] px-[12px] py-[7px] text-center sm:text-left cursor-pointer bg-transparent ${
            activeTab === "dashboard" ? "bg-[#dfe3e8]" : ""
          }`}
        >
          <span
            className={`font-['Inter'] leading-[25.6px] text-[16px] tracking-[-0.3125px] ${
              activeTab === "dashboard"
                ? "font-semibold text-[#202223]"
                : "font-normal text-[#6d7175]"
            }`}
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
          className={`rounded-[4px] px-[12px] py-[7px] text-center sm:text-left cursor-pointer bg-transparent ${
            activeTab === "offers" ? "bg-[#dfe3e8]" : ""
          }`}
        >
          <span
            className={`font-['Inter'] leading-[25.6px] text-[16px] tracking-[-0.3125px] ${
              activeTab === "offers"
                ? "font-semibold text-[#202223]"
                : "font-normal text-[#6d7175]"
            }`}
          >
            All Offers
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowCreateOffer(false);
            setActiveTab("pricing");
          }}
          className={`rounded-[4px] px-[12px] py-[7px] text-center sm:text-left cursor-pointer bg-transparent ${
            activeTab === "pricing" ? "bg-[#dfe3e8]" : ""
          }`}
        >
          <span
            className={`font-['Inter'] leading-[25.6px] text-[16px] tracking-[-0.3125px] ${
              activeTab === "pricing"
                ? "font-semibold text-[#202223]"
                : "font-normal text-[#6d7175]"
            }`}
          >
            Pricing
          </span>
        </button>
      </nav>

      {/* Tab content */}
      {activeTab === "dashboard" && (
        <DashboardPage
          offers={offers}
          storeProducts={storeProducts}
          shop={shop}
          apiKey={apiKey}
          themeExtensionEnabled={themeExtensionEnabled}
          onViewAllOffers={() => setActiveTab("offers")}
        />
      )}
      {activeTab === "offers" && !showCreateOffer && (
        <AllOffersPage
          offers={offers}
          onCreateOffer={() => setShowCreateOffer(true)}
        />
      )}
      {activeTab === "offers" && showCreateOffer && (
        <CreateNewOffer
          onBack={() => setShowCreateOffer(false)}
          storeProducts={storeProducts}
        />
      )}
      {activeTab === "pricing" && <PricingPage />}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
