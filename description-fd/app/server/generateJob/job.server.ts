import prisma from "../../db.server";
import { ensureAccount } from "../billing/ensureAccount.server";
import type { TemplateSource } from "../template/template.server";

export type UserDataDto = {
  allCount: number;
  unfinishedCount: number;
  taskModel: string;
  taskStatus: number;
  taskData: string;
  productTitle: string;
  status: number;
};

const ACTIVE = ["QUEUED", "RUNNING"];
export const JOB_STALE_MS = 10 * 60 * 1000;

export function didClaimJob(updateCount: number): boolean {
  return updateCount === 1;
}

export function isStaleRunning(updatedAt: Date, now: Date, staleMs = JOB_STALE_MS): boolean {
  return now.getTime() - updatedAt.getTime() >= staleMs;
}

/** Java-era UI codes: 1=done (Check content), 2=running, 3=quota, 4=failed. */
export function taskStatusCode(status: string, quotaStopped = false): number {
  if (status === "RUNNING" || status === "QUEUED") return 2;
  if (status === "COMPLETED" || status === "STOPPED") return 1;
  if (status === "QUOTA_INSUFFICIENT" || quotaStopped) return 3;
  return 4;
}

export function isQuotaStopError(error: string | null | undefined): boolean {
  return (error || "").toLowerCase().includes("insufficient");
}

export function resourceIdKey(id: string): string {
  const trimmed = id.trim();
  const slash = trimmed.lastIndexOf("/");
  return slash >= 0 ? trimmed.slice(slash + 1) : trimmed;
}

export type GeneratedContentRow = {
  id: string;
  productId: string;
  generateContent: string;
  title: string;
  pageType: string;
  contentType: string;
};

export async function listGeneratedContentByResourceIds(
  shop: string,
  ids: string[],
): Promise<GeneratedContentRow[]> {
  const job = await prisma.generateJob.findFirst({
    where: { shop },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });
  if (!job) return [];
  const byKey = new Map<string, (typeof job.items)[number]>();
  for (const item of job.items) {
    byKey.set(item.resourceId, item);
    byKey.set(resourceIdKey(item.resourceId), item);
  }
  return ids.map((id) => {
    const item = byKey.get(id) || byKey.get(resourceIdKey(id));
    return {
      id,
      productId: id,
      generateContent: item?.generatedHtml || "",
      title: item?.title || item?.generatedTitle || "",
      pageType: job.pageType,
      contentType: job.contentType,
    };
  });
}

export async function getUserData(shop: string): Promise<UserDataDto | null> {
  const job = await prisma.generateJob.findFirst({
    where: { shop },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });
  if (!job) {
    return {
      allCount: 0,
      unfinishedCount: 0,
      taskModel: "",
      taskStatus: 0,
      taskData: JSON.stringify({ productIds: [] }),
      productTitle: "",
      status: 0,
    };
  }
  const unfinished = job.items.filter((item) => item.status === "PENDING" || item.status === "RUNNING").length;
  const current = job.items.find((item) => item.status === "RUNNING") || job.items.find((item) => item.status === "PENDING");
  const quotaStopped = job.items.some((item) => isQuotaStopError(item.error));
  return {
    allCount: job.items.length,
    unfinishedCount: unfinished,
    taskModel: `${job.pageType} ${job.contentType}`,
    taskStatus: taskStatusCode(job.status, quotaStopped),
    taskData: JSON.stringify({ productIds: job.items.map((item) => item.resourceId) }),
    productTitle: current?.title || "",
    status: job.status === "RUNNING" ? 2 : 3,
  };
}

export async function enqueueBatchJob(input: {
  shop: string;
  productIds: string[];
  pageType: string;
  contentType: string;
  languageStyle: string;
  brandStyle?: string;
  templateId: number;
  templateSource: TemplateSource;
  model: string;
  language: string;
  seoKeywords?: string;
  brandWord?: string;
  brandSlogan?: string;
}): Promise<{ ok: boolean; jobId?: string }> {
  await ensureAccount(input.shop);
  const ids = input.productIds.filter(Boolean);
  if (ids.length === 0) return { ok: false };
  return prisma.$transaction(async (tx) => {
    const running = await tx.generateJob.findFirst({
      where: { shop: input.shop, status: { in: ACTIVE } },
      select: { id: true },
    });
    if (running) return { ok: false };
    const job = await tx.generateJob.create({
      data: {
        shop: input.shop,
        status: "QUEUED",
        pageType: input.pageType,
        contentType: input.contentType,
        languageStyle: input.languageStyle,
        brandStyle: input.brandStyle || "",
        templateId: input.templateId,
        templateSource: input.templateSource,
        model: input.model,
        language: input.language,
        seoKeywords: input.seoKeywords || "",
        brandWord: input.brandWord || "",
        brandSlogan: input.brandSlogan || "",
        items: {
          create: ids.map((resourceId) => ({
            shop: input.shop,
            resourceId,
            status: "PENDING",
          })),
        },
      },
    });
    return { ok: true, jobId: job.id };
  });
}

export async function resetStaleRunningJobs(nowMs = Date.now()): Promise<void> {
  const staleBefore = new Date(nowMs - JOB_STALE_MS);
  await prisma.generateJob.updateMany({
    where: { status: "RUNNING", stopRequested: true, updatedAt: { lt: staleBefore } },
    data: { status: "STOPPED", updatedAt: new Date() },
  });
  await prisma.generateJob.updateMany({
    where: { status: "RUNNING", stopRequested: false, updatedAt: { lt: staleBefore } },
    data: { status: "QUEUED", updatedAt: new Date() },
  });
}

export async function findOldestQueuedJob(): Promise<{ id: string } | null> {
  return prisma.generateJob.findFirst({
    where: { status: "QUEUED" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
}

export async function tryClaimJob(jobId: string): Promise<boolean> {
  const result = await prisma.generateJob.updateMany({
    where: { id: jobId, status: "QUEUED" },
    data: { status: "RUNNING", updatedAt: new Date() },
  });
  return didClaimJob(result.count);
}

export async function heartbeatJob(jobId: string): Promise<void> {
  await prisma.generateJob.updateMany({
    where: { id: jobId, status: "RUNNING" },
    data: { updatedAt: new Date() },
  });
}

export async function requestStop(shop: string): Promise<boolean> {
  const result = await prisma.generateJob.updateMany({
    where: { shop, status: { in: ACTIVE } },
    data: { stopRequested: true, updatedAt: new Date() },
  });
  return result.count > 0;
}

export async function markShopJobsStopped(shop: string): Promise<void> {
  await prisma.generateJob.updateMany({
    where: { shop, status: { in: ACTIVE } },
    data: { status: "STOPPED", stopRequested: true, updatedAt: new Date() },
  });
}

export function canEnqueue(existingStatus: string | null): boolean {
  return !existingStatus || !ACTIVE.includes(existingStatus);
}
