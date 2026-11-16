import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { ImageTranslateError } from "./imageTranslateError";
import type { ImageTranslateModelId } from "./imageTranslateModels";

/**
 * Vertex AI Gemini 改图（Nano Banana）。凭证只走服务账号：
 * `GOOGLE_SERVICE_ACCOUNT_JSON`（Render）或 `GOOGLE_APPLICATION_CREDENTIALS`（JSON 文件路径），
 * 项目 `GOOGLE_CLOUD_PROJECT`（缺省取服务账号的 project_id），区域 `GOOGLE_CLOUD_LOCATION`（默认 global）。
 */
/** 不支持 `imageConfig.imageSize` 的模型（只出 1K）。 */
const MODELS_WITHOUT_IMAGE_SIZE = new Set<string>(["gemini-2.5-flash-image"]);

const OUTPUT_IMAGE_SIZE = "2K";
const CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";
const GEMINI_TIMEOUT_MS = 180_000;
const GEMINI_429_ATTEMPTS = 4;
/** 400 / 5xx / timeout 总请求次数（含首次）；与 429 计数独立。 */
const GEMINI_SHORT_RETRY_ATTEMPTS = 3;
export const GEMINI_SHORT_RETRY_WAIT_MS = 2_000;

function isShortRetryHttpStatus(status: number): boolean {
  return status === 400 || status === 500 || status === 502 || status === 503 || status === 504;
}

function isGeminiTimeoutMessage(detail: string): boolean {
  const d = detail.toLowerCase();
  return /timeout|timed out|\baborted\b/.test(d);
}

async function sleepShortRetry(
  kind: string,
  shortTries: number,
  sleepImpl: (ms: number) => Promise<void>,
): Promise<number> {
  const next = shortTries + 1;
  console.warn(
    `[geminiImage] ${kind} retry attempt=${next}/${GEMINI_SHORT_RETRY_ATTEMPTS} waitMs=${GEMINI_SHORT_RETRY_WAIT_MS}`,
  );
  await sleepImpl(GEMINI_SHORT_RETRY_WAIT_MS);
  return next;
}

/** 429 退避：无 Retry-After 时 5s → 10s → 20s；有 header 则用它。`attempt` 为已完成的 429 次数（0-based）。 */
export function gemini429WaitMs(attempt: number, response: Response): number {
  const header = Number(response.headers.get("retry-after"));
  const fallbackSec = 5 * 2 ** attempt;
  const sec = Number.isFinite(header) && header > 0 ? header : fallbackSec;
  return sec * 1000;
}

function languageName(code: string): string {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

/** 不带源语言：由模型识别图中原文，只指定目标语言。 */
export function buildImageTranslatePrompt(targetLanguage: string): string {
  const target = languageName(targetLanguage);
  return [
    `Translate every visible text region in this image into ${target}.`,
    "Cover titles, body copy, captions, tables, size charts, measurement callouts, footnotes, watermarks, and stylized lettering.",
    "Replace the original glyphs in place. Do not leave untranslated wording. Do not paint a second layer of text on top of the original.",
    `The finished image must show only ${target} wording, except registered logos and trademark wordmarks drawn as graphics.`,
    "Keep numerals, units (mm, cm, in, oz, g), punctuation, layout, fonts, colors, and product appearance unchanged.",
    "Do not add, remove, or invent objects or slogans. Do not mix scripts.",
    "Output only the translated image.",
  ].join(" ");
}

type ServiceAccount = {
  client_email: string;
  private_key: string;
  project_id?: string;
  token_uri?: string;
};

function normalizePrivateKey(raw: string): string {
  let key = raw.trim().replace(/^["']|["']$/g, "");
  key = key.replace(/\\r\\n|\\n/g, "\n").replace(/\r\n?/g, "\n");
  return key.endsWith("\n") ? key : `${key}\n`;
}

function readServiceAccountJson(): string | null {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) return inline;
  const file = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
  if (!file) return null;
  try {
    return readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function readServiceAccount(): ServiceAccount | null {
  const raw = readServiceAccountJson();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    const privateKey = normalizePrivateKey(parsed.private_key);
    createPrivateKey(privateKey);
    return { ...parsed, client_email: parsed.client_email, private_key: privateKey };
  } catch {
    return null;
  }
}

export type GeminiImageConfig = {
  account: ServiceAccount;
  project: string;
  location: string;
};

export function readGeminiImageConfig(): GeminiImageConfig | null {
  const account = readServiceAccount();
  if (!account) return null;
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim() || account.project_id?.trim() || "";
  if (!project) return null;
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || "global";
  return { account, project, location };
}

export function isGeminiImageConfigured(): boolean {
  return readGeminiImageConfig() !== null;
}

let cachedToken: { email: string; token: string; expiresAt: number } | null = null;

function base64Url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signJwt(account: ServiceAccount, tokenUri: string): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: CLOUD_PLATFORM_SCOPE,
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${base64Url(signer.sign(account.private_key))}`;
}

export async function getGoogleCloudAccessToken(fetchImpl: typeof fetch = fetch): Promise<string> {
  const account = readServiceAccount();
  if (!account) throw new ImageTranslateError("GEMINI_NOT_CONFIGURED");
  return getAccessToken(account, fetchImpl);
}

async function getAccessToken(account: ServiceAccount, fetchImpl: typeof fetch): Promise<string> {
  if (
    cachedToken &&
    cachedToken.email === account.client_email &&
    cachedToken.expiresAt > Date.now() + 60_000
  ) {
    return cachedToken.token;
  }
  const tokenUri = account.token_uri || DEFAULT_TOKEN_URI;
  const res = await fetchImpl(tokenUri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signJwt(account, tokenUri),
    }).toString(),
  });
  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!res.ok || !body.access_token) {
    throw new ImageTranslateError("GEMINI_NOT_CONFIGURED", `token HTTP ${res.status}`);
  }
  cachedToken = {
    email: account.client_email,
    token: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return body.access_token;
}

function generateContentUrl(cfg: GeminiImageConfig, model: string): string {
  const host =
    cfg.location === "global"
      ? "https://aiplatform.googleapis.com"
      : `https://${cfg.location}-aiplatform.googleapis.com`;
  return `${host}/v1/projects/${cfg.project}/locations/${cfg.location}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
}

type InlineImage = { data: string; mimeType: string };

function readInlineImage(part: unknown): InlineImage | null {
  const p = part as { inlineData?: unknown; inline_data?: unknown } | null;
  const inline = (p?.inlineData ?? p?.inline_data) as
    | { data?: unknown; mimeType?: unknown; mime_type?: unknown }
    | undefined;
  if (!inline || typeof inline.data !== "string" || !inline.data.trim()) return null;
  const mime = inline.mimeType ?? inline.mime_type;
  return { data: inline.data.trim(), mimeType: typeof mime === "string" && mime ? mime : "image/png" };
}

type GenerateContentBody = {
  error?: { message?: string };
  promptFeedback?: { blockReason?: string };
  candidates?: Array<{ finishReason?: string; content?: { parts?: unknown[] } }>;
};

function readPartText(part: unknown): string {
  const text = (part as { text?: unknown } | null)?.text;
  return typeof text === "string" ? text.trim() : "";
}

export function parseGeminiImageResponse(status: number, body: unknown): InlineImage {
  const b = (body ?? {}) as GenerateContentBody;
  if (status === 429) {
    throw new ImageTranslateError(
      "GEMINI_RATE_LIMITED",
      `HTTP ${status} ${b.error?.message ?? ""}`.trim(),
    );
  }
  if (status >= 400 || b.error) {
    throw new ImageTranslateError("GEMINI_FAILED", `HTTP ${status} ${b.error?.message ?? ""}`.trim());
  }
  if (b.promptFeedback?.blockReason) {
    throw new ImageTranslateError("GEMINI_BLOCKED", b.promptFeedback.blockReason);
  }
  const cand = b.candidates?.[0];
  const parts = cand?.content?.parts ?? [];
  const image = parts.map(readInlineImage).find((img): img is InlineImage => img !== null);
  if (!image) {
    const texts = parts.map(readPartText).filter(Boolean);
    const why = [cand?.finishReason, ...texts].filter(Boolean).join(" | ").slice(0, 500);
    throw new ImageTranslateError("GEMINI_NO_IMAGE", why || "no image part");
  }
  return image;
}

export type GeminiTranslateImageArgs = {
  model: ImageTranslateModelId;
  image: { bytes: Buffer; mimeType: string };
  targetLanguage: string;
  aspectRatio: string;
  fetchImpl?: typeof fetch;
  sleepImpl?: (ms: number) => Promise<void>;
};

async function postGenerateContent(
  fetchImpl: typeof fetch,
  url: string,
  token: string,
  payload: unknown,
): Promise<{ res: Response; json: unknown }> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch (err) {
    throw new ImageTranslateError("GEMINI_FAILED", err instanceof Error ? err.message : String(err));
  }
  return { res, json: await res.json().catch(() => ({})) };
}

async function generateContentWithRetries(
  fetchImpl: typeof fetch,
  sleepImpl: (ms: number) => Promise<void>,
  url: string,
  token: string,
  payload: unknown,
): Promise<InlineImage> {
  let rateLimitTries = 0;
  let shortTries = 0;
  for (;;) {
    let posted: { res: Response; json: unknown };
    try {
      posted = await postGenerateContent(fetchImpl, url, token, payload);
    } catch (err) {
      const detail = err instanceof ImageTranslateError ? err.detail : String(err);
      if (isGeminiTimeoutMessage(detail) && shortTries < GEMINI_SHORT_RETRY_ATTEMPTS - 1) {
        shortTries = await sleepShortRetry("timeout", shortTries, sleepImpl);
        continue;
      }
      throw err;
    }
    const { res, json } = posted;
    if (res.status === 429 && rateLimitTries < GEMINI_429_ATTEMPTS - 1) {
      const waitMs = gemini429WaitMs(rateLimitTries, res);
      rateLimitTries += 1;
      console.warn(`[geminiImage] 429 retry attempt=${rateLimitTries}/${GEMINI_429_ATTEMPTS} waitMs=${waitMs}`);
      await sleepImpl(waitMs);
      continue;
    }
    if (isShortRetryHttpStatus(res.status) && shortTries < GEMINI_SHORT_RETRY_ATTEMPTS - 1) {
      shortTries = await sleepShortRetry(String(res.status), shortTries, sleepImpl);
      continue;
    }
    return parseGeminiImageResponse(res.status, json);
  }
}

export async function geminiTranslateImage(
  args: GeminiTranslateImageArgs,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const cfg = readGeminiImageConfig();
  if (!cfg) throw new ImageTranslateError("GEMINI_NOT_CONFIGURED");
  const fetchImpl = args.fetchImpl ?? fetch;
  const sleepImpl = args.sleepImpl ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const token = await getAccessToken(cfg.account, fetchImpl);
  const imageConfig: Record<string, string> = { aspectRatio: args.aspectRatio };
  if (!MODELS_WITHOUT_IMAGE_SIZE.has(args.model)) imageConfig.imageSize = OUTPUT_IMAGE_SIZE;
  const payload = {
    contents: {
      role: "USER",
      parts: [
        { inlineData: { mimeType: args.image.mimeType, data: args.image.bytes.toString("base64") } },
        { text: buildImageTranslatePrompt(args.targetLanguage) },
      ],
    },
    generationConfig: { responseModalities: ["TEXT", "IMAGE"], imageConfig },
  };
  const image = await generateContentWithRetries(
    fetchImpl,
    sleepImpl,
    generateContentUrl(cfg, args.model),
    token,
    payload,
  );
  return { bytes: Buffer.from(image.data, "base64"), mimeType: image.mimeType };
}
