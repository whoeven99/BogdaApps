import assert from "node:assert/strict";
import { test } from "node:test";
import { canEnqueue } from "./job.server";

test("rejects enqueue when a job is already queued or running", () => {
  assert.equal(canEnqueue("QUEUED"), false);
  assert.equal(canEnqueue("RUNNING"), false);
  assert.equal(canEnqueue("COMPLETED"), true);
  assert.equal(canEnqueue(null), true);
});
