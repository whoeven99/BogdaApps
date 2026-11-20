import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_DESCRIPTION_AI_MODEL,
  isDeepSeekV4Model,
  parseDeepSeekApiKeys,
  resolveDeepSeekChatUrl,
  resolveDescriptionAiModel,
} from "./descriptionAiModels";

test("defaults to deepseek-v4-flash", () => {
  assert.equal(DEFAULT_DESCRIPTION_AI_MODEL, "deepseek-v4-flash");
  assert.equal(resolveDescriptionAiModel(""), "deepseek-v4-flash");
  assert.equal(resolveDescriptionAiModel("gpt-4.1"), "deepseek-v4-flash");
});

test("accepts TSF DeepSeek ids and maps legacy UI labels", () => {
  assert.equal(resolveDescriptionAiModel("deepseek-v4-pro"), "deepseek-v4-pro");
  assert.equal(resolveDescriptionAiModel("DeepSeek R3"), "deepseek-v4-flash");
  assert.equal(resolveDescriptionAiModel("ChatGPT 4.1"), "deepseek-v4-flash");
  assert.equal(resolveDescriptionAiModel("gpt-4o-mini"), "deepseek-v4-flash");
  assert.equal(
    resolveDescriptionAiModel("unknown", "deepseek-reasoner"),
    "deepseek-reasoner",
  );
});

test("v4 models are the thinking-capable ids", () => {
  assert.equal(isDeepSeekV4Model("deepseek-v4-flash"), true);
  assert.equal(isDeepSeekV4Model("deepseek-chat"), false);
});

test("parses DEEPSEEK_API_KEYS and DEEPSEEK_BASE_URL like TSF", () => {
  assert.deepEqual(parseDeepSeekApiKeys(" a ,b, "), ["a", "b"]);
  assert.deepEqual(parseDeepSeekApiKeys(""), []);
  assert.equal(
    resolveDeepSeekChatUrl("https://api.deepseek.com"),
    "https://api.deepseek.com/chat/completions",
  );
  assert.equal(
    resolveDeepSeekChatUrl("https://api.deepseek.com/chat/completions"),
    "https://api.deepseek.com/chat/completions",
  );
});
