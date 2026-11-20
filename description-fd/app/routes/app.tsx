import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "@remix-run/node";
import {
  Link,
  Outlet,
  useFetcher,
  useLoaderData,
  useRouteError,
} from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { useEffect } from "react";
import { ensureAccount } from "app/server/billing/ensureAccount.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  await ensureAccount(session.shop);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { session } = adminAuthResult;
  try {
    await ensureAccount(session.shop);
    return {
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: null,
    };
  } catch (error) {
    return {
      success: false,
      errorCode: 1,
      errorMsg: "Failed to get primary language",
      response: null,
    };
  }
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  // const dispatch = useDispatch();
  const initFetcher = useFetcher<any>();

  useEffect(() => {
    initFetcher.submit(null, {
      method: "POST",
    });
  }, []);

  // useEffect(() => {
  //   if (initFetcher.data?.success) {
  //     dispatch(setUserConfigLanguage(initFetcher.data.response));
  //   }
  // }, [initFetcher.data]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          Home
        </Link>
        <Link to="/app/batchGeneration">Batch Generation</Link>
        <Link to="/app/template">Template</Link>
        <Link to="/app/pricing">Pricing</Link>
      </NavMenu>
      <Outlet />
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
