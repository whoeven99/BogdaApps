import type { ShopifyAdminClient } from "./shopify-products.server";

export type SubscriptionContractStatus =
  | "ACTIVE"
  | "PAUSED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED"
  | "ALL";

export type SubscriptionContractLine = {
  id: string;
  productId?: string;
  title: string;
  quantity: number;
};

export type SubscriptionBillingAttempt = {
  id: string;
  ready: boolean;
  orderId?: string;
  errorMessage?: string;
  errorCode?: string;
};

export type SubscriptionContractView = {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    displayName: string;
  };
  lines: SubscriptionContractLine[];
  billingAttempts: SubscriptionBillingAttempt[];
};

type SubscriptionContractsQueryResult = {
  data?: {
    subscriptionContracts?: {
      nodes?: Array<{
        id: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        customer?: {
          id: string;
          displayName: string;
        } | null;
        lines?: {
          edges?: Array<{
            node?: {
              id: string;
              productId?: string | null;
              title: string;
              quantity: number;
            };
          }>;
        };
        billingAttempts?: {
          edges?: Array<{
            node?: {
              id: string;
              ready: boolean;
              order?: {
                id: string;
              } | null;
              errorMessage?: string | null;
              errorCode?: string | null;
            };
          }>;
        };
      }>;
    };
  };
};

const SUBSCRIPTION_CONTRACTS_QUERY = `#graphql
  query SubscriptionContractsDashboard($first: Int!, $query: String) {
    subscriptionContracts(first: $first, query: $query, sortKey: CREATED_AT, reverse: true) {
      nodes {
        id
        status
        createdAt
        updatedAt
        customer {
          id
          displayName
        }
        lines(first: 5) {
          edges {
            node {
              id
              productId
              title
              quantity
            }
          }
        }
        billingAttempts(first: 5, reverse: true) {
          edges {
            node {
              id
              ready
              order {
                id
              }
              errorMessage
              errorCode
            }
          }
        }
      }
    }
  }
`;

function buildSubscriptionContractsQuery(input?: {
  status?: SubscriptionContractStatus;
}) {
  if (!input?.status || input.status === "ALL") {
    return undefined;
  }

  return `status:${input.status}`;
}

function mapSubscriptionContract(contract: {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    displayName: string;
  } | null;
  lines?: {
    edges?: Array<{
      node?: {
        id: string;
        productId?: string | null;
        title: string;
        quantity: number;
      };
    }>;
  };
  billingAttempts?: {
    edges?: Array<{
      node?: {
        id: string;
        ready: boolean;
        order?: {
          id: string;
        } | null;
        errorMessage?: string | null;
        errorCode?: string | null;
      };
    }>;
  };
}): SubscriptionContractView {
  return {
    id: contract.id,
    status: contract.status,
    createdAt: contract.createdAt,
    updatedAt: contract.updatedAt,
    customer: contract.customer ?? undefined,
    lines:
      contract.lines?.edges
        ?.map((edge) => edge.node)
        .filter(
          (
            line,
          ): line is {
            id: string;
            productId?: string | null;
            title: string;
            quantity: number;
          } => Boolean(line),
        )
        .map((line) => ({
          id: line.id,
          productId: line.productId ?? undefined,
          title: line.title,
          quantity: line.quantity,
        })) ?? [],
    billingAttempts:
      contract.billingAttempts?.edges
        ?.map((edge) => edge.node)
        .filter(
          (
            attempt,
          ): attempt is {
            id: string;
            ready: boolean;
            order?: {
              id: string;
            } | null;
            errorMessage?: string | null;
            errorCode?: string | null;
          } => Boolean(attempt),
        )
        .map((attempt) => ({
          id: attempt.id,
          ready: attempt.ready,
          orderId: attempt.order?.id ?? undefined,
          errorMessage: attempt.errorMessage ?? undefined,
          errorCode: attempt.errorCode ?? undefined,
        })) ?? [],
  };
}

export async function listSubscriptionContracts(
  admin: ShopifyAdminClient,
  input?: {
    status?: SubscriptionContractStatus;
    limit?: number;
  },
): Promise<SubscriptionContractView[]> {
  const response = await admin.graphql(SUBSCRIPTION_CONTRACTS_QUERY, {
    variables: {
      first: input?.limit ?? 20,
      query: buildSubscriptionContractsQuery(input),
    },
  });
  const json = (await response.json()) as SubscriptionContractsQueryResult;

  return (
    json.data?.subscriptionContracts?.nodes?.map(mapSubscriptionContract) ?? []
  );
}

export function summarizeSubscriptionContracts(
  contracts: SubscriptionContractView[],
) {
  return contracts.reduce(
    (summary, contract) => {
      summary.total += 1;
      summary[contract.status] = (summary[contract.status] ?? 0) + 1;
      summary.billingAttemptCount += contract.billingAttempts.length;
      summary.failedBillingAttemptCount += contract.billingAttempts.filter(
        (attempt) => Boolean(attempt.errorCode || attempt.errorMessage),
      ).length;
      return summary;
    },
    {
      total: 0,
      ACTIVE: 0,
      PAUSED: 0,
      FAILED: 0,
      CANCELLED: 0,
      EXPIRED: 0,
      billingAttemptCount: 0,
      failedBillingAttemptCount: 0,
    } as Record<string, number>,
  );
}
