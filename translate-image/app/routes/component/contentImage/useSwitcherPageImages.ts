import { useCallback, useEffect, useRef, useState } from "react";
import { useAppBootstrapReady } from "~/hooks/useAppBootstrapReady";
import { fetchSwitcherImages, type ContentImageRow } from "./contentImageClient";

type State = {
  rows: ContentImageRow[];
  canWriteFiles: boolean | null;
  loading: boolean;
};

const INITIAL: State = {
  rows: [],
  canWriteFiles: null,
  loading: true,
};

export function useSwitcherPageImages(args: { pagePath: string; languageCode: string }) {
  const bootstrapReady = useAppBootstrapReady();
  const [state, setState] = useState<State>(INITIAL);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    if (!args.pagePath || !args.languageCode) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const seq = ++requestSeq.current;
    setState((s) => ({ ...s, loading: true }));
    const res = await fetchSwitcherImages({
      languageCode: args.languageCode,
      pagePath: args.pagePath,
    });
    if (seq !== requestSeq.current) return;
    setState({
      rows: res.success ? res.response?.rows ?? [] : [],
      canWriteFiles: res.response?.canWriteFiles ?? null,
      loading: false,
    });
  }, [args.pagePath, args.languageCode]);

  useEffect(() => {
    if (!bootstrapReady) return;
    void load();
  }, [bootstrapReady, load]);

  return { ...state, reload: load };
}
