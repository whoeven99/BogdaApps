import { AppProvider } from "@shopify/shopify-app-react-router/react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";

import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const errors = loginErrorMessage(await login(request));

  return { errors };
};

export default function Auth() {
  const { errors } = useLoaderData<typeof loader>();
  const title = errors.shop ? "Open the app from Shopify" : "Redirecting to Shopify";
  const description = errors.shop
    ? "This app must be opened from Shopify Admin or the Shopify App Store install flow. Manual shop domain entry is not supported."
    : "Continuing to Shopify authentication...";

  return (
    <AppProvider embedded={false}>
      <s-page>
        <s-section heading={title}>
          <s-text>{description}</s-text>
          {errors.shop ? (
            <s-banner tone="warning">
              <s-text>{errors.shop}</s-text>
            </s-banner>
          ) : null}
        </s-section>
      </s-page>
    </AppProvider>
  );
}
