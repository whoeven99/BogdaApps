import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  OrderDiscountCandidate,
  OrderDiscountSelectionStrategy,
  ProductDiscountCandidate,
  ProductDiscountSelectionStrategy,
} from "../../generated/api";
import type {
  OfferMetafieldPayload,
  MetafieldSnapshot,
  CompiledOfferRuntime,
} from "./types";
import { ENABLE_FUNCTION_LOGS, log, logCiwiBundleOffersDiagnostics, summarizeMetafield } from "./log";
import {
  compileOfferRuntimeFromWire,
  normalizeCouponCode,
  normalizeCountryCode,
  buildBuyerTargetingContext,
  resolveAcceptedCouponCode,
  offerPassesScheduleAndMarket,
  offerMatchesCustomerSegments,
  offerMatchesCustomerProfileFilters,
  offerMatchesIpCountryCodes,
  resolveNowMs,
  offerIntersectsCartForBxgyEvaluation,
  resolveDiscountMessage,
} from "./parsing";
import { buildIndexedCartLines } from "./cartIndex";
import { buildRegularOfferIndex, findOffers } from "./offerIndex";
import { resolveExclusiveProductCandidates } from "./conflictResolution";
import {
  calculateBxgyDiscount,
  calculateCompleteBundleProductDiscounts,
  calculateFreeGiftDiscount,
  buildOrderDiscountCandidatesFromCompiledOffers,
  getBestProductDiscountPercentValueFromTiers,
  isCompleteBundleOfferType,
} from "./discounts";

// Re-export everything from sub-modules
export * from "./types";
export * from "./log";
export * from "./parsing";
export * from "./cartIndex";
export * from "./offerIndex";
export * from "./discounts";
export * from "./conflictResolution";

// ── Internal helpers for resolveCartOffersPayload ──

function offersJsonHasList(v: unknown): v is OfferMetafieldPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as OfferMetafieldPayload;
  return Array.isArray(o.offers) && o.offers.length > 0;
}

/**
 * 合并多个分片 payload 的 offers（按 id 去重，保留首次出现）。
 * 分片来自同一 discount owner 的 offers / offers-1（见 OFFER_SHARD_KEYS）。
 */
function mergeShardedOfferPayloads(
  payloads: Array<OfferMetafieldPayload | null | undefined>,
): OfferMetafieldPayload | null {
  const offers: Array<unknown> = [];
  const seenIds = new Set<string>();
  let updatedAt: string | undefined;
  let version: number | undefined;
  let anyPresent = false;

  for (const payload of payloads) {
    if (!payload || typeof payload !== "object") continue;
    anyPresent = true;
    if (updatedAt == null && typeof payload.updatedAt === "string") updatedAt = payload.updatedAt;
    if (version == null && typeof payload.v === "number") version = payload.v;
    for (const offer of payload.offers ?? []) {
      const wire = offer as { id?: string; i?: string };
      const id = String(wire?.id || wire?.i || "").trim();
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }
      offers.push(offer);
    }
  }

  if (!anyPresent) return null;
  return { v: version, updatedAt, offers } as OfferMetafieldPayload;
}

// ── Exported functions ──

/**
 * 读取活动配置：合并 automatic discount owner 上 `$app:ciwi_bundle` 的所有分片
 * （offers + offers-1）。shop 级全量 offers 仅供后台/主题使用，不注入 function。
 */
export function resolveCartOffersPayload(input: CartInput): {
  payload: OfferMetafieldPayload | null | undefined;
  offersSource: string;
  discountOwnerOffersMetafield: MetafieldSnapshot;
} {
  const discountOwnerMf =
    input.discount.offersFromDiscountOwner as MetafieldSnapshot | null | undefined;
  const shard1Mf = (input.discount as unknown as { offersShard1?: MetafieldSnapshot })
    .offersShard1;
  const p0 = discountOwnerMf?.jsonValue as OfferMetafieldPayload | null | undefined;
  const p1 = shard1Mf?.jsonValue as OfferMetafieldPayload | null | undefined;
  const merged = mergeShardedOfferPayloads([p0, p1]);

  ENABLE_FUNCTION_LOGS && log("read_ciwi_offers_metafield", {
    namespace: "$app:ciwi_bundle",
    keys: ["offers", "offers-1"],
    shard0Present: discountOwnerMf != null,
    shard1Present: shard1Mf != null,
    shard0OffersLength: Array.isArray(p0?.offers) ? p0!.offers!.length : null,
    shard1OffersLength: Array.isArray(p1?.offers) ? p1!.offers!.length : null,
    mergedOffersLength: Array.isArray(merged?.offers) ? merged!.offers!.length : null,
  });

  if (offersJsonHasList(merged)) {
    return {
      payload: merged,
      offersSource: "discount_owner_app_ciwi_bundle_offers",
      discountOwnerOffersMetafield: discountOwnerMf,
    };
  }

  return {
    payload: merged ?? null,
    offersSource: merged != null ? "discount_owner_empty_lists" : "no_offers_metafield",
    discountOwnerOffersMetafield: discountOwnerMf,
  };
}

/**
 * 校验是否允许生成本次折扣：购物车非空。
 */
export function checkValid(input: CartInput): boolean {
  return input.cart.lines.length > 0;
}

export function bundleCartDiscountGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const {
    payload: resolvedPayload,
    offersSource: resolvedSource,
    discountOwnerOffersMetafield,
  } = resolveCartOffersPayload(input);

  const offersPayload = resolvedPayload ?? null;
  const offersSource = resolvedSource;

  logCiwiBundleOffersDiagnostics(
    discountOwnerOffersMetafield,
    offersPayload,
    {
      resolvedSource: offersSource ?? "",
    },
  );

  ENABLE_FUNCTION_LOGS && log("shop_metafields_snapshot", {
    discountOwnerOffersMetafield: summarizeMetafield(discountOwnerOffersMetafield),
    activeSource: offersSource,
  });

  ENABLE_FUNCTION_LOGS && log("run_start", {
    cartLineCount: input.cart.lines.length,
    discountClasses: input.discount.discountClasses,
    hasOffers: Boolean(offersPayload),
    offersSource,
  });

  if (!offersPayload) {
    ENABLE_FUNCTION_LOGS && log("early_exit", { reason: "no_offers_payload" });
    return { operations: [] };
  }
  const offers = offersPayload?.offers ?? [];
  const compiledOffers = offers.map((wire) => compileOfferRuntimeFromWire(wire));
  const enteredCodes = new Set(
    [normalizeCouponCode(input.triggeringDiscountCode)].filter(Boolean),
  );
  const buyerTargetingContext = buildBuyerTargetingContext(input);
  const acceptedCouponCodes = new Set<string>();
  const acceptedCouponCodeByOfferId = new Map<string, string>();

  ENABLE_FUNCTION_LOGS && log("metafield_offers", {
    updatedAt: offersPayload?.updatedAt ?? null,
    offerCount: compiledOffers.length,
    offersSummary: compiledOffers.map(({ offer, selectedIds, standardRules, bxgyRules }) => ({
      id: offer.id,
      name: offer.name,
      status: offer.status,
      selectedIdCount: selectedIds.length,
      standardRuleCount: standardRules.length,
      bxgyRuleCount: bxgyRules.length,
    })),
  });

  if (!offers.length) {
    ENABLE_FUNCTION_LOGS && log("early_exit", { reason: "no_offers_in_metafield" });
    return { operations: [] };
  }

  if (!checkValid(input)) {
    ENABLE_FUNCTION_LOGS && log("early_exit", {
      reason: "checkValid_failed",
      cartLineCount: input.cart.lines.length,
      discountClasses: input.discount.discountClasses,
    });
    return { operations: [] };
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );
  const hasOrderDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Order,
  );
  const localizationCountryCode = normalizeCountryCode(
    input.localization?.country?.isoCode,
  );
  const eligibleOffers = compiledOffers.filter((compiledOffer) => {
    const { offer, settings } = compiledOffer;
    if (!offerMatchesCustomerSegments(offer, buyerTargetingContext, settings)) {
      ENABLE_FUNCTION_LOGS && log("offer_skip_customer_segment", {
        offerId: offer.id,
        name: offer.name,
      });
      return false;
    }
    if (!offerMatchesCustomerProfileFilters(offer, buyerTargetingContext, settings)) {
      ENABLE_FUNCTION_LOGS && log("offer_skip_customer_profile_filter", {
        offerId: offer.id,
        name: offer.name,
      });
      return false;
    }
    if (!offerMatchesIpCountryCodes(offer, localizationCountryCode, settings)) {
      ENABLE_FUNCTION_LOGS && log("offer_skip_ip_country_code", {
        offerId: offer.id,
        name: offer.name,
        localizationCountryCode,
      });
      return false;
    }
    const couponAccess = settings.couponAccess;
    if (!couponAccess.enabled) {
      return true;
    }
    const acceptedCode = resolveAcceptedCouponCode(offer, enteredCodes, settings);
    if (!acceptedCode) {
      ENABLE_FUNCTION_LOGS && log("offer_skip_coupon_code_mismatch", {
        offerId: offer.id,
        name: offer.name,
        configuredCode: couponAccess.code,
      });
      return false;
    }
    acceptedCouponCodes.add(acceptedCode);
    acceptedCouponCodeByOfferId.set(String(offer.id || ""), acceptedCode);
    return true;
  });

  const productCandidates: ProductDiscountCandidate[] = [];
  // 记录"可按单位裁剪"的候选（仅数量阶梯）。BXGY（100% off 指定单位）与
  // complete-bundle（整包 fixedAmount）都是原子候选，裁剪会破坏其语义，不入此集合。
  // 仲裁层用它判断冲突时能否把候选缩到剩余容量，而不是整条丢弃。
  const divisibleProductCandidates = new Set<ProductDiscountCandidate>();
  const orderCandidates: OrderDiscountCandidate[] = [];
  const cartIndex = buildIndexedCartLines(input.cart.lines);

  const marketId = input.localization?.market?.id;
  const nowMs = resolveNowMs();
  const bxgyOffers = eligibleOffers.filter(
    (compiledOffer) =>
      (compiledOffer.offer.offerType === "bxgy" ||
        compiledOffer.offer.offerType === "quantity-breaks-different" ||
        (compiledOffer.offer.offerType === "quantity-breaks-same" &&
          compiledOffer.hasUnifiedBxgyTier)) &&
      offerPassesScheduleAndMarket(compiledOffer.offer, marketId, nowMs, compiledOffer.settings),
  );
  const cartRelevantBxgyOffers = bxgyOffers.filter((compiledOffer) =>
    offerIntersectsCartForBxgyEvaluation(compiledOffer, cartIndex),
  );
  const bxgyOffersForEvaluation = hasProductDiscountClass
    ? cartRelevantBxgyOffers
    : [];
  if (cartRelevantBxgyOffers.length > 0 && bxgyOffersForEvaluation.length === 0) {
    ENABLE_FUNCTION_LOGS && log("bxgy_eval_skipped", {
      hasProductDiscountClass,
      hasOrderDiscountClass,
      cartRelevantBxgyOfferIds: cartRelevantBxgyOffers.map((compiledOffer) => compiledOffer.offer.id),
      reason: "no_product_discount_class",
    });
  }
  const freeGiftOffers = eligibleOffers.filter(
    (compiledOffer) =>
      compiledOffer.offer.offerType === "free-gift" &&
      offerPassesScheduleAndMarket(compiledOffer.offer, marketId, nowMs, compiledOffer.settings),
  );
  /** 普通数量阶梯：不含 BXGY 与 complete-bundle（后两者有独立分支） */
  const regularOffers = eligibleOffers.filter(
    (compiledOffer) =>
      compiledOffer.offer.offerType !== "bxgy" &&
      compiledOffer.offer.offerType !== "quantity-breaks-different" &&
      compiledOffer.offer.offerType !== "free-gift" &&
      !isCompleteBundleOfferType(compiledOffer.offer.offerType) &&
      offerPassesScheduleAndMarket(compiledOffer.offer, marketId, nowMs, compiledOffer.settings),
  );
  const regularOfferIndex = buildRegularOfferIndex(regularOffers);
  ENABLE_FUNCTION_LOGS && log("offer_groups_resolved", {
    totalOffers: compiledOffers.length,
    eligibleOffers: eligibleOffers.length,
    bxgyCount: bxgyOffers.length,
    bxgyCartRelevantCount: cartRelevantBxgyOffers.length,
    bxgyEvalCount: bxgyOffersForEvaluation.length,
    freeGiftCount: freeGiftOffers.length,
    completeBundleCount: compiledOffers.filter((o) => isCompleteBundleOfferType(o.offer.offerType)).length,
    regularCount: regularOffers.length,
  });

  // ① 处理 BXGY（买 X 送 Y 等）：只负责生成候选，最终由 Shopify 按最大减免选择商品折扣。
  if (bxgyOffersForEvaluation.length > 0) {
    const bxgyCandidates = calculateBxgyDiscount(
      cartIndex,
      bxgyOffersForEvaluation,
    );
    if (bxgyCandidates.length > 0) {
      productCandidates.push(...bxgyCandidates);
    }
  }

  // ③ complete-bundle 保持"整包总价"语义，但执行层改为多 target 的 product discount。
  if (hasProductDiscountClass) {
    ENABLE_FUNCTION_LOGS && log("complete_bundle_evaluation_start", {
      marketId,
      cartLineCount: input.cart.lines.length,
    });
    const completeBundleCandidates = calculateCompleteBundleProductDiscounts(
      cartIndex,
      eligibleOffers.map((compiledOffer) => compiledOffer.offer),
      marketId,
      nowMs,
    );
    if (completeBundleCandidates.length > 0) {
      productCandidates.push(...completeBundleCandidates);
      ENABLE_FUNCTION_LOGS && log("complete_bundle_evaluation_success", {
        candidateCount: completeBundleCandidates.length,
      });
    } else {
      ENABLE_FUNCTION_LOGS && log("complete_bundle_evaluation_no_match", {
        reason: "no_complete_bundle_candidates",
      });
    }
  }

  // ② 按行匹配普通 bundle 的 discountRulesJson 数量阶梯。
  if (hasProductDiscountClass) {
    for (const line of input.cart.lines) {
      if (line.merchandise.__typename !== "ProductVariant") {
        ENABLE_FUNCTION_LOGS && log("line_skip", {
          cartLineId: line.id,
          reason: "merchandise_not_product_variant",
          typename: line.merchandise.__typename,
        });
        continue;
      }

      const lineId = line.id;
      const totalQuantity = line.quantity;
      const productId = line.merchandise.product?.id;
      const variantId = line.merchandise.id;

      ENABLE_FUNCTION_LOGS && log("line_evaluate", {
        cartLineId: lineId,
        totalQuantity,
        productId,
        variantId,
        marketId,
      });

      if (!lineId || !totalQuantity) {
        ENABLE_FUNCTION_LOGS && log("line_skip", { cartLineId: lineId, reason: "missing_line_id_or_qty" });
        continue;
      }

      const matchingOffers = findOffers(productId, variantId, regularOfferIndex);
      if (!matchingOffers.length) {
        ENABLE_FUNCTION_LOGS && log("line_no_matching_offer", {
          cartLineId: lineId,
          productId,
          variantId,
        });
        continue;
      }

      const matchingOfferIds = matchingOffers.map((compiledOffer) => compiledOffer.offer.id);
      const bestMatch = matchingOffers.reduce<{
        compiledOffer: CompiledOfferRuntime;
        discountPercentValue: string | null;
        discountPercentNumber: number;
      } | null>((best, compiledOffer) => {
        const discountPercentValue = getBestProductDiscountPercentValueFromTiers(
          compiledOffer.standardRules,
          totalQuantity,
        );
        const discountPercentNumber = Number(discountPercentValue || 0);
        if (!discountPercentValue || discountPercentNumber <= 0) {
          return best;
        }
        if (!best || discountPercentNumber > best.discountPercentNumber) {
          return {
            compiledOffer,
            discountPercentValue,
            discountPercentNumber,
          };
        }
        return best;
      }, null);
      if (!bestMatch) {
        ENABLE_FUNCTION_LOGS && log("line_skip", {
          cartLineId: lineId,
          reason: "no_discount_percent_after_rules",
          matchedOfferIds: matchingOfferIds,
        });
        continue;
      }

      ENABLE_FUNCTION_LOGS && log("line_matched_offer", {
        cartLineId: lineId,
        matchedOfferIds: matchingOfferIds,
        winningOfferId: bestMatch.compiledOffer.offer.id,
        winningOfferName: bestMatch.compiledOffer.offer.name,
        winningDiscountPercent: bestMatch.discountPercentValue,
      });

      const discountPercentValue = bestMatch.discountPercentValue;
      ENABLE_FUNCTION_LOGS && log("line_discount_percent", {
        cartLineId: lineId,
        discountPercentValue,
        totalQuantity,
      });

      if (!discountPercentValue) {
        ENABLE_FUNCTION_LOGS && log("line_skip", {
          cartLineId: lineId,
          reason: "no_discount_percent_after_rules",
        });
        continue;
      }

      const candidate: ProductDiscountCandidate = {
        message: resolveDiscountMessage(bestMatch.compiledOffer.offer),
        targets: [
          {
            cartLine: {
              id: lineId,
              quantity: totalQuantity,
            },
          },
        ],
        value: {
          percentage: {
            value: discountPercentValue,
          },
        },
        associatedDiscountCode: acceptedCouponCodeByOfferId.get(
          String(bestMatch.compiledOffer.offer.id || ""),
        )
          ? {
              code: acceptedCouponCodeByOfferId.get(
                String(bestMatch.compiledOffer.offer.id || ""),
              )!,
            }
          : undefined,
      };

      productCandidates.push(candidate);
      // 数量阶梯是 percentage 候选，可按单位裁剪：标记为可拆，供仲裁层在冲突时
      // 缩到剩余容量而非整条丢弃。
      divisibleProductCandidates.add(candidate);
      ENABLE_FUNCTION_LOGS && log("line_candidate_added", {
        cartLineId: lineId,
        percent: discountPercentValue,
        quantity: totalQuantity,
      });
    }
  }

  const resolvedProductCandidates = productCandidates.length
    ? resolveExclusiveProductCandidates(
        productCandidates,
        input.cart.lines,
        divisibleProductCandidates,
      )
    : [];

  // ④ free gift 作为 order reward 生成订单级 fixed-amount 候选。
  if (hasOrderDiscountClass) {
    const freeGiftCandidates = calculateFreeGiftDiscount(
      input.cart.lines,
      freeGiftOffers.map((compiledOffer) => compiledOffer.offer),
    );
    if (freeGiftCandidates.length > 0) {
      orderCandidates.push(...freeGiftCandidates);
    }
  }

  if (hasOrderDiscountClass) {
    orderCandidates.push(
      ...buildOrderDiscountCandidatesFromCompiledOffers(
        input,
        regularOffers,
        marketId,
        nowMs,
        acceptedCouponCodeByOfferId,
      ),
    );
  }

  if (!productCandidates.length && !orderCandidates.length && acceptedCouponCodes.size === 0) {
    ENABLE_FUNCTION_LOGS && log("early_exit", {
      reason: "no_discount_candidates_after_evaluation",
      linesProcessed: input.cart.lines.length,
    });
    return { operations: [] };
  }

  const operations: CartLinesDiscountsGenerateRunResult["operations"] = [];

  if (acceptedCouponCodes.size > 0) {
    operations.push({
      enteredDiscountCodesAccept: {
        codes: Array.from(acceptedCouponCodes).map((code) => ({ code })),
      },
    });
  }

  if (productCandidates.length > 0) {
    operations.push({
      productDiscountsAdd: {
        candidates: resolvedProductCandidates,
        selectionStrategy: ProductDiscountSelectionStrategy.All,
      },
    });
  }

  if (orderCandidates.length > 0) {
    operations.push({
      orderDiscountsAdd: {
        candidates: orderCandidates,
        selectionStrategy: OrderDiscountSelectionStrategy.Maximum,
      },
    });
  }

  ENABLE_FUNCTION_LOGS && log("run_success", {
    candidateCount: resolvedProductCandidates.length,
    orderCandidateCount: orderCandidates.length,
    operationsJsonLength: JSON.stringify(operations).length,
  });

  return { operations };
}
