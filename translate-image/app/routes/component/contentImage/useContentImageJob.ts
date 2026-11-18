import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchCurrentJob,
  isActiveJob,
  type ContentImageJob,
  type ImageTranslateJobKind,
} from "./contentImageClient";
import { isCurrentImageJob } from "./imageJobFilters";

const POLL_MS = 5_000;

function jobForPage(next: ContentImageJob | null): ContentImageJob | null {
  return next;
}

/** 进行中的批量图译任务每 5s 轮询一次；任务从进行中变为结束时回调 `onFinished`。 */
export function useContentImageJob(
  initial: ContentImageJob | null,
  onFinished?: () => void,
  _kind?: ImageTranslateJobKind,
) {
  const [job, setJob] = useState<ContentImageJob | null>(() => jobForPage(initial));
  const wasCurrent = useRef(isCurrentImageJob(jobForPage(initial)));
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  const refresh = useCallback(async () => {
    const raw = await fetchCurrentJob();
    if (raw === undefined) return;
    const next = jobForPage(raw);
    setJob(next);
    const current = isCurrentImageJob(next);
    if (wasCurrent.current && !current) onFinishedRef.current?.();
    wasCurrent.current = current;
  }, []);

  useEffect(() => {
    if (!isCurrentImageJob(job)) return;
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [job, refresh]);

  const replace = useCallback((next: ContentImageJob | null) => {
    wasCurrent.current = isCurrentImageJob(next);
    setJob(next);
  }, []);

  return { job, refresh, replace, isActive: isActiveJob(job) };
}
