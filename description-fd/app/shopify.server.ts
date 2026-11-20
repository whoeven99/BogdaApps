import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { ensureRuntimeEnv } from "./config/runtimeEnv.server";
import { withAppOnlyAdmin } from "./server/shopify/appOnlyAdmin.server";
import { hasAppOnlyCredentials } from "./server/shopify/shopAdminToken.server";

ensureRuntimeEnv();

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
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
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;

const authenticateAdmin = (async (request: Request) => {
  const ctx = await shopify.authenticate.admin(request);
  if (!hasAppOnlyCredentials()) {
    console.warn("[app-only] credentials missing; using session GraphQL");
    return ctx;
  }
  return withAppOnlyAdmin(ctx);
}) as typeof shopify.authenticate.admin;

export const authenticate = { ...shopify.authenticate, admin: authenticateAdmin };
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
