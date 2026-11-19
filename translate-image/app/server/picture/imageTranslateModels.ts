/** 图片翻译可选模型与每张积分；无 Node 依赖，Admin 前端也可直接 import。 */
export const IMAGE_TRANSLATE_MODELS = [
  { id: "gemini-nano-banana-2.1", name: "Nano Banana 2.1", credits: 2000 },
  { id: "gemini-3.1-flash-image", name: "Nano Banana 2", credits: 2000 },
  { id: "gemini-3.1-flash-lite-image", name: "Nano Banana 2 Lite", credits: 2000 },
  { id: "gemini-3-pro-image", name: "Nano Banana Pro", credits: 6000 },
  { id: "gemini-2.5-flash-image", name: "Nano Banana", credits: 2000 },
] as const;

export type ImageTranslateModelId = (typeof IMAGE_TRANSLATE_MODELS)[number]["id"];

export const DEFAULT_IMAGE_TRANSLATE_MODEL: ImageTranslateModelId = "gemini-nano-banana-2.1";
export const IMAGE_TRANSLATE_ADVANCE_MODEL: ImageTranslateModelId = "gemini-3-pro-image";

export type ImageTranslateMerchantTier = "standard" | "advance";

function catalogModel<I extends ImageTranslateModelId>(id: I) {
  return IMAGE_TRANSLATE_MODELS.find(
    (m): m is Extract<(typeof IMAGE_TRANSLATE_MODELS)[number], { id: I }> => m.id === id,
  )!;
}

/** 商户下拉两档：Standard = 最新 2000 积分模型，Advance = 6000 积分模型。 */
export const IMAGE_TRANSLATE_MERCHANT_MODELS = [
  { ...catalogModel(DEFAULT_IMAGE_TRANSLATE_MODEL), tier: "standard" as const },
  { ...catalogModel(IMAGE_TRANSLATE_ADVANCE_MODEL), tier: "advance" as const },
] as const;

export function resolveImageTranslateModel(raw: unknown): ImageTranslateModelId {
  const id = typeof raw === "string" ? raw.trim() : "";
  const hit = IMAGE_TRANSLATE_MODELS.find((m) => m.id === id);
  return hit ? hit.id : DEFAULT_IMAGE_TRANSLATE_MODEL;
}

export function isImageTranslateModel(raw: unknown): boolean {
  return IMAGE_TRANSLATE_MODELS.some((m) => m.id === raw);
}

export function imageTranslateCredits(model: unknown): number {
  const id = resolveImageTranslateModel(model);
  return IMAGE_TRANSLATE_MODELS.find((m) => m.id === id)!.credits;
}
