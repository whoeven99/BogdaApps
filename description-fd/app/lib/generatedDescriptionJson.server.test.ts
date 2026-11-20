import assert from "node:assert/strict";
import { test } from "node:test";
import { parseGeneratedDescriptionJson } from "./generatedDescriptionJson.server";

test("parses fenced JSON title and description", () => {
  const parsed = parseGeneratedDescriptionJson(
    "```json\n{\"title\":\"Silk scarf\",\"description\":\"<p>Soft silk</p>\"}\n```",
  );
  assert.deepEqual(parsed, {
    title: "Silk scarf",
    description: "<p>Soft silk</p>",
  });
});

test("returns null for non-json", () => {
  assert.equal(parseGeneratedDescriptionJson("not json"), null);
});
