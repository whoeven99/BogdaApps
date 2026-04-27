import test from "node:test";
import assert from "node:assert/strict";

import {
  getRepairableSubscriptionPlans,
  getSubscriptionRepairMode,
} from "../app/lib/subscription-diagnostics.js";
import { buildProductSubscriptionDiagnostics } from "../app/services/subscription-diagnostics.server.js";

function createJsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}

test("未绑定的订阅方案应返回 warning 诊断", async () => {
  const admin = {
    async graphql() {
      throw new Error("未绑定方案不应触发远端查询");
    },
  };

  const diagnostics = await buildProductSubscriptionDiagnostics(
    admin,
    "gid://shopify/Product/1",
    {
      enabled: true,
      source: "metafield",
      requiresSellingPlanIntegration: true,
      plans: [
        {
          id: "plan-1",
          name: "每月订阅",
          interval: "month",
          intervalCount: 1,
        },
      ],
    },
    [],
  );

  assert.equal(diagnostics.summary.status, "warning");
  assert.equal(diagnostics.plans[0]?.issues[0]?.code, "NOT_BOUND");
});

test("远端 Selling Plan Group 缺失时应返回 error 诊断", async () => {
  const admin = {
    async graphql() {
      return createJsonResponse({
        data: {
          sellingPlanGroup: null,
        },
      });
    },
  };

  const diagnostics = await buildProductSubscriptionDiagnostics(
    admin,
    "gid://shopify/Product/2",
    {
      enabled: true,
      source: "metafield",
      requiresSellingPlanIntegration: false,
      plans: [
        {
          id: "plan-2",
          name: "双周订阅",
          interval: "week",
          intervalCount: 2,
          sellingPlanId: "gid://shopify/SellingPlan/2",
          sellingPlanGroupId: "gid://shopify/SellingPlanGroup/2",
        },
      ],
    },
    [],
  );

  assert.equal(diagnostics.summary.status, "error");
  assert.equal(diagnostics.plans[0]?.issues[0]?.code, "REMOTE_GROUP_MISSING");
});

test("远端变体范围不一致时应标记受影响变体", async () => {
  let callIndex = 0;
  const admin = {
    async graphql() {
      callIndex += 1;

      if (callIndex === 1) {
        return createJsonResponse({
          data: {
            sellingPlanGroup: {
              id: "gid://shopify/SellingPlanGroup/3",
              appliesToProduct: false,
              appliesToProductVariants: true,
              sellingPlans: {
                edges: [
                  {
                    node: {
                      id: "gid://shopify/SellingPlan/3",
                    },
                  },
                ],
              },
            },
          },
        });
      }

      return createJsonResponse({
        data: {
          sellingPlanGroup: {
            appliesToProductVariant: false,
          },
        },
      });
    },
  };

  const diagnostics = await buildProductSubscriptionDiagnostics(
    admin,
    "gid://shopify/Product/3",
    {
      enabled: true,
      source: "metafield",
      requiresSellingPlanIntegration: false,
      plans: [
        {
          id: "plan-3",
          name: "变体订阅",
          interval: "month",
          intervalCount: 1,
          sellingPlanId: "gid://shopify/SellingPlan/3",
          sellingPlanGroupId: "gid://shopify/SellingPlanGroup/3",
          variantIds: ["gid://shopify/ProductVariant/9"],
        },
      ],
    },
    [],
  );

  assert.equal(diagnostics.summary.status, "error");
  assert.equal(
    diagnostics.plans[0]?.issues[0]?.code,
    "REMOTE_VARIANT_SCOPE_MISMATCH",
  );
  assert.deepEqual(diagnostics.plans[0]?.issues[0]?.relatedVariantIds, [
    "gid://shopify/ProductVariant/9",
  ]);
});

test("修复模式应根据诊断类型返回绑定策略", () => {
  assert.equal(
    getSubscriptionRepairMode(
      {
        id: "plan-bind",
        name: "未绑定方案",
        interval: "month",
        intervalCount: 1,
      },
      {
        planId: "plan-bind",
        planName: "未绑定方案",
        status: "warning",
        remoteSellingPlanIds: [],
        issues: [
          {
            code: "NOT_BOUND",
            severity: "warning",
            message: "未绑定",
            relatedVariantIds: [],
          },
        ],
      },
    ),
    "bind",
  );

  assert.equal(
    getSubscriptionRepairMode(
      {
        id: "plan-missing",
        name: "远端丢失方案",
        interval: "month",
        intervalCount: 1,
        sellingPlanId: "gid://shopify/SellingPlan/1",
        sellingPlanGroupId: "gid://shopify/SellingPlanGroup/1",
      },
      {
        planId: "plan-missing",
        planName: "远端丢失方案",
        status: "error",
        remoteSellingPlanGroupId: "gid://shopify/SellingPlanGroup/1",
        remoteSellingPlanIds: [],
        issues: [
          {
            code: "REMOTE_GROUP_MISSING",
            severity: "error",
            message: "远端组缺失",
            relatedVariantIds: [],
          },
        ],
      },
    ),
    "recreate_missing",
  );
});

test("可修复方案列表应过滤掉健康方案", () => {
  const repairable = getRepairableSubscriptionPlans(
    [
      {
        id: "plan-healthy",
        name: "正常方案",
        interval: "month",
        intervalCount: 1,
        sellingPlanId: "gid://shopify/SellingPlan/5",
      },
      {
        id: "plan-error",
        name: "异常方案",
        interval: "month",
        intervalCount: 1,
      },
    ],
    {
      summary: {
        status: "warning",
        totalPlans: 2,
        healthyPlans: 1,
        warningPlans: 1,
        errorPlans: 0,
        issueCount: 1,
      },
      plans: [
        {
          planId: "plan-healthy",
          planName: "正常方案",
          status: "healthy",
          remoteSellingPlanIds: ["gid://shopify/SellingPlan/5"],
          issues: [],
        },
        {
          planId: "plan-error",
          planName: "异常方案",
          status: "warning",
          remoteSellingPlanIds: [],
          issues: [
            {
              code: "NOT_BOUND",
              severity: "warning",
              message: "未绑定",
              relatedVariantIds: [],
            },
          ],
        },
      ],
    },
  );

  assert.equal(repairable.length, 1);
  assert.equal(repairable[0]?.plan.id, "plan-error");
  assert.equal(repairable[0]?.mode, "bind");
});
