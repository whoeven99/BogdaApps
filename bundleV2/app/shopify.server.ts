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
const LEGACY_OFFERS_METAFIELD_NAMESPACE = "ciwi_bundle";
const LEGACY_OFFERS_METAFIELD_KEY = "ciwi-bundle-offers";

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
  console.log("[discount][function-id] start querying shopifyFunctions");
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
  console.log("[discount][function-id] query finished", {
    totalFunctions: functionNodes.length,
    targetTitle: CART_LINES_DISCOUNT_FUNCTION_TITLE,
  });
  const targetFn = functionNodes.find(
    (fn: any) =>
      fn?.title === CART_LINES_DISCOUNT_FUNCTION_TITLE &&
      String(fn?.apiType || "").toLowerCase() === "discount",
  );
  const functionId = targetFn?.id ? String(targetFn.id) : null;
  console.log("[discount][function-id] resolve result", {
    functionId,
    found: Boolean(functionId),
  });
  return functionId;
}

export async function syncCartLinesAutomaticDiscountMetafield(
  admin: any,
  metafieldValue?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    console.log("[discount][sync-meta] start", {
      payloadLength: typeof metafieldValue === "string" ? metafieldValue.length : 0,
      appNamespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE,
      legacyNamespace: LEGACY_OFFERS_METAFIELD_NAMESPACE,
    });
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
              id
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
    console.log("[discount][sync-meta] loaded automatic discount nodes", {
      nodeCount: discountNodes.length,
      functionId,
    });
    const matchedDiscounts = discountNodes
      .map((node: any) => {
        const d = node?.discount;
        if (!d || d.__typename !== "DiscountAutomaticApp") return null;
        return {
          nodeId: String(node?.id || ""),
          discountId: String(d?.discountId || ""),
          title: String(d?.title || ""),
          status: String(d?.status || ""),
          discountFunctionId: String(d?.appDiscountType?.functionId || ""),
          functionMatches: d?.appDiscountType?.functionId === functionId,
          titleMatches:
            String(d?.title || "").includes(CART_LINES_DISCOUNT_AUTO_TITLE) ||
            String(d?.title || "").includes(getAutoDiscountTitle()),
        };
      })
      .filter(Boolean);
    console.log("[discount][sync-meta] matched discount diagnostics", {
      targetFunctionId: functionId,
      matchedDiscounts,
    });
    const strictFunctionMatches = matchedDiscounts.filter(
      (d: any) => d && d.functionMatches,
    );
    const fallbackTitleMatches =
      strictFunctionMatches.length === 0
        ? matchedDiscounts.filter((d: any) => d && d.titleMatches)
        : [];
    const targetDiscounts =
      strictFunctionMatches.length > 0 ? strictFunctionMatches : fallbackTitleMatches;
    const ownerIds: string[] = Array.from(
      new Set(
        targetDiscounts.flatMap((d: any) =>
          [d.discountId, d.nodeId].map((id: string) => String(id || "").trim()).filter(Boolean),
        ),
      ),
    );
    const targetDiscountNodeIds: string[] = Array.from(
      new Set(
        targetDiscounts
          .map((d: any) => String(d?.nodeId || "").trim())
          .filter(Boolean),
      ),
    );

    if (!ownerIds.length) {
      console.error("[discount][sync-meta] no owner ids matched function", { functionId });
      return {
        ok: false,
        message: "No automatic app discount owner found for bundle function",
      };
    }
    console.log("[discount][sync-meta] owner ids resolved", {
      ownerCount: ownerIds.length,
      ownerIds,
      targetDiscountNodeIds,
      selectionMode: strictFunctionMatches.length > 0 ? "function_id" : "title_fallback",
    });

    // 先用 discountAutomaticAppUpdate 写入函数 owner 的 metafields（与函数运行时 owner 最稳定对齐）
    for (const discountNodeId of targetDiscountNodeIds) {
      console.log("[discount][sync-meta] updating automatic app discount metafields", {
        discountNodeId,
      });
      const updateResp = await admin.graphql(
        `#graphql
          mutation UpdateAutomaticAppDiscount($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
            discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
              automaticAppDiscount {
                discountId
                title
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
            id: discountNodeId,
            automaticAppDiscount: {
              metafields: [
                {
                  namespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE,
                  key: CART_LINES_DISCOUNT_METAFIELD_KEY,
                  type: "json",
                  value: buildAutomaticDiscountOffersPayload(metafieldValue),
                },
                {
                  namespace: LEGACY_OFFERS_METAFIELD_NAMESPACE,
                  key: LEGACY_OFFERS_METAFIELD_KEY,
                  type: "json",
                  value: buildAutomaticDiscountOffersPayload(metafieldValue),
                },
              ],
            },
          },
        },
      );
      const updateJson = (await updateResp.json()) as {
        data?: {
          discountAutomaticAppUpdate?: {
            userErrors?: Array<{ message?: string }>;
          };
        };
        errors?: Array<{ message?: string }>;
      };
      if (updateJson.errors?.length) {
        console.error("[discount][sync-meta] discountAutomaticAppUpdate graphql errors", {
          discountNodeId,
          errors: updateJson.errors,
        });
      }
      const updateUserErrors =
        updateJson?.data?.discountAutomaticAppUpdate?.userErrors ?? [];
      if (updateUserErrors.length) {
        console.error("[discount][sync-meta] discountAutomaticAppUpdate userErrors", {
          discountNodeId,
          userErrors: updateUserErrors,
        });
      } else {
        console.log("[discount][sync-meta] discountAutomaticAppUpdate success", {
          discountNodeId,
        });
      }
    }

    console.log("[discount][sync-meta] calling metafieldsSet", {
      mutationTargets: ownerIds.length * 2,
    });
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
          metafields: ownerIds.flatMap((ownerId: string) => [
            {
              ownerId,
              namespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE,
              key: CART_LINES_DISCOUNT_METAFIELD_KEY,
              type: "json",
              value: buildAutomaticDiscountOffersPayload(metafieldValue),
            },
            {
              ownerId,
              namespace: LEGACY_OFFERS_METAFIELD_NAMESPACE,
              key: LEGACY_OFFERS_METAFIELD_KEY,
              type: "json",
              value: buildAutomaticDiscountOffersPayload(metafieldValue),
            },
          ]),
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
      console.error("[discount][sync-meta] graphql errors", metafieldsSetJson.errors);
      return {
        ok: false,
        message: metafieldsSetJson.errors.map((e) => e.message || "unknown").join("; "),
      };
    }

    const userErrors = metafieldsSetJson?.data?.metafieldsSet?.userErrors ?? [];
    if (userErrors.length > 0) {
      console.error("[discount][sync-meta] userErrors", userErrors);
      return {
        ok: false,
        message: userErrors.map((e) => e.message || "unknown").join("; "),
      };
    }

    console.log("[discount][sync-meta] success", {
      ownerCount: ownerIds.length,
      payloadLength: typeof metafieldValue === "string" ? metafieldValue.length : 0,
    });
    return { ok: true };
  } catch (error) {
    console.error("[discount][sync-meta] unexpected exception", error);
    const msg = error instanceof Error ? error.message : JSON.stringify(error);
    return { ok: false, message: msg || "Automatic discount metafield sync failed" };
  }
}

export async function ensureCartLinesAutomaticDiscount(admin: any) {
  console.log("[discount][ensure-auto] start ensure automatic discount");
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
  console.log("[discount][ensure-auto] active automatic discounts loaded", {
    nodeCount: discountNodes.length,
    functionId,
  });
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
  console.log("[discount][ensure-auto] no existing active discount, creating new one", {
    functionId,
    title: getAutoDiscountTitle(),
  });

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

