import { imageUrlKey } from "~/server/picture/imageUrlKey";
import { listPicturesByUrlKeys } from "~/server/picture/picture.server";
import { listProductPictures } from "./contentImageJobs.server";
import type { ResourceImageSourceRow } from "./resourceImages.server";

export async function attachImageTranslations(args: {
  shop: string;
  languageCode: string;
  rows: ResourceImageSourceRow[];
}) {
  const productIds = [
    ...new Set(args.rows.map((r) => r.productId).filter((id): id is string => Boolean(id))),
  ];
  const contentKeys = args.rows.filter((r) => !r.productId).map((r) => r.urlKey);
  const languageCode = args.languageCode.trim();
  const [listing, content] = await Promise.all([
    languageCode && productIds.length
      ? listProductPictures({ shop: args.shop, imageIds: productIds, languageCode })
      : Promise.resolve([]),
    languageCode && contentKeys.length
      ? listPicturesByUrlKeys({ shop: args.shop, languageCode, urlKeys: contentKeys })
      : Promise.resolve([]),
  ]);
  const byListing = new Map(
    listing.map((p) => [`${p.imageId}::${p.urlKey || imageUrlKey(p.imageBeforeUrl) || ""}`, p]),
  );
  const byContent = new Map(content.map((p) => [p.urlKey, p]));
  return args.rows.map((row) => {
    const pic = row.productId
      ? byListing.get(`${row.productId}::${row.urlKey}`)
      : byContent.get(row.urlKey);
    return { ...row, translated: pic?.imageAfterUrl ? pic : null };
  });
}
