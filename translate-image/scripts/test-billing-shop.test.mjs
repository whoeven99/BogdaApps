import assert from "node:assert/strict";
import test from "node:test";
import {
  HARDCODED_TEST_BILLING_SHOPS,
  isProdTestBillingShop,
  isShopifyDotComEmail,
  shouldCreateTestCharge,
} from "./lib/testBillingShop.mjs";

test("硬编码含 ciwishop.myshopify.com", () => {
  assert.equal(HARDCODED_TEST_BILLING_SHOPS.includes("ciwishop.myshopify.com"), true);
});

test("域名或 @shopify.com 任一放行", () => {
  assert.equal(isProdTestBillingShop("ciwishop.myshopify.com", []), true);
  assert.equal(isProdTestBillingShop("CIWISHOP.myshopify.com", []), true);
  assert.equal(
    isProdTestBillingShop("other.myshopify.com", ["dev@shopify.com"]),
    true,
  );
  assert.equal(isProdTestBillingShop("other.myshopify.com", ["a@shop.com"]), false);
  assert.equal(isShopifyDotComEmail("a@shopify.com.evil.com"), false);
});

test("env 额外店；BILLING_TEST 整环境 test 创单", () => {
  assert.equal(
    isProdTestBillingShop("extra.myshopify.com", [], {
      BILLING_TEST_SHOPS: "extra.myshopify.com",
    }),
    true,
  );
  assert.equal(
    shouldCreateTestCharge("merchant.myshopify.com", [], {
      BILLING_TEST: "true",
      NODE_ENV: "production",
    }),
    true,
  );
  assert.equal(
    shouldCreateTestCharge("merchant.myshopify.com", [], {
      NODE_ENV: "production",
    }),
    false,
  );
});
