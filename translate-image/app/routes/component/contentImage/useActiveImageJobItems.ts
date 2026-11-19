import { useCallback, useEffect, useState } from "react";
import {
  fetchJobDetail,
  imageRowKey,
  type ContentImageJob,
  type ContentImageJobItem,
} from "./contentImageClient";
import { isCurrentImageJob } from "./imageJobFilters";

const ITEM_POLL_MS = 4_000;

export type ActiveImageJobItemsState = {
  itemsByKey: Map<string, ContentImageJobItem>;
  /** 任务内第一张仍为 PENDING 的图（RUNNING 时视为「翻译中」）。 */
  activePendingKey: string | null;
};

const EMPTY: ActiveImageJobItemsState = {
  itemsByKey: new Map(),
  activePendingKey: null,
};

function buildItemIndex(items: ContentImageJobItem[]): ActiveImageJobItemsState {
  const itemsByKey = new Map<string, ContentImageJobItem>();
  let activePendingKey: string | null = null;
  for (const item of items) {
    const key = imageRowKey({
      urlKey: item.urlKey,
      productId: item.productId || undefined,
    });
    itemsByKey.set(key, item);
    if (!activePendingKey && item.status === "PENDING") {
      activePendingKey = key;
    }
  }
  return { itemsByKey, activePendingKey };
}

/** 当前任务进行中时轮询 job items，供列表行状态与任务卡对齐。 */
export function useActiveImageJobItems(
  job: ContentImageJob | null,
  targetLanguage: string,
): ActiveImageJobItemsState {
  const [state, setState] = useState<ActiveImageJobItemsState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!job || !isCurrentImageJob(job) || job.targetLanguage !== targetLanguage) {
      setState(EMPTY);
      return;
    }
    const detail = await fetchJobDetail(job.id);
    if (!detail || detail.id !== job.id) return;
    setState(buildItemIndex(detail.items));
  }, [job, targetLanguage]);

  useEffect(() => {
    if (!job || !isCurrentImageJob(job) || job.targetLanguage !== targetLanguage) {
      setState(EMPTY);
      return;
    }
    void refresh();
    const timer = window.setInterval(() => void refresh(), ITEM_POLL_MS);
    return () => window.clearInterval(timer);
  }, [job, targetLanguage, refresh]);

  return state;
}
