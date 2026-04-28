import test from "node:test";
import assert from "node:assert/strict";

import { evaluateLensRules } from "../src/domain/lensRuleEngine.js";
import { buildLensVisibilityDiagnostic } from "../src/services/diagnostics.js";
import type { LensRule, ProductContext } from "../src/types/lens.js";

const baseContext: ProductContext = {
  productId: "product-1",
  productType: "glasses",
  tags: ["frame", "acetate"],
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

const rules: LensRule[] = [
  {
    id: "rule-show-non-prescription",
    name: "无度数显示基础镜片",
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
        message: "当前处方支持基础镜片",
      },
    ],
  },
  {
    id: "rule-hide-other-prescription",
    name: "非无度数隐藏基础镜片",
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: "prescriptionType",
        operator: "neq",
        value: "non_prescription",
      },
    ],
    actions: [
      {
        type: "hide",
        lensOptionId: "lens-basic",
        message: "该镜片仅支持无度数",
      },
    ],
  },
];

test("无度数时应展示镜片", () => {
  const result = evaluateLensRules(baseContext, rules);
  assert.equal(result.decisions["lens-basic"]?.state, "visible");
  assert.deepEqual(result.decisions["lens-basic"]?.reasonCodes, ["LENS_VISIBLE"]);
});

test("非无度数时应隐藏镜片", () => {
  const context: ProductContext = {
    ...baseContext,
    prescriptionType: "single_vision",
  };

  const result = evaluateLensRules(context, rules);
  assert.equal(result.decisions["lens-basic"]?.state, "hidden");
  assert.deepEqual(result.decisions["lens-basic"]?.reasonCodes, ["LENS_HIDDEN"]);
});

test("绑定变体缺失时应返回诊断结果", () => {
  const brokenRules: LensRule[] = [
    {
      ...rules[0],
      actions: [
        {
          type: "show",
          lensOptionId: "lens-basic",
          variantId: "missing-variant",
          message: "绑定变体缺失",
        },
      ],
    },
  ];

  const diagnostic = buildLensVisibilityDiagnostic(baseContext, brokenRules);
  assert.deepEqual(diagnostic.visibleLensOptionIds, []);
  assert.deepEqual(diagnostic.hiddenLensOptionIds, ["lens-basic"]);
  assert.ok(diagnostic.summaryMessages.includes("绑定变体缺失"));
  assert.equal(diagnostic.traces[0]?.matched, true);
});
