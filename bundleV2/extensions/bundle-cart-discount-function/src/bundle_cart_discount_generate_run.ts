import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from "../generated/api";

const LOG_PREFIX = "[ciwi-cart-lines-discount]";

const DISCOUNT_PERCENTAGE = "10.0";
const DEFAULT_DISCOUNT_PERCENTAGE = DISCOUNT_PERCENTAGE;

function log(step: string, detail?: unknown): void {
  try {
    if (detail === undefined) {
      console.error(`${LOG_PREFIX} ${step}`);
    } else {
      console.error(
        `${LOG_PREFIX} ${step} ${typeof detail === "string" ? detail : JSON.stringify(detail)}`,
      );
    }
  } catch {
    console.error(`${LOG_PREFIX} ${step} (log stringify failed)`);
  }
}

function summarizeMetafield(
  mf: { jsonValue?: unknown; value?: unknown; type?: string } | null | undefined,
): {
  present: boolean;
  type: string | null;
  hasJsonValue: boolean;
  jsonValueType: string | null;
  jsonValueKeys?: string[];
  rawValueLength: number;
} {
  const jsonValue = mf?.jsonValue;
  const rawValue = typeof mf?.value === "string" ? mf.value : "";
  const jsonValueType =
    jsonValue === null
      ? "null"
      : Array.isArray(jsonValue)
        ? "array"
        : typeof jsonValue === "object"
          ? "object"
          : typeof jsonValue;

  return {
    present: Boolean(mf),
    type: mf?.type ?? null,
    hasJsonValue: jsonValue !== undefined && jsonValue !== null,
    jsonValueType: jsonValue === undefined ? null : jsonValueType,
    jsonValueKeys:
      jsonValue && typeof jsonValue === "object" && !Array.isArray(jsonValue)
        ? Object.keys(jsonValue as Record<string, unknown>).slice(0, 20)
        : undefined,
    rawValueLength: rawValue.length,
  };
}

type OfferMetafieldPayload = {
  updatedAt?: string;
  offers?: Array<{
    id?: string;
    name?: string;
    cartTitle?: string;
    status?: boolean;
    startTime?: string;
    endTime?: string;
    selectedProductsJson?: string | null;
    discountRulesJson?: string | null;
    offerSettingsJson?: string | null;
    offerType?: string;
  }>;
};

type BxgyDiscountRule = {
  count: number;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxUsesPerOrder: number;
};

type DifferentProductDiscountRule = {
  count: number;
  discountPercent: number;
};

type Offer = NonNullable<OfferMetafieldPayload["offers"]>[number];

export function bundleCartDiscountGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const shopAny = input.shop as unknown as {
    metafield?: { jsonValue?: unknown; type?: string } | null;
  };
  log("shop_metafields_snapshot", {
    offers: summarizeMetafield(
      shopAny.metafield as
        | { jsonValue?: unknown; value?: unknown; type?: string }
        | null
        | undefined,
    ),
  });
  const offersPayload = shopAny.metafield?.jsonValue as
    | OfferMetafieldPayload
    | null
    | undefined;

  log("run_start", {
    cartLineCount: input.cart.lines.length,
    discountClasses: input.discount.discountClasses,
    metafieldPresent: Boolean(input.shop.metafield),
    metafieldType: input.shop.metafield?.type ?? null,
    hasOffers: Boolean(shopAny.metafield?.jsonValue),
  });

  if (!offersPayload) {
    log("early_exit", { reason: "no_offers_payload" });
    return { operations: [] };
  }
  const offers = offersPayload?.offers ?? [];

  log("metafield_offers", {
    updatedAt: offersPayload?.updatedAt ?? null,
    offerCount: offers.length,
    offersSummary: offers.map((o) => ({
      id: o.id,
      name: o.name,
      status: o.status,
      selectedProductsJsonLength: o.selectedProductsJson?.length ?? 0,
      discountRulesJsonLength: o.discountRulesJson?.length ?? 0,
    })),
  });

  if (!offers.length) {
    log("early_exit", { reason: "no_offers_in_metafield" });
    return { operations: [] };
  }

  if (!checkValid(input)) {
    log("early_exit", {
      reason: "checkValid_failed",
      cartLineCount: input.cart.lines.length,
      hasProductDiscountClass: input.discount.discountClasses.includes(
        DiscountClass.Product,
      ),
    });
    return { operations: [] };
  }

  const productCandidates: ProductDiscountCandidate[] = [];

  const bxgyOffers = offers.filter(o => o.offerType === 'bxgy');
  const differentOffers = offers.filter(
    (o) => o.offerType === "quantity-breaks-different",
  );
  const otherOffers = offers.filter(
    (o) => o.offerType !== "bxgy" && o.offerType !== "quantity-breaks-different",
  );

  // First, check for BXGY offers
  const bxgyCandidates = calculateBxgyDiscount(input.cart.lines, bxgyOffers);
  if (bxgyCandidates.length > 0) {
    productCandidates.push(...bxgyCandidates);
  }

  // 第二优先级：不同产品组合包（按组合池总数量命中阶梯）
  if (productCandidates.length === 0) {
    const differentCandidates = calculateDifferentProductDiscount(
      input.cart.lines,
      differentOffers,
      input.localization?.market?.id,
    );
    if (differentCandidates.length > 0) {
      productCandidates.push(...differentCandidates);
    }
  }

  // Then check for regular quantity break offers (only if no BXGY applied)
  if (productCandidates.length === 0) {
    for (const line of input.cart.lines) {
      if (line.merchandise.__typename !== "ProductVariant") {
        log("line_skip", {
          cartLineId: line.id,
          reason: "merchandise_not_product_variant",
          typename: line.merchandise.__typename,
        });
        continue;
      }

      const lineId = line.id;
      const quantity = line.quantity;
      const productId = line.merchandise.product?.id;
      const variantId = line.merchandise.id;
      const marketId = input.localization?.market?.id;

      log("line_evaluate", {
        cartLineId: lineId,
        quantity,
        productId,
        variantId,
        marketId,
      });

      if (!lineId || !quantity) {
        log("line_skip", { cartLineId: lineId, reason: "missing_line_id_or_qty" });
        continue;
      }

      const suitOffer = findOffer(productId, variantId, marketId, otherOffers);
      if (!suitOffer) {
        log("line_no_matching_offer", {
          cartLineId: lineId,
          productId,
          variantId,
        });
        continue;
      }

      log("line_matched_offer", {
        cartLineId: lineId,
        offerId: suitOffer.id,
        offerName: suitOffer.name,
      });

      const discountPercentValue = getDiscountPercentValue(
        suitOffer.discountRulesJson,
        quantity,
      );
      log("line_discount_percent", {
        cartLineId: lineId,
        discountPercentValue,
        quantity,
      });

      if (!discountPercentValue) {
        log("line_skip", {
          cartLineId: lineId,
          reason: "no_discount_percent_after_rules",
        });
        continue;
      }

      const candidate: ProductDiscountCandidate = {
        message: suitOffer.cartTitle || "Bundle Discount",
        targets: [
          {
            cartLine: {
              id: lineId,
              quantity,
            },
          },
        ],
        value: {
          percentage: {
            value: discountPercentValue,
          },
        },
      };

      productCandidates.push(candidate);
      log("line_candidate_added", {
        cartLineId: lineId,
        percent: discountPercentValue,
      });
    }
  }

  if (!productCandidates.length) {
    log("early_exit", {
      reason: "no_product_candidates_after_lines",
      linesProcessed: input.cart.lines.length,
    });
    return { operations: [] };
  }

  const operations = [
    {
      productDiscountsAdd: {
        candidates: productCandidates,
        selectionStrategy: ProductDiscountSelectionStrategy.All,
      },
    },
  ];

  log("run_success", {
    candidateCount: productCandidates.length,
    operationsJsonLength: JSON.stringify(operations).length,
  });

  return { operations };
}

type DiscountTier = {
  count: number;
  discountPercent: number;
};

function parseDiscountRulesJson(
  discountRulesJson?: string | null,
): DiscountTier[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const tiers: DiscountTier[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent) || discountPercent < 0) continue;
      tiers.push({ count: Math.trunc(count), discountPercent });
    }

    tiers.sort((a, b) => a.count - b.count);
    return tiers;
  } catch {
    return [];
  }
}

function parseBxgyDiscountRules(discountRulesJson?: string | null): BxgyDiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const out: BxgyDiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      
      const count = Number((item as { count?: unknown }).count);
      const buyQuantity = Number((item as { buyQuantity?: unknown }).buyQuantity);
      const getQuantity = Number((item as { getQuantity?: unknown }).getQuantity);
      const discountPercent = Number((item as { discountPercent?: unknown }).discountPercent);
      const maxUsesPerOrder = Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder) || 1;
      
      const buyProductIds = (item as { buyProductIds?: unknown }).buyProductIds;
      const getProductIds = (item as { getProductIds?: unknown }).getProductIds;
      
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(buyQuantity) || buyQuantity < 1) continue;
      if (!Number.isFinite(getQuantity) || getQuantity < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      if (!Array.isArray(buyProductIds) || !buyProductIds.length) continue;
      if (!Array.isArray(getProductIds) || !getProductIds.length) continue;
      
      out.push({
        count: Math.trunc(count),
        buyQuantity: Math.trunc(buyQuantity),
        getQuantity: Math.trunc(getQuantity),
        buyProductIds: buyProductIds.filter(id => typeof id === "string") as string[],
        getProductIds: getProductIds.filter(id => typeof id === "string") as string[],
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        maxUsesPerOrder: Math.max(1, Math.trunc(maxUsesPerOrder)),
      });
    }
    
    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

function parseDifferentProductDiscountRules(
  discountRulesJson?: string | null,
): DifferentProductDiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    const out: DifferentProductDiscountRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent) || discountPercent < 0) continue;
      out.push({
        count: Math.trunc(count),
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
      });
    }
    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

function calculateDifferentProductDiscount(
  cartLines: CartInput["cart"]["lines"],
  offers: Offer[],
  marketId?: string,
): ProductDiscountCandidate[] {
  for (const offer of offers) {
    if (!isOfferEligibleForCart(offer, marketId)) continue;
    const selectedIds = parseSelectedIds(offer.selectedProductsJson);
    if (!selectedIds.length) continue;

    const matchingLines = cartLines.filter((line) => {
      if (line.merchandise.__typename !== "ProductVariant") return false;
      const productId = line.merchandise.product?.id;
      const variantId = line.merchandise.id;
      return (
        (productId && selectedIds.includes(productId)) ||
        (variantId && selectedIds.includes(variantId))
      );
    });
    if (!matchingLines.length) continue;

    const tiers = parseDifferentProductDiscountRules(offer.discountRulesJson);
    if (!tiers.length) continue;

    const totalMatchingQty = matchingLines.reduce(
      (sum, line) => sum + line.quantity,
      0,
    );
    let bestTier: DifferentProductDiscountRule | null = null;
    for (const tier of tiers) {
      if (totalMatchingQty >= tier.count) bestTier = tier;
    }
    if (!bestTier) continue;

    log("different_products_offer_matched", {
      offerId: offer.id,
      totalMatchingQty,
      tierCount: bestTier.count,
      percent: bestTier.discountPercent,
      matchingLineCount: matchingLines.length,
    });

    const percentValue = formatDiscountPercentValue(bestTier.discountPercent);
    return matchingLines.map((line) => ({
      message: offer.cartTitle || "Bundle Discount",
      targets: [
        {
          cartLine: {
            id: line.id,
            quantity: line.quantity,
          },
        },
      ],
      value: {
        percentage: {
          value: percentValue,
        },
      },
    }));
  }
  return [];
}

/**
 * 计算 BXGY 折扣 — 支持多层级 (tier)，按 buyQuantity 字段选择最优匹配层级
 */
function calculateBxgyDiscount(
  cartLines: any[],
  offers: Offer[],
): ProductDiscountCandidate[] {
  const allCandidates: ProductDiscountCandidate[] = [];

  for (const offer of offers) {
    const bxgyRules = parseBxgyDiscountRules(offer.discountRulesJson);
    if (!bxgyRules.length) continue;

    const candidates: ProductDiscountCandidate[] = [];

    // Calculate total buy quantity across all buyProductIds in the first rule
    // (all rules within an offer share the same buyProductIds)
    const rule = bxgyRules[0];
    if (!rule.buyProductIds.length || !rule.getProductIds.length) continue;

    // totalBuyQuantity = total cart items (all products) — to check against count threshold
    let totalBuyQuantity = 0;
    // buyProductCount = cart items that match buyProductIds — to check against buyQuantity
    let buyProductCount = 0;
    for (const line of cartLines) {
      totalBuyQuantity += line.quantity;
      const productId = line.merchandise?.product?.id;
      const variantId = line.merchandise?.id;
      if ((productId && rule.buyProductIds.includes(productId)) ||
          (variantId && rule.buyProductIds.includes(variantId))) {
        buyProductCount += line.quantity;
      }
    }

    log("bxgy_calculation", {
      offerId: offer.id,
      totalBuyQuantity,
      buyProductCount,
      buyQuantityRequired: rule.buyQuantity,
      getProductIds: rule.getProductIds,
    });

    // Find the best matching tier: highest count that cart meets
    let bestRule: BxgyDiscountRule | null = null;
    for (const r of bxgyRules) {
      if (buyProductCount >= r.buyQuantity) {
        bestRule = r;
      }
    }
    if (!bestRule) {
      log("bxgy_insufficient_buy_quantity", {
        offerId: offer.id,
        buyProductCount,
        required: bxgyRules[0].buyQuantity,
      });
      continue;
    }
    const selectedRule = bestRule;

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
    });

    // Find get products and apply discount
    let remainingGetQuantity = maxPromotionTimes * selectedRule.getQuantity;

    for (const line of cartLines) {
      const productId = line.merchandise?.product?.id;
      const variantId = line.merchandise?.id;

      if (remainingGetQuantity <= 0) break;

      if ((productId && selectedRule.getProductIds.includes(productId)) ||
          (variantId && selectedRule.getProductIds.includes(variantId))) {

        const discountQuantity = Math.min(line.quantity, remainingGetQuantity);

        if (discountQuantity > 0) {
          const candidate: ProductDiscountCandidate = {
            message: offer.cartTitle || "Buy X Get Y",
            targets: [
              {
                cartLine: {
                  id: line.id,
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
            cartLineId: line.id,
            quantity: discountQuantity,
            discountPercent: selectedRule.discountPercent,
          });
        }
      }
    }

    allCandidates.push(...candidates);
  }

  return allCandidates;
}
  

function formatDiscountPercentValue(percent: number): string {
  if (!Number.isFinite(percent)) return DEFAULT_DISCOUNT_PERCENTAGE;
  return percent.toFixed(1);
}

function getDiscountPercentValue(
  discountRulesJson: string | null | undefined,
  quantity: number,
): string | null {
  const tiers = parseDiscountRulesJson(discountRulesJson);

  // 规则为空：与历史「默认 10%」行为一致
  if (tiers.length === 0) {
    log("discount_rules_fallback_default", { quantity });
    return DEFAULT_DISCOUNT_PERCENTAGE;
  }

  let best: DiscountTier | null = null;
  for (const tier of tiers) {
    if (quantity >= tier.count) best = tier;
  }

  if (!best) {
    log("discount_rules_no_tier_met", { quantity, tierCounts: tiers.map((t) => t.count) });
    return null;
  }
  return formatDiscountPercentValue(best.discountPercent);
}

const parseSelectedIds = (selectedProductsJson?: string | null): string[] => {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
    
    // Handle BXGY format: { buyProducts: string[], getProducts: string[] }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const productPool = (parsed as { productPool?: unknown }).productPool;
      const buyProducts = (parsed as { buyProducts?: string[] }).buyProducts;
      const getProducts = (parsed as { getProducts?: string[] }).getProducts;
      
      const allIds: string[] = [];
      if (Array.isArray(productPool)) {
        for (const item of productPool) {
          if (typeof item === "string") {
            allIds.push(item);
            continue;
          }
          if (item && typeof item === "object") {
            const id = (item as { id?: unknown }).id;
            if (typeof id === "string") allIds.push(id);
          }
        }
      }
      if (Array.isArray(buyProducts)) {
        allIds.push(...buyProducts.filter(id => typeof id === "string"));
      }
      if (Array.isArray(getProducts)) {
        allIds.push(...getProducts.filter(id => typeof id === "string"));
      }
      return [...new Set(allIds)]; // Remove duplicates
    }
    
    // Handle regular format: string[] or object[]
    if (!Array.isArray(parsed)) return [];

    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        ids.push(item);
        continue;
      }

      if (item && typeof item === "object") {
        const id = (item as { id?: unknown }).id;
        if (typeof id === "string") ids.push(id);
      }
    }

    return ids;
  } catch {
    return [];
  }
};

function resolveNowMs(): number | null {
  const candidates = [
    Date.now(),
    new Date().getTime(),
    Date.parse(new Date().toISOString()),
  ];

  for (const value of candidates) {
    if (Number.isFinite(value) && value > 0) {
      return value;
    }
  }

  return null;
}

/**
 * selectedProductsJson 存的是 Product GID（与主题端、后台一致），需用购物车行的 product.id / variant.id 匹配，不能用 CartLine.id。
 */
const findOffer = (
  productId: string | undefined,
  variantId: string | undefined,
  marketId: string | undefined,
  offers: Offer[],
): Offer | null => {
  const nowMs = resolveNowMs();
  const nowIso = nowMs ? new Date(nowMs).toISOString() : null;

  for (const offer of offers) {
    if (offer.offerType === 'bxgy' || offer.offerType === "quantity-breaks-different") continue;

    if (!isOfferEligibleForCart(offer, marketId)) continue;

    const selectedIds = parseSelectedIds(offer.selectedProductsJson);
    if (!selectedIds.length) {
      log("offer_match_all_products", { offerId: offer.id, name: offer.name });
      return offer;
    }

    const hit =
      (productId && selectedIds.includes(productId)) ||
      (variantId && selectedIds.includes(variantId));

    log("offer_selected_ids_check", {
      offerId: offer.id,
      name: offer.name,
      selectedIdCount: selectedIds.length,
      productId,
      variantId,
      hit,
    });

    if (hit) return offer;
  }

  return null;
};

function isOfferEligibleForCart(
  offer: Offer,
  marketId?: string,
): boolean {
  const nowMs = resolveNowMs();
  const nowIso = nowMs ? new Date(nowMs).toISOString() : null;

  if (offer.status === false) {
    log("offer_skip_disabled", { offerId: offer.id, name: offer.name });
    return false;
  }

  if (offer.startTime) {
    const startTimeMs = Date.parse(offer.startTime);
    log("offer_start_time_check", {
      offerId: offer.id,
      name: offer.name,
      startTime: offer.startTime,
      nowIso,
      nowMs,
      startTimeMs: Number.isFinite(startTimeMs) ? startTimeMs : null,
      isBeforeStart:
        Number.isFinite(startTimeMs) && nowMs !== null ? nowMs < startTimeMs : null,
    });
    if (nowMs !== null && Number.isFinite(startTimeMs) && nowMs < startTimeMs) {
      log("offer_skip_before_start", { offerId: offer.id, name: offer.name, startTime: offer.startTime });
      return false;
    }
  }

  if (offer.endTime) {
    const endTimeMs = Date.parse(offer.endTime);
    if (nowMs !== null && Number.isFinite(endTimeMs) && nowMs > endTimeMs) {
      log("offer_skip_after_end", { offerId: offer.id, name: offer.name, endTime: offer.endTime });
      return false;
    }
  }

  if (marketId && offer.offerSettingsJson) {
    try {
      const settings = JSON.parse(offer.offerSettingsJson);
      const offerMarkets = settings.markets;
      if (
        typeof offerMarkets === "string" &&
        offerMarkets !== "all" &&
        offerMarkets.trim() !== ""
      ) {
        const allowedMarkets = offerMarkets
          .split(",")
          .map((m: string) => m.trim());
        const matchMarket = allowedMarkets.some(
          (m: string) => m === marketId || m.endsWith(`/${marketId}`),
        );
        if (!matchMarket) {
          log("offer_skip_market_mismatch", {
            offerId: offer.id,
            name: offer.name,
            marketId,
            allowedMarkets,
          });
          return false;
        }
      }
    } catch {
      // ignore parse error
    }
  }

  return true;
}

const checkValid = (input: CartInput): boolean => {
  if (!input.cart.lines.length) {
    return false;
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );

  if (!hasProductDiscountClass) {
    return false;
  }

  return true;
};
