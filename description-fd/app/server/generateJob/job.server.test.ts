import assert from "node:assert/strict";
import { test } from "node:test";
import { canEnqueue, resourceIdKey, taskStatusCode } from "./job.server";

test("rejects enqueue when a job is already queued or running", () => {
  assert.equal(canEnqueue("QUEUED"), false);
  assert.equal(canEnqueue("RUNNING"), false);
  assert.equal(canEnqueue("COMPLETED"), true);
  assert.equal(canEnqueue("QUOTA_INSUFFICIENT"), true);
  assert.equal(canEnqueue(null), true);
});

test("taskStatusCode maps Java-era UI codes", () => {
  assert.equal(taskStatusCode("RUNNING"), 2);
  assert.equal(taskStatusCode("QUEUED"), 2);
  assert.equal(taskStatusCode("COMPLETED"), 1);
  assert.equal(taskStatusCode("STOPPED"), 1);
  assert.equal(taskStatusCode("QUOTA_INSUFFICIENT"), 3);
  assert.equal(taskStatusCode("FAILED", true), 3);
  assert.equal(taskStatusCode("FAILED"), 4);
});

test("resourceIdKey strips Shopify GID prefix", () => {
  assert.equal(resourceIdKey("gid://shopify/Product/123"), "123");
  assert.equal(resourceIdKey("123"), "123");
});
