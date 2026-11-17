export const PICTURE_COS_HOST = "ciwi-us-1327177217.cos.na-ashburn.myqcloud.com";
export const PICTURE_CDN_HOST = "img.bogdatech.com";

export function normalizeShop(shop) {
  let value = String(shop || "").trim().toLowerCase();
  if (!value) return "";
  value = value.replace(/^https?:\/\//, "").split("/")[0].trim();
  if (!value.includes(".")) return `${value}.myshopify.com`;
  return value;
}

export function isShopifyCdnAfterUrl(url) {
  return String(url || "").toLowerCase().includes("cdn.shopify.com");
}

export function isCosHostedAfterUrl(url) {
  const lower = String(url || "").toLowerCase();
  return lower.includes(PICTURE_COS_HOST) || lower.includes(PICTURE_CDN_HOST);
}

export function classifyPictureRow(row) {
  const after = String(row?.imageAfterUrl ?? "").trim();
  const fileId = String(row?.imageAfterFileId ?? "").trim();
  if (fileId) return "already_files";
  if (!after) return "no_after";
  if (isShopifyCdnAfterUrl(after)) return "already_files";
  if (!isCosHostedAfterUrl(after)) return "not_cos";
  return "migrate";
}

export function pictureUrlKey(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const path = new URL(raw).pathname.replace(/^\/+/, "");
    const idx = path.indexOf("files/");
    return idx >= 0 ? path.slice(idx) : path;
  } catch {
    return "";
  }
}
