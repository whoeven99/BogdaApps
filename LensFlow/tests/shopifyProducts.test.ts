import test from "node:test";
import assert from "node:assert/strict";

import {
  filterSubscriptionOfferingByVariant,
  fetchShopifyProducts,
  getProductConfiguration,
  serializeSubscriptionPlans,
  toShopifyResourceId,
  toLensOptions,
  toProductContext,
  toRecommendableProduct,
  toProductSummary,
  toSubscriptionOffering,
} from "../app/services/shopify-products.server.js";

test("Shopify 商品服务应读取产品并映射为 summary/context", async () => {
  const admin = {
    async graphql() {
      return new Response(
        JSON.stringify({
          data: {
            products: {
              nodes: [
                {
                  id: "gid://shopify/Product/1",
                  title: "Demo Glasses",
                  handle: "demo-glasses",
                  productType: "glasses",
                  tags: ["frame", "single_vision"],
                  status: "ACTIVE",
                  variants: {
                    nodes: [
                      {
                        id: "gid://shopify/ProductVariant/1",
                        displayName: "Default Title",
                        sku: "SKU-1",
                        inventoryQuantity: 8,
                      },
                    ],
                  },
                },
              ],
            },
          },
        }),
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    },
  };

  const products = await fetchShopifyProducts(admin, 5);
  assert.equal(products.length, 1);

  const summary = toProductSummary(products[0]!);
  assert.equal(summary.title, "Demo Glasses");
  assert.equal(summary.status, "ACTIVE");

  const context = toProductContext(products[0]!);
  assert.equal(context.productId, "gid://shopify/Product/1");
  assert.equal(context.prescriptionType, "single_vision");
  assert.equal(context.variants[0]?.inventoryAvailable, true);
});

test("Shopify 商品服务应优先解析 Metafield 中的处方类型和镜片选项", () => {
  const product = {
    id: "gid://shopify/Product/2",
    title: "Metafield Glasses",
    handle: "metafield-glasses",
    productType: "glasses",
    tags: ["frame", "reading"],
    status: "ACTIVE",
    prescriptionTypeMetafield: {
      value: "progressive",
    },
    lensOptionsMetafield: {
      value: JSON.stringify([
        {
          id: "lens-ultra",
          name: "超薄镜片",
          basePrice: 120,
        },
      ]),
    },
    variants: {
      nodes: [
        {
          id: "gid://shopify/ProductVariant/2",
          displayName: "Default Title",
          sku: "SKU-2",
          inventoryQuantity: 3,
        },
      ],
    },
  };

  const context = toProductContext(product);
  assert.equal(context.prescriptionType, "progressive");

  const lensOptions = toLensOptions(product);
  assert.equal(lensOptions.length, 1);
  assert.equal(lensOptions[0]?.id, "lens-ultra");
  assert.equal(lensOptions[0]?.basePrice, 120);

  const recommendable = toRecommendableProduct(product);
  assert.equal(recommendable.prescriptionType, "progressive");
  assert.equal(recommendable.lensOptions[0]?.name, "超薄镜片");

  const configuration = getProductConfiguration(product);
  assert.equal(configuration.prescriptionTypeRaw, "progressive");
  assert.equal(configuration.lensOptionsConfigured, true);
  assert.equal(configuration.subscriptionPlansConfigured, false);
});

test("Shopify 商品服务应在 Metafield 缺失时标记为未配置", () => {
  const product = {
    id: "gid://shopify/Product/3",
    title: "Fallback Glasses",
    handle: "fallback-glasses",
    productType: "glasses",
    tags: ["frame"],
    status: "ACTIVE",
    variants: {
      nodes: [],
    },
  };

  const configuration = getProductConfiguration(product);
  assert.equal(configuration.prescriptionTypeRaw, null);
  assert.equal(configuration.lensOptionsRaw, null);
  assert.equal(configuration.subscriptionPlansRaw, null);
  assert.equal(configuration.prescriptionTypeConfigured, false);
  assert.equal(configuration.lensOptionsConfigured, false);
  assert.equal(configuration.subscriptionPlansConfigured, false);
});

test("Shopify 商品服务应解析订阅购买方案 Metafield", () => {
  const product = {
    id: "gid://shopify/Product/4",
    title: "Subscription Glasses",
    handle: "subscription-glasses",
    productType: "glasses",
    tags: ["frame"],
    status: "ACTIVE",
    subscriptionPlansMetafield: {
      value: JSON.stringify([
        {
          id: "plan-monthly",
          name: "每月更换镜片",
          interval: "month",
          intervalCount: 1,
          discountPercentage: 10,
          sellingPlanId: "gid://shopify/SellingPlan/1",
          variantIds: ["gid://shopify/ProductVariant/4"],
        },
      ]),
    },
    variants: {
      nodes: [],
    },
  };

  const offering = toSubscriptionOffering(product);
  assert.equal(offering.enabled, true);
  assert.equal(offering.source, "metafield");
  assert.equal(offering.plans.length, 1);
  assert.equal(offering.plans[0]?.interval, "month");
  assert.equal(offering.plans[0]?.variantIds?.[0], "gid://shopify/ProductVariant/4");
  assert.equal(offering.requiresSellingPlanIntegration, false);
});

test("Shopify 商品服务应支持按选中变体过滤订阅方案", () => {
  const offering = {
    enabled: true,
    source: "metafield" as const,
    requiresSellingPlanIntegration: true,
    plans: [
      {
        id: "plan-all",
        name: "全部适用",
        interval: "month" as const,
        intervalCount: 1,
      },
      {
        id: "plan-variant-1",
        name: "仅变体 1",
        interval: "week" as const,
        intervalCount: 2,
        sellingPlanId: "gid://shopify/SellingPlan/2",
        variantIds: ["variant-1"],
      },
    ],
  };

  const filtered = filterSubscriptionOfferingByVariant(offering, "variant-1");

  assert.equal(filtered.plans.length, 2);
  assert.equal(filtered.requiresSellingPlanIntegration, true);

  const filteredOther = filterSubscriptionOfferingByVariant(offering, "variant-2");
  assert.equal(filteredOther.plans.length, 1);
  assert.equal(filteredOther.plans[0]?.id, "plan-all");
});

test("Shopify 商品服务应在匹配到特定变体时只保留适用的订阅方案", () => {
  const offering = {
    enabled: true,
    source: "metafield" as const,
    requiresSellingPlanIntegration: false,
    plans: [
      {
        id: "plan-monthly-all",
        name: "全商品月付",
        interval: "month" as const,
        intervalCount: 1,
        sellingPlanId: "gid://shopify/SellingPlan/10",
      },
      {
        id: "plan-toric-only",
        name: "散光专属订阅",
        interval: "month" as const,
        intervalCount: 2,
        sellingPlanId: "gid://shopify/SellingPlan/11",
        variantIds: ["gid://shopify/ProductVariant/200"],
      },
    ],
  };

  const filtered = filterSubscriptionOfferingByVariant(
    offering,
    "gid://shopify/ProductVariant/200",
  );

  assert.equal(filtered.enabled, true);
  assert.equal(filtered.plans.length, 2);
  assert.equal(filtered.plans[1]?.sellingPlanId, "gid://shopify/SellingPlan/11");

  const filteredOther = filterSubscriptionOfferingByVariant(
    offering,
    "gid://shopify/ProductVariant/201",
  );
  assert.equal(filteredOther.plans.length, 1);
  assert.equal(filteredOther.plans[0]?.id, "plan-monthly-all");
});

test("Shopify 商品服务应序列化订阅方案用于写回 Metafield", () => {
  const serialized = serializeSubscriptionPlans([
    {
      id: "plan-quarterly",
      name: "季度更换",
      interval: "month",
      intervalCount: 3,
      discountPercentage: 15,
      variantIds: ["variant-1", "variant-2"],
    },
  ]);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed[0].id, "plan-quarterly");
  assert.equal(parsed[0].variantIds.length, 2);
});

test("Shopify 商品服务应从 GID 中提取 Ajax Cart 可用的资源 ID", () => {
  assert.equal(
    toShopifyResourceId("gid://shopify/ProductVariant/987654321"),
    "987654321",
  );
  assert.equal(toShopifyResourceId("gid://shopify/ProductVariant/abc"), null);
});
