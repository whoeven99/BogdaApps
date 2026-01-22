import { register } from "@shopify/web-pixels-extension";

register(({ analytics, browser, init, settings }) => {
  analytics.subscribe('product_viewed', (event) => {
    console.log('Product viewed', JSON.stringify(event));
  });
  analytics.subscribe('product_added_to_cart', (event) => {
    console.log('Product added to cart', JSON.stringify(event));
  });
  analytics.subscribe('checkout_started', (event) => {
    console.log('Checkout started', JSON.stringify(event));
  });
  analytics.subscribe('checkout_completed', (event) => {
    console.log('Checkout completed', JSON.stringify(event));
  });
});
