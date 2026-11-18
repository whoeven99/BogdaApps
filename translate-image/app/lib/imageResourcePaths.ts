import {
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
} from "~/server/contentImage/imageTranslateJobItems";

export type ImageResourceType =
  | "product"
  | "article"
  | "page"
  | "collection"
  | "file"
  | "theme";

export const IMAGE_RESOURCE_TYPES: ImageResourceType[] = [
  "product",
  "article",
  "page",
  "collection",
  "file",
  "theme",
];

export {
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
};

export const RESOURCE_STATUS_TABS: Record<ImageResourceType, readonly string[]> = {
  product: ["all", "active", "draft", "archived", "unlisted"],
  article: ["all", "published", "unpublished"],
  page: ["all", "published", "unpublished"],
  collection: ["all"],
  file: ["all"],
  theme: ["all"],
};

export function parseImageResourceType(value: unknown): ImageResourceType {
  if (value === "metafield") return "file";
  return IMAGE_RESOURCE_TYPES.includes(value as ImageResourceType)
    ? (value as ImageResourceType)
    : "product";
}

export function shopifyResourceGid(type: ImageResourceType, id: string): string {
  const trimmed = id.trim();
  if (trimmed.startsWith("gid://")) return trimmed;
  if (type === "theme") return trimmed;
  const name =
    type === "product"
      ? "Product"
      : type === "article"
        ? "Article"
        : type === "collection"
          ? "Collection"
          : type === "file"
            ? "MediaImage"
            : "Page";
  return `gid://shopify/${name}/${trimmed}`;
}

export function shopifyResourceNumericId(gid: string): string {
  return gid.split("/").pop() ?? gid;
}

export function imageJobKindForResource(type: ImageResourceType): "content" | "product" {
  return type === "product" ? "product" : "content";
}

const LIST_PATH: Record<ImageResourceType, string> = {
  product: "/app/product",
  article: "/app/article",
  page: "/app/page",
  collection: "/app/collection",
  file: "/app/file",
  theme: "/app/theme",
};

export function imageResourceListPath(type: ImageResourceType, language?: string): string {
  const path = LIST_PATH[type] ?? "/app/product";
  return language ? `${path}?language=${encodeURIComponent(language)}` : path;
}

export function imageResourceDetailPath(
  type: ImageResourceType,
  id: string,
  language?: string,
): string {
  if (type === "theme" || type === "collection" || type === "file") {
    return imageResourceListPath(type, language);
  }
  const segment = shopifyResourceNumericId(id);
  const path =
    type === "product"
      ? `/app/products/${encodeURIComponent(segment)}`
      : type === "article"
        ? `/app/articles/${encodeURIComponent(segment)}`
        : `/app/pages/${encodeURIComponent(segment)}`;
  return language ? `${path}?language=${encodeURIComponent(language)}` : path;
}
