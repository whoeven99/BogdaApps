import { imageRowKey } from "./imageTranslateJobItems.mjs";

const PREVIEW_TAIL_MIN = 8;

export function gidTail(id) {
  const trimmed = String(id ?? "").trim();
  if (!trimmed) return "";
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

function decodePreview(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function appendImageListQuery(path, extra = {}) {
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

function resourceKindFromLegacyType(type) {
  const value = String(type ?? "").trim().toLowerCase();
  if (value === "products" || value === "product" || value === "images") return "product";
  if (value === "articles" || value === "article") return "article";
  return "theme";
}

export function legacySingleImageRedirectPath(input = {}) {
  const kind = resourceKindFromLegacyType(input.type);
  const productId = gidTail(input.productId) || String(input.productId ?? "").trim();
  const imageId = String(input.imageId ?? "").trim();
  const language = String(input.language ?? "").trim();
  let path = "/app/theme";
  if (kind === "product") {
    path = productId ? `/app/products/${encodeURIComponent(productId)}` : "/app/product";
  } else if (kind === "article") {
    path = productId ? `/app/articles/${encodeURIComponent(productId)}` : "/app/article";
  }
  return appendImageListQuery(path, {
    language: language || undefined,
    preview: imageId || undefined,
  });
}

export function legacyThirdPartyImageRedirectPath(input = {}) {
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

function haystackMatches(value, preview, tail) {
  const hay = String(value ?? "");
  if (!hay) return false;
  if (hay === preview || hay.includes(preview)) return true;
  if (tail && tail.length >= PREVIEW_TAIL_MIN) {
    if (hay === tail || gidTail(hay) === tail || hay.includes(tail)) return true;
  }
  return false;
}

export function contentImageRowMatchesPreview(row, preview) {
  const decoded = decodePreview(preview);
  if (!decoded) return false;
  const tail = gidTail(decoded);
  return [
    row?.urlKey,
    row?.imageUrl,
    row?.productId,
    row?.translated?.imageId,
  ].some((value) => haystackMatches(value, decoded, tail));
}

export function resourceRowMatchesPreview(row, preview) {
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

export function selectFailedContentRows(localRows, failedKeys, fallbackRows = []) {
  const hasKey =
    failedKeys && typeof failedKeys.has === "function"
      ? (key) => failedKeys.has(key)
      : () => false;
  const localFailed = [];
  for (const row of localRows ?? []) {
    if (hasKey(imageRowKey(row))) localFailed.push(row);
  }
  if (localFailed.length > 0) return localFailed;
  return fallbackRows;
}
