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
  return row.title;
}
