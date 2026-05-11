import {
  BUNDLE_THEME_PRODUCT_PLUGIN,
  type ThemeAppEmbedConfig,
} from "./themePlugins";

function normalizeShopAdminHandle(shop: string): string {
  const raw = String(shop || "").trim();
  if (!raw) return "";

  const withoutProtocol = raw.replace(/^https?:\/\//i, "");
  const adminStoreMatch = withoutProtocol.match(/admin\.shopify\.com\/store\/([^/?#]+)/i);
  if (adminStoreMatch?.[1]) {
    return adminStoreMatch[1].trim();
  }

  const prefixedStoreMatch = withoutProtocol.match(/^store\/([^/?#]+)/i);
  if (prefixedStoreMatch?.[1]) {
    return prefixedStoreMatch[1].trim();
  }

  const pathStoreMatch = withoutProtocol.match(/\/store\/([^/?#]+)/i);
  if (pathStoreMatch?.[1]) {
    return pathStoreMatch[1].trim();
  }

  if (withoutProtocol.includes(".myshopify.com")) {
    return withoutProtocol.replace(/\.myshopify\.com.*$/i, "").trim();
  }

  return withoutProtocol.replace(/^\/+|\/+$/g, "").trim();
}

export function buildThemeEditorAppEmbedUrl(
  shop: string,
  apiKey: string,
  plugin: ThemeAppEmbedConfig = BUNDLE_THEME_PRODUCT_PLUGIN,
): string {
  const storeHandle = normalizeShopAdminHandle(shop);
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
