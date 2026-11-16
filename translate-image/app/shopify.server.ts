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
import { bootMark, bootStep } from "./server/bootTrace.server";
import { getShopAdmin } from "./server/shop/shopAdminToken.server";

ensureRuntimeEnv();

const shopify = shopifyApp({
  apiKey: normalizeEnvValue(process.env.SHOPIFY_API_KEY),
  apiSecretKey: normalizeEnvValue(process.env.SHOPIFY_API_SECRET),
  apiVersion: SHOPIFY_ADMIN_API_VERSION as ApiVersion,
  scopes: process.env.SCOPES?.split(","),
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
  return bootStep("auth", request, async () => {
    const ctx = await shopify.authenticate.admin(request);
    bootMark(
      "auth session",
      `shop=${ctx.session.shop} online=${ctx.session.isOnline}`,
    );
    const admin = getShopAdmin({ shop: ctx.session.shop });
    return { ...ctx, admin: admin as unknown as typeof ctx.admin };
  });
}) as typeof shopify.authenticate.admin;

/** `admin.graphql` always uses an application-only token. */
export const authenticate = { ...shopify.authenticate, admin: authenticateAdmin };
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
