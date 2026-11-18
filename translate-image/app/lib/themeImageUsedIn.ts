export type ThemeImageUsedIn = {
  id: string;
  title: string;
  pageKey?: string;
  sectionType?: string;
  field?: string;
  sectionLabel?: string;
  fieldLabel?: string;
};

export const THEME_IMAGE_PAGE_LABELS: Record<string, { en: string; "zh-CN": string }> = {
  index: { en: "Home", "zh-CN": "首页" },
  product: { en: "Product", "zh-CN": "产品" },
  collection: { en: "Collection", "zh-CN": "集合" },
  page: { en: "Page", "zh-CN": "页面" },
  blog: { en: "Blog", "zh-CN": "博客" },
  article: { en: "Article", "zh-CN": "文章" },
  cart: { en: "Cart", "zh-CN": "购物车" },
  search: { en: "Search", "zh-CN": "搜索" },
  password: { en: "Password", "zh-CN": "密码页" },
  "404": { en: "404", "zh-CN": "404" },
  "list-collections": { en: "Collections", "zh-CN": "集合列表" },
  gift_card: { en: "Gift card", "zh-CN": "礼品卡" },
  settings: { en: "Theme settings", "zh-CN": "主题设置" },
  "header-group": { en: "Header", "zh-CN": "页头" },
  "footer-group": { en: "Footer", "zh-CN": "页脚" },
};

export function themePageLabel(pageKey: string, locale?: string | null): string {
  const table = THEME_IMAGE_PAGE_LABELS[pageKey];
  if (!table || !locale) return pageKey;
  const lang = locale.trim().toLowerCase();
  if (lang.startsWith("zh")) return table["zh-CN"];
  if (lang.startsWith("en")) return table.en;
  return pageKey;
}

export function themeImagePageI18nKey(pageKey: string): string {
  return `themeImage.page.${pageKey}`;
}

const THEME_FIELD_I18N_KEYS = new Set(["image", "mobile_image", "logo"]);

function dedupeConsecutiveParts(parts: string[]): string[] {
  const out: string[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (out.length > 0 && out[out.length - 1]!.toLowerCase() === trimmed.toLowerCase()) continue;
    out.push(trimmed);
  }
  return out;
}

export function themeImageFieldLabel(
  item: Pick<ThemeImageUsedIn, "field" | "fieldLabel">,
  t?: (key: string, options?: { defaultValue?: string }) => string,
): string {
  const field = (item.field || "").trim();
  const fallback = (item.fieldLabel || field || "").trim();
  if (!t || !field || !THEME_FIELD_I18N_KEYS.has(field)) return fallback;
  return t(`themeImage.field.${field}`, { defaultValue: fallback });
}

export function formatThemeImageUsedIn(
  item: ThemeImageUsedIn,
  locale?: string | null,
  pageLabel?: string | null,
  fieldLabel?: string | null,
): string {
  const page = (pageLabel || themePageLabel(item.pageKey || "", locale) || item.pageKey || "").trim();
  const section = (item.sectionLabel || item.sectionType || "").trim();
  const field = (fieldLabel ?? item.fieldLabel ?? item.field ?? "").trim();
  const joined = dedupeConsecutiveParts([page, section, field]).join(" · ");
  return joined || item.title;
}

export function displayThemeImageUsedIn(
  item: ThemeImageUsedIn,
  t: (key: string, options?: { defaultValue?: string }) => string,
  locale?: string | null,
): string {
  const pageKey = item.pageKey || "";
  const fallback = themePageLabel(pageKey, locale) || pageKey;
  const page = pageKey ? t(themeImagePageI18nKey(pageKey), { defaultValue: fallback }) : "";
  const field = themeImageFieldLabel(item, t);
  return formatThemeImageUsedIn(item, locale, page, field);
}

/** L1 主题图行主标题：取第一条引用位置（非文件名）。 */
export function themeImageRowPrimaryLabel(
  row: { title: string; usedIn?: ThemeImageUsedIn[] },
  t: (key: string, options?: { defaultValue?: string }) => string,
  locale?: string | null,
): string {
  const first = row.usedIn?.[0];
  if (first) return displayThemeImageUsedIn(first, t, locale);
  return row.title;
}

export function themeImageUsedInSearchText(item: ThemeImageUsedIn): string {
  const pageKey = item.pageKey || "";
  return [
    item.title,
    pageKey,
    item.sectionType,
    item.field,
    item.sectionLabel,
    item.fieldLabel,
    themePageLabel(pageKey, "en"),
    themePageLabel(pageKey, "zh-CN"),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
