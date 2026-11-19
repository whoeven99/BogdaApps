import { randomUUID } from "node:crypto";
import prisma from "~/db.server";
import {
  IMAGE_TRANSLATE_INSUFFICIENT_CREDITS,
  IMAGE_TRANSLATE_SCOPE_MISSING,
} from "~/lib/imageTranslate";
import { getAccountQuota, remainingOf } from "~/server/billing/quota.server";
import { contentImageId } from "~/lib/contentPicture";
import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  imageTranslateCredits,
  resolveImageTranslateModel,
} from "~/server/picture/imageTranslate";
import { listPicturesByUrlKeys } from "~/server/picture/picture.server";
import { sessionCanWriteFiles } from "~/server/picture/shopifyFilesAdmin.server";
import { controlTransition } from "./imageTranslateJobControl";
import {
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  dedupeByImageRowKey,
  imageRowKey,
  normalizeImageJobItems,
  parseImageTranslateJobKind,
  type ImageTranslateJobKind,
  type JobItemInput,
} from "./imageTranslateJobItems";
import { scheduleJobCompleteEmail } from "./jobCompleteEmail.server";

export {
  CONTENT_IMAGE_JOB_MAX_ITEMS,
  IMAGE_TRANSLATE_JOB_KINDS,
  normalizeImageJobItems,
  parseImageTranslateJobKind,
  type ImageTranslateJobKind,
  type JobItemInput,
} from "./imageTranslateJobItems";

const ACTIVE_STATUSES = ["QUEUED", "RUNNING", "PAUSED"];

export type ContentImageJobSummary = {
  id: string;
  kind: ImageTranslateJobKind;
  targetLanguage: string;
  model: string;
  status: string;
  pauseReason: string | null;
  total: number;
  done: number;
  failed: number;
  skipped: number;
  creditsUsed: number;
  createdAt: string;
  finishedAt: string | null;
};

export type ContentImageJobItemView = {
  id: string;
  urlKey: string;
  imageUrl: string;
  productId: string;
  resourceTitle: string | null;
  status: string;
  error: string | null;
  imageAfterUrl: string | null;
};

export type ContentImageJobDetail = ContentImageJobSummary & {
  items: ContentImageJobItemView[];
};

type Result<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

function resolveJobModel(raw: unknown): string {
  if (raw === "advance") return IMAGE_TRANSLATE_ADVANCE_MODEL;
  if (raw === "standard") return DEFAULT_IMAGE_TRANSLATE_MODEL;
  return resolveImageTranslateModel(raw);
}

function toSummary(job: {
  id: string;
  kind?: string | null;
  targetLanguage: string;
  model: string;
  status: string;
  pauseReason: string | null;
  total: number;
  done: number;
  failed: number;
  skipped: number;
  creditsUsed: number;
  createdAt: Date;
  finishedAt: Date | null;
}): ContentImageJobSummary {
  return {
    id: job.id,
    kind: parseImageTranslateJobKind(job.kind),
    targetLanguage: job.targetLanguage,
    model: job.model,
    status: job.status,
    pauseReason: job.pauseReason,
    total: job.total,
    done: job.done,
    failed: job.failed,
    skipped: job.skipped,
    creditsUsed: job.creditsUsed,
    createdAt: job.createdAt.toISOString(),
    finishedAt: job.finishedAt?.toISOString() ?? null,
  };
}

async function remainingCredits(shop: string): Promise<number> {
  const quota = await getAccountQuota(shop);
  return quota ? remainingOf(quota) : 0;
}

async function checkCreateAllowed(
  shop: string,
  session: { scope?: string | null },
  credits: number,
): Promise<Result<null>> {
  if (!sessionCanWriteFiles(session)) {
    return { ok: false, error: IMAGE_TRANSLATE_SCOPE_MISSING, status: 403 };
  }
  const active = await prisma.imageTranslateJob.findFirst({
    where: { shop, status: { in: ACTIVE_STATUSES } },
    select: { id: true },
  });
  if (active) return { ok: false, error: "JOB_ACTIVE", status: 409 };
  if ((await remainingCredits(shop)) < credits) {
    return { ok: false, error: IMAGE_TRANSLATE_INSUFFICIENT_CREDITS, status: 403 };
  }
  return { ok: true, data: null };
}

async function listProductPictures(args: {
  shop: string;
  languageCode: string;
  imageIds: string[];
}) {
  if (args.imageIds.length === 0) return [];
  const rows = await prisma.userPicture.findMany({
    where: {
      shop: args.shop,
      languageCode: args.languageCode,
      imageId: { in: args.imageIds },
      isDelete: false,
    },
    orderBy: { id: "desc" },
  });
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const key = `${row.imageId}::${row.urlKey || ""}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  return [...latest.values()];
}

async function alreadyTranslatedKeys(
  shop: string,
  languageCode: string,
  items: Array<{ urlKey: string; productId: string }>,
): Promise<Set<string>> {
  const productItems = items.filter((item) => item.productId);
  const contentItems = items.filter((item) => !item.productId);
  const keys = new Set<string>();
  if (productItems.length) {
    const pictures = await listProductPictures({
      shop,
      languageCode,
      imageIds: [...new Set(productItems.map((item) => item.productId))],
    });
    for (const picture of pictures) {
      if (!picture.imageAfterUrl?.trim()) continue;
      keys.add(`${picture.imageId}::${picture.urlKey || ""}`);
    }
  }
  if (contentItems.length) {
    const pictures = await listPicturesByUrlKeys({
      shop,
      languageCode,
      urlKeys: contentItems.map((item) => item.urlKey),
    });
    for (const picture of pictures) {
      if (!picture.imageAfterUrl?.trim() || !picture.urlKey) continue;
      keys.add(picture.urlKey);
    }
  }
  return keys;
}

/** 建批量任务：一种目标语言 + 一个模型；未勾「重新翻译」时已译图直接计入 skipped。 */
export async function createContentImageJob(args: {
  shop: string;
  session: { scope?: string | null };
  targetLanguage: string;
  model?: string;
  kind?: ImageTranslateJobKind;
  items: JobItemInput[];
  retranslate?: boolean;
}): Promise<Result<ContentImageJobSummary>> {
  const targetLanguage = args.targetLanguage.trim();
  const kind = parseImageTranslateJobKind(args.kind);
  const items = normalizeImageJobItems(args.items, kind).slice(0, CONTENT_IMAGE_JOB_MAX_ITEMS);
  if (!targetLanguage || items.length === 0) {
    return { ok: false, error: "targetLanguage and items required", status: 400 };
  }
  const model = resolveJobModel(args.model);
  const allowed = await checkCreateAllowed(args.shop, args.session, imageTranslateCredits(model));
  if (!allowed.ok) return allowed;

  const translated = args.retranslate
    ? new Set<string>()
    : await alreadyTranslatedKeys(args.shop, targetLanguage, items);
  const pending = items.filter((item) => !translated.has(imageRowKey(item)));
  const id = randomUUID();
  const now = new Date();
  const job = await prisma.imageTranslateJob.create({
    data: {
      id,
      shop: args.shop,
      kind,
      targetLanguage,
      model,
      retranslate: Boolean(args.retranslate),
      status: pending.length ? "QUEUED" : "COMPLETED",
      total: items.length,
      skipped: items.length - pending.length,
      finishedAt: pending.length ? null : now,
    },
  });
  if (pending.length) {
    await prisma.imageTranslateJobItem.createMany({
      data: pending.map((item) => ({
        id: randomUUID(),
        jobId: id,
        shop: args.shop,
        urlKey: item.urlKey,
        imageUrl: item.imageUrl,
        resourceTitle: item.resourceTitle,
        productId: item.productId,
      })),
    });
  } else {
    scheduleJobCompleteEmail(job.id);
  }
  return { ok: true, data: toSummary(job) };
}

/** 暂停 / 继续 / 取消：循环每张图开始前重读状态，当前这张跑完后生效。 */
export async function controlContentImageJob(args: {
  shop: string;
  jobId: string;
  intent: string;
  session?: { scope?: string | null };
}): Promise<Result<ContentImageJobSummary>> {
  const transition = controlTransition(args.intent);
  if (!transition || !args.jobId) return { ok: false, error: "invalid intent", status: 400 };
  const job = await prisma.imageTranslateJob.findFirst({
    where: { id: args.jobId, shop: args.shop },
  });
  if (!job) return { ok: false, error: "NOT_FOUND", status: 404 };
  if (!transition.from.includes(job.status)) {
    return { ok: false, error: "INVALID_STATE", status: 409 };
  }
  if (args.intent === "resume") {
    if (args.session && !sessionCanWriteFiles(args.session)) {
      return { ok: false, error: IMAGE_TRANSLATE_SCOPE_MISSING, status: 403 };
    }
    if ((await remainingCredits(args.shop)) < imageTranslateCredits(job.model)) {
      return { ok: false, error: IMAGE_TRANSLATE_INSUFFICIENT_CREDITS, status: 403 };
    }
  }
  const updated = await prisma.imageTranslateJob.updateMany({
    where: { id: args.jobId, shop: args.shop, status: { in: transition.from } },
    data: {
      status: transition.status,
      pauseReason: transition.pauseReason,
      ...(args.intent === "cancel" ? { finishedAt: new Date() } : {}),
    },
  });
  if (updated.count === 0) return { ok: false, error: "INVALID_STATE", status: 409 };
  const next = await prisma.imageTranslateJob.findFirst({
    where: { id: args.jobId, shop: args.shop },
  });
  if (!next) return { ok: false, error: "NOT_FOUND", status: 404 };
  return { ok: true, data: toSummary(next) };
}

/** 任务队列 / 轮询：仅 QUEUED | RUNNING | PAUSED。同店一条，不按 kind 过滤。 */
export async function getCurrentContentImageJob(
  shop: string,
): Promise<ContentImageJobSummary | null> {
  const job = await prisma.imageTranslateJob.findFirst({
    where: { shop, status: { in: ACTIVE_STATUSES } },
    orderBy: { createdAt: "desc" },
  });
  return job ? toSummary(job) : null;
}

const IMAGE_JOB_HISTORY_STATUSES = ["COMPLETED", "CANCELLED"];

export async function listHistoryContentImageJobs(
  shop: string,
  limit = 50,
): Promise<ContentImageJobSummary[]> {
  const rows = await prisma.imageTranslateJob.findMany({
    where: { shop, status: { in: IMAGE_JOB_HISTORY_STATUSES } },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map((job) => toSummary(job));
}

/**
 * 页面任务条：优先展示任意进行中任务（同店只能有一条），
 * 否则最近 7 天内该 kind 最新一条。不传 kind 时回退到任意 kind。
 */
export async function getLatestContentImageJob(
  shop: string,
  kind?: ImageTranslateJobKind,
): Promise<ContentImageJobSummary | null> {
  const active = await getCurrentContentImageJob(shop);
  if (active) return active;
  const recent = await prisma.imageTranslateJob.findFirst({
    where: {
      shop,
      ...(kind ? { kind } : {}),
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  return recent ? toSummary(recent) : null;
}

const FAILED_IMAGE_JOB_LOOKBACK = 50;
const FAILED_IMAGE_MAX_ITEMS = 200;

export async function listFailedImageItems(
  shop: string,
  kind: ImageTranslateJobKind,
  targetLanguage?: string,
): Promise<ContentImageJobItemView[]> {
  const language = targetLanguage?.trim();
  const jobs = await prisma.imageTranslateJob.findMany({
    where: {
      shop,
      kind,
      ...(language ? { targetLanguage: language } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: FAILED_IMAGE_JOB_LOOKBACK,
    select: { id: true },
  });
  if (jobs.length === 0) return [];
  const items = await prisma.imageTranslateJobItem.findMany({
    where: { shop, jobId: { in: jobs.map((job) => job.id) } },
    orderBy: { updatedAt: "desc" },
    take: FAILED_IMAGE_MAX_ITEMS * 2,
  });
  return dedupeByImageRowKey(items)
    .filter((item) => item.status === "FAILED")
    .slice(0, FAILED_IMAGE_MAX_ITEMS)
    .map((item) => ({
      id: item.id,
      urlKey: item.urlKey,
      imageUrl: item.imageUrl,
      productId: item.productId,
      resourceTitle: item.resourceTitle,
      status: item.status,
      error: item.error,
      imageAfterUrl: item.imageAfterUrl,
    }));
}

export async function getContentImageJobDetail(
  shop: string,
  jobId: string,
): Promise<ContentImageJobDetail | null> {
  if (!jobId) return null;
  const job = await prisma.imageTranslateJob.findFirst({ where: { id: jobId, shop } });
  if (!job) return null;
  const items = await prisma.imageTranslateJobItem.findMany({
    where: { jobId, shop },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return {
    ...toSummary(job),
    items: items.map((item) => ({
      id: item.id,
      urlKey: item.urlKey,
      imageUrl: item.imageUrl,
      productId: item.productId,
      resourceTitle: item.resourceTitle,
      status: item.status,
      error: item.error,
      imageAfterUrl: item.imageAfterUrl,
    })),
  };
}

export function itemImageId(item: { urlKey: string; productId: string }): string {
  return item.productId || contentImageId(item.urlKey);
}

export { listProductPictures };
