import prisma from "~/db.server";
import { contentImageId } from "~/lib/contentPicture";
import {
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
} from "~/lib/imageResourcePaths";
import {
  SWITCHER_IMAGE_PAGE_SIZE,
  displaySwitcherPagePath,
  matchesSwitcherPageSearch,
  normalizeSwitcherPageSearch,
  summarizeSwitcherPages,
} from "~/lib/shopLocale";
import { listPicturesByUrlKeys } from "~/server/picture/picture.server";
import { CONTENT_IMAGE_JOB_MAX_ITEMS } from "./contentImageJobs.server";

export { SWITCHER_IMAGE_PAGE_SIZE };

export type ShopLocaleOption = {
  locale: string;
  name: string;
  primary: boolean;
  published?: boolean;
};

export async function loadAdminShopLocales(admin: {
  graphql: (query: string) => Promise<Response>;
}): Promise<ShopLocaleOption[]> {
  const response = await admin.graphql(`query ShopLocales {
    shopLocales { locale name primary published }
  }`);
  const data = (await response.json()) as {
    data?: { shopLocales?: Array<Partial<ShopLocaleOption> | null> };
  };
  const rows = Array.isArray(data?.data?.shopLocales) ? data.data.shopLocales : [];
  return rows.flatMap((row) => {
    const locale = String(row?.locale ?? "").trim();
    if (!locale) return [];
    return [{
      locale,
      name: String(row?.name || locale),
      primary: Boolean(row?.primary),
      published: row?.published,
    }];
  });
}

export async function listSwitcherPages(args: {
  shop: string;
  languageCode: string;
  q?: string | null;
  after?: string | null;
  take?: number;
  locales?: readonly string[];
  primaryLocale?: string;
}) {
  const take = Math.min(args.take ?? SWITCHER_IMAGE_PAGE_SIZE, 200);
  const skip = Math.max(0, Number.parseInt(args.after ?? "", 10) || 0);
  const targetCode = args.languageCode.trim();
  if (!targetCode) {
    return { rows: [], hasNextPage: false, endCursor: null as string | null };
  }
  const locales = args.locales ?? [];
  const primaryLocale = args.primaryLocale ?? "";
  const q = normalizeSwitcherPageSearch(args.q);
  const groups = await prisma.switcherImagePage.groupBy({
    by: ["pagePath"],
    where: { shop: args.shop, targetCode },
    _max: { lastSeenAt: true },
  });
  const ordered = groups
    .filter((row) => {
      if (!q) return true;
      const displayPath = displaySwitcherPagePath(
        row.pagePath,
        targetCode,
        locales,
        primaryLocale,
      );
      return matchesSwitcherPageSearch(row.pagePath, displayPath, q);
    })
    .sort((a, b) => {
      const byTime = (b._max.lastSeenAt?.getTime() ?? 0) - (a._max.lastSeenAt?.getTime() ?? 0);
      return byTime !== 0 ? byTime : a.pagePath.localeCompare(b.pagePath);
    });
  const pageGroups = ordered.slice(skip, skip + take + 1);
  const hasNextPage = pageGroups.length > take;
  const visible = pageGroups.slice(0, take);
  const pagePaths = visible.map((row) => row.pagePath);
  if (pagePaths.length === 0) {
    return { rows: [], hasNextPage: false, endCursor: null as string | null };
  }
  const links = await prisma.switcherImagePage.findMany({
    where: { shop: args.shop, targetCode, pagePath: { in: pagePaths } },
    select: { pagePath: true, urlKey: true, lastSeenAt: true },
  });
  const images = await prisma.switcherImage.findMany({
    where: { shop: args.shop, urlKey: { in: [...new Set(links.map((row) => row.urlKey))] } },
    select: { urlKey: true, imageBeforeUrl: true },
  });
  const imageByKey = new Map(images.map((row) => [row.urlKey, row]));
  const pics = await listPicturesByUrlKeys({
    shop: args.shop,
    languageCode: targetCode,
    urlKeys: images.map((row) => row.urlKey),
  });
  const translatedKeys = new Set(
    pics.filter((pic) => pic.imageAfterUrl && pic.urlKey).map((pic) => pic.urlKey as string),
  );
  const summaries = summarizeSwitcherPages(
    links.flatMap((link) => {
      const image = imageByKey.get(link.urlKey);
      if (!image) return [];
      return [{
        pagePath: link.pagePath,
        urlKey: link.urlKey,
        imageBeforeUrl: image.imageBeforeUrl,
        lastSeenAt: link.lastSeenAt,
      }];
    }),
    translatedKeys,
  );
  const byPath = new Map(summaries.map((row) => [row.pagePath, row]));
  return {
    rows: pagePaths.flatMap((path) => {
      const row = byPath.get(path);
      if (!row) return [];
      return [{
        ...row,
        displayPath: displaySwitcherPagePath(row.pagePath, targetCode, locales, primaryLocale),
      }];
    }),
    hasNextPage,
    endCursor: hasNextPage ? String(skip + take) : null,
  };
}

export async function listSwitcherImages(args: {
  shop: string;
  languageCode: string;
  pagePath: string;
}) {
  const targetCode = args.languageCode.trim();
  const pagePath = args.pagePath.trim();
  if (!targetCode || !pagePath) return [];
  const links = await prisma.switcherImagePage.findMany({
    where: { shop: args.shop, targetCode, pagePath },
    orderBy: [{ lastSeenAt: "desc" }, { urlKey: "desc" }],
  });
  const uniqueKeys: string[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    if (seen.has(link.urlKey)) continue;
    seen.add(link.urlKey);
    uniqueKeys.push(link.urlKey);
  }
  if (uniqueKeys.length === 0) return [];
  const images = await prisma.switcherImage.findMany({
    where: { shop: args.shop, urlKey: { in: uniqueKeys } },
  });
  const imageByKey = new Map(images.map((row) => [row.urlKey, row]));
  const pics = await listPicturesByUrlKeys({
    shop: args.shop,
    languageCode: targetCode,
    urlKeys: uniqueKeys,
  });
  const byKey = new Map(pics.map((pic) => [pic.urlKey, pic]));
  return uniqueKeys.flatMap((urlKey) => {
    const image = imageByKey.get(urlKey);
    if (!image) return [];
    const pic = byKey.get(urlKey);
    return [{
      urlKey,
      imageId: contentImageId(urlKey),
      imageBeforeUrl: image.imageBeforeUrl,
      imageAfterUrl: pic?.imageAfterUrl ?? null,
      translated: Boolean(pic?.imageAfterUrl),
      lastSeenAt: links.find((link) => link.urlKey === urlKey)?.lastSeenAt ?? image.lastSeenAt,
    }];
  });
}

function parsePagePaths(args: { pagePath?: string; pagePaths?: string[] }): string[] {
  const raw = args.pagePaths?.length ? args.pagePaths : args.pagePath ? [args.pagePath] : [];
  return [...new Set(raw.map((path) => path.trim()).filter(Boolean))].slice(
    0,
    IMAGE_RESOURCE_BULK_SELECT_MAX,
  );
}

export async function listSwitcherImagesBatch(args: {
  shop: string;
  languageCode: string;
  q?: string;
  pagePath?: string;
  pagePaths?: string[];
  take?: number;
  capItems?: boolean;
}) {
  const pagePaths = parsePagePaths(args);
  const requestedCount = (args.pagePaths?.length ? args.pagePaths : args.pagePath ? [args.pagePath] : [])
    .map((path) => path.trim())
    .filter(Boolean).length;
  const targetCode = args.languageCode.trim();
  if (pagePaths.length === 0 || !targetCode) {
    return { rows: [], truncated: isResourceImagesBatchTruncated(requestedCount, false) };
  }
  const take = Math.min(args.take ?? 200, args.capItems ? CONTENT_IMAGE_JOB_MAX_ITEMS : 200);
  const q = args.q?.trim().toLowerCase();
  const links = await prisma.switcherImagePage.findMany({
    where: { shop: args.shop, targetCode, pagePath: { in: pagePaths } },
    orderBy: [{ lastSeenAt: "desc" }, { urlKey: "desc" }],
  });
  const uniqueKeys: string[] = [];
  const seen = new Set<string>();
  for (const link of links) {
    if (seen.has(link.urlKey)) continue;
    seen.add(link.urlKey);
    uniqueKeys.push(link.urlKey);
  }
  const truncated = uniqueKeys.length > take || requestedCount > IMAGE_RESOURCE_BULK_SELECT_MAX;
  const keys = uniqueKeys.slice(0, take);
  const images = await prisma.switcherImage.findMany({
    where: { shop: args.shop, urlKey: { in: keys } },
  });
  const imageByKey = new Map(images.map((row) => [row.urlKey, row]));
  const pageByKey = new Map(links.map((row) => [row.urlKey, row.pagePath]));
  const pics = await listPicturesByUrlKeys({
    shop: args.shop,
    languageCode: targetCode,
    urlKeys: keys,
  });
  const byKey = new Map(pics.map((pic) => [pic.urlKey, pic]));
  const rows = keys.flatMap((urlKey) => {
    const image = imageByKey.get(urlKey);
    if (!image) return [];
    const pic = byKey.get(urlKey);
    const imageUrl = image.imageBeforeUrl;
    if (q && !urlKey.toLowerCase().includes(q) && !imageUrl.toLowerCase().includes(q)) {
      return [];
    }
    return [{
      urlKey,
      imageUrl,
      usedIn: pageByKey.get(urlKey) ? [{ id: pageByKey.get(urlKey)!, title: pageByKey.get(urlKey)! }] : [],
      translated: pic?.imageAfterUrl
        ? {
            imageId: pic.imageId,
            imageBeforeUrl: pic.imageBeforeUrl,
            imageAfterUrl: pic.imageAfterUrl,
            urlKey: pic.urlKey,
          }
        : null,
    }];
  });
  return { rows, truncated };
}

export async function getSwitcherImage(shop: string, urlKey: string) {
  return prisma.switcherImage.findUnique({
    where: { shop_urlKey: { shop, urlKey } },
  });
}

/** 旧单图 URL 没有 pagePath 时，用采集记录找回 L2 路径。 */
export async function resolveSwitcherImagePagePath(
  shop: string,
  urlKey: string,
  language?: string | null,
): Promise<string | null> {
  const key = urlKey.trim();
  if (!key) return null;
  const image = await prisma.switcherImage.findUnique({
    where: { shop_urlKey: { shop, urlKey: key } },
    select: { lastPagePath: true },
  });
  if (image?.lastPagePath?.trim()) return image.lastPagePath.trim();
  const locale = language?.trim();
  const page = await prisma.switcherImagePage.findFirst({
    where: {
      shop,
      urlKey: key,
      ...(locale ? { targetCode: locale } : {}),
    },
    orderBy: { lastSeenAt: "desc" },
    select: { pagePath: true },
  });
  if (page?.pagePath?.trim()) return page.pagePath.trim();
  if (!locale) return null;
  const anyPage = await prisma.switcherImagePage.findFirst({
    where: { shop, urlKey: key },
    orderBy: { lastSeenAt: "desc" },
    select: { pagePath: true },
  });
  return anyPage?.pagePath?.trim() || null;
}
