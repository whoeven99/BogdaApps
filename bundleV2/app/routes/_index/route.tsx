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
  pricingOption: string;
  layoutFormat: string;
  startTime: string;
  endTime: string;
  totalBudget: number | null;
  dailyBudget: number | null;
  customerSegments: string | null;
  markets: string | null;
  usageLimitPerCustomer: string;
  status: boolean;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
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
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

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

  return Response.json({ offers, storeProducts } satisfies IndexLoaderData);
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  let intent = formData.get("intent");
  const prismaAny: any = prisma;

  console.log("action intent", intent);

  // 兼容 fallback：如果没有显式 intent，但有 offerId，则视为更新，否则视为创建
  if (!intent) {
    const hasId = formData.get("offerId");
    intent = hasId ? "update-offer" : "create-offer";
  }

  if (intent === "create-offer" || intent === "update-offer") {
    const idRaw = String(formData.get("offerId") || "").trim();
    const name = String(formData.get("name") || "").trim();
    const offerType = String(formData.get("offerType") || "").trim();
    const pricingOption = String(formData.get("pricingOption") || "").trim() || "duo";
    const layoutFormat = String(formData.get("layoutFormat") || "").trim() || "vertical";
    const startTimeRaw = String(formData.get("startTime") || "");
    const endTimeRaw = String(formData.get("endTime") || "");
    const selectedProductsJson = String(formData.get("selectedProductsJson") || "");
    const discountRulesJson = String(formData.get("discountRulesJson") || "");

    const totalBudget = formData.get("totalBudget");
    const dailyBudget = formData.get("dailyBudget");

    const customerSegments = formData.getAll("customerSegments") as string[];
    const markets = formData.getAll("markets") as string[];

    if (!name || !startTimeRaw || !endTimeRaw) {
      return new Response("Missing required fields", { status: 400 });
    }

    const startTime = new Date(startTimeRaw);
    const endTime = new Date(endTimeRaw);

    const data = {
      name,
      offerType,
      pricingOption,
      layoutFormat,
      startTime,
      endTime,
      totalBudget: totalBudget ? Number(totalBudget) : null,
      dailyBudget: dailyBudget ? Number(dailyBudget) : null,
      customerSegments: customerSegments.length
        ? customerSegments.join(",")
        : null,
      markets: markets.length ? markets.join(",") : null,
      usageLimitPerCustomer: String(
        formData.get("usageLimitPerCustomer") || "unlimited",
      ),
      selectedProductsJson: selectedProductsJson || null,
      discountRulesJson: discountRulesJson || null,
    };

    const url = new URL(request.url);

    if (intent === "create-offer") {
      await prismaAny.offer.create({ data });
      url.searchParams.set("toast", "create-success");
    } else {
      if (!idRaw) {
        return new Response("Missing offer id", { status: 400 });
      }
      await prismaAny.offer.update({
        where: { id: idRaw },
        data,
      });
      url.searchParams.set("toast", "update-success");
    }

    // Prisma 写入成功后，同步全部 offers 到 shop metafield
    try {
      // 1. 重新查询全部 offers 列表
      const allOffers = (await prismaAny.offer.findMany({
        orderBy: { createdAt: "desc" },
      })) as OfferListItem[];

      const metafieldValue = JSON.stringify({
        updatedAt: new Date().toISOString(),
        offers: allOffers,
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
        console.error("Failed to resolve shop id for metafield sync", shopIdJson);
      } else {
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
      }
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

    await prismaAny.offer.update({
      where: { id: idRaw },
      data: { status: nextStatus },
    });

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
    await prismaAny.offer.delete({
      where: { id: idRaw },
    });

    const url = new URL(request.url);
    url.searchParams.set("toast", "delete-success");

    return redirect(url.pathname + "?" + url.searchParams.toString());
  }

  return new Response(null, { status: 200 });
};

type HomeTabKey = "dashboard" | "offers" | "pricing";

export default function Index() {
  const { offers, storeProducts } = useLoaderData() as IndexLoaderData;
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
