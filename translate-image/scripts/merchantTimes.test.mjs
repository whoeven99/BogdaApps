import assert from "node:assert/strict";
import test from "node:test";
import { availableTranslationTimes } from "./lib/merchantTimes.mjs";

test("availableTranslationTimes floors credits / 2000", () => {
  assert.equal(availableTranslationTimes(798000), 399);
  assert.equal(availableTranslationTimes(1999), 0);
  assert.equal(availableTranslationTimes(0), 0);
  assert.equal(availableTranslationTimes(-100), 0);
});
