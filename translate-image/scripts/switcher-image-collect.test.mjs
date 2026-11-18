import assert from "node:assert/strict";
import test from "node:test";
import {
  SWITCHER_IMAGE_TOTAL_CAP,
  buildSwitcherImageOnConflictInsertSql,
  collectRateLimitKey,
  normalizeSwitcherCollectInput,
  planSwitcherCollectWrites,
  resolveCollectPerMinute,
  shouldAllowCollectCount,
  shouldWriteSwitcherImagePage,
  switcherImageCapOverflow,
  tryAcquireCollectSlot,
} from "./lib/switcherImageCollect.mjs";

test("normalizeSwitcherCollectInput 丢掉 Shopify CDN 和 data URL", () => {
  const { items, pagePath } = normalizeSwitcherCollectInput({
    pagePath: "/products/hat",
    images: [
      { src: "https://cdn.shopify.com/s/files/1/1/2/files/a.jpg" },
      { src: "data:image/png;base64,xxx" },
      { src: "https://cdn.judgeme.com/reviews/a.jpg?w=400" },
    ],
  });
  assert.equal(pagePath, "/products/hat");
  assert.equal(items.length, 1);
  assert.equal(items[0].urlKey, "ext:cdn.judgeme.com/reviews/a.jpg");
  assert.equal(items[0].imageBeforeUrl, "https://cdn.judgeme.com/reviews/a.jpg?w=400");
});

test("normalizeSwitcherCollectInput query 不进 urlKey，pagePath 截断 512", () => {
  const longPath = `/${"a".repeat(600)}`;
  const { items, pagePath } = normalizeSwitcherCollectInput({
    pagePath: longPath,
    images: [{ src: "https://CDN.JudgeMe.com/reviews/a.jpg?w=400#x" }],
  });
  assert.equal(items[0].urlKey, "ext:cdn.judgeme.com/reviews/a.jpg");
  assert.equal(pagePath.length, 512);
});

test("planSwitcherCollectWrites 满帽仍插入新图，溢出交给淘汰", () => {
  const plan = planSwitcherCollectWrites({
    items: [
      { urlKey: "ext:a.com/1.jpg", imageBeforeUrl: "https://a.com/1.jpg" },
      { urlKey: "ext:a.com/2.jpg", imageBeforeUrl: "https://a.com/2.jpg" },
    ],
    existingKeys: ["ext:a.com/1.jpg"],
    total: 10000,
    cap: 10000,
  });
  assert.equal(plan.toUpdate.length, 1);
  assert.equal(plan.toInsert.length, 1);
  assert.equal(plan.skipped, 0);
});

test("switcherImageCapOverflow 10001 → 1，上限 500", () => {
  assert.equal(switcherImageCapOverflow(10000, SWITCHER_IMAGE_TOTAL_CAP), 0);
  assert.equal(switcherImageCapOverflow(10001, SWITCHER_IMAGE_TOTAL_CAP), 1);
  assert.equal(switcherImageCapOverflow(20000, SWITCHER_IMAGE_TOTAL_CAP), 500);
});

test("shouldWriteSwitcherImagePage 要同时有路径和语言", () => {
  assert.equal(shouldWriteSwitcherImagePage("/products/hat", "zh-CN"), true);
  assert.equal(shouldWriteSwitcherImagePage("/products/hat", null), false);
  assert.equal(shouldWriteSwitcherImagePage(null, "en"), false);
});

test("限流默认每分钟 1 次，key 用 img: 前缀", () => {
  assert.equal(resolveCollectPerMinute(undefined), 1);
  assert.equal(resolveCollectPerMinute("0"), 1);
  assert.equal(resolveCollectPerMinute("6"), 6);
  assert.equal(shouldAllowCollectCount(1, 1), true);
  assert.equal(shouldAllowCollectCount(2, 1), false);
  assert.equal(collectRateLimitKey("shop.myshopify.com"), "img:sf:rl:collect:shop.myshopify.com");
});

test("tryAcquireCollectSlot 第 1 次 true，第 2 次 false；Redis 故障拒绝", async () => {
  let n = 0;
  const redis = {
    incr: async () => ++n,
    expire: async () => 1,
  };
  assert.equal(
    await tryAcquireCollectSlot({
      redis,
      shop: "shop.myshopify.com",
      limit: 1,
      windowSec: 60,
    }),
    true,
  );
  assert.equal(
    await tryAcquireCollectSlot({
      redis,
      shop: "shop.myshopify.com",
      limit: 1,
      windowSec: 60,
    }),
    false,
  );
  assert.equal(
    await tryAcquireCollectSlot({
      redis: {
        incr: async () => {
          throw new Error("down");
        },
        expire: async () => 1,
      },
      shop: "shop.myshopify.com",
      limit: 1,
      windowSec: 60,
    }),
    false,
  );
});

test("normalizeSwitcherCollectInput 丢掉内网 host", () => {
  const { items } = normalizeSwitcherCollectInput({
    pagePath: "/",
    images: [
      { src: "https://192.168.0.12/reviews/a.jpg" },
      { src: "https://cdn.judgeme.com/reviews/a.jpg" },
    ],
  });
  assert.equal(items.length, 1);
  assert.equal(items[0].urlKey, "ext:cdn.judgeme.com/reviews/a.jpg");
});

test("buildSwitcherImageOnConflictInsertSql 只拼占位符，冲突不改 id", () => {
  const sql = buildSwitcherImageOnConflictInsertSql(2);
  assert.match(sql, /ON CONFLICT\(shop, urlKey\)/);
  assert.doesNotMatch(sql, /id = excluded.id/);
  assert.equal((sql.match(/\?/g) || []).length, 14);
});
