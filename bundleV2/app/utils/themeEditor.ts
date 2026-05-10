import {
  BUNDLE_THEME_PRODUCT_PLUGIN,
  type ThemeAppEmbedConfig,
} from "./themePlugins";

export function buildThemeEditorAppEmbedUrl(
  shop: string,
  apiKey: string,
  plugin: ThemeAppEmbedConfig = BUNDLE_THEME_PRODUCT_PLUGIN,
): string {
  const storeHandle = String(shop || "").replace(".myshopify.com", "").trim();
  const normalizedApiKey = String(apiKey || "").trim();
  const url = new URL(
    `https://admin.shopify.com/store/${storeHandle}/themes/current/editor`,
  );

  url.searchParams.set("context", "apps");
  url.searchParams.set(
    "appEmbed",
    `${normalizedApiKey}/${plugin.embedHandle}`,
  );

  return url.toString();
}

export function openThemeEditorAppEmbed(
  shop: string,
  apiKey: string,
  plugin: ThemeAppEmbedConfig = BUNDLE_THEME_PRODUCT_PLUGIN,
): void {
  const editorUrl = buildThemeEditorAppEmbedUrl(shop, apiKey, plugin);
  window.open(editorUrl, "_blank", "noopener,noreferrer");
}
