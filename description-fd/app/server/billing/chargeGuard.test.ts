import assert from "node:assert/strict";
import { test } from "node:test";
import { billingGuardEnv, decideChargeGrant } from "./chargeGuard";
import {
  HARDCODED_TEST_BILLING_SHOPS,
  isProdTestBillingShop,
  isShopifyDotComEmail,
  shouldCreateTestCharge,
} from "./testBillingShop";

test("hardcoded allowlist includes ciwishop", () => {
  assert.equal(HARDCODED_TEST_BILLING_SHOPS.includes("ciwishop.myshopify.com"), true);
});

test("shop domain or @shopify.com email allowlists", () => {
  assert.equal(isProdTestBillingShop("ciwishop.myshopify.com", []), true);
  assert.equal(isProdTestBillingShop("CIWISHOP.myshopify.com", []), true);
  assert.equal(isProdTestBillingShop("other.myshopify.com", ["dev@shopify.com"]), true);
  assert.equal(isProdTestBillingShop("other.myshopify.com", ["a@shop.com"]), false);
  assert.equal(isShopifyDotComEmail("a@shopify.com.evil.com"), false);
});

test("BILLING_TEST treats whole env as test for create and grant", () => {
  const testEnv = { BILLING_TEST: "true", NODE_ENV: "production" };
  assert.equal(shouldCreateTestCharge("merchant.myshopify.com", [], testEnv), true);
  assert.equal(billingGuardEnv(testEnv), "test");
  assert.equal(
    decideChargeGrant({ env: "test", allowlisted: false, test: true }).action,
    "grant",
  );
});

test("prod create is test only for allowlisted shops", () => {
  const prod = { NODE_ENV: "production" };
  assert.equal(shouldCreateTestCharge("merchant.myshopify.com", [], prod), false);
  assert.equal(
    shouldCreateTestCharge("ciwishop.myshopify.com", [], prod),
    true,
  );
  assert.equal(billingGuardEnv(prod), "prod");
});

test("prod grant denies non-allowlisted test charges", () => {
  const denied = decideChargeGrant({
    env: "prod",
    allowlisted: false,
    test: true,
  });
  assert.equal(denied.action, "deny");
  assert.equal(denied.reason, "test_charge");

  const staff = decideChargeGrant({
    env: "prod",
    allowlisted: true,
    test: true,
  });
  assert.equal(staff.action, "grant");
  assert.equal(staff.reason, "staff_allowlist");

  const missing = decideChargeGrant({
    env: "prod",
    allowlisted: false,
    test: null,
  });
  assert.equal(missing.action, "grant");
  assert.equal(missing.reason, "fields_missing");

  const paid = decideChargeGrant({
    env: "prod",
    allowlisted: false,
    test: false,
  });
  assert.equal(paid.action, "grant");
  assert.equal(paid.reason, "ok");
});

test("BILLING_TEST_SHOPS and local NODE_ENV", () => {
  assert.equal(
    isProdTestBillingShop("extra.myshopify.com", [], {
      BILLING_TEST_SHOPS: "extra.myshopify.com",
    }),
    true,
  );
  assert.equal(
    shouldCreateTestCharge("merchant.myshopify.com", [], {
      NODE_ENV: "development",
    }),
    true,
  );
  assert.equal(billingGuardEnv({ NODE_ENV: "development" }), "test");
  assert.equal(billingGuardEnv({ NODE_ENV: "test" }), "test");
  assert.equal(isShopifyDotComEmail("Dev@Shopify.com"), true);
  assert.equal(isShopifyDotComEmail(""), false);
});
