import type { PrescriptionType, ProductContext } from "../../src/types/lens.js";

export type PreviewPrescriptionType = PrescriptionType | "original";

export function parsePreviewPrescriptionType(
  value: string | null,
): PreviewPrescriptionType {
  if (
    value === "non_prescription" ||
    value === "single_vision" ||
    value === "progressive" ||
    value === "reading"
  ) {
    return value;
  }

  return "original";
}

export function buildPreviewContext(
  context: ProductContext,
  previewPrescriptionType: PreviewPrescriptionType,
): ProductContext {
  if (previewPrescriptionType === "original") {
    return context;
  }

  return {
    ...context,
    prescriptionType: previewPrescriptionType,
  };
}
