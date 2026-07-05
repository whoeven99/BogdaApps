export type StoreProductItem = {
  id: string;
  name: string;
  handle: string;
  price: string;
  image: string;
  collections: Array<{ id: string; title: string }>;
  variants: Array<{
    id: string;
    title: string;
    price: string;
    selectedOptions: Array<{ name: string; value: string }>;
  }>;
  hasSubscription: boolean;
};

type AdminProductNode = {
  id?: string;
  title?: string;
  handle?: string;
  featuredImage?: { url?: string | null } | null;
  images?: {
    edges?: Array<{ node?: { url?: string | null } | null }>;
  } | null;
  collections?: {
    edges?: Array<{ node?: { id?: string | null; title?: string | null } | null }>;
  } | null;
  variants?: {
    edges?: Array<{
      node?: {
        id?: string | null;
        title?: string | null;
        price?: string | null;
        selectedOptions?: Array<{ name?: string | null; value?: string | null } | null> | null;
      } | null;
    }>;
  } | null;
  sellingPlanGroups?: {
    edges?: Array<{ node?: { id?: string | null } | null }>;
  } | null;
} | null;

type AdminType = {
  graphql: (
    query: string,
    opts?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
};

const MAX_PRODUCT_PAGES = 10;

/**
 * 本地内联 SVG 占位图：仅在商品确实没有任何图片时使用。
 * 避免依赖外部 via.placeholder.com（常被墙/服务不稳定，会渲染成空白裂图）。
 */
const PRODUCT_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#f1f1f1"/></svg>',
  );

function mapAdminProductNodeToStoreProductItem(node: AdminProductNode): StoreProductItem | null {
  if (!node?.id || !node.title) return null;

  return {
    id: node.id,
    name: node.title,
    handle: String(node.handle || ""),
    price: node.variants?.edges?.[0]?.node?.price
      ? `$${node.variants.edges[0].node.price}`
      : "$0.00",
    // featuredImage 可能为空（商品图只挂在媒体/变体上），用 images(first:1) 兜底，
    // 都没有才退回本地占位图，确保编辑回填时缩略图能正常显示。
    image:
      node.featuredImage?.url ||
      node.images?.edges?.[0]?.node?.url ||
      PRODUCT_IMAGE_PLACEHOLDER,
    collections:
      node.collections?.edges
        ?.map((edge) => edge?.node)
        .filter((c): c is NonNullable<typeof c> => Boolean(c?.id))
        .map((c) => ({ id: String(c.id || ""), title: String(c.title || "") })) || [],
    variants:
      node.variants?.edges
        ?.map((edge) => edge?.node)
        .filter((v): v is NonNullable<typeof v> => Boolean(v?.id))
        .map((v) => ({
          id: String(v.id || ""),
          title: String(v.title || ""),
          price: String(v.price || ""),
          selectedOptions: Array.isArray(v.selectedOptions)
            ? v.selectedOptions
                .filter((opt): opt is NonNullable<typeof opt> => Boolean(opt))
                .map((opt) => ({ name: String(opt.name || ""), value: String(opt.value || "") }))
            : [],
        })) || [],
    hasSubscription: ((node?.sellingPlanGroups?.edges as Array<unknown> | undefined) ?? []).length > 0,
  };
}

const PRODUCT_LIST_QUERY = `#graphql
  query AppProducts($after: String) {
    products(first: 100, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id title handle
          featuredImage { url }
          images(first: 1) { edges { node { url } } }
          collections(first: 20) { edges { node { id title } } }
          variants(first: 50) {
            edges {
              node {
                id title price
                selectedOptions { name value }
              }
            }
          }
          sellingPlanGroups(first: 1) { edges { node { id } } }
        }
      }
    }
  }
`;

const PRODUCTS_BY_IDS_QUERY = `#graphql
  query ProductsByIds($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on Product {
        id title handle
        featuredImage { url }
        images(first: 1) { edges { node { url } } }
        collections(first: 20) { edges { node { id title } } }
        variants(first: 50) {
          edges {
            node {
              id title price
              selectedOptions { name value }
            }
          }
        }
        sellingPlanGroups(first: 1) { edges { node { id } } }
      }
    }
  }
`;

export type StoreCollectionItem = { id: string; title: string };

const COLLECTION_LIST_QUERY = `#graphql
  query AppCollections($after: String) {
    collections(first: 250, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges { node { id title } }
    }
  }
`;

const PRODUCT_COUNT_QUERY = `#graphql
  query AppProductCount {
    productsCount { count }
  }
`;

const PRODUCT_IDS_IN_COLLECTION_QUERY = `#graphql
  query ProductIdsInCollection($id: ID!, $after: String) {
    collection(id: $id) {
      products(first: 250, after: $after) {
        pageInfo { hasNextPage endCursor }
        edges { node { id } }
      }
    }
  }
`;

const MAX_COLLECTION_PAGES = 8;

/** 仅按 id 取商品详情（不扫全店）。供编辑回填、collection 展开后的详情补全复用。 */
export async function fetchProductsByIds(
  admin: AdminType,
  productIds: string[],
): Promise<StoreProductItem[]> {
  const uniqueIds = Array.from(
    new Set(productIds.map((id) => String(id || "").trim()).filter(Boolean)),
  );
  const productMap = new Map<string, StoreProductItem>();

  for (let i = 0; i < uniqueIds.length; i += 50) {
    const batchIds = uniqueIds.slice(i, i + 50);
    try {
      const byIdsResponse = await admin.graphql(PRODUCTS_BY_IDS_QUERY, {
        variables: { ids: batchIds },
      });
      const byIdsJson = (await byIdsResponse.json()) as { data?: { nodes?: AdminProductNode[] } };
      for (const node of byIdsJson?.data?.nodes ?? []) {
        const mapped = mapAdminProductNodeToStoreProductItem(node);
        if (mapped) productMap.set(mapped.id, mapped);
      }
    } catch (error) {
      console.error("Failed to fetch products by ids", { batchIds, error });
    }
  }

  return Array.from(productMap.values());
}

/** 取店铺 collection 列表（id + title），供 builder 的 collection 下拉。 */
export async function fetchStoreCollections(admin: AdminType): Promise<StoreCollectionItem[]> {
  const collections: StoreCollectionItem[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;

  while (hasNextPage && pageCount < MAX_COLLECTION_PAGES) {
    try {
      const response = await admin.graphql(COLLECTION_LIST_QUERY, { variables: { after: cursor } });
      const json = (await response.json()) as {
        data?: {
          collections?: {
            pageInfo?: { hasNextPage?: boolean; endCursor?: string };
            edges?: Array<{ node?: { id?: string | null; title?: string | null } | null }>;
          };
        };
      };
      for (const edge of json?.data?.collections?.edges ?? []) {
        const id = String(edge?.node?.id || "").trim();
        const title = String(edge?.node?.title || "").trim();
        if (id) collections.push({ id, title });
      }
      hasNextPage = Boolean(json?.data?.collections?.pageInfo?.hasNextPage);
      cursor = String(json?.data?.collections?.pageInfo?.endCursor || "") || null;
      pageCount += 1;
    } catch (error) {
      console.error("Failed to fetch store collections", error);
      break;
    }
  }

  return collections;
}

/** 店铺商品总数，供「是否已选全店」判定。取不到返回 0（按非全店处理）。 */
export async function fetchStoreProductCount(admin: AdminType): Promise<number> {
  try {
    const response = await admin.graphql(PRODUCT_COUNT_QUERY);
    const json = (await response.json()) as { data?: { productsCount?: { count?: number } } };
    const count = json?.data?.productsCount?.count;
    return typeof count === "number" && count >= 0 ? count : 0;
  } catch (error) {
    console.error("Failed to fetch store product count", error);
    return 0;
  }
}

/** 取若干 collection 下的去重商品 id（不取详情，详情由 resourcePicker 回填）。 */
export async function fetchProductIdsInCollections(
  admin: AdminType,
  collectionIds: string[],
): Promise<string[]> {
  const uniqueCollectionIds = Array.from(
    new Set(collectionIds.map((id) => String(id || "").trim()).filter(Boolean)),
  );
  const productIds = new Set<string>();

  for (const collectionId of uniqueCollectionIds) {
    let cursor: string | null = null;
    let hasNextPage = true;
    let pageCount = 0;
    while (hasNextPage && pageCount < MAX_PRODUCT_PAGES) {
      try {
        const response = await admin.graphql(PRODUCT_IDS_IN_COLLECTION_QUERY, {
          variables: { id: collectionId, after: cursor },
        });
        const json = (await response.json()) as {
          data?: {
            collection?: {
              products?: {
                pageInfo?: { hasNextPage?: boolean; endCursor?: string };
                edges?: Array<{ node?: { id?: string | null } | null }>;
              };
            };
          };
        };
        for (const edge of json?.data?.collection?.products?.edges ?? []) {
          const id = String(edge?.node?.id || "").trim();
          if (id) productIds.add(id);
        }
        hasNextPage = Boolean(json?.data?.collection?.products?.pageInfo?.hasNextPage);
        cursor = String(json?.data?.collection?.products?.pageInfo?.endCursor || "") || null;
        pageCount += 1;
      } catch (error) {
        console.error("Failed to fetch products in collection", { collectionId, error });
        break;
      }
    }
  }

  return Array.from(productIds);
}

export async function fetchStoreProducts(
  admin: AdminType,
  includeProductIds: string[] = [],
): Promise<StoreProductItem[]> {
  const productMap = new Map<string, StoreProductItem>();
  let cursor: string | null = null;
  let hasNextPage = true;
  let pageCount = 0;

  while (hasNextPage && pageCount < MAX_PRODUCT_PAGES) {
    let productsJson: {
      data?: {
        products?: {
          pageInfo?: { hasNextPage?: boolean; endCursor?: string };
          edges?: Array<{ node?: AdminProductNode }>;
        };
      };
    };

    try {
      const response = await admin.graphql(PRODUCT_LIST_QUERY, { variables: { after: cursor } });
      productsJson = (await response.json()) as typeof productsJson;
    } catch (error) {
      console.error("Failed to fetch or parse products GraphQL response", error);
      return Array.from(productMap.values());
    }

    for (const edge of productsJson?.data?.products?.edges ?? []) {
      const mapped = mapAdminProductNodeToStoreProductItem(edge?.node ?? null);
      if (mapped) productMap.set(mapped.id, mapped);
    }

    hasNextPage = Boolean(productsJson?.data?.products?.pageInfo?.hasNextPage);
    cursor = String(productsJson?.data?.products?.pageInfo?.endCursor || "") || null;
    pageCount += 1;
  }

  const missingIds = includeProductIds
    .map((id) => String(id || "").trim())
    .filter((id) => id && !productMap.has(id));

  for (const product of await fetchProductsByIds(admin, missingIds)) {
    productMap.set(product.id, product);
  }

  return Array.from(productMap.values());
}
