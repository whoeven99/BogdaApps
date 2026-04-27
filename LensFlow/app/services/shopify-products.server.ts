import type {
  LensOption,
  ProductContext,
  PrescriptionType,
} from "../../src/types/lens.js";
import type { RecommendableProduct } from "../../src/types/prescription.js";

export type ShopifyAdminClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

type ShopifyProductsQueryResult = {
  data?: {
    products?: {
      nodes: ShopifyProductNode[];
    };
  };
};

type ShopifyProductByIdQueryResult = {
  data?: {
    product?: ShopifyProductNode | null;
  };
};

export type ShopifyProductNode = {
  id: string;
  title: string;
  handle: string;
  productType: string | null;
  tags: string[];
  status: string;
  prescriptionTypeMetafield?: {
    value: string;
  } | null;
  lensOptionsMetafield?: {
    value: string;
  } | null;
  subscriptionPlansMetafield?: {
    value: string;
  } | null;
  variants: {
    nodes: ShopifyVariantNode[];
  };
};

export type ShopifyVariantNode = {
  id: string;
  displayName: string;
  sku: string | null;
  inventoryQuantity: number | null;
};

export type ShopifyProductSummary = {
  id: string;
  title: string;
  handle: string;
  productType?: string;
  tags: string[];
  status: string;
};

export type ShopifyProductConfiguration = {
  prescriptionTypeRaw: string | null;
  lensOptionsRaw: string | null;
  subscriptionPlansRaw: string | null;
  prescriptionTypeConfigured: boolean;
  lensOptionsConfigured: boolean;
  subscriptionPlansConfigured: boolean;
  subscriptionPlansRequiresSellingPlanIntegration: boolean;
};

export type ProductSubscriptionPlan = {
  id: string;
  name: string;
  interval: "day" | "week" | "month";
  intervalCount: number;
  discountPercentage?: number;
  sellingPlanId?: string;
  sellingPlanGroupId?: string;
  variantIds?: string[];
};

export type ProductSubscriptionOffering = {
  enabled: boolean;
  source: "metafield" | "none";
  plans: ProductSubscriptionPlan[];
  requiresSellingPlanIntegration: boolean;
};

type LensOptionMetafieldValue = {
  id: string;
  name: string;
  basePrice: number;
};

type SubscriptionPlanMetafieldValue = {
  id: string;
  name: string;
  interval: "day" | "week" | "month";
  intervalCount: number;
  discountPercentage?: number;
  sellingPlanId?: string;
  sellingPlanGroupId?: string;
  variantIds?: string[];
};

export const DEFAULT_LENS_OPTIONS: LensOption[] = [
  {
    id: "lens-basic",
    name: "基础镜片",
    basePrice: 0,
  },
  {
    id: "lens-pro",
    name: "高级镜片",
    basePrice: 80,
  },
];

const PRODUCTS_QUERY = `#graphql
  query LensDashboardProducts($first: Int!) {
    products(first: $first, sortKey: UPDATED_AT, reverse: true) {
      nodes {
        id
        title
        handle
        productType
        tags
        status
        prescriptionTypeMetafield: metafield(namespace: "lens", key: "prescription_type") {
          value
        }
        lensOptionsMetafield: metafield(namespace: "lens", key: "lens_options") {
          value
        }
        subscriptionPlansMetafield: metafield(namespace: "lens", key: "subscription_plans") {
          value
        }
        variants(first: 10) {
          nodes {
            id
            displayName
            sku
            inventoryQuantity
          }
        }
      }
    }
  }
`;

const PRODUCT_BY_ID_QUERY = `#graphql
  query LensDashboardProduct($id: ID!) {
    product(id: $id) {
      id
      title
      handle
      productType
      tags
      status
      prescriptionTypeMetafield: metafield(namespace: "lens", key: "prescription_type") {
        value
      }
      lensOptionsMetafield: metafield(namespace: "lens", key: "lens_options") {
        value
      }
      subscriptionPlansMetafield: metafield(namespace: "lens", key: "subscription_plans") {
        value
      }
      variants(first: 20) {
        nodes {
          id
          displayName
          sku
          inventoryQuantity
        }
      }
    }
  }
`;

function inferPrescriptionType(tags: string[]): PrescriptionType {
  if (tags.includes("single_vision")) {
    return "single_vision";
  }

  if (tags.includes("progressive")) {
    return "progressive";
  }

  if (tags.includes("reading")) {
    return "reading";
  }

  return "non_prescription";
}

function parsePrescriptionType(
  product: ShopifyProductNode,
): PrescriptionType {
  const value = product.prescriptionTypeMetafield?.value;

  if (
    value === "non_prescription" ||
    value === "single_vision" ||
    value === "progressive" ||
    value === "reading"
  ) {
    return value;
  }

  return inferPrescriptionType(product.tags);
}

function isLensOptionMetafieldValue(
  value: unknown,
): value is LensOptionMetafieldValue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as LensOptionMetafieldValue).id === "string" &&
        typeof (item as LensOptionMetafieldValue).name === "string" &&
        typeof (item as LensOptionMetafieldValue).basePrice === "number",
    )
  );
}

function isSubscriptionPlanMetafieldValue(
  value: unknown,
): value is SubscriptionPlanMetafieldValue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as SubscriptionPlanMetafieldValue).id === "string" &&
        typeof (item as SubscriptionPlanMetafieldValue).name === "string" &&
        ((item as SubscriptionPlanMetafieldValue).interval === "day" ||
          (item as SubscriptionPlanMetafieldValue).interval === "week" ||
          (item as SubscriptionPlanMetafieldValue).interval === "month") &&
        typeof (item as SubscriptionPlanMetafieldValue).intervalCount ===
          "number" &&
        ((item as SubscriptionPlanMetafieldValue).discountPercentage ===
          undefined ||
          typeof (item as SubscriptionPlanMetafieldValue).discountPercentage ===
            "number") &&
        ((item as SubscriptionPlanMetafieldValue).sellingPlanId === undefined ||
          typeof (item as SubscriptionPlanMetafieldValue).sellingPlanId ===
            "string") &&
        ((item as SubscriptionPlanMetafieldValue).sellingPlanGroupId ===
          undefined ||
          typeof (item as SubscriptionPlanMetafieldValue).sellingPlanGroupId ===
            "string") &&
        ((item as SubscriptionPlanMetafieldValue).variantIds === undefined ||
          (Array.isArray((item as SubscriptionPlanMetafieldValue).variantIds) &&
            (item as SubscriptionPlanMetafieldValue).variantIds?.every(
              (variantId) => typeof variantId === "string",
            ))),
    )
  );
}

export function toLensOptions(product: ShopifyProductNode): LensOption[] {
  const rawValue = product.lensOptionsMetafield?.value;
  if (!rawValue) {
    return DEFAULT_LENS_OPTIONS;
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!isLensOptionMetafieldValue(parsed)) {
      return DEFAULT_LENS_OPTIONS;
    }

    return parsed.map((item) => ({
      id: item.id,
      name: item.name,
      basePrice: item.basePrice,
    }));
  } catch {
    return DEFAULT_LENS_OPTIONS;
  }
}

export function getProductConfiguration(
  product: ShopifyProductNode,
): ShopifyProductConfiguration {
  const subscriptionOffering = toSubscriptionOffering(product);

  return {
    prescriptionTypeRaw: product.prescriptionTypeMetafield?.value ?? null,
    lensOptionsRaw: product.lensOptionsMetafield?.value ?? null,
    subscriptionPlansRaw: product.subscriptionPlansMetafield?.value ?? null,
    prescriptionTypeConfigured: Boolean(product.prescriptionTypeMetafield?.value),
    lensOptionsConfigured: Boolean(product.lensOptionsMetafield?.value),
    subscriptionPlansConfigured: Boolean(product.subscriptionPlansMetafield?.value),
    subscriptionPlansRequiresSellingPlanIntegration:
      subscriptionOffering.requiresSellingPlanIntegration,
  };
}

export function toSubscriptionOffering(
  product: ShopifyProductNode,
): ProductSubscriptionOffering {
  const rawValue = product.subscriptionPlansMetafield?.value;
  if (!rawValue) {
    return {
      enabled: false,
      source: "none",
      plans: [],
      requiresSellingPlanIntegration: true,
    };
  }

  try {
    const parsed = JSON.parse(rawValue);
    if (!isSubscriptionPlanMetafieldValue(parsed)) {
      return {
        enabled: false,
        source: "none",
        plans: [],
        requiresSellingPlanIntegration: true,
      };
    }

    return {
      enabled: parsed.length > 0,
      source: "metafield",
      plans: parsed.map((plan) => ({
        id: plan.id,
        name: plan.name,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        discountPercentage: plan.discountPercentage,
        sellingPlanId: plan.sellingPlanId,
        sellingPlanGroupId: plan.sellingPlanGroupId,
        variantIds: plan.variantIds,
      })),
      requiresSellingPlanIntegration: parsed.some((plan) => !plan.sellingPlanId),
    };
  } catch {
    return {
      enabled: false,
      source: "none",
      plans: [],
      requiresSellingPlanIntegration: true,
    };
  }
}

export function serializeSubscriptionPlans(
  plans: ProductSubscriptionPlan[],
): string {
  return JSON.stringify(
    plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      interval: plan.interval,
      intervalCount: plan.intervalCount,
      discountPercentage: plan.discountPercentage,
      sellingPlanId: plan.sellingPlanId,
      sellingPlanGroupId: plan.sellingPlanGroupId,
      variantIds: plan.variantIds ?? [],
    })),
  );
}

export function filterSubscriptionOfferingByVariant(
  offering: ProductSubscriptionOffering,
  selectedVariantId?: string,
): ProductSubscriptionOffering {
  if (!selectedVariantId) {
    return offering;
  }

  const filteredPlans = offering.plans.filter(
    (plan) =>
      !plan.variantIds ||
      plan.variantIds.length === 0 ||
      plan.variantIds.includes(selectedVariantId),
  );

  return {
    ...offering,
    enabled: filteredPlans.length > 0,
    plans: filteredPlans,
    requiresSellingPlanIntegration: filteredPlans.some(
      (plan) => !plan.sellingPlanId,
    ),
  };
}

export function toVariantSummaries(product: ShopifyProductNode) {
  return product.variants.nodes.map((variant: ShopifyVariantNode) => ({
    id: variant.id,
    title: variant.displayName,
    sku: variant.sku ?? variant.displayName,
    inventoryAvailable: (variant.inventoryQuantity ?? 0) > 0,
  }));
}

export function toShopifyResourceId(gid: string): string | null {
  const match = gid.match(/\/(\d+)$/);
  return match?.[1] ?? null;
}

export async function fetchShopifyProducts(
  admin: ShopifyAdminClient,
  first = 15,
): Promise<ShopifyProductNode[]> {
  const response = await admin.graphql(PRODUCTS_QUERY, {
    variables: {
      first,
    },
  });
  const json = (await response.json()) as ShopifyProductsQueryResult;

  return json.data?.products?.nodes ?? [];
}

export async function fetchShopifyProduct(
  admin: ShopifyAdminClient,
  id: string,
): Promise<ShopifyProductNode | undefined> {
  const response = await admin.graphql(PRODUCT_BY_ID_QUERY, {
    variables: {
      id,
    },
  });
  const json = (await response.json()) as ShopifyProductByIdQueryResult;

  return json.data?.product ?? undefined;
}

export function toProductSummary(
  product: ShopifyProductNode,
): ShopifyProductSummary {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    productType: product.productType ?? undefined,
    tags: product.tags,
    status: product.status,
  };
}

export function toProductContext(
  product: ShopifyProductNode,
): ProductContext {
  return {
    productId: product.id,
    productType: product.productType ?? undefined,
    tags: product.tags,
    prescriptionType: parsePrescriptionType(product),
    variants: product.variants.nodes.map((variant: ShopifyVariantNode) => ({
      id: variant.id,
      sku: variant.sku ?? variant.displayName,
      isDeleted: false,
      inventoryAvailable: (variant.inventoryQuantity ?? 0) > 0,
    })),
  };
}

export function toRecommendableProduct(
  product: ShopifyProductNode,
): RecommendableProduct {
  return {
    id: product.id,
    title: product.title,
    handle: product.handle,
    status: product.status,
    tags: product.tags,
    productType: product.productType ?? undefined,
    prescriptionType: parsePrescriptionType(product),
    lensOptions: toLensOptions(product),
  };
}
