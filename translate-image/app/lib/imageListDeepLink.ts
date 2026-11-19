import { imageRowKey } from "~/server/contentImage/imageTranslateJobItems";

const PREVIEW_TAIL_MIN = 8;

export function gidTail(id: unknown): string {
  const trimmed = String(id ?? "").trim();
  if (!trimmed) return "";
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

function decodePreview(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export type ImageListQueryExtra = {
  language?: string;
  q?: string;
  preview?: string;
  failed?: boolean;
};

export function appendImageListQuery(path: string, extra: ImageListQueryExtra = {}): string {
  const raw = String(path ?? "");
  const qIndex = raw.indexOf("?");
  const pathname = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
  const params = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : "");
  const language = String(extra.language ?? "").trim();
  const q = String(extra.q ?? "").trim();
  const preview = String(extra.preview ?? "").trim();
  if (language) params.set("language", language);
  if (q) params.set("q", q);
  if (preview) params.set("preview", preview);
  if (extra.failed === true) params.set("failed", "1");
  if (extra.failed === false) params.delete("failed");
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

function resourceKindFromLegacyType(
  type: unknown,
): "product" | "article" | "page" | "collection" | "file" | "theme" {
  const value = String(type ?? "").trim().toLowerCase();
  if (value === "products" || value === "product" || value === "images") return "product";
  if (value === "articles" || value === "article") return "article";
  if (value === "pages" || value === "page") return "page";
  if (value === "collections" || value === "collection") return "collection";
  if (value === "files" || value === "file" || value === "metafield") return "file";
  return "theme";
}

export function legacySingleImageRedirectPath(input: {
  type?: string | null;
  productId?: string | null;
  imageId?: string | null;
  language?: string | null;
} = {}): string {
  const kind = resourceKindFromLegacyType(input.type);
  const productId = gidTail(input.productId) || String(input.productId ?? "").trim();
  const imageId = String(input.imageId ?? "").trim();
  const language = String(input.language ?? "").trim();
  let path = "/app/theme";
  if (kind === "product") {
    path = productId ? `/app/products/${encodeURIComponent(productId)}` : "/app/product";
  } else if (kind === "article") {
    path = productId ? `/app/articles/${encodeURIComponent(productId)}` : "/app/article";
  } else if (kind === "page") {
    path = productId ? `/app/pages/${encodeURIComponent(productId)}` : "/app/page";
  } else if (kind === "collection") {
    path = "/app/collection";
  } else if (kind === "file") {
    path = "/app/file";
  }
  return appendImageListQuery(path, {
    language: language || undefined,
    preview: imageId || undefined,
  });
}

export function legacyThirdPartyImageRedirectPath(input: {
  urlKey?: string | null;
  pagePath?: string | null;
  language?: string | null;
  q?: string | null;
} = {}): string {
  const urlKey = String(input.urlKey ?? "").trim();
  const pagePath = String(input.pagePath ?? "").trim();
  const language = String(input.language ?? "").trim();
  const q = String(input.q ?? "").trim();
  const path = pagePath
    ? `/app/third-party/pages/${encodeURIComponent(pagePath)}`
    : "/app/third-party";
  return appendImageListQuery(path, {
    language: language || undefined,
    q: q || undefined,
    preview: urlKey || undefined,
  });
}

function haystackMatches(value: unknown, preview: string, tail: string): boolean {
  const hay = String(value ?? "");
  if (!hay) return false;
  if (hay === preview || hay.includes(preview)) return true;
  if (tail && tail.length >= PREVIEW_TAIL_MIN) {
    if (hay === tail || gidTail(hay) === tail || hay.includes(tail)) return true;
  }
  return false;
}

export function contentImageRowMatchesPreview(
  row: {
    urlKey?: string | null;
    imageUrl?: string | null;
    productId?: string | null;
    translated?: { imageId?: string | null } | null;
  } | null | undefined,
  preview: string,
): boolean {
  const decoded = decodePreview(preview);
  if (!decoded) return false;
  const tail = gidTail(decoded);
  return [row?.urlKey, row?.imageUrl, row?.productId, row?.translated?.imageId].some((value) =>
    haystackMatches(value, decoded, tail),
  );
}

export function resourceRowMatchesPreview(
  row: {
    id?: string | null;
    urlKey?: string | null;
    imageUrl?: string | null;
    translated?: { imageId?: string | null } | null;
  } | null | undefined,
  preview: string,
): boolean {
  return contentImageRowMatchesPreview(
    {
      urlKey: row?.urlKey,
      imageUrl: row?.imageUrl,
      productId: row?.id,
      translated: row?.translated,
    },
    preview,
  );
}

export function selectFailedContentRows<T extends { urlKey: string; productId?: string | null }>(
  localRows: T[],
  failedKeys: { has(key: string): boolean } | null | undefined,
  fallbackRows: T[] = [],
): T[] {
  const hasKey = (key: string) => Boolean(failedKeys?.has(key));
  const localFailed: T[] = [];
  for (const row of localRows ?? []) {
    if (hasKey(imageRowKey(row))) localFailed.push(row);
  }
  if (localFailed.length > 0) return localFailed;
  return fallbackRows;
}
