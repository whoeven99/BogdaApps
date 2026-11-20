type ConnectionJson = {
  edges?: Array<{ node?: Record<string, unknown> }>;
  pageInfo?: {
    hasPreviousPage?: boolean;
    hasNextPage?: boolean;
    startCursor?: string | null;
    endCursor?: string | null;
  };
};

function connection(json: unknown, key: "products" | "collections"): ConnectionJson {
  const data = (json as { data?: Record<string, ConnectionJson | null> } | null)?.data;
  return data?.[key] ?? {};
}

function productImage(node: Record<string, unknown> | undefined): string {
  const media = node?.media as
    | { edges?: Array<{ node?: { preview?: { image?: { url?: string } } } }> }
    | undefined;
  return media?.edges?.[0]?.node?.preview?.image?.url || "";
}

export function mapProductList(json: unknown) {
  const products = connection(json, "products");
  const edges = Array.isArray(products.edges) ? products.edges : [];
  const pageInfo = products.pageInfo ?? {};
  return {
    data: edges.map((edge) => ({
      id: edge?.node?.id,
      title: edge?.node?.title,
      image: productImage(edge?.node),
      status: edge?.node?.status,
    })),
    hasPreviousPage: Boolean(pageInfo.hasPreviousPage),
    startCursor: pageInfo.startCursor ?? null,
    hasNextPage: Boolean(pageInfo.hasNextPage),
    endCursor: pageInfo.endCursor ?? null,
  };
}

export function mapCollectionList(json: unknown) {
  const collections = connection(json, "collections");
  const edges = Array.isArray(collections.edges) ? collections.edges : [];
  const pageInfo = collections.pageInfo ?? {};
  return {
    data: edges.map((edge) => ({
      id: edge?.node?.id,
      title: edge?.node?.title,
      image: "",
    })),
    hasNextPage: Boolean(pageInfo.hasNextPage),
    endCursor: pageInfo.endCursor ?? null,
  };
}

export function emptyProductList() {
  return {
    data: [],
    hasPreviousPage: false,
    startCursor: null,
    hasNextPage: false,
    endCursor: null,
  };
}
