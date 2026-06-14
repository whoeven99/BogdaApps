import {
  formatSubscriptionPreviewInterval,
  parseSubscriptionPreviewMoney,
  resolveSubscriptionPreviewPricing,
  type SubscriptionPreviewPlan,
  type SubscriptionPreviewPolicyNode,
} from "../../../server/shopify/subscriptionPreview.server";

type AdminType = {
  graphql: (
    query: string,
    opts?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
};

const GET_PRODUCT_SUBSCRIPTION_QUERY = `#graphql
  query GetProductSubscriptionStatus($id: ID!) {
    product(id: $id) {
      id title requiresSellingPlan
      variants(first: 1) { edges { node { price } } }
      sellingPlanGroups(first: 10) {
        edges {
          node {
            id name
            sellingPlans(first: 10) {
              edges {
                node {
                  id name options
                  billingPolicy {
                    ... on SellingPlanRecurringBillingPolicy { interval intervalCount }
                  }
                  pricingPolicies {
                    ... on SellingPlanFixedPricingPolicy {
                      adjustmentType
                      adjustmentValue {
                        ... on MoneyV2 { amount currencyCode }
                        ... on SellingPlanPricingPolicyPercentageValue { percentage }
                      }
                    }
                    ... on SellingPlanRecurringPricingPolicy {
                      afterCycle adjustmentType
                      adjustmentValue {
                        ... on MoneyV2 { amount currencyCode }
                        ... on SellingPlanPricingPolicyPercentageValue { percentage }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

export async function handleGetProductSubscription(
  admin: AdminType,
  productId: string,
): Promise<Response> {
  if (!productId) {
    return Response.json({ ok: false as const, error: "Missing product ID" }, { status: 400 });
  }

  try {
    const response = await admin.graphql(GET_PRODUCT_SUBSCRIPTION_QUERY, {
      variables: { id: productId },
    });
    const json = (await response.json()) as {
      data?: {
        product?: {
          id?: string;
          title?: string;
          requiresSellingPlan?: boolean;
          variants?: { edges?: Array<{ node?: { price?: string | null } }> };
          sellingPlanGroups?: {
            edges?: Array<{
              node?: {
                id?: string;
                name?: string;
                sellingPlans?: {
                  edges?: Array<{
                    node?: {
                      id?: string;
                      name?: string;
                      options?: Array<string | null> | null;
                      billingPolicy?: { interval?: string | null; intervalCount?: number | null } | null;
                      pricingPolicies?: Array<SubscriptionPreviewPolicyNode | null> | null;
                    } | null;
                  }>;
                } | null;
              } | null;
            }>;
          };
        } | null;
      };
      errors?: unknown;
    };

    if (json.errors) {
      console.error("GraphQL errors fetching product subscription status:", json.errors);
    }

    const product = json.data?.product;
    const variantBasePrice = parseSubscriptionPreviewMoney(
      product?.variants?.edges?.[0]?.node?.price,
    );
    const sellingPlanGroupNodes =
      product?.sellingPlanGroups?.edges
        ?.map((edge) => edge?.node)
        .filter((node): node is NonNullable<typeof node> => !!node) ?? [];

    const sellingPlanGroups = sellingPlanGroupNodes.map((group) => ({
      id: group.id,
      name: group.name,
    }));

    const previewPlans = sellingPlanGroupNodes
      .flatMap((group) => group.sellingPlans?.edges ?? [])
      .map((edge) => edge?.node)
      .filter((node): node is NonNullable<typeof node> => !!node)
      .map((sellingPlan): SubscriptionPreviewPlan | null => {
        const previewPricing = resolveSubscriptionPreviewPricing(
          variantBasePrice,
          (sellingPlan.pricingPolicies ?? []).filter(
            (p): p is SubscriptionPreviewPolicyNode => !!p,
          ),
        );
        if (!previewPricing) return null;
        return {
          sellingPlanId: sellingPlan.id ?? "",
          sellingPlanName:
            sellingPlan.name ||
            sellingPlan.options?.filter(Boolean).join(" / ") ||
            "Subscription plan",
          billingLabel: formatSubscriptionPreviewInterval(
            sellingPlan.billingPolicy?.interval,
            sellingPlan.billingPolicy?.intervalCount,
          ),
          ...previewPricing,
        };
      })
      .filter((plan): plan is SubscriptionPreviewPlan => !!plan);

    return Response.json({
      ok: true as const,
      product: {
        id: product?.id ?? productId,
        title: product?.title ?? "",
        requiresSellingPlan: product?.requiresSellingPlan === true,
        sellingPlanGroups,
        hasSubscription: product?.requiresSellingPlan === true || sellingPlanGroups.length > 0,
        previewPlans,
      },
    });
  } catch (error) {
    console.error("Failed to fetch product subscription status", error);
    return Response.json(
      { ok: false as const, error: "Failed to fetch product subscription status" },
      { status: 500 },
    );
  }
}
