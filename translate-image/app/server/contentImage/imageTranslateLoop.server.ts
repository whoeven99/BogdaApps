import { getAccountQuota, remainingOf } from "~/server/billing/quota.server";
import { contentImageId } from "~/lib/contentPicture";
import {
  describeImageTranslateError,
  formatImageTranslateErrorLog,
  imageTranslateCredits,
  imageTranslateFailStorage,
  IMAGE_TRANSLATE_MSG_SAVE_FAILED,
  type ShopifyFilesGraphql,
} from "~/server/picture/imageTranslate";
import {
  ImageTranslateQuotaError,
  runTranslateImageItem,
} from "~/server/picture/translateImage.server";
import { adminFilesGraphql } from "~/server/picture/shopifyFilesAdmin.server";
import { getShopAdmin } from "~/server/shop/shopAdminToken.server";
import { invalidateAppOnlyTokenCache } from "~/server/shop/offlineSessionToken.server";
import {
  claimImageTranslateJob,
  completeRunningJob,
  failRemainingPendingItems,
  hasTranslatedPicture,
  nextPendingItem,
  pauseRunningJob,
  readJobStatus,
  recordItemOutcome,
  requeueRunningJob,
  type ImageTranslateItemRow,
  type ImageTranslateJobRow,
  type ItemOutcome,
  type JobPauseReason,
} from "./imageTranslateJobStore.server";

const LOG = "[imageTranslate]";
const STALE_MS = 10 * 60 * 1000;
const GEMINI_RATE_LIMIT_TRIP = 2;
const FIRST_DELAY_MS = 5_000;

declare global {
  var __imgTranslateLoopStarted: boolean | undefined;
}

function pollMs(): number {
  return Math.max(2000, Number(process.env.IMAGE_TRANSLATE_POLL_MS) || 10_000);
}

function maxJobs(): number {
  return Math.max(1, Math.floor(Number(process.env.IMAGE_TRANSLATE_MAX_JOBS) || 1));
}

const running = new Set<string>();

type StepResult = { outcome: ItemOutcome } | { pause: JobPauseReason };

const PAUSE_BY_ERROR: Record<string, JobPauseReason> = {
  SHOPIFY_SCOPE_MISSING: "SCOPE_MISSING",
  GEMINI_NOT_CONFIGURED: "SERVICE_ERROR",
};

function isGeminiRateLimitedFail(error: string): boolean {
  return (
    error.startsWith("GEMINI_RATE_LIMITED") || error.startsWith("IMAGE_TRANSLATE_GEMINI_RATE_LIMIT")
  );
}

function nextRateLimitStreak(streak: number, outcome: ItemOutcome): number {
  if (outcome.status === "FAILED" && isGeminiRateLimitedFail(outcome.error)) return streak + 1;
  return 0;
}

function errorToStep(err: unknown): StepResult {
  if (err instanceof ImageTranslateQuotaError) return { pause: "QUOTA_INSUFFICIENT" };
  const { code } = describeImageTranslateError(err);
  if (PAUSE_BY_ERROR[code]) return { pause: PAUSE_BY_ERROR[code]! };
  return { outcome: { status: "FAILED", error: imageTranslateFailStorage(err) } };
}

function itemImageId(item: ImageTranslateItemRow): string {
  return item.productId || contentImageId(item.urlKey);
}

async function translateWithScopeRetry(
  job: ImageTranslateJobRow,
  item: ImageTranslateItemRow,
  graphql: ShopifyFilesGraphql,
): Promise<{ url: string; fileId: string }> {
  const input = {
    shop: job.shop,
    graphql,
    imageId: itemImageId(item),
    imageUrl: item.imageUrl,
    targetLanguage: job.targetLanguage,
    model: job.model,
  };
  try {
    return await runTranslateImageItem(input);
  } catch (err) {
    if (describeImageTranslateError(err).code !== "SHOPIFY_SCOPE_MISSING") throw err;
    invalidateAppOnlyTokenCache(job.shop);
    return runTranslateImageItem(input);
  }
}

async function processItem(
  job: ImageTranslateJobRow,
  item: ImageTranslateItemRow,
  graphql: ShopifyFilesGraphql,
  credits: number,
): Promise<StepResult> {
  const skipImageId = item.productId || undefined;
  if (
    !job.retranslate &&
    (await hasTranslatedPicture(job.shop, job.targetLanguage, item.urlKey, skipImageId))
  ) {
    return { outcome: { status: "SKIPPED" } };
  }
  const quota = await getAccountQuota(job.shop);
  const remaining = quota ? remainingOf(quota) : 0;
  if (remaining < credits) return { pause: "QUOTA_INSUFFICIENT" };
  try {
    const translated = await translateWithScopeRetry(job, item, graphql);
    return { outcome: { status: "DONE", imageAfterUrl: translated.url, credits } };
  } catch (err) {
    console.error(
      `${LOG} item failed job=${job.id} shop=${job.shop} lang=${job.targetLanguage} key=${item.urlKey} ${formatImageTranslateErrorLog(err)}`,
    );
    if (err instanceof Error && err.message === IMAGE_TRANSLATE_MSG_SAVE_FAILED) {
      return { outcome: { status: "FAILED", error: IMAGE_TRANSLATE_MSG_SAVE_FAILED } };
    }
    return errorToStep(err);
  }
}

async function processJob(job: ImageTranslateJobRow): Promise<void> {
  const admin = getShopAdmin({ shop: job.shop, path: "image-translate-loop" });
  const graphql = adminFilesGraphql(admin);
  const credits = imageTranslateCredits(job.model);
  console.log(`${LOG} start job=${job.id} shop=${job.shop} lang=${job.targetLanguage} model=${job.model}`);
  let rateLimitStreak = 0;
  while (true) {
    if ((await readJobStatus(job.id)) !== "RUNNING") return;
    const item = await nextPendingItem(job.id);
    if (!item) {
      await completeRunningJob(job.id);
      console.log(`${LOG} completed job=${job.id}`);
      return;
    }
    const step = await processItem(job, item, graphql, credits);
    if ("pause" in step) {
      await pauseRunningJob(job.id, step.pause);
      console.log(`${LOG} paused job=${job.id} reason=${step.pause}`);
      return;
    }
    await recordItemOutcome(job.id, item.id, step.outcome);
    rateLimitStreak = nextRateLimitStreak(rateLimitStreak, step.outcome);
    if (rateLimitStreak >= GEMINI_RATE_LIMIT_TRIP && step.outcome.status === "FAILED") {
      const skipped = await failRemainingPendingItems(job.id, step.outcome.error);
      if (skipped > 0) {
        console.warn(`${LOG} rate-limit skip remaining job=${job.id} n=${skipped}`);
      }
    }
  }
}

async function runImageTranslateTick(): Promise<void> {
  while (running.size < maxJobs()) {
    const job = await claimImageTranslateJob(`web-${process.pid}`, STALE_MS);
    if (!job) return;
    running.add(job.id);
    void processJob(job)
      .catch((err) =>
        console.error(`${LOG} job crashed job=${job.id} ${formatImageTranslateErrorLog(err)}`),
      )
      .finally(() => running.delete(job.id));
  }
}

export function startImageTranslateLoop(): void {
  if (globalThis.__imgTranslateLoopStarted) return;
  globalThis.__imgTranslateLoopStarted = true;
  const tick = () => {
    void runImageTranslateTick().catch((err) =>
      console.error(`${LOG} tick ${formatImageTranslateErrorLog(err)}`),
    );
  };
  setTimeout(tick, FIRST_DELAY_MS);
  setInterval(tick, pollMs());
}

export { requeueRunningJob };
