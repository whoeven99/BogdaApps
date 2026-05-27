import {
  BUNDLE_THEME_PRODUCT_PLUGIN,
  type ThemeAppEmbedConfig,
} from "./themePlugins";

export function buildThemeEditorAppEmbedUrl(
  storeId: string,
  themeId: string,
  apiKey: string,
  plugin: ThemeAppEmbedConfig = BUNDLE_THEME_PRODUCT_PLUGIN,
): string {
  const normalizedStoreId = String(storeId || "").trim();
  const normalizedThemeId = String(themeId || "").trim();
  const normalizedApiKey = String(apiKey || "").trim();
  const url = new URL(
    `https://admin.shopify.com/store/${normalizedStoreId}/themes/${normalizedThemeId}/editor`,
  );

  url.searchParams.set("context", "apps");
  url.searchParams.set(
    "appEmbed",
    `${normalizedApiKey}/${plugin.embedHandle}`,
  );

  return url.toString();
}

export function openThemeEditorAppEmbed(
  storeId: string,
  themeId: string,
  apiKey: string,
  plugin: ThemeAppEmbedConfig = BUNDLE_THEME_PRODUCT_PLUGIN,
): void {
  const editorUrl = buildThemeEditorAppEmbedUrl(
    storeId,
    themeId,
    apiKey,
    plugin,
  );
  window.open(editorUrl, "_blank", "noopener,noreferrer");
}
