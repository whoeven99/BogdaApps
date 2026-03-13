import { useState } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { authenticate } from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { DashboardPage } from "../DashboardPage";
import { AllOffersPage } from "../AllOffersPage";
import { PricingPage } from "../PricingPage";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

type HomeTabKey = "dashboard" | "offers" | "pricing";

export default function Index() {
  const [activeTab, setActiveTab] = useState<HomeTabKey>("dashboard");

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* Tabs */}
      <nav className="bg-white flex flex-col sm:flex-row gap-[8px] sm:gap-[16px] items-stretch sm:items-start pb-0 px-[16px] pt-[16px] rounded-[8px] mb-[16px] sm:mb-[24px]">
        <button
          type="button"
          onClick={() => setActiveTab("dashboard")}
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
          onClick={() => setActiveTab("offers")}
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
          onClick={() => setActiveTab("pricing")}
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
      {activeTab === "dashboard" && <DashboardPage />}
      {activeTab === "offers" && <AllOffersPage />}
      {activeTab === "pricing" && <PricingPage />}
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
