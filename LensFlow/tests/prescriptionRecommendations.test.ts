import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeEyeExamInput,
  recommendProductsForEyeExam,
} from "../src/services/prescriptionRecommendations.js";

test("应根据 ADD 自动推断 reading 或 progressive", () => {
  const reading = normalizeEyeExamInput({
    addPower: 1.5,
  });
  assert.equal(reading.prescriptionType, "reading");

  const progressive = normalizeEyeExamInput({
    leftEye: { sphere: -2 },
    rightEye: { sphere: -1.5 },
    addPower: 1.75,
  });
  assert.equal(progressive.prescriptionType, "progressive");
});

test("应只返回匹配当前处方类型的商品", () => {
  const result = recommendProductsForEyeExam(
    [
      {
        id: "product-1",
        title: "单光眼镜",
        handle: "single-vision-glasses",
        status: "ACTIVE",
        tags: ["single_vision"],
        prescriptionType: "single_vision",
        lensOptions: [{ id: "lens-basic", name: "基础镜片", basePrice: 0 }],
      },
      {
        id: "product-2",
        title: "老花眼镜",
        handle: "reading-glasses",
        status: "ACTIVE",
        tags: ["reading"],
        prescriptionType: "reading",
        lensOptions: [{ id: "lens-reading", name: "阅读镜片", basePrice: 20 }],
      },
    ],
    {
      prescriptionType: "reading",
    },
  );

  assert.equal(result.recommendations.length, 1);
  assert.equal(result.recommendations[0]?.productId, "product-2");
});

test("高度数时应优先推荐带超薄镜片的商品", () => {
  const result = recommendProductsForEyeExam(
    [
      {
        id: "product-standard",
        title: "标准单光",
        handle: "standard-single-vision",
        status: "ACTIVE",
        tags: ["single_vision"],
        prescriptionType: "single_vision",
        lensOptions: [{ id: "lens-basic", name: "基础镜片", basePrice: 0 }],
      },
      {
        id: "product-pro",
        title: "高折射单光",
        handle: "pro-single-vision",
        status: "ACTIVE",
        tags: ["single_vision"],
        prescriptionType: "single_vision",
        lensOptions: [{ id: "lens-pro", name: "超薄镜片", basePrice: 120 }],
      },
    ],
    {
      leftEye: { sphere: -5 },
      rightEye: { sphere: -4.5 },
    },
  );

  assert.equal(result.exam.prescriptionType, "single_vision");
  assert.equal(result.recommendations[0]?.productId, "product-pro");
  assert.equal(result.recommendations[0]?.recommendedLensTier, "high_index");
});
