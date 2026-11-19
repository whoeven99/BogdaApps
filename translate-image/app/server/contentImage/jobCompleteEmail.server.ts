import prisma from "~/db.server";
import { getAccountQuota } from "~/server/billing/quota.server";
import {
  buildJobCompleteTemplateData,
  maskEmail,
} from "~/server/email/emailFormat";
import { sendTencentTemplateEmail } from "~/server/email/tencentSes.server";
import { fetchShopContact } from "~/server/shop/fetchShopContact.server";

const LOG = "[imgEmail]";
const TEMPLATE_JOB_COMPLETE = 236766;
const SUBJECT_JOB_COMPLETE =
  "Image Translation Task Is Complete — Ciwi Image Translate";
const RETRY_MAX = 20;
const RETRY_LOOKBACK_MS = 24 * 60 * 60 * 1000;
const RETRY_SETTLE_MS = 30_000;

function logDetail(phase: string, payload: Record<string, unknown>): void {
  console.info(`${LOG} ${phase} ${JSON.stringify(payload)}`);
}

export async function sendJobCompleteEmail(jobId: string): Promise<boolean> {
  const job = await prisma.imageTranslateJob.findUnique({ where: { id: jobId } });
  if (!job) {
    logDetail("send-skipped", { kind: "job_complete", jobId, reason: "not_found" });
    return false;
  }
  if (job.status !== "COMPLETED") {
    logDetail("send-skipped", {
      kind: "job_complete",
      jobId,
      shop: job.shop,
      reason: "not_completed",
      status: job.status,
    });
    return false;
  }
  if (job.emailSent) {
    logDetail("send-skipped", {
      kind: "job_complete",
      jobId,
      shop: job.shop,
      reason: "already_sent",
    });
    return false;
  }
  if (!job.finishedAt) {
    logDetail("send-skipped", {
      kind: "job_complete",
      jobId,
      shop: job.shop,
      reason: "missing_finished_at",
    });
    return false;
  }

  const shop = job.shop;
  logDetail("schedule-start", {
    shop,
    kind: "job_complete",
    jobId,
    templateId: TEMPLATE_JOB_COMPLETE,
  });

  const [contact, quota] = await Promise.all([
    fetchShopContact(shop),
    getAccountQuota(shop),
  ]);
  const userName = contact.ownerName?.trim() || "there";
  logDetail("contact-resolved", {
    shop,
    kind: "job_complete",
    jobId,
    hasEmail: Boolean(contact.email),
    to: contact.email ? maskEmail(contact.email) : null,
    userName: contact.ownerName?.trim() ? userName : contact.email ? "there" : null,
  });
  if (!contact.email) {
    logDetail("send-skipped", { shop, kind: "job_complete", jobId, reason: "no_recipient" });
    return false;
  }

  const ok = await sendTencentTemplateEmail({
    templateId: TEMPLATE_JOB_COMPLETE,
    subject: SUBJECT_JOB_COMPLETE,
    to: contact.email,
    templateData: buildJobCompleteTemplateData({
      name: userName,
      targetLanguage: job.targetLanguage,
      total: job.total,
      done: job.done,
      failed: job.failed,
      skipped: job.skipped,
      createdAt: job.createdAt,
      finishedAt: job.finishedAt,
      creditsUsed: job.creditsUsed,
      creditsRemaining: quota?.remaining ?? 0,
    }),
  });
  logDetail(ok ? "send-success" : "send-failed", {
    shop,
    kind: "job_complete",
    jobId,
    templateId: TEMPLATE_JOB_COMPLETE,
    to: maskEmail(contact.email),
  });
  if (!ok) return false;

  const marked = await prisma.imageTranslateJob.updateMany({
    where: { id: jobId, emailSent: false },
    data: { emailSent: true },
  });
  if (marked.count === 0) {
    logDetail("send-skipped", {
      shop,
      kind: "job_complete",
      jobId,
      reason: "already_sent",
    });
  }
  return true;
}

export function scheduleJobCompleteEmail(jobId: string): void {
  void sendJobCompleteEmail(jobId).catch((error) => {
    console.error(`${LOG} unhandled kind=job_complete jobId=${jobId}`, error);
  });
}

export async function retryPendingJobCompleteEmails(): Promise<void> {
  const now = Date.now();
  const jobs = await prisma.imageTranslateJob.findMany({
    where: {
      status: "COMPLETED",
      emailSent: false,
      finishedAt: {
        gte: new Date(now - RETRY_LOOKBACK_MS),
        lte: new Date(now - RETRY_SETTLE_MS),
      },
    },
    select: { id: true },
    take: RETRY_MAX,
    orderBy: { finishedAt: "asc" },
  });
  for (const row of jobs) {
    try {
      await sendJobCompleteEmail(row.id);
    } catch (error) {
      console.error(`${LOG} retry job_complete failed jobId=${row.id}`, error);
    }
  }
}
