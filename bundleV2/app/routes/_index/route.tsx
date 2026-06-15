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
import { authenticate } from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { DashboardPage } from "../page/DashboardPage";
import { AllOffersPage } from "../page/AllOffersPage";
import { AnalyticsPage } from "../page/AnalyticsPage";
import { CreateNewOffer } from "../component/CreateNewOffer/CreateNewOffer";
import { OfferTypeSelection } from "../component/CreateNewOffer/OfferTypeSelection";
import { sanitizeEnvLikeValue } from "../../utils/env";
import { fetchThemeEditorTargets, getCurrentThemeExtensionEnabled } from "../../server/shopify/theme.server";
import { getCachedShopOffers } from "../../shopOffersCache.server";
import { syncShopOffersMetafieldIfStale } from "../../server/offers/offerSync.server";
import { handleLoadOffers } from "./actions/loadOffers.server";
import { handleLoadStoreProducts } from "./actions/loadStoreProducts.server";
import { handleGetProductSubscription } from "./actions/getProductSubscription.server";
import { handleCreateOrUpdateOffer } from "./actions/offerWrite.server";
import { handleToggleOfferStatus } from "./actions/offerToggle.server";
import { handleDeleteOffer } from "./actions/offerDelete.server";
import type { IndexLoaderData, OfferListItem } from "./types";
import type { OfferTypeId } from "../component/CreateNewOffer/offerTypeOptions";
import type { StoreProductItem } from "../../server/shopify/products.server";
export type { StoreProductItem } from "../../server/shopify/products.server";
export type { MarketItem, IndexLoaderData } from "./types";
export type { ThemeEditorTarget, ThemeExtensionDetectionDebug } from "../../server/shopify/theme.server";

// ─── Loader ────────────────────────────────────────────────────────────────────

type LoaderAdmin = Parameters<typeof fetchThemeEditorTargets>[0];

async function fetchShopTimezone(admin: LoaderAdmin): Promise<string> {
  try {
    const tzResponse = await admin.graphql(
      `#graphql
        query ShopTimezone {
          shop { ianaTimezone }
        }
      `,
    );
    const tzJson = (await tzResponse.json()) as { data?: { shop?: { ianaTimezone?: string } } };
    if (tzJson?.data?.shop?.ianaTimezone) return tzJson.data.shop.ianaTimezone;
  } catch (error) {
    console.error("Failed to fetch shop timezone", error);
  }
  return "UTC";
}

async function fetchShopMarkets(admin: LoaderAdmin): Promise<IndexLoaderData["markets"]> {
  try {
    const marketsResponse = await admin.graphql(
      `#graphql
        query ShopMarkets {
          markets(first: 250) {
            edges { node { id name handle } }
          }
        }
      `,
    );
    const marketsJson = (await marketsResponse.json()) as {
      data?: { markets?: { edges?: Array<{ node?: { id?: string; name?: string; handle?: string } }> } };
    };
    return (marketsJson?.data?.markets?.edges ?? [])
      .map((edge) => edge.node)
      .filter((n): n is NonNullable<typeof n> => Boolean(n?.id))
      .map((n) => ({ id: n.id!, name: n.name ?? "", handle: n.handle ?? "" }));
  } catch (error) {
    console.error("Failed to fetch shop markets", error);
    return [];
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const apiKey = sanitizeEnvLikeValue(process.env.SHOPIFY_API_KEY);

  // 这些请求彼此无依赖，并行发出（原来逐个 await，loader 时延 = 多次串行往返）。
  const [ianaTimezone, themeExtensionDetection, themeTargets, syncResult, markets] =
    await Promise.all([
      fetchShopTimezone(admin),
      getCurrentThemeExtensionEnabled(admin),
      fetchThemeEditorTargets(admin),
      // 仅在 offer 数据自上次写入后有变化（或到周期性自愈窗口）时才真正重写 metafield。
      syncShopOffersMetafieldIfStale(admin, session.shop, { trigger: "loader" }),
      fetchShopMarkets(admin),
    ]);

  if (!syncResult.ok) {
    console.error("Failed to sync shop offers metafield in loader", {
      shopName: session.shop,
      message: syncResult.message,
      step: syncResult.step,
    });
  }

  const themeExtensionEnabled = themeExtensionDetection.enabled;
  const themeExtensionDetectionFailed = Boolean(themeExtensionDetection.debug?.error);
  const themeEditorStoreId = String(session.shop || "")
    .trim()
    .replace(/\.myshopify\.com$/i, "");
  const themeEditorThemeId =
    String(
      themeExtensionDetection.debug?.matchedTheme?.id ||
        themeExtensionDetection.debug?.themes?.[0]?.id ||
        "",
    )
      .split("/")
      .filter(Boolean)
      .pop() ?? "";

  return Response.json({
    markets,
    themeTargets,
    shop: session.shop,
    themeEditorStoreId,
    themeEditorThemeId,
    apiKey,
    ianaTimezone,
    themeExtensionEnabled,
    themeExtensionDetectionFailed,
    themeExtensionDebug: themeExtensionDetection.debug,
    themeExtensionMatchedThemeId: themeExtensionDetection.debug?.matchedTheme?.id,
  } satisfies IndexLoaderData);
};

// ─── Revalidation ──────────────────────────────────────────────────────────────

const SKIP_REVALIDATE_INTENTS = new Set([
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
  if (SKIP_REVALIDATE_INTENTS.has(intent)) return false;
  return defaultShouldRevalidate;
};

// ─── Action ────────────────────────────────────────────────────────────────────

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  let intent = String(formData.get("intent") || "").trim();

  if (!intent) {
    intent = formData.get("offerId") ? "update-offer" : "create-offer";
  }

  console.log("action intent", intent);

  if (intent === "load-offers") {
    return handleLoadOffers(session.shop);
  }

  if (intent === "load-store-products") {
    const offers = (await getCachedShopOffers(session.shop)) as OfferListItem[];
    return handleLoadStoreProducts(admin, offers);
  }

  if (intent === "get-product-subscription-status") {
    const productId = String(formData.get("productId") || "").trim();
    return handleGetProductSubscription(admin, productId);
  }

  if (intent === "create-offer" || intent === "update-offer") {
    return handleCreateOrUpdateOffer(admin, session, formData, intent);
  }

  if (intent === "toggle-offer-status") {
    return handleToggleOfferStatus(admin, session, formData);
  }

  if (intent === "delete-offer") {
    return handleDeleteOffer(admin, session, formData);
  }

  return new Response(`Unknown intent: ${intent}`, { status: 400 });
};

// ─── UI Component ──────────────────────────────────────────────────────────────

type HomeTabKey = "dashboard" | "offers" | "analytics";

export default function Index() {
  const {
    markets,
    themeTargets,
    shop,
    themeEditorStoreId,
    themeEditorThemeId,
    apiKey,
    ianaTimezone,
    themeExtensionEnabled,
    themeExtensionDetectionFailed,
    themeExtensionDebug,
    themeExtensionMatchedThemeId,
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
  const isOffersLoading = !offersFetcher.data?.offers && offersFetcher.state !== "idle";
  const shouldShowOfferBuilder = Boolean(editingOfferId || (showCreateOffer && createOfferType));
  const toast =
    searchParams.get("toast") ||
    (actionData && "toast" in actionData ? actionData.toast : undefined);

  const handleOfferSaveSuccess = (mode: "create" | "update") => {
    setToastMessage(mode === "create" ? "Offer created successfully" : "Offer updated successfully");
    setActiveTab("offers");
    setShowCreateOffer(false);
    setCreateOfferType(null);
    setEditingOfferId(null);
    if (offersFetcher.state === "idle") {
      offersFetcher.submit({ intent: "load-offers" }, { method: "post" });
    }
  };

  // Handle toast and post-save navigation
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

  // Auto-dismiss toast and clear query param
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      if (toast) {
        const next = new URLSearchParams(searchParams);
        next.delete("toast");
        navigate({ search: next.toString() ? `?${next.toString()}` : "" }, { replace: true });
      }
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast, toastMessage, navigate, searchParams]);

  // Initial offers load
  useEffect(() => {
    if (offersFetcher.data?.offers) return;
    if (offersFetcher.state !== "idle") return;
    offersFetcher.submit({ intent: "load-offers" }, { method: "post" });
  }, [offersFetcher, offersFetcher.data, offersFetcher.state]);

  // Refresh offers after mutations
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

  // Load store products when offer builder opens
  useEffect(() => {
    if (!shouldShowOfferBuilder) return;
    if (storeProductsFetcher.data?.storeProducts) return;
    if (storeProductsFetcher.state !== "idle") return;
    storeProductsFetcher.submit({ intent: "load-store-products" }, { method: "post" });
  }, [shouldShowOfferBuilder, storeProductsFetcher, storeProductsFetcher.data, storeProductsFetcher.state]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <div className="flex flex-col min-h-screen">
        <div className="flex-1 max-w-[1280px] w-full mx-auto px-[16px] sm:px-[24px] pt-[12px] sm:pt-[16px] relative">
          {toastMessage && (
            <div className="fixed z-50 top-4 left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm !text-white px-4 py-2 rounded shadow-lg text-sm font-sans">
              {toastMessage}
            </div>
          )}

          {/* Tab navigation */}
          {!showCreateOffer && !editingOfferId && (
            <nav className="mb-[12px] sm:mb-[16px] overflow-x-auto">
              <div className="inline-flex min-w-max gap-[6px] rounded-[10px] border border-[#e5e7eb] bg-white p-[4px]">
                {(
                  [
                    { key: "dashboard", label: "Dashboard" },
                    { key: "offers", label: "All Offers" },
                    { key: "analytics", label: "Analytics" },
                  ] as { key: HomeTabKey; label: string }[]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setShowCreateOffer(false);
                      setActiveTab(key);
                    }}
                    className={`rounded-[8px] px-[12px] py-[8px] text-center cursor-pointer transition-all ${
                      activeTab === key
                        ? "bg-[#f6f6f7] text-[#1c1f23]"
                        : "text-[#5c6166] hover:bg-[#f6f6f7] hover:text-[#1c1f23]"
                    }`}
                  >
                    <span
                      className={`font-sans leading-[20px] text-[13px] font-medium tracking-normal ${
                        activeTab === key ? "text-[#1c1f23]" : "text-[#5c6166]"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                ))}
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
              themeEditorStoreId={themeEditorStoreId}
              themeEditorThemeId={themeEditorThemeId}
              apiKey={apiKey}
              themeTargets={themeTargets}
              themeExtensionMatchedThemeId={themeExtensionMatchedThemeId}
              ianaTimezone={ianaTimezone}
              themeExtensionEnabled={themeExtensionEnabled}
              themeExtensionDetectionFailed={themeExtensionDetectionFailed}
              themeExtensionError={themeExtensionDebug?.error}
              onViewAllOffers={() => setActiveTab("offers")}
              onViewAnalytics={(offerId) => {
                setAnalyticsOfferId(offerId ?? null);
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
              shop={shop}
              ianaTimezone={ianaTimezone}
              themeExtensionEnabled={themeExtensionEnabled}
              themeExtensionDetectionFailed={themeExtensionDetectionFailed}
              themeEditorStoreId={themeEditorStoreId}
              themeEditorThemeId={themeEditorThemeId}
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
              onSelect={(offerType) => setCreateOfferType(offerType)}
            />
          )}
          {(shouldShowOfferBuilder || editingOfferId) && (
              <CreateNewOffer
                onBack={() => {
                  if (editingOfferId) {
                    setShowCreateOffer(false);
                    setEditingOfferId(null);
                    return;
                  }
                  setCreateOfferType(null);
                }}
                onSaveSuccess={handleOfferSaveSuccess}
                initialOffer={
                  editingOfferId
                    ? (offers.find((o) => o.id === editingOfferId) as OfferListItem | undefined)
                    : undefined
                }
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
          )}
          {activeTab === "analytics" && (
            <AnalyticsPage shop={shop} offers={offers} defaultOfferId={analyticsOfferId} />
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
