import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { sanitizeEnvLikeValue, sanitizeUrlLikeEnvValue } from "./utils/env";

const CART_LINES_DISCOUNT_FUNCTION_TITLE = "Bundle Cart Discount Function";
const CART_LINES_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Discount";
const CART_LINES_PRODUCT_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Product Discount";
const CART_LINES_ORDER_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Order Discount";
/** 与 extensions/bundle-delivery-discount-function/shopify.extension.toml 中 name 一致，供 GraphQL 按标题定位 Function */
const DELIVERY_DISCOUNT_FUNCTION_TITLE = "Bundle Delivery Discount Function";
const DELIVERY_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Free Shipping";
const CART_LINES_DISCOUNT_METAFIELD_NAMESPACE = "$app:ciwi_bundle";
const CART_LINES_DISCOUNT_DEFAULT_APP_NAMESPACE = "$app";
const CART_LINES_DISCOUNT_METAFIELD_KEY = "offers";
type AutomaticAppDiscountCombinesWith = {
  orderDiscounts: boolean;
  productDiscounts: boolean;
  shippingDiscounts: boolean;
};

type CartLinesAutomaticDiscountConfig = {
  key: "product" | "order";
  legacy?: boolean;
  title: string;
  discountClasses: readonly string[];
  combinesWith: AutomaticAppDiscountCombinesWith;
};

const CART_LINES_PRODUCT_DISCOUNT_EXPECTED_COMBINES_WITH = {
  // 拆分为两条 automatic discount 后，需要允许与订单折扣 node 同时生效。
  orderDiscounts: true,
  productDiscounts: true,
  // 允许与配送类 Function 折扣叠加（阶梯赠品免邮）
  shippingDiscounts: true,
} as const satisfies AutomaticAppDiscountCombinesWith;

const CART_LINES_ORDER_DISCOUNT_EXPECTED_COMBINES_WITH = {
  orderDiscounts: false,
  productDiscounts: true,
  shippingDiscounts: true,
} as const satisfies AutomaticAppDiscountCombinesWith;

function getAutoDiscountTitle(): string {
  const appName = sanitizeEnvLikeValue(process.env.SHOPIFY_APP_NAME);
  if (!appName) return CART_LINES_DISCOUNT_AUTO_TITLE;
  return `${appName} - ${CART_LINES_DISCOUNT_AUTO_TITLE}`;
}

function getAutoProductDiscountTitle(): string {
  const appName = sanitizeEnvLikeValue(process.env.SHOPIFY_APP_NAME);
  if (!appName) return CART_LINES_PRODUCT_DISCOUNT_AUTO_TITLE;
  return `${appName} - ${CART_LINES_PRODUCT_DISCOUNT_AUTO_TITLE}`;
}

function getAutoOrderDiscountTitle(): string {
  const appName = sanitizeEnvLikeValue(process.env.SHOPIFY_APP_NAME);
  if (!appName) return CART_LINES_ORDER_DISCOUNT_AUTO_TITLE;
  return `${appName} - ${CART_LINES_ORDER_DISCOUNT_AUTO_TITLE}`;
}

function getAutoShippingDiscountTitle(): string {
  const appName = sanitizeEnvLikeValue(process.env.SHOPIFY_APP_NAME);
  if (!appName) return DELIVERY_DISCOUNT_AUTO_TITLE;
  return `${appName} - ${DELIVERY_DISCOUNT_AUTO_TITLE}`;
}

function getExpectedCartLinesAutomaticDiscountConfigs(): CartLinesAutomaticDiscountConfig[] {
  return [
    {
      key: "product",
      title: getAutoProductDiscountTitle(),
      discountClasses: ["PRODUCT"],
      combinesWith: CART_LINES_PRODUCT_DISCOUNT_EXPECTED_COMBINES_WITH,
    },
    {
      key: "order",
      title: getAutoOrderDiscountTitle(),
      discountClasses: ["ORDER"],
      combinesWith: CART_LINES_ORDER_DISCOUNT_EXPECTED_COMBINES_WITH,
    },
  ];
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

async function resolveShopifyDiscountFunctionIdByExactTitle(
  admin: any,
  exactTitle: string,
): Promise<string | null> {
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
      fn?.title === exactTitle && String(fn?.apiType || "").toLowerCase() === "discount",
  );
  return targetFn?.id ? String(targetFn.id) : null;
}

type AutomaticDiscountOwnerCollection = {
  ownerIds: string[];
  targetDiscountNodeIds: string[];
  diagnostics: {
    targetFunctionId: string;
    matchedDiscounts: unknown[];
    strictMatchCount: number;
  };
};

function collectAutomaticDiscountOwnersForFunctionId(params: {
  discountNodes: any[];
  functionId: string;
  titleSubstrings: string[];
}): AutomaticDiscountOwnerCollection | null {
  const { discountNodes, functionId, titleSubstrings } = params;
  const matchedDiscounts = discountNodes
    .map((node: any) => {
      const d = node?.discount;
      if (!d || d.__typename !== "DiscountAutomaticApp") return null;
      const title = String(d?.title || "");
      return {
        nodeId: String(node?.id || ""),
        discountId: String(d?.discountId || ""),
        title,
        status: String(d?.status || ""),
        discountFunctionId: String(d?.appDiscountType?.functionId || ""),
        functionMatches: d?.appDiscountType?.functionId === functionId,
        titleMatches: titleSubstrings.some((candidate) => title.includes(candidate)),
      };
    })
    .filter(Boolean);
  const strictFunctionMatches = matchedDiscounts.filter((d: any) => d?.functionMatches);
  const fallbackTitleMatches =
    strictFunctionMatches.length === 0
      ? matchedDiscounts.filter((d: any) => d?.titleMatches)
      : [];
  const targetDiscounts =
    strictFunctionMatches.length > 0 ? strictFunctionMatches : fallbackTitleMatches;
  if (!targetDiscounts.length) return null;

  const ownerIds: string[] = Array.from(
    new Set(
      targetDiscounts.flatMap((d: any) =>
        [d.discountId, d.nodeId].map((id: string) => String(id || "").trim()).filter(Boolean),
      ),
    ),
  );
  const targetDiscountNodeIds: string[] = Array.from(
    new Set(
      targetDiscounts.map((d: any) => String(d?.nodeId || "").trim()).filter(Boolean),
    ),
  );

  return {
    ownerIds,
    targetDiscountNodeIds,
    diagnostics: {
      targetFunctionId: functionId,
      matchedDiscounts,
      strictMatchCount: strictFunctionMatches.length,
    },
  };
}

async function getCartLinesDiscountFunctionId(admin: any): Promise<string | null> {
  console.log("[discount][function-id] start querying shopifyFunctions");
  const functionId = await resolveShopifyDiscountFunctionIdByExactTitle(
    admin,
    CART_LINES_DISCOUNT_FUNCTION_TITLE,
  );
  console.log("[discount][function-id] resolve result", {
    functionId,
    found: Boolean(functionId),
    targetTitle: CART_LINES_DISCOUNT_FUNCTION_TITLE,
  });
  return functionId;
}

async function getDeliveryDiscountFunctionIdForSync(admin: any): Promise<string | null> {
  const functionId = await resolveShopifyDiscountFunctionIdByExactTitle(
    admin,
    DELIVERY_DISCOUNT_FUNCTION_TITLE,
  );
  console.log("[discount-shipping][function-id] resolve result", {
    functionId,
    found: Boolean(functionId),
    targetTitle: DELIVERY_DISCOUNT_FUNCTION_TITLE,
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
      cartLinesFunctionId: functionId,
    });

    const cartOwners = collectAutomaticDiscountOwnersForFunctionId({
      discountNodes,
      functionId,
      titleSubstrings: [
        CART_LINES_DISCOUNT_AUTO_TITLE,
        getAutoDiscountTitle(),
        CART_LINES_PRODUCT_DISCOUNT_AUTO_TITLE,
        getAutoProductDiscountTitle(),
        CART_LINES_ORDER_DISCOUNT_AUTO_TITLE,
        getAutoOrderDiscountTitle(),
      ],
    });
    console.log("[discount][sync-meta] matched discount diagnostics (cart lines)", {
      cartOwners: cartOwners?.diagnostics ?? null,
    });

    const shippingFunctionId = await getDeliveryDiscountFunctionIdForSync(admin);
    const shippingOwners = shippingFunctionId
      ? collectAutomaticDiscountOwnersForFunctionId({
          discountNodes,
          functionId: shippingFunctionId,
          titleSubstrings: [
            DELIVERY_DISCOUNT_AUTO_TITLE,
            getAutoShippingDiscountTitle(),
          ],
        })
      : null;
    if (shippingOwners) {
      console.log("[discount][sync-meta] matched discount diagnostics (delivery shipping)", {
        shippingOwners: shippingOwners.diagnostics,
      });
    } else if (shippingFunctionId) {
      console.warn(
        "[discount][sync-meta] delivery Function id resolved but no automatic discount owner matched titles",
      );
    }

    const ownerIds: string[] = Array.from(
      new Set([...(cartOwners?.ownerIds ?? []), ...(shippingOwners?.ownerIds ?? [])]),
    );
    const targetDiscountNodeIds: string[] = Array.from(
      new Set([
        ...(cartOwners?.targetDiscountNodeIds ?? []),
        ...(shippingOwners?.targetDiscountNodeIds ?? []),
      ]),
    );

    if (!ownerIds.length) {
      console.error("[discount][sync-meta] no owner ids matched cart or shipping functions", {
        cartLinesFunctionId: functionId,
        shippingFunctionId,
      });
      return {
        ok: false,
        message:
          "No automatic app discount owner found for bundle cart lines or delivery discount functions",
      };
    }

    console.log("[discount][sync-meta] merged owner ids resolved", {
      ownerCount: ownerIds.length,
      ownerIds,
      targetDiscountNodeIds,
      matchedCartOwners: cartOwners != null,
      matchedShippingOwners: shippingOwners != null,
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
                  namespace: CART_LINES_DISCOUNT_DEFAULT_APP_NAMESPACE,
                  key: CART_LINES_DISCOUNT_METAFIELD_KEY,
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
              namespace: CART_LINES_DISCOUNT_DEFAULT_APP_NAMESPACE,
              key: CART_LINES_DISCOUNT_METAFIELD_KEY,
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
    for (const discountNodeId of targetDiscountNodeIds) {
      const verifyResp = await admin.graphql(
        `#graphql
          query VerifyDiscountMetafields($id: ID!) {
            discountNode(id: $id) {
              id
              appOwnedOffers: metafield(namespace: "$app:ciwi_bundle", key: "offers") {
                value
              }
              defaultAppOffers: metafield(namespace: "$app", key: "offers") {
                value
              }
            }
          }
        `,
        { variables: { id: discountNodeId } },
      );
      const verifyJson = await verifyResp.json();
      const node = verifyJson?.data?.discountNode;
      console.log("[discount][sync-meta] verify discount metafields", {
        discountNodeId,
        appOwnedLen: String(node?.appOwnedOffers?.value || "").length,
        defaultAppLen: String(node?.defaultAppOffers?.value || "").length,
      });
    }
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
            id
            discount {
              __typename
              ... on DiscountAutomaticApp {
                discountId
                title
                status
                discountClasses
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
  const expectedConfigs = getExpectedCartLinesAutomaticDiscountConfigs();
  console.log("[discount][ensure-auto] active automatic discounts loaded", {
    nodeCount: discountNodes.length,
    functionId,
    expectedTitles: expectedConfigs.map((config) => config.title),
  });
  const existingCartDiscounts = discountNodes
    .map((node: any) => {
      const d = node?.discount;
      if (!d || d.__typename !== "DiscountAutomaticApp") return null;
      if (d?.status !== "ACTIVE") return null;
      if (d?.appDiscountType?.functionId !== functionId) return null;
      const currentClasses = Array.isArray(d?.discountClasses)
        ? d.discountClasses.map((value: unknown) => String(value || "").trim())
        : [];
      return {
        nodeId: String(node?.id || ""),
        discountId: String(d?.discountId || ""),
        title: String(d?.title || ""),
        status: String(d?.status || ""),
        discountClasses: currentClasses,
        combinesWith: d?.combinesWith ?? {},
      };
    })
    .filter(Boolean);

  console.log("[discount][ensure-auto] active cart discount nodes for function", {
    functionId,
    count: existingCartDiscounts.length,
    discounts: existingCartDiscounts,
  });

  const existingByTitle = new Map(
    existingCartDiscounts.map((discount: any) => [discount.title, discount]),
  );
  const assignedNodeIds = new Set<string>();
  const reusableLegacyDiscounts = existingCartDiscounts.filter(
    (discount: any) =>
      !expectedConfigs.some((config) => config.title === discount.title),
  );

  for (const config of expectedConfigs) {
    let targetDiscount =
      existingByTitle.get(config.title) ??
      reusableLegacyDiscounts.find(
        (discount: any) => !assignedNodeIds.has(String(discount.nodeId || "")),
      ) ??
      null;

    if (targetDiscount) {
      assignedNodeIds.add(String(targetDiscount.nodeId || ""));
      const currentClasses = Array.isArray(targetDiscount.discountClasses)
        ? targetDiscount.discountClasses
        : [];
      const currentCombinesWith = targetDiscount.combinesWith ?? {};
      const needsUpdate =
        String(targetDiscount.title || "") !== config.title ||
        currentClasses.length !== config.discountClasses.length ||
        config.discountClasses.some((value) => !currentClasses.includes(value)) ||
        currentCombinesWith.orderDiscounts !== config.combinesWith.orderDiscounts ||
        currentCombinesWith.productDiscounts !== config.combinesWith.productDiscounts ||
        currentCombinesWith.shippingDiscounts !== config.combinesWith.shippingDiscounts;

      console.log("[discount] cart automatic app discount resolved", {
        key: config.key,
        functionId,
        discountNodeId: targetDiscount.nodeId,
        discountId: targetDiscount.discountId,
        currentTitle: targetDiscount.title,
        targetTitle: config.title,
        discountClasses: currentClasses,
        targetClasses: config.discountClasses,
        combinesWith: currentCombinesWith,
        targetCombinesWith: config.combinesWith,
        needsUpdate,
      });

      if (needsUpdate) {
        const updateResp = await admin.graphql(
          `#graphql
            mutation UpdateAutomaticAppDiscount($id: ID!, $automaticAppDiscount: DiscountAutomaticAppInput!) {
              discountAutomaticAppUpdate(id: $id, automaticAppDiscount: $automaticAppDiscount) {
                automaticAppDiscount {
                  discountId
                  title
                  status
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
              id: String(targetDiscount.nodeId || ""),
              automaticAppDiscount: {
                title: config.title,
                discountClasses: [...config.discountClasses],
                combinesWith: config.combinesWith,
              },
            },
          },
        );
        const updateJson = await updateResp.json();
        const userErrors =
          updateJson?.data?.discountAutomaticAppUpdate?.userErrors ?? [];
        if (userErrors.length > 0) {
          console.error(
            "[discount] failed to update cart automatic app discount to expected config",
            {
              key: config.key,
              userErrors,
            },
          );
        } else {
          console.log("[discount] cart automatic app discount config updated", {
            key: config.key,
            functionId,
            discountNodeId: targetDiscount.nodeId,
            title: config.title,
            discountClasses: config.discountClasses,
            combinesWith: config.combinesWith,
          });
        }
      }
      continue;
    }

    console.log("[discount][ensure-auto] missing cart discount node, creating new one", {
      key: config.key,
      functionId,
      title: config.title,
      discountClasses: config.discountClasses,
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
            title: config.title,
            functionId,
            startsAt: new Date().toISOString(),
            discountClasses: [...config.discountClasses],
            combinesWith: config.combinesWith,
            metafields: [
              {
                namespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE,
                key: CART_LINES_DISCOUNT_METAFIELD_KEY,
                type: "json",
                value: buildAutomaticDiscountOffersPayload(),
              },
              {
                namespace: CART_LINES_DISCOUNT_DEFAULT_APP_NAMESPACE,
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
      console.error("[discount] failed to create cart automatic app discount", {
        key: config.key,
        userErrors,
      });
      continue;
    }

    const created =
      createJson?.data?.discountAutomaticAppCreate?.automaticAppDiscount;
    console.log("[discount] cart automatic app discount created", {
      key: config.key,
      title: created?.title,
      status: created?.status,
      functionId: created?.appDiscountType?.functionId,
    });
  }

  const extraActiveDiscounts = existingCartDiscounts.filter(
    (discount: any) => !assignedNodeIds.has(String(discount.nodeId || "")),
  );
  if (extraActiveDiscounts.length > 0) {
    console.warn("[discount][ensure-auto] extra active cart discount nodes remain", {
      functionId,
      extraActiveDiscounts,
    });
  }
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

export async function reconcileBundleAutomaticDiscounts(admin: any): Promise<void> {
  try {
    await ensureCartLinesAutomaticDiscount(admin);
  } catch (error) {
    console.error("[discount] reconcile automatic discount failed", error);
  }

  try {
    await ensureBundleDeliveryAutomaticDiscount(admin);
  } catch (error) {
    console.error("[discount-shipping] reconcile automatic discount failed", error);
  }
}

const shopify = shopifyApp({
  apiKey: sanitizeEnvLikeValue(process.env.SHOPIFY_API_KEY),
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: sanitizeUrlLikeEnvValue(process.env.SHOPIFY_APP_URL),
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma) as any,
  distribution: AppDistribution.AppStore,
  future: {
    expiringOfflineAccessTokens: true,
  },
  hooks: {
    afterAuth: async ({ admin }) => {
      await reconcileBundleAutomaticDiscounts(admin);
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
