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
/** 与 extensions/bundle-delivery-discount-function/shopify.extension.toml 中 name 一致，供 GraphQL 按标题定位 Function */
const DELIVERY_DISCOUNT_FUNCTION_TITLE = "Bundle Delivery Discount Function";
const DELIVERY_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Free Shipping";

function getAutoDiscountTitle(): string {
  const appName = process.env.SHOPIFY_APP_NAME?.trim();
  if (!appName) return CART_LINES_DISCOUNT_AUTO_TITLE;
  return `${appName} - ${CART_LINES_DISCOUNT_AUTO_TITLE}`;
}

function getAutoShippingDiscountTitle(): string {
  const appName = process.env.SHOPIFY_APP_NAME?.trim();
  if (!appName) return DELIVERY_DISCOUNT_AUTO_TITLE;
  return `${appName} - ${DELIVERY_DISCOUNT_AUTO_TITLE}`;
}

export async function ensureCartLinesAutomaticDiscount(admin: any) {
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

  if (!targetFn?.id) {
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
    return d?.appDiscountType?.functionId === targetFn.id;
  });

  if (alreadyExists) {
    console.log("[discount] automatic app discount already exists", {
      functionId: targetFn.id,
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
          functionId: targetFn.id,
          startsAt: new Date().toISOString(),
          discountClasses: ["PRODUCT"],
          combinesWith: {
            orderDiscounts: false,
            productDiscounts: true,
            /** 允许与配送类 Function 折扣叠加（阶梯赠品免邮） */
            shippingDiscounts: true,
          },
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

/**
 * 创建「仅 SHIPPING 类」的 automatic app discount，绑定 cart.delivery-options.discounts.generate.run Function。
 * 与行项目折扣分开：官方要求按 discount class 拆分为不同 automatic discount（或单一 Function 多 class，此处沿用双折扣结构）。
 */
export async function ensureBundleDeliveryAutomaticDiscount(admin: any) {
  // 目标组合策略：运费折扣需要能与商品折扣叠加，才能实现「套装商品折扣 + 免邮」同时生效。
  // 同类运费折扣叠加通常不被允许，因此 shippingDiscounts 关闭。
  const expectedCombinesWith = {
    orderDiscounts: false,
    productDiscounts: true,
    shippingDiscounts: false,
  };

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
      fn?.title === DELIVERY_DISCOUNT_FUNCTION_TITLE &&
      String(fn?.apiType || "").toLowerCase() === "discount",
  );

  if (!targetFn?.id) {
    console.warn("[discount-shipping] target function not found:", DELIVERY_DISCOUNT_FUNCTION_TITLE);
    // 中文关键日志：用于快速确认当前店铺可见的函数列表，排查标题不一致或版本未发布
    console.warn("[discount-shipping] 未找到配送免邮 Function，当前可见 discount functions：", functionNodes
      .filter((fn: any) => String(fn?.apiType || "").toLowerCase() === "discount")
      .map((fn: any) => ({ id: fn?.id, title: fn?.title })));
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
                discountId
                title
                status
                combinesWith {
                  orderDiscounts
                  productDiscounts
                  shippingDiscounts
                }
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
  const existing = discountNodes.find((node: any) => {
    const d = node?.discount;
    if (!d || d.__typename !== "DiscountAutomaticApp") return false;
    if (d?.status !== "ACTIVE") return false;
    return d?.appDiscountType?.functionId === targetFn.id;
  });

  if (existing?.discount) {
    const existingDiscount = existing.discount;
    const existingCombinesWith = existingDiscount?.combinesWith ?? {};
    const needUpdate =
      existingCombinesWith.orderDiscounts !== expectedCombinesWith.orderDiscounts ||
      existingCombinesWith.productDiscounts !== expectedCombinesWith.productDiscounts ||
      existingCombinesWith.shippingDiscounts !== expectedCombinesWith.shippingDiscounts;

    if (!needUpdate) {
      console.log("[discount-shipping] automatic app discount already exists", {
        functionId: targetFn.id,
      });
      return;
    }

    // 已存在但组合策略不匹配：自动修正，避免「折扣创建成功但结账不免邮」。
    const updateResp = await admin.graphql(
      `#graphql
        mutation UpdateAutomaticAppDiscount(
          $id: ID!
          $automaticAppDiscount: DiscountAutomaticAppInput!
        ) {
          discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
            automaticAppDiscount {
              discountId
              title
              status
              combinesWith {
                orderDiscounts
                productDiscounts
                shippingDiscounts
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
          id: existingDiscount.discountId,
          automaticAppDiscount: {
            combinesWith: expectedCombinesWith,
          },
        },
      },
    );
    const updateJson = await updateResp.json();
    const updateErrors = updateJson?.data?.discountAutomaticAppUpdate?.userErrors ?? [];
    if (updateErrors.length > 0) {
      console.error("[discount-shipping] failed to update automatic app discount", updateErrors);
      return;
    }
    console.log("[discount-shipping] automatic app discount combinesWith updated", {
      functionId: targetFn.id,
      combinesWith: expectedCombinesWith,
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
          title: getAutoShippingDiscountTitle(),
          functionId: targetFn.id,
          startsAt: new Date().toISOString(),
          discountClasses: ["SHIPPING"],
          combinesWith: expectedCombinesWith,
        },
      },
    },
  );
  const createJson = await createResp.json();
  const userErrors = createJson?.data?.discountAutomaticAppCreate?.userErrors ?? [];

  if (userErrors.length > 0) {
    console.error("[discount-shipping] failed to create automatic app discount", userErrors);
    return;
  }

  const created = createJson?.data?.discountAutomaticAppCreate?.automaticAppDiscount;
  console.log("[discount-shipping] automatic app discount created", {
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
      try {
        await ensureBundleDeliveryAutomaticDiscount(admin);
      } catch (error) {
        console.error("[discount-shipping] ensure automatic discount failed", error);
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

