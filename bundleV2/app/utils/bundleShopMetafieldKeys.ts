/** Shop 级 bundle 配置 metafield（namespace 均为 `ciwi_bundle`） */
export const BUNDLE_SHOP_METAFIELD_NAMESPACE = "ciwi_bundle";

/** 当前同步到店的「活动」offer 数量（number_integer，与 `ciwi-bundle-offer-ids` 长度一致） */
export const BUNDLE_OFFER_COUNT_KEY = "ciwi-bundle-offer-count";

/**
 * 活动 offer id 列表（json 数组字符串），主题/脚本据此拉取各 `offer-{id}` 分片。
 * 仅 count 无法在 Liquid 侧枚举具体 key，因此必须保留 id 列表。
 */
export const BUNDLE_OFFER_IDS_KEY = "ciwi-bundle-offer-ids";

/** 最近一次写入分片的时间戳（ISO 字符串），用于组装 `{ updatedAt, offers }` */
export const BUNDLE_OFFER_SYNC_AT_KEY = "ciwi-bundle-offer-sync-at";

/** 单个活动 offer 的 JSON 分片：`offer-{offerId}` */
export const BUNDLE_OFFER_SHARD_PREFIX = "offer-";

export function bundleShopOfferShardKey(offerId: string): string {
  return `${BUNDLE_OFFER_SHARD_PREFIX}${String(offerId || "").trim()}`;
}

/** 已废弃：整包 storefront JSON（超大，Function 输入易为 null）；保留常量供迁移期删除旧 metafield */
export const BUNDLE_LEGACY_MONOLITHIC_OFFERS_KEY = "ciwi-bundle-offers";

/** 供 Shopify Functions 读取的瘦 offers（合并后的单 JSON，需保持 ≤10k UTF-8） */
export const BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY = "ciwi-bundle-offers-fn";

export const BUNDLE_METAFIELD_ENABLED_KEY = "ciwi-bundle-enabled";
