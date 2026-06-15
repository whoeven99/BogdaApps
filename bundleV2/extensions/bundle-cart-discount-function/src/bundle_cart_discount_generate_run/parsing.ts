import { CartInput } from "../../generated/api";
import {
  Offer,
  CompactOfferWire,
  BxgyDiscountRule,
  DiscountTier,
  ParsedOfferSettings,
  CompiledOfferRuntime,
  CouponAccess,
  BuyerTargetingContext,
} from "./types";
import { ENABLE_FUNCTION_LOGS, log } from "./log";

const DISCOUNT_PERCENTAGE = "10.0";
export const DEFAULT_DISCOUNT_PERCENTAGE = DISCOUNT_PERCENTAGE;

const LEGACY_DEFAULT_DISCOUNT_MESSAGES = new Set([
  "",
  "Bundle Discount",
  "Bundle order discount",
  "Buy X Get Y",
  "Free gift",
]);

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

/** 内联 JSON 字段还原成字符串：已是字符串则原样返回，对象则 stringify，供下游既有解析逻辑消费。 */
export function jsonFieldToString(value: unknown): string | null {
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

export function isCompactOfferWire(raw: Offer | CompactOfferWire | null | undefined): raw is CompactOfferWire {
  if (!raw || typeof raw !== "object") return false;
  return (
    !("offerType" in raw) &&
    !("selectedProductsJson" in raw) &&
    ("t" in raw || "i" in raw || "s" in raw || "d" in raw || "o" in raw)
  );
}

export function extractSelectedIdsFromWire(
  wire: Offer | CompactOfferWire | null | undefined,
  expanded: Offer,
): { selectedIds: string[]; packedPool: string | null } {
  if (isCompactOfferWire(wire) && wire.s != null) {
    if (typeof wire.s === "string") {
      return { selectedIds: parseSelectedIds(wire.s), packedPool: null };
    }
    if (wire.s && typeof wire.s === "object" && !Array.isArray(wire.s)) {
      const packed = (wire.s as { p?: unknown }).p;
      if (typeof packed === "string" && packed.trim()) {
        return { selectedIds: [], packedPool: packed.trim() };
      }
    }
    return { selectedIds: parseSelectedIdsFromParsed(wire.s), packedPool: null };
  }
  return { selectedIds: parseSelectedIds(expanded.selectedProductsJson), packedPool: null };
}

export function lineMatchesPackedProductPool(
  productId: string | undefined,
  variantId: string | undefined,
  packedPool: string,
): boolean {
  if (!packedPool) return false;
  for (const rawId of [productId, variantId]) {
    const key = buildOfferLookupKey(rawId);
    if (!key) continue;
    if (
      packedPool === key ||
      packedPool.startsWith(`${key},`) ||
      packedPool.endsWith(`,${key}`) ||
      packedPool.includes(`,${key},`)
    ) {
      return true;
    }
  }
  return false;
}

export function lineMatchesCompiledOfferSelection(
  productId: string | undefined,
  variantId: string | undefined,
  compiledOffer: CompiledOfferRuntime,
): boolean {
  if (compiledOffer.packedSelectedPool) {
    return lineMatchesPackedProductPool(
      productId,
      variantId,
      compiledOffer.packedSelectedPool,
    );
  }
  if (!compiledOffer.selectedLookupKeys.size) return true;
  return lineMatchesSelectedLookupKeys(
    productId,
    variantId,
    compiledOffer.selectedLookupKeys,
  );
}

export function cartIntersectsCompiledOfferSelection(
  cartIndex: ReturnType<typeof import("./cartIndex").buildIndexedCartLines>,
  compiledOffer: CompiledOfferRuntime,
): boolean {
  if (compiledOffer.packedSelectedPool) {
    for (const cartKey of cartIndex.lookupKeys) {
      if (lineMatchesPackedProductPool(cartKey, cartKey, compiledOffer.packedSelectedPool)) {
        return true;
      }
    }
    return false;
  }
  return cartIntersectsLookupKeys(cartIndex, compiledOffer.selectedLookupKeys);
}

/**
 * 从 Product GID（gid://shopify/Product/123）或纯数字字符串中提取末尾数字 ID，用于与后台配置对比。
 * 后台 Resource Picker 有时存整段 GID，有时仅存数字，购物车行侧始终为 GID，必须归一化后再比较。
 */
export function extractShopifyProductNumericId(
  raw: string | undefined | null,
): string {
  if (!raw) return "";
  const s = String(raw).trim();
  const tail = s.match(/(\d+)\s*$/);
  return tail ? tail[1] : s;
}

/** 判断两个 Product 标识是否指向同一商品（兼容 GID / 纯数字） */
export function productIdsMatch(
  cartProductGid: string | undefined,
  configProductId: string,
): boolean {
  const a = extractShopifyProductNumericId(cartProductGid);
  const b = extractShopifyProductNumericId(configProductId);
  if (a.length && b.length) return a === b;
  return String(cartProductGid || "") === String(configProductId || "");
}

export function buildOfferLookupKey(raw: string | undefined | null): string {
  return extractShopifyProductNumericId(raw);
}

export function buildSelectedLookupKeys(selectedIds: string[]): Set<string> {
  const keys = new Set<string>();
  for (const selectedId of selectedIds) {
    const lookupKey = buildOfferLookupKey(selectedId);
    if (lookupKey) keys.add(lookupKey);
  }
  return keys;
}

export function cartIntersectsLookupKeys(
  cartIndex: ReturnType<typeof import("./cartIndex").buildIndexedCartLines>,
  lookupKeys: Set<string>,
): boolean {
  if (!lookupKeys.size) return false;
  for (const cartKey of cartIndex.lookupKeys) {
    if (lookupKeys.has(cartKey)) return true;
  }
  return false;
}

export function lineMatchesSelectedLookupKeys(
  productId: string | undefined,
  variantId: string | undefined,
  selectedLookupKeys: Set<string>,
): boolean {
  if (!selectedLookupKeys.size) return true;
  for (const rawId of [productId, variantId]) {
    const lookupKey = buildOfferLookupKey(rawId);
    if (lookupKey && selectedLookupKeys.has(lookupKey)) return true;
  }
  return false;
}

export function matchesAnyConfiguredId(
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

export function getScopedLinesForCompiledOffer(
  cartLines: CartInput["cart"]["lines"],
  compiledOffer: CompiledOfferRuntime,
): CartInput["cart"]["lines"] {
  if (!compiledOffer.packedSelectedPool && !compiledOffer.selectedIds.length) {
    return cartLines.filter(
      (line) => line.merchandise.__typename === "ProductVariant",
    );
  }

  return cartLines.filter((line) => {
    if (line.merchandise.__typename !== "ProductVariant") return false;
    return lineMatchesCompiledOfferSelection(
      line.merchandise.product?.id,
      line.merchandise.id,
      compiledOffer,
    );
  });
}

export function getScopedLinesForSelectedIds(
  cartLines: CartInput["cart"]["lines"],
  selectedIds: string[],
  selectedLookupKeys?: Set<string>,
): CartInput["cart"]["lines"] {
  if (!selectedIds.length) {
    return cartLines.filter(
      (line) => line.merchandise.__typename === "ProductVariant",
    );
  }

  const keySet = selectedLookupKeys ?? buildSelectedLookupKeys(selectedIds);
  return cartLines.filter((line) => {
    if (line.merchandise.__typename !== "ProductVariant") return false;
    const productId = line.merchandise.product?.id;
    const variantId = line.merchandise.id;
    return lineMatchesSelectedLookupKeys(productId, variantId, keySet);
  });
}

export function needsSelectedProductsJsonString(offerType?: string): boolean {
  return offerType === "complete-bundle" || offerType === "free-gift";
}

export function parseMoneyAmount(raw: unknown): number {
  if (raw == null) return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw));
  return Number.isFinite(n) ? n : 0;
}

export function normalizeCouponCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function normalizeCustomerSegmentHandle(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export function normalizeCountryCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

export function getDefaultDiscountMessageForOfferType(offerType?: string): string {
  switch (offerType) {
    case "quantity-breaks-different":
      return "多件优惠";
    case "free-gift":
      return "赠品优惠";
    case "shipping-discount":
      return "运费优惠";
    case "order-discount":
    case "coupon":
      return "订单优惠";
    case "complete-bundle":
    case "quantity-breaks-same":
    case "bxgy":
    case "subscription":
    default:
      return "组合优惠";
  }
}

export function resolveDiscountMessage(offer: Pick<Offer, "cartTitle" | "offerType">): string {
  const configuredTitle = String(offer.cartTitle || "").trim();
  if (configuredTitle && !LEGACY_DEFAULT_DISCOUNT_MESSAGES.has(configuredTitle)) {
    return configuredTitle;
  }
  return getDefaultDiscountMessageForOfferType(offer.offerType);
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

export function resolveAcceptedCouponCode(
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

export function compileOfferSettings(offerSettingsJson?: string | null): ParsedOfferSettings {
  if (!offerSettingsJson) {
    return compileOfferSettingsFromParsed(null);
  }

  try {
    return compileOfferSettingsFromParsed(JSON.parse(offerSettingsJson));
  } catch {
    return compileOfferSettingsFromParsed(null);
  }
}

function compileOfferSettingsFromParsed(parsed: unknown): ParsedOfferSettings {
  if (!parsed || typeof parsed !== "object") {
    return {
      markets: "all",
      customerSegments: ["all"],
      customerProfileFilters: [],
      ipCountryCodes: [],
      couponAccess: { enabled: false, code: "" },
      quantityEnabled: true,
    };
  }

  const settings = parsed as {
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
    typeof settings.customerSegments === "string" && settings.customerSegments.trim()
      ? Array.from(
          new Set(
            settings.customerSegments
              .split(",")
              .map((segment) => normalizeCustomerSegmentHandle(segment))
              .filter(Boolean),
          ),
        )
      : ["all"];

  const customerProfileFilters =
    typeof settings.customerProfileFilters === "string" && settings.customerProfileFilters.trim()
      ? Array.from(
          new Set(
            settings.customerProfileFilters
              .split(",")
              .map((value) => normalizeCustomerSegmentHandle(value))
              .filter(Boolean),
          ),
        )
      : [];

  const ipCountryCodes =
    typeof settings.ipCountryCodes === "string" && settings.ipCountryCodes.trim()
      ? Array.from(
          new Set(
            settings.ipCountryCodes
              .split(",")
              .map((value) => normalizeCountryCode(value))
              .filter(Boolean),
          ),
        )
      : [];

  return {
    markets:
      typeof settings.markets === "string" && settings.markets.trim()
        ? settings.markets.trim()
        : "all",
    customerSegments: customerSegments.length ? customerSegments : ["all"],
    customerProfileFilters,
    ipCountryCodes,
    couponAccess: {
      enabled: settings.couponEnabled === true,
      code: normalizeCouponCode(settings.couponCode),
    },
    quantityEnabled: !(settings.quantity === false || settings.showQuantityBar === false),
  };
}

export function compileOfferSettingsFromWire(
  wire: Offer | CompactOfferWire | null | undefined,
  expanded: Offer,
): ParsedOfferSettings {
  if (isCompactOfferWire(wire) && wire.o != null) {
    if (typeof wire.o === "string") {
      return compileOfferSettings(wire.o);
    }
    return compileOfferSettingsFromParsed(wire.o);
  }
  return compileOfferSettings(expanded.offerSettingsJson);
}

export function buildBuyerTargetingContext(input: CartInput): BuyerTargetingContext {
  const buyerIdentity = input.cart.buyerIdentity;
  const customer = buyerIdentity?.customer;
  const tags = new Set<string>(
    (customer?.hasTags || [])
      .filter((entry: any) => entry.hasTag)
      .map((entry: any) => normalizeCustomerSegmentHandle(entry.tag)),
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

export function resolveNowMs(): number | null {
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

export function offerMatchesCustomerSegments(
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
    ENABLE_FUNCTION_LOGS && log("offer_customer_segment_skip_runtime_restriction", {
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

export function offerMatchesCustomerProfileFilters(
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
    ENABLE_FUNCTION_LOGS && log("offer_customer_profile_skip_runtime_restriction", {
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

export function offerMatchesIpCountryCodes(
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
    ENABLE_FUNCTION_LOGS && log("offer_ip_country_runtime_unavailable", {
      offerId: offer.id,
      configuredCodes,
    });
    return false;
  }
  return configuredCodes.includes(countryCode);
}

export function offerPassesScheduleAndMarket(
  offer: Offer,
  marketId: string | undefined,
  nowMs: number | null,
  parsedSettings?: ParsedOfferSettings,
): boolean {
  if (offer.status === false) {
    ENABLE_FUNCTION_LOGS && log("offer_skip_disabled", { offerId: offer.id, name: offer.name });
    return false;
  }

  if (offer.startTime) {
    const startTimeMs = Date.parse(offer.startTime);
    if (nowMs === null) {
      ENABLE_FUNCTION_LOGS && log("offer_time_unavailable_skip_start_check", {
        offerId: offer.id,
        name: offer.name,
        startTime: offer.startTime,
      });
    } else if (Number.isFinite(startTimeMs) && nowMs < startTimeMs) {
      ENABLE_FUNCTION_LOGS && log("offer_skip_before_start", {
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
      ENABLE_FUNCTION_LOGS && log("offer_time_unavailable_skip_end_check", {
        offerId: offer.id,
        name: offer.name,
        endTime: offer.endTime,
      });
    } else if (Number.isFinite(endTimeMs) && nowMs > endTimeMs) {
      ENABLE_FUNCTION_LOGS && log("offer_skip_after_end", {
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
          ENABLE_FUNCTION_LOGS && log("offer_skip_market_mismatch", {
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

function parseSelectedIdsFromParsed(parsed: unknown): string[] {
  // Handle BXGY format: { buyProducts: string[], getProducts: string[] }
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const packed = (parsed as { p?: unknown }).p;
    if (typeof packed === "string" && packed.trim()) {
      return packed
        .split(",")
        .map((id) => String(id || "").trim())
        .filter(Boolean);
    }

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
      allIds.push(...buyProducts.filter((id) => typeof id === "string"));
    }
    if (Array.isArray(getProducts)) {
      allIds.push(...getProducts.filter((id) => typeof id === "string"));
    }
    if (Array.isArray(triggerProducts)) {
      allIds.push(...triggerProducts.filter((id) => typeof id === "string"));
    }
    if (Array.isArray(giftProducts)) {
      allIds.push(...giftProducts.filter((id) => typeof id === "string"));
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
}

export const parseSelectedIds = (selectedProductsJson?: string | null): string[] => {
  if (!selectedProductsJson) return [];

  try {
    return parseSelectedIdsFromParsed(JSON.parse(selectedProductsJson));
  } catch {
    return [];
  }
};

function parseDiscountRulesFromParsed(parsed: unknown): DiscountTier[] {
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
}

export function parseDiscountRulesJson(
  discountRulesJson?: string | null,
): DiscountTier[] {
  if (!discountRulesJson) return [];

  try {
    return parseDiscountRulesFromParsed(JSON.parse(discountRulesJson));
  } catch {
    return [];
  }
}

export function parseDiscountRulesFromWire(
  wire: Offer | CompactOfferWire | null | undefined,
  expanded: Offer,
): DiscountTier[] {
  if (isCompactOfferWire(wire) && wire.d != null) {
    if (typeof wire.d === "string") {
      return parseDiscountRulesJson(wire.d);
    }
    return parseDiscountRulesFromParsed(wire.d);
  }
  return parseDiscountRulesJson(expanded.discountRulesJson);
}

export function parseBxgyDiscountRules(discountRulesJson?: string | null): BxgyDiscountRule[] {
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

export function parseBxgyDiscountRulesFromWire(
  wire: Offer | CompactOfferWire | null | undefined,
  expanded: Offer,
): BxgyDiscountRule[] {
  if (isCompactOfferWire(wire) && wire.d != null) {
    if (typeof wire.d === "string") {
      return parseBxgyDiscountRules(wire.d);
    }
    try {
      return parseBxgyDiscountRules(JSON.stringify(wire.d));
    } catch {
      return [];
    }
  }
  return parseBxgyDiscountRules(expanded.discountRulesJson);
}

export function hasUnifiedBxgyTier(
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

export function buildBxgyRulesFromUnifiedDiscountRules(
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

export function compileOfferRuntimeFromWire(
  wire: Offer | CompactOfferWire | null | undefined,
): CompiledOfferRuntime {
  if (!wire || typeof wire !== "object") {
    return compileOfferRuntime({} as Offer, []);
  }
  if (!isCompactOfferWire(wire)) {
    return compileOfferRuntime(wire as Offer);
  }

  const compact = wire;
  const offerType = compact.t;
  const offer: Offer = {
    id: compact.i,
    cartTitle: compact.c ?? "",
    offerType,
    status: compact.x,
    startTime: compact.b ?? undefined,
    endTime: compact.e ?? undefined,
    selectedProductsJson:
      needsSelectedProductsJsonString(offerType) && compact.s != null
        ? jsonFieldToString(compact.s)
        : null,
    discountRulesJson: null,
    offerSettingsJson: null,
  };
  const selection = extractSelectedIdsFromWire(compact, offer);
  const selectedIds = selection.selectedIds;
  const packedSelectedPool = selection.packedPool;
  const settings = compileOfferSettingsFromWire(compact, offer);
  const standardRules = parseDiscountRulesFromWire(compact, offer);
  const dedicatedBxgyRules = parseBxgyDiscountRulesFromWire(compact, offer);
  const hasUnifiedBxgy = hasUnifiedBxgyTier(null, standardRules);
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
    selectedLookupKeys: packedSelectedPool
      ? new Set<string>()
      : buildSelectedLookupKeys(selectedIds),
    packedSelectedPool,
    standardRules,
    bxgyRules,
    hasUnifiedBxgyTier: hasUnifiedBxgy,
  };
}

export function compileOfferRuntime(offer: Offer, selectedIdsOverride?: string[]): CompiledOfferRuntime {
  const settings = compileOfferSettings(offer.offerSettingsJson);
  const selectedIds = selectedIdsOverride ?? parseSelectedIds(offer.selectedProductsJson);
  const selectedLookupKeys = buildSelectedLookupKeys(selectedIds);
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
    selectedLookupKeys,
    packedSelectedPool: null,
    standardRules,
    bxgyRules,
    hasUnifiedBxgyTier: hasUnifiedBxgy,
  };
}

export function resolveSameProductBxgyQuantities(rule: Pick<BxgyDiscountRule, "buyQuantity" | "getQuantity">): {
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
  cartIndex: ReturnType<typeof import("./cartIndex").buildIndexedCartLines>,
  configuredIds: string[],
  configuredLookupKeys?: Set<string>,
): boolean {
  const lookupKeys = configuredLookupKeys ?? buildSelectedLookupKeys(configuredIds);
  return cartIntersectsLookupKeys(cartIndex, lookupKeys);
}

export function offerIntersectsCartForBxgyEvaluation(
  compiledOffer: CompiledOfferRuntime,
  cartIndex: ReturnType<typeof import("./cartIndex").buildIndexedCartLines>,
): boolean {
  if (cartIntersectsCompiledOfferSelection(cartIndex, compiledOffer)) {
    return true;
  }

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

  return (
    !compiledOffer.packedSelectedPool &&
    compiledOffer.selectedIds.length === 0 &&
    ruleScopedIds.length === 0
  );
}
