import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

const CART_LINES_DISCOUNT_FUNCTION_TITLE = "Bundle Cart Discount Function";
const CART_LINES_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Discount";
const CART_LINES_DISCOUNT_METAFIELD_NAMESPACE = "$app:ciwi_bundle";
const CART_LINES_DISCOUNT_METAFIELD_KEY = "offers";

function getAutoDiscountTitle(): string {
  const appName = process.env.SHOPIFY_APP_NAME?.trim();
  if (!appName) return CART_LINES_DISCOUNT_AUTO_TITLE;
  return `${appName} - ${CART_LINES_DISCOUNT_AUTO_TITLE}`;
}

function buildAutomaticDiscountOffersPayload(value?: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return JSON.stringify({
    updatedAt: new Date().toISOString(),
    offers: [],
  });
}

async function getCartLinesDiscountFunctionId(admin: any): Promise<string | null> {
  const functionsResp = await admin.graphql(
    `#graphql
      query AppDiscountFunctions {
        shopifyFunctions(first: 100) {
          nodes {
            id
            title
            apiType
          }
        }
      }
    `,
  );
  const functionsJson = await functionsResp.json();
  const functionNodes = functionsJson?.data?.shopifyFunctions?.nodes ?? [];
  const targetFn = functionNodes.find(
    (fn: any) =>
      fn?.title === CART_LINES_DISCOUNT_FUNCTION_TITLE &&
      String(fn?.apiType || "").toLowerCase() === "discount",
  );

  return targetFn?.id ? String(targetFn.id) : null;
}

export async function syncCartLinesAutomaticDiscountMetafield(
  admin: any,
  metafieldValue?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const functionId = await getCartLinesDiscountFunctionId(admin);
    if (!functionId) {
      return {
        ok: false,
        message: `Target function not found: ${CART_LINES_DISCOUNT_FUNCTION_TITLE}`,
      };
    }

    const existingResp = await admin.graphql(
      `#graphql
        query ExistingAutomaticAppDiscounts {
          discountNodes(first: 100, query: "method:automatic") {
            nodes {
              discount {
                __typename
                ... on DiscountAutomaticApp {
                  discountId
                  title
                  status
                  appDiscountType {
                    functionId
                  }
                }
              }
            }
          }
        }
      `,
    );
    const existingJson = await existingResp.json();
    const discountNodes = existingJson?.data?.discountNodes?.nodes ?? [];
    const ownerIds = discountNodes
      .map((node: any) => node?.discount)
      .filter(
        (discount: any) =>
          discount?.__typename === "DiscountAutomaticApp" &&
          discount?.appDiscountType?.functionId === functionId &&
          discount?.discountId,
      )
      .map((discount: any) => String(discount.discountId));

    if (!ownerIds.length) {
      return {
        ok: false,
        message: "No automatic app discount owner found for bundle function",
      };
    }

    const metafieldsSetResponse = await admin.graphql(
      `#graphql
        mutation SetBundleAutomaticDiscountMetafields($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
            }
            userErrors {
              field
              message
            }
          }
        }
      `,
      {
        variables: {
          metafields: ownerIds.map((ownerId: string) => ({
            ownerId,
            namespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE,
            key: CART_LINES_DISCOUNT_METAFIELD_KEY,
            type: "json",
            value: buildAutomaticDiscountOffersPayload(metafieldValue),
          })),
        },
      },
    );

    const metafieldsSetJson = (await metafieldsSetResponse.json()) as {
      data?: {
        metafieldsSet?: {
          userErrors?: Array<{ message?: string }>;
        };
      };
      errors?: Array<{ message?: string }>;
    };

    if (metafieldsSetJson.errors?.length) {
      return {
        ok: false,
        message: metafieldsSetJson.errors.map((e) => e.message || "unknown").join("; "),
      };
    }

    const userErrors = metafieldsSetJson?.data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      return {
        ok: false,
        message: userErrors.map((e) => e.message || "unknown").join("; "),
      };
    }

    return { ok: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, message: msg || "Automatic discount metafield sync failed" };
  }
}

export async function ensureCartLinesAutomaticDiscount(admin: any) {
  const functionId = await getCartLinesDiscountFunctionId(admin);
  if (!functionId) {
    console.warn(
      "[discount] target function not found:",
      CART_LINES_DISCOUNT_FUNCTION_TITLE,
    );
    return;
  }

  const existingResp = await admin.graphql(
    `#graphql
      query ExistingAutomaticAppDiscounts {
        discountNodes(first: 100, query: "method:automatic AND status:active") {
          nodes {
            discount {
              __typename
              ... on DiscountAutomaticApp {
                title
                status
                appDiscountType {
                  functionId
                }
              }
            }
          }
        }
      }
    `,
  );
  const existingJson = await existingResp.json();
  const discountNodes = existingJson?.data?.discountNodes?.nodes ?? [];
  const alreadyExists = discountNodes.some((node: any) => {
    const d = node?.discount;
    if (!d || d.__typename !== "DiscountAutomaticApp") return false;
    // 只有状态为 ACTIVE 的折扣才被认为是有效的
    if (d?.status !== "ACTIVE") return false;
    return d?.appDiscountType?.functionId === functionId;
  });

  if (alreadyExists) {
    console.log("[discount] automatic app discount already exists", {
      functionId,
    });
    return;
  }

  const createResp = await admin.graphql(
    `#graphql
      mutation CreateAutomaticAppDiscount($automaticAppDiscount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $automaticAppDiscount) {
          automaticAppDiscount {
            discountId
            title
            status
            appDiscountType {
              functionId
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `,
    {
      variables: {
        automaticAppDiscount: {
          title: getAutoDiscountTitle(),
          functionId,
          startsAt: new Date().toISOString(),
          discountClasses: ["PRODUCT"],
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: true,
            shippingDiscounts: false,
          },
          metafields: [
            {
              namespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE,
              key: CART_LINES_DISCOUNT_METAFIELD_KEY,
              type: "json",
              value: buildAutomaticDiscountOffersPayload(),
            },
          ],
        },
      },
    },
  );
  const createJson = await createResp.json();
  const userErrors =
    createJson?.data?.discountAutomaticAppCreate?.userErrors ?? [];

  if (userErrors.length > 0) {
    console.error("[discount] failed to create automatic app discount", userErrors);
    return;
  }

  const created =
    createJson?.data?.discountAutomaticAppCreate?.automaticAppDiscount;
  console.log("[discount] automatic app discount created", {
    title: created?.title,
    status: created?.status,
    functionId: created?.appDiscountType?.functionId,
  });
}

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma) as any,
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  hooks: {
    afterAuth: async ({ admin }) => {
      try {
        await ensureCartLinesAutomaticDiscount(admin);
      } catch (error) {
        console.error("[discount] ensure automatic discount failed", error);
      }
    },
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;

