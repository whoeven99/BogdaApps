import type { TFunction } from "i18next";
import type { TranslationJobProgressSummary } from "~/server/translateV4/progress.server";
import {
  contentImageId,
  imageRowKey,
  type ContentImageJob,
  type ContentImageJobItem,
  type ContentImageRow,
} from "./contentImageClient";
import { isCurrentImageJob } from "./imageJobFilters";
import { imageJobStatusForTag, imageJobStatusLabel } from "./imageJobQueueDisplay";
import type { ActiveImageJobItemsState } from "./useActiveImageJobItems";

/** 当前任务 item 优先：进行中不把旧译图当结果；DONE 后换成新 URL。 */
export function mergeContentImageRowWithJobItems(
  row: ContentImageRow,
  ctx: ActiveImageJobItemsState,
): ContentImageRow {
  const item = ctx.itemsByKey.get(imageRowKey(row));
  if (!item) return row;
  if (item.status !== "DONE" || !item.imageAfterUrl) {
    if (!row.translated) return row;
    return { ...row, translated: null };
  }
  return {
    ...row,
    translated: {
      imageId: row.productId ?? contentImageId(row.urlKey),
      imageBeforeUrl: row.imageUrl,
      imageAfterUrl: item.imageAfterUrl,
      urlKey: row.urlKey,
    },
  };
}

export type ImageRowLiveStatus =
  | {
      kind: "tag";
      tagStatus: TranslationJobProgressSummary["status"];
      label: string;
    }
  | {
      kind: "badge";
      tone: "success" | "caution" | "critical" | "neutral";
      label: string;
    };

export function resolveImageRowLiveStatus(
  row: ContentImageRow,
  job: ContentImageJob | null,
  ctx: ActiveImageJobItemsState,
  t: TFunction,
  recentFailedByKey?: Map<string, ContentImageJobItem>,
): ImageRowLiveStatus | null {
  const key = imageRowKey(row);
  if (recentFailedByKey?.has(key)) {
    return { kind: "badge", tone: "critical", label: t("contentImage.item.FAILED") };
  }

  const item = ctx.itemsByKey.get(key);
  if (!item) {
    if (row.translated?.imageAfterUrl) {
      return { kind: "badge", tone: "success", label: t("contentImage.status.translated") };
    }
    return null;
  }

  if (item.status === "DONE") {
    return { kind: "badge", tone: "success", label: t("contentImage.item.DONE") };
  }
  if (item.status === "FAILED") {
    return { kind: "badge", tone: "critical", label: t("contentImage.item.FAILED") };
  }
  if (item.status === "SKIPPED") {
    return { kind: "badge", tone: "neutral", label: t("contentImage.item.SKIPPED") };
  }

  if (!job || !isCurrentImageJob(job)) {
    return null;
  }

  if (job.status === "PAUSED") {
    return {
      kind: "tag",
      tagStatus: imageJobStatusForTag(job.status),
      label: imageJobStatusLabel(job, t),
    };
  }
  if (job.status === "QUEUED") {
    return {
      kind: "tag",
      tagStatus: imageJobStatusForTag("QUEUED"),
      label: t("v4.status.TRANSLATE_QUEUED"),
    };
  }
  if (job.status === "RUNNING") {
    if (key === ctx.activePendingKey) {
      return {
        kind: "tag",
        tagStatus: imageJobStatusForTag("RUNNING"),
        label: t("v4.status.TRANSLATING"),
      };
    }
    return {
      kind: "tag",
      tagStatus: imageJobStatusForTag("QUEUED"),
      label: t("contentImage.rowStatus.waitingInJob"),
    };
  }

  return null;
}

/** 包装：仅当任务目标语言与页面语言一致时才解析动态状态。 */
export function resolveImageRowLiveStatusForLanguage(
  row: ContentImageRow,
  job: ContentImageJob | null,
  targetLanguage: string,
  ctx: ActiveImageJobItemsState,
  t: TFunction,
  recentFailedByKey?: Map<string, ContentImageJobItem>,
): ImageRowLiveStatus | null {
  if (job && job.targetLanguage !== targetLanguage) return null;
  return resolveImageRowLiveStatus(row, job, ctx, t, recentFailedByKey);
}
