import { getShopAdminGraphql, hasAppOnlyCredentials } from "../shopify/shopAdminToken.server";

const LOG = "[billing uninstall]";

const LIST_ACTIVE_SUBSCRIPTIONS = `#graphql
  query ActiveAppSubscriptions {
    currentAppInstallation {
      activeSubscriptions {
        id
        status
      }
    }
  }
`;

const CANCEL_SUBSCRIPTION = `#graphql
  mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
    appSubscriptionCancel(id: $id, prorate: $prorate) {
      userErrors {
        field
        message
      }
      appSubscription {
        id
        status
      }
    }
  }
`;

type ListedSubscription = { id?: string | null; status?: string | null };

export function parseActiveSubscriptionIds(json: unknown): string[] {
  const data = json as {
    data?: { currentAppInstallation?: { activeSubscriptions?: ListedSubscription[] | null } };
  };
  const rows = data?.data?.currentAppInstallation?.activeSubscriptions;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => (typeof row?.id === "string" ? row.id.trim() : ""))
    .filter(Boolean);
}

export async function cancelShopifySubscriptionsBestEffort(shop: string): Promise<void> {
  if (!hasAppOnlyCredentials()) {
    console.warn(`${LOG} skip cancel, missing app-only credentials shop=${shop}`);
    return;
  }
  try {
    const graphql = await getShopAdminGraphql(shop, { allowDeletedAccount: true });
    const listed = await graphql(LIST_ACTIVE_SUBSCRIPTIONS);
    const ids = parseActiveSubscriptionIds(await listed.json());
    for (const id of ids) {
      const response = await graphql(CANCEL_SUBSCRIPTION, {
        variables: { id, prorate: true },
      });
      const body = (await response.json()) as {
        data?: { appSubscriptionCancel?: { userErrors?: Array<{ message?: string }> } };
      };
      const userErrors = body?.data?.appSubscriptionCancel?.userErrors;
      if (Array.isArray(userErrors) && userErrors.length > 0) {
        console.warn(`${LOG} Shopify cancel userErrors shop=${shop}:`, userErrors);
        continue;
      }
      console.log(`${LOG} Shopify cancel ok shop=${shop} id=${id}`);
    }
  } catch (error) {
    console.error(`${LOG} Shopify cancel failed shop=${shop}:`, error);
  }
}
