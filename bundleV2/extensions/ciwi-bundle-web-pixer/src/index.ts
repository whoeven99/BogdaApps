import { register } from "@shopify/web-pixels-extension";
import { WebpixerToAli } from "./api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BUNDLE_SESSION_KEY = "current-ciwi-bundle-rule";

const parseBundleSessionData = (raw: string) => {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const normalizeVariantIdCandidates = (variantId: string) => {
  if (!variantId) return [];
  const normalized = String(variantId).trim();
  if (!normalized) return [];
  const fromGid = normalized.match(/\/(\d+)$/)?.[1];
  return Array.from(new Set([normalized, fromGid].filter(Boolean))) as string[];
};

const getBundlePayloadByVariantId = (
  bundleSessionData: Record<string, unknown>,
  variantId: string,
) => {
  const candidates = normalizeVariantIdCandidates(variantId);
  for (const id of candidates) {
    const matched = bundleSessionData[id];
    if (typeof matched === "string") {
      return {
        id: variantId || "",
        title: matched || "NO_BUNDLE_TITLE",
        offerId: "",
      };
    }
    if (matched && typeof matched === "object") {
      const record = matched as Record<string, unknown>;
      return {
        id: variantId || "",
        title: String(record.title || "NO_BUNDLE_TITLE"),
        offerName: String(record.offerName || ""),
        offerId: String(record.offerId || ""),
        productId: String(record.productId || ""),
        variantId: variantId || "",
        source: String(record.source || ""),
        abGroup: String(record.abGroup || ""),
        abBucket: Number(record.abBucket),
        abDiscountPercent: Number(record.abDiscountPercent),
      };
    }
  }
  return {
    id: variantId || "",
    title: "NO_BUNDLE_TITLE",
    offerId: "",
  };
};

/**
 * 中文注释：从 checkout lineItem 中提取 Shopify Subscription（selling plan）信息
 * - Shopify 的 web pixel 在 checkout lineItem 上暴露 sellingPlanAllocation（订阅分配）
 * - 若当前 line 绑定了 selling plan，表示这是订阅订单行
 */
const extractSellingPlanFromLineItem = (
  item: Record<string, any>,
): {
  sellingPlanId: string;
  sellingPlanName: string;
  isSubscription: boolean;
} => {
  const allocation = item?.sellingPlanAllocation;
  const plan = allocation?.sellingPlan;
  if (plan && (plan.id || plan.name)) {
    return {
      sellingPlanId: String(plan.id || ""),
      sellingPlanName: String(plan.name || ""),
      isSubscription: true,
    };
  }
  return {
    sellingPlanId: "",
    sellingPlanName: "",
    isSubscription: false,
  };
};

const mergeCheckoutBundle = (
  item: Record<string, any>,
  bundleSessionData: Record<string, unknown>,
) => {
  const id = String(item?.variant?.id || "");
  const price = item?.finalLinePrice || {};
  const sessionBundle = getBundlePayloadByVariantId(bundleSessionData, id);
  const hasSessionBundle = sessionBundle.title !== "NO_BUNDLE_TITLE";
  const subscription = extractSellingPlanFromLineItem(item);
  return {
    id,
    price,
    title: hasSessionBundle ? sessionBundle.title : "NO_BUNDLE_TITLE",
    offerId: hasSessionBundle ? sessionBundle.offerId || "" : "",
    productId: hasSessionBundle ? sessionBundle.productId || "" : "",
    variantId: hasSessionBundle ? sessionBundle.variantId || id : id,
    source: hasSessionBundle ? sessionBundle.source || "" : "",
    abGroup: hasSessionBundle ? String(sessionBundle.abGroup || "") : "",
    abBucket: hasSessionBundle ? Number(sessionBundle.abBucket) : Number.NaN,
    abDiscountPercent: hasSessionBundle ? Number(sessionBundle.abDiscountPercent) : Number.NaN,
    // 中文注释：把订阅信息注入到 bundle 数据项里，后端 SLS 查询 / 账单页面可按需使用
    sellingPlanId: subscription.sellingPlanId,
    sellingPlanName: subscription.sellingPlanName,
    isSubscription: subscription.isSubscription,
    quantity: Number(item?.quantity ?? 0),
    productTitle: String(item?.title ?? item?.variant?.product?.title ?? ""),
    variantTitle: String(item?.variant?.title ?? ""),
  };
};

const logAliSendBoundary = async (params: {
  server: string;
  event: string;
  shopName: string;
  clientId: string;
  extra: string;
  context: Record<string, unknown>;
}) => {
  const { server, event, shopName, clientId, extra, context } = params;
  const startAt = Date.now();
  console.log("[ciwi][web-pixel] ali-send start", {
    event,
    shopName: shopName || "(empty)",
    server: server || "(empty)",
    clientId: clientId || "(empty)",
    extraLength: extra.length,
    context,
  });
  try {
    await WebpixerToAli({
      server,
      event,
      shopName,
      clientId,
      extra,
    });
    console.log("[ciwi][web-pixel] ali-send success", {
      event,
      costMs: Date.now() - startAt,
      context,
    });
  } catch (error) {
    console.error("[ciwi][web-pixel] ali-send throw", {
      event,
      costMs: Date.now() - startAt,
      context,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

register(({ analytics, browser, settings }) => {
  const { shopName, server } = settings;
  console.log("[ciwi][web-pixel] init", {
    shopName: shopName || "(empty)",
    server: server || "(empty)",
  });

  analytics.subscribe("product_viewed", async (event) => {
    await sleep(500);
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    const variantId = event.data.productVariant?.id || "";
    const bundlePayload = getBundlePayloadByVariantId(bundleIdJSON, variantId);
    console.log("[ciwi][web-pixel] product_viewed payload", {
      variantId,
      clientId: event.clientId,
      bundlePayload,
    });
    await logAliSendBoundary({
      server,
      event: "product_viewed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [bundlePayload],
      }),
      context: {
        stage: "product_viewed",
        variantId,
      },
    });
  });

  analytics.subscribe("product_added_to_cart", async (event) => {
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    const cartLine: Record<string, any> = (event.data.cartLine ?? {}) as Record<string, any>;
    const variantId = cartLine?.merchandise?.id || "";
    const basePayload = getBundlePayloadByVariantId(bundleIdJSON, variantId);
    // 中文注释：add-to-cart 事件的 sellingPlanAllocation 挂在 cartLine 上
    const subscription = extractSellingPlanFromLineItem(cartLine);
    const bundlePayload = {
      ...basePayload,
      sellingPlanId: subscription.sellingPlanId,
      sellingPlanName: subscription.sellingPlanName,
      isSubscription: subscription.isSubscription,
    };
    console.log("[ciwi][web-pixel] product_added_to_cart", {
      variantId,
      bundlePayload,
      isSubscription: subscription.isSubscription,
      sellingPlanId: subscription.sellingPlanId,
    });
    await logAliSendBoundary({
      server,
      event: "product_added_to_cart",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [bundlePayload],
      }),
      context: {
        stage: "product_added_to_cart",
        variantId,
        isSubscription: subscription.isSubscription,
      },
    });
  });

  analytics.subscribe("checkout_started", async (event) => {
    console.log("[ciwi][web-pixel] Checkout started", JSON.stringify(event));
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    const bundleItems =
      event.data.checkout.lineItems?.map((item) =>
        mergeCheckoutBundle(item, bundleIdJSON),
      ) || [];
    const subscriptionItemCount = bundleItems.filter(
      (b) => b.isSubscription,
    ).length;
    console.log("[ciwi][web-pixel] checkout_started bundle summary", {
      totalLineItems: bundleItems.length,
      subscriptionItemCount,
      abItems: bundleItems
        .filter((b) => typeof b.abGroup === "string" && b.abGroup)
        .map((b) => ({
          variantId: b.variantId || b.id,
          offerId: b.offerId || "",
          abGroup: b.abGroup,
          abBucket: b.abBucket,
          abDiscountPercent: b.abDiscountPercent,
        })),
    });
    await logAliSendBoundary({
      server,
      event: "checkout_started",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: bundleItems,
        totalPrice: event.data.checkout.subtotalPrice,
        hasSubscriptionOrder: subscriptionItemCount > 0,
        subscriptionItemCount,
      }),
      context: {
        stage: "checkout_started",
        totalLineItems: bundleItems.length,
        subscriptionItemCount,
      },
    });
  });

  analytics.subscribe("checkout_completed", async (event) => {
    console.log("[ciwi][web-pixel] Checkout completed", JSON.stringify(event));
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    const bundleItems =
      event.data.checkout.lineItems?.map((item) =>
        mergeCheckoutBundle(item, bundleIdJSON),
      ) || [];

    // 中文注释：汇总订阅 line 数量，便于账单/分析页面聚合
    const subscriptionItemCount = bundleItems.filter(
      (b) => b.isSubscription,
    ).length;
    const hasSubscriptionOrder = subscriptionItemCount > 0;

    console.log("[ciwi][web-pixel] checkout_completed bundle summary", {
      orderId: event.data.checkout.order?.id,
      totalLineItems: bundleItems.length,
      subscriptionItemCount,
      hasSubscriptionOrder,
      abItems: bundleItems
        .filter((b) => typeof b.abGroup === "string" && b.abGroup)
        .map((b) => ({
          variantId: b.variantId || b.id,
          offerId: b.offerId || "",
          abGroup: b.abGroup,
          abBucket: b.abBucket,
          abDiscountPercent: b.abDiscountPercent,
        })),
      subscriptions: bundleItems
        .filter((b) => b.isSubscription)
        .map((b) => ({
          sellingPlanId: b.sellingPlanId,
          sellingPlanName: b.sellingPlanName,
          variantId: b.variantId,
          productId: b.productId,
          title: b.title,
        })),
    });

    await logAliSendBoundary({
      server,
      event: "checkout_completed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: bundleItems,
        totalPrice: event.data.checkout.subtotalPrice,
        orderId: event.data.checkout.order?.id,
        hasSubscriptionOrder,
        subscriptionItemCount,
      }),
      context: {
        stage: "checkout_completed",
        totalLineItems: bundleItems.length,
        subscriptionItemCount,
        orderId: event.data.checkout.order?.id || "",
      },
    });
  });
});
