import type { ShopGraphqlClient } from "~/server/shop/appOnlyAdmin";
import { computeTrialEndsAt } from "./billingState";

const NODE_QUERY = `#graphql
  query BillingSubscriptionNode($id: ID!) {
    node(id: $id) {
      ... on AppSubscription {
        id
        createdAt
        trialDays
        currentPeriodEnd
      }
    }
  }
`;

export async function loadSubscriptionTrial(
  admin: ShopGraphqlClient,
  gid: string,
): Promise<{ trialEndsAt: Date | null; currentPeriodEnd: Date | null }> {
  const empty = { trialEndsAt: null, currentPeriodEnd: null };
  try {
    const response = await admin.graphql(NODE_QUERY, { variables: { id: gid } });
    const json = await response.json();
    const node = json?.data?.node;
    if (!node) return empty;
    const trialEndsAtIso = computeTrialEndsAt(node.createdAt, node.trialDays);
    return {
      trialEndsAt: trialEndsAtIso ? new Date(trialEndsAtIso) : null,
      currentPeriodEnd: node.currentPeriodEnd ? new Date(node.currentPeriodEnd) : null,
    };
  } catch (err) {
    console.warn(`[billing] load subscription trial failed gid=${gid}`, err);
    return empty;
  }
}
