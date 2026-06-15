import "@shopify/shopify-app-react-router/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";
import { FunctionDiscountClass } from "./utils/offerParsing";
import { sanitizeEnvLikeValue, sanitizeUrlLikeEnvValue } from "./utils/env";
import {
  COMPACT_OFFERS_FORMAT_VERSION,
  OFFER_SHARD_KEYS,
  buildShardedClassPayloads,
} from "./server/offers/offerPayload.server";

const CART_LINES_DISCOUNT_FUNCTION_TITLE = "Bundle Cart Discount Function";
const CART_LINES_PRODUCT_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Product Discount";
const CART_LINES_ORDER_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Order Discount";
/** 与 extensions/bundle-delivery-discount-function/shopify.extension.toml 中 name 一致，供 GraphQL 按标题定位 Function */
const DELIVERY_DISCOUNT_FUNCTION_TITLE = "Bundle Delivery Discount Function";
const DELIVERY_DISCOUNT_AUTO_TITLE = "Ciwi Bundle Auto Free Shipping";
const CART_LINES_DISCOUNT_METAFIELD_NAMESPACE = "$app:ciwi_bundle";
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

/**
 * 新建 automatic discount 时写入的初始 metafield 值：空 offers（v2 格式）。
 * Function 端按 `{ v, updatedAt, offers }` 解析，空数组即"无优惠"。
 */
function buildEmptyOffersMetafieldValue(): string {
  return JSON.stringify({
    v: COMPACT_OFFERS_FORMAT_VERSION,
    updatedAt: new Date().toISOString(),
    offers: [],
  });
}

function normalizeDiscountClassList(discountClasses: unknown): FunctionDiscountClass[] {
  if (!Array.isArray(discountClasses)) return [];
  const out: FunctionDiscountClass[] = [];
  for (const raw of discountClasses) {
    const value = String(raw || "").trim().toUpperCase();
    if (value === "PRODUCT" || value === "ORDER" || value === "SHIPPING") {
      out.push(value);
    }
  }
  return out;
}

async function queryShopifyDiscountFunctions(
  admin: any,
): Promise<Array<{ id: string; title: string }>> {
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
  return functionNodes
    .filter((fn: any) => String(fn?.apiType || "").toLowerCase() === "discount")
    .map((fn: any) => ({ id: String(fn?.id || ""), title: String(fn?.title || "") }))
    .filter((fn: { id: string }) => Boolean(fn.id));
}

function findFunctionIdByTitle(
  fns: Array<{ id: string; title: string }>,
  exactTitle: string,
): string | null {
  return fns.find((fn) => fn.title === exactTitle)?.id ?? null;
}

async function resolveShopifyDiscountFunctionIdByExactTitle(
  admin: any,
  exactTitle: string,
): Promise<string | null> {
  return findFunctionIdByTitle(await queryShopifyDiscountFunctions(admin), exactTitle);
}

type AutomaticDiscountSyncTarget = {
  nodeId: string;
  ownerIds: string[];
  title: string;
  status: string;
  functionId: string;
  discountClass: FunctionDiscountClass;
};

function collectAutomaticDiscountSyncTargets(params: {
  discountNodes: any[];
  functionId: string;
  discountClasses: FunctionDiscountClass[];
}): AutomaticDiscountSyncTarget[] {
  const { discountNodes, functionId, discountClasses } = params;
  const allowedClasses = new Set(discountClasses);

  return discountNodes
    .map((node: any) => {
      const d = node?.discount;
      if (!d || d.__typename !== "DiscountAutomaticApp") return null;
      if (String(d?.appDiscountType?.functionId || "") !== functionId) return null;
      const nodeClasses = normalizeDiscountClassList(d?.discountClasses);
      const matched = nodeClasses.filter((cls) => allowedClasses.has(cls));
      if (!matched.length) return null;
      // 单 owner 的分片 key 是固定的（offers/offers-1），一个 owner 只能承载一个 class 的数据。
      // 正常 ensure 流程为每个 class 建独立单 class 节点；若手工把多个目标 class 合并到同一节点，
      // 这里只能取第一个并显式告警，避免其余 class 静默无人写入。
      if (matched.length > 1) {
        console.warn("[discount][sync-meta] discount node serves multiple target classes; only first is synced", {
          nodeId: String(node?.id || ""),
          title: String(d?.title || ""),
          matchedClasses: matched,
        });
      }
      const nodeId = String(node?.id || "").trim();
      const discountId = String(d?.discountId || "").trim();
      if (!nodeId && !discountId) return null;
      return {
        nodeId,
        ownerIds: Array.from(new Set([discountId, nodeId].filter(Boolean))),
        title: String(d?.title || ""),
        status: String(d?.status || ""),
        functionId,
        discountClass: matched[0],
      } satisfies AutomaticDiscountSyncTarget;
    })
    .filter((target): target is AutomaticDiscountSyncTarget => target !== null);
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

/**
 * 查询 automatic discount 节点并解析出需要写 metafield 的 owner 目标。
 * 抽成独立函数，便于"首次没找到 owner → reconcile 自愈后重查一次"。
 */
async function loadAutomaticDiscountSyncTargets(
  admin: any,
  functionId: string,
  shippingFunctionId: string | null,
): Promise<AutomaticDiscountSyncTarget[]> {
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
                discountClasses
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
  const cartTargets = collectAutomaticDiscountSyncTargets({
    discountNodes,
    functionId,
    discountClasses: ["PRODUCT", "ORDER"],
  });
  const shippingTargets = shippingFunctionId
    ? collectAutomaticDiscountSyncTargets({
        discountNodes,
        functionId: shippingFunctionId,
        discountClasses: ["SHIPPING"],
      })
    : [];
  return [...cartTargets, ...shippingTargets];
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
    // 单次 shopifyFunctions 查询同时拿 cart + delivery 两个 function id（原来各查一次）。
    const discountFunctions = await queryShopifyDiscountFunctions(admin);
    const functionId = findFunctionIdByTitle(discountFunctions, CART_LINES_DISCOUNT_FUNCTION_TITLE);
    const shippingFunctionId = findFunctionIdByTitle(
      discountFunctions,
      DELIVERY_DISCOUNT_FUNCTION_TITLE,
    );
    console.log("[discount][sync-meta] resolved function ids", {
      cartLinesFunctionId: functionId,
      shippingFunctionId,
    });
    if (!functionId) {
      return {
        ok: false,
        message: `Target function not found: ${CART_LINES_DISCOUNT_FUNCTION_TITLE}`,
      };
    }

    let syncTargets = await loadAutomaticDiscountSyncTargets(
      admin,
      functionId,
      shippingFunctionId,
    );
    // 自愈：正常情况下 afterAuth 已建好 discount 节点，热路径不再每次 reconcile。
    // 仅当一个 owner 都没匹配上（节点缺失/被删）时，才补跑一次 reconcile 并重查。
    if (!syncTargets.length) {
      console.warn("[discount][sync-meta] no owner matched, running reconcile once to self-heal");
      await reconcileBundleAutomaticDiscounts(admin);
      syncTargets = await loadAutomaticDiscountSyncTargets(
        admin,
        functionId,
        shippingFunctionId,
      );
    }
    if (!syncTargets.length) {
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
    console.log("[discount][sync-meta] matched discount targets", {
      targets: syncTargets.map((target) => ({
        nodeId: target.nodeId,
        title: target.title,
        status: target.status,
        discountClass: target.discountClass,
      })),
    });

    // 每个 class 的 payload 切成 OFFER_SHARD_KEYS 个分片（各 <10KB），Function 读这些固定 key 再合并。
    const shardsByClass = new Map<FunctionDiscountClass, string[]>([
      ["PRODUCT", buildShardedClassPayloads(metafieldValue, "PRODUCT").shards],
      ["ORDER", buildShardedClassPayloads(metafieldValue, "ORDER").shards],
      ["SHIPPING", buildShardedClassPayloads(metafieldValue, "SHIPPING").shards],
    ]);
    const emptyShards = buildShardedClassPayloads(undefined, null).shards;
    const shardsForClass = (cls: FunctionDiscountClass): string[] =>
      shardsByClass.get(cls) || emptyShards;
    // Function 只读 `$app:ciwi_bundle`，故不再向默认 `$app` namespace 冗余双写。
    /** owner 上每个分片写一份（含 ownerId，供 metafieldsSet）。 */
    const buildOwnerShardMetafields = (ownerId: string, shards: string[]) =>
      OFFER_SHARD_KEYS.map((key, idx) => {
        const value = shards[idx] ?? emptyShards[idx];
        return { ownerId, namespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE, key, type: "json", value };
      });
    /** 不含 ownerId 的分片 metafield（供 discountAutomaticAppUpdate）。 */
    const buildUpdateShardMetafields = (shards: string[]) =>
      OFFER_SHARD_KEYS.map((key, idx) => {
        const value = shards[idx] ?? emptyShards[idx];
        return { namespace: CART_LINES_DISCOUNT_METAFIELD_NAMESPACE, key, type: "json", value };
      });
    const ownerAssignments = syncTargets.flatMap((target) =>
      target.ownerIds.map((ownerId) => ({
        ownerId,
        discountClass: target.discountClass,
        shards: shardsForClass(target.discountClass),
      })),
    );

    console.log("[discount][sync-meta] resolved sync targets", {
      targetCount: syncTargets.length,
      ownerCount: ownerAssignments.length,
      shardKeys: OFFER_SHARD_KEYS,
      targets: syncTargets.map((target) => ({
        nodeId: target.nodeId,
        ownerIds: target.ownerIds,
        title: target.title,
        discountClass: target.discountClass,
        shardBytes: shardsForClass(target.discountClass).map((s) => s.length),
      })),
    });

    // 先用 discountAutomaticAppUpdate 写入函数 owner 的 metafields（与函数运行时 owner 最稳定对齐）
    for (const target of syncTargets) {
      const shards = shardsForClass(target.discountClass);
      console.log("[discount][sync-meta] updating automatic app discount metafields", {
        discountNodeId: target.nodeId,
        discountClass: target.discountClass,
        shardBytes: shards.map((s) => s.length),
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
            id: target.nodeId,
            automaticAppDiscount: {
              metafields: buildUpdateShardMetafields(shards),
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
          discountNodeId: target.nodeId,
          errors: updateJson.errors,
        });
      }
      const updateUserErrors =
        updateJson?.data?.discountAutomaticAppUpdate?.userErrors ?? [];
      if (updateUserErrors.length) {
        console.error("[discount][sync-meta] discountAutomaticAppUpdate userErrors", {
          discountNodeId: target.nodeId,
          userErrors: updateUserErrors,
        });
      } else {
        console.log("[discount][sync-meta] discountAutomaticAppUpdate success", {
          discountNodeId: target.nodeId,
          discountClass: target.discountClass,
        });
      }
    }

    console.log("[discount][sync-meta] calling metafieldsSet", {
      mutationTargets: ownerAssignments.length * 2,
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
          metafields: ownerAssignments.flatMap((assignment) =>
            buildOwnerShardMetafields(assignment.ownerId, assignment.shards),
          ),
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
      ownerCount: ownerAssignments.length,
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
    const targetDiscount =
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
                value: buildEmptyOffersMetafieldValue(),
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
