import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { useEffect } from "react";
import {
  json,
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useLocation,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import {
  GetUnTranslatedWords,
  GetUserSubscriptionPlan,
  GetUserWords,
  InsertOrUpdateOrder,
  storageTranslateImage,
  UserAdd,
} from "~/api/JavaServer";
import { globalStore } from "~/globalStore";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  setChars,
  setIsNew,
  setPlan,
  setShop,
  setTotalChars,
  setUpdateTime,
  setUserConfigIsLoading,
} from "~/store/modules/userConfig";
import { mutationAppPurchaseOneTimeCreate } from "~/api/admin";
import { ConfigProvider } from "antd";
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;

  return {
    shop,
    server: process.env.SERVER_URL,
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const adminAuthResult = await authenticate.admin(request);
    console.log("Auth result:", adminAuthResult);
    const { shop, accessToken } = adminAuthResult.session;
    // console.log("accessToken: ",accessToken);

    const { admin } = adminAuthResult;
    const formData = await request.formData();
    const init = JSON.parse(formData.get("init") as string);
    const theme = JSON.parse(formData.get("theme") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);
    if (init) {
      try {
        const response = await UserAdd({
          shop,
          accessToken: accessToken as string,
        });
        return json({ response });
      } catch (error) {
        console.error("Error loading app:", error);
        return json({
          success: false,
          response: null,
        });
      }
    }
    if (theme) {
      try {
        const response = await admin.graphql(
          `#graphql
            query {
              themes(roles: MAIN, first: 1) {
                nodes {
                  files(filenames: "config/settings_data.json") { 
                    nodes {
                      body {
                        ... on OnlineStoreThemeFileBodyText {
                          __typename
                          content
                        }
                      }
                    }
                  }
                }
              }
            }`,
        );
        const data = await response.json();
        const response1 = await admin.graphql(`#graphql
          query {
            appInstallation {
              id
              launchUrl
              uninstallUrl
              activeSubscriptions {
                id
              }
              accessScopes {
                handle
              }
            }
          }
        `);
        const result = await response1.json();
        console.log("11111 result : ", result);

        return json({ data: data.data.themes, result });
      } catch (error) {
        console.log("graphql error theme", error);

        return json({
          success: false,
          response: null,
        });
        console.error("Error theme currency:", error);
      }
    }
    if (payInfo) {
      try {
        // console.log("sjdaskdi: ", payInfo);

        const returnUrl = new URL(
          payInfo?.action === "quotacard"
            ? `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app`
            : `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/images/${payInfo.productId}/${payInfo.imageId}`,
        );
        const res = await mutationAppPurchaseOneTimeCreate({
          shop,
          accessToken: accessToken as string,
          name: payInfo.name,
          price: payInfo.price,
          returnUrl,
          test:
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test",
        });
        return json({
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: res?.data,
        });
      } catch (error) {
        console.error("Error payInfo app:", error);
        return json({
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        });
      }
    }

    if (orderInfo) {
      try {
        const orderData = await InsertOrUpdateOrder({
          shop,
          id: orderInfo.id,
          amount: orderInfo.amount,
          name: orderInfo.name,
          createdAt: orderInfo.createdAt,
          status: orderInfo.status,
          confirmationUrl: orderInfo.confirmationUrl,
        });
        return json({ data: orderData });
      } catch (error) {
        console.error("Error orderInfo app:", error);
        return json({ error: "Error orderInfo app" }, { status: 500 });
      }
    }

    return json({
      success: false,
      message: "Invalid data",
    });
  } catch (error) {
    console.log("Error app action: ", error);
    return { error: "Error app action", status: 500, errorMsg: error };
  }
};
export default function App() {
  const { apiKey, shop, server } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  const initFetcher = useFetcher<any>();
  useEffect(() => {
    initFetcher.submit(
      { init: JSON.stringify(true) },
      {
        method: "post",
        action: "/app",
      },
    );
    globalStore.shop = shop as string;
    globalStore.server = server as string;
  }, []);
  useEffect(() => {
    if (initFetcher.data) {
      getWords();
    }
  }, [initFetcher.data]);
  useEffect(() => {
    getWords();
  }, [location]); // 监听 URL 的变化
  const getWords = async () => {
    const data = await GetUserWords({
      shop,
      server: server as string,
    });
    
    if (data?.success) {
      dispatch(setChars({ chars: data?.response?.usedPoints }));
      dispatch(
        setTotalChars({
          totalChars: data?.response?.purchasePoints,
        }),
      );
      dispatch(setUserConfigIsLoading({ isLoading: false }));
    }
  };
  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "var(--p-color-bg-fill-brand)",
          },
          components: {
            Table: {
              rowSelectedBg: "rgba(217, 217, 217, 0.7)",
              rowSelectedHoverBg: "rgba(217, 217, 217, 0.7)",
            },
            Button: {
              primaryShadow: "none",
            },
            Select: {
              optionSelectedBg: "rgba(217, 217, 217, 0.7)",
            },
            Menu: {
              itemSelectedBg: "rgba(217, 217, 217, 0.7)",
            },
            Card: {
              headerHeight: 42,
            },
          },
        }}
      >
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          <Link to="/app/article">Article Image Translate</Link>
          {/* <Link to="/app/pricing">Pricing</Link> */}
        </NavMenu>
        <Outlet />
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
