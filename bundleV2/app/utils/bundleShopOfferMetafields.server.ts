import {
  BUNDLE_METAFIELD_ENABLED_KEY,
  BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
  BUNDLE_OFFER_SYNC_AT_KEY,
  BUNDLE_SHOP_METAFIELD_NAMESPACE,
  BUNDLE_STOREFRONT_OFFERS_KEY,
} from "./bundleShopMetafieldKeys";

/** 已不再写入；每次 reconcile 时删除残留 */
const LEGACY_BUNDLE_OFFER_IDS_KEY = "ciwi-bundle-offer-ids";

/** 已不再写入；每次 reconcile 时删除所有匹配此前缀的 metafield */
const LEGACY_FN_OFFER_SLOT_KEY_PREFIX = "ciwi-bundle-fn-offer-";

/** 已不再使用主题分片；每次 reconcile 删除 `offer-*` */
const LEGACY_OFFER_SHARD_PREFIX = "offer-";

/** 已不再写入；删除残留 */
const LEGACY_OFFER_COUNT_KEY = "ciwi-bundle-offer-count";

const METAFIELDS_SET_CHUNK = 25;
const METAFIELDS_DELETE_CHUNK = 50;

type MetafieldsSetInput = {
  ownerId: string;
  namespace: string;
  key: string;
  type: string;
  value: string;
};

async function graphqlJson(admin: any, query: string, variables?: Record<string, unknown>) {
  const resp = await admin.graphql(query, variables ? { variables } : undefined);
  return (await resp.json()) as {
    data?: unknown;
    errors?: Array<{ message?: string }>;
  };
}

async function listShopCiBundleMetafieldKeys(admin: any): Promise<string[]> {
  const keys: string[] = [];
  let cursor: string | null = null;
  let hasNext = true;
  while (hasNext) {
    const json = await graphqlJson(
      admin,
      `#graphql
        query ShopCiBundleMetafieldKeys($cursor: String) {
          shop {
            metafields(first: 250, namespace: "ciwi_bundle", after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              edges {
                node {
                  key
                }
              }
            }
          }
        }
      `,
      { cursor },
    );
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message || "unknown").join("; "));
    }
    const shop = (json.data as { shop?: { metafields?: { pageInfo?: any; edges?: any[] } } })?.shop;
    const conn = shop?.metafields;
    const edges = conn?.edges ?? [];
    for (const e of edges) {
      const k = e?.node?.key;
      if (k) keys.push(String(k));
    }
    hasNext = Boolean(conn?.pageInfo?.hasNextPage);
    cursor = conn?.pageInfo?.endCursor ? String(conn.pageInfo.endCursor) : null;
  }
  return keys;
}

async function metafieldsDeleteByOwnerKeys(
  admin: any,
  shopId: string,
  keys: string[],
): Promise<void> {
  if (!keys.length) return;
  const inputs = keys.map((key) => ({
    ownerId: shopId,
    namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
    key,
  }));
  for (let i = 0; i < inputs.length; i += METAFIELDS_DELETE_CHUNK) {
    const slice = inputs.slice(i, i + METAFIELDS_DELETE_CHUNK);
    const json = await graphqlJson(
      admin,
      `#graphql
        mutation MetafieldsDelete($metafields: [MetafieldIdentifierInput!]!) {
          metafieldsDelete(metafields: $metafields) {
            deletedMetafields {
              key
              namespace
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      { metafields: slice },
    );
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message || "unknown").join("; "));
    }
    const userErrors = (json.data as { metafieldsDelete?: { userErrors?: Array<{ message?: string }> } })
      ?.metafieldsDelete?.userErrors;
    if (userErrors?.length) {
      throw new Error(userErrors.map((e) => e.message || "unknown").join("; "));
    }
  }
}

async function metafieldsSetChunked(
  admin: any,
  metafields: MetafieldsSetInput[],
): Promise<void> {
  for (let i = 0; i < metafields.length; i += METAFIELDS_SET_CHUNK) {
    const slice = metafields.slice(i, i + METAFIELDS_SET_CHUNK);
    const json = await graphqlJson(
      admin,
      `#graphql
        mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              key
              namespace
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      { metafields: slice },
    );
    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message || "unknown").join("; "));
    }
    const userErrors = (json.data as { metafieldsSet?: { userErrors?: Array<{ message?: string }> } })
      ?.metafieldsSet?.userErrors;
    if (userErrors?.length) {
      throw new Error(userErrors.map((e) => e.message || "unknown").join("; "));
    }
  }
}

/**
 * 写入主题整包 `ciwi-bundle-offers`、Function 用 `ciwi-bundle-offers-fn`、开关与时间戳；
 * 并清理历史分片 `offer-*`、`ciwi-bundle-offer-ids`、`ciwi-bundle-fn-offer-*`、`ciwi-bundle-offer-count`。
 */
export async function reconcileShopOfferShardedMetafields(
  admin: any,
  shopId: string,
  params: {
    syncAtIso: string;
    /** `ciwi-bundle-offers`：JSON 字符串 `{ updatedAt, offers }`（含 hydrated storefront） */
    storefrontOffersPayload: string;
    functionOffersCompactPayload: string;
    themeExtensionEnabled: boolean;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const existingKeys = await listShopCiBundleMetafieldKeys(admin);
    const keysToDelete: string[] = [];
    for (const key of existingKeys) {
      if (key.startsWith(LEGACY_OFFER_SHARD_PREFIX)) {
        keysToDelete.push(key);
        continue;
      }
      if (
        key === LEGACY_BUNDLE_OFFER_IDS_KEY ||
        key.startsWith(LEGACY_FN_OFFER_SLOT_KEY_PREFIX) ||
        key === LEGACY_OFFER_COUNT_KEY
      ) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length) {
      await metafieldsDeleteByOwnerKeys(admin, shopId, keysToDelete);
    }

    const updatedAt = params.syncAtIso;
    const enabledPayload = JSON.stringify({
      enabled: params.themeExtensionEnabled,
      updatedAt,
    });

    const metafields: MetafieldsSetInput[] = [
      {
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: BUNDLE_OFFER_SYNC_AT_KEY,
        type: "single_line_text_field",
        value: params.syncAtIso,
      },
      {
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: BUNDLE_STOREFRONT_OFFERS_KEY,
        type: "json",
        value: params.storefrontOffersPayload,
      },
      {
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
        type: "json",
        value: params.functionOffersCompactPayload,
      },
      {
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: BUNDLE_METAFIELD_ENABLED_KEY,
        type: "json",
        value: enabledPayload,
      },
    ];

    await metafieldsSetChunked(admin, metafields);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, message: message || "Shop bundle metafield sync failed" };
  }
}
