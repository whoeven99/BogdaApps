import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useFetcher, useLoaderData, useLocation, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { useCallback, useEffect, useState } from "react";
import { ConfigProvider, Flex, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { globalStore } from "app/globalStore";
import { mutationWebPixelCreate, queryShop, queryWebpixer } from "app/api/admin";
import { BatchQueryUserDiscount, InitUser } from "app/api/javaServer";
import { setOffersData } from "app/store/modules/offersData";
import { useDispatch } from "react-redux";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  return {
    shop,
    server: process.env.SERVER_URL || "",
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;

  const formData = await request.formData();

  const shopRequestBody = JSON.parse(
    formData.get("shopRequestBody") as string,
  );
  const webpixerRequestBody = JSON.parse(
    formData.get("webpixerRequestBody") as string,
  );

  switch (true) {
    case !!shopRequestBody:
      const shopData = await queryShop({
        ...shopRequestBody,
        shop,
        accessToken,
      });

      if (shopData) {
        const shopEmail = shopData?.shop?.email;
        const shopOwnerName = shopData?.shop?.shopOwnerName;
        const lastSpaceIndex = shopOwnerName.lastIndexOf(" ");
        const firstName = shopOwnerName.substring(0, lastSpaceIndex);
        const lastName = shopOwnerName.substring(lastSpaceIndex + 1);

        const initUserData = await InitUser({
          shopName: shop,
          accessToken: accessToken || "",
          email: shopEmail || "",
          userTag: shopOwnerName || "",
          firstName: firstName || "",
          lastName: lastName || "",
        });

        return initUserData;
      }

      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      }
    case !!webpixerRequestBody:
      const queryWebpixerData = await queryWebpixer({
        shop,
        accessToken: accessToken || "",
      });

      if (queryWebpixerData?.webPixel) {
        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: queryWebpixerData,
        }
      } else {
        const webpixerData = await mutationWebPixelCreate({
          shop,
          accessToken: accessToken || "",
          variables: {
            webPixel: {
              settings: {
                shopName: shop,
                server: process.env.SHOPIFY_APP_URL || "",
              }
            }
          }
        });

        if (webpixerData) {
          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: webpixerData,
          }
        }
      }

      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      }
    default:
      console.error(`${shop} Request with unrecognized key: `, formData);
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      }
  }
};

export default function App() {
  const { apiKey, shop, server } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const initFetcher = useFetcher<any>();
  const webpixerInitFetcher = useFetcher<any>();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    globalStore.shop = shop;
    globalStore.server = server;
    batchQueryUserDiscount()
    initFetcher.submit({ shopRequestBody: JSON.stringify({}) }, { method: "POST" });
    webpixerInitFetcher.submit({ webpixerRequestBody: JSON.stringify({}) }, { method: "POST" });
    setIsClient(true);
  }, []);

  const batchQueryUserDiscount = useCallback(async () => {
    const batchQueryUserDiscountData = await BatchQueryUserDiscount({
      shopName: shop,
      server: server,
    });

    if (batchQueryUserDiscountData.success) {
      const data = batchQueryUserDiscountData.response?.map((item: any) => (
        {
          id: item?.discountGid,
          name: item?.basic_information?.displayName,
          status: item?.status,
          metafields: item?.metafields,
          gmv: "",
          conversion: "",
          exposurePV: "",
          addToCartPV: "",
        }
      ))
      dispatch(setOffersData(data));
    }
  }, []);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "rgb(0, 128, 96)",
          },
        }}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          {/* <Link to="/app/offers">{t("All Offers")}</Link>
          <Link to="/app/pricing">{t("Pricing")}</Link> */}
        </NavMenu>
        {isClient ? (
          <>
            <Navigation />
            <Outlet />
          </>
        ) : (
          <Flex
            align="center"
            justify="center"
            style={{
              height: "100vh",
            }}
          >
            <Spin />
          </Flex>
        )}
      </ConfigProvider>
    </AppProvider>
  );
}

function Navigation() {
  const location = useLocation();

  return (
    <nav className="bg-white flex flex-col sm:flex-row gap-[8px] sm:gap-[16px] items-stretch sm:items-start pb-0 px-[16px] pt-[16px] rounded-[8px]">
      <Link
        to="/app"
        className={`rounded-[4px] px-[12px] py-[7px] no-underline text-center sm:text-left ${location.pathname === '/app' ? '!bg-[#f4f6f8]' : ''
          }`}
      >
        <span className="font-['Inter'] font-normal leading-[25.6px] text-[#202223] text-[16px] tracking-[-0.3125px]">
          Dashboard
        </span>
      </Link>
      <Link
        to="/app/offers"
        className={`rounded-[4px] px-[12px] py-[7px] no-underline text-center sm:text-left ${location.pathname === '/app/offers' ? '!bg-[#f4f6f8]' : ''
          }`}
      >
        <span className="font-['Inter'] font-normal leading-[25.6px] text-[#202223] text-[#202223] text-[16px] tracking-[-0.3125px]">
          All Offers
        </span>
      </Link>
    </nav>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
