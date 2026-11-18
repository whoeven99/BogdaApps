import type { ImageResourceType } from "~/lib/imageResourcePaths";
import {
  displayThemeImageUsedIn,
  type ThemeImageUsedIn,
} from "~/lib/themeImageUsedIn";

type SourceRow = {
  title: string;
  usedIn?: ThemeImageUsedIn[];
};

export function imageResourceSourceLabel(
  type: ImageResourceType,
  row: SourceRow,
  t: (key: string, options?: { defaultValue?: string; count?: number; title?: string }) => string,
  locale?: string | null,
): string {
  if (type === "theme") {
    const items = row.usedIn ?? [];
    if (!items.length) return t("contentImage.source.module.theme");
    const first = displayThemeImageUsedIn(items[0], t, locale);
    if (items.length > 1) {
      return t("contentImage.source.themeMany", { title: first, count: items.length });
    }
    return first;
  }
  if (type === "collection") {
    const owner = row.usedIn?.[0];
    if (!owner?.title) return t("contentImage.source.module.collection");
    if (owner.field === "featured") {
      return t("contentImage.source.collectionFeatured", { title: owner.title });
    }
    if (owner.field === "description") {
      return t("contentImage.source.collectionDescription", { title: owner.title });
    }
    return t("contentImage.source.collection", { title: owner.title });
  }
  if (type === "file") {
    const ref = row.usedIn?.[0];
    if (ref?.title?.trim()) return ref.title.trim();
    return t("contentImage.source.module.other");
  }
  return row.title;
}
