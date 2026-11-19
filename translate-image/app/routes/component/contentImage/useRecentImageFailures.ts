import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppBootstrapReady } from "~/hooks/useAppBootstrapReady";
import {
  fetchFailedItems,
  type ContentImageJobItem,
  type ImageTranslateJobKind,
} from "./contentImageClient";
import { buildRecentImageFailureIndex, type RecentImageFailureIndex } from "./imageFailureIndex";

const EMPTY_INDEX: RecentImageFailureIndex = {
  byRowKey: new Map(),
  failuresByResourceId: new Map(),
  total: 0,
};

export function useRecentImageFailures(
  kind: ImageTranslateJobKind,
  languageCode: string,
  enabled: boolean,
) {
  const bootstrapReady = useAppBootstrapReady();
  const [items, setItems] = useState<ContentImageJobItem[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!enabled || !languageCode.trim()) {
      setItems([]);
      return;
    }
    setLoading(true);
    const next = await fetchFailedItems(kind, languageCode);
    setItems(next);
    setLoading(false);
  }, [enabled, kind, languageCode]);

  useEffect(() => {
    if (!bootstrapReady) return;
    void reload();
  }, [bootstrapReady, reload]);

  const index = useMemo(() => buildRecentImageFailureIndex(items), [items]);

  return {
    items,
    index: items.length === 0 && !loading ? EMPTY_INDEX : index,
    loading,
    reload,
  };
}
