export type ImageTranslateErrorCode =
  | "INVALID_IMAGE_URL"
  | "UNSUPPORTED_FORMAT"
  | "IMAGE_TOO_LARGE"
  | "IMAGE_FETCH_FAILED"
  | "GEMINI_NOT_CONFIGURED"
  | "GEMINI_FAILED"
  | "GEMINI_RATE_LIMITED"
  | "GEMINI_BLOCKED"
  | "GEMINI_NO_IMAGE"
  | "SHOPIFY_SCOPE_MISSING"
  | "SHOPIFY_UPLOAD_FAILED";

export class ImageTranslateError extends Error {
  readonly code: ImageTranslateErrorCode;
  readonly detail: string;

  constructor(code: ImageTranslateErrorCode, detail?: string) {
    const trimmed = typeof detail === "string" ? detail.trim() : "";
    super(trimmed ? `${code}: ${trimmed}` : code);
    this.name = "ImageTranslateError";
    this.code = code;
    this.detail = trimmed;
  }
}

export function imageTranslateErrorCode(err: unknown): ImageTranslateErrorCode | null {
  return err instanceof ImageTranslateError ? err.code : null;
}

/** 给日志 / API 用：不要把 Error 对象放 console 第二参数，Render 经常只留下前缀。 */
export function describeImageTranslateError(err: unknown): { code: string; detail: string } {
  if (err instanceof ImageTranslateError) return { code: err.code, detail: err.detail };
  if (err instanceof Error) return { code: "UNKNOWN", detail: err.message };
  return { code: "UNKNOWN", detail: String(err) };
}

export function formatImageTranslateErrorLog(err: unknown): string {
  const { code, detail } = describeImageTranslateError(err);
  return detail ? `code=${code} detail=${detail}` : `code=${code}`;
}

export { imageTranslateFailMessage, imageTranslateFailStorage } from "./imageTranslateUserMessage";
