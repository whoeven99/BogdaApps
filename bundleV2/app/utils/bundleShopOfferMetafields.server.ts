import {
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

/** 已清理过的店铺列表（进程内缓存），之后跳过全量 key 扫描步骤 */
const cleanedShopSet = new Set<string>();

const METAFIELDS_SET_CHUNK = 25;
const METAFIELDS_DELETE_CHUNK = 50;

const SHOP_BUNDLE_METAFIELD_DEFINITIONS = [
  {
    key: BUNDLE_STOREFRONT_OFFERS_KEY,
    type: "json",
    name: "Ciwi Bundle Storefront Offers",
  },
  {
    key: BUNDLE_METAFIELD_FUNCTION_OFFERS_KEY,
    type: "json",
    name: "Ciwi Bundle Function Offers Copy",
  },
  {
    key: BUNDLE_OFFER_SYNC_AT_KEY,
    type: "single_line_text_field",
    name: "Ciwi Bundle Offer Sync At",
  },
] as const;

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

async function ensureShopBundleMetafieldDefinitions(admin: any): Promise<void> {
  const json = await graphqlJson(
    admin,
    `#graphql
      query ShopCiBundleMetafieldDefinitions {
        metafieldDefinitions(first: 50, ownerType: SHOP, namespace: "ciwi_bundle") {
          nodes {
            id
            key
            access {
              storefront
            }
          }
        }
      }
    `,
  );
  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message || "unknown").join("; "));
  }

  const nodes =
    (
      json.data as {
        metafieldDefinitions?: {
          nodes?: Array<{ id: string; key: string; access?: { storefront?: string } }>;
        };
      }
    )?.metafieldDefinitions?.nodes ?? [];
  const byKey = new Map(nodes.map((node) => [node.key, node]));

  for (const definition of SHOP_BUNDLE_METAFIELD_DEFINITIONS) {
    const existing = byKey.get(definition.key);
    if (!existing) {
      const createJson = await graphqlJson(
        admin,
        `#graphql
          mutation CreateShopBundleMetafieldDefinition($definition: MetafieldDefinitionInput!) {
            metafieldDefinitionCreate(definition: $definition) {
              createdDefinition {
                id
                key
              }
              userErrors {
                field
                message
              }
            }
          }
        `,
        {
          definition: {
            name: definition.name,
            namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
            key: definition.key,
            ownerType: "SHOP",
            type: definition.type,
            access: {
              storefront: "PUBLIC_READ",
            },
          },
        },
      );
      if (createJson.errors?.length) {
        throw new Error(createJson.errors.map((e) => e.message || "unknown").join("; "));
      }
      const userErrors = (
        createJson.data as {
          metafieldDefinitionCreate?: { userErrors?: Array<{ message?: string }> };
        }
      )?.metafieldDefinitionCreate?.userErrors;
      if (userErrors?.length) {
        throw new Error(userErrors.map((e) => e.message || "unknown").join("; "));
      }
      continue;
    }

    if (existing.access?.storefront === "PUBLIC_READ") {
      continue;
    }

    const updateJson = await graphqlJson(
      admin,
      `#graphql
        mutation UpdateShopBundleMetafieldDefinition($definition: MetafieldDefinitionUpdateInput!) {
          metafieldDefinitionUpdate(definition: $definition) {
            updatedDefinition {
              id
              key
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        definition: {
          namespace: BUNDLE_SHOP_METAFIELD_NAMESPACE,
          key: definition.key,
          ownerType: "SHOP",
          access: {
            storefront: "PUBLIC_READ",
          },
        },
      },
    );
    if (updateJson.errors?.length) {
      throw new Error(updateJson.errors.map((e) => e.message || "unknown").join("; "));
    }
    const userErrors = (
      updateJson.data as {
        metafieldDefinitionUpdate?: { userErrors?: Array<{ message?: string }> };
      }
    )?.metafieldDefinitionUpdate?.userErrors;
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
 *
 * 性能优化：已清理过的店铺（进程内缓存 `cleanedShopSet`）跳过全量 key 扫描 + 删除步骤，
 * 仅执行 metafield 定义 ensure 和 3 个 key 的写入。
 */
export async function reconcileShopOfferShardedMetafields(
  admin: any,
  shopId: string,
  params: {
    syncAtIso: string;
    /** `ciwi-bundle-offers`：JSON 字符串 `{ updatedAt, offers }`（含 hydrated storefront） */
    storefrontOffersPayload: string;
    functionOffersCompactPayload: string;
  },
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await ensureShopBundleMetafieldDefinitions(admin);

    if (!cleanedShopSet.has(shopId)) {
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
      if (existingKeys.includes("ciwi-bundle-enabled")) keysToDelete.push("ciwi-bundle-enabled");

      if (keysToDelete.length) {
        await metafieldsDeleteByOwnerKeys(admin, shopId, keysToDelete);
      }
      cleanedShopSet.add(shopId);
    }

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
    ];
    await metafieldsSetChunked(admin, metafields);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, message: message || "Shop bundle metafield sync failed" };
  }
}
