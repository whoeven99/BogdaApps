import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

function mustUseTurso(env = {}) {
  return Boolean(env.RENDER) || env.NODE_ENV === "production";
}

test("mustUseTurso：Render 或 production 必须连 Turso", () => {
  assert.equal(mustUseTurso({}), false);
  assert.equal(mustUseTurso({ NODE_ENV: "development" }), false);
  assert.equal(mustUseTurso({ NODE_ENV: "test" }), false);
  assert.equal(mustUseTurso({ NODE_ENV: "production" }), true);
  assert.equal(mustUseTurso({ RENDER: "true" }), true);
  assert.equal(mustUseTurso({ RENDER: "true", NODE_ENV: "development" }), true);
});

test("mustUseTurso 与 tursoTarget.server.ts 同口径", () => {
  const src = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app/config/tursoTarget.server.ts"),
    "utf8",
  );
  assert.match(src, /Boolean\(env\.RENDER\) \|\| env\.NODE_ENV === "production"/);
  const dbSrc = readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../app/db.server.ts"),
    "utf8",
  );
  assert.match(dbSrc, /mustUseTurso\(\)/);
  assert.match(dbSrc, /生产禁止回退本地 SQLite/);
});
