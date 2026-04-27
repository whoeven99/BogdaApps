import type { PrescriptionType } from "../types/lens.js";
import type {
  EyeExamInput,
  NormalizedEyeExam,
  ProductRecommendation,
  ProductRecommendationResult,
  RecommendableProduct,
} from "../types/prescription.js";

function toNumber(value: number | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toAxis(value: number | undefined): number | null {
  const axis = toNumber(value);
  if (axis === null || axis < 0 || axis > 180) {
    return null;
  }

  return axis;
}

function hasDistanceCorrection(exam: EyeExamInput): boolean {
  const values = [
    exam.leftEye?.sphere,
    exam.leftEye?.cylinder,
    exam.rightEye?.sphere,
    exam.rightEye?.cylinder,
  ];

  return values.some((value) => typeof value === "number" && Math.abs(value) > 0);
}

function inferPrescriptionType(exam: EyeExamInput): PrescriptionType {
  if (exam.prescriptionType) {
    return exam.prescriptionType;
  }

  const addPower = toNumber(exam.addPower);
  if (addPower !== null && addPower > 0) {
    return hasDistanceCorrection(exam) ? "progressive" : "reading";
  }

  if (hasDistanceCorrection(exam)) {
    return "single_vision";
  }

  return "non_prescription";
}

function maxPrescriptionMagnitude(exam: NormalizedEyeExam): number {
  return Math.max(
    Math.abs(exam.leftEye.sphere),
    Math.abs(exam.leftEye.cylinder),
    Math.abs(exam.rightEye.sphere),
    Math.abs(exam.rightEye.cylinder),
  );
}

function isHighIndexRecommended(exam: NormalizedEyeExam): boolean {
  return maxPrescriptionMagnitude(exam) >= 4;
}

function hasHighIndexLens(product: RecommendableProduct): boolean {
  const pattern = /(高折射|超薄|advanced|premium|pro|thin|high index)/i;

  return product.lensOptions.some((option) => pattern.test(option.name));
}

export function normalizeEyeExamInput(exam: EyeExamInput): NormalizedEyeExam {
  return {
    prescriptionType: inferPrescriptionType(exam),
    leftEye: {
      sphere: toNumber(exam.leftEye?.sphere) ?? 0,
      cylinder: toNumber(exam.leftEye?.cylinder) ?? 0,
      axis: toAxis(exam.leftEye?.axis),
    },
    rightEye: {
      sphere: toNumber(exam.rightEye?.sphere) ?? 0,
      cylinder: toNumber(exam.rightEye?.cylinder) ?? 0,
      axis: toAxis(exam.rightEye?.axis),
    },
    addPower: toNumber(exam.addPower),
    pd: toNumber(exam.pd),
  };
}

function buildSummaryMessages(exam: NormalizedEyeExam): string[] {
  const messages: string[] = [];

  if (exam.prescriptionType === "progressive") {
    messages.push("已按渐进/多焦点需求筛选商品。");
  } else if (exam.prescriptionType === "reading") {
    messages.push("已按老花阅读需求筛选商品。");
  } else if (exam.prescriptionType === "single_vision") {
    messages.push("已按单光配镜需求筛选商品。");
  } else {
    messages.push("已按平光/无度数需求筛选商品。");
  }

  if (isHighIndexRecommended(exam)) {
    messages.push("当前度数较高，建议优先选择超薄或高折射率镜片。");
  }

  if (exam.addPower !== null && exam.addPower > 0) {
    messages.push(`检测到 ADD ${exam.addPower}，推荐支持近用补偿的配镜方案。`);
  }

  if (exam.pd !== null) {
    messages.push(`已记录瞳距 PD ${exam.pd}。`);
  }

  return messages;
}

function buildRecommendation(
  product: RecommendableProduct,
  exam: NormalizedEyeExam,
): ProductRecommendation {
  const reasons = [`商品支持 ${product.prescriptionType} 配镜类型。`];
  let score = 100;
  const highIndexRecommended = isHighIndexRecommended(exam);

  if (highIndexRecommended && hasHighIndexLens(product)) {
    reasons.push("商品已配置超薄/高折射率镜片选项，更适合较高度数。");
    score += 20;
  } else if (highIndexRecommended) {
    reasons.push("商品可匹配当前处方类型，但建议确认是否支持更高折射率镜片。");
  } else {
    reasons.push("当前度数范围可优先使用标准镜片方案。");
    score += 10;
  }

  if (exam.prescriptionType === "reading" && product.tags.includes("reading")) {
    reasons.push("商品标签明确标记了 reading 场景。");
    score += 10;
  }

  if (
    exam.prescriptionType === "progressive" &&
    product.tags.includes("progressive")
  ) {
    reasons.push("商品标签明确标记了 progressive 场景。");
    score += 10;
  }

  return {
    productId: product.id,
    title: product.title,
    handle: product.handle,
    productType: product.productType,
    prescriptionType: product.prescriptionType,
    lensOptions: product.lensOptions,
    reasons,
    recommendedLensTier: highIndexRecommended ? "high_index" : "standard",
    score,
  };
}

export function recommendProductsForEyeExam(
  products: RecommendableProduct[],
  examInput: EyeExamInput,
): ProductRecommendationResult {
  const exam = normalizeEyeExamInput(examInput);
  const recommendations = products
    .filter(
      (product) =>
        product.status === "ACTIVE" &&
        product.prescriptionType === exam.prescriptionType,
    )
    .map((product) => buildRecommendation(product, exam))
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title));

  return {
    exam,
    summaryMessages: buildSummaryMessages(exam),
    recommendations,
  };
}
