import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  IMAGE_TRANSLATE_MERCHANT_MODELS,
  imageTranslateCredits,
} from "~/server/picture/imageTranslateModels";

export const IMAGE_TRANSLATE_SCOPE_MISSING = "SCOPE_MISSING";
export const IMAGE_TRANSLATE_INSUFFICIENT_CREDITS = "额度不够";

export {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  IMAGE_TRANSLATE_MERCHANT_MODELS,
  imageTranslateCredits,
};

export function merchantImageCredits(model: unknown): number {
  return imageTranslateCredits(
    model === "advance" ? IMAGE_TRANSLATE_ADVANCE_MODEL : DEFAULT_IMAGE_TRANSLATE_MODEL,
  );
}
