import { useState } from "react";
import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DashboardPage } from "../DashboardPage";
import { AllOffersPage } from "../AllOffersPage";
import { PricingPage } from "../PricingPage";
import { CreateNewOffer } from "../component/CreateNewOffer";
import prisma from "../../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  console.log("action intent", intent);

  if (intent === "create-offer") {
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

    await prisma.offer.create({
      data: {
        name,
        offerType,
        pricingOption,
        layoutFormat,
        startTime,
        endTime,
        totalBudget: totalBudget ? Number(totalBudget) : null,
        dailyBudget: dailyBudget ? Number(dailyBudget) : null,
        customerSegments: customerSegments.length ? customerSegments.join(",") : null,
        markets: markets.length ? markets.join(",") : null,
        usageLimitPerCustomer: String(formData.get("usageLimitPerCustomer") || "unlimited"),
        selectedProductsJson: selectedProductsJson || null,
        discountRulesJson: discountRulesJson || null,
      },
    });

    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 200 });
};

type HomeTabKey = "dashboard" | "offers" | "pricing";

export default function Index() {
  const [activeTab, setActiveTab] = useState<HomeTabKey>("dashboard");
  const [showCreateOffer, setShowCreateOffer] = useState(false);

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
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
        <DashboardPage onViewAllOffers={() => setActiveTab("offers")} />
      )}
      {activeTab === "offers" && !showCreateOffer && (
        <AllOffersPage onCreateOffer={() => setShowCreateOffer(true)} />
      )}
      {activeTab === "offers" && showCreateOffer && (
        <CreateNewOffer onBack={() => setShowCreateOffer(false)} />
      )}
      {activeTab === "pricing" && <PricingPage />}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
