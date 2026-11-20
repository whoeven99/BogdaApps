import { buildShopifyAdminGraphqlUrl } from "../../lib/shopifyAdminApiVersion";
import { createShopAppTokenProvider } from "./shopAppToken.server";
import { isShopInstalled } from "./offlineSessionToken.server";

type GraphqlVariables = Record<string, unknown> | undefined;

export type ShopAdminGraphql = (
  query: string,
  options?: { variables?: GraphqlVariables },
) => Promise<Response>;

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function shopifyApiKey(): string {
  return env("SHOPIFY_API_KEY") || env("SHOPIFY_CLIENT_ID");
}

type TokenProvider = ReturnType<typeof createShopAppTokenProvider>;

export type ShopAdminTokenOptions = {
  allowDeletedAccount?: boolean;
};

let installedProvider: TokenProvider | null = null;
let redactProvider: TokenProvider | null = null;

export function hasAppOnlyCredentials(): boolean {
  return Boolean(shopifyApiKey() && env("SHOPIFY_APP_ONLY_KEY_ID") && env("SHOPIFY_APP_ONLY_PRIVATE_KEY"));
}

function createProvider(beforeExchange?: (shop: string) => Promise<void>): TokenProvider {
  return createShopAppTokenProvider({
    clientId: shopifyApiKey(),
    keyId: env("SHOPIFY_APP_ONLY_KEY_ID"),
    privateKeyPem: env("SHOPIFY_APP_ONLY_PRIVATE_KEY").replace(/\\n/g, "\n"),
    beforeExchange,
  });
}

function getProvider(allowDeletedAccount = false): TokenProvider {
  if (!hasAppOnlyCredentials()) {
    throw new Error("SHOPIFY_APP_ONLY_KEY_ID / SHOPIFY_APP_ONLY_PRIVATE_KEY are not set");
  }
  if (allowDeletedAccount) {
    if (!redactProvider) redactProvider = createProvider();
    return redactProvider;
  }
  if (!installedProvider) {
    installedProvider = createProvider(async (shop: string) => {
      const installed = await isShopInstalled(shop);
      if (!installed) {
        throw new Error(`Shop is not installed: ${shop}`);
      }
    });
  }
  return installedProvider;
}

async function fetchGraphql(
  shop: string,
  accessToken: string,
  query: string,
  variables?: GraphqlVariables,
): Promise<Response> {
  return fetch(buildShopifyAdminGraphqlUrl(shop), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken,
    },
    body: JSON.stringify({ query, variables }),
  });
}

async function resolveToken(shop: string, allowDeletedAccount = false): Promise<string> {
  const issued = await getProvider(allowDeletedAccount).getToken(shop);
  return issued.accessToken;
}

export async function getShopAdminGraphql(
  shop: string,
  options?: ShopAdminTokenOptions,
): Promise<ShopAdminGraphql> {
  const allowDeletedAccount = options?.allowDeletedAccount === true;
  getProvider(allowDeletedAccount);
  return async (query, requestOptions) => {
    let token = await resolveToken(shop, allowDeletedAccount);
    let response = await fetchGraphql(shop, token, query, requestOptions?.variables);
    if (response.status === 401) {
      getProvider(allowDeletedAccount).invalidate(shop);
      token = await resolveToken(shop, allowDeletedAccount);
      response = await fetchGraphql(shop, token, query, requestOptions?.variables);
    }
    return response;
  };
}

export async function shopAdminGraphqlJson<T = unknown>(
  shop: string,
  query: string,
  variables?: GraphqlVariables,
  options?: ShopAdminTokenOptions,
): Promise<T> {
  const graphql = await getShopAdminGraphql(shop, options);
  const response = await graphql(query, { variables });
  return (await response.json()) as T;
}
