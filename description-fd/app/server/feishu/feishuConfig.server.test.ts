import assert from "node:assert/strict";
import { test } from "node:test";
import { prefixFeishuText, resolveFeishuEnv } from "./feishuConfig.server";

test("prod feishu text is unprefixed", () => {
  assert.equal(prefixFeishuText("💳 购买积分：a.myshopify.com", "prod"), "💳 购买积分：a.myshopify.com");
});

test("test feishu text gets a prefix once", () => {
  assert.equal(prefixFeishuText("hello", "test"), "[测试] hello");
  assert.equal(prefixFeishuText("[测试] hello", "test"), "[测试] hello");
});

test("resolveFeishuEnv only accepts test or prod", () => {
  const prev = process.env.FEISHU_ENV;
  try {
    process.env.FEISHU_ENV = "production";
    assert.equal(resolveFeishuEnv(), null);
    process.env.FEISHU_ENV = "prod";
    assert.equal(resolveFeishuEnv(), "prod");
  } finally {
    if (prev === undefined) delete process.env.FEISHU_ENV;
    else process.env.FEISHU_ENV = prev;
  }
});
