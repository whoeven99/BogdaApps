import assert from "node:assert/strict";
import test from "node:test";
import { prefixFeishuText } from "./lib/feishuConfig.mjs";

test("产环境飞书原文，测环境加前缀", () => {
  assert.equal(prefixFeishuText("图译安装 · shop.myshopify.com", "prod"), "图译安装 · shop.myshopify.com");
  assert.equal(
    prefixFeishuText("图译安装 · shop.myshopify.com", "test"),
    "[测试] 图译安装 · shop.myshopify.com",
  );
  assert.equal(
    prefixFeishuText("[测试] 图译安装 · shop.myshopify.com", "test"),
    "[测试] 图译安装 · shop.myshopify.com",
  );
});
