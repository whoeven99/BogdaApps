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
        title: String(record.title || record.offerName || "NO_BUNDLE_TITLE"),
        offerId: String(record.offerId || ""),
        productId: String(record.productId || ""),
        variantId: String(record.variantId || ""),
        source: String(record.source || ""),
      };
    }
  }
  return {
    id: variantId || "",
    title: "NO_BUNDLE_TITLE",
    offerId: "",
  };
};

const mergeCheckoutBundle = (
  item: Record<string, any>,
  bundleSessionData: Record<string, unknown>,
) => {
  const id = String(item?.variant?.id || "");
  const titleFromDiscount =
    item?.discountAllocations?.[0]?.discountApplication?.title || "";
  const price = item?.finalLinePrice || {};
  const sessionBundle = getBundlePayloadByVariantId(bundleSessionData, id);
  const hasSessionBundle = sessionBundle.title !== "NO_BUNDLE_TITLE";
  return {
    id,
    price,
    title: titleFromDiscount || sessionBundle.title || "NO_BUNDLE_TITLE",
    offerId: hasSessionBundle ? sessionBundle.offerId || "" : "",
    productId: hasSessionBundle ? sessionBundle.productId || "" : "",
    variantId: hasSessionBundle ? sessionBundle.variantId || id : id,
    source: hasSessionBundle ? sessionBundle.source || "" : "",
  };
};

register(({ analytics, browser, settings }) => {
  const { shopName, server } = settings;

  analytics.subscribe("product_viewed", async (event) => {
    await sleep(500);
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    const variantId = event.data.productVariant?.id || "";
    WebpixerToAli({
      server,
      event: "product_viewed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [getBundlePayloadByVariantId(bundleIdJSON, variantId)],
      }),
    });
  });

  analytics.subscribe("product_added_to_cart", async (event) => {
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    const variantId = event.data.cartLine?.merchandise?.id || "";
    WebpixerToAli({
      server,
      event: "product_added_to_cart",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [getBundlePayloadByVariantId(bundleIdJSON, variantId)],
      }),
    });
  });

  analytics.subscribe("checkout_started", async (event) => {
    console.log("Checkout started", JSON.stringify(event));
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    WebpixerToAli({
      server,
      event: "checkout_started",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle:
          event.data.checkout.lineItems?.map((item) =>
            mergeCheckoutBundle(item, bundleIdJSON),
          ) || [],
        totalPrice: event.data.checkout.subtotalPrice,
      }),
    });
  });

  analytics.subscribe("checkout_completed", async (event) => {
    console.log("Checkout completed", JSON.stringify(event));
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem(BUNDLE_SESSION_KEY)) || "{}";
    const bundleIdJSON = parseBundleSessionData(bundleIdJSONString);
    WebpixerToAli({
      server,
      event: "checkout_completed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle:
          event.data.checkout.lineItems?.map((item) =>
            mergeCheckoutBundle(item, bundleIdJSON),
          ) || [],
        totalPrice: event.data.checkout.subtotalPrice,
        orderId: event.data.checkout.order?.id,
      }),
    });
  });
});
