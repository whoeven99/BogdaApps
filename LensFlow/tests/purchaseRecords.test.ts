import test from "node:test";
import assert from "node:assert/strict";

import { summarizePurchaseRecords } from "../app/models/purchase-records.server.js";

test("下单记录汇总应按购买方式和状态统计数量", () => {
  const summary = summarizePurchaseRecords([
    {
      id: "record-1",
      source: "theme_widget",
      status: "cart_added",
      purchaseMode: "one_time",
      shopifyProductId: "gid://shopify/Product/1",
      shopifyVariantId: "gid://shopify/ProductVariant/1",
      parameterValues: {
        left_sph: -1.25,
      },
      createdAt: new Date("2026-01-01T00:00:00.000Z").toISOString(),
    },
    {
      id: "record-2",
      source: "theme_widget",
      status: "checkout_started",
      purchaseMode: "subscription",
      shopifyProductId: "gid://shopify/Product/2",
      shopifyVariantId: "gid://shopify/ProductVariant/2",
      parameterValues: {
        bc: 8.6,
      },
      subscriptionPlanId: "plan-1",
      subscriptionPlanName: "月付",
      sellingPlanId: "gid://shopify/SellingPlan/2",
      createdAt: new Date("2026-01-01T00:01:00.000Z").toISOString(),
    },
    {
      id: "record-3",
      source: "theme_widget",
      status: "cart_add_failed",
      purchaseMode: "subscription",
      shopifyProductId: "gid://shopify/Product/3",
      shopifyVariantId: "gid://shopify/ProductVariant/3",
      parameterValues: {
        replacement_cycle: "monthly",
      },
      createdAt: new Date("2026-01-01T00:02:00.000Z").toISOString(),
    },
  ]);

  assert.deepEqual(summary, {
    total: 3,
    oneTimeCount: 1,
    subscriptionCount: 2,
    cartAddedCount: 1,
    checkoutStartedCount: 1,
    failedCount: 1,
  });
});
