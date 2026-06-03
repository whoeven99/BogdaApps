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

  const decodedRaw = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  const normalizedInput = decodedRaw
    .replace(/^https?:\/\//i, "")
    .replace(/^admin\.shopify\.com\//i, "")
    .replace(/^\/+|\/+$/g, "");

  const parts = normalizedInput
    .split(/[/?#]/)
    .map((part) => part.trim())
    .filter(Boolean);

  const storeIndex = parts.findIndex((part) => part.toLowerCase() === "store");
  if (storeIndex >= 0 && parts[storeIndex + 1]) {
    return parts[storeIndex + 1].replace(/\.myshopify\.com$/i, "").trim();
  }

  const firstPart = parts[0] ?? "";
  return firstPart.replace(/\.myshopify\.com$/i, "").trim();
}

function normalizeThemeEditorThemeId(themeId: string | null | undefined): string {
  const raw = String(themeId || "").trim();
  if (!raw) return "";
  if (raw === "current") return raw;
  if (/^\d+$/.test(raw)) return raw;
  const gidMatch = raw.match(/\/(\d+)(?:\?.*)?$/);
  if (gidMatch?.[1]) return gidMatch[1];
  return raw;
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
  const normalizedThemeId = normalizeThemeEditorThemeId(themeId);
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
  const editorUrl = buildThemeEditorAppEmbedUrl(
    shop,
    apiKey,
    plugin,
    themeId,
  );
  window.open(editorUrl, "_blank", "noopener,noreferrer");
}
