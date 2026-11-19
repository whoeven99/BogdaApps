import { useSearchParams } from "@remix-run/react";
import { useCallback, useEffect, useRef } from "react";

export function useImageListDeepLink() {
  const [searchParams, setSearchParams] = useSearchParams();
  const preview = searchParams.get("preview")?.trim() ?? "";
  const failedOnly = searchParams.get("failed") === "1";

  const patch = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          mutate(next);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setFailedOnly = useCallback(
    (on: boolean) => {
      patch((next) => {
        if (on) next.set("failed", "1");
        else next.delete("failed");
      });
    },
    [patch],
  );

  const clearPreview = useCallback(() => {
    patch((next) => {
      next.delete("preview");
    });
  }, [patch]);

  return { preview, failedOnly, setFailedOnly, clearPreview };
}

export function useOpenPreviewFromQuery<T>(
  rows: T[],
  preview: string,
  matches: (row: T, preview: string) => boolean,
  open: (row: T) => void,
) {
  const tried = useRef("");
  useEffect(() => {
    if (!preview) {
      tried.current = "";
      return;
    }
    if (tried.current === preview) return;
    if (rows.length === 0) return;
    tried.current = preview;
    const row = rows.find((item) => matches(item, preview));
    if (row) open(row);
  }, [matches, open, preview, rows]);
}
