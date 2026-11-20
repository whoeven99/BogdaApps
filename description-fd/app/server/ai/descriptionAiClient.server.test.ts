import assert from "node:assert/strict";
import { test } from "node:test";
import { billableCredits } from "../billing/quota.server";
import { parseGeneratedDescriptionJson } from "../../lib/generatedDescriptionJson.server";

test("usage fallback still bills at least one token chunk", () => {
  assert.equal(billableCredits(0, 1), 2);
});

test("generated json still parses title and description", () => {
  const parsed = parseGeneratedDescriptionJson('{"title":"A","description":"<p>B</p>"}');
  assert.deepEqual(parsed, { title: "A", description: "<p>B</p>" });
});
