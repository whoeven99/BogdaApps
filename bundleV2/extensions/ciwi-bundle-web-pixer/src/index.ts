import { register } from "@shopify/web-pixels-extension";
import { WebpixerToAli } from "./api";

// Shopify Product GID prefix
const SHOPIFY_PRODUCT_GID_PREFIX = "gid://shopify/Product/";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

register(({ analytics, browser, settings }) => {
  const { shopName, server } = settings;

  analytics.subscribe("product_viewed", async (event) => {  
    await sleep(500);

    // Get offer name from sessionStorage, which is set when the offer is rendered.
    const offerName = (await browser.sessionStorage.getItem("current-ciwi-offer-name")) || "NO_BUNDLE_TITLE";
    console.log("sessionStorage", browser.sessionStorage);
    WebpixerToAli({
      server,
      event: "product_viewed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [
          {
            // Use product GID for tracking, not variant ID.
            id: event.data.productVariant?.product?.id ? `${SHOPIFY_PRODUCT_GID_PREFIX}${event.data.productVariant.product.id}` : "",
            title: offerName,
          },
        ],
      }),
    });
  });

  analytics.subscribe("product_added_to_cart", async (event) => {
    // Get offer name from sessionStorage, which is set when the offer is rendered.
    console.log("product_added_to_cart", event);
    const offerName = (await browser.sessionStorage.getItem("current-ciwi-offer-name")) || "NO_BUNDLE_TITLE";  
    console.log("sessionStorage", browser.sessionStorage);
    WebpixerToAli({
      server,
      event: "product_added_to_cart",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [
          {
            // Use product GID for tracking, not variant ID.
            id: event.data.cartLine?.merchandise?.product?.id ? `${SHOPIFY_PRODUCT_GID_PREFIX}${event.data.cartLine.merchandise.product.id}` : "",
            title: offerName,
            totalAmount: event.data.cartLine?.cost?.totalAmount,
            product: {
              id: event.data.cartLine?.merchandise?.product?.id,
              title: event.data.cartLine?.merchandise?.product?.title,
              variantTitle: event.data.cartLine?.merchandise?.title,
            },
          },
        ],
      }),
    });
  });

  analytics.subscribe("checkout_started", async (event) => {
    console.log("Checkout started", JSON.stringify(event));
    WebpixerToAli({
      server,
      event: "checkout_started",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle:
          event.data.checkout.lineItems?.map((item) => {
            const title =
              item?.discountAllocations[0]?.discountApplication.title ??
              "NO_BUNDLE_TITLE";
            const price = item?.finalLinePrice || {};
            const id = item?.variant?.product?.id ? `${SHOPIFY_PRODUCT_GID_PREFIX}${item.variant.product.id}` : "";
            return {
              id,
              price,
              title,
            };
          }) || [],
        totalPrice: event.data.checkout.subtotalPrice,
      }),
    });
  });

  analytics.subscribe("checkout_completed", (event) => {
    console.log("Checkout completed", JSON.stringify(event));
    WebpixerToAli({
      server,
      event: "checkout_completed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle:
          event.data.checkout.lineItems?.map((item) => {
            const title =
              item?.discountAllocations[0]?.discountApplication.title ??
              "NO_BUNDLE_TITLE";
            const price = item?.finalLinePrice || {};
            const id = item?.variant?.product?.id ? `${SHOPIFY_PRODUCT_GID_PREFIX}${item.variant.product.id}` : "";
            return {
              id,
              price,
              title,
            };
          }) || [],
        totalPrice: event.data.checkout.subtotalPrice,
        orderId: event.data.checkout.order?.id,
      }),
    });
  });
});
