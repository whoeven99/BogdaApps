import assert from "node:assert/strict";
import test from "node:test";
import {
  displaySwitcherPagePath,
  matchesSwitcherPageSearch,
  normalizeSwitcherPageSearch,
  resolveCollectTargetCode,
  resolveShopLocale,
  stripShopLocalePrefix,
} from "./lib/shopLocale.mjs";

const LOCALES = ["en", "zh-CN", "ja"];

test("resolveShopLocale 把 zh-hans / zh-cn 映射到店铺 zh-CN", () => {
  assert.equal(resolveShopLocale("zh-hans", LOCALES), "zh-CN");
  assert.equal(resolveShopLocale("zh-cn", LOCALES), "zh-CN");
  assert.equal(resolveShopLocale("ZH-CN", LOCALES), "zh-CN");
  assert.equal(resolveShopLocale("zh", LOCALES), "zh-CN");
});

test("resolveShopLocale 对不上返回 null", () => {
  assert.equal(resolveShopLocale("fr", LOCALES), null);
  assert.equal(resolveShopLocale("", LOCALES), null);
  assert.equal(resolveShopLocale("zh-cn", ["en", "ja"]), null);
});

test("stripShopLocalePrefix 剥本店语言前缀", () => {
  assert.equal(stripShopLocalePrefix("/zh-CN/products/hat", LOCALES), "/products/hat");
  assert.equal(stripShopLocalePrefix("/zh-hans/products/hat", LOCALES), "/products/hat");
  assert.equal(stripShopLocalePrefix("/products/hat", LOCALES), "/products/hat");
  assert.equal(stripShopLocalePrefix("/", LOCALES), "/");
});

test("displaySwitcherPagePath 非主语言加回前缀", () => {
  assert.equal(displaySwitcherPagePath("/products/hat", "zh-CN", LOCALES, "en"), "/zh-cn/products/hat");
  assert.equal(displaySwitcherPagePath("/products/hat", "en", LOCALES, "en"), "/products/hat");
});

test("matchesSwitcherPageSearch 匹配存储路径或展示路径，忽略大小写", () => {
  const display = displaySwitcherPagePath("/products/hat", "zh-CN", LOCALES, "en");
  assert.equal(matchesSwitcherPageSearch("/products/hat", display, "HAT"), true);
  assert.equal(matchesSwitcherPageSearch("/products/hat", display, "zh-cn"), true);
  assert.equal(matchesSwitcherPageSearch("/products/hat", display, "loox"), false);
  assert.equal(matchesSwitcherPageSearch("/products/hat", display, "  "), true);
  assert.equal(normalizeSwitcherPageSearch(`/${"a".repeat(200)}`).length, 128);
});

test("resolveCollectTargetCode 优先客户端语言，对不上不挂页", () => {
  assert.equal(
    resolveCollectTargetCode({
      languageCode: "zh-hans",
      rawPagePath: "/products/hat",
      shopLocales: LOCALES,
      primaryLocale: "en",
    }),
    "zh-CN",
  );
  assert.equal(
    resolveCollectTargetCode({
      languageCode: "fr",
      rawPagePath: "/products/hat",
      shopLocales: LOCALES,
      primaryLocale: "en",
    }),
    null,
  );
  assert.equal(
    resolveCollectTargetCode({
      languageCode: "",
      rawPagePath: "/zh-CN/products/hat",
      shopLocales: LOCALES,
      primaryLocale: "en",
    }),
    "zh-CN",
  );
});
