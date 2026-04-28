import test from "node:test";
import assert from "node:assert/strict";

import {
  createOrUpdateLensRule,
  diagnoseLensVisibility,
  getProductHealth,
  listLensRules,
  previewLensRules,
} from "../src/api/lensApi.js";
import { InMemoryLensRepository } from "../src/repositories/inMemoryLensRepository.js";
import type { LensRule } from "../src/types/lens.js";

test("规则列表接口应返回种子规则", () => {
  const repository = new InMemoryLensRepository();
  const response = listLensRules(repository, "product-1");

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.equal(response.body.length, 2);
});

test("规则预览接口应返回可见镜片", () => {
  const repository = new InMemoryLensRepository();
  const response = previewLensRules(repository, {
    productId: "product-1",
    prescriptionType: "non_prescription",
  });

  assert.equal(response.status, 200);
  if (!("visibleLensOptionIds" in response.body)) {
    assert.fail("预期返回预览结果");
  }

  assert.deepEqual(response.body.visibleLensOptionIds, ["lens-basic"]);
});

test("诊断接口应在非无度数时返回隐藏镜片", () => {
  const repository = new InMemoryLensRepository();
  const response = diagnoseLensVisibility(repository, {
    productId: "product-1",
    prescriptionType: "single_vision",
  });

  assert.equal(response.status, 200);
  if (!("hiddenLensOptionIds" in response.body)) {
    assert.fail("预期返回诊断结果");
  }

  assert.ok(response.body.hiddenLensOptionIds.includes("lens-basic"));
});

test("健康检查接口应返回 warning 或 error", () => {
  const repository = new InMemoryLensRepository();
  const response = getProductHealth(repository, "product-1");

  assert.equal(response.status, 200);
  if (!("status" in response.body)) {
    assert.fail("预期返回健康检查结果");
  }

  assert.ok(["healthy", "warning", "error"].includes(response.body.status));
});

test("创建规则接口应支持新增规则", () => {
  const repository = new InMemoryLensRepository();
  const rule: LensRule = {
    id: "rule-disable-reading",
    name: "阅读镜禁用高级镜片",
    priority: 80,
    enabled: true,
    conditions: [
      {
        field: "prescriptionType",
        operator: "eq",
        value: "reading",
      },
    ],
    actions: [
      {
        type: "disable",
        lensOptionId: "lens-pro",
        message: "阅读镜场景暂不支持高级镜片",
      },
    ],
  };

  const response = createOrUpdateLensRule(repository, {
    productId: "product-1",
    rule,
  });

  assert.equal(response.status, 200);
  if (!("id" in response.body)) {
    assert.fail("预期返回规则对象");
  }

  assert.equal(response.body.id, "rule-disable-reading");
  const listResponse = listLensRules(repository, "product-1");
  assert.equal(listResponse.status, 200);
  if (!Array.isArray(listResponse.body)) {
    assert.fail("预期返回规则数组");
  }

  assert.equal(listResponse.body.length, 3);
});

test("商品不存在时接口应返回 404", () => {
  const repository = new InMemoryLensRepository();
  const response = getProductHealth(repository, "missing-product");

  assert.equal(response.status, 404);
  if (!("error" in response.body)) {
    assert.fail("预期返回错误消息");
  }

  assert.match(response.body.error, /未找到/);
});
