import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSellingPlanGroupCreateVariables,
  buildSellingPlanGroupUpdateVariables,
} from "../app/services/subscription-plans.server.js";

test("Selling Plan 创建变量应按商品级方案构造资源和周期", () => {
  const variables = buildSellingPlanGroupCreateVariables("gid://shopify/Product/1", {
    id: "plan-monthly",
    name: "每月订阅",
    interval: "month",
    intervalCount: 1,
    discountPercentage: 10,
  });

  assert.equal(variables.input.name, "每月订阅");
  assert.equal(variables.input.sellingPlansToCreate[0].category, "SUBSCRIPTION");
  assert.equal(
    variables.input.sellingPlansToCreate[0].billingPolicy.recurring.interval,
    "MONTH",
  );
  assert.equal(variables.resources.productIds[0], "gid://shopify/Product/1");
  assert.ok(variables.input.sellingPlansToCreate[0].pricingPolicies);
  assert.equal(
    variables.input.sellingPlansToCreate[0].pricingPolicies?.[0]?.fixed.adjustmentValue.percentage,
    10,
  );
});

test("Selling Plan 创建变量应在方案限定变体时绑定 productVariantIds", () => {
  const variables = buildSellingPlanGroupCreateVariables("gid://shopify/Product/2", {
    id: "plan-variant",
    name: "变体限定订阅",
    interval: "week",
    intervalCount: 2,
    variantIds: ["gid://shopify/ProductVariant/10"],
  });

  assert.equal(variables.resources.productIds.length, 0);
  assert.equal(
    variables.resources.productVariantIds[0],
    "gid://shopify/ProductVariant/10",
  );
  assert.equal(
    variables.input.sellingPlansToCreate[0].deliveryPolicy.recurring.interval,
    "WEEK",
  );
});

test("Selling Plan 更新变量应保留远端 ID 并同步最新方案配置", () => {
  const variables = buildSellingPlanGroupUpdateVariables({
    id: "plan-existing",
    name: "双周订阅",
    interval: "week",
    intervalCount: 2,
    discountPercentage: 15,
    sellingPlanId: "gid://shopify/SellingPlan/11",
    sellingPlanGroupId: "gid://shopify/SellingPlanGroup/22",
  });

  assert.equal(variables.id, "gid://shopify/SellingPlanGroup/22");
  assert.equal(
    variables.input.sellingPlansToUpdate[0].id,
    "gid://shopify/SellingPlan/11",
  );
  assert.equal(
    variables.input.sellingPlansToUpdate[0].billingPolicy.recurring.intervalCount,
    2,
  );
  assert.equal(
    variables.input.sellingPlansToUpdate[0].pricingPolicies?.[0]?.fixed.adjustmentValue.percentage,
    15,
  );
});
