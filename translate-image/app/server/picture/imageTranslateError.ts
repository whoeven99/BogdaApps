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

const SUMMARY_MAX = 800;
const LOG_MAX = 1500;

/** `/timeout/` 匹配不到 `ETIMEDOUT`，换票失败必须显式认这个码。 */
export function isTimeoutLikeDetail(detail: string): boolean {
  const d = String(detail || "").toLowerCase();
  return /timeout|timed out|\baborted\b|etimedout|und_err_connect_timeout/.test(d);
}

export function isGeminiUnavailableDetail(detail: string): boolean {
  return /\b(502|503|504)\b/.test(detail) || isTimeoutLikeDetail(detail);
}

export class ImageTranslateError extends Error {
  readonly code: ImageTranslateErrorCode;
  readonly detail: string;

  constructor(code: ImageTranslateErrorCode, detail?: string, options?: ErrorOptions) {
    const trimmed = typeof detail === "string" ? detail.trim() : "";
    super(trimmed ? `${code}: ${trimmed}` : code, options);
    this.name = "ImageTranslateError";
    this.code = code;
    this.detail = trimmed;
  }
}

export function imageTranslateErrorCode(err: unknown): ImageTranslateErrorCode | null {
  return err instanceof ImageTranslateError ? err.code : null;
}

function errorBits(err: Error): string {
  const extra = err as Error & {
    code?: unknown;
    errno?: unknown;
    syscall?: unknown;
    address?: unknown;
    port?: unknown;
    hostname?: unknown;
  };
  const bits: string[] = [];
  if (err.name && err.name !== "Error") bits.push(`name=${err.name}`);
  const msg = err.message?.trim();
  if (msg) bits.push(msg);
  if (extra.code != null && String(extra.code) && !msg?.includes(String(extra.code))) {
    bits.push(`errCode=${extra.code}`);
  }
  if (extra.errno != null) bits.push(`errno=${extra.errno}`);
  if (extra.syscall) bits.push(`syscall=${extra.syscall}`);
  if (extra.hostname) bits.push(`hostname=${extra.hostname}`);
  if (extra.address) bits.push(`address=${extra.address}`);
  if (extra.port != null) bits.push(`port=${extra.port}`);
  return bits.join(" ");
}

/** Node `fetch failed` 的真实原因在 cause 链上；Render 只留单行字符串。 */
export function summarizeError(err: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let cur: unknown = err;
  for (let i = 0; i < 5 && cur != null && !seen.has(cur); i++) {
    seen.add(cur);
    if (cur instanceof Error) {
      const bits = errorBits(cur);
      if (bits) parts.push(bits);
      cur = "cause" in cur ? (cur as { cause?: unknown }).cause : undefined;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.filter(Boolean).join(" <- ").slice(0, SUMMARY_MAX);
}

/** 给日志 / API 用：不要把 Error 对象放 console 第二参数，Render 经常只留下前缀。 */
export function describeImageTranslateError(err: unknown): { code: string; detail: string } {
  if (err instanceof ImageTranslateError) return { code: err.code, detail: err.detail };
  if (err instanceof Error) return { code: "UNKNOWN", detail: summarizeError(err) };
  return { code: "UNKNOWN", detail: String(err) };
}

export function formatImageTranslateErrorLog(err: unknown): string {
  const { code, detail } = describeImageTranslateError(err);
  const causeSrc = err instanceof Error ? (err as { cause?: unknown }).cause : undefined;
  const cause = causeSrc != null ? summarizeError(causeSrc) : "";
  const parts = [`code=${code}`];
  if (detail) parts.push(`detail=${detail}`);
  if (cause && (!detail || !detail.includes(cause.slice(0, 40)))) {
    parts.push(`cause=${cause}`);
  }
  return parts.join(" ").slice(0, LOG_MAX);
}
