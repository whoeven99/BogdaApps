export type GraphqlOptions = { variables?: Record<string, unknown>; signal?: AbortSignal };
export type ShopGraphqlClient = {
  graphql: (query: string, options?: GraphqlOptions) => Promise<Response>;
};

export type AppOnlyFailure = {
  code: string;
  shop: string;
  path: string;
  message: string;
};

export type ShopAdminInput = {
  shop: string;
  path?: string;
  silent?: boolean;
};

export type AppOnlyAdminDeps = {
  getToken: (shop: string, input: ShopAdminInput) => Promise<string>;
  invalidate: (shop: string) => void;
  reportFailure: (failure: AppOnlyFailure) => void;
  graphqlUrl: (shop: string) => string;
  fetchImpl?: typeof fetch;
  log?: (line: string) => void;
};

const NOT_INSTALLED = "shop not installed";

/** Matches Shopify SDK `GraphqlQueryError` / `HttpResponseError` field shape. */
export class ShopGraphqlError extends Error {
  readonly graphQLErrors: unknown[];
  constructor(
    name: "GraphqlQueryError" | "HttpResponseError",
    message: string,
    readonly response: Response,
    readonly body: any,
  ) {
    super(message);
    this.name = name;
    this.graphQLErrors = Array.isArray(body?.errors) ? body.errors : [];
  }
  get statusText(): string {
    return this.response.statusText;
  }
}

export function exchangeFailureCode(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(NOT_INSTALLED)) return null;
  const tokenError = error as { name?: string; status?: number; code?: string | null };
  if (tokenError?.name === "ShopAppTokenError") {
    if (tokenError.code === "unavailable_shop") return null;
    return tokenError.code ?? `http_${tokenError.status}`;
  }
  if (/private key|PEM|asymmetric|DECODER/i.test(message)) return "config";
  return "network";
}

function hasAccessDenied(body: any): boolean {
  const errors = Array.isArray(body?.errors) ? body.errors : [];
  return errors.some((e: any) => e?.extensions?.code === "ACCESS_DENIED");
}

function unauthorizedError(): ShopGraphqlError {
  const res = new Response(null, { status: 401, statusText: "Unauthorized" });
  return new ShopGraphqlError(
    "HttpResponseError",
    "Received an error response (401 Unauthorized) from Shopify",
    res,
    null,
  );
}

type Attempt = { kind: "ok"; response: Response } | { kind: "unauthorized" } | { kind: "forbidden"; error: ShopGraphqlError };

export function createAppOnlyAdmin(deps: AppOnlyAdminDeps) {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const log = deps.log ?? ((line: string) => console.info(line));

  async function requestOnce(shop: string, token: string, query: string, options?: GraphqlOptions) {
    const res = await fetchImpl(deps.graphqlUrl(shop), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "X-Shopify-Access-Token": token },
      body: JSON.stringify({ query, variables: options?.variables }),
      signal: options?.signal,
    });
    const text = await res.text();
    let body: any = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    return { res, body, text };
  }

  async function attempt(shop: string, token: string, query: string, options?: GraphqlOptions): Promise<Attempt> {
    const { res, body, text } = await requestOnce(shop, token, query, options);
    if (res.status === 401) return { kind: "unauthorized" };
    if (!res.ok) {
      const err = new ShopGraphqlError(
        "HttpResponseError",
        `Received an error response (${res.status} ${res.statusText}) from Shopify`,
        res,
        body,
      );
      if (res.status === 403) return { kind: "forbidden", error: err };
      throw err;
    }
    if (Array.isArray(body?.errors) && body.errors.length > 0) {
      const err = new ShopGraphqlError("GraphqlQueryError", body.errors[0]?.message ?? "GraphQL operation failed", res, body);
      if (hasAccessDenied(body)) return { kind: "forbidden", error: err };
      throw err;
    }
    return { kind: "ok", response: new Response(text, { status: res.status, headers: res.headers }) };
  }

  function fail(input: ShopAdminInput, path: string, code: string | null, message: string) {
    log(`[app-only-token] shop=${input.shop} path=${path} source=app_only_failed reason=${code ?? "not_installed"}`);
    if (code && !input.silent) deps.reportFailure({ code, shop: input.shop, path, message });
  }

  async function resolveToken(input: ShopAdminInput, path: string, logOk = true): Promise<string> {
    try {
      const token = await deps.getToken(input.shop, input);
      if (logOk) log(`[app-only-token] shop=${input.shop} path=${path} source=app_only`);
      return token;
    } catch (error) {
      fail(input, path, exchangeFailureCode(error), error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  function getShopAdmin(input: ShopAdminInput): ShopGraphqlClient {
    const path = input.path ?? "embedded";
    let logged = false;
    return {
      graphql: async (query, options) => {
        const token = await resolveToken(input, path, !logged);
        logged = true;
        const first = await attempt(input.shop, token, query, options);
        if (first.kind === "ok") return first.response;

        deps.invalidate(input.shop);
        let retriedToken: string;
        try {
          retriedToken = await resolveToken(input, path, false);
        } catch (error) {
          if (first.kind === "forbidden") throw first.error;
          throw error;
        }
        const second = await attempt(input.shop, retriedToken, query, options);
        if (second.kind === "ok") return second.response;
        if (second.kind === "forbidden") throw second.error;

        fail(input, path, "graphql_401", "app-only token rejected with 401 twice");
        throw unauthorizedError();
      },
    };
  }

  async function postShopGraphql(
    input: ShopAdminInput & { query: string; variables?: Record<string, unknown>; timeoutMs?: number },
  ): Promise<any> {
    const signal = input.timeoutMs ? AbortSignal.timeout(input.timeoutMs) : undefined;
    try {
      const res = await getShopAdmin(input).graphql(input.query, { variables: input.variables, signal });
      return await res.json();
    } catch (error) {
      const e = error as { name?: string; body?: unknown };
      if (e?.name === "GraphqlQueryError" && e.body) return e.body;
      throw error;
    }
  }

  return { getShopAdmin, postShopGraphql };
}
