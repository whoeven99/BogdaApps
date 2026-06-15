import type { OfferListItem } from "../../routes/_index/types";
import type { StoreProductItem } from "../shopify/products.server";
import {
  buildPersistedOfferFieldsFromCampaignConfig,
  isOfferPublishedForBundleMetafieldSync,
  parseCampaignConfig,
  parseCompleteBundleConfig,
  parseDifferentProductsDiscountRules,
  parseFreeGiftRules,
  parseFreeGiftSelectedProducts,
  parseSelectedProductIds,
  resolveFunctionDiscountClassesForOffer,
  resolveOfferTypeFromCampaignConfig,
  trimDiscountRulesJsonForFunction,
  trimOfferSettingsJsonForFunction,
  trimSelectedProductsJsonForFunction,
} from "../../utils/offerParsing";
import type { FunctionDiscountClass } from "../../utils/offerParsing";
import { fetchStoreProducts } from "../shopify/products.server";

type AdminType = {
  graphql: (
    query: string,
    opts?: { variables?: Record<string, unknown> },
  ) => Promise<{ json: () => Promise<unknown> }>;
};

export type OfferRuntimeSyncData = {
  offerType: string;
  selectedProductsJson: string | null;
  storefrontSelectedProductsJson: string | null;
  discountRulesJson: string | null;
  offerSettingsJson: string | null;
  referencedProductIds: string[];
  storefrontHydration: "none" | "complete-bundle" | "quantity-breaks-different";
};

function slimVariantsForStorefront(
  variants: StoreProductItem["variants"] | undefined,
): Array<{ id: string; price: string; selectedOptions: Array<{ name: string; value: string }> }> {
  if (!Array.isArray(variants)) return [];
  return variants
    .filter((v) => v && typeof v === "object" && v.id)
    .map((v) => ({
      id: String(v.id),
      price: String(v.price ?? ""),
      selectedOptions: Array.isArray(v.selectedOptions)
        ? v.selectedOptions
            .filter((opt) => opt && typeof opt === "object")
            .map((opt) => ({ name: String(opt.name ?? ""), value: String(opt.value ?? "") }))
        : [],
    }));
}

function slimVariantsFromStoredShape(
  raw: unknown,
): Array<{ id: string; price: string; selectedOptions: Array<{ name: string; value: string }> }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((v) => v && typeof v === "object" && (v as { id?: unknown }).id)
    .map((v) => {
      const vObj = v as { id?: unknown; price?: unknown; selectedOptions?: unknown };
      const selectedOptions = Array.isArray(vObj.selectedOptions)
        ? (vObj.selectedOptions as Array<{ name?: unknown; value?: unknown }>)
            .filter((opt) => opt && typeof opt === "object")
            .map((opt) => ({ name: String(opt.name ?? ""), value: String(opt.value ?? "") }))
        : [];
      return { id: String(vObj.id ?? ""), price: String(vObj.price ?? ""), selectedOptions };
    })
    .filter((row) => row.id);
}

function buildHydratedCompleteBundleJson(
  selectedProductsJson: string | null | undefined,
  storeProductMap: Map<string, StoreProductItem>,
): string | null {
  if (!selectedProductsJson) return null;
  const config = parseCompleteBundleConfig(selectedProductsJson);
  if (!config.bars.length) return selectedProductsJson;

  const bars = config.bars.map((bar) => ({
    ...bar,
    products: (bar.products || []).map((product) => {
      const hit = storeProductMap.get(String(product.productId || ""));
      if (!hit) {
        return {
          ...product,
          variants: slimVariantsFromStoredShape(product.variants),
        };
      }
      const variants = Array.isArray(hit.variants) ? hit.variants : [];
      const preferredVariantId = String(product.selectedVariantId || "");
      const selectedVariant =
        variants.find((v) => String(v.id) === preferredVariantId) || variants[0];
      return {
        productId: product.productId,
        handle: hit.handle || product.handle || "",
        title: hit.name || product.title || "",
        image: hit.image || product.image || "",
        price: selectedVariant?.price || product.price || hit.price || "",
        defaultVariantId: String(variants[0]?.id || product.defaultVariantId || ""),
        selectedVariantId: String(
          selectedVariant?.id || product.selectedVariantId || variants[0]?.id || "",
        ),
        selectionMode: product.selectionMode === "variant" ? "variant" : "product",
        selectedOptions:
          product.selectedOptions && Object.keys(product.selectedOptions).length > 0
            ? product.selectedOptions
            : Object.fromEntries(
                (selectedVariant?.selectedOptions || []).map((opt) => [opt.name, opt.value]),
              ),
        pricing: product.pricing ?? { mode: "full_price" as const, value: 0 },
        variants: slimVariantsForStorefront(variants),
      };
    }),
  }));

  return JSON.stringify({ triggerProductIds: config.triggerProductIds ?? [], bars });
}

function buildHydratedDifferentProductsJson(
  selectedProductsJson: string | null | undefined,
  discountRulesJson: string | null | undefined,
  storeProductMap: Map<string, StoreProductItem>,
): string | null {
  const referencedIds = Array.from(
    new Set([
      ...parseSelectedProductIds(selectedProductsJson),
      ...parseDifferentProductsDiscountRules(discountRulesJson).flatMap((rule) => [
        ...(Array.isArray(rule.buyProductIds) ? rule.buyProductIds : []),
        ...(Array.isArray(rule.getProductIds) ? rule.getProductIds : []),
      ]),
    ]),
  );

  if (!referencedIds.length) return selectedProductsJson ?? null;

  const hydratedCatalog = referencedIds
    .map((productId) => {
      const hit = storeProductMap.get(String(productId || ""));
      if (!hit) return null;
      const firstVariant = Array.isArray(hit.variants) ? hit.variants[0] : null;
      return {
        id: hit.id,
        handle: hit.handle || "",
        title: hit.name || "",
        image: hit.image || "",
        price: firstVariant?.price || hit.price || "",
        selectedVariantId: String(firstVariant?.id || ""),
        variants: slimVariantsForStorefront(Array.isArray(hit.variants) ? hit.variants : undefined),
      };
    })
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.id));

  return hydratedCatalog.length > 0 ? JSON.stringify(hydratedCatalog) : (selectedProductsJson ?? null);
}

function parseBxgySelectedProductIds(selectedProductsJson?: string | null): string[] {
  if (!selectedProductsJson) return [];
  try {
    const parsed = JSON.parse(selectedProductsJson) as { buyProducts?: unknown; getProducts?: unknown };
    return [
      ...(Array.isArray(parsed.buyProducts) ? parsed.buyProducts : []),
      ...(Array.isArray(parsed.getProducts) ? parsed.getProducts : []),
    ]
      .map((id) => String(id || "").trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

export function collectLegacyReferencedProductIds(offer: OfferListItem): string[] {
  const effectiveOfferType = resolveOfferTypeFromCampaignConfig({
    offerType: offer.offerType,
    campaignConfigJson: offer.campaignConfigJson,
  });

  if (effectiveOfferType === "complete-bundle") {
    const config = parseCompleteBundleConfig(offer.selectedProductsJson);
    return Array.from(
      new Set(
        config.bars.flatMap((bar) =>
          (bar.products || []).map((p) => String(p.productId || "").trim()),
        ),
      ),
    ).filter(Boolean);
  }

  if (effectiveOfferType === "quantity-breaks-different") {
    const selectedIds = parseSelectedProductIds(offer.selectedProductsJson);
    const ruleIds = parseDifferentProductsDiscountRules(offer.discountRulesJson).flatMap((rule) => [
      ...(Array.isArray(rule.buyProductIds) ? rule.buyProductIds : []),
      ...(Array.isArray(rule.getProductIds) ? rule.getProductIds : []),
    ]);
    return Array.from(new Set([...selectedIds, ...ruleIds])).filter(Boolean);
  }

  return Array.from(
    new Set(
      effectiveOfferType === "bxgy"
        ? parseBxgySelectedProductIds(offer.selectedProductsJson)
        : effectiveOfferType === "free-gift"
          ? [
              ...parseFreeGiftSelectedProducts(offer.selectedProductsJson).triggerProducts,
              ...parseFreeGiftSelectedProducts(offer.selectedProductsJson).giftProducts,
              ...parseFreeGiftRules(offer.discountRulesJson).flatMap((rule) =>
                Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
              ),
            ]
          : parseSelectedProductIds(offer.selectedProductsJson),
    ),
  ).filter(Boolean);
}

export function compileOfferRuntimeSyncData(offer: OfferListItem): OfferRuntimeSyncData {
  const parsedCampaignConfig = parseCampaignConfig(offer.campaignConfigJson);
  if (parsedCampaignConfig) {
    const persistedFields = buildPersistedOfferFieldsFromCampaignConfig(
      parsedCampaignConfig,
      offer.offerSettingsJson,
    );
    return {
      offerType: persistedFields.offerType,
      selectedProductsJson: persistedFields.selectedProductsJsonForFunction,
      storefrontSelectedProductsJson: persistedFields.selectedProductsJson,
      discountRulesJson: persistedFields.discountRulesJson,
      offerSettingsJson: persistedFields.offerSettingsJson,
      referencedProductIds: persistedFields.referencedProductIds,
      storefrontHydration: persistedFields.storefrontHydration,
    };
  }

  const effectiveOfferType = resolveOfferTypeFromCampaignConfig({
    offerType: offer.offerType,
    campaignConfigJson: offer.campaignConfigJson,
  });

  return {
    offerType: effectiveOfferType,
    selectedProductsJson: trimSelectedProductsJsonForFunction(effectiveOfferType, offer.selectedProductsJson),
    storefrontSelectedProductsJson: offer.selectedProductsJson ?? null,
    discountRulesJson: offer.discountRulesJson ?? null,
    offerSettingsJson: offer.offerSettingsJson ?? null,
    referencedProductIds: collectLegacyReferencedProductIds(offer),
    storefrontHydration:
      effectiveOfferType === "complete-bundle"
        ? "complete-bundle"
        : effectiveOfferType === "quantity-breaks-different"
          ? "quantity-breaks-different"
          : "none",
  };
}

export function collectReferencedProductIds(offers: OfferListItem[]): string[] {
  const ids = new Set<string>();
  for (const offer of offers) {
    for (const productId of compileOfferRuntimeSyncData(offer).referencedProductIds) {
      const normalized = String(productId || "").trim();
      if (normalized) ids.add(normalized);
    }
  }
  return Array.from(ids);
}

/**
 * Function payload 压缩格式版本。Function 端用它区分压缩(v2)/旧(无 v)格式。
 * v2 压缩策略（仅作用于 Function payload，不影响主题 payload）：
 *   A 去掉 JSON-in-JSON 双重编码：三个 *Json 字段以嵌套对象内联，而非转义字符串；
 *   B 短键名：每个 offer 用 i/c/t/x/b/e/s/d/o 单字符键，省去重复长键开销；
 *   C product/variant GID 去前缀只留数字（Function 端本就用尾部数字匹配，行为不变）。
 */
export const COMPACT_OFFERS_FORMAT_VERSION = 2;

/** Shopify Function 单个 metafield 值上限：>10,000 字节将不会被返回给 Function。 */
export const FUNCTION_OFFERS_MAX_BYTES = 10_000;

const PRODUCT_GID_PATTERN = /^gid:\/\/shopify\/(?:Product|ProductVariant)\/(\d+)$/;

/** 递归把 Product / ProductVariant GID 压成纯数字；其它字符串（如 Market GID）原样保留。 */
function stripProductGidsDeep(value: unknown): unknown {
  if (typeof value === "string") {
    const match = value.match(PRODUCT_GID_PATTERN);
    return match ? match[1] : value;
  }
  if (Array.isArray(value)) return value.map(stripProductGidsDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = stripProductGidsDeep(val);
    }
    return out;
  }
  return value;
}

/** 把已 trim 的 *Json 字符串解析为对象（A：去双重编码）；解析失败则保留原字符串。 */
function parseTrimmedJsonField(raw: string | null | undefined): unknown {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

/** 计算 payload 的 UTF-8 字节数（用于 10KB 上限守卫）。 */
export function measureUtf8Bytes(payload: string): number {
  return new TextEncoder().encode(payload).length;
}

export async function buildCompactOffersPayload(shopOffers: OfferListItem[]): Promise<string> {
  const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
  const compactOffers = activeOffers.map((offer) => {
    const runtimeSyncData = compileOfferRuntimeSyncData(offer);
    const selected = parseTrimmedJsonField(runtimeSyncData.selectedProductsJson);
    const discountRules = parseTrimmedJsonField(
      trimDiscountRulesJsonForFunction(runtimeSyncData.discountRulesJson),
    );
    const settings = parseTrimmedJsonField(
      trimOfferSettingsJsonForFunction(runtimeSyncData.offerSettingsJson),
    );

    const compact: Record<string, unknown> = {
      i: offer.id,
      t: runtimeSyncData.offerType,
    };
    if (offer.cartTitle) compact.c = offer.cartTitle;
    if (offer.status !== undefined && offer.status !== null) compact.x = offer.status;
    if (offer.startTime) compact.b = offer.startTime;
    if (offer.endTime) compact.e = offer.endTime;
    if (selected != null) compact.s = stripProductGidsDeep(selected);
    if (discountRules != null) compact.d = stripProductGidsDeep(discountRules);
    if (settings != null) compact.o = settings;
    return compact;
  });
  return JSON.stringify({
    v: COMPACT_OFFERS_FORMAT_VERSION,
    updatedAt: new Date().toISOString(),
    offers: compactOffers,
  });
}

// ── 按 discount class 分片 ─────────────────────────────────────────────
// Function 实际读的是「按 class 派生 + 写到各 discount owner」的 payload。
// Shopify 限制：单个 metafield 值 >10KB 不返回；input query 计算成本 ≤30（每个
// metafield 字段 3）。因此每个 class 的 payload 最多切到固定片数，每片 <10KB，
// Function 的 input query 静态读取这些固定 key 后合并。
//
// shard key 命名复用既有 `offers`（片 0）+ `offers-1`（片 1），便于平滑迁移：
// 旧版 Function 只读 `offers` 仍能拿到片 0，不会崩。
// ⚠️ 这里的 key 列表必须与两个 Function 的 .graphql 静态读取保持一致。
export const OFFER_SHARD_KEYS = ["offers", "offers-1"] as const;
export const OFFER_SHARD_COUNT = OFFER_SHARD_KEYS.length;

function offerTypeOfWire(offer: Record<string, unknown>): string | null {
  const t = offer.t ?? offer.offerType;
  return t == null ? null : String(t);
}

function discountRulesJsonOfWire(offer: Record<string, unknown>): string | null {
  if (offer.d != null) {
    try {
      return JSON.stringify(offer.d);
    } catch {
      return null;
    }
  }
  const legacy = offer.discountRulesJson;
  return legacy == null ? null : String(legacy);
}

function packOffersIntoShards(
  offers: Array<Record<string, unknown>>,
  updatedAt: string,
): { shards: string[]; droppedOfferCount: number } {
  const wrapperBytes = measureUtf8Bytes(
    JSON.stringify({ v: COMPACT_OFFERS_FORMAT_VERSION, updatedAt, offers: [] }),
  );
  const contentBudget = FUNCTION_OFFERS_MAX_BYTES - wrapperBytes;
  const shardOffers: Array<Array<Record<string, unknown>>> = Array.from(
    { length: OFFER_SHARD_COUNT },
    () => [],
  );
  const shardBytes: number[] = Array.from({ length: OFFER_SHARD_COUNT }, () => 0);
  let droppedOfferCount = 0;

  for (const offer of offers) {
    const offerBytes = measureUtf8Bytes(JSON.stringify(offer)) + 1; // +1 ≈ 分隔逗号
    let placed = false;
    for (let k = 0; k < OFFER_SHARD_COUNT; k += 1) {
      if (shardBytes[k] + offerBytes <= contentBudget) {
        shardOffers[k].push(offer);
        shardBytes[k] += offerBytes;
        placed = true;
        break;
      }
    }
    if (!placed) droppedOfferCount += 1; // 单 offer 过大或所有片已满
  }

  return {
    shards: shardOffers.map((arr) =>
      JSON.stringify({ v: COMPACT_OFFERS_FORMAT_VERSION, updatedAt, offers: arr }),
    ),
    droppedOfferCount,
  };
}

/**
 * 从聚合 compact(v2) payload 中筛出某个 discount class 的 offers，并切成
 * OFFER_SHARD_COUNT 个分片（每片 <10KB）。targetClass=null 表示不按 class 过滤。
 * 返回固定长度的 shards（空片为 `{v,offers:[]}`，用于清掉 owner 上的历史残留）。
 */
export function buildShardedClassPayloads(
  value: string | undefined,
  targetClass: FunctionDiscountClass | null,
): { shards: string[]; droppedOfferCount: number } {
  let parsed: { updatedAt?: unknown; offers?: unknown } | null = null;
  if (typeof value === "string" && value.trim()) {
    try {
      parsed = JSON.parse(value) as { updatedAt?: unknown; offers?: unknown };
    } catch {
      parsed = null;
    }
  }
  const updatedAt =
    parsed && typeof parsed.updatedAt === "string" && parsed.updatedAt.trim()
      ? parsed.updatedAt
      : new Date().toISOString();
  const allOffers = Array.isArray(parsed?.offers)
    ? (parsed!.offers as Array<Record<string, unknown>>)
    : [];

  const filtered = allOffers.filter((offer) => {
    if (!targetClass) return true;
    return resolveFunctionDiscountClassesForOffer({
      offerType: offerTypeOfWire(offer),
      discountRulesJson: discountRulesJsonOfWire(offer),
    }).includes(targetClass);
  });

  return packOffersIntoShards(filtered, updatedAt);
}

/**
 * 守卫用：判断这批 offers 能否在分片限制内放下（任一 class 溢出即返回 false）。
 */
export function offersFitWithinShardLimits(compactPayloadValue: string): {
  ok: boolean;
  overflowClasses: FunctionDiscountClass[];
} {
  const classes: FunctionDiscountClass[] = ["PRODUCT", "ORDER", "SHIPPING"];
  const overflowClasses = classes.filter(
    (cls) => buildShardedClassPayloads(compactPayloadValue, cls).droppedOfferCount > 0,
  );
  return { ok: overflowClasses.length === 0, overflowClasses };
}

export async function buildStorefrontOffersStructured(
  admin: AdminType,
  shopOffers: OfferListItem[],
): Promise<{ updatedAt: string; offers: unknown[] }> {
  const activeOffers = shopOffers.filter(isOfferPublishedForBundleMetafieldSync);
  const compiledActiveOffers = activeOffers.map((offer) => ({
    offer,
    runtimeSyncData: compileOfferRuntimeSyncData(offer),
  }));

  const storefrontCatalogProductIds = collectReferencedProductIds(
    compiledActiveOffers
      .filter(
        ({ runtimeSyncData }) =>
          runtimeSyncData.storefrontHydration === "complete-bundle" ||
          runtimeSyncData.storefrontHydration === "quantity-breaks-different",
      )
      .map(({ offer }) => offer),
  );

  const storeProducts =
    storefrontCatalogProductIds.length > 0
      ? await fetchStoreProducts(admin, storefrontCatalogProductIds)
      : [];
  const storeProductMap = new Map(storeProducts.map((p) => [String(p.id || ""), p]));

  const offers = compiledActiveOffers
    .map(({ offer, runtimeSyncData }) => {
      const id = String(offer.id || "").trim();
      if (!id) return null;
      const hydrationMode = runtimeSyncData.storefrontHydration;
      const effectiveOfferType =
        runtimeSyncData.offerType ||
        resolveOfferTypeFromCampaignConfig({ offerType: offer.offerType });

      return {
        id,
        name: offer.name,
        cartTitle: offer.cartTitle,
        status: offer.status,
        startTime: offer.startTime,
        endTime: offer.endTime,
        discountRulesJson: runtimeSyncData.discountRulesJson,
        offerSettingsJson: runtimeSyncData.offerSettingsJson,
        offerType: effectiveOfferType,
        selectedProductsJson:
          hydrationMode === "complete-bundle"
            ? buildHydratedCompleteBundleJson(
                runtimeSyncData.storefrontSelectedProductsJson,
                storeProductMap,
              )
            : hydrationMode === "quantity-breaks-different"
              ? buildHydratedDifferentProductsJson(
                  runtimeSyncData.storefrontSelectedProductsJson,
                  runtimeSyncData.discountRulesJson,
                  storeProductMap,
                )
              : runtimeSyncData.storefrontSelectedProductsJson,
      };
    })
    .filter((o): o is NonNullable<typeof o> => Boolean(o));

  return { updatedAt: new Date().toISOString(), offers };
}
