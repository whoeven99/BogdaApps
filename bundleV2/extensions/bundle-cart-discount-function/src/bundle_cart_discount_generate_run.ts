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
  }>;
};

type Offer = NonNullable<OfferMetafieldPayload["offers"]>[number];

export function bundleCartDiscountGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const shopAny = input.shop as unknown as {
    metafield?: { jsonValue?: unknown; type?: string } | null;
    offersProd?: { jsonValue?: unknown; type?: string } | null;
    offersTest?: { jsonValue?: unknown; type?: string } | null;
    offersActiveEnv?: { jsonValue?: unknown; type?: string } | null;
    bundleEnabledProd?: { jsonValue?: unknown; type?: string } | null;
    bundleEnabledTest?: { jsonValue?: unknown; type?: string } | null;
  };
  const bundleEnabledProdPayload = shopAny.bundleEnabledProd?.jsonValue as
    | { enabled?: boolean }
    | null
    | undefined;
  const bundleEnabledTestPayload = shopAny.bundleEnabledTest?.jsonValue as
    | { enabled?: boolean }
    | null
    | undefined;
  const prodEnabled = bundleEnabledProdPayload?.enabled === true;
  const testEnabled = bundleEnabledTestPayload?.enabled === true;

  const offersProdPayload = shopAny.offersProd?.jsonValue as
    | OfferMetafieldPayload
    | null
    | undefined;
  const offersTestPayload = shopAny.offersTest?.jsonValue as
    | OfferMetafieldPayload
    | null
    | undefined;

  const toUpdatedAtMs = (payload: OfferMetafieldPayload | null | undefined): number => {
    const raw = payload?.updatedAt;
    if (!raw || typeof raw !== "string") return 0;
    const ts = Date.parse(raw);
    return Number.isFinite(ts) ? ts : 0;
  };

  let selectedEnv: "prod" | "test" | null = null;
  let offersPayload: OfferMetafieldPayload | null | undefined = null;
  if (!prodEnabled && !testEnabled) {
    selectedEnv = null;
    offersPayload = null;
  } else if (prodEnabled && !testEnabled) {
    selectedEnv = "prod";
    offersPayload = offersProdPayload;
  } else if (!prodEnabled && testEnabled) {
    selectedEnv = "test";
    offersPayload = offersTestPayload;
  } else {
    const prodTs = toUpdatedAtMs(offersProdPayload);
    const testTs = toUpdatedAtMs(offersTestPayload);
    if (prodTs >= testTs) {
      selectedEnv = "prod";
      offersPayload = offersProdPayload;
    } else {
      selectedEnv = "test";
      offersPayload = offersTestPayload;
    }
  }

  log("run_start", {
    cartLineCount: input.cart.lines.length,
    discountClasses: input.discount.discountClasses,
    metafieldPresent: Boolean(input.shop.metafield),
    metafieldType: input.shop.metafield?.type ?? null,
    prodEnabled,
    testEnabled,
    selectedEnv,
    hasProdOffers: Boolean(shopAny.offersProd?.jsonValue),
    hasTestOffers: Boolean(shopAny.offersTest?.jsonValue),
  });

  if (!offersPayload) {
    log("early_exit", { reason: "bundle_disabled_or_no_selected_env_payload" });
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

    const suitOffer = findOffer(productId, variantId, marketId, offers);
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

/**
 * selectedProductsJson 存的是 Product GID（与主题端、后台一致），需用购物车行的 product.id / variant.id 匹配，不能用 CartLine.id。
 */
const findOffer = (
  productId: string | undefined,
  variantId: string | undefined,
  marketId: string | undefined,
  offers: Offer[],
): Offer | null => {
  const now = Date.now();

  for (const offer of offers) {
    if (offer.status === false) {
      log("offer_skip_disabled", { offerId: offer.id, name: offer.name });
      continue;
    }

    if (offer.startTime) {
      const startTimeMs = Date.parse(offer.startTime);
      if (Number.isFinite(startTimeMs) && now < startTimeMs) {
        log("offer_skip_before_start", { offerId: offer.id, name: offer.name, startTime: offer.startTime });
        continue;
      }
    }

    if (offer.endTime) {
      const endTimeMs = Date.parse(offer.endTime);
      if (Number.isFinite(endTimeMs) && now > endTimeMs) {
        log("offer_skip_after_end", { offerId: offer.id, name: offer.name, endTime: offer.endTime });
        continue;
      }
    }

    if (marketId && offer.offerSettingsJson) {
      try {
        const settings = JSON.parse(offer.offerSettingsJson);
        const offerMarkets = settings.markets;
        if (typeof offerMarkets === "string" && offerMarkets !== "all" && offerMarkets.trim() !== "") {
          const allowedMarkets = offerMarkets.split(",").map((m: string) => m.trim());
          if (!allowedMarkets.includes(marketId)) {
            log("offer_skip_market_mismatch", { offerId: offer.id, name: offer.name, marketId, allowedMarkets });
            continue;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

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
