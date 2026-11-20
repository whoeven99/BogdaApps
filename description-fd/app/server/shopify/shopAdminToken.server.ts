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

let provider: ReturnType<typeof createShopAppTokenProvider> | null = null;

export function hasAppOnlyCredentials(): boolean {
  return Boolean(shopifyApiKey() && env("SHOPIFY_APP_ONLY_KEY_ID") && env("SHOPIFY_APP_ONLY_PRIVATE_KEY"));
}

function getProvider() {
  if (!hasAppOnlyCredentials()) {
    throw new Error("SHOPIFY_APP_ONLY_KEY_ID / SHOPIFY_APP_ONLY_PRIVATE_KEY are not set");
  }
  if (!provider) {
    provider = createShopAppTokenProvider({
      clientId: shopifyApiKey(),
      keyId: env("SHOPIFY_APP_ONLY_KEY_ID"),
      privateKeyPem: env("SHOPIFY_APP_ONLY_PRIVATE_KEY").replace(/\\n/g, "\n"),
      async beforeExchange(shop: string) {
        const installed = await isShopInstalled(shop);
        if (!installed) {
          throw new Error(`Shop is not installed: ${shop}`);
        }
      },
    });
  }
  return provider;
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

async function resolveToken(shop: string): Promise<string> {
  const issued = await getProvider().getToken(shop);
  return issued.accessToken;
}

export async function getShopAdminGraphql(shop: string): Promise<ShopAdminGraphql> {
  getProvider();
  return async (query, options) => {
    let token = await resolveToken(shop);
    let response = await fetchGraphql(shop, token, query, options?.variables);
    if (response.status === 401) {
      getProvider().invalidate(shop);
      token = await resolveToken(shop);
      response = await fetchGraphql(shop, token, query, options?.variables);
    }
    return response;
  };
}

export async function shopAdminGraphqlJson<T = unknown>(
  shop: string,
  query: string,
  variables?: GraphqlVariables,
): Promise<T> {
  const graphql = await getShopAdminGraphql(shop);
  const response = await graphql(query, { variables });
  return (await response.json()) as T;
}
