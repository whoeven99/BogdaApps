export const WRITE_FILES_SCOPE = "write_files";

export function hasWriteFilesScope(scope: string | null | undefined): boolean {
  return String(scope ?? "")
    .split(/[\s,]+/)
    .filter(Boolean)
    .includes(WRITE_FILES_SCOPE);
}

export function filesGrantInstallUrl(apiKey: string, shop: string): string {
  const store = String(shop).replace(/\.myshopify\.com$/i, "").split(".")[0];
  return `https://admin.shopify.com/store/${store}/oauth/install?client_id=${encodeURIComponent(apiKey)}`;
}

export function filesGrantRequestOutcome(
  response: { result?: string; detail?: { granted?: string[] } } | null | undefined,
): "granted" | "declined" | "unknown" {
  if (!response) return "unknown";
  if (response.result === "granted-all" || response.result === "granted-partial") return "granted";
  if (response.result === "declined-all") return "declined";
  if (response.detail?.granted?.includes(WRITE_FILES_SCOPE)) return "granted";
  return "unknown";
}

export type FilesGrantContext = { apiKey?: string; shop?: string };

export function resolveFilesGrantContext(input: {
  options?: FilesGrantContext | null;
  config?: FilesGrantContext | null;
  search?: string;
}): { apiKey: string; shop: string } | null {
  const apiKey = String(input.options?.apiKey || input.config?.apiKey || "").trim();
  const shopFromSearch = new URLSearchParams(input.search ?? "").get("shop");
  const shop = String(
    input.options?.shop || input.config?.shop || shopFromSearch || "",
  ).trim();
  if (!apiKey || !shop) return null;
  return { apiKey, shop };
}

export type FilesGrantStep = "reload" | "declined" | "open-install" | "unavailable";

export async function runFilesGrantFlow(args: {
  request?: () => Promise<Parameters<typeof filesGrantRequestOutcome>[0]>;
  installUrl: string | null;
}): Promise<FilesGrantStep> {
  if (typeof args.request === "function") {
    try {
      const outcome = filesGrantRequestOutcome(await args.request());
      if (outcome === "granted") return "reload";
      if (outcome === "declined") return "declined";
    } catch {
      /* App Bridge failed; fall through to oauth/install */
    }
  }
  return args.installUrl ? "open-install" : "unavailable";
}
