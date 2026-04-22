/**
 * 配送折扣 Function（cart.delivery-options.discounts.generate.run）
 * ------------------------------------------------------------------
 * 与行项目折扣 Function 分离：仅处理「阶梯赠品」中的免邮（free_shipping）。
 * 配置来源：Shop metafield `ciwi_bundle` / `ciwi-bundle-offers`（与商品折扣相同）。
 *
 * 购物车行属性（与主题 `properties[__ciwi_*]` 对应）：
 * - 理想情况：行上带有 `__ciwi_bundle_offer_id`、`__ciwi_bundle_tier`（主题脚本写入）。
 * - 兜底：若缺少上述字段（动态结账 / 主题 AJAX 未带上隐藏域等），在满足「唯一命中活动」时
 *   用商品 ID + 行数量推断档位，与行项目折扣 Function 的「按数量取最高满足档」一致，避免「有套装折、无免邮」。
 *
 * 非目标 / 未实现（需在后续迭代补齐）：
 * - B2B 公司定位、草稿订单、订阅结账等场景未单独验证。
 * - 多货币下「后台填写的 freeShippingMaxRateAmount」与运费标价比较依赖结账货币上下文；若跨市场不一致需后续增强。
 *
 * 关联 App 折扣：安装后需在 `shopify.server.ts` 的 afterAuth 中创建 automatic app discount（SHIPPING 类），
 * 并与本 Function 绑定；组合策略需与现有 PRODUCT 折扣在 Shopify 后台保持一致。
 */

import {
  type CartDeliveryDiscountInput,
  CartDeliveryOptionsDiscountsGenerateRunResult,
  DeliveryDiscountSelectionStrategy,
  DeliveryMethod,
  DiscountClass,
} from "../generated/api";

const LOG_PREFIX = "[ciwi-delivery-discount]";

function log(step: string, detail?: unknown): void {
  try {
    if (detail === undefined) console.error(`${LOG_PREFIX} ${step}`);
    else
      console.error(
        `${LOG_PREFIX} ${step} ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
      );
  } catch {
    console.error(`${LOG_PREFIX} ${step}`);
  }
}

type OfferRow = {
  id?: string;
  name?: string;
  status?: boolean;
  startTime?: string;
  endTime?: string;
  offerType?: string;
  selectedProductsJson?: string | null;
  discountRulesJson?: string | null;
  offerSettingsJson?: string | null;
};

type ProgressiveGiftRow = {
  type?: string;
  unlockMode?: string;
  unlockTierIndex?: number;
  unlockAtCount?: number;
  freeShippingMaxRateAmount?: number | null;
};

type ProgressiveGiftsPayload = {
  enabled?: boolean;
  gifts?: ProgressiveGiftRow[];
};

function resolveNowMs(): number | null {
  const v = Date.now();
  return Number.isFinite(v) && v > 0 ? v : null;
}

function parseSelectedIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const buyProducts = (parsed as { buyProducts?: string[] }).buyProducts;
      const getProducts = (parsed as { getProducts?: string[] }).getProducts;
      const all: string[] = [];
      if (Array.isArray(buyProducts)) all.push(...buyProducts.filter((x) => typeof x === "string"));
      if (Array.isArray(getProducts)) all.push(...getProducts.filter((x) => typeof x === "string"));
      return [...new Set(all)];
    }
    if (!Array.isArray(parsed)) return [];
    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string") ids.push(item);
      else if (item && typeof item === "object" && typeof (item as { id?: unknown }).id === "string") {
        ids.push(String((item as { id: string }).id));
      }
    }
    return ids;
  } catch {
    return [];
  }
}

function parseProgressiveGifts(offerSettingsJson?: string | null): ProgressiveGiftsPayload | null {
  if (!offerSettingsJson) return null;
  try {
    const root = JSON.parse(offerSettingsJson) as { progressiveGifts?: ProgressiveGiftsPayload };
    const pg = root?.progressiveGifts;
    if (!pg || typeof pg !== "object") return null;
    return pg;
  } catch {
    return null;
  }
}

function lineMatchesOfferProduct(
  offer: OfferRow,
  productId: string | undefined,
  variantId: string | undefined,
): boolean {
  if (offer.offerType === "bxgy") {
    const rules = parseBxgyFirstRuleBuyIds(offer.discountRulesJson);
    if (!rules.length) return false;
    return (
      (!!productId && rules.includes(productId)) || (!!variantId && rules.includes(variantId))
    );
  }
  const selected = parseSelectedIds(offer.selectedProductsJson);
  if (!selected.length) return true;
  return (
    (!!productId && selected.includes(productId)) || (!!variantId && selected.includes(variantId))
  );
}

function parseBxgyFirstRuleBuyIds(discountRulesJson?: string | null): string[] {
  if (!discountRulesJson) return [];
  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed) || !parsed.length) return [];
    const first = parsed[0] as { buyProductIds?: string[] };
    return Array.isArray(first.buyProductIds) ? first.buyProductIds.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function offerScheduleAndMarketOk(
  offer: OfferRow,
  marketId: string | undefined,
): boolean {
  const nowMs = resolveNowMs();
  if (offer.status === false) return false;
  if (offer.startTime && nowMs !== null) {
    const t = Date.parse(offer.startTime);
    if (Number.isFinite(t) && nowMs < t) return false;
  }
  if (offer.endTime && nowMs !== null) {
    const t = Date.parse(offer.endTime);
    if (Number.isFinite(t) && nowMs > t) return false;
  }
  if (marketId && offer.offerSettingsJson) {
    try {
      const settings = JSON.parse(offer.offerSettingsJson) as { markets?: string };
      const offerMarkets = settings.markets;
      if (typeof offerMarkets === "string" && offerMarkets !== "all" && offerMarkets.trim() !== "") {
        const allowed = offerMarkets.split(",").map((m) => m.trim());
        const hit = allowed.some((m) => m === marketId || m.endsWith(`/${marketId}`));
        if (!hit) return false;
      }
    } catch {
      /* ignore */
    }
  }
  return true;
}

function parseMoneyAmount(raw: unknown): number | null {
  if (raw == null) return null;
  const n = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

function readLineBundleProps(
  line: CartDeliveryDiscountInput["cart"]["lines"][number],
): {
  tier: number | null;
  offerId: string | null;
} {
  let tier: number | null = null;
  let offerId: string | null = null;
  const tr = line.bundleTierProp?.value;
  if (tr != null && String(tr).trim() !== "") {
    const n = Math.trunc(Number(tr));
    if (Number.isFinite(n) && n >= 1) tier = n;
  }
  const oid = line.bundleOfferProp?.value;
  if (oid != null && String(oid).trim() !== "") {
    offerId = String(oid).trim();
  }
  return { tier, offerId };
}

/** 解析 quantity-breaks 规则的 count 列表（升序），供档位推断 */
function parseQuantityBreakTierCounts(discountRulesJson?: string | null): number[] {
  if (!discountRulesJson) return [];
  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    const counts: number[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const c = Math.trunc(Number((item as { count?: unknown }).count));
      if (!Number.isFinite(c) || c < 1) continue;
      counts.push(c);
    }
    counts.sort((a, b) => a - b);
    return counts;
  } catch {
    return [];
  }
}

/** 解析 bxgy 规则的 count 列表（升序），供档位推断 */
function parseBxgyTierCounts(discountRulesJson?: string | null): number[] {
  if (!discountRulesJson) return [];
  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    const counts: number[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const c = Math.trunc(Number((item as { count?: unknown }).count));
      if (!Number.isFinite(c) || c < 1) continue;
      counts.push(c);
    }
    counts.sort((a, b) => a - b);
    return counts;
  } catch {
    return [];
  }
}

/**
 * 无行属性时推断 Bar 序号（1-based，与主题 `__ciwi_bundle_tier` 语义对齐）：
 * - quantity-breaks：与行项目折扣一致，取「满足 quantity >= tier.count」的最高档；Single=1，第 i 条规则对应 bar i+2。
 * - bxgy：与主题一致，仅当 quantity 与某一档 count 完全相等时命中该档，否则视为 1。
 */
function inferBarIndexFromOfferAndQty(offer: OfferRow, qty: number): number {
  const q = Math.max(1, Math.trunc(Number(qty) || 1));
  if (offer.offerType === "bxgy") {
    const counts = parseBxgyTierCounts(offer.discountRulesJson);
    const idx = counts.findIndex((c) => c === q);
    return idx >= 0 ? idx + 1 : 1;
  }
  if (q === 1) return 1;
  const tiers = parseQuantityBreakTierCounts(offer.discountRulesJson);
  if (!tiers.length) return 1;
  let bestIdx = -1;
  for (let i = 0; i < tiers.length; i++) {
    if (q >= tiers[i]) bestIdx = i;
  }
  if (bestIdx < 0) return 1;
  return bestIdx + 2;
}

function progressiveGiftsActiveOnOffer(offer: OfferRow): boolean {
  const pg = parseProgressiveGifts(offer.offerSettingsJson ?? null);
  return !!(pg?.enabled && Array.isArray(pg.gifts) && pg.gifts.length);
}

/**
 * 解析本行用于阶梯免邮的 (活动, 档位)。
 * 行属性优先；缺失时用商品匹配 + 数量推断（见文件头说明）。
 */
function resolveOfferAndTierForProgressiveLine(
  line: CartDeliveryDiscountInput["cart"]["lines"][number],
  offers: OfferRow[],
  marketId: string | undefined,
  productId: string | undefined,
  variantId: string | undefined,
  qty: number,
): { offer: OfferRow; tier: number } | null {
  const props = readLineBundleProps(line);
  const eligible = offers.filter(
    (o) =>
      offerScheduleAndMarketOk(o, marketId) &&
      lineMatchesOfferProduct(o, productId, variantId) &&
      progressiveGiftsActiveOnOffer(o),
  );
  if (!eligible.length) return null;

  let offer: OfferRow | undefined;
  if (props.offerId) {
    offer = eligible.find((o) => String(o.id) === String(props.offerId));
    if (!offer) return null;
  } else if (eligible.length === 1) {
    offer = eligible[0];
  } else {
    log("tier_resolve_skip", {
      reason: "multiple_eligible_offers_need_line_offer_id",
      offerIds: eligible.map((o) => o.id),
    });
    return null;
  }

  const tier = props.tier != null ? props.tier : inferBarIndexFromOfferAndQty(offer, qty);
  if (props.tier == null) {
    log("tier_inferred", { offerId: offer.id, qty, tier });
  }
  return { offer, tier };
}

export function bundleDeliveryDiscountGenerateRun(
  input: CartDeliveryDiscountInput,
): CartDeliveryOptionsDiscountsGenerateRunResult {
  const hasShipping = input.discount.discountClasses.includes(DiscountClass.Shipping);
  if (!hasShipping) {
    log("early_exit", { reason: "no_shipping_discount_class" });
    return { operations: [] };
  }

  const shopPayload = input.shop?.metafield?.jsonValue as
    | { offers?: OfferRow[] }
    | null
    | undefined;
  const offers = shopPayload?.offers ?? [];
  if (!offers.length) {
    log("early_exit", { reason: "no_offers" });
    return { operations: [] };
  }

  const marketId = input.localization.market?.id ?? undefined;
  const handlesToDiscount = new Set<string>();

  for (const line of input.cart.lines) {
    if (line.merchandise.__typename !== "ProductVariant") continue;
    const variantId = line.merchandise.id;
    const productId = line.merchandise.product?.id ?? undefined;
    const qty = Math.max(1, Math.trunc(Number(line.quantity) || 1));

    const resolved = resolveOfferAndTierForProgressiveLine(
      line,
      offers,
      marketId,
      productId,
      variantId,
      qty,
    );
    if (!resolved) continue;

    const { offer, tier } = resolved;
    const pg = parseProgressiveGifts(offer.offerSettingsJson ?? null);
    if (!pg?.enabled || !Array.isArray(pg.gifts) || !pg.gifts.length) continue;

    for (const gift of pg.gifts) {
      if (String(gift.type) !== "free_shipping") continue;
      const mode = String(gift.unlockMode || "tier_index");
      let unlocked = false;
      if (mode === "at_count") {
        const need = Math.max(1, Math.trunc(Number(gift.unlockAtCount) || 1));
        unlocked = qty >= need;
      } else {
        const needBar = Math.max(1, Math.trunc(Number(gift.unlockTierIndex) || 1));
        unlocked = tier >= needBar;
      }
      if (!unlocked) continue;

      const maxRate = gift.freeShippingMaxRateAmount;
      for (const group of input.cart.deliveryGroups) {
        for (const opt of group.deliveryOptions) {
          if (opt.deliveryMethodType !== DeliveryMethod.Shipping) continue;
          const amt = parseMoneyAmount(opt.cost?.amount);
          if (amt == null) continue;
          if (maxRate != null && Number.isFinite(maxRate) && amt > maxRate) {
            continue;
          }
          handlesToDiscount.add(String(opt.handle));
        }
      }
    }
  }

  if (!handlesToDiscount.size) {
    log("early_exit", { reason: "no_qualifying_options" });
    return { operations: [] };
  }

  const candidates = [...handlesToDiscount].map((handle) => ({
    message: "Bundle free shipping",
    targets: [{ deliveryOption: { handle } }],
    value: { percentage: { value: "100.0" } },
    associatedDiscountCode: undefined as undefined,
  }));

  log("apply", { optionCount: candidates.length });

  return {
    operations: [
      {
        deliveryDiscountsAdd: {
          candidates,
          selectionStrategy: DeliveryDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}
