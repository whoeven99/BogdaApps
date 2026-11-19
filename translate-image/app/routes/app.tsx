import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import { useEffect, useState } from "react";
import {
  json,
  Link,
  Outlet,
  useLoaderData,
  useLocation,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { GoogleAnalyticClickReport } from "~/api/JavaServer";
import { fetchLocalQuota } from "~/api/pictureClient";
import { resolveShouldCreateTestCharge } from "~/server/billing/chargeGuardApply.server";
import { ensureAccount } from "~/server/billing/quota.server";
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
import { mutationAppPurchaseOneTimeCreate } from "~/api/admin.server";
import { ConfigProvider } from "antd";
import { FilesAccessBanner } from "~/lib/FilesAccessBanner";
import { useResumeFilesGrant } from "~/lib/filesAccess";
import { hasWriteFilesScope } from "~/lib/writeFilesScope";
import { bootMark } from "~/server/bootTrace.server";
import { AddCreaditsModal } from "~/routes/app._index/components/addCreditsModal";
import { OPEN_CREDITS_PURCHASE_MODAL_EVENT } from "~/utils/creditsPurchaseModal";

function GlobalCreditsPurchaseModal() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_CREDITS_PURCHASE_MODAL_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CREDITS_PURCHASE_MODAL_EVENT, onOpen);
  }, []);
  return (
    <AddCreaditsModal openModal={open} onClose={() => setOpen(false)} action="images" />
  );
}
export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, scope } = adminAuthResult.session;
  bootMark("app loader", `shop=${shop}`);
  try {
    await ensureAccount(shop);
  } catch (err) {
    console.warn(`[app.loader] billing bootstrap failed shop=${shop}`, err);
  }

  return {
    shop,
    apiKey: process.env.SHOPIFY_API_KEY || "",
    canWriteFiles: hasWriteFilesScope(scope),
  };
};
export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const adminAuthResult = await authenticate.admin(request);
    const { shop } = adminAuthResult.session;
    const sessionEmail = (adminAuthResult.session as { email?: string | null }).email ?? null;
    const { admin } = adminAuthResult;
    const formData = await request.formData();
    const theme = JSON.parse(formData.get("theme") as string);
    const payInfo = JSON.parse(formData.get("payInfo") as string);
    const orderInfo = JSON.parse(formData.get("orderInfo") as string);
    const googleAnalytics = JSON.parse(
      formData.get("googleAnalytics") as string,
    );
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
      }
    }
    if (payInfo) {
      try {
        const returnUrl = new URL(
          payInfo?.action === "quotacard"
            ? `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app`
            : `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/images/${payInfo.productId}/${payInfo.imageId}`,
        );
        const res = await mutationAppPurchaseOneTimeCreate({
          shop,
          name: payInfo.name,
          price: payInfo.price,
          returnUrl,
          test: await resolveShouldCreateTestCharge(shop, sessionEmail),
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
      return json({ data: { skipped: true } });
    }

    if (googleAnalytics) {
      try {
        const { data, eventType, timestamp, name } = googleAnalytics;
        const response = await GoogleAnalyticClickReport(
          { ...data, eventType, timestamp, shopName: shop },
          name,
        );
        return json({
          data: {
            success: response,
            message: `${name} ${eventType} success googleAnalytics`,
          },
        });
      } catch (error) {
        console.error("Error googleAnalytics app:", error);
        return json({
          data: {
            success: false,
            message: "Error googleAnalytics app",
          },
        });
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
  const { apiKey, shop, canWriteFiles } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const location = useLocation();
  useResumeFilesGrant();
  const { plan, chars, totalChars, isNew } = useSelector(
    (state: any) => state.userConfig,
  );

  const applyQuota = async () => {
    const quota = await fetchLocalQuota();
    if (!quota?.success) return;
    dispatch(
      setPlan({
        plan: {
          id: quota?.response?.plan || 1,
          type: quota?.response?.planType || "Free",
          feeType: quota?.response?.feeType || 0,
          isInFreePlanTime: Boolean(quota?.response?.isInFreePlanTime),
        },
      }),
    );
    if (quota?.response?.currentPeriodEnd) {
      const updateTime = new Date(quota.response.currentPeriodEnd)
        .toLocaleDateString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })
        .replace(/\//g, "-");
      dispatch(setUpdateTime({ updateTime }));
    }
    dispatch(setChars({ chars: quota?.response?.usedPoints }));
    dispatch(
      setTotalChars({
        totalChars: quota?.response?.purchasePoints,
      }),
    );
    dispatch(setIsNew({ isNew: !quota?.response?.hasUsedTrial }));
    dispatch(setUserConfigIsLoading({ isLoading: false }));
  };

  useEffect(() => {
    globalStore.shop = shop as string;
    void applyQuota();
  }, []);
  useEffect(() => {
    if (!plan?.id || !chars || !totalChars || isNew === null) {
      void applyQuota();
    }
  }, [location]);
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
          {/* <Link to="/app/management">Image Manage</Link> */}
          <Link to="/app/article">{t("Article images")}</Link>
          <Link to="/app/product">{t("Product images")}</Link>
          <Link to="/app/page">{t("Page images")}</Link>
          <Link to="/app/collection">{t("Collection images")}</Link>
          <Link to="/app/file">{t("Other images")}</Link>
          <Link to="/app/theme">{t("Theme images")}</Link>
          <Link to="/app/third-party">{t("Third-party images")}</Link>
          {/* <Link to="/app/management">{t("Managements")}</Link> */}
          <Link to="/app/pricing">{t("Pricing")}</Link>
        </NavMenu>
        {!canWriteFiles ? (
          <div style={{ padding: 16 }}>
            <FilesAccessBanner apiKey={apiKey} shop={shop} />
          </div>
        ) : null}
        <Outlet />
        <GlobalCreditsPurchaseModal />
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
