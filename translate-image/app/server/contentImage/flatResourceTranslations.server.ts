import { attachImageTranslations } from "./resourceImageTranslations.server";
import { parseCollectionImageRowId } from "./collectionImages.server";
import { fileImageSourceRows } from "./resourceImages.server";
import { themeImageSourceRows } from "./themeImages.server";
import type { ImageResourceType } from "~/lib/imageResourcePaths";
import type { ImageResourceRow, ResourceImageSourceRow } from "./resourceImages.server";

function collectionFlatSource(row: ImageResourceRow): ResourceImageSourceRow | null {
  if (!row.imageUrl) return null;
  const parsed = parseCollectionImageRowId(row.id);
  if (!parsed) return null;
  return {
    urlKey: parsed.urlKey,
    imageUrl: row.imageUrl,
    usedIn: row.usedIn ?? [],
  };
}

function flatRowToSource(type: ImageResourceType, row: ImageResourceRow): ResourceImageSourceRow | null {
  if (!row.imageUrl) return null;
  if (type === "theme") return themeImageSourceRows(row)[0] ?? null;
  if (type === "file") return fileImageSourceRows(row)[0] ?? null;
  if (type === "collection") return collectionFlatSource(row);
  return null;
}

const FLAT_TRANSLATION_TYPES = new Set<ImageResourceType>(["theme", "file", "collection"]);

/** L1 扁平行（主题 / 集合 / Files）挂上 urlKey + 目标语译图状态。 */
export async function attachTranslationsToFlatResourceRows(args: {
  shop: string;
  languageCode: string;
  type: ImageResourceType;
  rows: ImageResourceRow[];
}): Promise<ImageResourceRow[]> {
  const languageCode = args.languageCode.trim();
  if (!languageCode || !FLAT_TRANSLATION_TYPES.has(args.type)) return args.rows;
  const sources = args.rows.flatMap((row) => {
    const source = flatRowToSource(args.type, row);
    return source ? [source] : [];
  });
  if (sources.length === 0) return args.rows;

  const translatedRows = await attachImageTranslations({
    shop: args.shop,
    languageCode,
    rows: sources,
  });
  const byKey = new Map(translatedRows.map((row) => [row.urlKey, row]));

  return args.rows.map((row) => {
    const source = flatRowToSource(args.type, row);
    if (!source) return row;
    const hit = byKey.get(source.urlKey);
    const pic = hit?.translated;
    return {
      ...row,
      urlKey: source.urlKey,
      translated: pic?.imageAfterUrl
        ? {
            imageId: pic.imageId,
            imageBeforeUrl: pic.imageBeforeUrl,
            imageAfterUrl: pic.imageAfterUrl,
            urlKey: pic.urlKey ?? source.urlKey,
          }
        : null,
    };
  });
}
