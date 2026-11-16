/**
 * 图片翻译单一来源：Gemini 改图 → 存进商户 Shopify Files。
 * App（单张 / 手动替换 / 清除）与 Worker（批量内容图）共用；调用方只注入 graphql。
 */
import { promises as dns } from "node:dns";
import { closestAspectRatio, readImageDimensions } from "./imageDimensions";
import { geminiTranslateImage } from "./geminiImage";
import { ImageTranslateError } from "./imageTranslateError";
import { resolveImageTranslateModel, type ImageTranslateModelId } from "./imageTranslateModels";
import {
  externalImageUrlKey,
  imageUrlKey,
  isPrivateIpAddress,
  pictureUrlKey,
  shopifyCdnImageUrlWithWidth,
} from "./imageUrlKey";
import { uploadImageToShopifyFiles, type ShopifyFilesGraphql } from "./shopifyFiles";

export * from "./geminiImage";
export * from "./imageDimensions";
export * from "./imageTranslateError";
export * from "./imageTranslateUserMessage";
export * from "./imageTranslateModels";
export * from "./imageUrlKey";
export * from "./shopifyFiles";

export const IMAGE_TRANSLATE_MAX_INPUT_BYTES = 8 * 1024 * 1024;
const SOURCE_FETCH_WIDTH = 2048;
const SOURCE_FETCH_TIMEOUT_MS = 20_000;
const GEMINI_INPUT_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
};

export type LookupIpAddresses = (hostname: string) => Promise<string[]>;

async function defaultLookupIpAddresses(hostname: string): Promise<string[]> {
  const rows = await dns.lookup(hostname, { all: true, verbatim: true });
  return rows.map((row) => row.address);
}

async function assertPublicHttpsUrl(parsed: URL, lookup: LookupIpAddresses): Promise<void> {
  if (parsed.protocol !== "https:") throw new ImageTranslateError("INVALID_IMAGE_URL");
  if (parsed.username || parsed.password) throw new ImageTranslateError("INVALID_IMAGE_URL");
  let ips: string[];
  try {
    ips = await lookup(parsed.hostname);
  } catch {
    throw new ImageTranslateError("INVALID_IMAGE_URL");
  }
  if (ips.length === 0 || ips.some((ip) => isPrivateIpAddress(ip))) {
    throw new ImageTranslateError("INVALID_IMAGE_URL");
  }
}

/** Shopify CDN 或已通过 SSRF 门禁的 https 外链。不跟随跳转。 */
export async function fetchSourceImage(
  imageUrl: string,
  fetchImpl: typeof fetch = fetch,
  lookup: LookupIpAddresses = defaultLookupIpAddresses,
): Promise<{ bytes: Buffer; mimeType: string }> {
  const shopify = imageUrlKey(imageUrl);
  const external = shopify ? null : externalImageUrlKey(imageUrl);
  if (!shopify && !external) throw new ImageTranslateError("INVALID_IMAGE_URL");

  let url = imageUrl;
  if (shopify) {
    url = shopifyCdnImageUrlWithWidth(imageUrl, SOURCE_FETCH_WIDTH);
  } else {
    const parsed = new URL(imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl);
    await assertPublicHttpsUrl(parsed, lookup);
    url = parsed.toString();
  }
  if (!url.startsWith("https://")) throw new ImageTranslateError("INVALID_IMAGE_URL");

  let res: Response;
  try {
    res = await fetchImpl(url, {
      redirect: "error",
      signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    throw new ImageTranslateError("IMAGE_FETCH_FAILED", err instanceof Error ? err.message : String(err));
  }
  if (!res.ok) throw new ImageTranslateError("IMAGE_FETCH_FAILED", `HTTP ${res.status}`);
  const mimeType = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
  if (!GEMINI_INPUT_MIME.has(mimeType)) throw new ImageTranslateError("UNSUPPORTED_FORMAT", mimeType);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length > IMAGE_TRANSLATE_MAX_INPUT_BYTES) throw new ImageTranslateError("IMAGE_TOO_LARGE");
  return { bytes, mimeType };
}

export function translatedImageFilename(
  imageUrl: string,
  targetLanguage: string,
  mimeType: string,
): string {
  const key = pictureUrlKey(imageUrl) ?? "image";
  const tail = key.startsWith("ext:") ? key.slice("ext:".length) : key;
  const base = (tail.split("/").pop() ?? "image").replace(/\.[a-z0-9]+$/i, "");
  const safeBase = base.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "image";
  const lang = targetLanguage.replace(/[^a-zA-Z0-9-]+/g, "");
  return `${safeBase}-ciwi-${lang}.${EXT_BY_MIME[mimeType] ?? "png"}`;
}

export function fileExtensionForMime(mimeType: string): string {
  return EXT_BY_MIME[mimeType] ?? "png";
}

export type TranslateImageToShopifyFilesArgs = {
  graphql: ShopifyFilesGraphql;
  imageUrl: string;
  targetLanguage: string;
  model?: string;
  alt?: string;
  fetchImpl?: typeof fetch;
};

export type TranslateImageToShopifyFilesResult = {
  fileId: string;
  url: string;
  model: ImageTranslateModelId;
  aspectRatio: string;
};

export async function translateImageToShopifyFiles(
  args: TranslateImageToShopifyFilesArgs,
): Promise<TranslateImageToShopifyFilesResult> {
  const model = resolveImageTranslateModel(args.model);
  const source = await fetchSourceImage(args.imageUrl, args.fetchImpl);
  const aspectRatio = closestAspectRatio(readImageDimensions(source.bytes));
  const translated = await geminiTranslateImage({
    model,
    image: source,
    targetLanguage: args.targetLanguage,
    aspectRatio,
    fetchImpl: args.fetchImpl,
  });
  const uploaded = await uploadImageToShopifyFiles({
    graphql: args.graphql,
    bytes: translated.bytes,
    mimeType: translated.mimeType,
    filename: translatedImageFilename(args.imageUrl, args.targetLanguage, translated.mimeType),
    alt: args.alt,
    fetchImpl: args.fetchImpl,
  });
  return { ...uploaded, model, aspectRatio };
}
