import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import {
  ensureRuntimeEnv,
  normalizeEnvValue,
} from "./config/runtimeEnv.server";
import { SHOPIFY_ADMIN_API_VERSION } from "./lib/shopifyAdminApiVersion";
import { getShopAdminGraphql } from "./server/shopify/shopAdminToken.server";
import { isShopInstalled } from "./server/shopify/offlineSessionToken.server";
import {
  buildUnauthenticatedAppOnlyAdmin,
  replaceWebhookAdminIfPresent,
} from "./server/shopify/shopifyAuthWrap";
import { ensureJobRunner } from "./server/generateJob/runner.server";

ensureRuntimeEnv();

const shopify = shopifyApp({
  apiKey: normalizeEnvValue(process.env.SHOPIFY_API_KEY),
  apiSecretKey: normalizeEnvValue(process.env.SHOPIFY_API_SECRET),
  apiVersion: SHOPIFY_ADMIN_API_VERSION as ApiVersion,
  scopes: normalizeEnvValue(process.env.SCOPES).split(",").filter(Boolean),
  appUrl: normalizeEnvValue(process.env.SHOPIFY_APP_URL),
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = SHOPIFY_ADMIN_API_VERSION as ApiVersion;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;

const authenticateAdmin = (async (request: Request) => {
  const ctx = await shopify.authenticate.admin(request);
  const graphql = await getShopAdminGraphql(ctx.session.shop);
  return { ...ctx, admin: { ...ctx.admin, graphql } };
}) as typeof shopify.authenticate.admin;

const authenticateWebhook = (async (request: Request) => {
  const ctx = await shopify.authenticate.webhook(request);
  return replaceWebhookAdminIfPresent(ctx, (shop) => ({
    graphql: async (query: string, options?: { variables?: Record<string, unknown> }) => {
      const graphql = await getShopAdminGraphql(shop);
      return graphql(query, options);
    },
  }));
}) as typeof shopify.authenticate.webhook;

const unauthenticatedAdmin = (async (shop: string) =>
  buildUnauthenticatedAppOnlyAdmin({
    shop,
    isInstalled: isShopInstalled,
    createAdmin: (normalized) => ({
      graphql: async (query: string, options?: { variables?: Record<string, unknown> }) => {
        const graphql = await getShopAdminGraphql(normalized);
        return graphql(query, options);
      },
    }),
  })) as typeof shopify.unauthenticated.admin;

export const authenticate = {
  ...shopify.authenticate,
  admin: authenticateAdmin,
  webhook: authenticateWebhook,
};
export const unauthenticated = { ...shopify.unauthenticated, admin: unauthenticatedAdmin };
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

ensureJobRunner();
