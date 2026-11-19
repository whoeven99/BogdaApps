import {
  canonicalShopifyImageUrl,
  extractShopifyImageUrlsFromHtml,
  imageUrlKey,
} from "~/server/picture/imageUrlKey";
import type { ThemeImageUsedIn } from "~/lib/themeImageUsedIn";
import {
  type ImageResourceType,
  shopifyResourceGid,
} from "~/lib/imageResourcePaths";
import {
  fetchCollectionImageFlatPage,
  getCollectionImageByFlatId,
  getCollectionImageResource,
  parseCollectionImageRowId,
} from "./collectionImages.server";
import {
  isLeftoverFileRow,
  leftoverLiveSubtractKeys,
  type LeftoverSubtract,
} from "./leftoverImages.server";
import { fetchThemeImagePage, getThemeImageResource } from "./themeImages.server";

export type { ImageResourceType } from "~/lib/imageResourcePaths";
export {
  IMAGE_RESOURCE_TYPES,
  RESOURCE_STATUS_TABS,
  imageJobKindForResource,
  imageResourceDetailPath,
  imageResourceListPath,
  parseImageResourceType,
  shopifyResourceGid,
  shopifyResourceNumericId,
} from "~/lib/imageResourcePaths";

export type AdminGraphqlClient = {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
};

export type FlatResourceTranslation = {
  imageId: string;
  imageBeforeUrl: string;
  imageAfterUrl: string | null;
  urlKey: string | null;
};

export type ImageResourceRow = {
  id: string;
  title: string;
  imageUrl: string | null;
  status: string;
  imageCount?: number;
  translatedImageCount?: number;
  urlKey?: string;
  translated?: FlatResourceTranslation | null;
  usedIn?: ThemeImageUsedIn[];
};

export type ImageResourcePage = {
  rows: ImageResourceRow[];
  hasNextPage: boolean;
  endCursor: string | null;
};

export type ResourceImageSourceRow = {
  urlKey: string;
  imageUrl: string;
  usedIn: ThemeImageUsedIn[];
  productId?: string;
};

const LIST_PAGE_SIZE = 20;
const SHOPIFY_FETCH_SIZE = 50;
const MEDIA_MAX_PAGES = 20;
const MAX_FILL_FETCHES = 15;

type ShopifyCatalogType = "product" | "article" | "page";

const LIST_QUERIES: Record<ShopifyCatalogType, string> = {
  product: `query CiwiImageResourcesProducts($first: Int!, $after: String, $query: String) {
    products(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node {
          id title status featuredImage { url } descriptionHtml
          media(first: 50) {
            nodes { ... on MediaImage { image { url } } }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`,
  article: `query CiwiImageResourcesArticles($first: Int!, $after: String, $query: String) {
    articles(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node { id title publishedAt image { url } body }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`,
  page: `query CiwiImageResourcesPages($first: Int!, $after: String, $query: String) {
    pages(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
      edges {
        cursor
        node { id title isPublished body }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`,
};

const CONNECTION_FIELD: Record<ShopifyCatalogType, string> = {
  product: "products",
  article: "articles",
  page: "pages",
};

const FILES_LIST_QUERY = `query CiwiImageResourcesFiles($first: Int!, $after: String, $query: String) {
  files(first: $first, after: $after, query: $query, sortKey: UPDATED_AT, reverse: true) {
    edges {
      cursor
      node {
        id
        alt
        fileStatus
        preview { image { url } }
        ... on MediaImage { image { url } }
      }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const FILE_NODE_QUERY = `query CiwiFileImageResource($id: ID!) {
  node(id: $id) {
    id
    ... on MediaImage {
      alt
      fileStatus
      preview { image { url } }
      image { url }
    }
  }
}`;

type FileImageNode = {
  id?: string;
  alt?: string | null;
  fileStatus?: string | null;
  image?: { url?: string | null } | null;
  preview?: { image?: { url?: string | null } | null } | null;
};

export function filenameFromImageUrl(url: string): string {
  const path = String(url ?? "").split(/[?#]/)[0] ?? "";
  const name = path.split("/").pop() ?? "";
  try {
    return decodeURIComponent(name) || name;
  } catch {
    return name;
  }
}

export function fileImageUrl(node: FileImageNode): string | null {
  const raw = String(node.image?.url ?? node.preview?.image?.url ?? "").trim();
  return canonicalShopifyImageUrl(raw) ?? (raw || null);
}

export function fileImageTitle(node: FileImageNode, url: string): string {
  const alt = String(node.alt ?? "").trim();
  if (alt) return alt;
  return filenameFromImageUrl(url);
}

function fileImageRow(node: FileImageNode): ImageResourceRow | null {
  if (!node.id) return null;
  const imageUrl = fileImageUrl(node);
  if (!imageUrl) return null;
  const key = imageUrlKey(imageUrl);
  return {
    id: node.id,
    title: fileImageTitle(node, imageUrl),
    imageUrl,
    status: String(node.fileStatus ?? "READY").toUpperCase(),
    urlKey: key ?? undefined,
  };
}

export function fileImageSourceRows(resource: ImageResourceRow): ResourceImageSourceRow[] {
  const url = resource.imageUrl;
  const key = url ? imageUrlKey(url) : null;
  const canonical = url ? canonicalShopifyImageUrl(url) : null;
  if (!key || !canonical) return [];
  return [{ urlKey: key, imageUrl: canonical, usedIn: [{ id: resource.id, title: resource.title }] }];
}

const PRODUCT_NODE_QUERY = `query CiwiProductImageResource($id: ID!, $after: String) {
  product(id: $id) {
    id title status descriptionHtml
    media(first: 50, after: $after) {
      nodes { ... on MediaImage { image { url } } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const ARTICLE_NODE_QUERY = `query CiwiArticleImageResource($id: ID!) {
  article(id: $id) { id title body image { url } publishedAt }
}`;

const PAGE_NODE_QUERY = `query CiwiPageImageResource($id: ID!) {
  page(id: $id) { id title body isPublished }
}`;

type ListNode = {
  id?: string;
  title?: string;
  status?: string;
  publishedAt?: string | null;
  isPublished?: boolean;
  featuredImage?: { url?: string } | null;
  image?: { url?: string } | null;
  descriptionHtml?: string | null;
  body?: string | null;
  media?: { nodes?: Array<{ image?: { url?: string } | null } | null> | null };
};

type ProductNode = {
  id?: string;
  title?: string;
  status?: string;
  descriptionHtml?: string;
  media?: {
    nodes?: Array<{ image?: { url?: string } | null }>;
    pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
  };
};

type ResourceNode = {
  id?: string;
  title?: string | null;
  descriptionHtml?: string | null;
  body?: string | null;
  image?: { url?: string | null } | null;
  media?: { nodes?: Array<{ image?: { url?: string } | null } | null> | null };
};

export function imageUrlsOfResource(node: ResourceNode): string[] {
  const urls: string[] = [];
  if (node.image?.url) urls.push(node.image.url);
  urls.push(...extractShopifyImageUrlsFromHtml(node.descriptionHtml ?? node.body));
  return urls;
}

export function productMediaUrlsOfResource(node: ResourceNode): string[] {
  const urls: string[] = [];
  for (const media of node.media?.nodes ?? []) {
    if (media?.image?.url) urls.push(media.image.url);
  }
  return urls;
}

export function sanitizeShopifySearchTerm(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/["\\:*()]/g, "");
}

export function buildResourceSearchQuery(args: {
  type: ImageResourceType;
  q?: string | null;
  status?: string | null;
}): string | null {
  const parts: string[] = [];
  const q = sanitizeShopifySearchTerm(args.q);
  const status = (args.status ?? "all").trim().toLowerCase();
  if (args.type === "collection") {
    if (q) parts.push(`title:*${q}*`);
    return parts.length ? parts.join(" ") : null;
  }
  if (args.type === "file") {
    parts.push("media_type:IMAGE");
    if (q) parts.push(`filename:*${q}*`);
    return parts.join(" ");
  }
  if (q) parts.push(`title:*${q}*`);
  if (args.type === "product") {
    if (status === "active" || status === "draft" || status === "archived" || status === "unlisted") {
      parts.push(`status:${status}`);
    }
  } else if (status === "published" || status === "unpublished") {
    parts.push(`published_status:${status}`);
  }
  return parts.length ? parts.join(" ") : null;
}

function nodeStatus(type: ImageResourceType, node: ListNode): string {
  if (type === "product") return String(node.status ?? "ACTIVE").toUpperCase();
  if (type === "page") return node.isPublished ? "PUBLISHED" : "UNPUBLISHED";
  return node.publishedAt ? "PUBLISHED" : "UNPUBLISHED";
}

export function resourceCoverImageUrl(node: ListNode): string | null {
  const featured = node.featuredImage?.url || node.image?.url || null;
  if (featured) return featured;
  return extractShopifyImageUrlsFromHtml(node.descriptionHtml ?? node.body)[0] ?? null;
}

/** 相册优先；同 urlKey 的正文图不再单列一行。 */
export function groupProductResourceImages(args: {
  productId: string;
  title: string;
  mediaUrls: string[];
  bodyUrls: string[];
}): ResourceImageSourceRow[] {
  const owner = { id: args.productId, title: args.title };
  const seen = new Set<string>();
  const rows: ResourceImageSourceRow[] = [];
  const push = (url: string, productId?: string) => {
    const key = imageUrlKey(url);
    const canonical = canonicalShopifyImageUrl(url);
    if (!key || !canonical || seen.has(key)) return;
    seen.add(key);
    rows.push({
      urlKey: key,
      imageUrl: canonical,
      usedIn: [owner],
      ...(productId ? { productId } : {}),
    });
  };
  for (const url of args.mediaUrls) push(url, args.productId);
  for (const url of args.bodyUrls) push(url);
  return rows;
}

async function graphqlJson(
  admin: AdminGraphqlClient,
  query: string,
  variables: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await admin.graphql(query, { variables });
  const body = await response.json();
  if (body?.errors?.length) {
    throw new Error(body.errors.map((e: { message?: string }) => e.message).join("; "));
  }
  return body?.data ?? {};
}

type RankedImageRow = { row: ImageResourceRow; cursor: string };

type ImageResourceFetchPage = {
  items: RankedImageRow[];
  hasNextPage: boolean;
  endCursor: string | null;
};

type ConnectionEdge<T> = { cursor?: string | null; node?: T | null };
type ShopifyConnection<T> = {
  edges?: ConnectionEdge<T>[];
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
};

function readConnection<T>(
  connection: ShopifyConnection<T> | undefined,
  toRow: (node: T) => ImageResourceRow | null,
): ImageResourceFetchPage {
  const edges = connection?.edges ?? [];
  const items: RankedImageRow[] = [];
  for (const edge of edges) {
    const cursor = edge.cursor;
    const node = edge.node;
    if (!cursor || !node) continue;
    const row = toRow(node);
    if (row) items.push({ row, cursor });
  }
  return {
    items,
    hasNextPage: Boolean(connection?.pageInfo?.hasNextPage),
    endCursor: connection?.pageInfo?.endCursor ?? edges[edges.length - 1]?.cursor ?? null,
  };
}

function productBodyImageUrls(node: ListNode): string[] {
  const urls: string[] = [];
  if (node.featuredImage?.url) urls.push(node.featuredImage.url);
  urls.push(...extractShopifyImageUrlsFromHtml(node.descriptionHtml ?? node.body));
  return urls;
}

export function countCatalogResourceImages(type: ImageResourceType, node: ListNode): number {
  if (type === "product") {
    if (!node.id) return 0;
    return groupProductResourceImages({
      productId: node.id,
      title: node.title ?? "",
      mediaUrls: productMediaUrlsOfResource(node),
      bodyUrls: productBodyImageUrls(node),
    }).length;
  }
  if (type === "article" || type === "page") {
    const keys = new Set<string>();
    for (const url of imageUrlsOfResource(node)) {
      const key = imageUrlKey(url);
      if (key) keys.add(key);
    }
    return keys.size;
  }
  return 0;
}

function catalogRow(type: ImageResourceType, node: ListNode): ImageResourceRow | null {
  if (!node.id) return null;
  const imageUrl = resourceCoverImageUrl(node);
  if (!imageUrl) return null;
  const imageCount = countCatalogResourceImages(type, node);
  return {
    id: node.id,
    title: node.title ?? "",
    imageUrl,
    status: nodeStatus(type, node),
    imageCount: imageCount > 0 ? imageCount : undefined,
  };
}

async function fetchFileImagePage(args: {
  admin: AdminGraphqlClient;
  after?: string | null;
  q?: string | null;
  leftover: LeftoverSubtract;
}): Promise<ImageResourceFetchPage> {
  try {
    const data = await graphqlJson(args.admin, FILES_LIST_QUERY, {
      first: SHOPIFY_FETCH_SIZE,
      after: args.after || null,
      query: buildResourceSearchQuery({ type: "file", q: args.q, status: "all" }),
    });
    return readConnection(data.files as ShopifyConnection<FileImageNode> | undefined, (node) => {
      const row = fileImageRow(node);
      if (!row || !isLeftoverFileRow(row, args.leftover)) return null;
      return row;
    });
  } catch (err) {
    console.warn("[contentImage] files list failed:", err);
    return { items: [], hasNextPage: false, endCursor: null };
  }
}

async function fetchImageResourcePage(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  uiLocale?: string | null;
  type: ImageResourceType;
  after?: string | null;
  q?: string | null;
  status?: string | null;
  leftoverLive?: LeftoverSubtract;
}): Promise<ImageResourceFetchPage> {
  if (args.type === "theme") {
    return fetchThemeImagePage({
      admin: args.admin,
      shop: args.shop,
      uiLocale: args.uiLocale,
      after: args.after,
      q: args.q,
    });
  }
  if (args.type === "collection") {
    return fetchCollectionImageFlatPage({
      admin: args.admin,
      shop: args.shop,
      after: args.after,
      q: args.q,
    });
  }
  if (args.type === "file") {
    return fetchFileImagePage({
      admin: args.admin,
      after: args.after,
      q: args.q,
      leftover: args.leftoverLive ?? { theme: [], collection: [] },
    });
  }
  if (args.type !== "product" && args.type !== "article" && args.type !== "page") {
    return { items: [], hasNextPage: false, endCursor: null };
  }
  const data = await graphqlJson(args.admin, LIST_QUERIES[args.type], {
    first: SHOPIFY_FETCH_SIZE,
    after: args.after || null,
    query: buildResourceSearchQuery(args),
  });
  const connection = data[CONNECTION_FIELD[args.type]] as ShopifyConnection<ListNode> | undefined;
  return readConnection(connection, (node) => catalogRow(args.type, node));
}

export async function listImageResources(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  uiLocale?: string | null;
  type: ImageResourceType;
  after?: string | null;
  q?: string | null;
  status?: string | null;
}): Promise<ImageResourcePage> {
  if (args.type === "theme") {
    const page = await fetchThemeImagePage({
      admin: args.admin,
      shop: args.shop,
      uiLocale: args.uiLocale,
      after: args.after,
      q: args.q,
    });
    return {
      rows: page.items.map((item) => item.row),
      hasNextPage: page.hasNextPage,
      endCursor: page.endCursor,
    };
  }
  if (args.type === "collection") {
    const page = await fetchCollectionImageFlatPage({
      admin: args.admin,
      shop: args.shop,
      after: args.after,
      q: args.q,
    });
    return {
      rows: page.items.map((item) => item.row),
      hasNextPage: page.hasNextPage,
      endCursor: page.endCursor,
    };
  }
  const leftoverLive =
    args.type === "file"
      ? await leftoverLiveSubtractKeys({ admin: args.admin, shop: args.shop })
      : undefined;
  const items: RankedImageRow[] = [];
  let after = args.after || null;
  let shopifyHasNext = false;
  let shopifyEnd: string | null = after;
  for (let i = 0; i < MAX_FILL_FETCHES; i += 1) {
    const page = await fetchImageResourcePage({ ...args, after, leftoverLive });
    shopifyHasNext = page.hasNextPage;
    shopifyEnd = page.endCursor;
    for (const item of page.items) {
      items.push(item);
      if (items.length > LIST_PAGE_SIZE) break;
    }
    if (items.length >= LIST_PAGE_SIZE) break;
    if (!page.hasNextPage || !page.endCursor) break;
    after = page.endCursor;
  }
  const kept = items.slice(0, LIST_PAGE_SIZE);
  return {
    rows: kept.map((item) => item.row),
    hasNextPage: items.length > LIST_PAGE_SIZE || shopifyHasNext,
    endCursor: kept[kept.length - 1]?.cursor ?? shopifyEnd,
  };
}

async function listProductMediaUrls(
  admin: AdminGraphqlClient,
  productId: string,
): Promise<{ product: ProductNode | null; mediaUrls: string[] }> {
  const urls: string[] = [];
  let after: string | null = null;
  let product: ProductNode | null = null;
  for (let page = 0; page < MEDIA_MAX_PAGES; page += 1) {
    const data = await graphqlJson(admin, PRODUCT_NODE_QUERY, { id: productId, after });
    const node = (data.product ?? null) as ProductNode | null;
    if (!node?.id) return { product: null, mediaUrls: [] };
    if (!product) product = node;
    urls.push(...productMediaUrlsOfResource(node));
    if (!node.media?.pageInfo?.hasNextPage) break;
    after = node.media.pageInfo.endCursor ?? null;
    if (!after) break;
  }
  return { product, mediaUrls: urls };
}

export async function listResourceImages(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  uiLocale?: string | null;
  type: ImageResourceType;
  resourceId: string;
}): Promise<{ resource: ImageResourceRow | null; rows: ResourceImageSourceRow[] }> {
  if (args.type === "theme") {
    return getThemeImageResource({
      admin: args.admin,
      shop: args.shop,
      uiLocale: args.uiLocale,
      resourceId: args.resourceId,
    });
  }
  if (args.type === "collection") {
    const flat = parseCollectionImageRowId(args.resourceId);
    if (flat) {
      return getCollectionImageByFlatId({
        admin: args.admin,
        collectionId: flat.collectionId,
        urlKey: flat.urlKey,
      });
    }
    return getCollectionImageResource({
      admin: args.admin,
      resourceId: shopifyResourceGid("collection", args.resourceId),
    });
  }
  const gid = shopifyResourceGid(args.type, args.resourceId);
  if (args.type === "file") {
    try {
      const data = await graphqlJson(args.admin, FILE_NODE_QUERY, { id: gid });
      const resource = fileImageRow((data.node ?? null) as FileImageNode);
      if (!resource) return { resource: null, rows: [] };
      return { resource, rows: fileImageSourceRows(resource) };
    } catch (err) {
      console.warn("[contentImage] file node failed:", err);
      return { resource: null, rows: [] };
    }
  }
  if (args.type === "product") {
    const { product, mediaUrls } = await listProductMediaUrls(args.admin, gid);
    if (!product?.id) return { resource: null, rows: [] };
    const title = product.title ?? "";
    return {
      resource: {
        id: product.id,
        title,
        imageUrl: null,
        status: String(product.status ?? "ACTIVE").toUpperCase(),
      },
      rows: groupProductResourceImages({
        productId: product.id,
        title,
        mediaUrls,
        bodyUrls: imageUrlsOfResource(product),
      }),
    };
  }
  if (args.type === "article") {
    const data = await graphqlJson(args.admin, ARTICLE_NODE_QUERY, { id: gid });
    const node = data.article as ListNode | null;
    if (!node?.id) return { resource: null, rows: [] };
    const title = node.title ?? "";
    const owner = { id: node.id, title };
    const seen = new Set<string>();
    return {
      resource: {
        id: node.id,
        title,
        imageUrl: node.image?.url ?? null,
        status: node.publishedAt ? "PUBLISHED" : "UNPUBLISHED",
      },
      rows: imageUrlsOfResource(node).flatMap((url) => {
        const key = imageUrlKey(url);
        const canonical = canonicalShopifyImageUrl(url);
        if (!key || !canonical || seen.has(key)) return [];
        seen.add(key);
        return [{ urlKey: key, imageUrl: canonical, usedIn: [owner] }];
      }),
    };
  }
  const data = await graphqlJson(args.admin, PAGE_NODE_QUERY, { id: gid });
  const node = data.page as ListNode | null;
  if (!node?.id) return { resource: null, rows: [] };
  const title = node.title ?? "";
  const owner = { id: node.id, title };
  const seen = new Set<string>();
  return {
    resource: {
      id: node.id,
      title,
      imageUrl: null,
      status: node.isPublished ? "PUBLISHED" : "UNPUBLISHED",
    },
    rows: imageUrlsOfResource(node).flatMap((url) => {
      const key = imageUrlKey(url);
      const canonical = canonicalShopifyImageUrl(url);
      if (!key || !canonical || seen.has(key)) return [];
      seen.add(key);
      return [{ urlKey: key, imageUrl: canonical, usedIn: [owner] }];
    }),
  };
}
