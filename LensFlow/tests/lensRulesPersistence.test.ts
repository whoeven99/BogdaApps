import test from "node:test";
import assert from "node:assert/strict";

import prisma from "../app/db.server.js";
import {
  createLensRule,
  ensureDefaultLensRules,
  listLensRulesByProduct,
} from "../app/models/lens-rules.server.js";

test("Prisma 规则服务应初始化默认规则并支持新增规则", async () => {
  const productId = `product-test-${Date.now()}`;

  try {
    await ensureDefaultLensRules(productId);
    const initialRules = await listLensRulesByProduct(productId);
    assert.equal(initialRules.length, 2);

    await createLensRule({
      productId,
      name: "阅读镜禁用高级镜片",
      priority: 80,
      enabled: true,
      prescriptionType: "reading",
      actionType: "disable",
      lensOptionId: "lens-pro",
      message: "阅读镜暂不支持高级镜片",
      variantId: "variant-1",
    });

    const rules = await listLensRulesByProduct(productId);
    assert.equal(rules.length, 3);
    assert.ok(rules.some((rule) => rule.name === "阅读镜禁用高级镜片"));
  } finally {
    await prisma.lensRule.deleteMany({
      where: {
        productId,
      },
    });
  }
});
