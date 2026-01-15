import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { authenticate } from "app/shopify.server";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Copy,
  Trash2,
  Pencil,
  ChartBar,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { mutationDiscountAutomaticActivate, mutationDiscountAutomaticDeactivate, mutationDiscountAutomaticDeleteAndMetafieldsDelete, queryDiscountNodes, queryThemes } from "app/api/admin";
import { globalStore } from "app/globalStore";
import { useTranslation } from "react-i18next";
import { Spin, Switch } from "antd";
import { BatchQueryUserDiscount, DeleteUserDiscount, UpdateUserDiscountStatus } from "app/api/javaServer";

interface OfferType {
  id: string;
  name: string;
  status: string;
  metafields: any;
  gmv: string;
  conversion: string;
  exposurePV: string;
  addToCartPV: string;
}

export const loader = async () => {
  return {
    ciwiBundleExtensionId: process.env.SHOPIFY_CIWI_BUNDLE_EXTENSION_ID as string,
    ciwiBundleExtensionType: process.env.SHOPIFY_CIWI_BUNDLE_EXTENSION_TYPE as string,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  const formData = await request.formData();

  const themesRequestBody = JSON.parse(
    formData.get("themesRequestBody") as string,
  );
  const discountNodeRequestBody = JSON.parse(
    formData.get("discountNodeRequestBody") as string,
  );
  const discountNodeStatusRequestBody = JSON.parse(
    formData.get("discountNodeStatusRequestBody") as string,
  );
  const discountNodeDeleteRequestBody = JSON.parse(
    formData.get("discountNodeDeleteRequestBody") as string,
  );

  switch (true) {
    case !!themesRequestBody:
      try {
        const themesData = await queryThemes({
          ...themesRequestBody,
          shop,
          accessToken,
        });

        if (themesData) {
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: themesData,
          }
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        }
      } catch (error) {
        console.error(`${shop} themesRequestBody Error: `, error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        }
      }
    case !!discountNodeRequestBody:
      try {
        const discountNodeData = await queryDiscountNodes({
          ...discountNodeRequestBody,
          shop,
          accessToken,
        });

        if (discountNodeData) {
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: discountNodeData,
          }
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        }
      } catch (error) {
        console.error(`${shop} discountNodeRequestBody Error: `, error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        }
      }
    case !!discountNodeStatusRequestBody:
      try {
        let discountNodeStatusData = null;

        if (discountNodeStatusRequestBody.status) {
          discountNodeStatusData = await mutationDiscountAutomaticActivate({
            shop,
            accessToken: accessToken || "",
            variables: {
              id: discountNodeStatusRequestBody.id,
            }
          });
        } else {
          discountNodeStatusData = await mutationDiscountAutomaticDeactivate({
            shop,
            accessToken: accessToken || "",
            variables: {
              id: discountNodeStatusRequestBody.id,
            }
          });
        }

        if (discountNodeStatusData) {
          const updateUserDiscountStatusData = await UpdateUserDiscountStatus({
            shopName: shop,
            discountGid: discountNodeStatusRequestBody.id,
            status: discountNodeStatusData?.automaticDiscountNode?.automaticDiscount?.status,
          });

          return updateUserDiscountStatusData
        }

        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        }
      } catch (error) {
        console.error(`${shop} discountNodeStatusRequestBody Error: `, error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        }
      }
    case !!discountNodeDeleteRequestBody:
      try {
        const discountNodeDeleteData = await mutationDiscountAutomaticDeleteAndMetafieldsDelete({
          shop,
          accessToken: accessToken || "",
          variables: discountNodeDeleteRequestBody
        });

        if (discountNodeDeleteData) {
          const deleteUserDiscountData = await DeleteUserDiscount({
            shopName: shop,
            discountGid: discountNodeDeleteRequestBody.id,
          });

          if (deleteUserDiscountData) {
            return deleteUserDiscountData
          }

          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
          }
        }
      } catch (error) {
        console.error(`${shop} discountNodeStatusRequestBody Error: `, error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: null,
        }
      }
    default:
      console.error(`${shop} Request with unrecognized key: `, formData);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      }
  };
}

const Index = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const discountNodeDeleteFetcher = useFetcher<any>();
  const discountNodeStatusFetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();

  const { ciwiBundleExtensionId, ciwiBundleExtensionType } = useLoaderData<typeof loader>();

  const [isThemeExtensionEnabled, setIsThemeExtensionEnabled] = useState(true);

  const [offers, setOffers] = useState<OfferType[] | null>(null);

  const blockUrl = useMemo(
    () =>
      `https://${globalStore.shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiBundleExtensionId}/ciwi_bundle_main`,
    [globalStore.shop, ciwiBundleExtensionId]
  );

  const newOffer = useMemo(
    () =>
      localStorage.getItem("ciwi_new_offer_id") || ""
    , [])

  // const offers = [
  //   {
  //     id: 1,
  //     name: "Summer Bundle",
  //     status: "ACTIVE",
  //     gmv: "$12,430",
  //     conversion: "3.2%",
  //     exposurePV: "45,230",
  //     addToCartPV: "8,920",
  //   },
  //   {
  //     id: 2,
  //     name: "Winter Sale Pack",
  //     status: "ACTIVE",
  //     gmv: "$8,920",
  //     conversion: "2.8%",
  //     exposurePV: "38,150",
  //     addToCartPV: "7,200",
  //   },
  //   {
  //     id: 3,
  //     name: "Spring Collection",
  //     status: "Paused",
  //     gmv: "$5,640",
  //     conversion: "1.9%",
  //     exposurePV: "22,600",
  //     addToCartPV: "4,100",
  //   },
  // ];

  // const abTests = [
  //   {
  //     id: 1,
  //     name: "Summer Bundle Test",
  //     status: "Running",
  //     variant: "A vs B",
  //     pv: "45,230",
  //     extraGMV: "$1,240",
  //     improvement: 15.3,
  //     daysRunning: 14,
  //     confidence: 95,
  //   },
  //   {
  //     id: 2,
  //     name: "Winter Promotion Test",
  //     status: "Paused",
  //     variant: "A vs B vs C",
  //     pv: "38,150",
  //     extraGMV: "$890",
  //     improvement: -8.2,
  //     daysRunning: 21,
  //     confidence: 78,
  //   },
  // ];

  useEffect(() => {
    themeFetcher.submit(
      {
        themesRequestBody: JSON.stringify({})
      },
      {
        method: "POST",
      },
    );
    setTimeout(() => {
      batchQueryUserDiscount();
    }, 2000);
    const themeExtensionEnabled = localStorage.getItem("ciwi_theme_extension_enabled");
    const newOfferId = localStorage.getItem("ciwi_new_offer_id")
    if (themeExtensionEnabled) {
      setIsThemeExtensionEnabled(themeExtensionEnabled === "true");
    }
    if (newOfferId) {
      localStorage.removeItem("ciwi_new_offer_id")
    }
  }, []);

  useEffect(() => {
    if (themeFetcher.data) {
      if (themeFetcher.data.success) {
        const extensionsData =
          themeFetcher.data.response?.themes?.nodes[0]?.files?.nodes[0]?.body?.content || "{}";
        const jsonString = extensionsData.replace(/\/\*[\s\S]*?\*\//g, "").trim();
        const blocks = JSON.parse(jsonString)?.current?.blocks;
        if (blocks) {
          const extensionJson: any = Object.values(blocks).find(
            (block: any) => block.type === ciwiBundleExtensionType,
          );
          if (extensionJson) {
            if (extensionJson.disabled) {
              setIsThemeExtensionEnabled(false);
              localStorage.setItem("ciwi_theme_extension_enabled", "false");
            } else {
              setIsThemeExtensionEnabled(true);
              localStorage.setItem("ciwi_theme_extension_enabled", "true");
            }
          }
        }
      }
    }
  }, [themeFetcher.data]);

  // useEffect(() => {
  //   if (discountNodeFetcher.data) {
  //     if (discountNodeFetcher.data.success) {
  //       const discountNodesData = discountNodeFetcher.data.response?.discountNodes?.nodes || [];
  //       console.log("discountNodesData", discountNodesData);
  //       const data = discountNodesData?.map((discountNode: any) => {
  //         return {
  //           id: discountNode?.id,
  //           name: discountNode?.discount?.title,
  //           status: discountNode?.discount?.status,
  //           gmv: "",
  //           conversion: "",
  //           exposurePV: "",
  //           addToCartPV: "",
  //         };
  //       }) ?? [];
  //       setOffers(data);
  //     }
  //   }
  // }, [discountNodeFetcher.data]);

  useEffect(() => {
    if (discountNodeStatusFetcher.data) {
      if (discountNodeStatusFetcher.data.success) {
        const id = discountNodeStatusFetcher.data.response?.first;
        const status = discountNodeStatusFetcher.data.response?.second;

        const newOffers = Array.isArray(offers) ? offers.map(offer => {
          if (offer.id === id) {
            return {
              ...offer,
              status,
            }
          }
          return offer;
        }) : [];
        setOffers(newOffers);
      }
    }
  }, [discountNodeStatusFetcher.data]);

  useEffect(() => {
    if (discountNodeDeleteFetcher.data) {
      console.log("discountNodeDeleteFetcher.data", discountNodeDeleteFetcher.data);

      if (discountNodeDeleteFetcher.data.success) {
        console.log("discountNodeDeleteFetcher.data", discountNodeDeleteFetcher.data);

        const deleteDiscountGid = discountNodeDeleteFetcher.data.response;

        if (!offers || !deleteDiscountGid) return;

        console.log("offers: ", offers);

        const newOffer = offers.filter((offer) => offer.id !== deleteDiscountGid);

        setOffers(newOffer);
      }
    }
  }, [discountNodeDeleteFetcher.data]);

  const switchDiscountStatus = (
    {
      id,
      status,
    }:
      {
        id: string,
        status: boolean,
      }
  ) => {
    discountNodeStatusFetcher.submit(
      {
        discountNodeStatusRequestBody: JSON.stringify({
          id,
          status,
        })
      },
      {
        method: "POST",
      },
    );
  }

  const batchQueryUserDiscount = useCallback(async () => {
    const batchQueryUserDiscountData = await BatchQueryUserDiscount({
      shopName: globalStore.shop,
      server: globalStore.server,
    });

    if (batchQueryUserDiscountData.success) {
      const data = batchQueryUserDiscountData.response?.map((item: any) => (
        {
          id: item?.discountGid,
          name: item?.basic_information?.offerName,
          status: item?.status,
          metafields: item?.metafields,
          gmv: "",
          conversion: "",
          exposurePV: "",
          addToCartPV: "",
        }
      ))
      setOffers(data);
    }

  }, [globalStore.shop, globalStore.server]);

  const deleteOffer = async ({
    id,
    metafields
  }: {
    id: string,
    metafields: {
      ownerId: string,
      namespace: string,
      key: string
    }[]
  }) => {
    discountNodeDeleteFetcher.submit(
      {
        discountNodeDeleteRequestBody: JSON.stringify({
          id,
          metafields,
        })
      },
      {
        method: "POST",
      },
    );
  }

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {/* Header */}
      <div className="mb-[16px] sm:mb-[24px]">
        <h1 className="font-['Inter'] font-semibold text-[20px] sm:text-[24px] leading-[30px] sm:leading-[36px] text-[#202223] tracking-[0.0703px] m-0">
          Dashboard
        </h1>
      </div>

      {/* GMV Overview and Theme Extension - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-[16px] sm:gap-[24px] mb-[24px] sm:mb-[36px]">
        {/* GMV Overview Card */}
        <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="font-['Inter'] font-semibold text-[20px] leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
              GMV Overview
            </h2>
            <button
              className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[12px] py-[6px] rounded-[6px] flex items-center gap-[6px]"
              onClick={() => navigate("/app/analytics")}
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
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-[16px] sm:gap-[20px]">
            {/* Total GMV */}
            <div className="flex flex-col gap-[12px] sm:gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Total GMV
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                $125,430
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-[-0.1504px]">
                ↑ +15.2% from last month
              </span>
            </div>

            {/* Active Offers */}
            <div className="flex flex-col gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Active Offers
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                24
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#108043] tracking-[-0.1504px]">
                ↑ +3 new this week
              </span>
            </div>

            {/* Avg. Conversion */}
            <div className="flex flex-col gap-[16px]">
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#6d7175] tracking-[-0.1504px]">
                Avg. Conversion
              </span>
              <h3 className="font-['Inter'] font-semibold text-[28px] leading-[42px] text-[#202223] tracking-[0.3828px] m-0">
                2.8%
              </h3>
              <span className="font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#916a00] tracking-[-0.1504px]">
                → No change
              </span>
            </div>
          </div>
        </div>

        {/* Theme Extension Widget */}
        <div
          className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[20px]"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}
        >
          {/* Header with Active Status */}
          <div>
            <div className="flex items-center justify-between mb-[16px]">
              <h2 className="font-['Inter'] font-semibold text-[20px] leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
                Theme extension
              </h2>
              <div
                className={`flex items-center gap-[6px] px-[8px] py-[4px] rounded-[4px] ${isThemeExtensionEnabled ? "bg-[#d1f7c4]" : "bg-[#f4f6f8]"}`}
              >
                <div
                  className={`w-[8px] h-[8px] rounded-full ${isThemeExtensionEnabled ? "bg-[#108043]" : "bg-[#6d7175]"}`}
                ></div>
                <span
                  className={`font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] ${isThemeExtensionEnabled ? "text-[#108043]" : "text-[#6d7175]"}`}
                >
                  {isThemeExtensionEnabled ? "Active" : "Inactive"}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="font-['Inter'] font-normal text-[16px] leading-[25.6px] text-[#202223] tracking-[-0.3125px] mb-[20px]">
              {isThemeExtensionEnabled
                ? "Bundles widget is visible in product pages."
                : "Bundles widget is currently disabled."}
            </p>
          </div>

          {/* Enable/Disable and Need help buttons */}
          <div className="flex flex-col gap-[12px]">
            <button
              onClick={() => open(blockUrl, "_blank")}
              className={`px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] cursor-pointer transition-colors w-full border-0 ${isThemeExtensionEnabled
                ? "bg-white border border-[#dfe3e8] text-[#d72c0d] hover:bg-[#fef3f2]"
                : "bg-[#008060] text-white hover:bg-[#006e52]"
                }`}
            >
              {isThemeExtensionEnabled ? "Disable" : "Enable"}
            </button>
            {/* <button className="bg-white border border-[#dfe3e8] px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] text-[#202223] tracking-[-0.1504px] cursor-pointer hover:bg-[#f4f6f8] transition-colors w-full">
              Need help?
            </button> */}
          </div>
        </div>
      </div>

      {/* My Offers Card - Full Width */}
      <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[20px] mb-[24px] sm:mb-[36px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <h2 className="font-['Inter'] font-semibold text-[18px] sm:text-[20px] leading-[27px] sm:leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
            My Offers
          </h2>
          <button
            className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={() => navigate("/app/create")}
          >
            Create New Offer
          </button>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          {!offers && <Spin />}
          {offers?.length === 0 && <span className="font-['Inter'] font-normal text-[14px] text-[#6d7175]">{t("No offers found")}</span>}
        </div>

        {/* Desktop Table */}
        {(Array.isArray(offers) && offers?.length > 0) &&
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
              {offers.map((offer) => (
                <tr key={offer.id}>
                  <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      {offer.name}
                      {newOffer === offer.id.toString() && <span
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
                      </span>}
                    </div>
                  </td>
                  <td className="p-[12px] border-b border-[#dfe3e8]">
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Switch
                        checked={offer.status === "ACTIVE"}
                        loading={discountNodeStatusFetcher.state === "submitting"}
                        onChange={(e) => {
                          switchDiscountStatus(
                            {
                              id: offer.id,
                              status: e,
                            }
                          );
                        }}
                      />
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
                      {/* <button
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={() => navigate(`/app/ABtest/${offer.id}`)}
                      title="Analytics"
                    >
                      <ChartBar size={16} />
                    </button> */}
                      <button
                        className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                        title="Edit"
                        onClick={() => navigate(`/app/create?discountGid=${offer.id}`)}
                      >
                        <Pencil size={16} />
                      </button>
                      {/* <button
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="Copy"
                    >
                      <Copy size={16} />
                    </button> */}
                      <button
                        className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[4px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                        title="Delete"
                        onClick={() => deleteOffer({
                          id: offer.id,
                          metafields: [
                            {
                              ownerId: offer.metafields.ownerId,
                              namespace: offer.metafields.namespace,
                              key: offer.metafields.key,
                            }
                          ],
                        })}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }

        {/* Mobile Cards */}
        {(Array.isArray(offers) && offers?.length > 0) &&
          <div className="md:hidden space-y-[12px]">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="border border-[#dfe3e8] rounded-[8px] p-[16px]"
              >
                <div className="flex items-start justify-between mb-[12px]">
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

                <div className="flex items-center gap-[8px] mb-[12px]">
                  <Switch
                    checked={offer.status === "ACTIVE"}
                    loading={discountNodeStatusFetcher.state === "submitting"}
                    onChange={(e) => {
                      switchDiscountStatus(
                        {
                          id: offer.id,
                          status: e,
                        }
                      );
                    }}
                  />
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

                <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                  <div>
                    <div className="text-[12px] text-[#6d7175] mb-[4px]">GMV</div>
                    <div className="text-[14px] font-medium text-[#202223]">
                      {offer.gmv}
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

                <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                  <button
                    className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                    onClick={() => navigate(`/app/ABtest/${offer.id}`)}
                    title="Analytics"
                  >
                    <ChartBar size={18} />
                  </button>
                  <button
                    className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                    title="Edit"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                    title="Copy"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#d72c0d] p-[8px] rounded-[4px] hover:bg-[rgba(215,44,13,0.1)] transition-colors"
                    title="Delete"
                    onClick={() => deleteOffer({
                      id: offer.id,
                      metafields: [
                        {
                          ownerId: offer.metafields.ownerId,
                          namespace: offer.metafields.namespace,
                          key: offer.metafields.key,
                        }
                      ],
                    })}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        }

        {/* View All Button at Bottom */}
        {/* <div className="flex justify-center mt-[16px] sm:mt-[20px] pt-[16px] border-t border-[#dfe3e8]">
          <button
            className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[16px] py-[8px] rounded-[6px]"
            onClick={() => navigate("/app/offers")}
          >
            View All Offers
          </button>
        </div> */}
      </div>

      {/* A/B Tests Card - Full Width */}
      {/* <div className="bg-white rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] p-[16px] sm:p-[20px]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[12px] sm:gap-0 mb-[16px]">
          <h2 className="font-['Inter'] font-semibold text-[18px] sm:text-[20px] leading-[27px] sm:leading-[30px] text-[#202223] tracking-[-0.4492px] m-0">
            A/B Tests
          </h2>
          <button
            className="w-full sm:w-auto bg-[#008060] text-white px-[16px] py-[8px] rounded-[6px] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] border-0 cursor-pointer hover:bg-[#006e52] transition-colors"
            onClick={() => navigate("/app/ABtest/1")}
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
            {abTests.map((test) => (
              <tr key={test.id}>
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-normal text-[14px] leading-[22.4px] text-[#202223] tracking-[-0.1504px]">
                  {test.name}
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Toggle status logic here
                      }}
                      style={{
                        position: "relative",
                        width: "44px",
                        height: "24px",
                        backgroundColor:
                          test.status === "Running" ? "#008060" : "#c4cdd5",
                        border: "none",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "background-color 0.2s",
                        padding: 0,
                      }}
                      title={
                        test.status === "Running"
                          ? "Click to stop"
                          : "Click to start"
                      }
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: "2px",
                          left: test.status === "Running" ? "22px" : "2px",
                          width: "20px",
                          height: "20px",
                          backgroundColor: "white",
                          borderRadius: "50%",
                          transition: "left 0.2s",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                        }}
                      />
                    </button>
                    <span
                      style={{
                        fontSize: "14px",
                        color:
                          test.status === "Running" ? "#108043" : "#6d7175",
                        fontWeight: 500,
                      }}
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
                <td className="p-[12px] border-b border-[#dfe3e8] font-['Inter'] font-semibold text-[14px] leading-[22.4px] tracking-[-0.1504px]">
                  <span
                    style={{
                      color: test.improvement >= 0 ? "#108043" : "#d72c0d",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {test.improvement >= 0 ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    )}
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
                        test.confidence >= 95
                          ? "#108043"
                          : test.confidence >= 80
                            ? "#6d7175"
                            : "#d72c0d",
                      fontWeight: test.confidence >= 95 ? 600 : 400,
                    }}
                  >
                    {test.confidence}%
                  </span>
                </td>
                <td className="p-[12px] border-b border-[#dfe3e8]">
                  <div className="flex items-center gap-[8px]">
                    <button
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      onClick={() => navigate(`/app/ABtest/${test.id}`)}
                      title="View Details"
                    >
                      <ChartBar size={16} />
                    </button>
                    <button
                      className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[4px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
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
          {abTests.map((test) => (
            <div
              key={test.id}
              className="border border-[#dfe3e8] rounded-[8px] p-[16px]"
            >
              <div className="mb-[12px]">
                <span className="font-['Inter'] font-medium text-[16px] text-[#202223]">
                  {test.name}
                </span>
              </div>

              <div className="flex items-center gap-[8px] mb-[12px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  style={{
                    position: "relative",
                    width: "44px",
                    height: "24px",
                    backgroundColor:
                      test.status === "Running" ? "#008060" : "#c4cdd5",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "background-color 0.2s",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: test.status === "Running" ? "22px" : "2px",
                      width: "20px",
                      height: "20px",
                      backgroundColor: "white",
                      borderRadius: "50%",
                      transition: "left 0.2s",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  />
                </button>
                <span
                  style={{
                    fontSize: "14px",
                    color: test.status === "Running" ? "#108043" : "#6d7175",
                    fontWeight: 500,
                  }}
                >
                  {test.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-[12px] mb-[12px]">
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">PV</div>
                  <div className="text-[14px] font-medium text-[#202223]">
                    {test.pv}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">
                    Extra GMV
                  </div>
                  <div className="text-[14px] font-medium text-[#202223]">
                    {test.extraGMV}
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">
                    GMV Improvement
                  </div>
                  <div
                    className={`text-[14px] font-medium ${test.improvement > 0 ? "text-[#108043]" : "text-[#d72c0d]"}`}
                  >
                    {test.improvement > 0 ? "↑" : "↓"}{" "}
                    {Math.abs(test.improvement)}%
                  </div>
                </div>
                <div>
                  <div className="text-[12px] text-[#6d7175] mb-[4px]">
                    Confidence
                  </div>
                  <div className="text-[14px] font-medium text-[#202223]">
                    {test.confidence}%
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-[8px] pt-[12px] border-t border-[#dfe3e8]">
                <button
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  onClick={() => navigate(`/app/ABtest/${test.id}`)}
                  title="View Details"
                >
                  <ChartBar size={18} />
                </button>
                <button
                  className="text-[#6d7175] bg-transparent border-0 cursor-pointer hover:text-[#008060] p-[8px] rounded-[4px] hover:bg-[rgba(0,128,96,0.1)] transition-colors"
                  title="Edit"
                >
                  <Pencil size={18} />
                </button>
                <button
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
            className="text-[#008060] font-['Inter'] font-medium text-[14px] leading-[21px] tracking-[-0.1504px] bg-transparent border-0 cursor-pointer hover:bg-[rgba(0,128,96,0.1)] px-[16px] py-[8px] rounded-[6px]"
            onClick={() => navigate("/app/ABtests")}
          >
            View All A/B Tests
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default Index;
