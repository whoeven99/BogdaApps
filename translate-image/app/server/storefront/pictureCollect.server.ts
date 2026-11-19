import { randomUUID } from "node:crypto";
import prisma from "~/db.server";
import { resolveCollectTargetCode, stripShopLocalePrefix } from "~/lib/shopLocale";
import {
  buildSwitcherImageOnConflictInsertSql,
  isSwitcherImageUniqueConstraint,
  normalizeSwitcherCollectInput,
  planSwitcherCollectWrites,
  resolveSwitcherImageTotalCap,
  shouldWriteSwitcherImagePage,
  switcherImageCapOverflow,
  switcherImageOnConflictBindValues,
  type SwitcherImageCollectItem,
} from "./pictureCollect.normalize";
import { loadCachedShopLocales } from "./shopLocalesCache.server";

export type SwitcherCollectResult = {
  accepted: true;
  inserted: number;
  updated: number;
  skipped: number;
  total: number;
};

async function insertNewSwitcherImages(args: {
  shop: string;
  toInsert: SwitcherImageCollectItem[];
  pagePath: string | null;
  now: Date;
}): Promise<void> {
  const { shop, toInsert, pagePath, now } = args;
  if (!toInsert.length) return;
  const ids = toInsert.map(() => randomUUID());
  const nowIso = now.toISOString();
  const sql = buildSwitcherImageOnConflictInsertSql(toInsert.length);
  const binds = switcherImageOnConflictBindValues({
    shop,
    items: toInsert,
    pagePath,
    nowIso,
    ids,
  });
  try {
    await prisma.$executeRawUnsafe(sql, ...binds);
  } catch (err) {
    if (!isSwitcherImageUniqueConstraint(err)) throw err;
  }
}

async function evictOldestSwitcherImagesOverCap(args: {
  shop: string;
  cap: number;
}): Promise<number> {
  const total = await prisma.switcherImage.count({ where: { shop: args.shop } });
  const overflow = switcherImageCapOverflow(total, args.cap);
  if (overflow <= 0) return total;
  const oldest = await prisma.switcherImage.findMany({
    where: { shop: args.shop },
    orderBy: [{ lastSeenAt: "asc" }, { id: "asc" }],
    take: overflow,
    select: { id: true, urlKey: true },
  });
  if (!oldest.length) return total;
  const ids = oldest.map((row) => row.id);
  const urlKeys = oldest.map((row) => row.urlKey);
  await prisma.$transaction([
    prisma.switcherImagePage.deleteMany({
      where: { shop: args.shop, urlKey: { in: urlKeys } },
    }),
    prisma.switcherImage.deleteMany({ where: { id: { in: ids } } }),
  ]);
  return total - oldest.length;
}

async function upsertSwitcherImagePages(args: {
  shop: string;
  urlKeys: string[];
  pagePath: string;
  targetCode: string;
  now: Date;
}): Promise<void> {
  if (args.urlKeys.length === 0) return;
  await prisma.$transaction(
    args.urlKeys.map((urlKey) =>
      prisma.switcherImagePage.upsert({
        where: {
          shop_urlKey_pagePath_targetCode: {
            shop: args.shop,
            urlKey,
            pagePath: args.pagePath,
            targetCode: args.targetCode,
          },
        },
        create: {
          id: randomUUID(),
          shop: args.shop,
          urlKey,
          pagePath: args.pagePath,
          targetCode: args.targetCode,
          lastSeenAt: args.now,
        },
        update: { lastSeenAt: args.now },
      }),
    ),
  );
}

export async function collectSwitcherImages(args: {
  shop: string;
  images: unknown;
  pagePath?: unknown;
  languageCode?: unknown;
}): Promise<SwitcherCollectResult> {
  const shop = args.shop.trim();
  const { items, pagePath: rawPagePath } = normalizeSwitcherCollectInput(args);
  if (!shop || items.length === 0) {
    return { accepted: true, inserted: 0, updated: 0, skipped: 0, total: 0 };
  }
  const { locales, primary } = await loadCachedShopLocales(shop).catch(() => ({
    locales: [] as string[],
    primary: "",
  }));
  const languageCode = typeof args.languageCode === "string" ? args.languageCode : "";
  const targetCode = resolveCollectTargetCode({
    languageCode,
    rawPagePath,
    shopLocales: locales,
    primaryLocale: primary,
  });
  const pagePath = rawPagePath ? stripShopLocalePrefix(rawPagePath, locales) : null;
  const now = new Date();
  const keys = items.map((item) => item.urlKey);
  const existing = await prisma.switcherImage.findMany({
    where: { shop, urlKey: { in: keys } },
    select: { urlKey: true },
  });
  const total = await prisma.switcherImage.count({ where: { shop } });
  const cap = resolveSwitcherImageTotalCap();
  const { toUpdate, toInsert, skipped } = planSwitcherCollectWrites({
    items,
    existingKeys: existing.map((row) => row.urlKey),
    total,
    cap,
  });

  if (toUpdate.length) {
    await prisma.$transaction(
      toUpdate.map((item) =>
        prisma.switcherImage.update({
          where: { shop_urlKey: { shop, urlKey: item.urlKey } },
          data: {
            lastSeenAt: now,
            lastPagePath: pagePath,
            imageBeforeUrl: item.imageBeforeUrl,
          },
        }),
      ),
    );
  }
  await insertNewSwitcherImages({ shop, toInsert, pagePath, now });
  if (pagePath && targetCode && shouldWriteSwitcherImagePage(pagePath, targetCode)) {
    await upsertSwitcherImagePages({
      shop,
      urlKeys: [...toUpdate, ...toInsert].map((item) => item.urlKey),
      pagePath,
      targetCode,
      now,
    });
  }
  const totalAfter = toInsert.length
    ? await evictOldestSwitcherImagesOverCap({ shop, cap })
    : total;
  return {
    accepted: true,
    inserted: toInsert.length,
    updated: toUpdate.length,
    skipped,
    total: totalAfter,
  };
}
