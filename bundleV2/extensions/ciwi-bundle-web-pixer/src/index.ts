import { register } from "@shopify/web-pixels-extension";
import { WebpixerToAli } from "./api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

register(({ analytics, browser, settings }) => {
  const { shopName, server } = settings;

  analytics.subscribe("product_viewed", async (event) => {
    console.log("[product_viewed] received event:", JSON.stringify(event, null, 2));
    await sleep(500);
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem("current-ciwi-bundle-rule")) || "{}";
    const bundleIdJSON = JSON.parse(bundleIdJSONString);
    const extraPayload = {
      bundle: [
        {
          id: event.data.productVariant?.id || "",
          title:
            bundleIdJSON[event.data.productVariant?.id || ""] ||
            "NO_BUNDLE_TITLE",
        },
      ],
    };
    console.log("[product_viewed] sending extra:", JSON.stringify(extraPayload, null, 2));
    WebpixerToAli({
      server,
      event: "product_viewed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify(extraPayload),
    });
  });

  analytics.subscribe("product_added_to_cart", async (event) => {
    console.log("[product_added_to_cart] received event:", JSON.stringify(event, null, 2));
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem("current-ciwi-bundle-rule")) || "{}";
    const bundleIdJSON = JSON.parse(bundleIdJSONString);
    const extraPayload = {
      bundle: [
        {
          id: event.data.cartLine?.merchandise?.id || "",
          title:
            bundleIdJSON[event.data.cartLine?.merchandise?.id || ""] ||
            "NO_BUNDLE_TITLE",
        },
      ],
    };
    console.log("[product_added_to_cart] sending extra:", JSON.stringify(extraPayload, null, 2));
    WebpixerToAli({
      server,
      event: "product_added_to_cart",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify(extraPayload),
    });
  });

  analytics.subscribe("checkout_started", async (event) => {
    console.log("[checkout_started] received event:", JSON.stringify(event, null, 2));
    const extraPayload = {
      bundle:
        event.data.checkout.lineItems?.map((item) => {
          const title =
            item?.discountAllocations[0]?.discountApplication.title ??
            "NO_BUNDLE_TITLE";
          const price = item?.finalLinePrice || {};
          const id = String(item?.variant?.id) || "";
          return {
            id,
            price,
            title,
          };
        }) || [],
      totalPrice: event.data.checkout.subtotalPrice,
    };
    console.log("[checkout_started] sending extra:", JSON.stringify(extraPayload, null, 2));
    WebpixerToAli({
      server,
      event: "checkout_started",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify(extraPayload),
    });
  });

  analytics.subscribe("checkout_completed", (event) => {
    console.log("[checkout_completed] received event:", JSON.stringify(event, null, 2));
    const extraPayload = {
      bundle:
        event.data.checkout.lineItems?.map((item) => {
          const title =
            item?.discountAllocations[0]?.discountApplication.title ??
            "NO_BUNDLE_TITLE";
          const price = item?.finalLinePrice || {};
          const id = String(item?.variant?.id) || "";
          return {
            id,
            price,
            title,
          };
        }) || [],
      totalPrice: event.data.checkout.subtotalPrice,
      orderId: event.data.checkout.order?.id,
    };
    console.log("[checkout_completed] sending extra:", JSON.stringify(extraPayload, null, 2));
    WebpixerToAli({
      server,
      event: "checkout_completed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify(extraPayload),
    });
  });
});
