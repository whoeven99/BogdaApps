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

/** Confirm write_files, stamp Session.scope, drop app-only cache. Do not delete the session. */
export async function refreshFilesScopeIfGranted(deps: {
  shop: string;
  graphql: Graphql;
  persistScope: (shop: string, scope: string) => Promise<void>;
  invalidateToken: (shop: string) => void;
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
  await deps.persistScope(deps.shop, handles.join(","));
  deps.invalidateToken(deps.shop);
  return "refreshed";
}
