import { CartInput } from "../../generated/api";
import type {
  ProductDiscountCandidate,
  OrderDiscountCandidate,
} from "../../generated/api";
import {
  Offer,
  CompiledOfferRuntime,
  ParsedOfferSettings,
  DiscountTier,
  BxgyDiscountRule,
  CompleteBundlePricingMode,
  CompleteBundleBarRow,
  CompleteBundleProductRow,
  CompleteBundleAllocation,
  IndexedCartLine,
} from "./types";
import { log } from "./log";
import {
  isCompactOfferWire,
  offerPassesScheduleAndMarket,
  getScopedLinesForCompiledOffer,
  getScopedLinesForSelectedIds,
  parseSelectedIds,
  parseDiscountRulesJson,
  matchesAnyConfiguredId,
  productIdsMatch,
  resolveSameProductBxgyQuantities,
  resolveDiscountMessage,
  parseMoneyAmount,
  buildOfferLookupKey,
  buildSelectedLookupKeys,
  DEFAULT_DISCOUNT_PERCENTAGE,
} from "./parsing";
import {
  buildIndexedCartLines,
  getIndexedCartEntriesForConfiguredIds,
} from "./cartIndex";

/** 判断是否为 complete-bundle 活动（兼容大小写、空格与下划线） */
export function isCompleteBundleOfferType(offerType: string | undefined): boolean {
  const t = String(offerType || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/\s+/g, "-");
  return t === "complete-bundle";
}

/**
 * 将购物车行的单价（amountPerQuantity）与定价规则结合，得到折后价与应减金额。
 * 与主题 assets 中 applyCompleteBundleProductPricing 一致。
 */
export function applyCompleteBundleUnitPricing(
  base: number,
  mode: CompleteBundlePricingMode,
  value: number,
): { original: number; final: number } {
  const original = Math.max(0, base);
  if (mode === "full_price") {
    return { final: original, original };
  }
  if (mode === "percentage_off") {
    const pct = Math.max(0, Math.min(100, value));
    const final = Math.round(original * (1 - pct / 100) * 100) / 100;
    return { final, original };
  }
  if (mode === "amount_off") {
    const off = Math.max(0, value);
    const final = Math.max(0, Math.round((original - off) * 100) / 100);
    return { final, original };
  }
  if (mode === "fixed_price") {
    const fixed = Math.max(0, value);
    const final = Math.min(original, Math.round(fixed * 100) / 100);
    return { final, original };
  }
  return { final: original, original };
}

function normalizePricingMode(raw: unknown): CompleteBundlePricingMode {
  const m = String(raw || "full_price");
  if (
    m === "full_price" ||
    m === "percentage_off" ||
    m === "amount_off" ||
    m === "fixed_price"
  ) {
    return m;
  }
  return "full_price";
}

function sortIndexedCartEntriesForBundleMatch(
  entries: IndexedCartLine[],
): IndexedCartLine[] {
  return entries
    .slice()
    .sort((left, right) => {
      if (right.unitPrice !== left.unitPrice) {
        return right.unitPrice - left.unitPrice;
      }
      return String(left.line.id || "").localeCompare(String(right.line.id || ""));
    });
}

function buildCompleteBundleAllocationRows(
  allocationsByLineId: Map<string, CompleteBundleAllocation>,
): CompleteBundleAllocation[] {
  return Array.from(allocationsByLineId.values()).sort((left, right) =>
    left.lineId.localeCompare(right.lineId),
  );
}

/** 解析 selectedProductsJson 中的 complete-bundle bars（与后台 offerParsing 结构一致） */
function parseCompleteBundleBarsJson(
  selectedProductsJson?: string | null,
): { triggerProductIds: string[]; bars: CompleteBundleBarRow[] } {
  if (!selectedProductsJson) return { triggerProductIds: [], bars: [] };
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    const triggerProductIds = Array.isArray((parsed as { triggerProductIds?: unknown })?.triggerProductIds)
      ? ((parsed as { triggerProductIds?: unknown[] }).triggerProductIds || [])
          .map((id) => String(id || "").trim())
          .filter(Boolean)
      : Array.isArray((parsed as { productIds?: unknown })?.productIds)
        ? ((parsed as { productIds?: unknown[] }).productIds || [])
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [];
    const barsIn = (parsed as { bars?: unknown })?.bars;
    if (!Array.isArray(barsIn)) return { triggerProductIds, bars: [] };

    const out: CompleteBundleBarRow[] = [];
    for (const rawBar of barsIn) {
      if (!rawBar || typeof rawBar !== "object") continue;
      const id = String((rawBar as { id?: unknown }).id || "").trim();
      if (!id) continue;

      const barMode = normalizePricingMode(
        (rawBar as { pricing?: { mode?: unknown } }).pricing?.mode,
      );
      const barValueRaw = Number(
        (rawBar as { pricing?: { value?: unknown } }).pricing?.value,
      );
      const barValue = Number.isFinite(barValueRaw) ? barValueRaw : 0;
      const minQuantityRaw = Number((rawBar as { minQuantity?: unknown }).minQuantity);
      const minQuantity =
        Number.isFinite(minQuantityRaw) && minQuantityRaw > 0
          ? Math.trunc(minQuantityRaw)
          : 1;
      const maxQuantityRaw = Number((rawBar as { maxQuantity?: unknown }).maxQuantity);
      const quantityRaw = Number((rawBar as { quantity?: unknown }).quantity);
      const maxQuantity = Math.max(
        minQuantity,
        Number.isFinite(maxQuantityRaw) && maxQuantityRaw > 0
          ? Math.trunc(maxQuantityRaw)
          : Number.isFinite(quantityRaw) && quantityRaw > 0
            ? Math.trunc(quantityRaw)
            : 1,
      );
      const excludeTriggerProduct =
        (rawBar as { excludeTriggerProduct?: unknown }).excludeTriggerProduct !== false;

      const productsRaw = (rawBar as { products?: unknown }).products;
      const products: CompleteBundleProductRow[] = [];
      if (Array.isArray(productsRaw)) {
        for (const p of productsRaw) {
          if (!p || typeof p !== "object") continue;
          const productId = String((p as { productId?: unknown }).productId || "").trim();
          if (!productId) continue;
          const pm = normalizePricingMode(
            (p as { pricing?: { mode?: unknown } }).pricing?.mode,
          );
          const pvRaw = Number((p as { pricing?: { value?: unknown } }).pricing?.value);
          const pv = Number.isFinite(pvRaw) ? pvRaw : 0;
          products.push({
            productId,
            selectedVariantId: String((p as { selectedVariantId?: unknown }).selectedVariantId || ""),
            selectionMode:
              String((p as { selectionMode?: unknown }).selectionMode || "") === "variant"
                ? "variant"
                : "product",
            pricing: { mode: pm, value: pv },
          });
        }
      }

      const allDefault = products.every(
        (p) => p.pricing.mode === "full_price" && (p.pricing.value ?? 0) === 0,
      );
      if (
        products.length &&
        allDefault &&
        (barMode !== "full_price" || barValue !== 0)
      ) {
        products[0] = {
          ...products[0],
          pricing: { mode: barMode, value: barValue },
        };
      }

      out.push({
        id,
        type:
          String((rawBar as { type?: unknown }).type || "") === "single"
            ? "single"
            : "quantity-break-same",
        minQuantity,
        maxQuantity,
        excludeTriggerProduct,
        pricing: { mode: barMode, value: barValue },
        products,
      });
    }
    return { triggerProductIds, bars: out };
  } catch {
    return { triggerProductIds: [], bars: [] };
  }
}

/**
 * complete-bundle 整包计价：
 * - 语义仍然是"整包总价"，但执行层改为 product discount；
 * - 每个匹配 bar 产出一条多 target 的 product candidate，value 是整包总优惠；
 * - target 精确到命中的 cart line + quantity，避免 orderSubtotal 只能按整条 line 计价的问题。
 */
export function calculateCompleteBundleProductDiscounts(
  cartIndex: ReturnType<typeof buildIndexedCartLines>,
  offers: Offer[],
  marketId: string | undefined,
  nowMs: number | null,
): ProductDiscountCandidate[] {
  const completeOffers = offers.filter((o) => isCompleteBundleOfferType(o.offerType));
  if (!completeOffers.length) {
    return [];
  }

  const candidates: ProductDiscountCandidate[] = [];

  for (const offer of completeOffers) {
    if (!offerPassesScheduleAndMarket(offer, marketId, nowMs)) {
      continue;
    }

    const parsedConfig = parseCompleteBundleBarsJson(offer.selectedProductsJson);
    const barsRaw = parsedConfig.bars;
    if (!barsRaw.length || !parsedConfig.triggerProductIds.length) {
      log("complete_bundle_skip", { offerId: offer.id, reason: "no_bars" });
      continue;
    }

    const bars = [...barsRaw].sort((left, right) => {
      const leftMax = Math.max(
        Math.max(1, Math.trunc(Number(left.minQuantity) || 1)),
        Math.trunc(Number(left.maxQuantity) || 1),
      );
      const rightMax = Math.max(
        Math.max(1, Math.trunc(Number(right.minQuantity) || 1)),
        Math.trunc(Number(right.maxQuantity) || 1),
      );
      return rightMax - leftMax;
    });

    for (const bar of bars) {
      if (bar.type === "single") continue;
      if (!bar.products.length) continue;
      const anchorEntry = sortIndexedCartEntriesForBundleMatch(
        getIndexedCartEntriesForConfiguredIds(cartIndex, parsedConfig.triggerProductIds).filter(
          (entry) => entry.quantity > 0,
        ),
      )[0];
      const anchorLine = anchorEntry?.line;
      if (!anchorLine || anchorLine.merchandise.__typename !== "ProductVariant") continue;
      const anchorProductId = anchorLine.merchandise.product?.id;

      const remainingQuantityByLineId = new Map(
        cartIndex.entries.map((entry) => [String(entry.line.id || ""), entry.quantity]),
      );
      remainingQuantityByLineId.set(
        anchorLine.id,
        Math.max(0, (remainingQuantityByLineId.get(anchorLine.id) || 0) - 1),
      );
      const allocationsByLineId = new Map<string, CompleteBundleAllocation>();
      let matchedBundleItemsCount = 0;
      for (const bundleItem of bar.products) {
        if (matchedBundleItemsCount >= bar.maxQuantity) break;
        const configuredIds =
          bundleItem.selectionMode === "variant" && bundleItem.selectedVariantId
            ? [bundleItem.selectedVariantId]
            : [bundleItem.productId];
        const matchedEntry = sortIndexedCartEntriesForBundleMatch(
          getIndexedCartEntriesForConfiguredIds(cartIndex, configuredIds).filter((entry) => {
            const lineId = String(entry.line.id || "");
            if (!lineId) return false;
            if ((remainingQuantityByLineId.get(lineId) || 0) <= 0) return false;
            if (entry.line.merchandise.__typename !== "ProductVariant") return false;
            const pid = entry.line.merchandise.product?.id;
            if (
              bar.excludeTriggerProduct &&
              anchorProductId &&
              productIdsMatch(pid, anchorProductId)
            ) {
              return false;
            }
            return true;
          }),
        )[0];
        if (!matchedEntry) continue;
        const matchedLineId = String(matchedEntry.line.id || "");
        remainingQuantityByLineId.set(
          matchedLineId,
          Math.max(0, (remainingQuantityByLineId.get(matchedLineId) || 0) - 1),
        );
        const existingAllocation = allocationsByLineId.get(matchedLineId);
        if (existingAllocation) {
          existingAllocation.quantity += 1;
        } else {
          allocationsByLineId.set(matchedLineId, {
            lineId: matchedLineId,
            unitBase: matchedEntry.unitPrice,
            quantity: 1,
          });
        }
        matchedBundleItemsCount += 1;
      }

      if (matchedBundleItemsCount < bar.minQuantity) {
        log("complete_bundle_bar_no_match", {
          offerId: offer.id,
          barId: bar.id,
          reason: "insufficient_bundle_items",
          matchedBundleItems: matchedBundleItemsCount,
          minQuantity: bar.minQuantity,
        });
        continue;
      }

      const allocations = buildCompleteBundleAllocationRows(allocationsByLineId);
      const bundleSubtotal = [
        anchorEntry.unitPrice,
        ...allocations.map((row) => row.unitBase * row.quantity),
      ].reduce((sum, value) => sum + Math.max(0, value), 0);
      const { final, original } = applyCompleteBundleUnitPricing(
        bundleSubtotal,
        bar.pricing.mode,
        bar.pricing.value,
      );
      const totalDiscount = Math.max(0, original - final);
      if (totalDiscount <= 0) continue;

      candidates.push({
        message: resolveDiscountMessage(offer),
        targets: [
          {
            cartLine: {
              id: anchorLine.id,
              quantity: 1,
            },
          },
          ...allocations.map((row) => ({
            cartLine: {
              id: row.lineId,
              quantity: row.quantity,
            },
          })),
        ],
        value: {
          fixedAmount: {
            amount: totalDiscount.toFixed(2),
            appliesToEachItem: false,
          },
        },
      });

      log("complete_bundle_matched", {
        offerId: offer.id,
        barId: bar.id,
        includedLineCount: allocations.length + 1,
        bundleSubtotal,
        totalDiscount,
      });
    }
  }

  return candidates;
}

/**
 * 计算 BXGY 折扣 — 支持多层级 (tier)，按 buyQuantity 字段选择最优匹配层级
 */
export function calculateBxgyDiscount(
  cartIndex: ReturnType<typeof buildIndexedCartLines>,
  offers: CompiledOfferRuntime[],
): ProductDiscountCandidate[] {
  const allProductCandidates: ProductDiscountCandidate[] = [];
  const pickBestSameProductRuleForQuantity = (
    totalQuantity: number,
    rules: BxgyDiscountRule[],
  ): {
    rule: BxgyDiscountRule;
    resolved: ReturnType<typeof resolveSameProductBxgyQuantities>;
    promotionTimes: number;
    maxPromotionTimes: number;
  } | null => {
    let best: {
      rule: BxgyDiscountRule;
      resolved: ReturnType<typeof resolveSameProductBxgyQuantities>;
      promotionTimes: number;
      maxPromotionTimes: number;
      score: number;
    } | null = null;
    for (const rule of rules) {
      const resolved = resolveSameProductBxgyQuantities(rule);
      const promotionTimes = Math.floor(totalQuantity / resolved.bundleQuantity);
      const maxPromotionTimes = Math.min(
        promotionTimes,
        Math.max(1, Math.trunc(Number(rule.maxUsesPerOrder) || 1)),
      );
      if (maxPromotionTimes <= 0) continue;
      const score = maxPromotionTimes * resolved.freeQuantity;
      if (
        !best ||
        score > best.score ||
        (score === best.score && resolved.bundleQuantity > best.resolved.bundleQuantity)
      ) {
        best = {
          rule,
          resolved,
          promotionTimes,
          maxPromotionTimes,
          score,
        };
      }
    }
    if (!best) return null;
    return {
      rule: best.rule,
      resolved: best.resolved,
      promotionTimes: best.promotionTimes,
      maxPromotionTimes: best.maxPromotionTimes,
    };
  };

  for (const compiledOffer of offers) {
    const offer = compiledOffer.offer;
    if (offer.offerType === "bxgy") {
      const bxgyRules = compiledOffer.bxgyRules;
      if (!bxgyRules.length) continue;

      const selectedProductIds = compiledOffer.selectedIds;
      if (!selectedProductIds.length) {
        log("bxgy_same_product_skip_missing_pool", { offerId: offer.id });
        continue;
      }
      const candidates: ProductDiscountCandidate[] = [];
      for (const cartLookupKey of cartIndex.lookupKeys) {
        if (!compiledOffer.selectedLookupKeys.has(cartLookupKey)) continue;
        const matchingLines = (cartIndex.byLookupKey.get(cartLookupKey) ?? []).filter(
          (entry) => entry.quantity > 0,
        );

        if (!matchingLines.length) continue;

        const totalQuantity = matchingLines.reduce((sum, entry) => sum + entry.quantity, 0);
        const selected = pickBestSameProductRuleForQuantity(totalQuantity, bxgyRules);
        if (!selected) {
          log("bxgy_same_product_no_matching_rule", { offerId: offer.id });
          continue;
        }

        log("bxgy_same_product_rule_eval", {
          offerId: offer.id,
          selectedProductId: cartLookupKey,
          ruleBuyQuantity: selected.rule.buyQuantity,
          ruleGetQuantity: selected.rule.getQuantity,
          totalQuantity,
          bundleQuantity: selected.resolved.bundleQuantity,
          promotionTimes: selected.promotionTimes,
          maxPromotionTimes: selected.maxPromotionTimes,
        });

        log("bxgy_same_product_line_eval", {
          offerId: offer.id,
          selectedProductId: cartLookupKey,
          totalQuantity,
          bundleQuantity: selected.resolved.bundleQuantity,
          promotionTimes: selected.promotionTimes,
          maxPromotionTimes: selected.maxPromotionTimes,
        });
        let remainingFreeQuantity = selected.maxPromotionTimes * selected.resolved.freeQuantity;

        if (remainingFreeQuantity <= 0) continue;

        const sortedByUnitPrice = matchingLines
          .slice()
          .sort((a, b) => a.unitPrice - b.unitPrice);

        for (const entry of sortedByUnitPrice) {
          if (remainingFreeQuantity <= 0) break;
          const discountQuantity = Math.min(entry.quantity, remainingFreeQuantity);
          if (discountQuantity <= 0) continue;
          candidates.push({
            message: resolveDiscountMessage(offer),
            targets: [
              {
                cartLine: {
                  id: entry.line.id,
                  quantity: discountQuantity,
                },
              },
            ],
            value: {
              percentage: {
                value: "100.0",
              },
            },
          });
          log("bxgy_same_product_candidate_added", {
            offerId: offer.id,
            cartLineId: entry.line.id,
            quantity: discountQuantity,
            unitPrice: entry.unitPrice,
            semantics: selected.resolved.semantics,
          });
          remainingFreeQuantity -= discountQuantity;
        }

        log("bxgy_same_product_rule_applied", {
          offerId: offer.id,
          selectedProductId: cartLookupKey,
          buyQuantity: selected.resolved.buyQuantity,
          configuredGetQuantity: selected.rule.getQuantity,
          bundleQuantity: selected.resolved.bundleQuantity,
          freeQuantity: selected.resolved.freeQuantity,
          semantics: selected.resolved.semantics,
          promotionTimes: selected.maxPromotionTimes,
        });
      }

      allProductCandidates.push(...candidates);
      continue;
    }

    const bxgyRules = compiledOffer.bxgyRules;
    if (!bxgyRules.length) continue;

    if (offer.offerType !== "quantity-breaks-different") {
      const candidates: ProductDiscountCandidate[] = [];
      const productPoolKeys = buildSelectedLookupKeys(
        Array.from(
          new Set(
            bxgyRules.flatMap((rule) =>
              Array.isArray(rule.buyProductIds) ? rule.buyProductIds : [],
            ),
          ),
        ),
      );
      for (const cartLookupKey of cartIndex.lookupKeys) {
        if (!productPoolKeys.has(cartLookupKey)) continue;
        const matchingLines = (cartIndex.byLookupKey.get(cartLookupKey) ?? []).filter(
          (entry) => entry.quantity > 0,
        );

        if (!matchingLines.length) continue;

        const totalQuantity = matchingLines.reduce((sum, entry) => sum + entry.quantity, 0);
        const applicableRules = bxgyRules.filter((rule) =>
          (rule.buyProductIds ?? []).some(
            (id) => buildOfferLookupKey(id) === cartLookupKey,
          ),
        );
        const selected = pickBestSameProductRuleForQuantity(totalQuantity, applicableRules);
        if (!selected) continue;

        let remainingFreeQuantity = selected.maxPromotionTimes * selected.resolved.freeQuantity;
        if (remainingFreeQuantity <= 0) continue;

        const sortedByUnitPrice = matchingLines.slice().sort((a, b) => a.unitPrice - b.unitPrice);
        for (const entry of sortedByUnitPrice) {
          if (remainingFreeQuantity <= 0) break;
          const discountQuantity = Math.min(entry.quantity, remainingFreeQuantity);
          if (discountQuantity <= 0) continue;
          candidates.push({
            message: resolveDiscountMessage(offer),
            targets: [{ cartLine: { id: entry.line.id, quantity: discountQuantity } }],
            value: {
              percentage: {
                value: "100.0",
              },
            },
          });
          log("bxgy_shared_same_product_candidate_added", {
            offerId: offer.id,
            cartLineId: entry.line.id,
            quantity: discountQuantity,
            unitPrice: entry.unitPrice,
            semantics: selected.resolved.semantics,
          });
          remainingFreeQuantity -= discountQuantity;
        }
      }

      allProductCandidates.push(...candidates);
      continue;
    }

    const candidates: ProductDiscountCandidate[] = [];

    const totalBuyQuantity = cartIndex.totalQuantity;

    // Find the best matching tier: highest count that cart meets.
    // For quantity-breaks-different each tier may have its own eligible product subset,
    // so matching must be computed per rule rather than assuming a shared buy pool.
    let bestRule: BxgyDiscountRule | null = null;
    for (const r of bxgyRules) {
      if (!r.buyProductIds.length) continue;
      const matchingBuyProductCount = getIndexedCartEntriesForConfiguredIds(
        cartIndex,
        r.buyProductIds,
      ).reduce((sum, entry) => sum + entry.quantity, 0);

      log("bxgy_rule_match_eval", {
        offerId: offer.id,
        ruleCount: r.count,
        tierType: r.tierType,
        totalBuyQuantity,
        matchingBuyProductCount,
        buyQuantityRequired: r.buyQuantity,
        buyProductIds: r.buyProductIds,
      });

      if (matchingBuyProductCount >= r.buyQuantity && totalBuyQuantity >= r.count) {
        bestRule = r;
      }
    }
    if (!bestRule) {
      log("bxgy_insufficient_buy_quantity", {
        offerId: offer.id,
        evaluatedRules: bxgyRules.length,
      });
      continue;
    }
    const selectedRule = bestRule;

    const matchedBuyEntries = getIndexedCartEntriesForConfiguredIds(
      cartIndex,
      selectedRule.buyProductIds,
    );
    const buyProductCount = matchedBuyEntries.reduce((sum, entry) => sum + entry.quantity, 0);

    // Check the count threshold (cart must have at least `count` items total)
    if (totalBuyQuantity < selectedRule.count) {
      log("bxgy_count_threshold_not_met", {
        offerId: offer.id,
        totalBuyQuantity,
        countThreshold: selectedRule.count,
      });
      continue;
    }

    // Calculate how many times the promotion can be applied
    const promotionTimes = Math.floor(buyProductCount / selectedRule.buyQuantity);
    const maxPromotionTimes = Math.min(promotionTimes, selectedRule.maxUsesPerOrder);

    log("bxgy_promotion_times", {
      offerId: offer.id,
      promotionTimes,
      maxPromotionTimes,
      maxUsesPerOrder: selectedRule.maxUsesPerOrder,
      selectedBuyQuantity: selectedRule.buyQuantity,
      selectedCount: selectedRule.count,
      tierType: selectedRule.tierType,
    });

    if (selectedRule.tierType === "simple") {
      const discountTargetQty = maxPromotionTimes * selectedRule.buyQuantity;
      let remaining = discountTargetQty;

      for (const entry of matchedBuyEntries) {
        if (remaining <= 0) break;
        const discountQuantity = Math.min(entry.quantity, remaining);
        if (discountQuantity > 0) {
          candidates.push({
            message: resolveDiscountMessage(offer),
            targets: [{ cartLine: { id: entry.line.id, quantity: discountQuantity } }],
            value: {
              percentage: {
                value: selectedRule.discountPercent.toFixed(1),
              },
            },
          });
          remaining -= discountQuantity;
          log("simple_tier_candidate_added", {
            offerId: offer.id,
            cartLineId: entry.line.id,
            quantity: discountQuantity,
            discountPercent: selectedRule.discountPercent,
          });
        }
      }

      allProductCandidates.push(...candidates);
      continue;
    }

    // Find get products and apply discount
    let remainingGetQuantity = maxPromotionTimes * selectedRule.getQuantity;
    const matchedGetEntries = getIndexedCartEntriesForConfiguredIds(
      cartIndex,
      selectedRule.getProductIds,
    );

    for (const entry of matchedGetEntries) {
      if (remainingGetQuantity <= 0) break;
      const discountQuantity = Math.min(entry.quantity, remainingGetQuantity);

      if (discountQuantity > 0) {
        const candidate: ProductDiscountCandidate = {
          message: resolveDiscountMessage(offer),
          targets: [
            {
              cartLine: {
                id: entry.line.id,
                quantity: discountQuantity,
              },
            },
          ],
          value: {
            percentage: {
              value: selectedRule.discountPercent.toFixed(1),
            },
          },
        };

        candidates.push(candidate);
        remainingGetQuantity -= discountQuantity;

        log("bxgy_candidate_added", {
          offerId: offer.id,
          cartLineId: entry.line.id,
          quantity: discountQuantity,
          discountPercent: selectedRule.discountPercent,
        });
      }
    }

    allProductCandidates.push(...candidates);
  }

  return allProductCandidates;
}

function parseFreeGiftSelection(selectedProductsJson?: string | null): {
  triggerProductIds: string[];
  giftProductIds: string[];
} {
  if (!selectedProductsJson) {
    return { triggerProductIds: [], giftProductIds: [] };
  }

  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { triggerProductIds: [], giftProductIds: [] };
    }

    const triggerProducts = (parsed as { triggerProducts?: unknown }).triggerProducts;
    const giftProducts = (parsed as { giftProducts?: unknown }).giftProducts;

    return {
      triggerProductIds: Array.isArray(triggerProducts)
        ? triggerProducts
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [],
      giftProductIds: Array.isArray(giftProducts)
        ? giftProducts
            .map((id) => String(id || "").trim())
            .filter(Boolean)
        : [],
    };
  } catch {
    return { triggerProductIds: [], giftProductIds: [] };
  }
}

export function calculateFreeGiftDiscount(
  cartLines: CartInput["cart"]["lines"],
  offers: Offer[],
): OrderDiscountCandidate[] {
  const allCartLineIds = cartLines.map((line) => line.id);
  const allCandidates: OrderDiscountCandidate[] = [];

  for (const offer of offers) {
    const selection = parseFreeGiftSelection(offer.selectedProductsJson);
    const triggerProductIds = selection.triggerProductIds;
    const fallbackGiftProductIds = selection.giftProductIds;
    const freeGiftRules = parseDiscountRulesJson(offer.discountRulesJson).filter(
      (rule) => rule.rewardType === "gift_product" && rule.discountClass === "order",
    );

    if (!triggerProductIds.length || !freeGiftRules.length) {
      log("free_gift_skip_missing_configuration", {
        offerId: offer.id,
        triggerProductIds: triggerProductIds.length,
        freeGiftRuleCount: freeGiftRules.length,
      });
      continue;
    }

    let triggerQuantity = 0;
    let triggerSubtotalAmount = 0;
    for (const line of cartLines) {
      if (line.merchandise.__typename !== "ProductVariant") continue;
      const productId = line.merchandise.product?.id;
      const variantId = line.merchandise.id;
      if (matchesAnyConfiguredId(triggerProductIds, productId, variantId)) {
        const quantity = Math.max(1, Math.trunc(Number(line.quantity) || 1));
        triggerQuantity += quantity;
        triggerSubtotalAmount +=
          parseMoneyAmount(line.cost?.amountPerQuantity?.amount) * quantity;
      }
    }

    if (triggerQuantity <= 0 && triggerSubtotalAmount <= 0) {
      log("free_gift_skip_no_trigger_quantity", {
        offerId: offer.id,
        triggerProductIds,
      });
      continue;
    }

    const eligibleRules = freeGiftRules.filter((rule) =>
      evaluateRuleCondition(rule, {
        totalQuantity: triggerQuantity,
        subtotalAmount: triggerSubtotalAmount,
      }),
    );
    const bestRule = eligibleRules.reduce<DiscountTier | null>((best, current) => {
      if (!best) return current;
      const currentGiftQuantity = Math.max(
        1,
        Math.trunc(Number(current.giftQuantity) || 1),
      );
      const bestGiftQuantity = Math.max(1, Math.trunc(Number(best.giftQuantity) || 1));
      if (currentGiftQuantity !== bestGiftQuantity) {
        return currentGiftQuantity > bestGiftQuantity ? current : best;
      }
      const currentThreshold =
        current.conditionType === "cart_amount"
          ? Math.max(0, Number(current.amountThreshold) || 0)
          : Math.max(1, Math.trunc(Number(current.count) || 1));
      const bestThreshold =
        best.conditionType === "cart_amount"
          ? Math.max(0, Number(best.amountThreshold) || 0)
          : Math.max(1, Math.trunc(Number(best.count) || 1));
      return currentThreshold >= bestThreshold ? current : best;
    }, null);

    if (!bestRule) {
      log("free_gift_skip_threshold_not_met", {
        offerId: offer.id,
        triggerQuantity,
        triggerSubtotalAmount,
        thresholds: freeGiftRules.map((rule) =>
          rule.conditionType === "cart_amount"
            ? Math.max(0, Number(rule.amountThreshold) || 0)
            : rule.count,
        ),
      });
      continue;
    }

    const eligibleGiftProductIds =
      bestRule.rewardProductIds.length > 0
        ? bestRule.rewardProductIds
        : fallbackGiftProductIds;
    if (!eligibleGiftProductIds.length) {
      log("free_gift_skip_no_reward_products", {
        offerId: offer.id,
        triggerQuantity,
        selectedRuleCount: bestRule.count,
      });
      continue;
    }

    let remainingGiftQuantity = Math.max(1, Math.trunc(Number(bestRule.giftQuantity) || 1));
    let totalGiftDiscountAmount = 0;
    const discountedGiftLineIds = new Set<string>();
    for (const line of cartLines) {
      if (remainingGiftQuantity <= 0) break;
      if (line.merchandise.__typename !== "ProductVariant") continue;
      const productId = line.merchandise.product?.id;
      const variantId = line.merchandise.id;
      if (!matchesAnyConfiguredId(eligibleGiftProductIds, productId, variantId)) {
        continue;
      }

      const discountQuantity = Math.min(
        Math.max(1, Math.trunc(Number(line.quantity) || 1)),
        remainingGiftQuantity,
      );
      if (discountQuantity <= 0) continue;

      totalGiftDiscountAmount +=
        parseMoneyAmount(line.cost?.amountPerQuantity?.amount) * discountQuantity;
      discountedGiftLineIds.add(line.id);

      remainingGiftQuantity -= discountQuantity;
      log("free_gift_candidate_added", {
        offerId: offer.id,
        cartLineId: line.id,
        quantity: discountQuantity,
        selectedRuleCount: bestRule.count,
        selectedRuleAmountThreshold: bestRule.amountThreshold,
      });
    }

    if (totalGiftDiscountAmount <= 0 || discountedGiftLineIds.size === 0) {
      continue;
    }

    const excludedCartLineIds = allCartLineIds.filter(
      (id) => !discountedGiftLineIds.has(id),
    );
    allCandidates.push({
      message: resolveDiscountMessage(offer),
      targets: [
        {
          orderSubtotal: {
            excludedCartLineIds,
          },
        },
      ],
      value: {
        fixedAmount: {
          amount: totalGiftDiscountAmount.toFixed(2),
        },
      },
    });
  }

  return allCandidates;
}

export function formatDiscountPercentValue(percent: number): string {
  if (!Number.isFinite(percent)) return DEFAULT_DISCOUNT_PERCENTAGE;
  return percent.toFixed(1);
}

export function evaluateRuleCondition(
  rule: DiscountTier,
  metrics: { totalQuantity: number; subtotalAmount: number },
): boolean {
  if (rule.conditionType === "cart_amount") {
    const threshold = Math.max(0, Number(rule.amountThreshold) || 0);
    return threshold > 0 && metrics.subtotalAmount >= threshold;
  }
  return metrics.totalQuantity >= Math.max(1, Math.trunc(Number(rule.count) || 1));
}

export function getBestProductDiscountPercentValue(
  discountRulesJson: string | null | undefined,
  quantity: number,
): string | null {
  const tiers = parseDiscountRulesJson(discountRulesJson).filter(
    (tier) =>
      tier.logicType !== "bxgy" &&
      tier.discountClass === "product" &&
      tier.rewardType === "percentage_off" &&
      tier.conditionType === "item_quantity",
  );

  if (tiers.length === 0) {
    log("discount_rules_fallback_default", { quantity });
    return DEFAULT_DISCOUNT_PERCENTAGE;
  }

  let best: DiscountTier | null = null;
  for (const tier of tiers) {
    if (quantity >= tier.count) best = tier;
  }

  if (!best) {
    log("discount_rules_no_tier_met", {
      quantity,
      tierCounts: tiers.map((t) => t.count),
    });
    return null;
  }
  return formatDiscountPercentValue(best.discountPercent);
}

export function getBestProductDiscountPercentValueFromTiers(
  tiers: DiscountTier[],
  quantity: number,
): string | null {
  const eligibleTiers = tiers.filter(
    (tier) =>
      tier.logicType !== "bxgy" &&
      tier.discountClass === "product" &&
      tier.rewardType === "percentage_off" &&
      tier.conditionType === "item_quantity",
  );

  if (eligibleTiers.length === 0) {
    log("discount_rules_fallback_default", { quantity });
    return DEFAULT_DISCOUNT_PERCENTAGE;
  }

  let best: DiscountTier | null = null;
  for (const tier of eligibleTiers) {
    if (quantity >= tier.count) best = tier;
  }

  if (!best) {
    log("discount_rules_no_tier_met", {
      quantity,
      tierCounts: eligibleTiers.map((t) => t.count),
    });
    return null;
  }

  return formatDiscountPercentValue(best.discountPercent);
}

export function buildOrderDiscountCandidates(
  input: CartInput,
  offers: Offer[],
  marketId: string | undefined,
  nowMs: number | null,
  acceptedCouponCodeByOfferId: Map<string, string>,
): OrderDiscountCandidate[] {
  const candidates: OrderDiscountCandidate[] = [];
  const allCartLineIds = input.cart.lines.map((line) => line.id);

  for (const offer of offers) {
    if (!offerPassesScheduleAndMarket(offer, marketId, nowMs)) continue;
    const scopedLines = getScopedLinesForSelectedIds(
      input.cart.lines,
      parseSelectedIds(offer.selectedProductsJson),
    );
    if (!scopedLines.length) continue;

    const metrics = scopedLines.reduce(
      (acc, line) => ({
        totalQuantity: acc.totalQuantity + Math.max(1, Math.trunc(Number(line.quantity) || 1)),
        subtotalAmount:
          acc.subtotalAmount +
          parseMoneyAmount(line.cost?.amountPerQuantity?.amount) *
            Math.max(1, Math.trunc(Number(line.quantity) || 1)),
      }),
      { totalQuantity: 0, subtotalAmount: 0 },
    );

    const eligibleRules = parseDiscountRulesJson(offer.discountRulesJson).filter(
      (rule) =>
        rule.discountClass === "order" &&
        rule.rewardType === "percentage_off" &&
        evaluateRuleCondition(rule, metrics),
    );
    if (!eligibleRules.length) continue;

    const bestRule = eligibleRules.reduce((best, current) =>
      current.discountPercent > best.discountPercent ? current : best,
    );
    const scopedIds = new Set(scopedLines.map((line) => line.id));
    const excludedCartLineIds = allCartLineIds.filter((id) => !scopedIds.has(id));

    candidates.push({
      message: resolveDiscountMessage(offer),
      targets: [
        {
          orderSubtotal: {
            excludedCartLineIds,
          },
        },
      ],
      value: {
        percentage: {
          value: formatDiscountPercentValue(bestRule.discountPercent),
        },
      },
      associatedDiscountCode: acceptedCouponCodeByOfferId.get(String(offer.id || ""))
        ? {
            code: acceptedCouponCodeByOfferId.get(String(offer.id || ""))!,
          }
        : undefined,
    });
  }

  return candidates;
}

export function buildOrderDiscountCandidatesFromCompiledOffers(
  input: CartInput,
  offers: CompiledOfferRuntime[],
  marketId: string | undefined,
  nowMs: number | null,
  acceptedCouponCodeByOfferId: Map<string, string>,
): OrderDiscountCandidate[] {
  const candidates: OrderDiscountCandidate[] = [];
  const allCartLineIds = input.cart.lines.map((line) => line.id);

  for (const compiledOffer of offers) {
    const offer = compiledOffer.offer;
    if (!offerPassesScheduleAndMarket(offer, marketId, nowMs, compiledOffer.settings)) continue;
    const scopedLines = getScopedLinesForCompiledOffer(input.cart.lines, compiledOffer);
    if (!scopedLines.length) continue;

    const metrics = scopedLines.reduce(
      (acc, line) => ({
        totalQuantity: acc.totalQuantity + Math.max(1, Math.trunc(Number(line.quantity) || 1)),
        subtotalAmount:
          acc.subtotalAmount +
          parseMoneyAmount(line.cost?.amountPerQuantity?.amount) *
            Math.max(1, Math.trunc(Number(line.quantity) || 1)),
      }),
      { totalQuantity: 0, subtotalAmount: 0 },
    );

    const eligibleRules = compiledOffer.standardRules.filter(
      (rule) =>
        rule.discountClass === "order" &&
        rule.rewardType === "percentage_off" &&
        evaluateRuleCondition(rule, metrics),
    );
    if (!eligibleRules.length) continue;

    const bestRule = eligibleRules.reduce((best, current) =>
      current.discountPercent > best.discountPercent ? current : best,
    );
    const scopedIds = new Set(scopedLines.map((line) => line.id));
    const excludedCartLineIds = allCartLineIds.filter((id) => !scopedIds.has(id));

    candidates.push({
      message: resolveDiscountMessage(offer),
      targets: [
        {
          orderSubtotal: {
            excludedCartLineIds,
          },
        },
      ],
      value: {
        percentage: {
          value: formatDiscountPercentValue(bestRule.discountPercent),
        },
      },
      associatedDiscountCode: acceptedCouponCodeByOfferId.get(String(offer.id || ""))
        ? {
            code: acceptedCouponCodeByOfferId.get(String(offer.id || ""))!,
          }
        : undefined,
    });
  }

  return candidates;
}
