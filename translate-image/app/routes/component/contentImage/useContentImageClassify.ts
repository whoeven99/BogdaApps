import { useCallback, useEffect, useRef, useState } from "react";
import { useAppBootstrapReady } from "~/hooks/useAppBootstrapReady";
import {
  fetchContentImageClassify,
  refreshContentImageClassify,
  type ContentImageClassifyStatus,
} from "./contentImageClient";

const POLL_MS = 2500;

/** 进入 collection / unused 列表时自动入队扫描；进行中轮询，完成后回调 onCompleted。 */
export function useContentImageClassify(enabled: boolean, onCompleted?: () => void) {
  const bootstrapReady = useAppBootstrapReady();
  const [state, setState] = useState<ContentImageClassifyStatus>({
    status: null,
    lastSuccessAt: null,
    error: null,
    busy: false,
  });
  const onCompletedRef = useRef(onCompleted);
  onCompletedRef.current = onCompleted;
  const wasBusy = useRef(false);

  const load = useCallback(async () => {
    const next = await fetchContentImageClassify();
    if (!next) return;
    if (wasBusy.current && !next.busy && next.status === "COMPLETED") {
      onCompletedRef.current?.();
    }
    wasBusy.current = next.busy;
    setState(next);
  }, []);

  useEffect(() => {
    if (!enabled || !bootstrapReady) return;
    let cancelled = false;
    void (async () => {
      const next = await refreshContentImageClassify();
      if (cancelled) return;
      if (next) {
        wasBusy.current = next.busy;
        setState(next);
        return;
      }
      await load();
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrapReady, enabled, load]);

  useEffect(() => {
    if (!enabled || !state.busy) return;
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, state.busy, load]);

  return state;
}
