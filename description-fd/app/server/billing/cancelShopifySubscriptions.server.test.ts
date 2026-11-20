import assert from "node:assert/strict";
import { test } from "node:test";
import { parseActiveSubscriptionIds } from "./cancelShopifySubscriptions.server";

test("parses active subscription ids and skips blanks", () => {
  const ids = parseActiveSubscriptionIds({
    data: {
      currentAppInstallation: {
        activeSubscriptions: [
          { id: "gid://shopify/AppSubscription/1", status: "ACTIVE" },
          { id: "  ", status: "ACTIVE" },
          { id: "gid://shopify/AppSubscription/2", status: "ACTIVE" },
        ],
      },
    },
  });
  assert.deepEqual(ids, [
    "gid://shopify/AppSubscription/1",
    "gid://shopify/AppSubscription/2",
  ]);
});

test("missing installation yields no ids", () => {
  assert.deepEqual(parseActiveSubscriptionIds({}), []);
  assert.deepEqual(parseActiveSubscriptionIds({ data: { currentAppInstallation: null } }), []);
});
