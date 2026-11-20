type AdminGraphql = (
  query: string,
  options?: { variables?: Record<string, unknown> },
) => Promise<Response>;

export type ProductIdNode = { id: string; title: string; status?: string };

const CHUNK = 50;

function asGid(id: string): string {
  if (id.startsWith("gid://")) return id;
  return `gid://shopify/Product/${id}`;
}

export async function loadProductsByIds(
  admin: { graphql: AdminGraphql },
  ids: string[],
): Promise<ProductIdNode[]> {
  const gids = ids.map(asGid).filter(Boolean);
  const out: ProductIdNode[] = [];
  for (let i = 0; i < gids.length; i += CHUNK) {
    const chunk = gids.slice(i, i + CHUNK);
    const response = await admin.graphql(
      `#graphql
      query ProductsByIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            id
            title
            status
          }
        }
      }`,
      { variables: { ids: chunk } },
    );
    const json = (await response.json()) as {
      data?: { nodes?: Array<{ id?: string; title?: string; status?: string } | null> };
    };
    for (const node of json.data?.nodes ?? []) {
      if (node?.id) {
        out.push({
          id: node.id,
          title: node.title || "",
          status: node.status,
        });
      }
    }
  }
  return out;
}
