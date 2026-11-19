import assert from "node:assert/strict";
import test from "node:test";
import { controlTransition } from "./lib/imageTranslateJobControl.mjs";

test("pause/resume/cancel from", () => {
  assert.deepEqual(controlTransition("pause").from, ["QUEUED", "RUNNING"]);
  assert.equal(controlTransition("pause").status, "PAUSED");
  assert.equal(controlTransition("pause").pauseReason, "MANUAL");
  assert.deepEqual(controlTransition("resume").from, ["PAUSED"]);
  assert.equal(controlTransition("resume").status, "QUEUED");
  assert.deepEqual(controlTransition("cancel").from, ["QUEUED", "RUNNING", "PAUSED"]);
  assert.equal(controlTransition("bogus"), null);
});
