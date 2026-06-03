export type ThemeAppEmbedConfig = {
  key: string;
  extensionHandle: string;
  extensionUid: string;
  embedHandle: string;
  blockHandles?: string[];
  template?: string;
};

export const BUNDLE_THEME_PRODUCT_PLUGIN: ThemeAppEmbedConfig = {
  key: "bundle-product-message",
  extensionHandle: "bundlev2-theme-product-custom",
  extensionUid: "98c7499e-d3c1-b1b3-ba20-d1b6bd6236550287835f",
  embedHandle: "product_detail_message",
  blockHandles: ["product_detail_message", "product_detail_message_block"],
  template: "product",
};

export const THEME_APP_EMBEDS: ThemeAppEmbedConfig[] = [
  BUNDLE_THEME_PRODUCT_PLUGIN,
];
