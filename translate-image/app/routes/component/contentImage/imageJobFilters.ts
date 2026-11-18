import type { ContentImageJob } from "./contentImageClient";

const CURRENT_STATUSES = new Set<ContentImageJob["status"]>(["QUEUED", "RUNNING", "PAUSED"]);
const HISTORY_STATUSES = new Set<ContentImageJob["status"]>(["COMPLETED", "CANCELLED"]);

/** 首页任务队列：进行中 / 已暂停（与 v4 isCurrentV4Job 口径一致，暂停不算终态）。 */
export function isCurrentImageJob(job: ContentImageJob | null | undefined): boolean {
  return Boolean(job && CURRENT_STATUSES.has(job.status));
}

export function isHistoryImageJob(job: ContentImageJob): boolean {
  return HISTORY_STATUSES.has(job.status);
}
