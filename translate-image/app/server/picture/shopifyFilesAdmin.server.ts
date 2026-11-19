import { hasWriteFilesScope, type ShopifyFilesGraphql } from "./shopifyFiles";

type AdminGraphqlClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

export function adminFilesGraphql(admin: AdminGraphqlClient): ShopifyFilesGraphql {
  return async (query, variables) => {
    const response = await admin.graphql(query, { variables });
    const body = (await response.json()) as {
      data?: unknown;
      errors?: Array<{ message?: string; extensions?: { code?: string } }>;
    };
    if (body.errors?.length) {
      throw new Error(
        body.errors
          .map((e) => `${e.extensions?.code ?? ""} ${e.message ?? "GraphQL error"}`.trim())
          .join("; "),
      );
    }
    return body.data;
  };
}

export function sessionCanWriteFiles(session: { scope?: string | null }): boolean {
  return hasWriteFilesScope(session.scope);
}
