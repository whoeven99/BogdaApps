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

function mapAdminProductNodeToStoreProductItem(node: AdminProductNode): StoreProductItem | null {
  if (!node?.id || !node.title) return null;

  return {
    id: node.id,
    name: node.title,
    handle: String(node.handle || ""),
    price: node.variants?.edges?.[0]?.node?.price
      ? `$${node.variants.edges[0].node.price}`
      : "$0.00",
    image: node.featuredImage?.url || "https://via.placeholder.com/60",
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

  const missingIds = Array.from(
    new Set(
      includeProductIds
        .map((id) => String(id || "").trim())
        .filter((id) => id && !productMap.has(id)),
    ),
  );

  for (let i = 0; i < missingIds.length; i += 50) {
    const batchIds = missingIds.slice(i, i + 50);
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
      console.error("Failed to fetch referenced products by ids", { batchIds, error });
    }
  }

  return Array.from(productMap.values());
}
