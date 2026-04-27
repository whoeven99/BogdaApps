import type {
  ProductSubscriptionPlan,
  ShopifyAdminClient,
} from "./shopify-products.server";
import {
  fetchShopifyProduct,
  serializeSubscriptionPlans,
  toSubscriptionOffering,
} from "./shopify-products.server";

const METAFIELDS_SET_MUTATION = `#graphql
  mutation UpdateProductSubscriptionPlans($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const SELLING_PLAN_GROUP_CREATE_MUTATION = `#graphql
  mutation CreateSellingPlanGroup(
    $input: SellingPlanGroupInput!
    $resources: SellingPlanGroupResourceInput
  ) {
    sellingPlanGroupCreate(input: $input, resources: $resources) {
      sellingPlanGroup {
        id
        sellingPlans(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const SELLING_PLAN_GROUP_UPDATE_MUTATION = `#graphql
  mutation UpdateSellingPlanGroup($id: ID!, $input: SellingPlanGroupInput!) {
    sellingPlanGroupUpdate(id: $id, input: $input) {
      sellingPlanGroup {
        id
        sellingPlans(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const SELLING_PLAN_GROUP_DELETE_MUTATION = `#graphql
  mutation DeleteSellingPlanGroup($id: ID!) {
    sellingPlanGroupDelete(id: $id) {
      deletedSellingPlanGroupId
      userErrors {
        field
        message
      }
    }
  }
`;

function createPlanId() {
  return `plan-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toSellingPlanInterval(interval: ProductSubscriptionPlan["interval"]) {
  if (interval === "day") return "DAY";
  if (interval === "week") return "WEEK";
  return "MONTH";
}

function buildMerchantCode(plan: ProductSubscriptionPlan) {
  return plan.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || plan.id.toLowerCase();
}

function buildPricingPolicies(plan: ProductSubscriptionPlan) {
  return typeof plan.discountPercentage === "number"
    ? [
        {
          fixed: {
            adjustmentType: "PERCENTAGE",
            adjustmentValue: {
              percentage: plan.discountPercentage,
            },
          },
        },
      ]
    : [];
}

function buildSellingPlanPayload(
  plan: ProductSubscriptionPlan,
  options?: {
    includeId?: boolean;
  },
) {
  const optionLabel = `${plan.intervalCount} ${plan.interval}`;
  const pricingPolicies = buildPricingPolicies(plan);

  return {
    ...(options?.includeId && plan.sellingPlanId ? { id: plan.sellingPlanId } : {}),
    name: plan.name,
    options: [optionLabel],
    category: "SUBSCRIPTION",
    billingPolicy: {
      recurring: {
        interval: toSellingPlanInterval(plan.interval),
        intervalCount: plan.intervalCount,
      },
    },
    deliveryPolicy: {
      recurring: {
        interval: toSellingPlanInterval(plan.interval),
        intervalCount: plan.intervalCount,
      },
    },
    ...(pricingPolicies.length > 0 ? { pricingPolicies } : {}),
  };
}

function normalizeVariantIds(variantIds?: string[]) {
  return [...(variantIds ?? [])].sort();
}

function hasSameVariantScope(
  left?: string[],
  right?: string[],
) {
  const normalizedLeft = normalizeVariantIds(left);
  const normalizedRight = normalizeVariantIds(right);

  return normalizedLeft.length === normalizedRight.length &&
    normalizedLeft.every((variantId, index) => variantId === normalizedRight[index]);
}

export function buildSellingPlanGroupCreateVariables(
  productId: string,
  plan: ProductSubscriptionPlan,
) {
  return {
    input: {
      name: plan.name,
      merchantCode: buildMerchantCode(plan),
      options: [`${plan.intervalCount} ${plan.interval}`],
      sellingPlansToCreate: [buildSellingPlanPayload(plan)],
    },
    resources:
      plan.variantIds && plan.variantIds.length > 0
        ? {
            productIds: [],
            productVariantIds: plan.variantIds,
          }
        : {
            productIds: [productId],
            productVariantIds: [],
          },
  };
}

export function buildSellingPlanGroupUpdateVariables(plan: ProductSubscriptionPlan) {
  if (!plan.sellingPlanGroupId || !plan.sellingPlanId) {
    throw new Error("缺少已绑定的 Selling Plan Group 或 Selling Plan ID");
  }

  return {
    id: plan.sellingPlanGroupId,
    input: {
      name: plan.name,
      merchantCode: buildMerchantCode(plan),
      options: [`${plan.intervalCount} ${plan.interval}`],
      sellingPlansToUpdate: [buildSellingPlanPayload(plan, { includeId: true })],
    },
  };
}

export function parseVariantIds(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function listProductSubscriptionPlans(
  admin: ShopifyAdminClient,
  productId: string,
) {
  const product = await fetchShopifyProduct(admin, productId);
  if (!product) {
    return [];
  }

  return toSubscriptionOffering(product).plans;
}

export async function updateProductSubscriptionPlans(
  admin: ShopifyAdminClient,
  productId: string,
  plans: ProductSubscriptionPlan[],
) {
  const response = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: productId,
          namespace: "lens",
          key: "subscription_plans",
          type: "json",
          value: serializeSubscriptionPlans(plans),
        },
      ],
    },
  });
  const json = (await response.json()) as {
    data?: {
      metafieldsSet?: {
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
  };

  const userErrors = json.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }
}

async function createSellingPlanBinding(
  admin: ShopifyAdminClient,
  productId: string,
  plan: ProductSubscriptionPlan,
) {
  const variables = buildSellingPlanGroupCreateVariables(productId, plan);
  const response = await admin.graphql(SELLING_PLAN_GROUP_CREATE_MUTATION, {
    variables,
  });
  const json = (await response.json()) as {
    data?: {
      sellingPlanGroupCreate?: {
        sellingPlanGroup?: {
          id: string;
          sellingPlans?: {
            edges?: Array<{
              node?: {
                id: string;
              };
            }>;
          };
        } | null;
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
  };

  const userErrors = json.data?.sellingPlanGroupCreate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }

  const sellingPlanGroup =
    json.data?.sellingPlanGroupCreate?.sellingPlanGroup ?? null;
  const sellingPlanId =
    sellingPlanGroup?.sellingPlans?.edges?.[0]?.node?.id ?? undefined;

  if (!sellingPlanGroup?.id || !sellingPlanId) {
    throw new Error("创建 Selling Plan 成功响应不完整");
  }

  return {
    ...plan,
    sellingPlanId,
    sellingPlanGroupId: sellingPlanGroup.id,
  };
}

async function updateSellingPlanBinding(
  admin: ShopifyAdminClient,
  plan: ProductSubscriptionPlan,
) {
  const variables = buildSellingPlanGroupUpdateVariables(plan);
  const response = await admin.graphql(SELLING_PLAN_GROUP_UPDATE_MUTATION, {
    variables,
  });
  const json = (await response.json()) as {
    data?: {
      sellingPlanGroupUpdate?: {
        sellingPlanGroup?: {
          id: string;
          sellingPlans?: {
            edges?: Array<{
              node?: {
                id: string;
              };
            }>;
          };
        } | null;
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
  };

  const userErrors = json.data?.sellingPlanGroupUpdate?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }

  const sellingPlanGroup =
    json.data?.sellingPlanGroupUpdate?.sellingPlanGroup ?? null;
  const sellingPlanId =
    sellingPlanGroup?.sellingPlans?.edges?.[0]?.node?.id ?? plan.sellingPlanId;

  if (!sellingPlanGroup?.id || !sellingPlanId) {
    throw new Error("更新 Selling Plan 成功响应不完整");
  }

  return {
    ...plan,
    sellingPlanId,
    sellingPlanGroupId: sellingPlanGroup.id,
  };
}

async function deleteSellingPlanGroup(
  admin: ShopifyAdminClient,
  sellingPlanGroupId: string,
) {
  const response = await admin.graphql(SELLING_PLAN_GROUP_DELETE_MUTATION, {
    variables: {
      id: sellingPlanGroupId,
    },
  });
  const json = (await response.json()) as {
    data?: {
      sellingPlanGroupDelete?: {
        deletedSellingPlanGroupId?: string | null;
        userErrors?: Array<{ field?: string[]; message: string }>;
      };
    };
  };

  const userErrors = json.data?.sellingPlanGroupDelete?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }
}

async function syncBoundSellingPlan(
  admin: ShopifyAdminClient,
  productId: string,
  currentPlan: ProductSubscriptionPlan,
  nextPlan: ProductSubscriptionPlan,
) {
  if (!currentPlan.sellingPlanGroupId || !currentPlan.sellingPlanId) {
    return createSellingPlanBinding(admin, productId, {
      ...nextPlan,
      sellingPlanId: undefined,
      sellingPlanGroupId: undefined,
    });
  }

  if (!hasSameVariantScope(currentPlan.variantIds, nextPlan.variantIds)) {
    await deleteSellingPlanGroup(admin, currentPlan.sellingPlanGroupId);
    return createSellingPlanBinding(admin, productId, {
      ...nextPlan,
      sellingPlanId: undefined,
      sellingPlanGroupId: undefined,
    });
  }

  return updateSellingPlanBinding(admin, {
    ...nextPlan,
    sellingPlanId: currentPlan.sellingPlanId,
    sellingPlanGroupId: currentPlan.sellingPlanGroupId,
  });
}

export async function upsertProductSubscriptionPlan(
  admin: ShopifyAdminClient,
  productId: string,
  input: {
    id?: string;
    name: string;
    interval: ProductSubscriptionPlan["interval"];
    intervalCount: number;
    discountPercentage?: number;
    sellingPlanId?: string;
    sellingPlanGroupId?: string;
    variantIds?: string[];
  },
) {
  const currentPlans = await listProductSubscriptionPlans(admin, productId);
  const nextId = input.id || createPlanId();
  const currentPlan = currentPlans.find((plan) => plan.id === nextId);
  const draftPlan: ProductSubscriptionPlan = {
    id: nextId,
    name: input.name,
    interval: input.interval,
    intervalCount: input.intervalCount,
    discountPercentage: input.discountPercentage,
    sellingPlanId: input.sellingPlanId ?? currentPlan?.sellingPlanId,
    sellingPlanGroupId: input.sellingPlanGroupId ?? currentPlan?.sellingPlanGroupId,
    variantIds: input.variantIds,
  };
  const nextPlan =
    currentPlan?.sellingPlanId || currentPlan?.sellingPlanGroupId
      ? await syncBoundSellingPlan(admin, productId, currentPlan, draftPlan)
      : draftPlan;

  const nextPlans = currentPlans.some((plan) => plan.id === nextId)
    ? currentPlans.map((plan) => (plan.id === nextId ? nextPlan : plan))
    : [...currentPlans, nextPlan];

  await updateProductSubscriptionPlans(admin, productId, nextPlans);
}

export async function deleteProductSubscriptionPlan(
  admin: ShopifyAdminClient,
  productId: string,
  planId: string,
) {
  const currentPlans = await listProductSubscriptionPlans(admin, productId);
  const targetPlan = currentPlans.find((plan) => plan.id === planId);

  if (targetPlan?.sellingPlanGroupId) {
    await deleteSellingPlanGroup(admin, targetPlan.sellingPlanGroupId);
  }

  const nextPlans = currentPlans.filter((plan) => plan.id !== planId);
  await updateProductSubscriptionPlans(admin, productId, nextPlans);
}

export async function createAndBindSellingPlan(
  admin: ShopifyAdminClient,
  productId: string,
  planId: string,
  options?: {
    force?: boolean;
    skipDelete?: boolean;
  },
) {
  const currentPlans = await listProductSubscriptionPlans(admin, productId);
  const targetPlan = currentPlans.find((plan) => plan.id === planId);

  if (!targetPlan) {
    throw new Error("未找到待绑定的订阅方案");
  }

  if (
    targetPlan.sellingPlanGroupId &&
    !options?.skipDelete &&
    (options?.force || !targetPlan.sellingPlanId)
  ) {
    await deleteSellingPlanGroup(admin, targetPlan.sellingPlanGroupId);
  }

  if (targetPlan.sellingPlanId && !options?.force && !options?.skipDelete) {
    return targetPlan;
  }

  const boundPlan = await createSellingPlanBinding(admin, productId, {
    ...targetPlan,
    sellingPlanId: undefined,
    sellingPlanGroupId: undefined,
  });
  const nextPlans = currentPlans.map((plan) =>
    plan.id === planId
      ? boundPlan
      : plan,
  );

  await updateProductSubscriptionPlans(admin, productId, nextPlans);

  return nextPlans.find((plan) => plan.id === planId)!;
}
