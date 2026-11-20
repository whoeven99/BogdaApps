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

function taskStatusCode(status: string): number {
  if (status === "RUNNING" || status === "QUEUED") return 2;
  if (status === "COMPLETED") return 3;
  return 4;
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
      taskStatus: 3,
      taskData: JSON.stringify({ productIds: [] }),
      productTitle: "",
      status: 3,
    };
  }
  const unfinished = job.items.filter((item) => item.status === "PENDING" || item.status === "RUNNING").length;
  const current = job.items.find((item) => item.status === "RUNNING") || job.items.find((item) => item.status === "PENDING");
  return {
    allCount: job.items.length,
    unfinishedCount: unfinished,
    taskModel: `${job.pageType} ${job.contentType}`,
    taskStatus: taskStatusCode(job.status),
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
  const running = await prisma.generateJob.findFirst({
    where: { shop: input.shop, status: { in: ACTIVE } },
    select: { id: true },
  });
  if (running) return { ok: false };
  const ids = input.productIds.filter(Boolean);
  if (ids.length === 0) return { ok: false };
  const job = await prisma.generateJob.create({
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
