import test from "node:test";
import assert from "node:assert/strict";

import { getProductLensOptions } from "../src/api/lensApi.js";
import { InMemoryLensRepository } from "../src/repositories/inMemoryLensRepository.js";
import { buildProductLensOptions } from "../src/services/productLensOptions.js";

test("前台镜片结果应返回可见镜片与价格调整", () => {
  const repository = new InMemoryLensRepository();
  const context = repository.getProductContext("product-1");

  assert.ok(context);
  const rules = repository.listRules("product-1").map((item) => item.rule);
  const lensOptions = repository.getLensOptions("product-1");
  const result = buildProductLensOptions(context, rules, lensOptions);

  assert.equal(result.availableLensOptions.length, 1);
  assert.equal(result.availableLensOptions[0]?.id, "lens-basic");
  assert.equal(result.priceAdjustments[0]?.amount, 0);
});

test("前台镜片结果应返回可见、禁用、隐藏状态和提示文案", () => {
  const context = {
    productId: "product-preview",
    productType: "glasses",
    tags: ["frame"],
    prescriptionType: "non_prescription" as const,
    variants: [
      {
        id: "variant-1",
        sku: "SKU-1",
        isDeleted: false,
        inventoryAvailable: true,
      },
    ],
  };
  const rules = [
    {
      id: "rule-show",
      name: "显示基础镜片",
      priority: 100,
      enabled: true,
      conditions: [
        {
          field: "prescriptionType" as const,
          operator: "eq" as const,
          value: "non_prescription",
        },
      ],
      actions: [
        {
          type: "show" as const,
          lensOptionId: "lens-basic",
          message: "基础镜片可售",
        },
      ],
    },
    {
      id: "rule-disable",
      name: "禁用超薄镜片",
      priority: 90,
      enabled: true,
      conditions: [
        {
          field: "prescriptionType" as const,
          operator: "eq" as const,
          value: "non_prescription",
        },
      ],
      actions: [
        {
          type: "disable" as const,
          lensOptionId: "lens-ultra",
          message: "该镜片暂不可选",
        },
      ],
    },
  ];
  const lensOptions = [
    { id: "lens-basic", name: "基础镜片", basePrice: 0 },
    { id: "lens-ultra", name: "超薄镜片", basePrice: 120 },
    { id: "lens-hidden", name: "隐藏镜片", basePrice: 60 },
  ];

  const result = buildProductLensOptions(context, rules, lensOptions);

  assert.equal(result.availableLensOptions.length, 1);
  assert.equal(result.disabledLensOptions.length, 1);
  assert.equal(result.hiddenLensOptions.length, 1);
  assert.equal(result.availableLensOptions[0]?.messages[0], "基础镜片可售");
  assert.equal(result.disabledLensOptions[0]?.messages[0], "该镜片暂不可选");
  assert.ok(result.reasonCodes.includes("RULE_NOT_MATCHED"));
});

test("选中变体不匹配时应隐藏绑定变体的镜片动作", () => {
  const context = {
    productId: "product-variant-preview",
    productType: "glasses",
    tags: ["frame"],
    prescriptionType: "non_prescription" as const,
    selectedVariantId: "variant-2",
    variants: [
      {
        id: "variant-1",
        sku: "SKU-1",
        isDeleted: false,
        inventoryAvailable: true,
      },
      {
        id: "variant-2",
        sku: "SKU-2",
        isDeleted: false,
        inventoryAvailable: true,
      },
    ],
  };
  const rules = [
    {
      id: "rule-show-selected-variant",
      name: "仅指定变体显示基础镜片",
      priority: 100,
      enabled: true,
      conditions: [
        {
          field: "prescriptionType" as const,
          operator: "eq" as const,
          value: "non_prescription",
        },
      ],
      actions: [
        {
          type: "show" as const,
          lensOptionId: "lens-basic",
          variantId: "variant-1",
        },
      ],
    },
  ];
  const lensOptions = [{ id: "lens-basic", name: "基础镜片", basePrice: 0 }];

  const result = buildProductLensOptions(context, rules, lensOptions);

  assert.equal(result.availableLensOptions.length, 0);
  assert.equal(result.hiddenLensOptions[0]?.id, "lens-basic");
  assert.ok(result.hiddenLensOptions[0]?.reasonCodes.includes("RULE_NOT_MATCHED"));
});

test("前台镜片接口应在非无度数时返回隐藏镜片", () => {
  const repository = new InMemoryLensRepository();
  const response = getProductLensOptions(repository, {
    productId: "product-1",
    prescriptionType: "single_vision",
  });

  assert.equal(response.status, 200);
  if (!("hiddenLensOptions" in response.body)) {
    assert.fail("预期返回商品镜片结果");
  }

  assert.ok(
    response.body.hiddenLensOptions.some((option) => option.id === "lens-basic"),
  );
});

test("前台镜片接口应在商品不存在时返回 404", () => {
  const repository = new InMemoryLensRepository();
  const response = getProductLensOptions(repository, {
    productId: "missing-product",
  });

  assert.equal(response.status, 404);
  if (!("error" in response.body)) {
    assert.fail("预期返回错误消息");
  }

  assert.match(response.body.error, /未找到/);
});
