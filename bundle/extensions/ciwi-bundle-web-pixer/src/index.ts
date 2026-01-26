import { register } from "@shopify/web-pixels-extension";
import { CheckoutCompletedReport, CheckoutStartedReport, ProductAddToCartReport, ProductViewReport } from "./api";

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

register(({ analytics, browser, init, settings }) => {
  analytics.subscribe("product_viewed", async (event) => {
    await sleep(500);
    const bundleId =
      (await browser.localStorage.getItem("current-ciwi-bundle-rule")) ||
      "NO_BUNDLE_ID";
    ProductViewReport({
      topic: "product_viewed",
      shopName: event.context.window.location.host,
      bundleId,
      productId: event.data.productVariant?.id || "",
      clientId: event.clientId,
    });
  });
  analytics.subscribe('product_added_to_cart', async (event) => {
    const bundleId =
      (await browser.localStorage.getItem("current-ciwi-bundle-rule")) ||
      "NO_BUNDLE_ID";
    console.log('Product added to cart', JSON.stringify(event));
    ProductAddToCartReport({
      topic: 'product_added_to_cart',
      shopName: event.context.window.location.host,
      bundleId,
      productId: event.data.cartLine?.merchandise.id || "",
      clientId: event.clientId
    })
  });
  analytics.subscribe('checkout_started', async (event) => {
    const promise = event.data.checkout.lineItems.map(async item => {
      console.log('Checkout started', JSON.stringify(event));

      CheckoutStartedReport({
        topic: 'checkout_started',
        shopName: event.context.window.location.host,
        bundleId: item.discountAllocations[0]?.discountApplication.title,
        productId: item.variant?.id || "",
        clientId: event.clientId
      })
    })

    await Promise.all(promise)
  })

  analytics.subscribe('checkout_completed', (event) => {
    console.log('Checkout completed', JSON.stringify(event));
    CheckoutCompletedReport({
      topic: 'checkout_completed',
      shopName: event.context.window.location.host,
      bundleId: "NO_BUNDLE_ID",
      productId: event.data.checkout.lineItems.map(item => item.variant?.id).join(",") || "",
      clientId: event.clientId
    })
  });
});
