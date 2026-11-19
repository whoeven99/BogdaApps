import type { ContentImageJob } from "./contentImageClient";

/** 已处理张数（成功 / 失败 / 跳过），与进度环、x/N 文案同一口径。 */
export function imageJobProcessedCount(
  job: Pick<ContentImageJob, "done" | "failed" | "skipped">,
): number {
  return job.done + job.failed + job.skipped;
}

export function jobProgressPercent(job: Pick<ContentImageJob, "done" | "failed" | "skipped" | "total">): number {
  if (!job.total) return 0;
  return Math.min(100, Math.round((imageJobProcessedCount(job) / job.total) * 100));
}
