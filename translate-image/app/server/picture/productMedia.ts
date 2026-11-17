/** product.images 已弃用；店内列表改 media，再映射成原来的 images 形状。 */

export type ImageLikeNode = {
  id: string;
  url: string;
  altText: string;
  imageSourceId?: string;
};

export type ImageLikeConnection = {
  edges: Array<{ node: ImageLikeNode }>;
  pageInfo: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor: string | null;
    endCursor: string | null;
  };
};

const EMPTY_PAGE = {
  hasNextPage: false,
  hasPreviousPage: false,
  startCursor: null as string | null,
  endCursor: null as string | null,
};

export const PRODUCT_MEDIA_FIELDS = `media(first: 20) {
  edges {
    node {
      ... on MediaImage {
        id
        image { id url altText }
      }
    }
  }
  pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
}`;

export function gidTail(id: string): string {
  const trimmed = String(id || "").trim();
  if (!trimmed) return "";
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

export function mediaNodeMatches(
  node: Pick<ImageLikeNode, "id" | "imageSourceId">,
  requested: string,
): boolean {
  const want = gidTail(requested);
  if (!want) return false;
  return [node.id, node.imageSourceId].some((id) => {
    if (!id) return false;
    return id === requested || gidTail(id) === want;
  });
}

export function findImageLikeNode(
  edges: ImageLikeConnection["edges"] | undefined,
  requested: string,
): ImageLikeNode | null {
  for (const edge of edges ?? []) {
    if (mediaNodeMatches(edge.node, requested)) return edge.node;
  }
  return null;
}

export function mediaToImageConnection(media: unknown): ImageLikeConnection {
  const record = (media ?? {}) as {
    edges?: Array<{
      node?: {
        id?: string;
        image?: { id?: string; url?: string; altText?: string | null } | null;
      } | null;
    }>;
    pageInfo?: ImageLikeConnection["pageInfo"];
  };
  const edges: ImageLikeConnection["edges"] = [];
  for (const edge of record.edges ?? []) {
    const image = edge?.node?.image;
    if (!image?.url) continue;
    const mediaId = String(edge.node?.id || "");
    const imageSourceId = String(image.id || "");
    edges.push({
      node: {
        id: mediaId || imageSourceId,
        url: String(image.url),
        altText: String(image.altText || ""),
        imageSourceId,
      },
    });
  }
  return { edges, pageInfo: record.pageInfo ?? EMPTY_PAGE };
}

export function productWithImages<T extends { media?: unknown }>(product: T | null | undefined) {
  if (!product) return product;
  return { ...product, images: mediaToImageConnection(product.media) };
}
