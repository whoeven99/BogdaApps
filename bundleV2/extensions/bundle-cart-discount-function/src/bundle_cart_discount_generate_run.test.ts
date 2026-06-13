import { describe, expect, it } from "vitest";

import {
  expandCompactOffer,
  resolveExclusiveProductCandidates,
} from "./bundle_cart_discount_generate_run";

// 仲裁层冲突测试：固化"一个商品命中多个优惠"的裁决语义。
// 关键点：
//   - 数量阶梯（percentage）是"可拆"候选，冲突时可缩到剩余空闲单位而非整条丢弃；
//   - BXGY（100% off 指定单位）与 complete-bundle（整包 fixedAmount）是"原子"候选；
//   - 不再硬编码"BXGY/bundle 优先于数量阶梯"，纯按最大实际减免裁决。

type AnyCandidate = Parameters<typeof resolveExclusiveProductCandidates>[0][number];

function line(id: string, quantity: number, unitPrice: number) {
  return {
    id,
    quantity,
    cost: { amountPerQuantity: { amount: String(unitPrice) } },
    merchandise: { __typename: "ProductVariant" },
  } as unknown as Parameters<typeof resolveExclusiveProductCandidates>[1][number];
}

function percentageCandidate(
  message: string,
  lineId: string,
  quantity: number,
  percent: number,
): AnyCandidate {
  return {
    message,
    targets: [{ cartLine: { id: lineId, quantity } }],
    value: { percentage: { value: String(percent) } },
  } as unknown as AnyCandidate;
}

function fixedAmountBundleCandidate(
  message: string,
  lineId: string,
  quantity: number,
  amount: number,
): AnyCandidate {
  return {
    message,
    targets: [{ cartLine: { id: lineId, quantity } }],
    value: { fixedAmount: { amount: String(amount), appliesToEachItem: false } },
  } as unknown as AnyCandidate;
}

function quantityOnLine(candidate: AnyCandidate, lineId: string): number {
  return (candidate.targets ?? [])
    .filter((t) => t.cartLine?.id === lineId)
    .reduce((sum, t) => sum + Number(t.cartLine?.quantity ?? 0), 0);
}

describe("resolveExclusiveProductCandidates 冲突裁决", () => {
  it("不同 cart line 上的候选互不阻塞，全部保留", () => {
    const bxgy = percentageCandidate("BXGY", "lineA", 1, 100); // 100% off 1 件
    const qb = percentageCandidate("QtyBreak", "lineB", 3, 50);

    const winners = resolveExclusiveProductCandidates(
      [bxgy, qb],
      [line("lineA", 3, 100), line("lineB", 3, 100)],
      new Set([qb]),
    );

    expect(winners).toHaveLength(2);
    expect(winners).toContain(bxgy);
    expect(winners).toContain(qb);
  });

  it("数量阶梯档位按全量数量评估：BXGY 占 1 件后，阶梯仍按整行 6 件取高档，缩到剩余 5 件", () => {
    // 旧行为：阶梯只看 availableQty=5，可能取不到 6 件档；新行为：按全量 6 件取 50% 档。
    const bxgy = percentageCandidate("BXGY 买5送1", "lineA", 1, 100); // 100% off 1 件，savings=100
    const qb = percentageCandidate("阶梯 6件5折", "lineA", 6, 50); // 全量 savings=300

    const winners = resolveExclusiveProductCandidates(
      [bxgy, qb],
      [line("lineA", 6, 100)],
      new Set([qb]),
    );

    // 两者共存：BXGY 占 1 件，阶梯缩到剩余 5 件（按 50% 档），优于挤掉 BXGY。
    expect(winners).toHaveLength(2);
    expect(winners).toContain(bxgy);
    const qbWinner = winners.find((c) => c !== bxgy)!;
    expect(quantityOnLine(qbWinner, "lineA")).toBe(5);
    expect(qbWinner.value).toHaveProperty("percentage");
  });

  it("BXGY 占部分单位时，数量阶梯缩到剩余单位与之共存（拆单位能力保留）", () => {
    const bxgy = percentageCandidate("BXGY 买3送2", "lineA", 2, 100); // 占 2 件，savings=200
    const qb = percentageCandidate("阶梯 5件3折", "lineA", 5, 30); // 全量 savings=150

    const winners = resolveExclusiveProductCandidates(
      [bxgy, qb],
      [line("lineA", 5, 100)],
      new Set([qb]),
    );

    expect(winners).toHaveLength(2);
    expect(winners).toContain(bxgy);
    const qbWinner = winners.find((c) => c !== bxgy)!;
    expect(quantityOnLine(qbWinner, "lineA")).toBe(3); // 5 - 2 已占 = 3 剩余
  });

  it("数量阶梯更省时，可挤掉占满整行的低价值 complete-bundle（去除硬模块优先级）", () => {
    const bundle = fixedAmountBundleCandidate("整包减20", "lineA", 4, 20); // savings=20，占满 4 件
    const qb = percentageCandidate("阶梯 4件5折", "lineA", 4, 50); // savings=200

    const winners = resolveExclusiveProductCandidates(
      [bundle, qb],
      [line("lineA", 4, 100)],
      new Set([qb]),
    );

    // bundle 占满整行、无剩余单位可拆，且阶梯净收益(200-20)>0 → 挤掉 bundle，阶梯按全量落地。
    expect(winners).toHaveLength(1);
    expect(winners[0]).toBe(qb);
    expect(quantityOnLine(winners[0], "lineA")).toBe(4);
  });

  it("complete-bundle 更省时保持原子整包，弱数量阶梯被丢弃（不被裁剪偷单位）", () => {
    const bundle = fixedAmountBundleCandidate("整包减200", "lineA", 4, 200); // savings=200，占满整行
    const qb = percentageCandidate("阶梯 4件1折", "lineA", 4, 10); // savings=40

    const winners = resolveExclusiveProductCandidates(
      [bundle, qb],
      [line("lineA", 4, 100)],
      new Set([qb]),
    );

    expect(winners).toHaveLength(1);
    expect(winners[0]).toBe(bundle);
    expect(quantityOnLine(winners[0], "lineA")).toBe(4); // 整包语义未被裁剪
  });
});

describe("expandCompactOffer 压缩格式还原", () => {
  it("把压缩(v2)offer 还原为运行期 Offer：内联对象重新 stringify 成字符串", () => {
    const expanded = expandCompactOffer({
      i: "off_1",
      c: "Buy more",
      t: "bxgy",
      x: true,
      b: "2026-01-01T00:00:00Z",
      s: { buyProducts: ["111"], getProducts: ["222"] },
      d: [{ count: 2, discountPercent: 100 }],
      o: { markets: "gid://shopify/Market/999" },
    });

    expect(expanded.id).toBe("off_1");
    expect(expanded.cartTitle).toBe("Buy more");
    expect(expanded.offerType).toBe("bxgy");
    expect(expanded.status).toBe(true);
    expect(expanded.startTime).toBe("2026-01-01T00:00:00Z");
    expect(expanded.endTime).toBeUndefined();
    // *Json 字段还原为字符串，供下游既有 JSON.parse 逻辑消费
    expect(typeof expanded.selectedProductsJson).toBe("string");
    expect(JSON.parse(expanded.selectedProductsJson!)).toEqual({
      buyProducts: ["111"],
      getProducts: ["222"],
    });
    expect(JSON.parse(expanded.discountRulesJson!)).toEqual([{ count: 2, discountPercent: 100 }]);
    expect(JSON.parse(expanded.offerSettingsJson!)).toEqual({ markets: "gid://shopify/Market/999" });
  });

  it("旧格式（长键 + 字符串字段）原样透传", () => {
    const legacy = {
      id: "off_2",
      offerType: "complete-bundle",
      cartTitle: "Bundle",
      status: true,
      selectedProductsJson: '{"bars":[]}',
      discountRulesJson: "[]",
      offerSettingsJson: "{}",
    };
    const expanded = expandCompactOffer(legacy);
    expect(expanded).toBe(legacy); // 透传同一引用，不改动
  });

  it("内联字段缺失时还原为 null，不抛错", () => {
    const expanded = expandCompactOffer({ i: "off_3", t: "quantity-breaks-same" });
    expect(expanded.selectedProductsJson).toBeNull();
    expect(expanded.discountRulesJson).toBeNull();
    expect(expanded.offerSettingsJson).toBeNull();
  });
});
