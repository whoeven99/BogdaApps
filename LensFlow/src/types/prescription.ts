import type { LensOption, PrescriptionType } from "./lens.js";

export type EyeExamEyeInput = {
  sphere?: number;
  cylinder?: number;
  axis?: number;
};

export type EyeExamInput = {
  prescriptionType?: PrescriptionType;
  leftEye?: EyeExamEyeInput;
  rightEye?: EyeExamEyeInput;
  addPower?: number;
  pd?: number;
};

export type NormalizedEyeExam = {
  prescriptionType: PrescriptionType;
  leftEye: {
    sphere: number;
    cylinder: number;
    axis: number | null;
  };
  rightEye: {
    sphere: number;
    cylinder: number;
    axis: number | null;
  };
  addPower: number | null;
  pd: number | null;
};

export type RecommendableProduct = {
  id: string;
  title: string;
  handle: string;
  status: string;
  tags: string[];
  productType?: string;
  prescriptionType: PrescriptionType;
  lensOptions: LensOption[];
};

export type ProductRecommendation = {
  productId: string;
  title: string;
  handle: string;
  productType?: string;
  prescriptionType: PrescriptionType;
  lensOptions: LensOption[];
  reasons: string[];
  recommendedLensTier: "standard" | "high_index";
  score: number;
};

export type ProductRecommendationResult = {
  exam: NormalizedEyeExam;
  summaryMessages: string[];
  recommendations: ProductRecommendation[];
};
