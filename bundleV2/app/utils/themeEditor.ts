import {
  BUNDLE_THEME_PRODUCT_PLUGIN,
  type ThemeAppEmbedConfig,
} from "./themePlugins";

type ThemeEditorUrlOptions = {
  plugin?: ThemeAppEmbedConfig;
  themeId?: string | null;
  openAppEmbed?: boolean;
};

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

export function buildThemeEditorUrl(
  shop: string,
  apiKey: string,
  options: ThemeEditorUrlOptions = {},
): string {
  const {
    plugin = BUNDLE_THEME_PRODUCT_PLUGIN,
    themeId,
    openAppEmbed = false,
  } = options;
  const storeHandle = normalizeShopAdminHandle(shop);
  const normalizedApiKey = String(apiKey || "").trim();
  const normalizedThemeId = String(themeId || "").trim();
  const url = new URL(
    `https://admin.shopify.com/store/${storeHandle}/themes/${normalizedThemeId || "current"}/editor`,
  );

  if (openAppEmbed) {
    url.searchParams.set("context", "apps");
    url.searchParams.set(
      "appEmbed",
      `${normalizedApiKey}/${plugin.embedHandle}`,
    );
  }

  return url.toString();
}

export function buildThemeEditorAppEmbedUrl(
  shop: string,
  apiKey: string,
  plugin: ThemeAppEmbedConfig = BUNDLE_THEME_PRODUCT_PLUGIN,
  themeId?: string | null,
): string {
  return buildThemeEditorUrl(shop, apiKey, {
    plugin,
    themeId,
    openAppEmbed: true,
  });
}

export function openThemeEditor(
  shop: string,
  apiKey: string,
  options: ThemeEditorUrlOptions = {},
): void {
  const editorUrl = buildThemeEditorUrl(shop, apiKey, options);
  window.open(editorUrl, "_blank", "noopener,noreferrer");
}

export function openThemeEditorAppEmbed(
  shop: string,
  apiKey: string,
  plugin: ThemeAppEmbedConfig = BUNDLE_THEME_PRODUCT_PLUGIN,
  themeId?: string | null,
): void {
  openThemeEditor(shop, apiKey, {
    plugin,
    themeId,
    openAppEmbed: true,
  });
}
