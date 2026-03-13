import { useState } from "react";
import { Copy, Trash2, Pencil, ChartBar, ArrowUp, ArrowDown } from "lucide-react";
import "../styles/tailwind.css";

const mockOverview = {
  totalGmv: "$125,430",
  gmvTrend: "+15.2%",
  gmvTrendLabel: "from last month",
  activeOffers: 24,
  activeOffersTrend: "+3 new this week",
  avgConversion: "2.8%",
  conversionTrendLabel: "No change",
  conversionTrendColor: "text-[#916a00]" as const,
};

const mockOffers = [
  {
    id: 1,
    name: "Summer Bundle",
    status: "Active" as const,
    gmv: "$12,430",
    conversion: "3.2%",
    exposurePV: "45,230",
    addToCartPV: "8,920",
  },
  {
    id: 2,
    name: "Winter Sale Pack",
    status: "Active" as const,
    gmv: "$8,920",
    conversion: "2.8%",
    exposurePV: "38,150",
    addToCartPV: "7,200",
  },
  {
    id: 3,
    name: "Spring Collection",
    status: "Paused" as const,
    gmv: "$5,640",
    conversion: "1.9%",
    exposurePV: "22,600",
    addToCartPV: "4,100",
  },
];

const mockAbTests = [
  {
    id: 1,
    name: "Summer Bundle Test",
    status: "Running" as const,
    variant: "A vs B",
    pv: "45,230",
    extraGMV: "$1,240",
    improvement: 15.3,
    daysRunning: 14,
    confidence: 95,
  },
  {
    id: 2,
    name: "Winter Promotion Test",
    status: "Paused" as const,
    variant: "A vs B vs C",
    pv: "38,150",
    extraGMV: "$890",
    improvement: -8.2,
    daysRunning: 21,
    confidence: 78,
  },
];

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DashboardPage() {
  const [isThemeExtensionEnabled, setIsThemeExtensionEnabled] = useState(true);

  const handleViewDetails = () => {}; // mock
  const handleCreateOffer = () => {}; // mock
  const handleCreateAbTest = () => {}; // mock
  const handleViewAllOffers = () => {}; // mock
  const handleViewAllAbTests = () => {}; // mock
  const handleNeedHelp = () => {}; // mock

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* Header */}
      <div className="mb-[16px] sm:mb-[24px]">
        <h1 className="font-['Inter'] font-semibold text-[20px] sm:text-[24px] leading-[30px] sm:leading-[36px] text-[#202223] tracking-[0.0703px] m-0">
          Dashboard
        </h1>
      </div>

      {/* GMV Overview + Theme Extension */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[16px] sm:gap-[24px] mb-[24px] sm:mb-[36px]">
        {/* GMV Overview Card */}
        <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-['Inter'] font-semibold text-[20px] leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
              GMV Overview
            </h2>
            <button
              type="button"
              className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px]"
              onClick={handleViewDetails}
            >
              View Details
              <ChevronRightIcon />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] sm:gap-[20px]">
            <div className="flex flex-col gap-[12px] sm:gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Total GMV
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                {mockOverview.totalGmv}
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-[-0.1504px]">
                ↑ {mockOverview.gmvTrend} {mockOverview.gmvTrendLabel}
              </span>
            </div>
            <div className="flex flex-col gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Active Offers
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                {mockOverview.activeOffers}
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-[-0.1504px]">
                ↑ {mockOverview.activeOffersTrend}
              </span>
            </div>
            <div className="flex flex-col gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Avg. Conversion
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                {mockOverview.avgConversion}
              </h3>
              <span className={`font-['Inter'] font-normal text-[14px] leading-[22.4px] tracking-[-0.1504px] ${mockOverview.conversionTrendColor}`}>
                → {mockOverview.conversionTrendLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Theme Extension Widget */}
        <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-['Inter'] font-semibold text-[20px] leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
              Theme extension
            </h2>
            <div
              className={`flex items-center gap-[6px] px-[8px] py-[4px] rounded-[4px] ${isThemeExtensionEnabled ? "bg-[#d1f7c4]" : "bg-[#f4f6f8]"}`}
            >
              <div
                className={`w-[8px] h-[8px] rounded-full ${isThemeExtensionEnabled ? "bg-[#108043]" : "bg-[#6d7175]"}`}
              />
              <span
                className={`font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] ${isThemeExtensionEnabled ? "text-[#108043]" : "text-[#6d7175]"}`}
              >
                {isThemeExtensionEnabled ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
          <p className="font-['Inter'] font-normal text-[16px] leading-[25.6px] text-[#202223] tracking-[-0.3125px] mb-[20px]">
            {isThemeExtensionEnabled
              ? "Bundles widget is visible in product pages."
              : "Bundles widget is currently disabled."}
          </p>
          <div className="flex flex-col gap-[12px]">
            <button
              type="button"
              onClick={() => setIsThemeExtensionEnabled(!isThemeExtensionEnabled)}
              className={`px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] cursor-pointer transition-colors w-full border-0 ${
                isThemeExtensionEnabled
                  ? "bg-white border border-[#dfe3e8] text-[#d72c0d] hover:bg-[#fef3f2]"
                  : "bg-[#008060] text-white hover:bg-[#006e52]"
              }`}
            >
              {isThemeExtensionEnabled ? "Disable" : "Enable"}
            </button>
            <button
              type="button"
              className="bg-white border border-[#dfe3e8] px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] text-[#202223] tracking-[-0.1504px] cursor-pointer hover:bg-[#f4f6f8] transition-colors w-full"
              onClick={handleNeedHelp}
            >
              Need help?
            </button>
          </div>
        </div>
      </div>

      {/* My Offers Card */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[20px] mb-[24px] sm:mb-[36px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <h2 className="font-['Inter'] font-semibold text-[18px] sm:text-[20px] leading-[27px] sm:leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
            My Offers
          </h2>
          <button
            type="button"
            className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={handleCreateOffer}
          >
            Create New Offer
          </button>
        </div>

        <table className="hidden md:table w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Offer Name
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Exposure PV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Add to Cart PV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                GMV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Conversion
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockOffers.map((offer) => (
              <tr key={offer.id}>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  <div className="flex items-center gap-[8px]">
                    {offer.name}
                    <span className="bg-[#00A47C] text-white text-[10px] font-semibold py-[2px] px-[6px] rounded-[4px] uppercase tracking-wider">
                      NEW
                    </span>
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <span
                      className="relative inline-block w-[44px] h-[24px] rounded-[12px] cursor-pointer"
                      style={{
                        backgroundColor: offer.status === "Active" ? "#008060" : "#c4cdd5",
                      }}
                      title={offer.status === "Active" ? "Click to deactivate" : "Click to activate"}
                    >
                      <span
                        className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        style={{ left: offer.status === "Active" ? "22px" : "2px" }}
                      />
                    </span>
                    <span
                      className="text-[14px] font-medium"
                      style={{ color: offer.status === "Active" ? "#108043" : "#6d7175" }}
                    >
                      {offer.status}
                    </span>
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.exposurePV}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.addToCartPV}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.gmv}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {offer.conversion}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="Analytics"
                    >
                      <ChartBar size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[4px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="md:hidden space-y-[12px]">
          {mockOffers.map((offer) => (
            <div key={offer.id} className="border border-[#dfe3e8] rounded-[8px] p-[16px]">
              <div className="flex items-start justify-between mb-[12px]">
                <div className="flex items-center gap-[8px] flex-wrap">
                  <span className="font-['Inter'] font-medium text-[16px] text-[#202223]">{offer.name}</span>
                  <span className="bg-[#00A47C] text-white text-[10px] font-semibold py-[2px] px-[6px] rounded-[4px] uppercase tracking-wider">
                    NEW
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-[8px] mb-[12px]">
                <span
                  className="relative inline-block w-[44px] h-[24px] rounded-[12px]"
                  style={{ backgroundColor: offer.status === "Active" ? "#008060" : "#c4cdd5" }}
                >
                  <span
                    className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                    style={{ left: offer.status === "Active" ? "22px" : "2px" }}
                  />
                </span>
                <span
                  className="text-[14px] font-medium"
                  style={{ color: offer.status === "Active" ? "#108043" : "#6d7175" }}
                >
                  {offer.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">GMV</div>
                  <div className="text-[14px] font-medium text-[#202223]">{offer.gmv}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">Conversion</div>
                  <div className="text-[14px] font-medium text-[#202223]">{offer.conversion}</div>
                </div>
              </div>
              <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                <button
                  type="button"
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Analytics"
                >
                  <ChartBar size={18} />
                </button>
                <button
                  type="button"
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Copy"
                >
                  <Copy size={18} />
                </button>
                <button
                  type="button"
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[8px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-[16px] sm:mt-[20px] pt-[16px] border-t border-[#dfe3e8]">
          <button
            type="button"
            className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[16px] py-[8px] rounded-[6px]"
            onClick={handleViewAllOffers}
          >
            View All Offers
          </button>
        </div>
      </div>

      {/* A/B Tests Card */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[20px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <h2 className="font-['Inter'] font-semibold text-[18px] sm:text-[20px] leading-[27px] sm:leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
            A/B Tests
          </h2>
          <button
            type="button"
            className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={handleCreateAbTest}
          >
            Create A/B Test
          </button>
        </div>

        <table className="hidden md:table w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Test Name
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Status
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Variants
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                PV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Extra GMV
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                GMV Improvement
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Days Running
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Confidence
              </th>
              <th className="text-left p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[13px] leading-[20.8px] text-[#6d7175] tracking-[-0.0762px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockAbTests.map((test) => (
              <tr key={test.id}>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {test.name}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <span
                      className="relative inline-block w-[44px] h-[24px] rounded-[12px] cursor-pointer"
                      style={{ backgroundColor: test.status === "Running" ? "#008060" : "#c4cdd5" }}
                    >
                      <span
                        className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                        style={{ left: test.status === "Running" ? "22px" : "2px" }}
                      />
                    </span>
                    <span
                      className="text-[14px] font-medium"
                      style={{ color: test.status === "Running" ? "#108043" : "#6d7175" }}
                    >
                      {test.status}
                    </span>
                  </div>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {test.variant}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {test.pv}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {test.extraGMV}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <span
                    className="font-['Inter'] font-semibold text-[14px] leading-[22.4px] tracking-[-0.1504px] flex items-center gap-[4px]"
                    style={{ color: test.improvement >= 0 ? "#108043" : "#d72c0d" }}
                  >
                    {test.improvement >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                    {Math.abs(test.improvement)}%
                  </span>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                  {test.daysRunning} days
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  <span
                    style={{
                      color:
                        test.confidence >= 95 ? "#108043" : test.confidence >= 80 ? "#6d7175" : "#d72c0d",
                      fontWeight: test.confidence >= 95 ? 600 : 400,
                    }}
                  >
                    {test.confidence}%
                  </span>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="View Details"
                    >
                      <ChartBar size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[4px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="md:hidden space-y-[12px]">
          {mockAbTests.map((test) => (
            <div key={test.id} className="border border-[#dfe3e8] rounded-[8px] p-[16px]">
              <div className="mb-[12px]">
                <span className="font-['Inter'] font-medium text-[16px] text-[#202223]">{test.name}</span>
              </div>
              <div className="flex items-center gap-[8px] mb-[12px]">
                <span
                  className="relative inline-block w-[44px] h-[24px] rounded-[12px]"
                  style={{ backgroundColor: test.status === "Running" ? "#008060" : "#c4cdd5" }}
                >
                  <span
                    className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                    style={{ left: test.status === "Running" ? "22px" : "2px" }}
                  />
                </span>
                <span
                  className="text-[14px] font-medium"
                  style={{ color: test.status === "Running" ? "#108043" : "#6d7175" }}
                >
                  {test.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">PV</div>
                  <div className="text-[14px] font-medium text-[#202223]">{test.pv}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">Extra GMV</div>
                  <div className="text-[14px] font-medium text-[#202223]">{test.extraGMV}</div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">GMV Improvement</div>
                  <div
                    className={`text-[14px] font-medium ${test.improvement > 0 ? "text-[#108043]" : "text-[#d72c0d]"}`}
                  >
                    {test.improvement > 0 ? "↑" : "↓"} {Math.abs(test.improvement)}%
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">Confidence</div>
                  <div className="text-[14px] font-medium text-[#202223]">{test.confidence}%</div>
                </div>
              </div>
              <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                <button
                  type="button"
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="View Details"
                >
                  <ChartBar size={18} />
                </button>
                <button
                  type="button"
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button
                  type="button"
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[8px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-[16px] sm:mt-[20px] pt-[16px] border-t border-[#dfe3e8]">
          <button
            type="button"
            className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[16px] py-[8px] rounded-[6px]"
            onClick={handleViewAllAbTests}
          >
            View All A/B Tests
          </button>
        </div>
      </div>
    </div>
  );
}