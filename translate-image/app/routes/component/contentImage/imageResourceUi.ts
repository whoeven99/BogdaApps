import type { ImageResourceType } from "~/lib/imageResourcePaths";

/** L1 每行即一张图（主题 / 集合 / Other），不再进资源详情。 */
export function imageResourceListIsFlatImage(type: ImageResourceType): boolean {
  return type === "theme" || type === "file" || type === "collection";
}

/** L1 展示 Source 列（图片关联的模块 / 位置）。 */
export function imageResourceListShowsSource(type: ImageResourceType): boolean {
  return imageResourceListIsFlatImage(type);
}

/** L1 是否支持点击缩略图打开对照预览（单图或资源封面）。 */
export function imageResourceListSupportsPreview(type: ImageResourceType): boolean {
  return imageResourceListIsFlatImage(type);
}

/** 产品 / 文章 / 页面仍为「资源 → 多图」详情。 */
export function imageResourceListOpensDetail(type: ImageResourceType): boolean {
  return !imageResourceListIsFlatImage(type);
}

const CATALOG_COLUMN_KEYS: Partial<Record<ImageResourceType, string>> = {
  product: "contentImage.column.product",
  article: "contentImage.column.article",
  page: "contentImage.column.page",
};

/** L1 第一列：扁平行「图片」；商品/文章/页面用对应资源名。 */
export function imageResourceListPrimaryColumnKey(type: ImageResourceType): string {
  if (imageResourceListIsFlatImage(type)) return "contentImage.column.image";
  return CATALOG_COLUMN_KEYS[type] ?? "contentImage.column.resource";
}

export function imageResourceSearchPlaceholderKey(type: ImageResourceType): string {
  if (type === "file" || type === "theme" || type === "collection") {
    return "contentImage.fileSearchPlaceholder";
  }
  return "contentImage.searchPlaceholder";
}

/** 本仓无 ContentImageClassifyJob / 内容图索引，永不自动扫描。 */
export function imageResourceAutoClassifyOnMount(_type: ImageResourceType): boolean {
  return false;
}
