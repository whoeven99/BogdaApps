import { describe, expect, it } from "vitest";

import type { OfferListItem } from "../../routes/_index/types";
import {
  buildCompactOffersPayload,
  buildShardedClassPayloads,
  offersFitWithinShardLimits,
  measureUtf8Bytes,
  COMPACT_OFFERS_FORMAT_VERSION,
  OFFER_SHARD_COUNT,
  FUNCTION_OFFERS_MAX_BYTES,
} from "./offerPayload.server";

// Function payload 压缩格式(v2) A+B+C：
//   A 内联对象（无 JSON-in-JSON 双重编码）
//   B 短键名
//   C product/variant GID → 纯数字（Market 等其它 GID 保留）

function makeOffer(overrides: Partial<OfferListItem> = {}): OfferListItem {
  return {
    id: "off_1",
    name: "Test Offer",
    cartTitle: "Buy more save more",
    offerType: "bxgy",
    status: true,
    startTime: null,
    endTime: null,
    campaignConfigJson: null,
    selectedProductsJson: JSON.stringify({
      buyProducts: ["gid://shopify/Product/111"],
      getProducts: ["gid://shopify/Product/222"],
    }),
    discountRulesJson: JSON.stringify([
      { count: 2, discountPercent: 100, buyProductIds: ["gid://shopify/Product/111"] },
    ]),
    offerSettingsJson: JSON.stringify({ markets: "gid://shopify/Market/999", quantity: false }),
    ...overrides,
  } as unknown as OfferListItem;
}

describe("buildCompactOffersPayload 压缩格式", () => {
  it("产出 v2 短键格式，跳过空字段", async () => {
    const payload = await buildCompactOffersPayload([makeOffer()]);
    const parsed = JSON.parse(payload) as { v: number; offers: Array<Record<string, unknown>> };

    expect(parsed.v).toBe(COMPACT_OFFERS_FORMAT_VERSION);
    expect(parsed.offers).toHaveLength(1);

    const o = parsed.offers[0];
    expect(o.i).toBe("off_1");
    expect(o.t).toBe("bxgy");
    expect(o.c).toBe("Buy more save more");
    expect(o.x).toBe(true);
    // 长键名不应出现
    expect(o).not.toHaveProperty("selectedProductsJson");
    expect(o).not.toHaveProperty("offerType");
    // 空的 startTime/endTime 被省略
    expect(o).not.toHaveProperty("b");
    expect(o).not.toHaveProperty("e");
  });

  it("A：selected/discount/settings 是内联对象，而非转义字符串", async () => {
    const payload = await buildCompactOffersPayload([makeOffer()]);
    const parsed = JSON.parse(payload) as { offers: Array<Record<string, unknown>> };
    const o = parsed.offers[0];

    expect(typeof o.s).toBe("object");
    expect(typeof o.o).toBe("object");
    // 双重编码会留下 \" 转义；内联对象不会
    expect(payload).not.toContain('\\"');
  });

  it("C：Product/ProductVariant GID 压成纯数字，Market GID 保留", async () => {
    const payload = await buildCompactOffersPayload([makeOffer()]);

    expect(payload).not.toContain("gid://shopify/Product/111");
    expect(payload).not.toContain("gid://shopify/Product/222");
    expect(payload).toContain("111");
    expect(payload).toContain("222");
    // 非 product 类 GID 不应被改动
    expect(payload).toContain("gid://shopify/Market/999");
  });

  it("压缩后体积明显小于旧的双重编码长键格式", async () => {
    const offer = makeOffer();
    const compact = await buildCompactOffersPayload([offer]);

    // 模拟旧格式：长键 + JSON-in-JSON 字符串
    const legacy = JSON.stringify({
      updatedAt: new Date().toISOString(),
      offers: [
        {
          id: offer.id,
          cartTitle: offer.cartTitle,
          status: offer.status,
          startTime: offer.startTime,
          endTime: offer.endTime,
          selectedProductsJson: offer.selectedProductsJson,
          discountRulesJson: offer.discountRulesJson,
          offerSettingsJson: offer.offerSettingsJson,
          offerType: offer.offerType,
        },
      ],
    });

    expect(measureUtf8Bytes(compact)).toBeLessThan(measureUtf8Bytes(legacy));
  });

  it("status=false 的 offer 不计入 payload（未发布不同步）", async () => {
    const payload = await buildCompactOffersPayload([makeOffer({ status: false } as Partial<OfferListItem>)]);
    const parsed = JSON.parse(payload) as { offers: unknown[] };
    expect(parsed.offers).toHaveLength(0);
  });
});

function makeFreeGiftOffer(): OfferListItem {
  return {
    id: "fg_1",
    name: "Free Gift",
    cartTitle: "满额送礼",
    offerType: "free-gift",
    status: true,
    startTime: null,
    endTime: null,
    campaignConfigJson: null,
    selectedProductsJson: JSON.stringify({
      triggerProducts: ["gid://shopify/Product/111"],
      giftProducts: ["gid://shopify/Product/222"],
    }),
    discountRulesJson: JSON.stringify([
      { amountThreshold: 100, giftProductIds: ["gid://shopify/Product/222"], rewardType: "gift_product" },
    ]),
    offerSettingsJson: JSON.stringify({}),
  } as unknown as OfferListItem;
}

describe("buildShardedClassPayloads 按 class 分片（v2 兼容 + 修复派生 bug）", () => {
  it("PRODUCT 类拿到 bxgy offer；返回固定片数，每片 <10KB", async () => {
    const payload = await buildCompactOffersPayload([makeOffer()]);
    const { shards, droppedOfferCount } = buildShardedClassPayloads(payload, "PRODUCT");

    expect(shards).toHaveLength(OFFER_SHARD_COUNT);
    expect(droppedOfferCount).toBe(0);
    for (const shard of shards) {
      expect(measureUtf8Bytes(shard)).toBeLessThanOrEqual(FUNCTION_OFFERS_MAX_BYTES);
    }
    const shard0 = JSON.parse(shards[0]) as { v: number; offers: Array<{ i?: string; t?: string }> };
    expect(shard0.v).toBe(COMPACT_OFFERS_FORMAT_VERSION);
    expect(shard0.offers.some((o) => o.i === "off_1" && o.t === "bxgy")).toBe(true);
  });

  it("bxgy offer 不进 ORDER/SHIPPING 类（class 派生认识 v2 短键，修复了空 payload bug）", async () => {
    const payload = await buildCompactOffersPayload([makeOffer()]);
    for (const cls of ["ORDER", "SHIPPING"] as const) {
      const { shards } = buildShardedClassPayloads(payload, cls);
      const total = shards
        .map((s) => (JSON.parse(s) as { offers: unknown[] }).offers.length)
        .reduce((a, b) => a + b, 0);
      expect(total).toBe(0);
    }
  });

  it("free-gift offer 归到 ORDER 类而非 PRODUCT", async () => {
    const payload = await buildCompactOffersPayload([makeFreeGiftOffer()]);

    const order = buildShardedClassPayloads(payload, "ORDER").shards
      .map((s) => (JSON.parse(s) as { offers: Array<{ i?: string }> }).offers)
      .flat();
    const product = buildShardedClassPayloads(payload, "PRODUCT").shards
      .map((s) => (JSON.parse(s) as { offers: unknown[] }).offers)
      .flat();

    expect(order.some((o) => o.i === "fg_1")).toBe(true);
    expect(product).toHaveLength(0);
  });
});

describe("offersFitWithinShardLimits 守卫", () => {
  it("正常体积 → ok", async () => {
    const payload = await buildCompactOffersPayload([makeOffer(), makeFreeGiftOffer()]);
    expect(offersFitWithinShardLimits(payload).ok).toBe(true);
  });

  it("单个 offer 大到任何分片都放不下 → 不 ok，并标出溢出的 class", () => {
    // 直接构造一个 product(bxgy) offer，selected 列表巨大，序列化后 >10KB
    const hugeIds = Array.from({ length: 2000 }, (_, n) => String(100000000 + n));
    const payload = JSON.stringify({
      v: COMPACT_OFFERS_FORMAT_VERSION,
      updatedAt: new Date().toISOString(),
      offers: [{ i: "big", t: "bxgy", s: { buyProducts: hugeIds, getProducts: hugeIds } }],
    });

    const fit = offersFitWithinShardLimits(payload);
    expect(fit.ok).toBe(false);
    expect(fit.overflowClasses).toContain("PRODUCT");
  });
});
