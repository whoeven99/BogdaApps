import type { TFunction } from "i18next";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import type { ContentImageJob } from "./contentImageClient";
import { imageJobProcessedCount } from "./imageJobProgress";

export type ImageJobMiniStageSegment = {
  labelKey: "v4.stage.translate" | "v4.stage.writeback";
  percent: number;
  complete: boolean;
  active: boolean;
};

/**
 * 图译 Worker 每张图内联完成「生成 → Shopify Files → UserPicture」；
 * UI 仍拆成与 v4 一致的翻译 / 写回两段：进行中仅翻译段 active，写回段随 done+skipped 推进。
 */
export function imageJobMiniStageSegments(
  job: Pick<ContentImageJob, "status" | "done" | "failed" | "skipped" | "total">,
): ImageJobMiniStageSegment[] {
  const total = job.total;
  const processed = imageJobProcessedCount(job);
  const stored = job.done + job.skipped;

  if (job.status === "COMPLETED") {
    return [
      { labelKey: "v4.stage.translate", percent: 100, complete: true, active: false },
      { labelKey: "v4.stage.writeback", percent: 100, complete: true, active: false },
    ];
  }

  if (job.status === "QUEUED") {
    return [
      { labelKey: "v4.stage.translate", percent: 0, complete: false, active: false },
      { labelKey: "v4.stage.writeback", percent: 0, complete: false, active: false },
    ];
  }

  const storedPct = total ? Math.min(100, Math.round((stored / total) * 100)) : 0;
  const processedPct = total ? Math.min(100, Math.round((processed / total) * 100)) : 0;
  const running = job.status === "RUNNING";
  const allProcessed = total > 0 && processed >= total;
  const translateComplete = allProcessed;
  const writebackComplete = allProcessed && stored >= total - job.failed;

  const translateActive = running && !translateComplete;
  const writebackActive = running && translateComplete && !writebackComplete;

  return [
    {
      labelKey: "v4.stage.translate",
      percent: translateComplete ? 100 : translateActive ? storedPct : processedPct,
      complete: translateComplete,
      active: translateActive,
    },
    {
      labelKey: "v4.stage.writeback",
      percent: writebackComplete ? 100 : storedPct,
      complete: writebackComplete,
      active: writebackActive,
    },
  ];
}

export function imageJobStatusForTag(
  status: ContentImageJob["status"],
): TranslationJobProgressSummary["status"] {
  switch (status) {
    case "PAUSED":
      return "PAUSED";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    case "QUEUED":
      return "TRANSLATE_QUEUED";
    case "RUNNING":
    default:
      return "TRANSLATING";
  }
}

export function imageJobStatusLabel(
  job: Pick<ContentImageJob, "status" | "pauseReason">,
  t: TFunction,
): string {
  if (job.status === "QUEUED") return t("v4.status.TRANSLATE_QUEUED");
  if (job.status === "RUNNING") return t("v4.status.TRANSLATING");
  // 与 v4 任务卡一致：暂停原因不进 StatusTag，只显示「已暂停」。
  if (job.status === "PAUSED") return t("v4.status.PAUSED");
  if (job.status === "COMPLETED") return t("v4.status.COMPLETED");
  if (job.status === "CANCELLED") return t("v4.tasks.cancelled");
  return t(`contentImage.job.status.${job.status}`, { defaultValue: job.status });
}

/** 暂停原因文案（与 v4 `getV4JobNotice` 同层：标签只写 Paused，详情在 notice bar）。 */
export function getImageJobPauseNotice(
  job: Pick<ContentImageJob, "status" | "pauseReason">,
  t: TFunction,
): { message: string; showBuyCredits: boolean } | null {
  if (job.status !== "PAUSED") return null;
  switch (job.pauseReason) {
    case "QUOTA_INSUFFICIENT":
      return {
        message: t("v4.notice.quotaInsufficient"),
        showBuyCredits: true,
      };
    case "SCOPE_MISSING":
      return {
        message: t("contentImage.job.notice.scopeMissing"),
        showBuyCredits: false,
      };
    case "SERVICE_ERROR":
      return {
        message: t("contentImage.job.notice.serviceError"),
        showBuyCredits: false,
      };
    default:
      return null;
  }
}

/** @deprecated 使用 {@link getImageJobPauseNotice} */
export const getImageJobQuotaNotice = getImageJobPauseNotice;

export function imageJobStageSummary(
  job: Pick<ContentImageJob, "status" | "done" | "failed" | "skipped" | "total">,
  t: TFunction,
): string {
  if (job.status !== "RUNNING") return "";
  const segments = imageJobMiniStageSegments(job);
  const active = segments.find((seg) => seg.active);
  const stage = active ? t(active.labelKey) : t("v4.stage.translate");
  return t("v4.tasks.inProgress", { stage });
}

export function imageJobMiniStageTrackLabels(
  job: Pick<ContentImageJob, "status" | "done" | "failed" | "skipped" | "total">,
  t: TFunction,
): Array<{ label: string; percent: number; complete: boolean; active: boolean }> {
  return imageJobMiniStageSegments(job).map((seg) => ({
    label: t(seg.labelKey),
    percent: seg.percent,
    complete: seg.complete,
    active: seg.active,
  }));
}

/** @deprecated 仅 ProgressRing 等单条进度仍可用 {@link jobProgressPercent} */
export function imageJobMiniTrackState(job: ContentImageJob): {
  percent: number;
  complete: boolean;
  active: boolean;
} {
  const percent = job.total
    ? Math.min(100, Math.round(((job.done + job.failed + job.skipped) / job.total) * 100))
    : 0;
  if (job.status === "COMPLETED") return { percent: 100, complete: true, active: false };
  if (job.status === "QUEUED") return { percent: 0, complete: false, active: false };
  if (job.status === "PAUSED") return { percent, complete: false, active: false };
  return { percent, complete: percent >= 100, active: job.status === "RUNNING" };
}
