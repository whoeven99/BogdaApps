import { register } from "@shopify/web-pixels-extension";
import { WebpixerToAli } from "./api";


const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

register(({ analytics, browser, init, settings }) => {
  const { shopName, server } = settings;
  analytics.subscribe("product_viewed", async (event) => {
    await sleep(500);
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem("current-ciwi-bundle-rule")) || "{}";
    const bundleIdJSON = JSON.parse(bundleIdJSONString);
    WebpixerToAli({
      server,
      event: "product_viewed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [{
          id: event.data.productVariant?.id || "",
          title: bundleIdJSON[event.data.productVariant?.id || ""] || "NO_BUNDLE_TITLE",
        }]
      })
    })
  });
  analytics.subscribe('product_added_to_cart', async (event) => {
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem("current-ciwi-bundle-rule")) || "{}";
    const bundleIdJSON = JSON.parse(bundleIdJSONString);
    WebpixerToAli({
      server,
      event: "product_added_to_cart",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: [{
          id: event.data.cartLine?.merchandise?.id || "",
          title: bundleIdJSON[event.data.cartLine?.merchandise?.id || ""] || "NO_BUNDLE_TITLE",
        }]
      })
    })
  });
  analytics.subscribe('checkout_started', async (event) => {
    console.log('Checkout started', JSON.stringify(event));
    WebpixerToAli({
      server,
      event: "checkout_started",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: event.data.checkout.lineItems?.map(item => {
          const title = item?.discountAllocations[0]?.discountApplication.title ?? "NO_BUNDLE_TITLE"
          const price = item?.finalLinePrice || {}
          const id = String(item?.variant?.id) || ""
          return {
            id,
            price,
            title,
          }
        }) || [],
        totalPrice: event.data.checkout.subtotalPrice,
      })
    })
  })
  analytics.subscribe('checkout_completed', (event) => {
    console.log('Checkout completed', JSON.stringify(event));
    WebpixerToAli({
      server,
      event: "checkout_completed",
      shopName,
      clientId: event.clientId,
      extra: JSON.stringify({
        bundle: event.data.checkout.lineItems?.map(item => {
          const title = item?.discountAllocations[0]?.discountApplication.title ?? "NO_BUNDLE_TITLE"
          const price = item?.finalLinePrice || {}
          const id = String(item?.variant?.id) || ""
          return {
            id,
            price,
            title,
          }
        }) || [],
        totalPrice: event.data.checkout.subtotalPrice,
        orderId: event.data.checkout.order?.id
      })
    })
  });
});
