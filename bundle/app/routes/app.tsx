import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { useEffect, useState } from "react";
import { ConfigProvider, Flex, Spin } from "antd";
import { useTranslation } from "react-i18next";
import { globalStore } from "app/globalStore";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  return {
    shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

export default function App() {
  const { apiKey, shop } = useLoaderData<typeof loader>();
  const { t } = useTranslation();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    globalStore.shop = shop;
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
