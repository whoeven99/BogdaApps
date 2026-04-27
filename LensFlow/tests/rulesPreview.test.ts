import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPreviewContext,
  parsePreviewPrescriptionType,
} from "../app/lib/rules-preview.server.js";
import type { ProductContext } from "../src/types/lens.js";

const baseContext: ProductContext = {
  productId: "product-1",
  productType: "glasses",
  tags: ["frame"],
  prescriptionType: "reading",
  variants: [
    {
      id: "variant-1",
      sku: "SKU-1",
      isDeleted: false,
      inventoryAvailable: true,
    },
  ],
};

test("预览处方类型解析应在非法值时回退 original", () => {
  assert.equal(parsePreviewPrescriptionType(null), "original");
  assert.equal(parsePreviewPrescriptionType("unexpected"), "original");
  assert.equal(parsePreviewPrescriptionType("progressive"), "progressive");
});

test("预览上下文应在 original 时保持原值，在模拟时覆盖处方类型", () => {
  const originalContext = buildPreviewContext(baseContext, "original");
  const simulatedContext = buildPreviewContext(baseContext, "single_vision");

  assert.equal(originalContext.prescriptionType, "reading");
  assert.equal(simulatedContext.prescriptionType, "single_vision");
  assert.equal(simulatedContext.productId, baseContext.productId);
});
