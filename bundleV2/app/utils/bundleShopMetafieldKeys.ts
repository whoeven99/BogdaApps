/** Shop 级 bundle 配置 metafield（namespace 均为 `ciwi_bundle`） */
export const BUNDLE_SHOP_METAFIELD_NAMESPACE = "ciwi_bundle";

/** 最近一次写入 offers 的时间戳（ISO 字符串） */
export const BUNDLE_OFFER_SYNC_AT_KEY = "ciwi-bundle-offer-sync-at";

/** 主题读取的整包 storefront offers：`{ updatedAt, offers }` */
export const BUNDLE_STOREFRONT_OFFERS_KEY = "ciwi-bundle-offers";

/** 供 Shopify Functions 读取的瘦 offers（合并 JSON，需保持 ≤10k UTF-8） */
export const BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY = "ciwi-bundle-offers-fn";

export const BUNDLE_METAFIELD_ENABLED_KEY = "ciwi-bundle-enabled";
