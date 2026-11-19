import { canonicalShopifyImageUrl, imageUrlKey } from "~/server/picture/imageUrlKey";
import {
  formatThemeImageUsedIn,
  themeImageUsedInSearchText,
  type ThemeImageUsedIn,
} from "~/lib/themeImageUsedIn";
import type { AdminGraphqlClient } from "./resourceImages.server";
import type { ImageResourceRow, ResourceImageSourceRow } from "./resourceImages.server";
import {
  defaultThemeImageRedis,
  readThemeImageCache,
  writeThemeImageCache,
  type ThemeImageCacheRedis,
} from "./themeImageCache.server";
import {
  decorateThemeLocation,
  parseSectionSchemaFile,
  parseSettingsSchemaFile,
  type ThemeSectionSchema,
} from "./themeImageSchema";
import {
  mergeThemeImageHits,
  parseThemeImageHits,
  parseThemeJsonContent,
  type ThemeImageHit,
} from "./themeImageRefs";

const THEME_JSON_GLOBS = [
  "config/settings_data.json",
  "templates/*.json",
  "templates/*/*.json",
  "sections/*.json",
  "blocks/*.json",
];

const THEME_SCHEMA_GLOBS = [
  "config/settings_schema.json",
  "sections/*.liquid",
  "blocks/*.liquid",
  "locales/*.json",
];

const THEME_JSON_PAGE_SIZE = 50;
const LIST_PAGE_SIZE = 20;
const FILES_IMAGE_KEY = /^files\/.+\.(?:jpe?g|png|gif|webp)$/i;

const THEME_JSON_FILES_QUERY = `query CiwiThemeJsonFiles($first: Int!, $after: String, $filenames: [String!]) {
  themes(first: 1, roles: [MAIN]) {
    nodes {
      id
      files(first: $first, after: $after, filenames: $filenames) {
        edges {
          cursor
          node {
            filename
            body { ... on OnlineStoreThemeFileBodyText { content } }
          }
        }
        pageInfo { hasNextPage endCursor }
      }
    }
  }
}`;

const FILE_BY_NAME_QUERY = `query CiwiThemeImageFileByName($query: String!) {
  files(first: 1, query: $query) {
    edges {
      node {
        ... on MediaImage {
          image { url }
          preview { image { url } }
        }
      }
    }
  }
}`;

const FILE_BY_ID_QUERY = `query CiwiThemeImageFileById($id: ID!) {
  node(id: $id) {
    ... on MediaImage {
      image { url }
      preview { image { url } }
    }
  }
}`;

type ThemeFileBody = { content?: string | null } | null;
type ThemeFileNode = { filename?: string | null; body?: ThemeFileBody };
type ThemeFilesConnection = {
  edges?: Array<{ cursor?: string | null; node?: ThemeFileNode | null }>;
  pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
};
type MediaImageNode = {
  image?: { url?: string | null } | null;
  preview?: { image?: { url?: string | null } | null } | null;
};

export type ThemeImageFetchPage = {
  items: Array<{ row: ImageResourceRow; cursor: string }>;
  hasNextPage: boolean;
  endCursor: string | null;
};

export function resolveThemeImageResourceId(resourceId: string): string | null {
  let raw = resourceId.trim();
  try {
    raw = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  const name = raw.replace(/^\/+/, "");
  return FILES_IMAGE_KEY.test(name) ? name : null;
}

function mediaImageUrl(node: MediaImageNode | null | undefined): string | null {
  const raw = String(node?.image?.url ?? node?.preview?.image?.url ?? "").trim();
  return canonicalShopifyImageUrl(raw);
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

function filesConnection(data: Record<string, unknown>): ThemeFilesConnection | undefined {
  const themes = data.themes as { nodes?: Array<{ files?: ThemeFilesConnection }> } | undefined;
  return themes?.nodes?.[0]?.files;
}

function isThemeJsonTemplate(filename: string): boolean {
  const name = filename.replace(/^\/+/, "");
  if (name === "config/settings_data.json") return true;
  if (name.startsWith("templates/") && name.endsWith(".json")) return true;
  if (name.startsWith("blocks/") && name.endsWith(".json")) return true;
  return name.startsWith("sections/") && name.endsWith(".json");
}

function parseThemeFileHits(filename: string, content: string): ThemeImageHit[] {
  try {
    return parseThemeImageHits(filename, parseThemeJsonContent(content));
  } catch (err) {
    console.warn("[contentImage] theme json parse failed:", filename, err);
    return [];
  }
}

function parseLocaleJson(filename: string, content: string): Record<string, unknown> | null {
  if (!filename.replace(/^\/+/, "").startsWith("locales/") || !filename.endsWith(".json")) return null;
  try {
    const parsed = parseThemeJsonContent(content) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

type ThemeScanBundle = {
  hits: ThemeImageHit[];
  schemas: Map<string, ThemeSectionSchema>;
  settingLabels: Record<string, string>;
};

function absorbThemeFile(
  filename: string,
  content: string,
  bundle: ThemeScanBundle,
  locales: Array<Record<string, unknown>>,
): void {
  const name = filename.replace(/^\/+/, "");
  if (isThemeJsonTemplate(name)) {
    bundle.hits.push(...parseThemeFileHits(name, content));
    return;
  }
  if (name === "config/settings_schema.json") {
    Object.assign(bundle.settingLabels, parseSettingsSchemaFile(content, locales));
    return;
  }
  const schema = parseSectionSchemaFile(name, content, locales);
  if (schema) bundle.schemas.set(schema.type, schema);
}

async function loadThemeFiles(
  admin: AdminGraphqlClient,
  filenames: string[],
): Promise<Array<{ filename: string; content: string }> | null> {
  const files: Array<{ filename: string; content: string }> = [];
  let after: string | null = null;
  for (;;) {
    const data = await graphqlJson(admin, THEME_JSON_FILES_QUERY, {
      first: THEME_JSON_PAGE_SIZE,
      after,
      filenames,
    });
    const connection = filesConnection(data);
    if (!connection) return files.length ? files : null;
    for (const edge of connection.edges ?? []) {
      const filename = String(edge.node?.filename ?? "").trim();
      const content = String(edge.node?.body?.content ?? "").trim();
      if (filename && content) files.push({ filename, content });
    }
    if (!connection.pageInfo?.hasNextPage || !connection.pageInfo.endCursor) break;
    after = connection.pageInfo.endCursor;
  }
  return files;
}

async function loadThemeScanBundle(admin: AdminGraphqlClient): Promise<ThemeScanBundle | null> {
  const jsonFiles = await loadThemeFiles(admin, THEME_JSON_GLOBS);
  if (!jsonFiles) return null;
  const schemaFiles = (await loadThemeFiles(admin, THEME_SCHEMA_GLOBS)) ?? [];
  const files = [...jsonFiles, ...schemaFiles];
  const localeTrees = files
    .map((file) => ({
      name: file.filename.replace(/^\/+/, "").toLowerCase(),
      json: parseLocaleJson(file.filename, file.content),
    }))
    .filter((item): item is { name: string; json: Record<string, unknown> } => Boolean(item.json))
    .sort((a, b) => Number(a.name.includes("en.default")) * -1 + Number(b.name.includes("en.default")))
    .map((item) => item.json);
  const bundle: ThemeScanBundle = { hits: [], schemas: new Map(), settingLabels: {} };
  for (const file of files) absorbThemeFile(file.filename, file.content, bundle, localeTrees);
  bundle.hits = mergeThemeImageHits(bundle.hits);
  return bundle;
}

function escapeFileQuery(filename: string): string {
  return filename.replace(/["\\]/g, "");
}

async function resolveHitUrl(admin: AdminGraphqlClient, hit: ThemeImageHit): Promise<string | null> {
  try {
    if (hit.mediaGid) {
      const data = await graphqlJson(admin, FILE_BY_ID_QUERY, { id: hit.mediaGid });
      return mediaImageUrl(data.node as MediaImageNode | null);
    }
    if (!hit.filename) return null;
    const data = await graphqlJson(admin, FILE_BY_NAME_QUERY, {
      query: `filename:"${escapeFileQuery(hit.filename)}"`,
    });
    const files = data.files as { edges?: Array<{ node?: MediaImageNode | null }> } | undefined;
    return mediaImageUrl(files?.edges?.[0]?.node);
  } catch (err) {
    console.warn("[contentImage] theme image resolve failed:", hit.ref, err);
    return null;
  }
}

function usedInFromHit(
  hit: ThemeImageHit,
  bundle: ThemeScanBundle,
): ThemeImageUsedIn[] {
  return hit.locations.map((loc) =>
    decorateThemeLocation(loc, {
      schemas: bundle.schemas,
      settingLabels: bundle.settingLabels,
    }),
  );
}

function localizeThemeRows(rows: ImageResourceRow[], locale?: string | null): ImageResourceRow[] {
  if (!locale) return rows;
  return rows.map((row) => ({
    ...row,
    usedIn: (row.usedIn ?? []).map((item) => ({
      ...item,
      title: formatThemeImageUsedIn(item, locale),
    })),
  }));
}

function mergeUsedIn(
  current: NonNullable<ImageResourceRow["usedIn"]>,
  extra: NonNullable<ImageResourceRow["usedIn"]>,
): NonNullable<ImageResourceRow["usedIn"]> {
  const next = [...current];
  for (const item of extra) {
    if (!next.some((row) => row.id === item.id)) next.push(item);
  }
  return next;
}

async function scanThemeImageRows(admin: AdminGraphqlClient): Promise<ImageResourceRow[]> {
  const bundle = await loadThemeScanBundle(admin);
  if (!bundle) return [];
  const byKey = new Map<string, ImageResourceRow>();
  for (const hit of bundle.hits) {
    const imageUrl = await resolveHitUrl(admin, hit);
    const urlKey = imageUrl ? imageUrlKey(imageUrl) : null;
    if (!imageUrl || !urlKey || !urlKey.startsWith("files/")) continue;
    const usedIn = usedInFromHit(hit, bundle);
    const existing = byKey.get(urlKey);
    if (existing) {
      existing.usedIn = mergeUsedIn(existing.usedIn ?? [], usedIn);
      continue;
    }
    byKey.set(urlKey, {
      id: urlKey,
      title: urlKey.split("/").pop() || urlKey,
      imageUrl,
      status: "READY",
      usedIn,
    });
  }
  return [...byKey.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function listThemeImageRows(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  redis?: ThemeImageCacheRedis | null;
}): Promise<ImageResourceRow[]> {
  const shop = args.shop?.trim() || "";
  const redis = args.redis === undefined ? await defaultThemeImageRedis() : args.redis;
  const cached = shop ? await readThemeImageCache(shop, redis) : null;
  if (cached) return cached;
  const rows = await scanThemeImageRows(args.admin);
  if (shop && rows.length) await writeThemeImageCache(shop, rows, redis);
  return rows;
}

function matchesSearch(row: ImageResourceRow, q?: string | null): boolean {
  const term = String(q ?? "").trim().toLowerCase();
  if (!term) return true;
  if (row.id.toLowerCase().includes(term) || row.title.toLowerCase().includes(term)) return true;
  return (row.usedIn ?? []).some((item) => themeImageUsedInSearchText(item).includes(term));
}

function sliceThemeRows(rows: ImageResourceRow[], after?: string | null, first = LIST_PAGE_SIZE): ThemeImageFetchPage {
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

export async function listThemeImageUrlKeys(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  redis?: ThemeImageCacheRedis | null;
}): Promise<string[]> {
  return (await listThemeImageRows(args)).map((row) => row.id);
}

export async function fetchThemeImagePage(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  uiLocale?: string | null;
  redis?: ThemeImageCacheRedis | null;
  after?: string | null;
  q?: string | null;
  first?: number;
}): Promise<ThemeImageFetchPage> {
  try {
    const rows = localizeThemeRows(
      await listThemeImageRows(args),
      args.uiLocale,
    ).filter((row) => matchesSearch(row, args.q));
    return sliceThemeRows(rows, args.after, args.first ?? LIST_PAGE_SIZE);
  } catch (err) {
    console.warn("[contentImage] theme json list failed:", err);
    return { items: [], hasNextPage: false, endCursor: null };
  }
}

export function themeImageSourceRows(resource: ImageResourceRow): ResourceImageSourceRow[] {
  const url = resource.imageUrl;
  if (!url || !resolveThemeImageResourceId(resource.id)) return [];
  return [{ urlKey: resource.id, imageUrl: url, usedIn: resource.usedIn ?? [] }];
}

export async function getThemeImageResource(args: {
  admin: AdminGraphqlClient;
  shop?: string | null;
  uiLocale?: string | null;
  redis?: ThemeImageCacheRedis | null;
  resourceId: string;
}): Promise<{ resource: ImageResourceRow | null; rows: ResourceImageSourceRow[] }> {
  const id = resolveThemeImageResourceId(args.resourceId);
  if (!id) return { resource: null, rows: [] };
  try {
    const resource =
      localizeThemeRows(await listThemeImageRows(args), args.uiLocale).find((row) => row.id === id) ??
      null;
    if (!resource) return { resource: null, rows: [] };
    return { resource, rows: themeImageSourceRows(resource) };
  } catch (err) {
    console.warn("[contentImage] theme image resource failed:", err);
    return { resource: null, rows: [] };
  }
}
