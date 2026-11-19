import { useCallback, useEffect, useRef, useState } from "react";
import { useAppBootstrapReady } from "~/hooks/useAppBootstrapReady";
import type { ImageResourceType } from "~/lib/imageResourcePaths";
import { fetchImageResources, type ImageResourceRow } from "./contentImageClient";

type ListState = {
  rows: ImageResourceRow[];
  hasNextPage: boolean;
  endCursor: string | null;
  canWriteFiles: boolean | null;
  loading: boolean;
  indexMissing: boolean;
};

const INITIAL: ListState = {
  rows: [],
  hasNextPage: false,
  endCursor: null,
  canWriteFiles: null,
  loading: true,
  indexMissing: false,
};

export function useImageResourceList(args: {
  type: ImageResourceType;
  q: string;
  status: string;
  languageCode?: string;
  uiLocale?: string;
}) {
  const bootstrapReady = useAppBootstrapReady();
  const [state, setState] = useState<ListState>(INITIAL);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const requestSeq = useRef(0);

  const load = useCallback(
    async (after: string | null) => {
      const seq = ++requestSeq.current;
      setState((s) => ({ ...s, loading: true }));
      const res = await fetchImageResources({
        type: args.type,
        after,
        q: args.q,
        status: args.status,
        languageCode: args.languageCode,
        uiLocale: args.uiLocale,
      });
      if (seq !== requestSeq.current) return;
      if (!res.success || !res.response) {
        setState((s) => ({ ...s, rows: [], hasNextPage: false, loading: false, indexMissing: false }));
        return;
      }
        setState({
          ...res.response,
          loading: false,
          indexMissing: Boolean(res.response.indexMissing),
        });
    },
    [args.type, args.q, args.status, args.languageCode, args.uiLocale],
  );

  useEffect(() => {
    if (!bootstrapReady) return;
    setCursors([null]);
    void load(null);
  }, [bootstrapReady, load]);

  const current = cursors[cursors.length - 1] ?? null;
  const next = useCallback(() => {
    if (!state.endCursor) return;
    setCursors((c) => [...c, state.endCursor]);
    void load(state.endCursor);
  }, [load, state.endCursor]);
  const previous = useCallback(() => {
    if (cursors.length < 2) return;
    const after = cursors[cursors.length - 2] ?? null;
    setCursors((c) => c.slice(0, -1));
    void load(after);
  }, [cursors, load]);
  const reload = useCallback(() => load(current), [current, load]);

  return { ...state, hasPrevious: cursors.length > 1, next, previous, reload };
}
