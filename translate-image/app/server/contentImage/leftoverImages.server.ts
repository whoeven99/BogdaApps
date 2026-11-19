import { imageUrlKey, isCiwiTranslatedImageFilename } from "~/server/picture/imageUrlKey";
import { listCollectionImageUrlKeys } from "./collectionImages.server";
import type { AdminGraphqlClient, ImageResourceRow } from "./resourceImages.server";
import { listThemeImageUrlKeys } from "./themeImages.server";

export type LeftoverSubtract = {
  theme: string[];
  collection: string[];
};

/** Files − 主题 − 集合。无内容图索引时不扣商品 / 文章 / 页面。 */
export function leftoverUrlKeys(
  fileKeys: string[],
  live: { theme?: string[] | null; collection?: string[] | null },
): string[] {
  const subtract = new Set([...(live.theme ?? []), ...(live.collection ?? [])]);
  return fileKeys.filter((key) => Boolean(key) && !subtract.has(key));
}

export async function leftoverLiveSubtractKeys(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
}): Promise<LeftoverSubtract> {
  const [theme, collection] = await Promise.all([
    listThemeImageUrlKeys({ admin: args.admin, shop: args.shop }).catch((err) => {
      console.warn("[contentImage] leftover theme keys failed:", err);
      return [] as string[];
    }),
    listCollectionImageUrlKeys({ admin: args.admin, shop: args.shop }).catch((err) => {
      console.warn("[contentImage] leftover collection keys failed:", err);
      return [] as string[];
    }),
  ]);
  return { theme, collection };
}

export function isLeftoverFileRow(
  row: Pick<ImageResourceRow, "imageUrl">,
  subtract: LeftoverSubtract,
): boolean {
  const key = row.imageUrl ? imageUrlKey(row.imageUrl) : null;
  if (!key || isCiwiTranslatedImageFilename(key)) return false;
  return leftoverUrlKeys([key], subtract).includes(key);
}
