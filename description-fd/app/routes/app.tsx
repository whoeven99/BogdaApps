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
import axios from "axios";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setUserConfigLanguage } from "app/store/modules/userConfig";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { session, admin } = adminAuthResult;
  const shopName = session?.shop;
  try {
    const response = await admin.graphql(
      `#graphql
      query {
        shop {
          shopOwnerName
          email
        }
      }`,
    );

    const data = await response.json();

    const graphqlData = data.data.shop;

    await axios.post(
      `${process.env.SERVER_URL}/apg/users/insertOrUpdateApgUser?shopName=${shopName}`,
      {
        shopName: shopName,
        accessToken: session?.accessToken,
        email: graphqlData.email,
        firstName: graphqlData.shopOwnerName.split(" ")[0],
        lastName: graphqlData.shopOwnerName.split(" ")[1],
      },
    );

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
