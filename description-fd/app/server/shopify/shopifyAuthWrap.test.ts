import assert from "node:assert/strict";
import { test } from "node:test";
import {
  replaceWebhookAdminIfPresent,
  buildUnauthenticatedAppOnlyAdmin,
} from "./shopifyAuthWrap";

test("webhook without admin stays empty", () => {
  const ctx = { shop: "a.myshopify.com" };
  const out = replaceWebhookAdminIfPresent(ctx, () => ({ source: "app-only" }));
  assert.equal((out as { admin?: unknown }).admin, undefined);
});

test("webhook with admin is replaced", () => {
  const ctx = { shop: "a.myshopify.com", admin: { graphql: "sdk" } };
  const out = replaceWebhookAdminIfPresent(ctx, () => ({ source: "app-only" }));
  assert.deepEqual(out.admin, { source: "app-only" });
});

test("unauthenticated rejects shops that are not installed", async () => {
  await assert.rejects(
    () =>
      buildUnauthenticatedAppOnlyAdmin({
        shop: "missing.myshopify.com",
        isInstalled: async () => false,
        createAdmin: () => ({ ok: true }),
      }),
    /not installed/,
  );
});
