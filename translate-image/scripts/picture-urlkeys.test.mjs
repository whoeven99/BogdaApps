import assert from "node:assert/strict";
import test from "node:test";

const URL_KEY_LOOKUP_MAX = 200;

function normalizeUrlKeys(raw) {
  if (!Array.isArray(raw)) return [];
  const keys = raw
    .filter((k) => typeof k === "string" && k.length > 0 && k.length <= 512)
    .slice(0, URL_KEY_LOOKUP_MAX);
  return [...new Set(keys)];
}

test("normalizeUrlKeys 去重并丢掉空串", () => {
  assert.deepEqual(normalizeUrlKeys(["files/a.jpg", "files/a.jpg", ""]), ["files/a.jpg"]);
});

test("normalizeUrlKeys 非数组返回空", () => {
  assert.deepEqual(normalizeUrlKeys("files/a.jpg"), []);
});

test("normalizeUrlKeys 最多 200 个", () => {
  const keys = Array.from({ length: 250 }, (_, i) => `files/${i}.jpg`);
  assert.equal(normalizeUrlKeys(keys).length, 200);
});
