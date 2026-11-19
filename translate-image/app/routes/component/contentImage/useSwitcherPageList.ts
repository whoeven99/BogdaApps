import { useCallback, useEffect, useRef, useState } from "react";
import { useAppBootstrapReady } from "~/hooks/useAppBootstrapReady";
import { fetchSwitcherPages, type SwitcherPageRow } from "./contentImageClient";

type ListState = {
  rows: SwitcherPageRow[];
  hasNextPage: boolean;
  endCursor: string | null;
  canWriteFiles: boolean | null;
  loading: boolean;
};

const INITIAL: ListState = {
  rows: [],
  hasNextPage: false,
  endCursor: null,
  canWriteFiles: null,
  loading: true,
};

export function useSwitcherPageList(args: { languageCode: string; q: string }) {
  const bootstrapReady = useAppBootstrapReady();
  const [state, setState] = useState<ListState>(INITIAL);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const requestSeq = useRef(0);

  const load = useCallback(
    async (after: string | null) => {
      if (!args.languageCode) {
        setState((s) => ({ ...s, loading: false, rows: [] }));
        return;
      }
      const seq = ++requestSeq.current;
      setState((s) => ({ ...s, loading: true }));
      const res = await fetchSwitcherPages({
        languageCode: args.languageCode,
        q: args.q || undefined,
        after,
      });
      if (seq !== requestSeq.current) return;
      if (!res.success || !res.response) {
        setState((s) => ({ ...s, rows: [], hasNextPage: false, loading: false }));
        return;
      }
      setState({ ...res.response, loading: false });
    },
    [args.languageCode, args.q],
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
  const reload = useCallback(() => void load(current), [current, load]);

  return { ...state, hasPrevious: cursors.length > 1, next, previous, reload };
}
