import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Outlet, useFetcher, useLoaderData, useRouteError } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { ConfigProvider } from "antd";

import {
  authenticate,
  ensureBundleDeliveryAutomaticDiscount,
  ensureCartLinesAutomaticDiscount,
} from "../shopify.server";
import { sanitizeEnvLikeValue, sanitizeUrlLikeEnvValue } from "../utils/env";

const ensureWebPixel = async (admin: any, shop: string) => {
  let currentWebPixelId: string | undefined;

  try {
    const queryResponse = await admin.graphql(
      `#graphql
        query CurrentWebPixel {
          webPixel {
            id
          }
        }
      `,
    );
    const queryJson = await queryResponse.json();
    currentWebPixelId = queryJson?.data?.webPixel?.id as string | undefined;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : JSON.stringify(error);
    if (!errorMessage.includes("No web pixel was found for this app")) {
      throw error;
    }
    currentWebPixelId = undefined;
  }

  console.log("[web-pixel] query result", {
    shop,
    currentWebPixelId,
  });

  if (currentWebPixelId) return;

  const createResponse = await admin.graphql(
    `#graphql
      mutation WebPixelCreate($webPixel: WebPixelInput!) {
        webPixelCreate(webPixel: $webPixel) {
          userErrors {
            field
            message
            code
          }
          webPixel {
            id
            settings
          }
        }
      }
    `,
    {
      variables: {
        webPixel: {
          settings: {
            shopName: shop,
            server: sanitizeUrlLikeEnvValue(process.env.SHOPIFY_APP_URL),
          },
        },
      },
    },
  );
  const createJson = await createResponse.json();
  const createResult = createJson?.data?.webPixelCreate;
  const userErrors = createResult?.userErrors || [];

  if (userErrors.length > 0) {
    console.error("[web-pixel] create userErrors", { shop, userErrors });
    return;
  }

  console.log("[web-pixel] created", {
    shop,
    id: createResult?.webPixel?.id,
  });
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // 获取商店的时区信息
  let ianaTimezone = "UTC";
  try {
    const tzResponse = await admin.graphql(
      `#graphql
        query ShopTimezone {
          shop {
            ianaTimezone
          }
        }
      `,
    );
    const tzJson = await tzResponse.json();
    if (tzJson?.data?.shop?.ianaTimezone) {
      ianaTimezone = tzJson.data.shop.ianaTimezone;
    }
  } catch (error) {
    console.error("Failed to fetch shop timezone", error);
  }

  // eslint-disable-next-line no-undef
  return {
    apiKey: sanitizeEnvLikeValue(process.env.SHOPIFY_API_KEY),
    ianaTimezone,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent !== "ensure-app-runtime-resources") {
    return Response.json({ ok: false, error: "unknown-intent" }, { status: 400 });
  }

  try {
    await ensureWebPixel(admin, session.shop);
  } catch (error) {
    console.error("Failed to ensure web pixel exists in action", error);
    return Response.json(
      { ok: false, error: "ensure-web-pixel-failed" },
      { status: 500 },
    );
  }

  try {
    await ensureCartLinesAutomaticDiscount(admin);
  } catch (error) {
    console.error("Failed to ensure automatic app discount exists in action", error);
    return Response.json(
      { ok: false, error: "ensure-cart-discount-failed" },
      { status: 500 },
    );
  }

  try {
    await ensureBundleDeliveryAutomaticDiscount(admin);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to ensure shipping automatic app discount exists in action", error);
    return Response.json(
      { ok: false, error: "ensure-shipping-discount-failed" },
      { status: 500 },
    );
  }
};

export default function App() {
  const { apiKey, ianaTimezone } = useLoaderData<typeof loader>();
  const ensureWebPixelFetcher = useFetcher<{ ok: boolean; error?: string }>();

  useEffect(() => {
    ensureWebPixelFetcher.submit(
      { intent: "ensure-app-runtime-resources" },
      { method: "POST" },
    );
  }, [ensureWebPixelFetcher]);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#008060",
            colorPrimaryHover: "#006e52",
            colorPrimaryActive: "#005c43",
            colorLink: "#008060",
            colorLinkHover: "#006e52",
            colorLinkActive: "#005c43",
          },
        }}
      >
      <s-app-nav>
        <s-link href="/app">Bundle V2</s-link>
      </s-app-nav>
      <Outlet context={{ ianaTimezone }} />
    </ConfigProvider>
    </AppProvider>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  const error = useRouteError();
  console.error("App boundary error:", error);
  return boundary.error(error);
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
