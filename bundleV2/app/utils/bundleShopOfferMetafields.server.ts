import {
  BUNDLE_FUNCTION_OFFER_SLOT_COUNT,
  BUNDLE_FUNCTION_OFFER_SLOT_KEY_PREFIX,
  BUNDLE_LEGACY_MONOLITHIC_OFFERS_KEY,
  BUNDLE_METAFIELD_ENABLED_KEY,
  BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
  BUNDLE_OFFER_COUNT_KEY,
  BUNDLE_OFFER_IDS_KEY,
  BUNDLE_OFFER_SHARD_PREFIX,
  BUNDLE_OFFER_SYNC_AT_KEY,
  BUNDLE_SHOP_METAFIELD_NAMESPACE,
  bundleShopFunctionOfferSlotKey,
  bundleShopOfferShardKey,
} from "./bundleShopMetafieldKeys";

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

function offerIdFromShardKey(key: string): string | null {
  if (!key.startsWith(BUNDLE_OFFER_SHARD_PREFIX)) return null;
  const id = key.slice(BUNDLE_OFFER_SHARD_PREFIX.length).trim();
  return id || null;
}

function functionOfferSlotIndexFromKey(key: string): number | null {
  if (!key.startsWith(BUNDLE_FUNCTION_OFFER_SLOT_KEY_PREFIX)) return null;
  const rest = key.slice(BUNDLE_FUNCTION_OFFER_SLOT_KEY_PREFIX.length).trim();
  const n = Number(rest);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.trunc(n);
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
 * 将活动 offer 写入 shop 分片 metafield（`offer-{id}` + Function 槽位 `ciwi-bundle-fn-offer-*`），并删除已下线的分片与废弃的整包 `ciwi-bundle-offers`。
 */
export async function reconcileShopOfferShardedMetafields(
  admin: any,
  shopId: string,
  params: {
    /** 与写入分片顺序一致的活动 offer id（通常与 storefront offers 数组一致） */
    activeOfferIdsOrdered: string[];
    syncAtIso: string;
    /** 每个活动 offer 一条 JSON 字符串（已 JSON.stringify 的单条 offer 对象） */
    offerShardValueById: Map<string, string>;
    functionOffersCompactPayload: string;
    /** 与 `activeOfferIdsOrdered` 前若干条一致，每条为单 offer compact 的 JSON 字符串（长度 ≤ `BUNDLE_FUNCTION_OFFER_SLOT_COUNT`） */
    functionOfferSlotCompactValues: string[];
    themeExtensionEnabled: boolean;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const wanted = new Set(
      params.activeOfferIdsOrdered.map((id) => String(id || "").trim()).filter(Boolean),
    );
    const activeOfferCount = params.activeOfferIdsOrdered
      .map((id) => String(id || "").trim())
      .filter(Boolean).length;

    const existingKeys = await listShopCiBundleMetafieldKeys(admin);
    const keysToDelete: string[] = [];
    for (const key of existingKeys) {
      const shardId = offerIdFromShardKey(key);
      if (shardId && !wanted.has(shardId)) {
        keysToDelete.push(key);
        continue;
      }
      const slotIdx = functionOfferSlotIndexFromKey(key);
      if (slotIdx !== null) {
        if (
          slotIdx >= BUNDLE_FUNCTION_OFFER_SLOT_COUNT ||
          slotIdx >= activeOfferCount
        ) {
          keysToDelete.push(key);
        }
        continue;
      }
      if (key === BUNDLE_LEGACY_MONOLITHIC_OFFERS_KEY) {
        keysToDelete.push(key);
      }
    }

    if (keysToDelete.length) {
      await metafieldsDeleteByOwnerKeys(admin, shopId, keysToDelete);
    }

    const idsOrdered = params.activeOfferIdsOrdered
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    const count = idsOrdered.length;
    const idsJson = JSON.stringify(idsOrdered);

    const updatedAt = params.syncAtIso;
    const enabledPayload = JSON.stringify({
      enabled: params.themeExtensionEnabled,
      updatedAt,
    });

    const base: MetafieldsSetInput[] = [
      {
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: BUNDLE_OFFER_COUNT_KEY,
        type: "number_integer",
        value: String(count),
      },
      {
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: BUNDLE_OFFER_IDS_KEY,
        type: "json",
        value: idsJson,
      },
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

    const shardInputs: MetafieldsSetInput[] = idsOrdered.map((id) => {
      const json = params.offerShardValueById.get(id);
      if (typeof json !== "string" || !json.trim()) {
        throw new Error(`Missing storefront shard JSON for offer ${id}`);
      }
      return {
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: bundleShopOfferShardKey(id),
        type: "json",
        value: json,
      };
    });

    const slotLimit = Math.min(idsOrdered.length, BUNDLE_FUNCTION_OFFER_SLOT_COUNT);
    if (params.functionOfferSlotCompactValues.length < slotLimit) {
      throw new Error(
        `functionOfferSlotCompactValues length ${params.functionOfferSlotCompactValues.length} < required ${slotLimit}`,
      );
    }
    const fnSlotInputs: MetafieldsSetInput[] = [];
    for (let i = 0; i < slotLimit; i++) {
      const json = params.functionOfferSlotCompactValues[i];
      if (typeof json !== "string" || !json.trim()) {
        throw new Error(`Missing function slot compact JSON for index ${i}`);
      }
      fnSlotInputs.push({
        ownerId: shopId,
        namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
        key: bundleShopFunctionOfferSlotKey(i),
        type: "json",
        value: json,
      });
    }

    await metafieldsSetChunked(admin, [...base, ...shardInputs, ...fnSlotInputs]);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, message: message || "Shop offer shard metafield sync failed" };
  }
}
