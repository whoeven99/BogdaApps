import type { LoaderFunctionArgs } from "react-router";

import type { ParameterInputValue } from "../../src/types/product-parameters.js";
import {
  findMappedVariantByValues,
  getProductParameterConfig,
} from "../models/product-parameters.server";
import { authenticate } from "../shopify.server";
import {
  filterSubscriptionOfferingByVariant,
  fetchShopifyProduct,
  toSubscriptionOffering,
  type ShopifyVariantNode,
  toShopifyResourceId,
} from "../services/shopify-products.server";

const RESERVED_QUERY_KEYS = new Set([
  "productId",
  "selectedVariantId",
  "purchaseMode",
  "subscriptionPlanId",
]);

function normalizeShopifyGid(type: "Product" | "ProductVariant", raw: string): string {
  if (raw.startsWith("gid://shopify/")) {
    return raw;
  }

  return `gid://shopify/${type}/${raw}`;
}

function parseValueByType(rawValue: string, type: string): ParameterInputValue {
  if (type === "number") {
    const parsed = Number(rawValue);
    return Number.isFinite(parsed) ? parsed : rawValue;
  }

  if (type === "boolean") {
    return rawValue === "true";
  }

  if (type === "multi_select") {
    return rawValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return rawValue;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) {
    return Response.json(
      { error: "当前店铺未建立可用的 app proxy session" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const rawProductId = String(url.searchParams.get("productId") ?? "").trim();
  if (!rawProductId) {
    return Response.json({ error: "缺少 productId" }, { status: 400 });
  }

  const productId = normalizeShopifyGid("Product", rawProductId);
  const rawSelectedVariantId = String(
    url.searchParams.get("selectedVariantId") ?? "",
  ).trim();
  const selectedVariantId = rawSelectedVariantId
    ? normalizeShopifyGid("ProductVariant", rawSelectedVariantId)
    : "";
  const config = await getProductParameterConfig(productId);
  if (!config) {
    return Response.json(
      { error: "当前商品还没有参数模板配置", configured: false },
      { status: 404 },
    );
  }

  const product = await fetchShopifyProduct(admin, productId);
  if (!product) {
    return Response.json({ error: "未找到商品" }, { status: 404 });
  }

  const submittedValues: Record<string, ParameterInputValue> = {};
  for (const parameter of config.template.parameters) {
    const rawValue = url.searchParams.get(parameter.code);
    if (rawValue === null || rawValue.trim() === "") {
      continue;
    }

    submittedValues[parameter.code] = parseValueByType(rawValue, parameter.type);
  }

  const hasSubmittedValues = Object.keys(submittedValues).length > 0;
  const mapping = hasSubmittedValues
    ? await findMappedVariantByValues({
        shopifyProductId: productId,
        values: submittedValues,
      })
    : null;

  const matchedVariant = mapping
    ? product.variants.nodes.find(
        (variant: ShopifyVariantNode) => variant.id === mapping.shopifyVariantId,
      ) ?? null
    : null;
  const purchaseMode = url.searchParams.get("purchaseMode") ?? "one_time";
  const matchedOrSelectedVariantId =
    matchedVariant?.id ?? (selectedVariantId || undefined);
  const subscriptionOffering = config.allowSubscription
    ? filterSubscriptionOfferingByVariant(
        toSubscriptionOffering(product),
        matchedOrSelectedVariantId,
      )
    : {
        enabled: false,
        source: "none" as const,
        plans: [],
        requiresSellingPlanIntegration: false,
      };
  const selectedSubscriptionPlanId = String(
    url.searchParams.get("subscriptionPlanId") ?? "",
  ).trim();
  const selectedSubscriptionPlan =
    subscriptionOffering.plans.find((plan) => plan.id === selectedSubscriptionPlanId) ??
    null;

  return Response.json({
    configured: true,
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      status: product.status,
    },
    template: config.template,
    allowOneTimePurchase: config.allowOneTimePurchase,
    allowSubscription: config.allowSubscription,
    selectedVariantId,
    purchaseMode,
    submittedValues,
    hasSubmittedValues,
    subscriptionOffering,
    selectedSubscriptionPlanId,
    selectedSubscriptionPlan,
    availableVariants: product.variants.nodes.map((variant: ShopifyVariantNode) => ({
      id: variant.id,
      title: variant.displayName,
      sku: variant.sku ?? variant.displayName,
      inventoryQuantity: variant.inventoryQuantity ?? 0,
    })),
    match: mapping
      ? {
          matched: true,
          signature: mapping.signature,
          variantId: mapping.shopifyVariantId,
          cartVariantId: toShopifyResourceId(mapping.shopifyVariantId),
          variantTitle: matchedVariant?.displayName ?? mapping.shopifyVariantId,
          sku: matchedVariant?.sku ?? null,
          inventoryQuantity: matchedVariant?.inventoryQuantity ?? 0,
          inventoryAvailable: (matchedVariant?.inventoryQuantity ?? 0) > 0,
          inventoryPolicy: mapping.inventoryPolicy ?? null,
          priceAdjustment: mapping.priceAdjustment ?? null,
          sellingPlanEligible: subscriptionOffering.plans.length > 0,
        }
      : {
          matched: false,
        },
    messages: hasSubmittedValues
      ? mapping
        ? [
            matchedVariant && (matchedVariant.inventoryQuantity ?? 0) > 0
              ? "已找到匹配货品，可继续下单。"
              : "已找到匹配货品，但当前库存不足，请提醒商家处理。",
            ...(purchaseMode === "subscription" && subscriptionOffering.plans.length === 0
              ? ["当前匹配货品没有可用订阅方案，请切换为一次性购买。"]
              : []),
            ...(purchaseMode === "subscription" &&
            selectedSubscriptionPlanId &&
            !selectedSubscriptionPlan
              ? ["当前订阅方案不适用于该货品，请重新选择。"]
              : []),
            ...(purchaseMode === "subscription" &&
            selectedSubscriptionPlan &&
            !selectedSubscriptionPlan.sellingPlanId
              ? ["当前订阅方案尚未绑定真实 Selling Plan，暂时不能提交订阅订单。"]
              : []),
          ]
        : ["当前参数组合没有命中已配置货品，请调整参数或联系商家。"]
      : [],
    ignoredQueryKeys: [...url.searchParams.keys()].filter(
      (key) =>
        !RESERVED_QUERY_KEYS.has(key) &&
        !config.template.parameters.some((parameter) => parameter.code === key),
    ),
  });
};
