import {
  IMAGE_TRANSLATE_INSUFFICIENT_CREDITS,
  IMAGE_TRANSLATE_SCOPE_MISSING,
} from "./imageTranslate";

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function translateImageTranslateError(
  raw: string | null | undefined,
  t: Translate,
): string {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (!trimmed) return t("contentImage.item.FAILED");
  const token = trimmed.split(":")[0].trim();
  const key = `imageTranslate.error.${token}`;
  const translated = t(key);
  return translated === key ? t("imageTranslate.error.IMAGE_TRANSLATE_GENERIC") : translated;
}

export function showImageTranslateError(errorMsg: string | undefined, t: Translate) {
  const msg = String(errorMsg ?? "");
  const text =
    msg === IMAGE_TRANSLATE_SCOPE_MISSING
      ? t("imageTranslate.scopeMissing")
      : msg === IMAGE_TRANSLATE_INSUFFICIENT_CREDITS || msg === "insufficient credits"
        ? t("contentImage.insufficientCredits")
        : msg === "JOB_ACTIVE"
          ? t("contentImage.job.active")
          : msg || t("Image translation failed");
  const toast = (window as unknown as { shopify?: { toast?: { show: (m: string, o?: object) => void } } })
    .shopify?.toast;
  toast?.show(text, { isError: true });
}
