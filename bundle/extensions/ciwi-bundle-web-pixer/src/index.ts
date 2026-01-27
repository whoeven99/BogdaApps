import { register } from "@shopify/web-pixels-extension";
import { ProductViewOrAddToCart } from "./api";


const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

register(({ analytics, browser, init, settings }) => {
  const { shopName } = settings;

  analytics.subscribe("product_viewed", async (event) => {
    await sleep(500);
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem("current-ciwi-bundle-rule")) || "{}";
    const bundleIdJSON = JSON.parse(bundleIdJSONString);
    ProductViewOrAddToCart({
      event: "product_viewed",
      shopName,
      productId: event.data.productVariant?.id || "",
      clientId: event.clientId,
      extra: {
        bundle: {
          title: bundleIdJSON[event.data.productVariant?.id || ""] || "NO_BUNDLE_TITLE",
        }
      }
    })
  });
  analytics.subscribe('product_added_to_cart', async (event) => {
    const bundleIdJSONString =
      (await browser.sessionStorage.getItem("current-ciwi-bundle-rule")) || "{}";
    const bundleIdJSON = JSON.parse(bundleIdJSONString);
    ProductViewOrAddToCart({
      event: "product_added_to_cart",
      shopName,
      productId: event.data.cartLine?.merchandise?.id || "",
      clientId: event.clientId,
      extra: {
        bundle: {
          title: bundleIdJSON[event.data.cartLine?.merchandise?.id || ""] || "NO_BUNDLE_TITLE",
        }
      }
    })
  });
  analytics.subscribe('checkout_started', async (event) => {
    console.log('Checkout started', JSON.stringify(event));
    // CheckoutStartedReport({
    //   server,
    //   topic: 'checkout_started',
    //   shopName,
    //   bundleId: item.discountAllocations[0]?.discountApplication.title,
    //   productId: item.variant?.id || "",
    //   clientId: event.clientId
    // })
  })

  analytics.subscribe('checkout_completed', (event) => {
    console.log('Checkout completed', JSON.stringify(event));
    // CheckoutCompletedReport({
    //   server,
    //   topic: 'checkout_completed',
    //   shopName,
    //   bundleId: "NO_BUNDLE_ID",
    //   productId: event.data.checkout.lineItems.map(item => item.variant?.id).join(",") || "",
    //   clientId: event.clientId
    // })
  });
});
