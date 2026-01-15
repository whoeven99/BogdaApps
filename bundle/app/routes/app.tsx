import type { ActionFunctionArgs, HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useFetcher, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";
import { ConfigProvider, Flex, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { globalStore } from "app/globalStore";
import { queryShop } from "app/api/admin";
import { InitUser } from "app/api/javaServer";

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

  const initFetcher = useFetcher<any>();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    globalStore.shop = shop;
    globalStore.server = server;
    initFetcher.submit({ shopRequestBody: JSON.stringify({}) }, { method: "POST" });
    setIsClient(true);
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
          <Outlet />
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

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
