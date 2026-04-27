import type {
  ProductSubscriptionOffering,
  ProductSubscriptionPlan,
  ShopifyAdminClient,
  ShopifyVariantNode,
} from "./shopify-products.server";
import type {
  ProductSubscriptionDiagnostics,
  SubscriptionDiagnosticsSummary,
  SubscriptionDiagnosticIssue,
  SubscriptionPlanDiagnostic,
} from "../lib/subscription-diagnostics";

type SellingPlanGroupSnapshot = {
  id: string;
  appliesToProduct: boolean;
  appliesToProductVariants: boolean;
  sellingPlanIds: string[];
};

const SELLING_PLAN_GROUP_DIAGNOSTIC_QUERY = `#graphql
  query SubscriptionPlanGroupDiagnostic($id: ID!, $productId: ID!) {
    sellingPlanGroup(id: $id) {
      id
      appliesToProduct(productId: $productId)
      appliesToProductVariants(productId: $productId)
      sellingPlans(first: 20) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`;

const SELLING_PLAN_GROUP_VARIANT_QUERY = `#graphql
  query SubscriptionPlanGroupVariantDiagnostic($id: ID!, $productVariantId: ID!) {
    sellingPlanGroup(id: $id) {
      appliesToProductVariant(productVariantId: $productVariantId)
    }
  }
`;

function getStatusFromIssues(
  issues: SubscriptionDiagnosticIssue[],
): SubscriptionPlanDiagnostic["status"] {
  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (issues.length > 0) {
    return "warning";
  }

  return "healthy";
}

function buildSummary(
  plans: SubscriptionPlanDiagnostic[],
): SubscriptionDiagnosticsSummary {
  const healthyPlans = plans.filter((plan) => plan.status === "healthy").length;
  const warningPlans = plans.filter((plan) => plan.status === "warning").length;
  const errorPlans = plans.filter((plan) => plan.status === "error").length;
  const issueCount = plans.reduce((count, plan) => count + plan.issues.length, 0);

  return {
    status:
      errorPlans > 0 ? "error" : warningPlans > 0 ? "warning" : "healthy",
    totalPlans: plans.length,
    healthyPlans,
    warningPlans,
    errorPlans,
    issueCount,
  };
}

async function fetchSellingPlanGroupSnapshot(
  admin: ShopifyAdminClient,
  productId: string,
  sellingPlanGroupId: string,
): Promise<SellingPlanGroupSnapshot | null> {
  const response = await admin.graphql(SELLING_PLAN_GROUP_DIAGNOSTIC_QUERY, {
    variables: {
      id: sellingPlanGroupId,
      productId,
    },
  });
  const json = (await response.json()) as {
    data?: {
      sellingPlanGroup?: {
        id: string;
        appliesToProduct: boolean;
        appliesToProductVariants: boolean;
        sellingPlans?: {
          edges?: Array<{
            node?: {
              id: string;
            };
          }>;
        };
      } | null;
    };
  };

  const group = json.data?.sellingPlanGroup;
  if (!group) {
    return null;
  }

  return {
    id: group.id,
    appliesToProduct: group.appliesToProduct,
    appliesToProductVariants: group.appliesToProductVariants,
    sellingPlanIds:
      group.sellingPlans?.edges
        ?.map((edge) => edge.node?.id)
        .filter((id): id is string => Boolean(id)) ?? [],
  };
}

async function fetchVariantScopeMismatchIds(
  admin: ShopifyAdminClient,
  sellingPlanGroupId: string,
  variantIds: string[],
): Promise<string[]> {
  const mismatchIds: string[] = [];

  for (const variantId of variantIds) {
    const response = await admin.graphql(SELLING_PLAN_GROUP_VARIANT_QUERY, {
      variables: {
        id: sellingPlanGroupId,
        productVariantId: variantId,
      },
    });
    const json = (await response.json()) as {
      data?: {
        sellingPlanGroup?: {
          appliesToProductVariant: boolean;
        } | null;
      };
    };

    if (!json.data?.sellingPlanGroup?.appliesToProductVariant) {
      mismatchIds.push(variantId);
    }
  }

  return mismatchIds;
}

async function buildPlanDiagnostic(
  admin: ShopifyAdminClient,
  productId: string,
  plan: ProductSubscriptionPlan,
): Promise<SubscriptionPlanDiagnostic> {
  const issues: SubscriptionDiagnosticIssue[] = [];

  if (!plan.sellingPlanGroupId || !plan.sellingPlanId) {
    issues.push({
      code: "NOT_BOUND",
      severity: "warning",
      message: "当前方案尚未绑定远端 Selling Plan Group 或 Selling Plan。",
      relatedVariantIds: [],
    });

    return {
      planId: plan.id,
      planName: plan.name,
      status: getStatusFromIssues(issues),
      remoteSellingPlanGroupId: plan.sellingPlanGroupId,
      remoteSellingPlanIds: [],
      issues,
    };
  }

  const snapshot = await fetchSellingPlanGroupSnapshot(
    admin,
    productId,
    plan.sellingPlanGroupId,
  );

  if (!snapshot) {
    issues.push({
      code: "REMOTE_GROUP_MISSING",
      severity: "error",
      message: "当前方案引用的远端 Selling Plan Group 不存在或不可访问。",
      relatedVariantIds: [],
    });

    return {
      planId: plan.id,
      planName: plan.name,
      status: getStatusFromIssues(issues),
      remoteSellingPlanGroupId: plan.sellingPlanGroupId,
      remoteSellingPlanIds: [],
      issues,
    };
  }

  if (!snapshot.sellingPlanIds.includes(plan.sellingPlanId)) {
    issues.push({
      code: "REMOTE_PLAN_MISMATCH",
      severity: "error",
      message: "本地保存的 Selling Plan ID 与远端 Group 中的实际方案不一致。",
      relatedVariantIds: [],
    });
  }

  if (!plan.variantIds || plan.variantIds.length === 0) {
    if (!snapshot.appliesToProduct) {
      issues.push({
        code: "REMOTE_PRODUCT_SCOPE_MISMATCH",
        severity: "warning",
        message: "当前方案应适用于整个商品，但远端 Group 没有直接绑定到该商品。",
        relatedVariantIds: [],
      });
    }
  } else {
    const mismatchIds = await fetchVariantScopeMismatchIds(
      admin,
      plan.sellingPlanGroupId,
      plan.variantIds,
    );

    if (mismatchIds.length > 0) {
      issues.push({
        code: "REMOTE_VARIANT_SCOPE_MISMATCH",
        severity: "error",
        message: "当前方案的部分适用变体没有正确绑定到远端 Selling Plan Group。",
        relatedVariantIds: mismatchIds,
      });
    }
  }

  return {
    planId: plan.id,
    planName: plan.name,
    status: getStatusFromIssues(issues),
    remoteSellingPlanGroupId: snapshot.id,
    remoteSellingPlanIds: snapshot.sellingPlanIds,
    issues,
  };
}

export async function buildProductSubscriptionDiagnostics(
  admin: ShopifyAdminClient,
  productId: string,
  offering: ProductSubscriptionOffering,
  _variants: ShopifyVariantNode[],
): Promise<ProductSubscriptionDiagnostics> {
  const diagnostics = await Promise.all(
    offering.plans.map((plan) => buildPlanDiagnostic(admin, productId, plan)),
  );

  return {
    summary: buildSummary(diagnostics),
    plans: diagnostics,
  };
}
