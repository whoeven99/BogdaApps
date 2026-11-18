import {
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
} from "~/server/contentImage/imageTranslateJobItems";

export type ImageResourceType = "product" | "article" | "theme";

export const IMAGE_RESOURCE_TYPES: ImageResourceType[] = ["product", "article", "theme"];

export {
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
};

export const RESOURCE_STATUS_TABS: Record<ImageResourceType, readonly string[]> = {
  product: ["all", "active", "draft", "archived", "unlisted"],
  article: ["all", "published", "unpublished"],
  theme: ["all"],
};

export function parseImageResourceType(value: unknown): ImageResourceType {
  return IMAGE_RESOURCE_TYPES.includes(value as ImageResourceType)
    ? (value as ImageResourceType)
    : "product";
}

export function shopifyResourceGid(type: ImageResourceType, id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith("gid://")) return trimmed;
  if (type === "theme") return trimmed;
  const name = type === "product" ? "Product" : "Article";
  return `gid://shopify/${name}/${trimmed}`;
}

export function shopifyResourceNumericId(gid: string): string {
  return gid.split("/").pop() ?? gid;
}

export function imageJobKindForResource(type: ImageResourceType): "content" | "product" {
  return type === "product" ? "product" : "content";
}

export function imageResourceListPath(type: ImageResourceType, language?: string): string {
  const path =
    type === "product" ? "/app/product" : type === "article" ? "/app/article" : "/app/theme";
  return language ? `${path}?language=${encodeURIComponent(language)}` : path;
}

export function imageResourceDetailPath(
  type: ImageResourceType,
  id: string,
  language?: string,
): string {
  const segment = type === "theme" ? id.trim() : shopifyResourceNumericId(id);
  const path =
    type === "product"
      ? `/app/products/${encodeURIComponent(segment)}`
      : type === "article"
        ? `/app/articles/${encodeURIComponent(segment)}`
        : `/app/theme`;
  return language ? `${path}?language=${encodeURIComponent(language)}` : path;
}
