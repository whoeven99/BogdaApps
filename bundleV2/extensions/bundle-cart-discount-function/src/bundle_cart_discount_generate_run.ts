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

/** 便于在 Function 日志里排查 offers 注入：discount owner / shop 两处 metafield */
const CIWI_BUNDLE_OFFERS_LOG_MAX_CHARS = 12_000;

function logCiwiBundleOffersDiagnostics(
  discountOwnerMf: MetafieldSnapshot,
  shopOffersFnMf: MetafieldSnapshot,
  effectiveParsedPayload: OfferMetafieldPayload | null | undefined,
  extra: {
    resolvedSource: string;
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

  log("ciwi_bundle_offers_resolve", {
    resolvedSource: extra.resolvedSource,
    discountOwner: {
      namespace: "$app:ciwi_bundle",
      key: "offers",
      metafield: summarizeMetafield(discountOwnerMf),
    },
    shopOffersFn: {
      namespace: "ciwi_bundle",
      key: "ciwi-bundle-offers-fn",
      metafield: summarizeMetafield(shopOffersFnMf),
    },
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
  tierType?: "single" | "bxgy" | "simple";
};

type Offer = NonNullable<OfferMetafieldPayload["offers"]>[number];

type CouponAccess = {
  enabled: boolean;
  code: string;
};

/** complete-bundle：整包计价方式（与主题端 offerParsing 对齐） */
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
  type?: "single" | "quantity-break-same";
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
      : Array.isArray((parsed as { triggerProductIds?: unknown })?.triggerProductIds)
        ? ((parsed as { triggerProductIds?: unknown[] }).triggerProductIds || [])
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
 * complete-bundle 整体订单折扣：
 * - 主商品与所选 bundle items 一起组成整包，再按 bar.pricing 对整包 subtotal 计算折后价；
 * - 每个匹配 bar 产出一条 order candidate，由 Shopify 选择最大优惠；
 * - 商品 ID 仍按 product.id 比较（兼容 GID / 纯数字混存）。
 */
function calculateCompleteBundleDiscounts(
  cartLines: CartLineForBundle[],
  offers: Offer[],
  marketId: string | undefined,
  nowMs: number | null,
): OrderDiscountCandidate[] {
  const completeOffers = offers.filter((o) => isCompleteBundleOfferType(o.offerType));
  if (!completeOffers.length) {
    return [];
  }

  const allCartLineIds = cartLines.map((line) => line.id);
  const candidates: OrderDiscountCandidate[] = [];

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
      const anchorLine = cartLines.find((line) => {
        if (line.merchandise.__typename !== "ProductVariant") return false;
        const pid = line.merchandise.product?.id;
        return parsedConfig.triggerProductIds.some((triggerId) => productIdsMatch(pid, triggerId));
      });
      if (!anchorLine) continue;

      const bundleItemAllocations: Array<{
        lineId: string;
        unitBase: number;
      }> = [];
      const usedLineIds = new Set<string>([anchorLine.id]);
      for (const bundleItem of bar.products) {
        const matchedLine = cartLines.find((line) => {
          if (line.merchandise.__typename !== "ProductVariant") return false;
          if (usedLineIds.has(line.id)) return false;
          const pid = line.merchandise.product?.id;
          if (!productIdsMatch(pid, bundleItem.productId)) return false;
          if (
            bar.excludeTriggerProduct &&
            parsedConfig.triggerProductIds.some((triggerId) => productIdsMatch(pid, triggerId))
          ) {
            return false;
          }
          return true;
        });
        if (!matchedLine) continue;
        bundleItemAllocations.push({
          lineId: matchedLine.id,
          unitBase: parseMoneyAmount(matchedLine.cost?.amountPerQuantity?.amount),
        });
        usedLineIds.add(matchedLine.id);
      }

      if (bundleItemAllocations.length < bar.minQuantity) {
        log("complete_bundle_bar_no_match", {
          offerId: offer.id,
          barId: bar.id,
          reason: "insufficient_bundle_items",
          matchedBundleItems: bundleItemAllocations.length,
          minQuantity: bar.minQuantity,
        });
        continue;
      }

      const allocations = bundleItemAllocations.slice(0, bar.maxQuantity);
      const bundleSubtotal = [
        parseMoneyAmount(anchorLine.cost?.amountPerQuantity?.amount),
        ...allocations.map((row) => row.unitBase),
      ].reduce((sum, value) => sum + Math.max(0, value), 0);
      const { final, original } = applyCompleteBundleUnitPricing(
        bundleSubtotal,
        bar.pricing.mode,
        bar.pricing.value,
      );
      const totalDiscount = Math.max(0, original - final);
      if (totalDiscount <= 0) continue;

      const includedLineIds = new Set<string>([anchorLine.id, ...allocations.map((row) => row.lineId)]);
      const excludedCartLineIds = allCartLineIds.filter((id) => !includedLineIds.has(id));

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
          fixedAmount: {
            amount: totalDiscount.toFixed(2),
          },
        },
      });

      log("complete_bundle_matched", {
        offerId: offer.id,
        barId: bar.id,
        includedLineCount: includedLineIds.size,
        totalDiscount,
      });
    }
  }

  return candidates;
}

function offersJsonHasList(v: unknown): v is OfferMetafieldPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as OfferMetafieldPayload;
  return Array.isArray(o.offers) && o.offers.length > 0;
}

type ShopMetafieldsForLog = {
  bundleEnabledShop?: { jsonValue?: unknown; type?: string } | null;
  offersShop?: { jsonValue?: unknown; type?: string } | null;
};

/**
 * 读取活动配置：`discount` owner 上的 `$app:ciwi_bundle` / `offers`（与后台同步主路径）
 * + shop `ciwi-bundle-offers-fn` 兜底（checkout 可能对 shop JSON metafield 注入不稳定）。
 */
function resolveCartOffersPayload(input: CartInput): {
  payload: OfferMetafieldPayload | null | undefined;
  offersSource: string;
  shopAny: ShopMetafieldsForLog;
  discountOwnerOffersMetafield: MetafieldSnapshot;
} {
  const shopAny = input.shop as unknown as ShopMetafieldsForLog;
  const discountOwnerMf =
    input.discount.offersFromDiscountOwner as MetafieldSnapshot | null | undefined;
  const shopOffersFnNode = shopAny.offersShop;
  const jDisc = discountOwnerMf?.jsonValue as OfferMetafieldPayload | null | undefined;
  const jShop = shopOffersFnNode?.jsonValue as OfferMetafieldPayload | null | undefined;

  const summarizeJv = (
    namespace: string,
    key: string,
    mfNode: typeof discountOwnerMf,
    jv: typeof jDisc,
  ) => {
    const raw = jv as unknown;
    log("read_ciwi_offers_metafield", {
      namespace,
      key,
      metafieldNodePresent: mfNode != null,
      jsonValueKind:
        raw === undefined
          ? "undefined"
          : raw === null
            ? "null"
            : Array.isArray(raw)
              ? "array"
              : typeof raw,
      topLevelKeys:
        raw && typeof raw === "object" && !Array.isArray(raw)
          ? Object.keys(raw as Record<string, unknown>).slice(0, 30)
          : null,
      offersArrayLength: Array.isArray((jv as OfferMetafieldPayload | null)?.offers)
        ? ((jv as OfferMetafieldPayload).offers?.length ?? 0)
        : null,
    });
  };

  summarizeJv("$app:ciwi_bundle", "offers", discountOwnerMf, jDisc);
  summarizeJv("ciwi_bundle", "ciwi-bundle-offers-fn", shopOffersFnNode, jShop);

  if (offersJsonHasList(jDisc)) {
    return {
      payload: jDisc,
      offersSource: "discount_owner_app_ciwi_bundle_offers",
      shopAny,
      discountOwnerOffersMetafield: discountOwnerMf,
    };
  }

  if (offersJsonHasList(jShop)) {
    return {
      payload: jShop,
      offersSource: "shop_ciwi_bundle_offers_fn",
      shopAny,
      discountOwnerOffersMetafield: discountOwnerMf,
    };
  }

  const fallback = jDisc ?? jShop ?? null;
  const offersSource =
    fallback != null
      ? jDisc != null
        ? "discount_owner_empty_lists"
        : "shop_offers_empty_lists"
      : "no_offers_metafield";

  return {
    payload: fallback,
    offersSource,
    shopAny,
    discountOwnerOffersMetafield: discountOwnerMf,
  };
}

export function bundleCartDiscountGenerateRun(
  input: CartInput,
): CartLinesDiscountsGenerateRunResult {
  const {
    payload: resolvedPayload,
    offersSource: resolvedSource,
    shopAny,
    discountOwnerOffersMetafield,
  } = resolveCartOffersPayload(input);

  const offersPayload = resolvedPayload ?? null;
  const offersSource = resolvedSource;

  logCiwiBundleOffersDiagnostics(
    discountOwnerOffersMetafield,
    shopAny.offersShop as MetafieldSnapshot,
    offersPayload,
    {
      resolvedSource: offersSource ?? "",
    },
  );

  log("shop_metafields_snapshot", {
    bundleEnabledShop: summarizeMetafield(shopAny.bundleEnabledShop as MetafieldSnapshot),
    offersShop: summarizeMetafield(shopAny.offersShop as MetafieldSnapshot),
    discountOwnerOffersMetafield: summarizeMetafield(discountOwnerOffersMetafield),
    activeSource: offersSource,
  });

  log("run_start", {
    cartLineCount: input.cart.lines.length,
    discountClasses: input.discount.discountClasses,
    hasOffers: Boolean(offersPayload),
    offersSource,
  });

  if (!offersPayload) {
    log("early_exit", { reason: "no_offers_payload" });
    return { operations: [] };
  }
  const offers = offersPayload?.offers ?? [];
  const enteredCodes = new Set(
    [normalizeCouponCode(input.triggeringDiscountCode)].filter(Boolean),
  );
  const buyerTargetingContext = buildBuyerTargetingContext(input);
  const acceptedCouponCodes = new Set<string>();
  const acceptedCouponCodeByOfferId = new Map<string, string>();

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
  const localizationCountryCode = normalizeCountryCode(
    input.localization?.country?.isoCode,
  );
  const eligibleOffers = offers.filter((offer) => {
    if (!offerMatchesCustomerSegments(offer, buyerTargetingContext)) {
      log("offer_skip_customer_segment", {
        offerId: offer.id,
        name: offer.name,
      });
      return false;
    }
    if (!offerMatchesCustomerProfileFilters(offer, buyerTargetingContext)) {
      log("offer_skip_customer_profile_filter", {
        offerId: offer.id,
        name: offer.name,
      });
      return false;
    }
    if (!offerMatchesIpCountryCodes(offer, localizationCountryCode)) {
      log("offer_skip_ip_country_code", {
        offerId: offer.id,
        name: offer.name,
        localizationCountryCode,
      });
      return false;
    }
    const couponAccess = parseCouponAccess(offer.offerSettingsJson);
    if (!couponAccess.enabled) {
      return true;
    }
    const acceptedCode = resolveAcceptedCouponCode(offer, enteredCodes);
    if (!acceptedCode) {
      log("offer_skip_coupon_code_mismatch", {
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
  const orderCandidates: OrderDiscountCandidate[] = [];

  const marketId = input.localization?.market?.id;
  const nowMs = resolveNowMs();
  const bxgyOffers = eligibleOffers.filter(
    (o) =>
      (o.offerType === "bxgy" ||
        o.offerType === "quantity-breaks-different" ||
        (o.offerType === "quantity-breaks-same" &&
          hasUnifiedBxgyTier(o.discountRulesJson))) &&
      offerPassesScheduleAndMarket(o, marketId, nowMs),
  );
  const freeGiftOffers = eligibleOffers.filter(
    (o) => o.offerType === "free-gift" && offerPassesScheduleAndMarket(o, marketId, nowMs),
  );
  /** 普通数量阶梯：不含 BXGY 与 complete-bundle（后两者有独立分支） */
  const regularOffers = eligibleOffers.filter(
    (o) =>
      o.offerType !== "bxgy" &&
      o.offerType !== "quantity-breaks-different" &&
      o.offerType !== "free-gift" &&
      !isCompleteBundleOfferType(o.offerType),
  );
  log("offer_groups_resolved", {
    totalOffers: offers.length,
    eligibleOffers: eligibleOffers.length,
    bxgyCount: bxgyOffers.length,
    freeGiftCount: freeGiftOffers.length,
    completeBundleCount: offers.filter((o) => isCompleteBundleOfferType(o.offerType)).length,
    regularCount: regularOffers.length,
  });

  // ① 处理 BXGY（买 X 送 Y 等）：只负责生成候选，最终由 Shopify 按最大减免选择商品折扣。
  if (hasProductDiscountClass || hasOrderDiscountClass) {
    const bxgyDiscounts = calculateBxgyDiscount(input.cart.lines, bxgyOffers);
    if (hasProductDiscountClass && bxgyDiscounts.productCandidates.length > 0) {
      productCandidates.push(...bxgyDiscounts.productCandidates);
    }
    if (hasOrderDiscountClass && bxgyDiscounts.orderCandidates.length > 0) {
      orderCandidates.push(...bxgyDiscounts.orderCandidates);
    }
  }

  // ② free gift 作为 order reward 生成订单级 fixed-amount 候选。
  if (hasOrderDiscountClass) {
    const freeGiftCandidates = calculateFreeGiftDiscount(input.cart.lines, freeGiftOffers);
    if (freeGiftCandidates.length > 0) {
      orderCandidates.push(...freeGiftCandidates);
    }
  }

  // ③ 处理 complete-bundle：主商品 + bundle items 一起走整包订单折扣，可与商品折扣候选并存。
  if (hasOrderDiscountClass) {
    log("complete_bundle_evaluation_start", {
      marketId,
      cartLineCount: input.cart.lines.length,
    });
    const completeBundleCandidates = calculateCompleteBundleDiscounts(
      input.cart.lines,
      eligibleOffers,
      marketId,
      nowMs,
    );
    if (completeBundleCandidates.length > 0) {
      orderCandidates.push(...completeBundleCandidates);
      log("complete_bundle_evaluation_success", {
        candidateCount: completeBundleCandidates.length,
      });
    } else {
      log("complete_bundle_evaluation_no_match", {
        reason: "no_complete_bundle_candidates",
      });
    }
  }

  // ④ 按行匹配普通 bundle 的 discountRulesJson 数量阶梯，与 BXGY 一起参与商品折扣最大减免竞争。
  if (hasProductDiscountClass) {
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
        associatedDiscountCode: acceptedCouponCodeByOfferId.get(String(suitOffer.id || ""))
          ? {
              code: acceptedCouponCodeByOfferId.get(String(suitOffer.id || ""))!,
            }
          : undefined,
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
      ...buildOrderDiscountCandidates(
        input,
        regularOffers,
        marketId,
        nowMs,
        acceptedCouponCodeByOfferId,
      ),
    );
  }

  if (!productCandidates.length && !orderCandidates.length && acceptedCouponCodes.size === 0) {
    log("early_exit", {
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
        candidates: productCandidates,
        selectionStrategy: ProductDiscountSelectionStrategy.Maximum,
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
  giftQuantity?: number;
  logicType: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
  rewardProductIds: string[];
};

const RECOGNIZED_CUSTOMER_SEGMENTS = new Set([
  "all",
  "new_customers",
  "returning_customers",
  "vip",
  "high_aov",
]);

const RECOGNIZED_CUSTOMER_PROFILE_FILTERS = new Set([
  "subscription_active",
  "bundle_buyer",
  "repeat_buyer",
  "high_intent",
]);

type BuyerTargetingContext = {
  isAuthenticated: boolean;
  numberOfOrders: number;
  amountSpent: number;
  tags: Set<string>;
  hasSubscriptionLine: boolean;
};

function normalizeCouponCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function normalizeCustomerSegmentHandle(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

function parseCustomerSegments(offerSettingsJson?: string | null): string[] {
  if (!offerSettingsJson) return ["all"];
  try {
    const parsed = JSON.parse(offerSettingsJson) as {
      customerSegments?: unknown;
    };
    const rawValue = parsed.customerSegments;
    if (typeof rawValue !== "string" || !rawValue.trim()) {
      return ["all"];
    }
    const normalized = rawValue
      .split(",")
      .map((segment) => normalizeCustomerSegmentHandle(segment))
      .filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : ["all"];
  } catch {
    return ["all"];
  }
}

function parseCustomerProfileFilters(offerSettingsJson?: string | null): string[] {
  if (!offerSettingsJson) return [];
  try {
    const parsed = JSON.parse(offerSettingsJson) as {
      customerProfileFilters?: unknown;
    };
    const rawValue = parsed.customerProfileFilters;
    if (typeof rawValue !== "string" || !rawValue.trim()) {
      return [];
    }
    const normalized = rawValue
      .split(",")
      .map((value) => normalizeCustomerSegmentHandle(value))
      .filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : [];
  } catch {
    return [];
  }
}

function normalizeCountryCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function parseIpCountryCodes(offerSettingsJson?: string | null): string[] {
  if (!offerSettingsJson) return [];
  try {
    const parsed = JSON.parse(offerSettingsJson) as {
      ipCountryCodes?: unknown;
    };
    const rawValue = parsed.ipCountryCodes;
    if (typeof rawValue !== "string" || !rawValue.trim()) {
      return [];
    }
    const normalized = rawValue
      .split(",")
      .map((value) => normalizeCountryCode(value))
      .filter(Boolean);
    return normalized.length ? Array.from(new Set(normalized)) : [];
  } catch {
    return [];
  }
}

function buildBuyerTargetingContext(input: CartInput): BuyerTargetingContext {
  const buyerIdentity = input.cart.buyerIdentity;
  const customer = buyerIdentity?.customer;
  const tags = new Set(
    (customer?.hasTags || [])
      .filter((entry) => entry.hasTag)
      .map((entry) => normalizeCustomerSegmentHandle(entry.tag)),
  );

  return {
    isAuthenticated: buyerIdentity?.isAuthenticated === true,
    numberOfOrders: Math.max(0, Math.trunc(Number(customer?.numberOfOrders) || 0)),
    amountSpent: Math.max(
      0,
      parseMoneyAmount(customer?.amountSpent?.amount),
    ),
    tags,
    hasSubscriptionLine: input.cart.lines.some((line) => Boolean(line.sellingPlanAllocation?.sellingPlan?.id)),
  };
}

function offerMatchesCustomerSegments(
  offer: Offer,
  buyerContext: BuyerTargetingContext,
): boolean {
  const configuredSegments = parseCustomerSegments(offer.offerSettingsJson);
  if (
    configuredSegments.length === 0 ||
    configuredSegments.includes("all")
  ) {
    return true;
  }

  const recognizedSegments = configuredSegments.filter((segment) =>
    RECOGNIZED_CUSTOMER_SEGMENTS.has(segment),
  );
  if (!recognizedSegments.length) {
    log("offer_customer_segment_skip_runtime_restriction", {
      offerId: offer.id,
      segments: configuredSegments,
    });
    return true;
  }

  return recognizedSegments.some((segment) => {
    switch (segment) {
      case "new_customers":
        return !buyerContext.isAuthenticated || buyerContext.numberOfOrders === 0;
      case "returning_customers":
        return buyerContext.isAuthenticated && buyerContext.numberOfOrders > 0;
      case "vip":
        return buyerContext.tags.has("vip");
      case "high_aov":
        return (
          buyerContext.tags.has("high_aov") ||
          buyerContext.amountSpent >= 500
        );
      default:
        return false;
    }
  });
}

function offerMatchesCustomerProfileFilters(
  offer: Offer,
  buyerContext: BuyerTargetingContext,
): boolean {
  const configuredFilters = parseCustomerProfileFilters(offer.offerSettingsJson);
  if (!configuredFilters.length) {
    return true;
  }

  const recognizedFilters = configuredFilters.filter((filter) =>
    RECOGNIZED_CUSTOMER_PROFILE_FILTERS.has(filter),
  );
  if (!recognizedFilters.length) {
    log("offer_customer_profile_skip_runtime_restriction", {
      offerId: offer.id,
      filters: configuredFilters,
    });
    return true;
  }

  return recognizedFilters.every((filter) => {
    switch (filter) {
      case "subscription_active":
        return (
          buyerContext.hasSubscriptionLine ||
          buyerContext.tags.has("subscription_active")
        );
      case "bundle_buyer":
        return buyerContext.tags.has("bundle_buyer");
      case "repeat_buyer":
        return (
          buyerContext.tags.has("repeat_buyer") ||
          buyerContext.numberOfOrders > 1
        );
      case "high_intent":
        return buyerContext.tags.has("high_intent");
      default:
        return true;
    }
  });
}

function offerMatchesIpCountryCodes(
  offer: Offer,
  countryCode: string,
): boolean {
  const configuredCodes = parseIpCountryCodes(offer.offerSettingsJson);
  if (!configuredCodes.length) {
    return true;
  }
  if (!countryCode) {
    log("offer_ip_country_runtime_unavailable", {
      offerId: offer.id,
      configuredCodes,
    });
    return false;
  }
  return configuredCodes.includes(countryCode);
}

function parseCouponAccess(offerSettingsJson?: string | null): CouponAccess {
  if (!offerSettingsJson) {
    return { enabled: false, code: "" };
  }
  try {
    const parsed = JSON.parse(offerSettingsJson) as {
      couponEnabled?: unknown;
      couponCode?: unknown;
    };
    return {
      enabled: parsed.couponEnabled === true,
      code: normalizeCouponCode(parsed.couponCode),
    };
  } catch {
    return { enabled: false, code: "" };
  }
}

function resolveAcceptedCouponCode(
  offer: Offer,
  enteredCodes: Set<string>,
): string | null {
  const couponAccess = parseCouponAccess(offer.offerSettingsJson);
  if (!couponAccess.enabled) return null;
  return couponAccess.code && enteredCodes.has(couponAccess.code)
    ? couponAccess.code
    : null;
}

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
      if ((item as { tierType?: unknown }).tierType === "single") continue;
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
      const rewardType =
        (item as { rewardType?: unknown }).rewardType === "gift_product" ||
        (item as { rewardType?: unknown }).rewardType === "free_shipping"
          ? ((item as { rewardType: "gift_product" | "free_shipping" }).rewardType)
          : "percentage_off";
      tiers.push({
        count: logicType === "bxgy" ? normalizedBuyQuantity || Math.trunc(count) : Math.trunc(count),
        discountPercent: logicType === "bxgy" ? 100 : discountPercent,
        discountClass:
          rewardType === "gift_product"
            ? "order"
            : rewardType === "free_shipping"
              ? "shipping"
              : (item as { discountClass?: unknown }).discountClass === "order" ||
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
        rewardType,
        giftQuantity: Number.isFinite(
          Number((item as { giftQuantity?: unknown }).giftQuantity),
        )
          ? Math.max(1, Math.trunc(Number((item as { giftQuantity?: unknown }).giftQuantity)))
          : undefined,
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
      const tierType = (item as { tierType?: unknown }).tierType;
      if (tierType === "single") continue;

      const count = Number((item as { count?: unknown }).count);
      const buyQuantity = Number(
        (item as { buyQuantity?: unknown; count?: unknown }).buyQuantity ??
          (item as { count?: unknown }).count,
      );
      const getQuantity = Number((item as { getQuantity?: unknown }).getQuantity);
      const discountPercent = Number((item as { discountPercent?: unknown }).discountPercent);
      const maxUsesPerOrder = Number((item as { maxUsesPerOrder?: unknown }).maxUsesPerOrder) || 1;
      const buyProductIds = (item as { buyProductIds?: unknown }).buyProductIds;
      const getProductIds = (item as { getProductIds?: unknown }).getProductIds;

      const normalizedTierType = tierType === "simple" ? "simple" : "bxgy";
      if (!Number.isFinite(buyQuantity) || buyQuantity < 1) continue;
      if (!Number.isFinite(discountPercent)) continue;
      if (!Array.isArray(buyProductIds) || !buyProductIds.length) continue;
      const normalizedBuyProductIds = buyProductIds.filter(id => typeof id === "string") as string[];
      if (!normalizedBuyProductIds.length) continue;
      if (normalizedTierType === "bxgy" && (!Number.isFinite(getQuantity) || getQuantity < 1)) {
        continue;
      }
      const normalizedGetProductIds =
        normalizedTierType === "bxgy" &&
        Array.isArray(getProductIds) &&
        getProductIds.length > 0
          ? (getProductIds.filter(id => typeof id === "string") as string[])
          : normalizedTierType === "bxgy"
            ? normalizedBuyProductIds
            : [];

      out.push({
        count: Math.max(1, Math.trunc(buyQuantity)),
        buyQuantity: Math.max(1, Math.trunc(buyQuantity)),
        getQuantity: normalizedTierType === "bxgy" ? Math.trunc(getQuantity) : 0,
        buyProductIds: normalizedBuyProductIds,
        getProductIds: normalizedGetProductIds,
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
        maxUsesPerOrder: Math.max(1, Math.trunc(maxUsesPerOrder)),
        // Legacy dedicated BXGY records may not persist tierType; default them to BXGY.
        tierType: normalizedTierType,
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

function resolveSameProductBxgyQuantities(rule: Pick<BxgyDiscountRule, "buyQuantity" | "getQuantity">): {
  buyQuantity: number;
  bundleQuantity: number;
  freeQuantity: number;
  semantics: "free_items" | "total_items";
} {
  const buyQuantity = Math.max(1, Math.trunc(Number(rule.buyQuantity) || 1));
  const getQuantity = Math.max(1, Math.trunc(Number(rule.getQuantity) || 1));

  // Some BXGY records use `getQuantity` as the final bundle size (pay X for Y total),
  // while legacy records store it as free-item quantity. Treat larger-than-buy values as
  // total-size semantics so "buy 3 get 5" charges 3 items across 5 total items.
  if (getQuantity > buyQuantity) {
    return {
      buyQuantity,
      bundleQuantity: getQuantity,
      freeQuantity: Math.max(1, getQuantity - buyQuantity),
      semantics: "total_items",
    };
  }

  return {
    buyQuantity,
    bundleQuantity: buyQuantity + getQuantity,
    freeQuantity: getQuantity,
    semantics: "free_items",
  };
}

type BxgyDiscountComputation = {
  productCandidates: ProductDiscountCandidate[];
  orderCandidates: OrderDiscountCandidate[];
};

/**
 * 计算 BXGY 折扣 — 支持多层级 (tier)，按 buyQuantity 字段选择最优匹配层级
 */
function calculateBxgyDiscount(
  cartLines: any[],
  offers: Offer[],
): BxgyDiscountComputation {
  const allProductCandidates: ProductDiscountCandidate[] = [];
  const allOrderCandidates: OrderDiscountCandidate[] = [];
  const allCartLineIds = cartLines.map((line) => line.id);
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
      const candidates: ProductDiscountCandidate[] = [];
      const discountedLineIds = new Set<string>();
      let totalOrderDiscountAmount = 0;
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
        const selected = pickBestSameProductRuleForQuantity(totalQuantity, bxgyRules);
        if (!selected) {
          log("bxgy_same_product_no_matching_rule", { offerId: offer.id });
          continue;
        }

        log("bxgy_same_product_rule_eval", {
          offerId: offer.id,
          selectedProductId,
          ruleBuyQuantity: selected.rule.buyQuantity,
          ruleGetQuantity: selected.rule.getQuantity,
          totalQuantity,
          bundleQuantity: selected.resolved.bundleQuantity,
          promotionTimes: selected.promotionTimes,
          maxPromotionTimes: selected.maxPromotionTimes,
        });

        log("bxgy_same_product_line_eval", {
          offerId: offer.id,
          selectedProductId,
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
          if (selected.resolved.semantics === "total_items") {
            discountedLineIds.add(entry.line.id);
            totalOrderDiscountAmount += entry.unitPrice * discountQuantity;
          } else {
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
          }
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
          selectedProductId,
          buyQuantity: selected.resolved.buyQuantity,
          configuredGetQuantity: selected.rule.getQuantity,
          bundleQuantity: selected.resolved.bundleQuantity,
          freeQuantity: selected.resolved.freeQuantity,
          semantics: selected.resolved.semantics,
          promotionTimes: selected.maxPromotionTimes,
        });
      }

      if (totalOrderDiscountAmount > 0) {
        const excludedCartLineIds = allCartLineIds.filter((id) => !discountedLineIds.has(id));
        allOrderCandidates.push({
          message: offer.cartTitle || "Buy X Get Y",
          targets: [
            {
              orderSubtotal: {
                excludedCartLineIds,
              },
            },
          ],
          value: {
            fixedAmount: {
              amount: totalOrderDiscountAmount.toFixed(2),
            },
          },
        });
        log("bxgy_same_product_order_candidate_added", {
          offerId: offer.id,
          discountedLineCount: discountedLineIds.size,
          totalOrderDiscountAmount: Number(totalOrderDiscountAmount.toFixed(2)),
        });
      }

      allProductCandidates.push(...candidates);
      continue;
    }

    const dedicatedBxgyRules = parseBxgyDiscountRules(offer.discountRulesJson);
    const bxgyRules =
      dedicatedBxgyRules.length > 0
        ? dedicatedBxgyRules
        : buildBxgyRulesFromUnifiedDiscountRules(offer);
    if (!bxgyRules.length) continue;

    if (offer.offerType !== "quantity-breaks-different") {
      const candidates: ProductDiscountCandidate[] = [];
      const discountedLineIds = new Set<string>();
      let totalOrderDiscountAmount = 0;
      const productPool = Array.from(
        new Set(
          bxgyRules.flatMap((rule) =>
            Array.isArray(rule.buyProductIds) ? rule.buyProductIds : [],
          ),
        ),
      );
      for (const selectedProductId of productPool) {
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
        const applicableRules = bxgyRules.filter((rule) =>
          (rule.buyProductIds ?? []).some((id) => productIdsMatch(id, selectedProductId)),
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
          if (selected.resolved.semantics === "total_items") {
            discountedLineIds.add(entry.line.id);
            totalOrderDiscountAmount += entry.unitPrice * discountQuantity;
          } else {
            candidates.push({
              message: offer.cartTitle || "Buy X Get Y",
              targets: [{ cartLine: { id: entry.line.id, quantity: discountQuantity } }],
              value: {
                percentage: {
                  value: "100.0",
                },
              },
            });
          }
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

      if (totalOrderDiscountAmount > 0) {
        const excludedCartLineIds = allCartLineIds.filter((id) => !discountedLineIds.has(id));
        allOrderCandidates.push({
          message: offer.cartTitle || "Buy X Get Y",
          targets: [
            {
              orderSubtotal: {
                excludedCartLineIds,
              },
            },
          ],
          value: {
            fixedAmount: {
              amount: totalOrderDiscountAmount.toFixed(2),
            },
          },
        });
        log("bxgy_shared_same_product_order_candidate_added", {
          offerId: offer.id,
          discountedLineCount: discountedLineIds.size,
          totalOrderDiscountAmount: Number(totalOrderDiscountAmount.toFixed(2)),
        });
      }

      allProductCandidates.push(...candidates);
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

      allProductCandidates.push(...candidates);
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

    allProductCandidates.push(...candidates);
  }

  return {
    productCandidates: allProductCandidates,
    orderCandidates: allOrderCandidates,
  };
}

function calculateFreeGiftDiscount(
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
      message: offer.cartTitle || "Free gift",
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

function buildOrderDiscountCandidates(
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
      associatedDiscountCode: acceptedCouponCodeByOfferId.get(String(offer.id || ""))
        ? {
            code: acceptedCouponCodeByOfferId.get(String(offer.id || ""))!,
          }
        : undefined,
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
