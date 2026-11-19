import { useEffect } from "react";
import {
  filesGrantInstallUrl,
  resolveFilesGrantContext,
  runFilesGrantFlow,
  WRITE_FILES_SCOPE,
  type FilesGrantContext,
} from "./writeFilesScope";

export type { FilesGrantContext };

type Translate = (key: string, options?: Record<string, unknown>) => string;

type ScopesApi = {
  request?: (scopes: string[]) => Promise<{
    result?: string;
    detail?: { granted?: string[] };
  }>;
};

type AppBridge = {
  scopes?: ScopesApi;
  config?: { apiKey?: string; shop?: string };
  toast?: { show: (message: string, options?: Record<string, unknown>) => void };
};

function appBridge(): AppBridge {
  return ((window as unknown as { shopify?: AppBridge }).shopify ?? {}) as AppBridge;
}

function showGrantToast(message: string, isError = true): void {
  const toast = appBridge().toast;
  if (toast && typeof toast.show === "function") {
    toast.show(message, { isError });
    return;
  }
  console.error("[toast]", message);
}

function openTop(url: string): void {
  window.open(url, "_top");
}

const FILES_GRANT_PENDING_KEY = "ciwi:files-grant-pending";

export async function syncGrantedFilesScope(): Promise<"refreshed" | "missing" | "failed"> {
  try {
    const res = await fetch("/api/files-scope/refresh", { method: "POST" });
    if (!res.ok) return "failed";
    const body = (await res.json()) as { refreshed?: boolean };
    return body.refreshed ? "refreshed" : "missing";
  } catch {
    return "failed";
  }
}

function rememberFilesGrantReturn(): void {
  try {
    sessionStorage.setItem(FILES_GRANT_PENDING_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function useResumeFilesGrant(): void {
  useEffect(() => {
    let pending = false;
    try {
      pending = sessionStorage.getItem(FILES_GRANT_PENDING_KEY) === "1";
      if (pending) sessionStorage.removeItem(FILES_GRANT_PENDING_KEY);
    } catch {
      return;
    }
    if (!pending) return;
    void syncGrantedFilesScope().then((synced) => {
      if (synced === "refreshed") window.location.reload();
    });
  }, []);
}

export async function openGrantFilesAccess(
  t?: Translate,
  options?: FilesGrantContext,
): Promise<void> {
  const bridge = appBridge();
  const scopes = bridge.scopes;
  const ctx = resolveFilesGrantContext({
    options,
    config: bridge.config,
    search: window.location.search,
  });
  const installUrl = ctx ? filesGrantInstallUrl(ctx.apiKey, ctx.shop) : null;
  const step = await runFilesGrantFlow({
    request:
      scopes && typeof scopes.request === "function"
        ? () => {
            const pending = scopes.request?.([WRITE_FILES_SCOPE]);
            if (!pending) return Promise.reject(new Error("scopes.request missing"));
            return pending;
          }
        : undefined,
    installUrl,
  });
  if (step === "reload") {
    const synced = await syncGrantedFilesScope();
    if (synced === "refreshed") {
      window.location.reload();
      return;
    }
    if (t) showGrantToast(t("imageTranslate.grantAccessFailed"));
    return;
  }
  if (step === "declined") {
    if (t) showGrantToast(t("imageTranslate.scopeDeclined"));
    return;
  }
  if (step === "open-install" && installUrl) {
    rememberFilesGrantReturn();
    openTop(installUrl);
    return;
  }
  if (t) showGrantToast(t("imageTranslate.grantAccessFailed"));
}
