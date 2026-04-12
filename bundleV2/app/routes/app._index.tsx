import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import "../styles/tailwind.css";
import { Typography, Button, Switch, Modal, Space } from "antd";
import { Trash2, Pencil } from "lucide-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const { Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

const mockOverviewData = {
  totalGmv: 12430,
  gmvGrowthRate: 12.3,
  bundleOrders: 320,
  bundleOrdersGrowthRate: 8.5,
  avgConversionRate: 3.2,
  conversionTrend: 4.1,
};

const mockOffers = [
  {
    id: "gid://shopify/DiscountAutomaticNode/1",
    name: "Summer Bundle",
    status: "ACTIVE",
    exposurePV: 45230,
    addToCartPV: 8920,
    gmv: 12430,
    conversion: "3.2%",
  },
  {
    id: "gid://shopify/DiscountAutomaticNode/2",
    name: "Winter Sale Pack",
    status: "PAUSED",
    exposurePV: 38150,
    addToCartPV: 7200,
    gmv: 8920,
    conversion: "2.8%",
  },
];

export default function Index() {
  const isThemeExtensionEnabled = true;

  return (
    <div className="!max-w-[1280px] !mx-auto !px-[16px] !sm:px-[24px] !pt-[16px] !sm:pt-[24px]">
      {/* Header */}
      <div className="!mb-[16px] !sm:mb-[24px]">
        <h1 className="!font-['Inter'] !font-semibold !text-[20px] !sm:text-[24px] !leading-[30px] !sm:leading-[36px] !text-[#202223] !tracking-[0.0703px] !m-0">
          Dashboard
        </h1>
      </div>

      {/* GMV Overview and Theme Extension - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[16px] sm:gap-[24px] mb-[24px] sm:mb-[36px]">
        {/* GMV Overview Card */}
        <div
          className="bg-white !rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]"
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.1)",
            padding: 20,
          }}
        >
          <div className="!flex !items-center !justify-between !mb-[16px]">
            <h2 className="!font-['Inter'] !font-semibold !text-[20px] !leading-[30px] !text-[#202223] !tracking-[-0.4492px] !m-0">
              GMV Overview
            </h2>
            <Button
              type="text"
              className="!font-['Inter'] !font-medium !text-[14px]"
            >
              View Details
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 12L10 8L6 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] sm:gap-[20px]">
            {/* Total GMV */}
            <div className="!flex !flex-col !gap-[16px]">
              <span className="!font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#6d7175] !tracking-[-0.1504px]">
                Total GMV
              </span>
              <h3 className="!font-['Inter'] !font-semibold !text-[28px] !leading-[42px] !text-[#202223] !tracking-[0.3828px] !m-0">
                ${mockOverviewData.totalGmv.toLocaleString()}
              </h3>
              <span
                className="!font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !tracking-[-0.1504px]"
                style={{
                  color:
                    mockOverviewData.gmvGrowthRate === 0
                      ? "#916a00"
                      : mockOverviewData.gmvGrowthRate > 0
                        ? "#108043"
                        : "#D93025",
                }}
              >
                ↑ +{mockOverviewData.gmvGrowthRate}% from last month
              </span>
            </div>

            {/* Bundle Orders */}
            <div className="!flex !flex-col !gap-[16px]">
              <span className="!font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#6d7175] !tracking-[-0.1504px]">
                Bundle Orders
              </span>
              <h3 className="!font-['Inter'] !font-semibold !text-[28px] !leading-[42px] !text-[#202223] !tracking-[0.3828px] !m-0">
                {mockOverviewData.bundleOrders}
              </h3>
              <span
                className="!font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !tracking-[-0.1504px]"
                style={{
                  color:
                    mockOverviewData.bundleOrdersGrowthRate === 0
                      ? "#916a00"
                      : mockOverviewData.bundleOrdersGrowthRate > 0
                        ? "#108043"
                        : "#D93025",
                }}
              >
                ↑ +{mockOverviewData.bundleOrdersGrowthRate}% from last month
              </span>
            </div>

            {/* Avg. Conversion */}
            <div className="!flex !flex-col !gap-[16px]">
              <span className="!font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#6d7175] !tracking-[-0.1504px]">
                Avg. Conversion
              </span>
              <h3 className="!font-['Inter'] !font-semibold !text-[28px] !leading-[42px] !text-[#202223] !tracking-[0.3828px] !m-0">
                {mockOverviewData.avgConversionRate}%
              </h3>
              <span
                className="!font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !tracking-[-0.1504px]"
                style={{
                  color:
                    mockOverviewData.conversionTrend === 0
                      ? "#916a00"
                      : mockOverviewData.conversionTrend > 0
                        ? "#108043"
                        : "#D93025",
                }}
              >
                ↑ +{mockOverviewData.conversionTrend}% from last month
              </span>
            </div>
          </div>
        </div>

        {/* Theme Extension Widget */}
        <div
          className="bg-white !rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
            borderRadius: 8,
            boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.1)",
            padding: 20,
          }}
        >
          {/* Header with Active Status */}
          <div>
            <div className="!flex !items-center !justify-between !mb-[16px]">
              <h2 className="!font-['Inter'] !font-semibold !text-[20px] !leading-[30px] !text-[#202223] !tracking-[-0.4492px] !m-0">
                Theme extension
              </h2>
              <div
                className={`!flex !items-center !gap-[6px] !px-[8px] !py-[4px] !rounded-[4px] ${
                  isThemeExtensionEnabled ? "!bg-[#d1f7c4]" : "!bg-[#f4f6f8]"
                }`}
              >
                <div
                  className={`!w-[8px] !h-[8px] !rounded-full ${
                    isThemeExtensionEnabled ? "!bg-[#108043]" : "!bg-[#6d7175]"
                  }`}
                ></div>
                <span
                  className={`!font-['Inter'] !font-medium !text-[14px] !leading-[21px] !tracking-[-0.1504px] ${
                    isThemeExtensionEnabled
                      ? "!text-[#108043]"
                      : "!text-[#6d7175]"
                  }`}
                >
                  {isThemeExtensionEnabled ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="!font-['Inter'] !font-normal !text-[16px] !leading-[25.6px] !text-[#202223] !tracking-[-0.3125px] !mb-[20px]">
              {isThemeExtensionEnabled
                ? "Bundles widget is visible in product pages."
                : "Bundles widget is currently disabled."}
            </p>
          </div>

          {/* Enable/Disable and Need help buttons */}
          <div className="!flex !flex-col !gap-[12px]">
            <Button
              type={isThemeExtensionEnabled ? "default" : "primary"}
              className="!font-['Inter'] !font-medium !text-[14px]"
            >
              {isThemeExtensionEnabled ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
      </div>

      {/* My Offers Card - Full Width */}
      <div
        className="!bg-white !rounded-[8px] !shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] !p-[16px] sm:!p-[20px] !mb-[24px] sm:!mb-[36px]"
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 8,
          boxShadow: "0px 1px 3px 0px rgba(0,0,0,0.1)",
          padding: 20,
        }}
      >
        <div className="!flex !flex-col sm:!flex-row !items-start sm:!items-center !justify-between !gap-[12px] sm:!gap-0 !mb-[16px]">
          <h2 className="!font-['Inter'] !font-semibold !text-[18px] sm:!text-[20px] !leading-[27px] sm:!leading-[30px] !text-[#202223] !tracking-[-0.4492px] !m-0">
            My Offers
          </h2>
          <Button
            type="primary"
            className="!font-['Inter'] !font-medium !text-[14px]"
          >
            Create New Offer
          </Button>
        </div>

        {/* Desktop Table */}
        <table className="hidden md:table w-full border-collapse">
          <thead>
            <tr>
              <th className="!text-left !p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-semibold !text-[13px] !leading-[20.8px] !text-[#6d7175] !tracking-[-0.0762px]">
                Offer Name
              </th>
              <th className="!text-left !p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-semibold !text-[13px] !leading-[20.8px] !text-[#6d7175] !tracking-[-0.0762px]">
                Status
              </th>
              <th className="!text-left !p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-semibold !text-[13px] !leading-[20.8px] !text-[#6d7175] !tracking-[-0.0762px]">
                Exposure PV
              </th>
              <th className="!text-left !p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-semibold !text-[13px] !leading-[20.8px] !text-[#6d7175] !tracking-[-0.0762px]">
                Add to Cart PV
              </th>
              <th className="!text-left !p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-semibold !text-[13px] !leading-[20.8px] !text-[#6d7175] !tracking-[-0.0762px]">
                GMV
              </th>
              <th className="!text-left !p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-semibold !text-[13px] !leading-[20.8px] !text-[#6d7175] !tracking-[-0.0762px]">
                Conversion
              </th>
              <th className="!text-left !p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-semibold !text-[13px] !leading-[20.8px] !text-[#6d7175] !tracking-[-0.0762px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {mockOffers.map((offer) => (
              <tr key={offer.id}>
                <td className="!p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#202223] !tracking-[-0.1504px]">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {offer.name}
                  </div>
                </td>
                <td className="!p-[12px] !border-b !border-[#dfe3e8]">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Switch checked={offer.status === "ACTIVE"} />
                    <span
                      style={{
                        fontSize: "14px",
                        color:
                          offer.status === "ACTIVE" ? "#108043" : "#6d7175",
                        fontWeight: 500,
                      }}
                    >
                      {offer.status}
                    </span>
                  </div>
                </td>
                <td className="!p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#202223] !tracking-[-0.1504px]">
                  {offer.exposurePV.toLocaleString()}
                </td>
                <td className="!p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#202223] !tracking-[-0.1504px]">
                  {offer.addToCartPV.toLocaleString()}
                </td>
                <td className="!p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#202223] !tracking-[-0.1504px]">
                  ${offer.gmv.toLocaleString()}
                </td>
                <td className="!p-[12px] !border-b !border-[#dfe3e8] !font-['Inter'] !font-normal !text-[14px] !leading-[22.4px] !text-[#202223] !tracking-[-0.1504px]">
                  {offer.conversion}
                </td>
                <td className="!p-[12px] !border-b !border-[#dfe3e8]">
                  <div className="!flex !items-center !gap-[8px]">
                    <Button type="text" title="Edit">
                      <Pencil size={16} />
                    </Button>
                    <Button type="text" title="Delete">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-[12px]">
          {mockOffers.map((offer) => (
            <div
              key={offer.id}
              className="!border !border-[#dfe3e8] !rounded-[8px] !p-[16px]"
            >
              <div className="!flex !items-start !justify-between !mb-[12px]">
                <div className="flex items-center gap-[8px] flex-wrap">
                  <span className="font-['Inter'] font-medium text-[16px] text-[#202223]">
                    {offer.name}
                  </span>
                  <span
                    style={{
                      backgroundColor: "#00A47C",
                      color: "white",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    NEW
                  </span>
                </div>
              </div>

              <div className="!flex !items-center !gap-[8px] !mb-[12px]">
                <Switch checked={offer.status === "ACTIVE"} />
                <span
                  style={{
                    fontSize: "14px",
                    color: offer.status === "ACTIVE" ? "#108043" : "#6d7175",
                    fontWeight: 500,
                  }}
                >
                  {offer.status}
                </span>
              </div>

              <div className="!grid !grid-cols-2 !gap-[12px] !mb-[12px]">
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">GMV</div>
                  <div className="text-[14px] font-medium text-[#202223]">
                    ${offer.gmv.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">
                    Conversion
                  </div>
                  <div className="text-[14px] font-medium text-[#202223]">
                    {offer.conversion}
                  </div>
                </div>
              </div>

              <div className="!flex !items-center !gap-[8px] !pt-[12px] !border-t !border-[#dfe3e8]">
                <Button type="text" title="Edit">
                  <Pencil size={18} />
                </Button>
                <Button type="text" title="Delete">
                  <Trash2 size={18} />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* View All Button at Bottom */}
        <div className="flex !justify-center !mt-[16px] !sm:mt-[20px] !pt-[16px] !border-t !border-[#dfe3e8]">
          <button className="!text-[#008060] !font-['Inter'] !font-medium !text-[14px] !leading-[21px] !tracking-[-0.1504px] !bg-transparent !border-0 !cursor-pointer !hover:!bg-[rgba(0,128,96,0.1)] !px-[16px] !py-[8px] !rounded-[6px]">
            View All Offers
          </button>
        </div>
      </div>

      {/* Static Delete Modal Preview (mock, always open) */}
      <Modal
        centered
        open={false}
        footer={
          <Space>
            <Button>Cancel</Button>
            <Button type="primary" danger>
              Delete
            </Button>
          </Space>
        }
        title="Delete Offer"
      >
        <Text>Are you sure you want to delete this offer Summer Bundle?</Text>
      </Modal>
    </div>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
