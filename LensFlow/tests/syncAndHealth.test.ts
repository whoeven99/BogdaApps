import test from "node:test";
import assert from "node:assert/strict";

import { buildProductHealthReport } from "../src/services/healthCheck.js";
import {
  buildSyncJobResult,
  diffVariantSnapshots,
} from "../src/services/shopifySync.js";
import type { LensRule, ProductContext } from "../src/types/lens.js";
import type { ProductSnapshot, VariantSnapshot } from "../src/types/sync.js";

const baseContext: ProductContext = {
  productId: "product-1",
  productType: "glasses",
  tags: ["frame"],
  prescriptionType: "non_prescription",
  variants: [
    {
      id: "variant-1",
      sku: "SKU-1",
      isDeleted: false,
      inventoryAvailable: true,
    },
  ],
};

const healthyRules: LensRule[] = [
  {
    id: "rule-1",
    name: "显示基础镜片",
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: "prescriptionType",
        operator: "eq",
        value: "non_prescription",
      },
    ],
    actions: [
      {
        type: "show",
        lensOptionId: "lens-basic",
        variantId: "variant-1",
      },
    ],
  },
];

test("变体快照差异应识别创建、更新和删除", () => {
  const previousVariants: VariantSnapshot[] = [
    {
      id: "variant-1",
      productId: "product-1",
      sku: "SKU-OLD",
      isDeleted: false,
      inventoryAvailable: true,
    },
    {
      id: "variant-2",
      productId: "product-1",
      sku: "SKU-2",
      isDeleted: false,
      inventoryAvailable: true,
    },
  ];

  const nextVariants: VariantSnapshot[] = [
    {
      id: "variant-1",
      productId: "product-1",
      sku: "SKU-NEW",
      isDeleted: false,
      inventoryAvailable: false,
    },
    {
      id: "variant-3",
      productId: "product-1",
      sku: "SKU-3",
      isDeleted: false,
      inventoryAvailable: true,
    },
  ];

  const changes = diffVariantSnapshots(previousVariants, nextVariants);
  assert.equal(changes.length, 4);
  assert.ok(changes.some((change) => change.type === "created"));
  assert.ok(changes.some((change) => change.type === "updated"));
  assert.ok(changes.some((change) => change.type === "inventory_changed"));
  assert.ok(changes.some((change) => change.type === "deleted"));
});

test("同步结果应汇总产品和变体变化", () => {
  const previousProducts: ProductSnapshot[] = [
    {
      productId: "product-1",
      title: "Old Product",
      productType: "glasses",
      tags: ["frame"],
    },
  ];

  const nextProducts: ProductSnapshot[] = [
    {
      productId: "product-1",
      title: "Old Product",
      productType: "glasses",
      tags: ["frame"],
    },
    {
      productId: "product-2",
      title: "New Product",
      productType: "glasses",
      tags: ["frame"],
    },
  ];

  const result = buildSyncJobResult({
    jobType: "variants",
    previousProducts,
    nextProducts,
    previousVariants: [],
    nextVariants: [
      {
        id: "variant-3",
        productId: "product-2",
        sku: "SKU-3",
        isDeleted: false,
        inventoryAvailable: true,
      },
    ],
  });

  assert.equal(result.status, "success");
  assert.equal(result.productChanges, 1);
  assert.equal(result.variantChanges, 1);
});

test("健康检查应识别缺失规则", () => {
  const report = buildProductHealthReport({
    context: baseContext,
    rules: [],
  });

  assert.equal(report.status, "error");
  assert.ok(report.issues.some((issue) => issue.code === "MISSING_RULES"));
});

test("健康检查应识别缺失 Metafield 并标记为 warning", () => {
  const report = buildProductHealthReport({
    context: baseContext,
    rules: healthyRules,
    configuration: {
      prescriptionTypeConfigured: false,
      lensOptionsConfigured: false,
      subscriptionPlansConfigured: false,
    },
  });

  assert.equal(report.status, "warning");
  assert.ok(
    report.issues.some(
      (issue) => issue.code === "MISSING_PRESCRIPTION_TYPE_METAFIELD",
    ),
  );
  assert.ok(
    report.issues.some(
      (issue) => issue.code === "MISSING_LENS_OPTIONS_METAFIELD",
    ),
  );
  assert.ok(
    report.issues.some(
      (issue) => issue.code === "MISSING_SUBSCRIPTION_PLANS_METAFIELD",
    ),
  );
});

test("健康检查应识别订阅方案未绑定 Selling Plan", () => {
  const report = buildProductHealthReport({
    context: baseContext,
    rules: healthyRules,
    configuration: {
      prescriptionTypeConfigured: true,
      lensOptionsConfigured: true,
      subscriptionPlansConfigured: true,
      subscriptionPlansRequiresSellingPlanIntegration: true,
    },
  });

  assert.equal(report.status, "warning");
  assert.ok(
    report.issues.some(
      (issue) => issue.code === "SUBSCRIPTION_PLAN_NOT_BOUND",
    ),
  );
});

test("健康检查应识别缺失或已删除变体", () => {
  const brokenRules: LensRule[] = [
    {
      ...healthyRules[0],
      id: "rule-missing-variant",
      actions: [
        {
          type: "show",
          lensOptionId: "lens-basic",
          variantId: "variant-missing",
        },
      ],
    },
    {
      ...healthyRules[0],
      id: "rule-deleted-variant",
      actions: [
        {
          type: "show",
          lensOptionId: "lens-pro",
          variantId: "variant-deleted",
        },
      ],
    },
  ];

  const report = buildProductHealthReport({
    context: {
      ...baseContext,
      variants: [
        ...baseContext.variants,
        {
          id: "variant-deleted",
          sku: "SKU-X",
          isDeleted: true,
          inventoryAvailable: false,
        },
      ],
    },
    rules: brokenRules,
  });

  assert.equal(report.status, "error");
  assert.ok(report.issues.some((issue) => issue.code === "MISSING_VARIANT"));
  assert.ok(
    report.issues.some(
      (issue) => issue.code === "DELETED_VARIANT_REFERENCED",
    ),
  );
});

test("健康检查应识别优先级冲突和无可见镜片", () => {
  const conflictRules: LensRule[] = [
    {
      ...healthyRules[0],
      id: "rule-hide-1",
      priority: 50,
      actions: [
        {
          type: "hide",
          lensOptionId: "lens-basic",
        },
      ],
    },
    {
      ...healthyRules[0],
      id: "rule-hide-2",
      priority: 50,
      actions: [
        {
          type: "hide",
          lensOptionId: "lens-pro",
        },
      ],
    },
  ];

  const report = buildProductHealthReport({
    context: baseContext,
    rules: conflictRules,
  });

  assert.equal(report.status, "warning");
  assert.ok(
    report.issues.some((issue) => issue.code === "RULE_PRIORITY_CONFLICT"),
  );
  assert.ok(report.issues.some((issue) => issue.code === "NO_VISIBLE_LENS"));
});
