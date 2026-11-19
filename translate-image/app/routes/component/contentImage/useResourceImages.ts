import { useCallback, useEffect, useRef, useState } from "react";
import { useAppBootstrapReady } from "~/hooks/useAppBootstrapReady";
import type { ImageResourceType } from "~/lib/imageResourcePaths";
import {
  fetchResourceImages,
  type ContentImageRow,
  type ImageResourceRow,
} from "./contentImageClient";

type State = {
  resource: ImageResourceRow | null;
  rows: ContentImageRow[];
  canWriteFiles: boolean | null;
  loading: boolean;
  missing: boolean;
};

const INITIAL: State = {
  resource: null,
  rows: [],
  canWriteFiles: null,
  loading: true,
  missing: false,
};

export function useResourceImages(args: {
  type: ImageResourceType;
  resourceId: string;
  languageCode: string;
  uiLocale?: string;
}) {
  const bootstrapReady = useAppBootstrapReady();
  const [state, setState] = useState<State>(INITIAL);
  const requestSeq = useRef(0);

  const load = useCallback(async () => {
    if (!args.resourceId || !args.languageCode) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    const seq = ++requestSeq.current;
    setState((s) => ({ ...s, loading: true, missing: false }));
    const res = await fetchResourceImages({
      type: args.type,
      resourceId: args.resourceId,
      languageCode: args.languageCode,
      uiLocale: args.uiLocale,
    });
    if (seq !== requestSeq.current) return;
    if (!res.success || !res.response) {
      setState({
        resource: null,
        rows: [],
        canWriteFiles: null,
        loading: false,
        missing: res.errorMsg === "NOT_FOUND",
      });
      return;
    }
    setState({ ...res.response, loading: false, missing: false });
  }, [args.type, args.resourceId, args.languageCode, args.uiLocale]);

  useEffect(() => {
    if (!bootstrapReady) return;
    void load();
  }, [bootstrapReady, load]);

  return { ...state, reload: load };
}
