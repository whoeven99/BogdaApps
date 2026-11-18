import assert from "node:assert/strict";
import test from "node:test";
import {
  ImageTranslateError,
  describeImageTranslateError,
  formatImageTranslateErrorLog,
  summarizeError,
} from "../app/server/picture/imageTranslateError.ts";

function fetchFailed(causeMessage, extra = {}) {
  const cause = new Error(causeMessage);
  cause.name = extra.name ?? "ConnectTimeoutError";
  if (extra.code) cause.code = extra.code;
  if (extra.address) cause.address = extra.address;
  if (extra.port != null) cause.port = extra.port;
  return new TypeError("fetch failed", { cause });
}

test("summarizeError walks Node fetch failed cause chain", () => {
  const err = fetchFailed("Connect Timeout Error (attempted address: 23.227.38.74:443, timeout: 10000ms)", {
    code: "UND_ERR_CONNECT_TIMEOUT",
    address: "23.227.38.74",
    port: 443,
  });
  const text = summarizeError(err);
  assert.match(text, /name=TypeError/);
  assert.match(text, /fetch failed/);
  assert.match(text, /ConnectTimeoutError/);
  assert.match(text, /UND_ERR_CONNECT_TIMEOUT/);
  assert.match(text, /23\.227\.38\.74/);
  assert.match(text, /port=443/);
});

test("wrapping Shopify upload keeps cause in logs and Turso storage", () => {
  const inner = fetchFailed("Connect Timeout Error", { code: "UND_ERR_CONNECT_TIMEOUT" });
  const err = new ImageTranslateError("SHOPIFY_UPLOAD_FAILED", summarizeError(inner), { cause: inner });
  const log = formatImageTranslateErrorLog(err);
  assert.match(log, /code=SHOPIFY_UPLOAD_FAILED/);
  assert.match(log, /UND_ERR_CONNECT_TIMEOUT/);
  assert.equal(log.includes(" [object"), false);
  const described = describeImageTranslateError(err);
  assert.equal(described.code, "SHOPIFY_UPLOAD_FAILED");
  assert.match(described.detail, /UND_ERR_CONNECT_TIMEOUT/);
});

test("plain Error still formats a single line", () => {
  assert.equal(formatImageTranslateErrorLog(new Error("boom")), "code=UNKNOWN detail=boom");
  assert.deepEqual(describeImageTranslateError(new ImageTranslateError("GEMINI_FAILED", "HTTP 404")), {
    code: "GEMINI_FAILED",
    detail: "HTTP 404",
  });
});
