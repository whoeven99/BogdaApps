import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  IMAGE_TRANSLATE_MERCHANT_MODELS,
  IMAGE_TRANSLATE_MODELS,
  imageTranslateCredits,
} from "~/server/picture/imageTranslateModels";

export const IMAGE_TRANSLATE_SCOPE_MISSING = "SCOPE_MISSING";
export const IMAGE_TRANSLATE_INSUFFICIENT_CREDITS = "额度不够";

export {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  IMAGE_TRANSLATE_MERCHANT_MODELS,
  IMAGE_TRANSLATE_MODELS,
  imageTranslateCredits,
};

const MERCHANT_NAME_KEYS = {
  standard: "imageTranslate.modelStandard",
  advance: "imageTranslate.modelAdvance",
} as const;

export function imageTranslateModelOptions(
  t: (key: string, options?: { credits: string }) => string,
  formatNumber: (credits: number) => string,
): { label: string; value: string }[] {
  return IMAGE_TRANSLATE_MERCHANT_MODELS.map((m) => ({
    value: m.id,
    label: `${t(MERCHANT_NAME_KEYS[m.tier])} · ${t("imageTranslate.creditsPerImage", { credits: formatNumber(m.credits) })}`,
  }));
}

export function merchantImageCredits(model: unknown): number {
  return imageTranslateCredits(
    model === "advance" ? IMAGE_TRANSLATE_ADVANCE_MODEL : DEFAULT_IMAGE_TRANSLATE_MODEL,
  );
}
