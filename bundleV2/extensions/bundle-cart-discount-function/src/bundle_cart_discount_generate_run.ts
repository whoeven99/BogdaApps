import {
  CartInput,
  CartLinesDiscountsGenerateRunResult,
  DiscountClass,
  OrderDiscountCandidate,
  OrderDiscountSelectionStrategy,
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

type MetafieldSnapshot = {
  jsonValue?: unknown;
  value?: unknown;
  type?: string;
} | null | undefined;

/** 便于在 Function 日志里排查 Shop 上 ciwi-bundle-offers-fn（瘦 payload）是否注入、内容是否完整 */
const CIWI_BUNDLE_OFFERS_LOG_MAX_CHARS = 12_000;

function logCiwiBundleOffersShopData(
  offersFnMf: MetafieldSnapshot,
  /** 实际参与折扣计算的 payload（可能来自 discount owner，未必等于 fn 字段） */
  effectiveParsedPayload: OfferMetafieldPayload | null | undefined,
  extra: {
    resolvedSource: string;
    offersDiscountOwner: ReturnType<typeof summarizeMetafield>;
  },
): void {
  let payloadJson: string;
  try {
    if (effectiveParsedPayload === undefined) payloadJson = "undefined";
    else if (effectiveParsedPayload === null) payloadJson = "null";
    else payloadJson = JSON.stringify(effectiveParsedPayload);
  } catch {
    payloadJson = "(payload JSON.stringify failed)";
  }
  const truncated =
    payloadJson.length > CIWI_BUNDLE_OFFERS_LOG_MAX_CHARS
      ? `${payloadJson.slice(0, CIWI_BUNDLE_OFFERS_LOG_MAX_CHARS)}...(truncated total=${payloadJson.length})`
      : payloadJson;

  log("ciwi_bundle_offers_shop", {
    namespace: "ciwi_bundle",
    key: "ciwi-bundle-offers-fn",
    resolvedSource: extra.resolvedSource,
    metafield: summarizeMetafield(offersFnMf),
    offersDiscountOwner: extra.offersDiscountOwner,
    parsedOffersCount: Array.isArray(effectiveParsedPayload?.offers)
      ? effectiveParsedPayload!.offers!.length
      : null,
    parsedUpdatedAt: effectiveParsedPayload?.updatedAt ?? null,
    payloadJson: truncated,
  });
}

type BxgyDiscountRule = {
  count: number;
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxUsesPerOrder: number;
  tierType?: "bxgy" | "simple";
};

type FreeGiftRule = {
  count: number;
  giftQuantity: number;
  giftProductIds: string[];
};

type Offer = NonNullable<OfferMetafieldPayload["offers"]>[number];

/** complete-bundle：单件商品的计价方式（与主题端 offerParsing 对齐） */
type CompleteBundlePricingMode =
  | "full_price"
  | "percentage_off"
  | "amount_off"
  | "fixed_price";

type CompleteBundleProductRow = {
  productId: string;
  pricing: { mode: CompleteBundlePricingMode; value: number };
};

type CompleteBundleBarRow = {
  id: string;
  minQuantity: number;
  maxQuantity: number;
  excludeTriggerProduct: boolean;
  pricing: { mode: CompleteBundlePricingMode; value: number };
  products: CompleteBundleProductRow[];
};

type CartLineForBundle = CartInput["cart"]["lines"][number];

function parseMoneyAmount(raw: unknown): number {
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function parseFreeGiftRulesJson(discountRulesJson?: string | null): FreeGiftRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    const rules: FreeGiftRule[] = [];
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const count = Number((item as { count?: unknown }).count);
      const giftQuantity = Number((item as { giftQuantity?: unknown }).giftQuantity);
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(giftQuantity) || giftQuantity < 1) continue;

      rules.push({
        count: Math.max(1, Math.trunc(count)),
        giftQuantity: Math.max(1, Math.trunc(giftQuantity)),
        giftProductIds: Array.isArray((item as { giftProductIds?: unknown }).giftProductIds)
          ? ((item as { giftProductIds: unknown[] }).giftProductIds)
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : [],
      });
    }

    rules.sort((a, b) => a.count - b.count);
    return rules;
  } catch {
    return [];
  }
}

/**
 * 从 Product GID（gid://shopify/Product/123）或纯数字字符串中提取末尾数字 ID，用于与后台配置对比。
 * 后台 Resource Picker 有时存整段 GID，有时仅存数字，购物车行侧始终为 GID，必须归一化后再比较。
 */
function extractShopifyProductNumericId(
  raw: string | undefined | null,
): string {
  if (!raw) return "";
  const s = String(raw).trim();
  const tail = s.match(/(\d+)\s*$/);
  return tail ? tail[1] : s;
}

/** 判断两个 Product 标识是否指向同一商品（兼容 GID / 纯数字） */
function productIdsMatch(
  cartProductGid: string | undefined,
  configProductId: string,
): boolean {
  const a = extractShopifyProductNumericId(cartProductGid);
  const b = extractShopifyProductNumericId(configProductId);
  if (a.length && b.length) return a === b;
  return String(cartProductGid || "") === String(configProductId || "");
}

/** 判断是否为 complete-bundle 活动（兼容大小写、空格与下划线） */
function isCompleteBundleOfferType(offerType: string | undefined): boolean {
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
function applyCompleteBundleUnitPricing(
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

/** 解析 selectedProductsJson 中的 complete-bundle bars（与后台 offerParsing 结构一致） */
function parseCompleteBundleBarsJson(
  selectedProductsJson?: string | null,
): { triggerProductIds: string[]; bars: CompleteBundleBarRow[] } {
  if (!selectedProductsJson) return { triggerProductIds: [], bars: [] };
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    const triggerProductIds = Array.isArray((parsed as { productIds?: unknown })?.productIds)
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
          products.push({ productId, pricing: { mode: pm, value: pv } });
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

/** 与 findOffer 中相同的档期 / 市场过滤（供 complete-bundle 复用） */
function offerPassesScheduleAndMarket(
  offer: Offer,
  marketId: string | undefined,
  nowMs: number | null,
): boolean {
  if (offer.status === false) {
    log("offer_skip_disabled", { offerId: offer.id, name: offer.name });
    return false;
  }

  if (offer.startTime) {
    const startTimeMs = Date.parse(offer.startTime);
    if (nowMs === null) {
      log("offer_time_unavailable_skip_start_check", {
        offerId: offer.id,
        name: offer.name,
        startTime: offer.startTime,
      });
    } else if (Number.isFinite(startTimeMs) && nowMs < startTimeMs) {
      log("offer_skip_before_start", {
        offerId: offer.id,
        name: offer.name,
        startTime: offer.startTime,
      });
      return false;
    }
  }

  if (offer.endTime) {
    const endTimeMs = Date.parse(offer.endTime);
    if (nowMs === null) {
      log("offer_time_unavailable_skip_end_check", {
        offerId: offer.id,
        name: offer.name,
        endTime: offer.endTime,
      });
    } else if (Number.isFinite(endTimeMs) && nowMs > endTimeMs) {
      log("offer_skip_after_end", {
        offerId: offer.id,
        name: offer.name,
        endTime: offer.endTime,
      });
      return false;
    }
  }

  if (marketId && offer.offerSettingsJson) {
    try {
      const settings = JSON.parse(offer.offerSettingsJson) as {
        markets?: string;
      };
      const offerMarkets = settings.markets;
      if (
        typeof offerMarkets === "string" &&
        offerMarkets !== "all" &&
        offerMarkets.trim() !== ""
      ) {
        const allowedMarkets = offerMarkets.split(",").map((m) => m.trim());
        const matchMarket = allowedMarkets.some(
          (m) => m === marketId || m.endsWith(`/${marketId}`),
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

/**
 * complete-bundle 购物车折扣：
 * - 当某一「档位」bar 要求的全部商品都在购物车中（每件至少 1，可拆同一行的数量）时生效；
 * - 多档位时必须先试「件数最多」的一档，否则会出现只命中低档位、整包优惠漏算的问题；
 * - 商品 ID 需与购物车行 product.id 对齐（GID 与纯数字混合存储时通过归一化比较）。
 */
function calculateCompleteBundleDiscounts(
  cartLines: CartLineForBundle[],
  offers: Offer[],
  marketId: string | undefined,
  nowMs: number | null,
): ProductDiscountCandidate[] {
  const completeOffers = offers.filter((o) => isCompleteBundleOfferType(o.offerType));
  if (!completeOffers.length) {
    return [];
  }

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

    for (const bar of barsRaw) {
      if (!bar.products.length) continue;
      const anchorLine = cartLines.find((line) => {
        if (line.merchandise.__typename !== "ProductVariant") return false;
        const pid = line.merchandise.product?.id;
        return parsedConfig.triggerProductIds.some((triggerId) => productIdsMatch(pid, triggerId));
      });
      if (!anchorLine) continue;

      const accessoryAllocations: Array<{
        lineId: string;
        qty: number;
        unitBase: number;
        mode: CompleteBundlePricingMode;
        value: number;
      }> = [];
      for (const accessory of bar.products) {
        const matchedLine = cartLines.find((line) => {
          if (line.merchandise.__typename !== "ProductVariant") return false;
          const pid = line.merchandise.product?.id;
          if (!productIdsMatch(pid, accessory.productId)) return false;
          if (
            bar.excludeTriggerProduct &&
            parsedConfig.triggerProductIds.some((triggerId) => productIdsMatch(pid, triggerId))
          ) {
            return false;
          }
          return true;
        });
        if (!matchedLine) continue;
        accessoryAllocations.push({
          lineId: matchedLine.id,
          qty: 1,
          unitBase: parseMoneyAmount(matchedLine.cost?.amountPerQuantity?.amount),
          mode: accessory.pricing.mode,
          value: accessory.pricing.value,
        });
      }

      if (accessoryAllocations.length < bar.minQuantity) {
        log("complete_bundle_bar_no_match", {
          offerId: offer.id,
          barId: bar.id,
          reason: "insufficient_accessories",
          matchedAccessories: accessoryAllocations.length,
          minQuantity: bar.minQuantity,
        });
        continue;
      }

      const allocations = accessoryAllocations.slice(0, bar.maxQuantity);

      // 同一购物车行可能对应多个槽位（同款多件），合并为一条 fixedAmount，避免多条 candidate 互相覆盖
      const mergeByLine = new Map<string, { qty: number; totalDiscount: number }>();

      for (const a of allocations) {
        const { final, original } = applyCompleteBundleUnitPricing(
          a.unitBase,
          a.mode,
          a.value,
        );
        const unitDiscount = Math.max(0, original - final);
        const row = mergeByLine.get(a.lineId) || { qty: 0, totalDiscount: 0 };
        row.qty += 1;
        row.totalDiscount += unitDiscount;
        mergeByLine.set(a.lineId, row);
      }

      const candidates: ProductDiscountCandidate[] = [];
      for (const [lineId, agg] of mergeByLine) {
        if (agg.qty <= 0 || agg.totalDiscount <= 0) continue;
        candidates.push({
          message: offer.cartTitle || "Bundle Discount",
          targets: [{ cartLine: { id: lineId, quantity: agg.qty } }],
          value: {
            fixedAmount: {
              amount: agg.totalDiscount.toFixed(2),
              appliesToEachItem: false,
            },
          },
        });
      }

      if (candidates.length) {
        log("complete_bundle_matched", {
          offerId: offer.id,
          barId: bar.id,
          candidateCount: candidates.length,
        });
        return candidates;
      }
    }
  }

  return [];
}

function offersJsonHasList(v: unknown): v is OfferMetafieldPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as OfferMetafieldPayload;
  return Array.isArray(o.offers) && o.offers.length > 0;
}

/**
 * 读取顺序：shop `ciwi-bundle-offers-fn`（瘦合并）→ 自动折扣 owner `$app:ciwi_bundle` / `offers`。
 * 主题 storefront 使用分片 `offer-{id}`，不注入 Function input。
 */
function resolveCartOffersPayload(input: CartInput): {
  payload: OfferMetafieldPayload | null | undefined;
  offersSource: string;
  shopAny: {
    offersShop?: { jsonValue?: unknown; type?: string } | null;
    bundleEnabledShop?: { jsonValue?: unknown; type?: string } | null;
  };
  discountAny: { offersDiscountOwner?: { jsonValue?: unknown; type?: string } | null };
} {
  const shopAny = input.shop as unknown as {
    offersShop?: { jsonValue?: unknown; type?: string } | null;
    bundleEnabledShop?: { jsonValue?: unknown; type?: string } | null;
  };
  const discountAny = input.discount as unknown as {
    offersDiscountOwner?: { jsonValue?: unknown; type?: string } | null;
  };

  const jFn = shopAny.offersShop?.jsonValue as OfferMetafieldPayload | null | undefined;
  const jDisc = discountAny.offersDiscountOwner?.jsonValue as OfferMetafieldPayload | null | undefined;

  if (offersJsonHasList(jFn)) {
    return { payload: jFn, offersSource: "shop_offers_fn", shopAny, discountAny };
  }
  if (offersJsonHasList(jDisc)) {
    return { payload: jDisc, offersSource: "discount_owner_offers", shopAny, discountAny };
  }

  const fallback = jFn ?? jDisc ?? null;
  return {
    payload: fallback,
    offersSource: fallback != null ? "shop_offers_empty_lists" : "no_shop_offers",
    shopAny,
    discountAny,
  };
}

export function bundleCartDiscountGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const { payload: resolvedPayload, offersSource: resolvedSource, shopAny, discountAny } =
    resolveCartOffersPayload(input);

  const bundleEnabledShopPayload = shopAny.bundleEnabledShop?.jsonValue as
    | { enabled?: boolean }
    | null
    | undefined;
  const hasExplicitEmbedFlag = shopAny.bundleEnabledShop?.jsonValue != null;
  const embedDisabled =
    hasExplicitEmbedFlag && bundleEnabledShopPayload?.enabled !== true;

  let offersPayload: OfferMetafieldPayload | null | undefined = null;
  let offersSource: string | null = null;
  if (embedDisabled) {
    offersPayload = null;
    offersSource = "shop_embed_disabled";
  } else {
    offersPayload = resolvedPayload ?? null;
    offersSource = resolvedSource;
  }

  logCiwiBundleOffersShopData(
    shopAny.offersShop as MetafieldSnapshot,
    embedDisabled ? null : offersPayload,
    {
      resolvedSource: offersSource ?? "",
      offersDiscountOwner: summarizeMetafield(discountAny.offersDiscountOwner as MetafieldSnapshot),
    },
  );

  log("shop_metafields_snapshot", {
    offersShop: summarizeMetafield(shopAny.offersShop as MetafieldSnapshot),
    offersDiscountOwner: summarizeMetafield(discountAny.offersDiscountOwner as MetafieldSnapshot),
    bundleEnabledShop: summarizeMetafield(shopAny.bundleEnabledShop as MetafieldSnapshot),
    embedDisabled,
    activeSource: offersSource,
  });

  log("run_start", {
    cartLineCount: input.cart.lines.length,
    discountClasses: input.discount.discountClasses,
    embedDisabled,
    hasOffers: Boolean(offersPayload),
    offersSource,
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

  const productCandidates: ProductDiscountCandidate[] = [];
  const orderCandidates: OrderDiscountCandidate[] = [];

  const marketId = input.localization?.market?.id;
  const nowMs = resolveNowMs();
  const bxgyOffers = offers.filter(
    (o) =>
      (o.offerType === "bxgy" ||
        o.offerType === "quantity-breaks-different" ||
        (o.offerType === "quantity-breaks-same" &&
          hasUnifiedBxgyTier(o.discountRulesJson))) &&
      offerPassesScheduleAndMarket(o, marketId, nowMs),
  );
  const freeGiftOffers = offers.filter(
    (o) => o.offerType === "free-gift" && offerPassesScheduleAndMarket(o, marketId, nowMs),
  );
  /** 普通数量阶梯：不含 BXGY 与 complete-bundle（后两者有独立分支） */
  const regularOffers = offers.filter(
    (o) =>
      o.offerType !== "bxgy" &&
      o.offerType !== "quantity-breaks-different" &&
      o.offerType !== "free-gift" &&
      !isCompleteBundleOfferType(o.offerType),
  );
  log("offer_groups_resolved", {
    totalOffers: offers.length,
    bxgyCount: bxgyOffers.length,
    freeGiftCount: freeGiftOffers.length,
    completeBundleCount: offers.filter((o) => isCompleteBundleOfferType(o.offerType)).length,
    regularCount: regularOffers.length,
  });

  // ① 优先处理 BXGY（买 X 送 Y 等）
  if (hasProductDiscountClass) {
    const bxgyCandidates = calculateBxgyDiscount(input.cart.lines, bxgyOffers);
    if (bxgyCandidates.length > 0) {
      productCandidates.push(...bxgyCandidates);
    }
  }

  if (hasProductDiscountClass && productCandidates.length === 0) {
    const freeGiftCandidates = calculateFreeGiftDiscount(input.cart.lines, freeGiftOffers);
    if (freeGiftCandidates.length > 0) {
      productCandidates.push(...freeGiftCandidates);
    }
  }

  // ② 再处理 complete-bundle：多 SKU 成套，与 discountRulesJson 阶梯无关
  if (hasProductDiscountClass && productCandidates.length === 0) {
    log("complete_bundle_evaluation_start", {
      marketId,
      cartLineCount: input.cart.lines.length,
    });
    const completeBundleCandidates = calculateCompleteBundleDiscounts(
      input.cart.lines,
      offers,
      marketId,
      nowMs,
    );
    if (completeBundleCandidates.length > 0) {
      productCandidates.push(...completeBundleCandidates);
      log("complete_bundle_evaluation_success", {
        candidateCount: completeBundleCandidates.length,
      });
    } else {
      log("complete_bundle_evaluation_no_match", {
        reason: "no_complete_bundle_candidates",
      });
    }
  }

  // ③ 最后按行匹配普通 bundle 的 discountRulesJson 数量阶梯
  if (hasProductDiscountClass && productCandidates.length === 0) {
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

      const suitOffer = findOffer(productId, variantId, marketId, regularOffers);
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

  if (hasOrderDiscountClass) {
    orderCandidates.push(
      ...buildOrderDiscountCandidates(input, regularOffers, marketId, nowMs),
    );
  }

  if (!productCandidates.length && !orderCandidates.length) {
    log("early_exit", {
      reason: "no_discount_candidates_after_evaluation",
      linesProcessed: input.cart.lines.length,
    });
    return { operations: [] };
  }

  const operations: CartLinesDiscountsGenerateRunResult["operations"] = [];

  if (productCandidates.length > 0) {
    operations.push({
      productDiscountsAdd: {
        candidates: productCandidates,
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

  log("run_success", {
    candidateCount: productCandidates.length,
    orderCandidateCount: orderCandidates.length,
    operationsJsonLength: JSON.stringify(operations).length,
  });

  return { operations };
}

type DiscountTier = {
  count: number;
  discountPercent: number;
  discountClass: "product" | "order" | "shipping";
  conditionType: "item_quantity" | "cart_amount";
  amountThreshold?: number;
  rewardType: "percentage_off" | "gift_product" | "free_shipping";
  logicType: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
  rewardProductIds: string[];
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
      const logicType =
        (item as { logicType?: unknown }).logicType === "bxgy" ? "bxgy" : "standard";
      const discountPercent = Number(
        (item as { discountPercent?: unknown }).discountPercent,
      );
      if (!Number.isFinite(count) || count < 1) continue;
      if (!Number.isFinite(discountPercent) || discountPercent < 0) continue;
      const normalizedBuyQuantity =
        logicType === "bxgy" &&
        Number.isFinite(Number((item as { buyQuantity?: unknown }).buyQuantity))
          ? Math.max(
              1,
              Math.trunc(Number((item as { buyQuantity?: unknown }).buyQuantity)),
            )
          : undefined;
      tiers.push({
        count: logicType === "bxgy" ? normalizedBuyQuantity || Math.trunc(count) : Math.trunc(count),
        discountPercent: logicType === "bxgy" ? 100 : discountPercent,
        discountClass:
          (item as { discountClass?: unknown }).discountClass === "order" ||
          (item as { discountClass?: unknown }).discountClass === "shipping"
            ? ((item as { discountClass: "order" | "shipping" }).discountClass)
            : "product",
        conditionType:
          (item as { conditionType?: unknown }).conditionType === "cart_amount"
            ? "cart_amount"
            : "item_quantity",
        amountThreshold: Number.isFinite(
          Number((item as { amountThreshold?: unknown }).amountThreshold),
        )
          ? Math.max(0, Number((item as { amountThreshold?: unknown }).amountThreshold))
          : undefined,
        rewardType:
          (item as { rewardType?: unknown }).rewardType === "gift_product" ||
          (item as { rewardType?: unknown }).rewardType === "free_shipping"
            ? ((item as { rewardType: "gift_product" | "free_shipping" }).rewardType)
            : "percentage_off",
        logicType,
        buyQuantity: normalizedBuyQuantity,
        getQuantity: Number.isFinite(
          Number((item as { getQuantity?: unknown }).getQuantity),
        )
          ? Math.max(
              1,
              Math.trunc(Number((item as { getQuantity?: unknown }).getQuantity)),
            )
          : undefined,
        maxUsesPerOrder:
          logicType === "bxgy"
            ? 1
            : Number.isFinite(Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder))
              ? Math.max(
                  1,
                  Math.trunc(Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder)),
                )
              : undefined,
        rewardProductIds: Array.isArray(
          (item as { rewardProductIds?: unknown }).rewardProductIds,
        )
          ? ((item as { rewardProductIds: unknown[] }).rewardProductIds)
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          : [],
      });
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
      const buyQuantity = Number(
        (item as { buyQuantity?: unknown; count?: unknown }).buyQuantity ??
          (item as { count?: unknown }).count,
      );
      const getQuantity = Number((item as { getQuantity?: unknown }).getQuantity);
      const discountPercent = Number((item as { discountPercent?: unknown }).discountPercent);
      const maxUsesPerOrder = Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder) || 1;
      const tierType = (item as { tierType?: unknown }).tierType;
      
      const buyProductIds = (item as { buyProductIds?: unknown }).buyProductIds;
      const getProductIds = (item as { getProductIds?: unknown }).getProductIds;
      
      if (!Number.isFinite(buyQuantity) || buyQuantity < 1) continue;
      if (!Number.isFinite(getQuantity) || getQuantity < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      if (!Array.isArray(buyProductIds) || !buyProductIds.length) continue;
      const normalizedBuyProductIds = buyProductIds.filter(id => typeof id === "string") as string[];
      
      out.push({
        count: Math.max(1, Math.trunc(buyQuantity)),
        buyQuantity: Math.max(1, Math.trunc(buyQuantity)),
        getQuantity: Math.trunc(getQuantity),
        buyProductIds: normalizedBuyProductIds,
        getProductIds:
          Array.isArray(getProductIds) && getProductIds.length > 0
            ? getProductIds.filter(id => typeof id === "string") as string[]
            : normalizedBuyProductIds,
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        maxUsesPerOrder: Math.max(1, Math.trunc(maxUsesPerOrder)),
        // Legacy dedicated BXGY records may not persist tierType; default them to BXGY.
        tierType: tierType === "simple" ? "simple" : "bxgy",
      });
    }
    
    out.sort((a, b) => a.count - b.count);
    return out;
  } catch {
    return [];
  }
}

function hasUnifiedBxgyTier(discountRulesJson?: string | null): boolean {
  return parseDiscountRulesJson(discountRulesJson).some(
    (tier) =>
      tier.logicType === "bxgy" &&
      tier.discountClass === "product" &&
      tier.rewardType === "percentage_off" &&
      tier.conditionType === "item_quantity",
  );
}

function buildBxgyRulesFromUnifiedDiscountRules(offer: Offer): BxgyDiscountRule[] {
  const productPool = parseSelectedIds(offer.selectedProductsJson);
  if (!productPool.length) return [];

  const tiers = parseDiscountRulesJson(offer.discountRulesJson).filter(
    (tier) =>
      tier.logicType === "bxgy" &&
      tier.discountClass === "product" &&
      tier.rewardType === "percentage_off" &&
      tier.conditionType === "item_quantity",
  );
  if (!tiers.length) return [];

  return tiers.map((tier) => {
    return {
      count: Math.max(1, Math.trunc(Number(tier.buyQuantity) || Number(tier.count) || 1)),
      buyQuantity: Math.max(1, Math.trunc(Number(tier.buyQuantity) || 1)),
      getQuantity: Math.max(1, Math.trunc(Number(tier.getQuantity) || 1)),
      buyProductIds: productPool,
      getProductIds: productPool,
      discountPercent: 100,
      maxUsesPerOrder: 1,
      tierType: "bxgy",
    };
  });
}

function matchesAnyConfiguredId(
  configuredIds: string[],
  productId: string | undefined,
  variantId: string | undefined,
): boolean {
  return configuredIds.some(
    (configuredId) =>
      (productId && productIdsMatch(productId, configuredId)) ||
      (variantId && productIdsMatch(variantId, configuredId)),
  );
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
    if (offer.offerType === "bxgy") {
      const dedicatedBxgyRules = parseBxgyDiscountRules(offer.discountRulesJson);
      const bxgyRules =
        dedicatedBxgyRules.length > 0
          ? dedicatedBxgyRules
          : buildBxgyRulesFromUnifiedDiscountRules(offer);
      if (!bxgyRules.length) continue;

      const selectedProductIds = parseSelectedIds(offer.selectedProductsJson);
      if (!selectedProductIds.length) {
        log("bxgy_same_product_skip_missing_pool", { offerId: offer.id });
        continue;
      }

      let bestRule: BxgyDiscountRule | null = null;
      for (const rule of bxgyRules) {
        if (selectedProductIds.length === 0) continue;
        const matchingQuantity = cartLines.reduce((sum, line) => {
          const productId = line.merchandise?.product?.id;
          const variantId = line.merchandise?.id;
          return matchesAnyConfiguredId(selectedProductIds, productId, variantId)
            ? sum + Math.max(0, Number(line.quantity) || 0)
            : sum;
        }, 0);

        if (matchingQuantity >= Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1))) {
          bestRule = rule;
        }
      }

      if (!bestRule) {
        log("bxgy_same_product_no_matching_rule", { offerId: offer.id });
        continue;
      }

      const candidates: ProductDiscountCandidate[] = [];
      for (const selectedProductId of selectedProductIds) {
        const matchingLines = cartLines
          .filter((line) => {
            if (line.merchandise?.__typename !== "ProductVariant") return false;
            const productId = line.merchandise?.product?.id;
            return productIdsMatch(productId, selectedProductId);
          })
          .map((line) => ({
            line,
            unitPrice: parseMoneyAmount(line.cost?.amountPerQuantity?.amount),
            quantity: Math.max(0, Number(line.quantity) || 0),
          }))
          .filter((entry) => entry.quantity > 0);

        if (!matchingLines.length) continue;

        const totalQuantity = matchingLines.reduce((sum, entry) => sum + entry.quantity, 0);
        const buyQuantity = Math.max(1, Math.trunc(Number(bestRule.buyQuantity) || 1));
        const getQuantity = Math.max(1, Math.trunc(Number(bestRule.getQuantity) || 1));
        const bundleSize = buyQuantity + getQuantity;
        const promotionTimes = Math.floor(totalQuantity / bundleSize);
        const maxPromotionTimes = Math.min(
          promotionTimes,
          Math.max(1, Math.trunc(Number(bestRule.maxUsesPerOrder) || 1)),
        );
        let remainingFreeQuantity = maxPromotionTimes * getQuantity;

        if (remainingFreeQuantity <= 0) continue;

        const sortedByUnitPrice = matchingLines
          .slice()
          .sort((a, b) => a.unitPrice - b.unitPrice);

        for (const entry of sortedByUnitPrice) {
          if (remainingFreeQuantity <= 0) break;
          const discountQuantity = Math.min(entry.quantity, remainingFreeQuantity);
          if (discountQuantity <= 0) continue;
          candidates.push({
            message: offer.cartTitle || "Buy X Get Y",
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
          remainingFreeQuantity -= discountQuantity;
        }
      }

      allCandidates.push(...candidates);
      continue;
    }

    const dedicatedBxgyRules = parseBxgyDiscountRules(offer.discountRulesJson);
    const bxgyRules =
      dedicatedBxgyRules.length > 0
        ? dedicatedBxgyRules
        : buildBxgyRulesFromUnifiedDiscountRules(offer);
    if (!bxgyRules.length) continue;

    if (offer.offerType !== "quantity-breaks-different") {
      let bestRule: BxgyDiscountRule | null = null;
      for (const rule of bxgyRules) {
        const matchingQuantity = cartLines.reduce((sum, line) => {
          const productId = line.merchandise?.product?.id;
          const variantId = line.merchandise?.id;
          return matchesAnyConfiguredId(rule.buyProductIds, productId, variantId)
            ? sum + Math.max(0, Number(line.quantity) || 0)
            : sum;
        }, 0);

        if (matchingQuantity >= Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1))) {
          bestRule = rule;
        }
      }

      if (!bestRule) {
        log("bxgy_same_product_no_matching_rule", { offerId: offer.id });
        continue;
      }

      const candidates: ProductDiscountCandidate[] = [];
      for (const selectedProductId of bestRule.buyProductIds) {
        const matchingLines = cartLines
          .filter((line) => {
            if (line.merchandise?.__typename !== "ProductVariant") return false;
            const productId = line.merchandise?.product?.id;
            return productIdsMatch(productId, selectedProductId);
          })
          .map((line) => ({
            line,
            unitPrice: parseMoneyAmount(line.cost?.amountPerQuantity?.amount),
            quantity: Math.max(0, Number(line.quantity) || 0),
          }))
          .filter((entry) => entry.quantity > 0);

        if (!matchingLines.length) continue;

        const totalQuantity = matchingLines.reduce((sum, entry) => sum + entry.quantity, 0);
        const buyQuantity = Math.max(1, Math.trunc(Number(bestRule.buyQuantity) || 1));
        const getQuantity = Math.max(1, Math.trunc(Number(bestRule.getQuantity) || 1));
        const bundleSize = buyQuantity + getQuantity;
        const promotionTimes = Math.floor(totalQuantity / bundleSize);
        let remainingFreeQuantity = promotionTimes * getQuantity;
        if (remainingFreeQuantity <= 0) continue;

        const sortedByUnitPrice = matchingLines.slice().sort((a, b) => a.unitPrice - b.unitPrice);
        for (const entry of sortedByUnitPrice) {
          if (remainingFreeQuantity <= 0) break;
          const discountQuantity = Math.min(entry.quantity, remainingFreeQuantity);
          if (discountQuantity <= 0) continue;
          candidates.push({
            message: offer.cartTitle || "Buy X Get Y",
            targets: [{ cartLine: { id: entry.line.id, quantity: discountQuantity } }],
            value: {
              percentage: {
                value: "100.0",
              },
            },
          });
          remainingFreeQuantity -= discountQuantity;
        }
      }

      allCandidates.push(...candidates);
      continue;
    }

    const candidates: ProductDiscountCandidate[] = [];

    const totalBuyQuantity = cartLines.reduce(
      (sum, line) => sum + Math.max(0, Number(line.quantity) || 0),
      0,
    );

    // Find the best matching tier: highest count that cart meets.
    // For quantity-breaks-different each tier may have its own eligible product subset,
    // so matching must be computed per rule rather than assuming a shared buy pool.
    let bestRule: BxgyDiscountRule | null = null;
    for (const r of bxgyRules) {
      if (!r.buyProductIds.length) continue;
      let matchingBuyProductCount = 0;
      for (const line of cartLines) {
        const productId = line.merchandise?.product?.id;
        const variantId = line.merchandise?.id;
        if (matchesAnyConfiguredId(r.buyProductIds, productId, variantId)) {
          matchingBuyProductCount += line.quantity;
        }
      }

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

    let buyProductCount = 0;
    for (const line of cartLines) {
      const productId = line.merchandise?.product?.id;
      const variantId = line.merchandise?.id;
      if (matchesAnyConfiguredId(selectedRule.buyProductIds, productId, variantId)) {
        buyProductCount += line.quantity;
      }
    }

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

      for (const line of cartLines) {
        if (remaining <= 0) break;
        const productId = line.merchandise?.product?.id;
        const variantId = line.merchandise?.id;
        const isBuyProduct = matchesAnyConfiguredId(
          selectedRule.buyProductIds,
          productId,
          variantId,
        );
        if (!isBuyProduct) continue;

        const discountQuantity = Math.min(line.quantity, remaining);
        if (discountQuantity > 0) {
          candidates.push({
            message: offer.cartTitle || "Bundle Discount",
            targets: [{ cartLine: { id: line.id, quantity: discountQuantity } }],
            value: {
              percentage: {
                value: selectedRule.discountPercent.toFixed(1),
              },
            },
          });
          remaining -= discountQuantity;
          log("simple_tier_candidate_added", {
            offerId: offer.id,
            cartLineId: line.id,
            quantity: discountQuantity,
            discountPercent: selectedRule.discountPercent,
          });
        }
      }

      allCandidates.push(...candidates);
      continue;
    }

    // Find get products and apply discount
    let remainingGetQuantity = maxPromotionTimes * selectedRule.getQuantity;

    for (const line of cartLines) {
      const productId = line.merchandise?.product?.id;
      const variantId = line.merchandise?.id;

      if (remainingGetQuantity <= 0) break;

      if (
        matchesAnyConfiguredId(
          selectedRule.getProductIds,
          productId,
          variantId,
        )
      ) {

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

function calculateFreeGiftDiscount(
  cartLines: CartInput["cart"]["lines"],
  offers: Offer[],
): ProductDiscountCandidate[] {
  const allCandidates: ProductDiscountCandidate[] = [];

  for (const offer of offers) {
    const selection = parseFreeGiftSelection(offer.selectedProductsJson);
    const triggerProductIds = selection.triggerProductIds;
    const fallbackGiftProductIds = selection.giftProductIds;
    const freeGiftRules = parseFreeGiftRulesJson(offer.discountRulesJson);

    if (!triggerProductIds.length || !freeGiftRules.length) {
      log("free_gift_skip_missing_configuration", {
        offerId: offer.id,
        triggerProductIds: triggerProductIds.length,
        freeGiftRuleCount: freeGiftRules.length,
      });
      continue;
    }

    let triggerQuantity = 0;
    for (const line of cartLines) {
      if (line.merchandise.__typename !== "ProductVariant") continue;
      const productId = line.merchandise.product?.id;
      const variantId = line.merchandise.id;
      if (matchesAnyConfiguredId(triggerProductIds, productId, variantId)) {
        triggerQuantity += Math.max(1, Math.trunc(Number(line.quantity) || 1));
      }
    }

    if (triggerQuantity <= 0) {
      log("free_gift_skip_no_trigger_quantity", {
        offerId: offer.id,
        triggerProductIds,
      });
      continue;
    }

    let bestRule: FreeGiftRule | null = null;
    for (const rule of freeGiftRules) {
      if (triggerQuantity >= rule.count) {
        bestRule = rule;
      }
    }

    if (!bestRule) {
      log("free_gift_skip_threshold_not_met", {
        offerId: offer.id,
        triggerQuantity,
        thresholds: freeGiftRules.map((rule) => rule.count),
      });
      continue;
    }

    const eligibleGiftProductIds =
      bestRule.giftProductIds.length > 0
        ? bestRule.giftProductIds
        : fallbackGiftProductIds;
    if (!eligibleGiftProductIds.length) {
      log("free_gift_skip_no_reward_products", {
        offerId: offer.id,
        triggerQuantity,
        selectedRuleCount: bestRule.count,
      });
      continue;
    }

    let remainingGiftQuantity = bestRule.giftQuantity;
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

      allCandidates.push({
        message: offer.cartTitle || "Free gift",
        targets: [{ cartLine: { id: line.id, quantity: discountQuantity } }],
        value: {
          percentage: {
            value: "100.0",
          },
        },
      });

      remainingGiftQuantity -= discountQuantity;
      log("free_gift_candidate_added", {
        offerId: offer.id,
        cartLineId: line.id,
        quantity: discountQuantity,
        selectedRuleCount: bestRule.count,
      });
    }
  }

  return allCandidates;
}
  
function formatDiscountPercentValue(percent: number): string {
  if (!Number.isFinite(percent)) return DEFAULT_DISCOUNT_PERCENTAGE;
  return percent.toFixed(1);
}

function getScopedLinesForOffer(
  cartLines: CartInput["cart"]["lines"],
  offer: Offer,
): CartInput["cart"]["lines"] {
  const selectedIds = parseSelectedIds(offer.selectedProductsJson);
  if (!selectedIds.length) {
    return cartLines.filter(
      (line) => line.merchandise.__typename === "ProductVariant",
    );
  }

  return cartLines.filter((line) => {
    if (line.merchandise.__typename !== "ProductVariant") return false;
    const productId = line.merchandise.product?.id;
    const variantId = line.merchandise.id;
    return selectedIds.some(
      (sid) =>
        (productId && productIdsMatch(productId, sid)) ||
        (variantId && productIdsMatch(variantId, sid)),
    );
  });
}

function evaluateRuleCondition(
  rule: DiscountTier,
  metrics: { totalQuantity: number; subtotalAmount: number },
): boolean {
  if (rule.conditionType === "cart_amount") {
    const threshold = Math.max(0, Number(rule.amountThreshold) || 0);
    return threshold > 0 && metrics.subtotalAmount >= threshold;
  }
  return metrics.totalQuantity >= Math.max(1, Math.trunc(Number(rule.count) || 1));
}

function getBestProductDiscountPercentValue(
  discountRulesJson: string | null | undefined,
  quantity: number,
): string | null {
  const tiers = parseDiscountRulesJson(discountRulesJson).filter(
    (tier) =>
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

function buildOrderDiscountCandidates(
  input: CartInput,
  offers: Offer[],
  marketId: string | undefined,
  nowMs: number | null,
): OrderDiscountCandidate[] {
  const candidates: OrderDiscountCandidate[] = [];
  const allCartLineIds = input.cart.lines.map((line) => line.id);

  for (const offer of offers) {
    if (!offerPassesScheduleAndMarket(offer, marketId, nowMs)) continue;
    const scopedLines = getScopedLinesForOffer(input.cart.lines, offer);
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
      message: offer.cartTitle || "Bundle order discount",
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
    });
  }

  return candidates;
}

function getDiscountPercentValue(
  discountRulesJson: string | null | undefined,
  quantity: number,
): string | null {
  return getBestProductDiscountPercentValue(discountRulesJson, quantity);
}

const parseSelectedIds = (selectedProductsJson?: string | null): string[] => {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
    
    // Handle BXGY format: { buyProducts: string[], getProducts: string[] }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const productIds = (parsed as { productIds?: unknown }).productIds;
      if (Array.isArray(productIds)) {
        return productIds
          .map((id) => String(id || "").trim())
          .filter(Boolean);
      }

      /** complete-bundle：{ bars: [{ products: [{ productId }] }] } */
      const bars = (parsed as { bars?: unknown }).bars;
      if (Array.isArray(bars) && bars.length) {
        const ids: string[] = [];
        for (const bar of bars) {
          if (!bar || typeof bar !== "object") continue;
          const products = (bar as { products?: unknown }).products;
          if (!Array.isArray(products)) continue;
          for (const p of products) {
            if (p && typeof p === "object") {
              const pid = (p as { productId?: unknown }).productId;
              if (typeof pid === "string" && pid.trim()) ids.push(pid.trim());
            }
          }
        }
        return [...new Set(ids)];
      }

      const buyProducts = (parsed as { buyProducts?: string[] }).buyProducts;
      const getProducts = (parsed as { getProducts?: string[] }).getProducts;
      const triggerProducts = (parsed as { triggerProducts?: string[] }).triggerProducts;
      const giftProducts = (parsed as { giftProducts?: string[] }).giftProducts;
      
      const allIds: string[] = [];
      if (Array.isArray(buyProducts)) {
        allIds.push(...buyProducts.filter(id => typeof id === "string"));
      }
      if (Array.isArray(getProducts)) {
        allIds.push(...getProducts.filter(id => typeof id === "string"));
      }
      if (Array.isArray(triggerProducts)) {
        allIds.push(...triggerProducts.filter(id => typeof id === "string"));
      }
      if (Array.isArray(giftProducts)) {
        allIds.push(...giftProducts.filter(id => typeof id === "string"));
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
    if (offer.offerType === 'bxgy') continue; // Skip BXGY offers

    if (offer.status === false) {
      log("offer_skip_disabled", { offerId: offer.id, name: offer.name });
      continue;
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
      if (nowMs === null) {
        log("offer_time_unavailable_skip_start_check", {
          offerId: offer.id,
          name: offer.name,
          startTime: offer.startTime,
        });
      } else if (Number.isFinite(startTimeMs) && nowMs < startTimeMs) {
        log("offer_skip_before_start", { offerId: offer.id, name: offer.name, startTime: offer.startTime });
        continue;
      }
    }

    if (offer.endTime) {
      const endTimeMs = Date.parse(offer.endTime);
      if (nowMs === null) {
        log("offer_time_unavailable_skip_end_check", {
          offerId: offer.id,
          name: offer.name,
          endTime: offer.endTime,
        });
      } else if (Number.isFinite(endTimeMs) && nowMs > endTimeMs) {
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
          const matchMarket = allowedMarkets.some(m => m === marketId || m.endsWith(`/${marketId}`));
          if (!matchMarket) {
            log("offer_skip_market_mismatch", { offerId: offer.id, name: offer.name, marketId, allowedMarkets });
            continue;
          }
        }
      } catch (e) {
        // ignore parse error
      }
    }

    // 兼容旧版开关：当 quantity bar 显式为 false 时，不参与普通 quantity-break 折扣计算
    if (
      offer.offerType !== "bxgy" &&
      !isCompleteBundleOfferType(offer.offerType) &&
      offer.offerSettingsJson
    ) {
      try {
        const settings = JSON.parse(offer.offerSettingsJson) as {
          quantity?: boolean;
          showQuantityBar?: boolean;
        };
        if (settings.quantity === false || settings.showQuantityBar === false) {
          log("offer_skip_quantity_bar_disabled", { offerId: offer.id, name: offer.name });
          continue;
        }
      } catch {
        // ignore parse error
      }
    }

    const selectedIds = parseSelectedIds(offer.selectedProductsJson);
    if (!selectedIds.length) {
      log("offer_match_all_products", { offerId: offer.id, name: offer.name });
      return offer;
    }

    // 配置中的 id 可能是纯数字，购物车行侧为 GID，需归一化后比较
    let hit = false;
    for (const sid of selectedIds) {
      if (productId && productIdsMatch(productId, sid)) {
        hit = true;
        break;
      }
      if (variantId && productIdsMatch(variantId, sid)) {
        hit = true;
        break;
      }
    }

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

/**
 * 校验是否允许生成本次折扣：购物车非空。
 */
const checkValid = (input: CartInput): boolean => {
  return input.cart.lines.length > 0;
};
