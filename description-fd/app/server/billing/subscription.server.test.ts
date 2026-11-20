import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSubscriptionAction } from "./subscription.server";

test("subscription webhook maps status to grant or clear", () => {
  assert.equal(resolveSubscriptionAction("ACTIVE"), "grant");
  assert.equal(resolveSubscriptionAction("cancelled"), "clear");
  assert.equal(resolveSubscriptionAction("EXPIRED"), "clear");
  assert.equal(resolveSubscriptionAction("DECLINED"), "clear");
  assert.equal(resolveSubscriptionAction("FROZEN"), "ignore");
  assert.equal(resolveSubscriptionAction("PENDING"), "ignore");
});
