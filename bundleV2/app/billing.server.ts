/**
 * Shopify App Billing — Admin GraphQL（仅服务器使用）。
 * @see https://shopify.dev/docs/apps/launch/billing/subscription-billing
 */

import { billingIsTestCharge } from "./billing";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchActiveSubscriptions(admin: any): Promise<
  Array<{ name: string; status: string }>
> {
  const response = await admin.graphql(
    `#graphql
      query BillingActiveSubscriptions {
        currentAppInstallation {
          activeSubscriptions {
            name
            status
          }
        }
      }
    `,
  );
  const json = (await response.json()) as {
    data?: {
      currentAppInstallation?: {
        activeSubscriptions?: Array<{ name?: string; status?: string }>;
      };
    };
    errors?: Array<{ message?: string }>;
  };
  if (json.errors?.length) {
    console.error("[billing] activeSubscriptions query errors", json.errors);
    return [];
  }
  const list = json.data?.currentAppInstallation?.activeSubscriptions ?? [];
  return list
    .filter((s) => s?.name && s?.status)
    .map((s) => ({ name: String(s.name), status: String(s.status) }));
}

const DEFAULT_CURRENCY = "USD";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createRecurringSubscription(
  admin: any,
  input: {
    name: string;
    amount: number;
    interval: "EVERY_30_DAYS" | "ANNUAL";
    returnUrl: string;
    trialDays: number;
    currencyCode?: string;
  },
): Promise<
  | { ok: true; confirmationUrl: string; shopifySubscriptionId: string | null }
  | { ok: false; error: string }
> {
  const currencyCode = input.currencyCode ?? DEFAULT_CURRENCY;
  const test = billingIsTestCharge();

  const response = await admin.graphql(
    `#graphql
      mutation AppSubscriptionCreate(
        $name: String!
        $returnUrl: URL!
        $lineItems: [AppSubscriptionLineItemInput!]!
        $test: Boolean
        $trialDays: Int
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          lineItems: $lineItems
          test: $test
          trialDays: $trialDays
        ) {
          confirmationUrl
          userErrors {
            field
            message
          }
          appSubscription {
            id
          }
        }
      }
    `,
    {
      variables: {
        name: input.name,
        returnUrl: input.returnUrl,
        test,
        trialDays: input.trialDays,
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: {
                  amount: input.amount,
                  currencyCode,
                },
                interval: input.interval,
              },
            },
          },
        ],
      },
    },
  );

  const json = (await response.json()) as {
    data?: {
      appSubscriptionCreate?: {
        confirmationUrl?: string | null;
        userErrors?: Array<{ message?: string }>;
        appSubscription?: { id?: string | null } | null;
      };
    };
    errors?: Array<{ message?: string }>;
  };

  if (json.errors?.length) {
    return {
      ok: false,
      error: json.errors.map((e) => e.message || "unknown").join("; "),
    };
  }

  const payload = json.data?.appSubscriptionCreate;
  const userErrors = payload?.userErrors ?? [];
  if (userErrors.length > 0) {
    return {
      ok: false,
      error: userErrors.map((e) => e.message || "unknown").join("; "),
    };
  }

  const confirmationUrl = payload?.confirmationUrl;
  if (!confirmationUrl) {
    return { ok: false, error: "No confirmation URL returned." };
  }

  const shopifySubscriptionId =
    payload?.appSubscription?.id != null
      ? String(payload.appSubscription.id)
      : null;

  return { ok: true, confirmationUrl, shopifySubscriptionId };
}
