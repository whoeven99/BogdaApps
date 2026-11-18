import {
  canonicalShopifyImageUrl,
  extractShopifyImageUrlsFromHtml,
  imageUrlKey,
} from "~/server/picture/imageUrlKey";
import type { ThemeImageUsedIn } from "~/lib/themeImageUsedIn";
import type { AdminGraphqlClient, ImageResourceRow, ResourceImageSourceRow } from "./resourceImages.server";
import {
  defaultThemeImageRedis,
  type ThemeImageCacheRedis,
} from "./themeImageCache.server";

const SHOPIFY_FETCH_SIZE = 50;
const MAX_KEY_PAGES = 40;
const COLLECTION_KEYS_TTL_SEC = 180;
const COLLECTION_FLAT_TTL_SEC = 180;
const LIST_PAGE_SIZE = 20;
const CACHE_VERSION = "v1";
const FLAT_CACHE_VERSION = "v1";

const COLLECTIONS_LIST_QUERY = `query CiwiImageResourcesCollections($first: Int!, $after: String, $query: String) {
  collections(first: $first, after: $after, query: $query) {
    edges {
      cursor
      node { id title handle image { url } descriptionHtml }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

const COLLECTION_NODE_QUERY = `query CiwiCollectionImageResource($id: ID!) {
  collection(id: $id) { id title handle image { url } descriptionHtml }
}`;

type CollectionNode = {
  id?: string;
  title?: string;
  handle?: string;
  image?: { url?: string | null } | null;
  descriptionHtml?: string | null;
};

type ConnectionEdge<T> = { cursor?: string | null; node?: T | null };
type ShopifyConnection<T> = {
  edges?: ConnectionEdge<T>[];
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
};

export type CollectionImageSourceInput = {
  id: string;
  title: string;
  imageUrl?: string | null;
  descriptionHtml?: string | null;
};

function collectionKeysCacheKey(shop: string): string {
  return `img:collection-image-keys:${CACHE_VERSION}:${shop.trim()}`;
}

function collectionFlatCacheKey(shop: string): string {
  return `img:collection-image-flat:${FLAT_CACHE_VERSION}:${shop.trim()}`;
}

export function encodeCollectionImageRowId(collectionId: string, urlKey: string): string {
  return `${collectionId}|${urlKey}`;
}

export function parseCollectionImageRowId(
  id: string,
): { collectionId: string; urlKey: string } | null {
  const trimmed = id.trim();
  const sep = trimmed.indexOf("|");
  if (sep <= 0) return null;
  const collectionId = trimmed.slice(0, sep).trim();
  const urlKey = trimmed.slice(sep + 1).trim();
  if (!collectionId || !urlKey) return null;
  return { collectionId, urlKey };
}

function filenameFromImageUrl(url: string): string {
  const path = String(url ?? "").split(/[?#]/)[0] ?? "";
  const name = path.split("/").pop() ?? "";
  try {
    return decodeURIComponent(name) || name;
  } catch {
    return name;
  }
}

function collectionFlatRow(
  src: ResourceImageSourceRow,
  featuredUrlKey: string | null,
): ImageResourceRow {
  const owner = src.usedIn[0];
  const field = featuredUrlKey && src.urlKey === featuredUrlKey ? "featured" : "description";
  const usedIn: ThemeImageUsedIn[] = owner
    ? [{ id: owner.id, title: owner.title, pageKey: "collection", field }]
    : [];
  return {
    id: encodeCollectionImageRowId(owner?.id ?? src.urlKey, src.urlKey),
    title: filenameFromImageUrl(src.imageUrl),
    imageUrl: src.imageUrl,
    status: "READY",
    urlKey: src.urlKey,
    usedIn,
  };
}

function matchesCollectionFlatSearch(row: ImageResourceRow, q?: string | null): boolean {
  const term = String(q ?? "").trim().toLowerCase();
  if (!term) return true;
  if (row.id.toLowerCase().includes(term) || row.title.toLowerCase().includes(term)) return true;
  return (row.usedIn ?? []).some((item) => (item.title || "").toLowerCase().includes(term));
}

type CollectionFlatFetchPage = {
  items: Array<{ row: ImageResourceRow; cursor: string }>;
  hasNextPage: boolean;
  endCursor: string | null;
};

function sliceCollectionFlatRows(
  rows: ImageResourceRow[],
  after?: string | null,
  first = LIST_PAGE_SIZE,
): CollectionFlatFetchPage {
  let start = 0;
  if (after) {
    const exact = rows.findIndex((row) => row.id === after);
    start = exact >= 0 ? exact + 1 : rows.findIndex((row) => row.id.localeCompare(after) > 0);
    if (start < 0) start = rows.length;
  }
  const page = rows.slice(start, start + first);
  return {
    items: page.map((row) => ({ row, cursor: row.id })),
    hasNextPage: start + page.length < rows.length,
    endCursor: page.at(-1)?.id ?? null,
  };
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

export function collectionImageSourceRows(input: CollectionImageSourceInput): ResourceImageSourceRow[] {
  const owner = { id: input.id, title: input.title };
  const seen = new Set<string>();
  const rows: ResourceImageSourceRow[] = [];
  const push = (url: string | null | undefined) => {
    const raw = String(url ?? "").trim();
    if (!raw) return;
    const key = imageUrlKey(raw);
    const canonical = canonicalShopifyImageUrl(raw);
    if (!key || !canonical || seen.has(key)) return;
    seen.add(key);
    rows.push({ urlKey: key, imageUrl: canonical, usedIn: [owner] });
  };
  push(input.imageUrl);
  for (const url of extractShopifyImageUrlsFromHtml(input.descriptionHtml ?? "")) push(url);
  return rows;
}

async function scanCollectionImageFlatRows(admin: AdminGraphqlClient): Promise<ImageResourceRow[]> {
  const rows: ImageResourceRow[] = [];
  let after: string | null = null;
  for (let page = 0; page < MAX_KEY_PAGES; page += 1) {
    const data = await graphqlJson(admin, COLLECTIONS_LIST_QUERY, {
      first: SHOPIFY_FETCH_SIZE,
      after,
      query: null,
    });
    const connection = data.collections as ShopifyConnection<CollectionNode> | undefined;
    for (const edge of connection?.edges ?? []) {
      const node = edge.node;
      if (!node?.id) continue;
      const featuredKey = node.image?.url ? imageUrlKey(node.image.url) : null;
      for (const src of collectionImageSourceRows({
        id: node.id,
        title: node.title ?? node.handle ?? node.id,
        imageUrl: node.image?.url,
        descriptionHtml: node.descriptionHtml,
      })) {
        rows.push(collectionFlatRow(src, featuredKey));
      }
    }
    if (!connection?.pageInfo?.hasNextPage) break;
    after = connection.pageInfo.endCursor ?? null;
    if (!after) break;
  }
  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

export async function listCollectionImageFlatRows(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  redis?: ThemeImageCacheRedis | null;
}): Promise<ImageResourceRow[]> {
  const shop = args.shop?.trim() || "";
  const redis = args.redis === undefined ? await defaultThemeImageRedis() : args.redis;
  if (shop && redis) {
    try {
      const raw = await redis.get(collectionFlatCacheKey(shop));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) return parsed as ImageResourceRow[];
      }
    } catch {
      /* miss */
    }
  }
  try {
    const rows = await scanCollectionImageFlatRows(args.admin);
    if (shop && redis && rows.length) {
      await redis.set(collectionFlatCacheKey(shop), JSON.stringify(rows), "EX", COLLECTION_FLAT_TTL_SEC);
    }
    return rows;
  } catch (err) {
    console.warn("[contentImage] collection flat scan failed:", err);
    return [];
  }
}

export async function fetchCollectionImageFlatPage(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  after?: string | null;
  q?: string | null;
  first?: number;
}): Promise<CollectionFlatFetchPage> {
  try {
    const rows = (await listCollectionImageFlatRows(args)).filter((row) =>
      matchesCollectionFlatSearch(row, args.q),
    );
    return sliceCollectionFlatRows(rows, args.after, args.first ?? LIST_PAGE_SIZE);
  } catch (err) {
    console.warn("[contentImage] collection flat list failed:", err);
    return { items: [], hasNextPage: false, endCursor: null };
  }
}

export async function getCollectionImageByFlatId(args: {
  admin: AdminGraphqlClient;
  collectionId: string;
  urlKey: string;
}): Promise<{ resource: ImageResourceRow | null; rows: ResourceImageSourceRow[] }> {
  try {
    const data = await graphqlJson(args.admin, COLLECTION_NODE_QUERY, { id: args.collectionId });
    const node = (data.collection ?? null) as CollectionNode | null;
    if (!node?.id) return { resource: null, rows: [] };
    const featuredKey = node.image?.url ? imageUrlKey(node.image.url) : null;
    const sources = collectionImageSourceRows({
      id: node.id,
      title: node.title ?? node.handle ?? node.id,
      imageUrl: node.image?.url,
      descriptionHtml: node.descriptionHtml,
    });
    const match = sources.find((row) => row.urlKey === args.urlKey);
    if (!match) return { resource: null, rows: [] };
    return { resource: collectionFlatRow(match, featuredKey), rows: [match] };
  } catch (err) {
    console.warn("[contentImage] collection flat resource failed:", err);
    return { resource: null, rows: [] };
  }
}

export async function getCollectionImageResource(args: {
  admin: AdminGraphqlClient;
  resourceId: string;
}): Promise<{ resource: ImageResourceRow | null; rows: ResourceImageSourceRow[] }> {
  try {
    const data = await graphqlJson(args.admin, COLLECTION_NODE_QUERY, { id: args.resourceId });
    const node = (data.collection ?? null) as CollectionNode | null;
    if (!node?.id) return { resource: null, rows: [] };
    const rows = collectionImageSourceRows({
      id: node.id,
      title: node.title ?? node.handle ?? node.id,
      imageUrl: node.image?.url,
      descriptionHtml: node.descriptionHtml,
    });
    if (!rows.length) return { resource: null, rows: [] };
    return {
      resource: {
        id: node.id,
        title: node.title ?? node.handle ?? node.id,
        imageUrl: rows[0]?.imageUrl ?? null,
        status: "READY",
      },
      rows,
    };
  } catch (err) {
    console.warn("[contentImage] collection node failed:", err);
    return { resource: null, rows: [] };
  }
}

async function scanCollectionImageUrlKeys(admin: AdminGraphqlClient): Promise<string[]> {
  const keys = new Set<string>();
  let after: string | null = null;
  for (let page = 0; page < MAX_KEY_PAGES; page += 1) {
    const data = await graphqlJson(admin, COLLECTIONS_LIST_QUERY, {
      first: SHOPIFY_FETCH_SIZE,
      after,
      query: null,
    });
    const connection = data.collections as ShopifyConnection<CollectionNode> | undefined;
    for (const edge of connection?.edges ?? []) {
      const node = edge.node;
      if (!node?.id) continue;
      for (const row of collectionImageSourceRows({
        id: node.id,
        title: node.title ?? "",
        imageUrl: node.image?.url,
        descriptionHtml: node.descriptionHtml,
      })) {
        keys.add(row.urlKey);
      }
    }
    if (!connection?.pageInfo?.hasNextPage) break;
    after = connection.pageInfo.endCursor ?? null;
    if (!after) break;
  }
  return [...keys];
}

export async function listCollectionImageUrlKeys(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  redis?: ThemeImageCacheRedis | null;
}): Promise<string[]> {
  const shop = args.shop?.trim() || "";
  const redis = args.redis === undefined ? await defaultThemeImageRedis() : args.redis;
  if (shop && redis) {
    try {
      const raw = await redis.get(collectionKeysCacheKey(shop));
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
          return parsed as string[];
        }
      }
    } catch {
      /* miss */
    }
  }
  try {
    const keys = await scanCollectionImageUrlKeys(args.admin);
    if (shop && redis && keys.length) {
      await redis.set(collectionKeysCacheKey(shop), JSON.stringify(keys), "EX", COLLECTION_KEYS_TTL_SEC);
    }
    return keys;
  } catch (err) {
    console.warn("[contentImage] collection urlKey scan failed:", err);
    return [];
  }
}
