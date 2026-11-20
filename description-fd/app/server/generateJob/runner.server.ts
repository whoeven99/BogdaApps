import prisma from "../../db.server";
import { QuotaError } from "../billing/quota.server";
import { generateDescriptionCopy } from "../ai/generateDescription.server";
import { getShopAdminGraphql } from "../shopify/shopAdminToken.server";
import { publishGeneratedContent } from "../shopify/publishGenerated.server";
import type { TemplateSource } from "../template/template.server";
import {
  findOldestQueuedJob,
  heartbeatJob,
  resetStaleRunningJobs,
  tryClaimJob,
} from "./job.server";

const HEARTBEAT_MS = 30_000;
let started = false;
let ticking = false;

export function ensureJobRunner() {
  if (started) return;
  started = true;
  setInterval(() => {
    void tick().catch((err) => console.error("[generate-job]", err));
  }, 3000);
}

async function withJobHeartbeat(jobId: string, work: () => Promise<void>) {
  const timer = setInterval(() => {
    void heartbeatJob(jobId).catch((err) => console.error("[generate-job] heartbeat", err));
  }, HEARTBEAT_MS);
  try {
    await work();
  } finally {
    clearInterval(timer);
  }
}

async function tick() {
  if (ticking) return;
  ticking = true;
  try {
    await resetStaleRunningJobs();
    const job = await findOldestQueuedJob();
    if (!job) return;
    const claimed = await tryClaimJob(job.id);
    if (!claimed) return;
    await withJobHeartbeat(job.id, () => runJob(job.id));
  } finally {
    ticking = false;
  }
}

async function runJob(jobId: string) {
  const job = await prisma.generateJob.findUnique({ where: { id: jobId } });
  if (!job) return;
  const graphql = await getShopAdminGraphql(job.shop);
  const admin = { graphql };

  while (true) {
    const fresh = await prisma.generateJob.findUnique({ where: { id: jobId } });
    if (!fresh) return;
    if (fresh.stopRequested) {
      await prisma.generateJob.update({
        where: { id: jobId },
        data: { status: "STOPPED", updatedAt: new Date() },
      });
      await prisma.generateJobItem.updateMany({
        where: { jobId, status: "PENDING" },
        data: { status: "SKIPPED" },
      });
      return;
    }
    const item = await prisma.generateJobItem.findFirst({
      where: { jobId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });
    if (!item) {
      await prisma.generateJob.update({
        where: { id: jobId },
        data: { status: "COMPLETED", updatedAt: new Date() },
      });
      return;
    }
    await prisma.generateJobItem.update({
      where: { id: item.id },
      data: { status: "RUNNING", updatedAt: new Date() },
    });
    try {
      const result = await generateDescriptionCopy({
        shop: job.shop,
        admin,
        resourceId: item.resourceId,
        pageType: job.pageType,
        contentType: job.contentType,
        languageStyle: job.languageStyle,
        brandStyle: job.brandStyle,
        language: job.language,
        seoKeywords: job.seoKeywords,
        brandWord: job.brandWord,
        brandSlogan: job.brandSlogan,
        model: job.model,
        templateId: job.templateId,
        templateSource: job.templateSource as TemplateSource,
      });
      await prisma.generateJobItem.update({
        where: { id: item.id },
        data: {
          status: "DONE",
          title: result.title,
          generatedTitle: result.title,
          generatedHtml: result.description,
          error: null,
          updatedAt: new Date(),
        },
      });
      if (job.autoPublish) {
        try {
          const published = await publishGeneratedContent({
            graphql,
            resourceId: item.resourceId,
            pageType: job.pageType,
            contentType: job.contentType,
            description: result.description,
            title: result.title,
          });
          await prisma.generateJobItem.update({
            where: { id: item.id },
            data: published.ok
              ? { publishedAt: new Date(), error: null, updatedAt: new Date() }
              : {
                  error: published.userErrors[0]?.message || "publish failed",
                  updatedAt: new Date(),
                },
          });
        } catch (publishError) {
          await prisma.generateJobItem.update({
            where: { id: item.id },
            data: {
              error: publishError instanceof Error ? publishError.message : "publish failed",
              updatedAt: new Date(),
            },
          });
        }
      }
      await prisma.generateJob.update({
        where: { id: jobId },
        data: { updatedAt: new Date() },
      });
    } catch (error) {
      const quota = error instanceof QuotaError;
      await prisma.generateJobItem.update({
        where: { id: item.id },
        data: {
          status: quota ? "SKIPPED" : "FAILED",
          error: error instanceof Error ? error.message : "generate failed",
          updatedAt: new Date(),
        },
      });
      if (quota) {
        await prisma.generateJobItem.updateMany({
          where: { jobId, status: "PENDING" },
          data: { status: "SKIPPED" },
        });
        await prisma.generateJob.update({
          where: { id: jobId },
          data: { status: "FAILED", updatedAt: new Date() },
        });
        return;
      }
    }
  }
}
