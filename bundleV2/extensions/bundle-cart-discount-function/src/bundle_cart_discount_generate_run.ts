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
const ENABLE_FUNCTION_LOGS = false;

const DISCOUNT_PERCENTAGE = "10.0";
const DEFAULT_DISCOUNT_PERCENTAGE = DISCOUNT_PERCENTAGE;

function log(step: string, detail?: unknown): void {
  if (!ENABLE_FUNCTION_LOGS) return;
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

/** 压缩格式(v2)的单 offer：短键 + 内联对象（见后台 offerPayload COMPACT_OFFERS_FORMAT_VERSION）。 */
type CompactOfferWire = {
  i?: string;
  c?: string;
  t?: string;
  x?: boolean;
  b?: string;
  e?: string;
  s?: unknown;
  d?: unknown;
  o?: unknown;
};

type OfferMetafieldPayload = {
  v?: number;
  updatedAt?: string;
  offers?: Array<Offer | CompactOfferWire>;
};

type MetafieldSnapshot = {
  jsonValue?: unknown;
  value?: unknown;
  type?: string;
} | null | undefined;

function logCiwiBundleOffersDiagnostics(
  discountOwnerMf: MetafieldSnapshot,
  effectiveParsedPayload: OfferMetafieldPayload | null | undefined,
  extra: {
    resolvedSource: string;
  },
): void {
  log("ciwi_bundle_offers_resolve", {
    resolvedSource: extra.resolvedSource,
    discountOwner: {
      namespace: "$app:ciwi_bundle",
      key: "offers",
      metafield: summarizeMetafield(discountOwnerMf),
    },
    parsedOffersCount: Array.isArray(effectiveParsedPayload?.offers)
      ? effectiveParsedPayload!.offers!.length
      : null,
    parsedUpdatedAt: effectiveParsedPayload?.updatedAt ?? null,
    parsedOfferIds: Array.isArray(effectiveParsedPayload?.offers)
      ? effectiveParsedPayload!.offers!
          .map((offer) => {
            const wire = offer as { id?: string; i?: string };
            return String(wire?.id || wire?.i || "").trim();
          })
          .filter(Boolean)
          .slice(0, 10)
      : [],
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

/** 运行期使用的 offer 形状（旧格式直接命中；压缩格式经 expandCompactOffer 还原为此形状）。 */
type Offer = {
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
};

/** 内联 JSON 字段还原成字符串：已是字符串则原样返回，对象则 stringify，供下游既有解析逻辑消费。 */
function jsonFieldToString(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

/** 把压缩(v2)或旧格式的单 offer 统一还原为运行期 Offer 形状。 */
export function expandCompactOffer(raw: Offer | CompactOfferWire | null | undefined): Offer {
  if (!raw || typeof raw !== "object") return {} as Offer;
  const isCompact =
    !("offerType" in raw) &&
    !("selectedProductsJson" in raw) &&
    ("t" in raw || "i" in raw || "s" in raw || "d" in raw || "o" in raw);
  if (!isCompact) return raw as Offer;
  const compact = raw as CompactOfferWire;
  return {
    id: compact.i,
    cartTitle: compact.c ?? "",
    offerType: compact.t,
    status: compact.x,
    startTime: compact.b ?? undefined,
    endTime: compact.e ?? undefined,
    selectedProductsJson: jsonFieldToString(compact.s),
    discountRulesJson: jsonFieldToString(compact.d),
    offerSettingsJson: jsonFieldToString(compact.o),
  };
}

type IndexedCartLine = {
  line: CartInput["cart"]["lines"][number];
  unitPrice: number;
  quantity: number;
  productLookupKey: string;
  variantLookupKey: string;
};

type CouponAccess = {
  enabled: boolean;
  code: string;
};

type ParsedOfferSettings = {
  markets: string;
  customerSegments: string[];
  customerProfileFilters: string[];
  ipCountryCodes: string[];
  couponAccess: CouponAccess;
  quantityEnabled: boolean;
};

type CompiledOfferRuntime = {
  offer: Offer;
  settings: ParsedOfferSettings;
  selectedIds: string[];
  standardRules: DiscountTier[];
  bxgyRules: BxgyDiscountRule[];
  hasUnifiedBxgyTier: boolean;
};

/** complete-bundle：整包计价方式（与主题端 offerParsing 对齐） */
type CompleteBundlePricingMode =
  | "full_price"
  | "percentage_off"
  | "amount_off"
  | "fixed_price";

type CompleteBundleProductRow = {
  productId: string;
  selectedVariantId?: string;
  selectionMode?: "product" | "variant";
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
type CompleteBundleAllocation = {
  lineId: string;
  unitBase: number;
  quantity: number;
};

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

function buildIndexedCartLines(
  cartLines: CartInput["cart"]["lines"],
): {
  entries: IndexedCartLine[];
  byLookupKey: Map<string, IndexedCartLine[]>;
  lookupKeys: Set<string>;
  totalQuantity: number;
} {
  const byLookupKey = new Map<string, IndexedCartLine[]>();
  const lookupKeys = new Set<string>();
  const entries: IndexedCartLine[] = [];
  let totalQuantity = 0;

  for (const line of cartLines) {
    const quantity = Math.max(0, Number(line.quantity) || 0);
    const productLookupKey =
      line.merchandise?.__typename === "ProductVariant"
        ? buildOfferLookupKey(line.merchandise?.product?.id)
        : "";
    const variantLookupKey =
      line.merchandise?.__typename === "ProductVariant"
        ? buildOfferLookupKey(line.merchandise?.id)
        : "";
    const entry: IndexedCartLine = {
      line,
      unitPrice: parseMoneyAmount(line.cost?.amountPerQuantity?.amount),
      quantity,
      productLookupKey,
      variantLookupKey,
    };
    entries.push(entry);
    totalQuantity += quantity;

    for (const lookupKey of [productLookupKey, variantLookupKey]) {
      if (!lookupKey) continue;
      lookupKeys.add(lookupKey);
      const bucket = byLookupKey.get(lookupKey);
      if (bucket) {
        bucket.push(entry);
      } else {
        byLookupKey.set(lookupKey, [entry]);
      }
    }
  }

  return {
    entries,
    byLookupKey,
    lookupKeys,
    totalQuantity,
  };
}

function getIndexedCartEntriesForConfiguredIds(
  cartIndex: ReturnType<typeof buildIndexedCartLines>,
  configuredIds: string[],
): IndexedCartLine[] {
  if (!configuredIds.length) return [];
  const matched: IndexedCartLine[] = [];
  const seenLineIds = new Set<string>();

  for (const configuredId of configuredIds) {
    const lookupKey = buildOfferLookupKey(configuredId);
    if (!lookupKey) continue;
    for (const entry of cartIndex.byLookupKey.get(lookupKey) ?? []) {
      const lineId = String(entry.line.id || "");
      if (!lineId || seenLineIds.has(lineId)) continue;
      seenLineIds.add(lineId);
      matched.push(entry);
    }
  }

  return matched;
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

/** 与 findOffer 中相同的档期 / 市场过滤（供 complete-bundle 复用） */
function offerPassesScheduleAndMarket(
  offer: Offer,
  marketId: string | undefined,
  nowMs: number | null,
  parsedSettings?: ParsedOfferSettings,
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

  const offerMarkets = parsedSettings?.markets;
  if (marketId && (offerMarkets || offer.offerSettingsJson)) {
    try {
      const resolvedMarkets =
        offerMarkets ??
        (JSON.parse(offer.offerSettingsJson || "{}") as { markets?: string }).markets;
      if (
        typeof resolvedMarkets === "string" &&
        resolvedMarkets !== "all" &&
        resolvedMarkets.trim() !== ""
      ) {
        const allowedMarkets = resolvedMarkets.split(",").map((m) => m.trim());
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
 * complete-bundle 整包计价：
 * - 语义仍然是"整包总价"，但执行层改为 product discount；
 * - 每个匹配 bar 产出一条多 target 的 product candidate，value 是整包总优惠；
 * - target 精确到命中的 cart line + quantity，避免 orderSubtotal 只能按整条 line 计价的问题。
 */
function calculateCompleteBundleProductDiscounts(
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
        message: offer.cartTitle || "Bundle order discount",
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
  const offers: Array<Offer | CompactOfferWire> = [];
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
  return { v: version, updatedAt, offers };
}

/**
 * 读取活动配置：合并 automatic discount owner 上 `$app:ciwi_bundle` 的所有分片
 * （offers + offers-1）。shop 级全量 offers 仅供后台/主题使用，不注入 function。
 */
function resolveCartOffersPayload(input: CartInput): {
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

  log("read_ciwi_offers_metafield", {
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

  log("shop_metafields_snapshot", {
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
  const compiledOffers = offers.map((offer) => compileOfferRuntime(expandCompactOffer(offer)));
  const enteredCodes = new Set(
    [normalizeCouponCode(input.triggeringDiscountCode)].filter(Boolean),
  );
  const buyerTargetingContext = buildBuyerTargetingContext(input);
  const acceptedCouponCodes = new Set<string>();
  const acceptedCouponCodeByOfferId = new Map<string, string>();

  log("metafield_offers", {
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
  const eligibleOffers = compiledOffers.filter((compiledOffer) => {
    const { offer, settings } = compiledOffer;
    if (!offerMatchesCustomerSegments(offer, buyerTargetingContext, settings)) {
      log("offer_skip_customer_segment", {
        offerId: offer.id,
        name: offer.name,
      });
      return false;
    }
    if (!offerMatchesCustomerProfileFilters(offer, buyerTargetingContext, settings)) {
      log("offer_skip_customer_profile_filter", {
        offerId: offer.id,
        name: offer.name,
      });
      return false;
    }
    if (!offerMatchesIpCountryCodes(offer, localizationCountryCode, settings)) {
      log("offer_skip_ip_country_code", {
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
    log("bxgy_eval_skipped", {
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
  log("offer_groups_resolved", {
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
    log("complete_bundle_evaluation_start", {
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
      log("complete_bundle_evaluation_success", {
        candidateCount: completeBundleCandidates.length,
      });
    } else {
      log("complete_bundle_evaluation_no_match", {
        reason: "no_complete_bundle_candidates",
      });
    }
  }

  // ② 按行匹配普通 bundle 的 discountRulesJson 数量阶梯。
  // 数量阶梯按购物车实际购买的**全量**生成候选（不再扣除 BXGY/complete-bundle 预占）。
  // 阶梯档位也按全量数量评估——客户买够了就有资格。最终在哪些单位上落地、是否要
  // 让位给（或挤掉）其他产品折扣，全部交由 resolveExclusiveProductCandidates 按
  // 最大实际减免仲裁，避免硬编码"BXGY/bundle 优先于数量阶梯"的模块顺序。
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
      const totalQuantity = line.quantity;
      const productId = line.merchandise.product?.id;
      const variantId = line.merchandise.id;
      const marketId = input.localization?.market?.id;

      log("line_evaluate", {
        cartLineId: lineId,
        totalQuantity,
        productId,
        variantId,
        marketId,
      });

      if (!lineId || !totalQuantity) {
        log("line_skip", { cartLineId: lineId, reason: "missing_line_id_or_qty" });
        continue;
      }

      const matchingOffers = findOffers(productId, variantId, regularOfferIndex);
      if (!matchingOffers.length) {
        log("line_no_matching_offer", {
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
        log("line_skip", {
          cartLineId: lineId,
          reason: "no_discount_percent_after_rules",
          matchedOfferIds: matchingOfferIds,
        });
        continue;
      }

      log("line_matched_offer", {
        cartLineId: lineId,
        matchedOfferIds: matchingOfferIds,
        winningOfferId: bestMatch.compiledOffer.offer.id,
        winningOfferName: bestMatch.compiledOffer.offer.name,
        winningDiscountPercent: bestMatch.discountPercentValue,
      });

      const discountPercentValue = bestMatch.discountPercentValue;
      log("line_discount_percent", {
        cartLineId: lineId,
        discountPercentValue,
        totalQuantity,
      });

      if (!discountPercentValue) {
        log("line_skip", {
          cartLineId: lineId,
          reason: "no_discount_percent_after_rules",
        });
        continue;
      }

      const candidate: ProductDiscountCandidate = {
        message: bestMatch.compiledOffer.offer.cartTitle || "Bundle Discount",
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
      log("line_candidate_added", {
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

  log("run_success", {
    candidateCount: resolvedProductCandidates.length,
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
  parsedSettings?: ParsedOfferSettings,
): boolean {
  const configuredSegments =
    parsedSettings?.customerSegments ?? parseCustomerSegments(offer.offerSettingsJson);
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
  parsedSettings?: ParsedOfferSettings,
): boolean {
  const configuredFilters =
    parsedSettings?.customerProfileFilters ??
    parseCustomerProfileFilters(offer.offerSettingsJson);
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
  parsedSettings?: ParsedOfferSettings,
): boolean {
  const configuredCodes =
    parsedSettings?.ipCountryCodes ?? parseIpCountryCodes(offer.offerSettingsJson);
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
  parsedSettings?: ParsedOfferSettings,
): string | null {
  const couponAccess = parsedSettings?.couponAccess ?? parseCouponAccess(offer.offerSettingsJson);
  if (!couponAccess.enabled) return null;
  return couponAccess.code && enteredCodes.has(couponAccess.code)
    ? couponAccess.code
    : null;
}

function compileOfferSettings(offerSettingsJson?: string | null): ParsedOfferSettings {
  if (!offerSettingsJson) {
    return {
      markets: "all",
      customerSegments: ["all"],
      customerProfileFilters: [],
      ipCountryCodes: [],
      couponAccess: { enabled: false, code: "" },
      quantityEnabled: true,
    };
  }

  try {
    const parsed = JSON.parse(offerSettingsJson) as {
      markets?: unknown;
      customerSegments?: unknown;
      customerProfileFilters?: unknown;
      ipCountryCodes?: unknown;
      couponEnabled?: unknown;
      couponCode?: unknown;
      quantity?: unknown;
      showQuantityBar?: unknown;
    };

    const customerSegments =
      typeof parsed.customerSegments === "string" && parsed.customerSegments.trim()
        ? Array.from(
            new Set(
              parsed.customerSegments
                .split(",")
                .map((segment) => normalizeCustomerSegmentHandle(segment))
                .filter(Boolean),
            ),
          )
        : ["all"];

    const customerProfileFilters =
      typeof parsed.customerProfileFilters === "string" && parsed.customerProfileFilters.trim()
        ? Array.from(
            new Set(
              parsed.customerProfileFilters
                .split(",")
                .map((value) => normalizeCustomerSegmentHandle(value))
                .filter(Boolean),
            ),
          )
        : [];

    const ipCountryCodes =
      typeof parsed.ipCountryCodes === "string" && parsed.ipCountryCodes.trim()
        ? Array.from(
            new Set(
              parsed.ipCountryCodes
                .split(",")
                .map((value) => normalizeCountryCode(value))
                .filter(Boolean),
            ),
          )
        : [];

    return {
      markets:
        typeof parsed.markets === "string" && parsed.markets.trim()
          ? parsed.markets.trim()
          : "all",
      customerSegments: customerSegments.length ? customerSegments : ["all"],
      customerProfileFilters,
      ipCountryCodes,
      couponAccess: {
        enabled: parsed.couponEnabled === true,
        code: normalizeCouponCode(parsed.couponCode),
      },
      quantityEnabled: !(parsed.quantity === false || parsed.showQuantityBar === false),
    };
  } catch {
    return {
      markets: "all",
      customerSegments: ["all"],
      customerProfileFilters: [],
      ipCountryCodes: [],
      couponAccess: { enabled: false, code: "" },
      quantityEnabled: true,
    };
  }
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

function hasUnifiedBxgyTier(
  discountRulesJson?: string | null,
  parsedRules?: DiscountTier[],
): boolean {
  return (parsedRules ?? parseDiscountRulesJson(discountRulesJson)).some(
    (tier) =>
      tier.logicType === "bxgy" &&
      tier.discountClass === "product" &&
      tier.rewardType === "percentage_off" &&
      tier.conditionType === "item_quantity",
  );
}

function buildBxgyRulesFromUnifiedDiscountRules(
  offer: Offer,
  selectedIds?: string[],
  parsedRules?: DiscountTier[],
): BxgyDiscountRule[] {
  const productPool = selectedIds ?? parseSelectedIds(offer.selectedProductsJson);
  if (!productPool.length) return [];

  const tiers = (parsedRules ?? parseDiscountRulesJson(offer.discountRulesJson)).filter(
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

function compileOfferRuntime(offer: Offer): CompiledOfferRuntime {
  const settings = compileOfferSettings(offer.offerSettingsJson);
  const selectedIds = parseSelectedIds(offer.selectedProductsJson);
  const standardRules = parseDiscountRulesJson(offer.discountRulesJson);
  const dedicatedBxgyRules = parseBxgyDiscountRules(offer.discountRulesJson);
  const hasUnifiedBxgy = hasUnifiedBxgyTier(offer.discountRulesJson, standardRules);
  const bxgyRules =
    dedicatedBxgyRules.length > 0
      ? dedicatedBxgyRules
      : hasUnifiedBxgy
        ? buildBxgyRulesFromUnifiedDiscountRules(offer, selectedIds, standardRules)
        : [];

  return {
    offer,
    settings,
    selectedIds,
    standardRules,
    bxgyRules,
    hasUnifiedBxgyTier: hasUnifiedBxgy,
  };
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

function getEffectiveBxgyRules(compiledOffer: CompiledOfferRuntime): BxgyDiscountRule[] {
  return compiledOffer.bxgyRules;
}

function cartContainsConfiguredIds(
  cartIndex: ReturnType<typeof buildIndexedCartLines>,
  configuredIds: string[],
): boolean {
  if (!configuredIds.length) return false;
  return configuredIds.some((configuredId) => {
    const lookupKey = buildOfferLookupKey(configuredId);
    return lookupKey ? cartIndex.lookupKeys.has(lookupKey) : false;
  });
}

function offerIntersectsCartForBxgyEvaluation(
  compiledOffer: CompiledOfferRuntime,
  cartIndex: ReturnType<typeof buildIndexedCartLines>,
): boolean {
  const selectedIds = compiledOffer.selectedIds;
  if (cartContainsConfiguredIds(cartIndex, selectedIds)) return true;

  const bxgyRules = getEffectiveBxgyRules(compiledOffer);
  const ruleScopedIds = Array.from(
    new Set(
      bxgyRules.flatMap((rule) => [
        ...(Array.isArray(rule.buyProductIds) ? rule.buyProductIds : []),
        ...(Array.isArray(rule.getProductIds) ? rule.getProductIds : []),
      ]),
    ),
  );
  if (cartContainsConfiguredIds(cartIndex, ruleScopedIds)) return true;

  return selectedIds.length === 0 && ruleScopedIds.length === 0;
}

/**
 * 计算 BXGY 折扣 — 支持多层级 (tier)，按 buyQuantity 字段选择最优匹配层级
 */
function calculateBxgyDiscount(
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
      for (const selectedProductId of selectedProductIds) {
        const matchingLines = getIndexedCartEntriesForConfiguredIds(cartIndex, [selectedProductId])
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

      allProductCandidates.push(...candidates);
      continue;
    }

    const bxgyRules = compiledOffer.bxgyRules;
    if (!bxgyRules.length) continue;

    if (offer.offerType !== "quantity-breaks-different") {
      const candidates: ProductDiscountCandidate[] = [];
      const productPool = Array.from(
        new Set(
          bxgyRules.flatMap((rule) =>
            Array.isArray(rule.buyProductIds) ? rule.buyProductIds : [],
          ),
        ),
      );
      for (const selectedProductId of productPool) {
        const matchingLines = getIndexedCartEntriesForConfiguredIds(cartIndex, [selectedProductId])
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
          candidates.push({
            message: offer.cartTitle || "Buy X Get Y",
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
            message: offer.cartTitle || "Bundle Discount",
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

function getScopedLinesForSelectedIds(
  cartLines: CartInput["cart"]["lines"],
  selectedIds: string[],
): CartInput["cart"]["lines"] {
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

function getBestProductDiscountPercentValueFromTiers(
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

function buildOrderDiscountCandidatesFromCompiledOffers(
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
    const scopedLines = getScopedLinesForSelectedIds(input.cart.lines, compiledOffer.selectedIds);
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


function getCandidateTargetQuantities(
  candidate: ProductDiscountCandidate,
): Map<string, number> {
  const quantitiesByLineId = new Map<string, number>();
  for (const target of candidate.targets ?? []) {
    const cartLineId = String(target.cartLine?.id || "").trim();
    if (!cartLineId) continue;
    const quantity = Math.max(1, Math.trunc(Number(target.cartLine?.quantity) || 1));
    quantitiesByLineId.set(
      cartLineId,
      (quantitiesByLineId.get(cartLineId) || 0) + quantity,
    );
  }
  return quantitiesByLineId;
}

function getCandidateTargetCartLineIds(
  candidate: ProductDiscountCandidate,
): string[] {
  return Array.from(getCandidateTargetQuantities(candidate).keys());
}

function parseCandidatePercentValue(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function estimateCandidateSavings(
  candidate: ProductDiscountCandidate,
  unitPriceByLineId: Map<string, number>,
): number {
  const targetQuantitiesByLineId = getCandidateTargetQuantities(candidate);
  if (!targetQuantitiesByLineId.size) return 0;

  if ("fixedAmount" in candidate.value) {
    const fixedAmount = Number(candidate.value.fixedAmount?.amount || 0);
    const normalizedFixedAmount = Number.isFinite(fixedAmount) ? Math.max(0, fixedAmount) : 0;
    if (!candidate.value.fixedAmount?.appliesToEachItem) {
      return normalizedFixedAmount;
    }

    return Array.from(targetQuantitiesByLineId.values()).reduce((sum, quantity) => {
      return sum + normalizedFixedAmount * quantity;
    }, 0);
  }

  return Array.from(targetQuantitiesByLineId.entries()).reduce((sum, [lineId, quantity]) => {
    const unitPrice = Math.max(0, unitPriceByLineId.get(lineId) || 0);

    if ("percentage" in candidate.value) {
      const percent = Math.max(
        0,
        Math.min(100, parseCandidatePercentValue(candidate.value.percentage?.value)),
      );
      return sum + unitPrice * quantity * (percent / 100);
    }
    return sum;
  }, 0);
}

function getCandidateQuantityOverCapacityByLineId(
  candidateTargetQuantities: Map<string, number>,
  winners: Array<{
    targetQuantitiesByLineId: Map<string, number>;
  }>,
  lineCapacityByLineId: Map<string, number>,
): Map<string, number> {
  const overCapacityByLineId = new Map<string, number>();

  for (const [lineId, candidateQuantity] of candidateTargetQuantities.entries()) {
    const lineCapacity = Math.max(0, lineCapacityByLineId.get(lineId) || 0);
    const occupiedQuantity = winners.reduce(
      (sum, winner) => sum + (winner.targetQuantitiesByLineId.get(lineId) || 0),
      0,
    );
    const overCapacity = Math.max(0, occupiedQuantity + candidateQuantity - lineCapacity);
    if (overCapacity > 0) {
      overCapacityByLineId.set(lineId, overCapacity);
    }
  }

  return overCapacityByLineId;
}

function chooseProductWinnerIndicesToReplaceGreedy(
  remainingOverCapacityByLineId: Map<string, number>,
  winnerIndicesTouchingOverCapacity: number[],
  winners: Array<{
    targetQuantitiesByLineId: Map<string, number>;
    savings: number;
  }>,
): number[] {
  const selectedWinnerIndices = new Set<number>();
  while (Array.from(remainingOverCapacityByLineId.values()).some((quantity) => quantity > 0)) {
    let bestChoice:
      | {
          winnerIndex: number;
          usefulFreedQuantity: number;
          savings: number;
        }
      | null = null;

    for (const winnerIndex of winnerIndicesTouchingOverCapacity) {
      if (selectedWinnerIndices.has(winnerIndex)) continue;
      const winner = winners[winnerIndex];
      let usefulFreedQuantity = 0;

      for (const [lineId, overCapacity] of remainingOverCapacityByLineId.entries()) {
        if (overCapacity <= 0) continue;
        usefulFreedQuantity += Math.min(
          overCapacity,
          winner.targetQuantitiesByLineId.get(lineId) || 0,
        );
      }

      if (usefulFreedQuantity <= 0) continue;

      if (
        !bestChoice ||
        winner.savings / usefulFreedQuantity < bestChoice.savings / bestChoice.usefulFreedQuantity ||
        (winner.savings / usefulFreedQuantity === bestChoice.savings / bestChoice.usefulFreedQuantity &&
          winner.savings < bestChoice.savings)
      ) {
        bestChoice = {
          winnerIndex,
          usefulFreedQuantity,
          savings: winner.savings,
        };
      }
    }

    if (!bestChoice) {
      return winnerIndicesTouchingOverCapacity;
    }

    selectedWinnerIndices.add(bestChoice.winnerIndex);
    const selectedWinner = winners[bestChoice.winnerIndex];
    for (const [lineId, overCapacity] of remainingOverCapacityByLineId.entries()) {
      if (overCapacity <= 0) continue;
      const freedQuantity = selectedWinner.targetQuantitiesByLineId.get(lineId) || 0;
      remainingOverCapacityByLineId.set(
        lineId,
        Math.max(0, overCapacity - freedQuantity),
      );
    }
  }

  return Array.from(selectedWinnerIndices);
}

function chooseProductWinnerIndicesToReplace(
  candidateTargetQuantities: Map<string, number>,
  winners: Array<{
    targetQuantitiesByLineId: Map<string, number>;
    savings: number;
  }>,
  lineCapacityByLineId: Map<string, number>,
): number[] {
  const remainingOverCapacityByLineId = getCandidateQuantityOverCapacityByLineId(
    candidateTargetQuantities,
    winners,
    lineCapacityByLineId,
  );
  if (!remainingOverCapacityByLineId.size) {
    return [];
  }

  const winnerIndicesTouchingOverCapacity = winners.reduce<number[]>(
    (matched, winner, winnerIndex) => {
      const touchesOverCapacityLine = Array.from(remainingOverCapacityByLineId.keys()).some(
        (lineId) => (winner.targetQuantitiesByLineId.get(lineId) || 0) > 0,
      );
      if (touchesOverCapacityLine) {
        matched.push(winnerIndex);
      }
      return matched;
    },
    [],
  );
  const MAX_EXACT_CONFLICT_WINNERS = 10;
  if (winnerIndicesTouchingOverCapacity.length > MAX_EXACT_CONFLICT_WINNERS) {
    return chooseProductWinnerIndicesToReplaceGreedy(
      remainingOverCapacityByLineId,
      winnerIndicesTouchingOverCapacity,
      winners,
    );
  }

  const baseOccupiedByLineId = new Map<string, number>();
  for (const lineId of candidateTargetQuantities.keys()) {
    baseOccupiedByLineId.set(
      lineId,
      winners.reduce(
        (sum, winner) => sum + (winner.targetQuantitiesByLineId.get(lineId) || 0),
        0,
      ),
    );
  }

  let bestSubset: number[] | null = null;
  let bestSubsetSavings = Number.POSITIVE_INFINITY;
  let bestSubsetCount = Number.POSITIVE_INFINITY;
  const subsetCount = 1 << winnerIndicesTouchingOverCapacity.length;

  for (let mask = 1; mask < subsetCount; mask += 1) {
    const freedByLineId = new Map<string, number>();
    let removedSavings = 0;
    const removedWinnerIndices: number[] = [];
    let shouldSkipSubset = false;

    for (let bit = 0; bit < winnerIndicesTouchingOverCapacity.length; bit += 1) {
      if ((mask & (1 << bit)) === 0) continue;
      const winnerIndex = winnerIndicesTouchingOverCapacity[bit];
      const winner = winners[winnerIndex];
      removedWinnerIndices.push(winnerIndex);
      removedSavings += winner.savings;
      if (
        removedSavings > bestSubsetSavings ||
        (removedSavings === bestSubsetSavings &&
          removedWinnerIndices.length >= bestSubsetCount)
      ) {
        shouldSkipSubset = true;
        break;
      }
      for (const [lineId, quantity] of winner.targetQuantitiesByLineId.entries()) {
        freedByLineId.set(lineId, (freedByLineId.get(lineId) || 0) + quantity);
      }
    }

    if (shouldSkipSubset) continue;

    const fitsAfterRemoval = Array.from(candidateTargetQuantities.entries()).every(
      ([lineId, candidateQuantity]) =>
        Math.max(0, baseOccupiedByLineId.get(lineId) || 0) -
          Math.max(0, freedByLineId.get(lineId) || 0) +
          candidateQuantity <=
        Math.max(0, lineCapacityByLineId.get(lineId) || 0),
    );
    if (!fitsAfterRemoval) continue;

    bestSubset = removedWinnerIndices;
    bestSubsetSavings = removedSavings;
    bestSubsetCount = removedWinnerIndices.length;
  }

  if (bestSubset) {
    return bestSubset;
  }

  return chooseProductWinnerIndicesToReplaceGreedy(
    remainingOverCapacityByLineId,
    winnerIndicesTouchingOverCapacity,
    winners,
  );
}

/**
 * 把一个可拆候选缩到给定的每行数量（丢弃数量为 0 的 target），
 * 其余字段（message / value / associatedDiscountCode）保持不变。
 */
function trimCandidateToQuantities(
  candidate: ProductDiscountCandidate,
  quantitiesByLineId: Map<string, number>,
): ProductDiscountCandidate {
  const trimmedTargets = (candidate.targets ?? [])
    .map((target) => {
      const lineId = String(target.cartLine?.id || "").trim();
      const quantity = quantitiesByLineId.get(lineId) ?? 0;
      return quantity > 0 ? { cartLine: { id: lineId, quantity } } : null;
    })
    .filter((target): target is { cartLine: { id: string; quantity: number } } => target !== null);

  return {
    ...candidate,
    targets: trimmedTargets,
  };
}

export function resolveExclusiveProductCandidates(
  candidates: ProductDiscountCandidate[],
  cartLines: CartInput["cart"]["lines"],
  divisibleCandidates: Set<ProductDiscountCandidate> = new Set(),
): ProductDiscountCandidate[] {
  const unitPriceByLineId = new Map(
    cartLines.map((line) => [
      line.id,
      parseMoneyAmount(line.cost?.amountPerQuantity?.amount),
    ]),
  );
  const lineCapacityByLineId = new Map(
    cartLines.map((line) => [
      line.id,
      Math.max(0, Math.trunc(Number(line.quantity) || 0)),
    ]),
  );
  const winners: Array<{
    candidate: ProductDiscountCandidate;
    targetLineIds: string[];
    targetQuantitiesByLineId: Map<string, number>;
    savings: number;
    index: number;
  }> = [];

  for (const [index, candidate] of candidates.entries()) {
    const targetQuantitiesByLineId = getCandidateTargetQuantities(candidate);
    const targetLineIds = Array.from(targetQuantitiesByLineId.keys());
    if (!targetLineIds.length) {
      winners.push({
        candidate,
        targetLineIds,
        targetQuantitiesByLineId,
        savings: estimateCandidateSavings(candidate, unitPriceByLineId),
        index,
      });
      continue;
    }

    const savings = estimateCandidateSavings(candidate, unitPriceByLineId);
    const conflictingWinnerIndices = chooseProductWinnerIndicesToReplace(
      targetQuantitiesByLineId,
      winners,
      lineCapacityByLineId,
    );

    if (!conflictingWinnerIndices.length) {
      winners.push({
        candidate,
        targetLineIds,
        targetQuantitiesByLineId,
        savings,
        index,
      });
      continue;
    }

    const conflictingSavings = conflictingWinnerIndices.reduce(
      (sum, winnerIndex) => sum + winners[winnerIndex].savings,
      0,
    );

    // 可拆候选（数量阶梯）冲突时，比较两个方案取较优：
    //   方案 A「裁剪」：保留现有 winner，本候选只吃每行的剩余空闲单位。
    //   方案 B「驱逐」：挤掉节省最少的冲突 winner 子集，本候选按全量落地。
    // 净收益 = 全量节省 − 被挤掉的节省；仅当它严格大于裁剪方案才驱逐，
    // 否则共存（裁剪）。这样既保留"多优惠分吃同一商品不同单位"的能力，
    // 又让数量阶梯在确实更省时能挤掉 BXGY/bundle，去除硬编码模块优先级。
    if (divisibleCandidates.has(candidate)) {
      const occupiedByLineId = new Map<string, number>();
      for (const winner of winners) {
        for (const [winnerLineId, winnerQty] of winner.targetQuantitiesByLineId.entries()) {
          occupiedByLineId.set(
            winnerLineId,
            (occupiedByLineId.get(winnerLineId) || 0) + winnerQty,
          );
        }
      }

      const trimmedQuantitiesByLineId = new Map<string, number>();
      for (const [lineId, requestedQty] of targetQuantitiesByLineId.entries()) {
        const lineCapacity = Math.max(0, lineCapacityByLineId.get(lineId) || 0);
        const freeQty = Math.max(0, lineCapacity - (occupiedByLineId.get(lineId) || 0));
        const grantedQty = Math.min(requestedQty, freeQty);
        if (grantedQty > 0) {
          trimmedQuantitiesByLineId.set(lineId, grantedQty);
        }
      }

      const trimmedCandidate = trimCandidateToQuantities(candidate, trimmedQuantitiesByLineId);
      const trimmedSavings = estimateCandidateSavings(trimmedCandidate, unitPriceByLineId);
      const evictNetGain = savings - conflictingSavings;

      if (!(evictNetGain > trimmedSavings && evictNetGain > 0)) {
        if (trimmedSavings > 0) {
          const trimmedTargetLineIds = Array.from(trimmedQuantitiesByLineId.keys());
          log("product_candidate_trimmed", {
            targetLineIds: trimmedTargetLineIds,
            requestedQuantities: Array.from(targetQuantitiesByLineId.entries()),
            grantedQuantities: Array.from(trimmedQuantitiesByLineId.entries()),
            trimmedSavings: trimmedSavings.toFixed(4),
          });
          winners.push({
            candidate: trimmedCandidate,
            targetLineIds: trimmedTargetLineIds,
            targetQuantitiesByLineId: trimmedQuantitiesByLineId,
            savings: trimmedSavings,
            index,
          });
        }
        continue;
      }
      // evictNetGain 更优：落入下方驱逐逻辑，按全量挤掉冲突 winner。
    } else if (savings <= conflictingSavings) {
      continue;
    }

    const previousTargetLineIds = Array.from(
      new Set(
        conflictingWinnerIndices.flatMap((winnerIndex) => winners[winnerIndex].targetLineIds),
      ),
    );
    log("product_candidate_conflict_resolved", {
      previousTargetLineIds,
      nextTargetLineIds: targetLineIds,
      previousSavings: conflictingSavings.toFixed(4),
      nextSavings: savings.toFixed(4),
    });

    const conflictingWinnerIndexSet = new Set(conflictingWinnerIndices);
    const nextWinners = winners.filter((_, winnerIndex) => !conflictingWinnerIndexSet.has(winnerIndex));
    nextWinners.push({
      candidate,
      targetLineIds,
      targetQuantitiesByLineId,
      savings,
      index,
    });
    winners.length = 0;
    winners.push(...nextWinners);
  }

  return winners
    .sort((a, b) => a.index - b.index)
    .map((winner) => winner.candidate);
}

/**
 * selectedProductsJson 存的是 Product GID（与主题端、后台一致），需用购物车行的 product.id / variant.id 匹配，不能用 CartLine.id。
 */
type RegularOfferIndex = {
  matchAllOffers: CompiledOfferRuntime[];
  byLookupKey: Map<string, CompiledOfferRuntime[]>;
};

function buildOfferLookupKey(raw: string | undefined | null): string {
  return extractShopifyProductNumericId(raw);
}

function appendOfferToLookupIndex(
  index: Map<string, CompiledOfferRuntime[]>,
  lookupKey: string,
  compiledOffer: CompiledOfferRuntime,
): void {
  if (!lookupKey) return;
  const existing = index.get(lookupKey);
  if (existing) {
    existing.push(compiledOffer);
    return;
  }
  index.set(lookupKey, [compiledOffer]);
}

function buildRegularOfferIndex(offers: CompiledOfferRuntime[]): RegularOfferIndex {
  const byLookupKey = new Map<string, CompiledOfferRuntime[]>();
  const matchAllOffers: CompiledOfferRuntime[] = [];

  for (const compiledOffer of offers) {
    if (!compiledOffer.settings.quantityEnabled) continue;
    if (!compiledOffer.selectedIds.length) {
      matchAllOffers.push(compiledOffer);
      continue;
    }

    const seenKeys = new Set<string>();
    for (const selectedId of compiledOffer.selectedIds) {
      const lookupKey = buildOfferLookupKey(selectedId);
      if (!lookupKey || seenKeys.has(lookupKey)) continue;
      seenKeys.add(lookupKey);
      appendOfferToLookupIndex(byLookupKey, lookupKey, compiledOffer);
    }
  }

  return {
    matchAllOffers,
    byLookupKey,
  };
}

const findOffers = (
  productId: string | undefined,
  variantId: string | undefined,
  offerIndex: RegularOfferIndex,
): CompiledOfferRuntime[] => {
  const candidateOffers: CompiledOfferRuntime[] = [];
  const seenOfferIds = new Set<string>();
  const lookupKeys = [buildOfferLookupKey(productId), buildOfferLookupKey(variantId)].filter(Boolean);

  for (const compiledOffer of offerIndex.matchAllOffers) {
    const offerId = String(compiledOffer.offer.id || "");
    if (seenOfferIds.has(offerId)) continue;
    seenOfferIds.add(offerId);
    candidateOffers.push(compiledOffer);
  }

  for (const lookupKey of lookupKeys) {
    for (const compiledOffer of offerIndex.byLookupKey.get(lookupKey) ?? []) {
      const offerId = String(compiledOffer.offer.id || "");
      if (seenOfferIds.has(offerId)) continue;
      seenOfferIds.add(offerId);
      candidateOffers.push(compiledOffer);
    }
  }

  return candidateOffers.filter((compiledOffer) => {
    const selectedIds = compiledOffer.selectedIds;
    if (!selectedIds.length) return true;
    return selectedIds.some(
      (sid) =>
        (productId && productIdsMatch(productId, sid)) ||
        (variantId && productIdsMatch(variantId, sid)),
    );
  });
};

/**
 * 校验是否允许生成本次折扣：购物车非空。
 */
const checkValid = (input: CartInput): boolean => {
  return input.cart.lines.length > 0;
};
