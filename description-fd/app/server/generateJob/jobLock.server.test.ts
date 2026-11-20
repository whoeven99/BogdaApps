import assert from "node:assert/strict";
import { test } from "node:test";
import { didClaimJob, isStaleRunning } from "./job.server";

test("CAS claim wins only when update count is 1", () => {
  assert.equal(didClaimJob(1), true);
  assert.equal(didClaimJob(0), false);
  assert.equal(didClaimJob(2), false);
});

test("running jobs older than the lease are stale", () => {
  const now = new Date("2026-11-20T05:00:00.000Z");
  const fresh = new Date("2026-11-20T04:55:00.000Z");
  const stale = new Date("2026-11-20T04:40:00.000Z");
  assert.equal(isStaleRunning(fresh, now, 10 * 60 * 1000), false);
  assert.equal(isStaleRunning(stale, now, 10 * 60 * 1000), true);
});
