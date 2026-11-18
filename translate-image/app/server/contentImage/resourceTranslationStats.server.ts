import { listProductPictures } from "./contentImageJobs.server";
import type { ImageResourceRow } from "./resourceImages.server";

/** 商品 L1：按 Product GID 统计目标语已有译图张数。 */
export async function attachProductTranslationCounts(args: {
  shop: string;
  languageCode: string;
  rows: ImageResourceRow[];
}): Promise<ImageResourceRow[]> {
  const languageCode = args.languageCode.trim();
  if (!languageCode) return args.rows;
  const productIds = [
    ...new Set(
      args.rows
        .filter((row) => row.imageCount && row.id.startsWith("gid://shopify/Product/"))
        .map((row) => row.id),
    ),
  ];
  if (productIds.length === 0) return args.rows;

  const pictures = await listProductPictures({
    shop: args.shop,
    imageIds: productIds,
    languageCode,
  });
  const countByProduct = new Map<string, number>();
  for (const pic of pictures) {
    if (!pic.imageAfterUrl) continue;
    countByProduct.set(pic.imageId, (countByProduct.get(pic.imageId) ?? 0) + 1);
  }

  return args.rows.map((row) => {
    const translatedImageCount = countByProduct.get(row.id);
    if (translatedImageCount == null) return row;
    return { ...row, translatedImageCount };
  });
}
