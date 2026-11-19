import { hasWriteFilesScope } from "./shopifyFiles";

const INSTALLATION_SCOPES_QUERY = `query CiwiInstallationScopes {
  currentAppInstallation {
    accessScopes { handle }
  }
}`;

type Graphql = (query: string) => Promise<{ json: () => Promise<unknown> }>;

export type FilesScopeRefreshResult = "refreshed" | "missing" | "unavailable";

export function readInstallationScopeHandles(body: unknown): string[] | null {
  if (!body || typeof body !== "object") return null;
  const record = body as {
    errors?: unknown;
    data?: {
      currentAppInstallation?: { accessScopes?: Array<{ handle?: unknown }> } | null;
    };
  };
  if (Array.isArray(record.errors) && record.errors.length > 0) return null;
  const scopes = record.data?.currentAppInstallation?.accessScopes;
  if (!Array.isArray(scopes)) return null;
  return scopes
    .map((scope) => (typeof scope?.handle === "string" ? scope.handle.trim() : ""))
    .filter(Boolean);
}

/** Shopify 已授予 write_files 时删 offline session，下一次 token exchange 才会带上新权限。 */
export async function dropOfflineSessionIfFilesGranted(deps: {
  shop: string;
  graphql: Graphql;
  deleteOfflineSessions: (shop: string) => Promise<void>;
}): Promise<FilesScopeRefreshResult> {
  let body: unknown;
  try {
    const response = await deps.graphql(INSTALLATION_SCOPES_QUERY);
    body = await response.json();
  } catch {
    return "unavailable";
  }
  const handles = readInstallationScopeHandles(body);
  if (!handles) return "unavailable";
  if (!hasWriteFilesScope(handles.join(","))) return "missing";
  await deps.deleteOfflineSessions(deps.shop);
  return "refreshed";
}
