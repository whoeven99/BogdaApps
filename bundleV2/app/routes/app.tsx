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

import { authenticate } from "../shopify.server";

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
            server: process.env.SHOPIFY_APP_URL || "",
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

  try {
    await ensureWebPixel(admin, session.shop);
  } catch (error) {
    console.error("Failed to ensure web pixel exists", error);
  }

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent !== "ensure-web-pixel") {
    return Response.json({ ok: false, error: "unknown-intent" }, { status: 400 });
  }

  try {
    await ensureWebPixel(admin, session.shop);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Failed to ensure web pixel exists in action", error);
    return Response.json({ ok: false, error: "ensure-failed" }, { status: 500 });
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const ensureWebPixelFetcher = useFetcher<{ ok: boolean; error?: string }>();

  useEffect(() => {
    ensureWebPixelFetcher.submit(
      { intent: "ensure-web-pixel" },
      { method: "POST" },
    );
  }, []);

  return (
    <AppProvider embedded apiKey={apiKey}>
      <ConfigProvider theme={{ token: { colorPrimary: "#008060" } }}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/additional">Additional page</s-link>
      </s-app-nav>
      <Outlet />
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
