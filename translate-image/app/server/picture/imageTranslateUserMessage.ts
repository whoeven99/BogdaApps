import { describeImageTranslateError } from "./imageTranslateError";

/** 写入 Turso / 返回 API 的稳定 token；UI 用 `imageTranslate.error.{token}` 映射文案。 */
export const IMAGE_TRANSLATE_MSG_GEMINI_RATE_LIMIT = "IMAGE_TRANSLATE_GEMINI_RATE_LIMIT";
export const IMAGE_TRANSLATE_MSG_GEMINI_UNAVAILABLE = "IMAGE_TRANSLATE_GEMINI_UNAVAILABLE";
export const IMAGE_TRANSLATE_MSG_GEMINI_FAILED = "IMAGE_TRANSLATE_GEMINI_FAILED";
export const IMAGE_TRANSLATE_MSG_GEMINI_BLOCKED = "IMAGE_TRANSLATE_GEMINI_BLOCKED";
export const IMAGE_TRANSLATE_MSG_GEMINI_NO_IMAGE = "IMAGE_TRANSLATE_GEMINI_NO_IMAGE";
export const IMAGE_TRANSLATE_MSG_GEMINI_NOT_CONFIGURED = "IMAGE_TRANSLATE_GEMINI_NOT_CONFIGURED";
export const IMAGE_TRANSLATE_MSG_INVALID_IMAGE_URL = "IMAGE_TRANSLATE_INVALID_IMAGE_URL";
export const IMAGE_TRANSLATE_MSG_UNSUPPORTED_FORMAT = "IMAGE_TRANSLATE_UNSUPPORTED_FORMAT";
export const IMAGE_TRANSLATE_MSG_IMAGE_TOO_LARGE = "IMAGE_TRANSLATE_IMAGE_TOO_LARGE";
export const IMAGE_TRANSLATE_MSG_IMAGE_FETCH_FAILED = "IMAGE_TRANSLATE_IMAGE_FETCH_FAILED";
export const IMAGE_TRANSLATE_MSG_SHOPIFY_SCOPE_MISSING = "IMAGE_TRANSLATE_SHOPIFY_SCOPE_MISSING";
export const IMAGE_TRANSLATE_MSG_SHOPIFY_UPLOAD_FAILED = "IMAGE_TRANSLATE_SHOPIFY_UPLOAD_FAILED";
export const IMAGE_TRANSLATE_MSG_SAVE_FAILED = "IMAGE_TRANSLATE_SAVE_FAILED";
export const IMAGE_TRANSLATE_MSG_GENERIC = "IMAGE_TRANSLATE_GENERIC";

export const IMAGE_TRANSLATE_USER_MESSAGE_TOKENS = [
  IMAGE_TRANSLATE_MSG_GEMINI_RATE_LIMIT,
  IMAGE_TRANSLATE_MSG_GEMINI_UNAVAILABLE,
  IMAGE_TRANSLATE_MSG_GEMINI_FAILED,
  IMAGE_TRANSLATE_MSG_GEMINI_BLOCKED,
  IMAGE_TRANSLATE_MSG_GEMINI_NO_IMAGE,
  IMAGE_TRANSLATE_MSG_GEMINI_NOT_CONFIGURED,
  IMAGE_TRANSLATE_MSG_INVALID_IMAGE_URL,
  IMAGE_TRANSLATE_MSG_UNSUPPORTED_FORMAT,
  IMAGE_TRANSLATE_MSG_IMAGE_TOO_LARGE,
  IMAGE_TRANSLATE_MSG_IMAGE_FETCH_FAILED,
  IMAGE_TRANSLATE_MSG_SHOPIFY_SCOPE_MISSING,
  IMAGE_TRANSLATE_MSG_SHOPIFY_UPLOAD_FAILED,
  IMAGE_TRANSLATE_MSG_SAVE_FAILED,
  IMAGE_TRANSLATE_MSG_GENERIC,
] as const;

export type ImageTranslateUserMessageToken =
  (typeof IMAGE_TRANSLATE_USER_MESSAGE_TOKENS)[number];

const TOKEN_SET = new Set<string>(IMAGE_TRANSLATE_USER_MESSAGE_TOKENS);

export function isImageTranslateUserMessageToken(
  value: string,
): value is ImageTranslateUserMessageToken {
  return TOKEN_SET.has(value);
}

function isGeminiRateLimited(detail: string): boolean {
  const d = detail.toLowerCase();
  return (
    /\b429\b/.test(detail) ||
    /resource has been exhausted/.test(d) ||
    /rate limit|too many requests/.test(d) ||
    (/quota/.test(d) && /exhaust|exceed|limit/.test(d))
  );
}

function isGeminiUnavailable(detail: string): boolean {
  return /\b(502|503|504)\b/.test(detail) || /unavailable|timeout|timed out/i.test(detail);
}

/** 由 error code + 原始 detail 归类为商户可见 token（日志仍保留 detail）。 */
export function classifyImageTranslateUserMessageToken(
  code: string,
  detail: string,
): ImageTranslateUserMessageToken {
  switch (code) {
    case "INVALID_IMAGE_URL":
      return IMAGE_TRANSLATE_MSG_INVALID_IMAGE_URL;
    case "UNSUPPORTED_FORMAT":
      return IMAGE_TRANSLATE_MSG_UNSUPPORTED_FORMAT;
    case "IMAGE_TOO_LARGE":
      return IMAGE_TRANSLATE_MSG_IMAGE_TOO_LARGE;
    case "IMAGE_FETCH_FAILED":
      return IMAGE_TRANSLATE_MSG_IMAGE_FETCH_FAILED;
    case "GEMINI_NOT_CONFIGURED":
      return IMAGE_TRANSLATE_MSG_GEMINI_NOT_CONFIGURED;
    case "GEMINI_BLOCKED":
      return IMAGE_TRANSLATE_MSG_GEMINI_BLOCKED;
    case "GEMINI_NO_IMAGE":
      return IMAGE_TRANSLATE_MSG_GEMINI_NO_IMAGE;
    case "SHOPIFY_SCOPE_MISSING":
      return IMAGE_TRANSLATE_MSG_SHOPIFY_SCOPE_MISSING;
    case "SHOPIFY_UPLOAD_FAILED":
      return IMAGE_TRANSLATE_MSG_SHOPIFY_UPLOAD_FAILED;
    case "SAVE_FAILED":
      return IMAGE_TRANSLATE_MSG_SAVE_FAILED;
    case "GEMINI_FAILED":
      if (isGeminiRateLimited(detail)) return IMAGE_TRANSLATE_MSG_GEMINI_RATE_LIMIT;
      if (isGeminiUnavailable(detail)) return IMAGE_TRANSLATE_MSG_GEMINI_UNAVAILABLE;
      return IMAGE_TRANSLATE_MSG_GEMINI_FAILED;
    default:
      if (isGeminiRateLimited(detail)) return IMAGE_TRANSLATE_MSG_GEMINI_RATE_LIMIT;
      return IMAGE_TRANSLATE_MSG_GENERIC;
  }
}

/** 解析历史 `CODE: detail` 存库格式。 */
export function parseLegacyImageTranslateFailMessage(
  raw: string,
): { code: string; detail: string } | null {
  const trimmed = raw.trim();
  const idx = trimmed.indexOf(":");
  if (idx <= 0) return null;
  const code = trimmed.slice(0, idx).trim();
  if (!/^[A-Z][A-Z0-9_]*$/.test(code)) return null;
  return { code, detail: trimmed.slice(idx + 1).trim() };
}

/** DB / API 里已是 token 或 legacy 字符串 → 统一 token。 */
export function resolveImageTranslateUserMessageToken(
  stored: string,
): ImageTranslateUserMessageToken {
  const trimmed = stored.trim();
  if (!trimmed) return IMAGE_TRANSLATE_MSG_GENERIC;
  if (isImageTranslateUserMessageToken(trimmed)) return trimmed;
  if (trimmed === "SAVE_FAILED") return IMAGE_TRANSLATE_MSG_SAVE_FAILED;
  const legacy = parseLegacyImageTranslateFailMessage(trimmed);
  if (legacy) {
    if (isImageTranslateUserMessageToken(legacy.code)) return legacy.code;
    return classifyImageTranslateUserMessageToken(legacy.code, legacy.detail);
  }
  return classifyImageTranslateUserMessageToken("UNKNOWN", trimmed);
}

/** API / toast：只返商户 token。 */
export function imageTranslateFailMessage(err: unknown): string {
  const { code, detail } = describeImageTranslateError(err);
  return classifyImageTranslateUserMessageToken(code, detail);
}

/** Turso 任务明细：token + Vertex/HTTP 原文，UI 仍按 token 映射。 */
export function imageTranslateFailStorage(err: unknown): string {
  const { code, detail } = describeImageTranslateError(err);
  const token = classifyImageTranslateUserMessageToken(code, detail);
  if (!detail) return token;
  return `${token}: ${detail}`.slice(0, 500);
}
