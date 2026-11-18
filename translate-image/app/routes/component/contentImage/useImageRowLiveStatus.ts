import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { ContentImageJob, ContentImageRow } from "./contentImageClient";
import {
  mergeContentImageRowWithJobItems,
  resolveImageRowLiveStatusForLanguage,
  type ImageRowLiveStatus,
} from "./imageRowLiveStatus";
import { useActiveImageJobItems } from "./useActiveImageJobItems";
import type { RecentImageFailureIndex } from "./imageFailureIndex";

/** 列表页：绑定当前图译任务 + 语言，返回每行的动态状态（与任务卡文案一致）。 */
export function useImageRowLiveStatus(
  job: ContentImageJob | null,
  targetLanguage: string,
  recentFailures?: RecentImageFailureIndex,
) {
  const { t } = useTranslation();
  const itemState = useActiveImageJobItems(job, targetLanguage);
  const recentFailedByKey = recentFailures?.byRowKey;

  const getRowLiveStatus = useCallback(
    (row: ContentImageRow): ImageRowLiveStatus | null =>
      resolveImageRowLiveStatusForLanguage(
        row,
        job,
        targetLanguage,
        itemState,
        t,
        recentFailedByKey,
      ),
    [itemState, job, targetLanguage, recentFailedByKey, t],
  );

  const mergeDisplayRow = useCallback(
    (row: ContentImageRow) => mergeContentImageRowWithJobItems(row, itemState),
    [itemState],
  );

  return { getRowLiveStatus, mergeDisplayRow };
}
