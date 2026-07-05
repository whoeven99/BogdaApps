import type { CompleteBundlePricingMode } from "./types";
import { parseSelectedProductIds, parseDiscountRules, parseFreeGiftSelectedProducts } from "./discountRules";
import { parseCompleteBundleConfig } from "./completeBundle";

/**
 * 超过此数量时 Function payload 用逗号分隔字段 `p` 代替 JSON 数组，
 * 显著降低 Shopify WASM 解析 metafield 时的指令消耗。
 */
export const FUNCTION_PACK_PRODUCT_IDS_THRESHOLD = 40;

export function packProductIdsForFunctionPayload(ids: string[]): Record<string, unknown> {
  const numericIds = ids.map((id) => String(id || "").trim()).filter(Boolean);
  if (numericIds.length >= FUNCTION_PACK_PRODUCT_IDS_THRESHOLD) {
    return { p: numericIds.join(",") };
  }
  return { productIds: numericIds };
}

/**
 * Shopify Function 输入专用：裁剪 `selectedProductsJson`，去掉主题/预览用的大字段，
 * 降低 shop `ciwi-bundle-offers-fn` 中 automatic discount owner 瘦配置的 UTF-8 体积。
 * 不修改数据库中的原始 JSON，仅在 metafield 同步路径使用。
 */
export function trimSelectedProductsJsonForFunction(
  offerType: string,
  selectedProductsJson: string | null,
): string | null {
  if (selectedProductsJson == null || !String(selectedProductsJson).trim()) {
    return null;
  }
  const raw = String(selectedProductsJson);

  const finish = (next: string): string | null => {
    const t = next.trim();
    return t === "" ? null : t;
  };

  try {
    return trimSelectedProductsJsonForFunctionByOfferType(offerType, raw, finish);
  } catch {
    return finish(raw);
  }
}

export type FunctionDiscountClass = "PRODUCT" | "ORDER" | "SHIPPING";

export function trimOfferSettingsJsonForFunction(
  offerSettingsJson?: string | null,
): string | null {
  if (offerSettingsJson == null || !String(offerSettingsJson).trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(String(offerSettingsJson)) as {
      markets?: unknown;
      customerSegments?: unknown;
      customerProfileFilters?: unknown;
      ipCountryCodes?: unknown;
      couponEnabled?: unknown;
      couponCode?: unknown;
      quantity?: unknown;
      showQuantityBar?: unknown;
    };

    const next: Record<string, unknown> = {};
    if (typeof parsed.markets === "string" && parsed.markets.trim() && parsed.markets.trim() !== "all") {
      next.markets = parsed.markets.trim();
    }
    if (typeof parsed.customerSegments === "string" && parsed.customerSegments.trim()) {
      next.customerSegments = parsed.customerSegments.trim();
    }
    if (
      typeof parsed.customerProfileFilters === "string" &&
      parsed.customerProfileFilters.trim()
    ) {
      next.customerProfileFilters = parsed.customerProfileFilters.trim();
    }
    if (typeof parsed.ipCountryCodes === "string" && parsed.ipCountryCodes.trim()) {
      next.ipCountryCodes = parsed.ipCountryCodes.trim();
    }
    if (parsed.couponEnabled === true) {
      next.couponEnabled = true;
      if (typeof parsed.couponCode === "string" && parsed.couponCode.trim()) {
        next.couponCode = parsed.couponCode.trim();
      }
    }
    if (parsed.quantity === false) {
      next.quantity = false;
    }
    if (parsed.showQuantityBar === false) {
      next.showQuantityBar = false;
    }

    return JSON.stringify(next);
  } catch {
    return String(offerSettingsJson).trim() || null;
  }
}

const DISCOUNT_RULES_DISPLAY_ONLY_KEYS = new Set([
  "title",
  "subtitle",
  "titleSource",
  "subtitleSource",
  "badge",
  "isDefault",
  "offerKind",
  "id",
]);

export function trimDiscountRulesJsonForFunction(
  discountRulesJson?: string | null,
): string | null {
  if (discountRulesJson == null || !String(discountRulesJson).trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(String(discountRulesJson)) as unknown;
    if (!Array.isArray(parsed)) return String(discountRulesJson).trim() || null;
    const trimmed = parsed.map((item: unknown) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const r = item as Record<string, unknown>;
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(r)) {
        if (!DISCOUNT_RULES_DISPLAY_ONLY_KEYS.has(k)) out[k] = v;
      }
      return out;
    });
    return JSON.stringify(trimmed);
  } catch {
    return String(discountRulesJson).trim() || null;
  }
}

export function resolveFunctionDiscountClassesForOffer(params: {
  offerType?: string | null;
  discountRulesJson?: string | null;
}): FunctionDiscountClass[] {
  const offerType = String(params.offerType || "").trim();
  const classes = new Set<FunctionDiscountClass>();

  if (
    offerType === "bxgy" ||
    offerType === "quantity-breaks-different" ||
    offerType === "subscription"
  ) {
    classes.add("PRODUCT");
  }

  if (offerType === "free-gift") {
    classes.add("ORDER");
  }

  if (offerType === "complete-bundle") {
    classes.add("PRODUCT");
  }

  const normalizedRules = parseDiscountRules(params.discountRulesJson);
  for (const rule of normalizedRules) {
    if (rule.tierType === "single") continue;
    if (rule.rewardType === "free_shipping" || rule.discountClass === "shipping") {
      classes.add("SHIPPING");
      continue;
    }
    if (rule.rewardType === "gift_product" || rule.discountClass === "order") {
      classes.add("ORDER");
      continue;
    }
    classes.add("PRODUCT");
  }

  if (classes.size === 0) {
    classes.add("PRODUCT");
  }

  return Array.from(classes);
}

type OfferTypeSelectedProductsPayloadParams = {
  offerType: string;
  selectedProductsData: unknown;
  selectedProductIds: string[];
  differentProductsSharedPoolProductIds: string[];
  buyProducts: string[];
  completeBundleBars: unknown[];
  freeGiftTriggerProducts: string[];
  freeGiftSharedGiftProductIds: string[];
};

type OfferTypeDiscountRulesPayloadParams = {
  offerType: string;
  quantityRulesPayload: unknown;
  differentProductsRulesPayload: unknown;
  bxgyRulesPayload: unknown;
  freeGiftRulesPayload: unknown;
};

type OfferTypePayloadStrategy = {
  buildSelectedProductsPayload: (
    params: OfferTypeSelectedProductsPayloadParams,
  ) => unknown;
  buildDiscountRulesPayload: (
    params: OfferTypeDiscountRulesPayloadParams,
  ) => unknown;
  trimSelectedProductsJsonForFunction: (
    raw: string,
    finish: (next: string) => string | null,
  ) => string | null;
};

const DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY: OfferTypePayloadStrategy = {
  buildSelectedProductsPayload: ({ selectedProductsData }) => selectedProductsData,
  buildDiscountRulesPayload: ({ quantityRulesPayload }) => quantityRulesPayload,
  trimSelectedProductsJsonForFunction: (raw, finish) => {
    const ids = parseSelectedProductIds(raw);
    if (ids.length) {
      return finish(JSON.stringify(packProductIdsForFunctionPayload(ids)));
    }
    return finish(raw);
  },
};

const OFFER_TYPE_PAYLOAD_STRATEGIES: Record<string, OfferTypePayloadStrategy> = {
  "quantity-breaks-same": {
    buildSelectedProductsPayload: ({ selectedProductsData }) => selectedProductsData,
    buildDiscountRulesPayload: ({ quantityRulesPayload }) => quantityRulesPayload,
    trimSelectedProductsJsonForFunction: DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY.trimSelectedProductsJsonForFunction,
  },
  "quantity-breaks-different": {
    buildSelectedProductsPayload: ({ selectedProductIds, differentProductsSharedPoolProductIds }) => ({
      productIds:
        differentProductsSharedPoolProductIds.length > 0
          ? differentProductsSharedPoolProductIds
          : selectedProductIds,
    }),
    buildDiscountRulesPayload: ({ differentProductsRulesPayload }) =>
      differentProductsRulesPayload,
    trimSelectedProductsJsonForFunction: DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY.trimSelectedProductsJsonForFunction,
  },
  bxgy: {
    buildSelectedProductsPayload: ({ buyProducts }) => ({
      buyProducts,
    }),
    buildDiscountRulesPayload: ({ bxgyRulesPayload }) => bxgyRulesPayload,
    trimSelectedProductsJsonForFunction: (raw, finish) => {
      const parsed = JSON.parse(raw) as { buyProducts?: unknown; getProducts?: unknown };
      const buyProducts = Array.isArray(parsed.buyProducts)
        ? parsed.buyProducts.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      const getProducts = Array.isArray(parsed.getProducts)
        ? parsed.getProducts.map((id) => String(id || "").trim()).filter(Boolean)
        : [];
      return finish(JSON.stringify({ buyProducts, getProducts }));
    },
  },
  "complete-bundle": {
    buildSelectedProductsPayload: ({ selectedProductIds, completeBundleBars }) => ({
      productIds: selectedProductIds,
      bars: completeBundleBars,
    }),
    buildDiscountRulesPayload: ({ quantityRulesPayload }) => quantityRulesPayload,
    trimSelectedProductsJsonForFunction: (raw, finish) => {
      const cfg = parseCompleteBundleConfig(raw);
      if (!cfg.bars.length) {
        return finish(raw);
      }

      const bars = cfg.bars
        .map((bar) => {
          const id = String(bar.id || "").trim();
          if (!id) return null;

          const minQuantity = Math.max(1, Math.trunc(Number(bar.minQuantity) || 1));
          const maxQuantity = Math.max(
            minQuantity,
            Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
          );
          const quantity = Math.max(
            minQuantity,
            Math.trunc(Number(bar.quantity) || maxQuantity || 1),
          );

          const mode = normalizeCompleteBundlePricingModeForFn(bar.pricing?.mode);
          const value = Number.isFinite(Number(bar.pricing?.value))
            ? Number(bar.pricing?.value)
            : 0;

          const products = (Array.isArray(bar.products) ? bar.products : [])
            .map((p) => {
              const productId = String(p.productId || "").trim();
              if (!productId) return null;
              const pm = normalizeCompleteBundlePricingModeForFn(p.pricing?.mode);
              const pv = Number.isFinite(Number(p.pricing?.value))
                ? Number(p.pricing?.value)
                : 0;
              return {
                productId,
                selectedVariantId: String(p.selectedVariantId || ""),
                selectionMode: p.selectionMode === "variant" ? "variant" : "product",
                pricing: { mode: pm, value: pv },
              };
            })
            .filter(
              (
                row,
              ): row is {
                productId: string;
                selectedVariantId: string;
                selectionMode: "product" | "variant";
                pricing: { mode: CompleteBundlePricingMode; value: number };
              } => row !== null,
            );

          return {
            id,
            minQuantity,
            maxQuantity,
            quantity,
            excludeTriggerProduct: bar.excludeTriggerProduct !== false,
            pricing: { mode, value },
            products,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);

      if (!bars.length) {
        return finish(raw);
      }

      const productIds = (Array.isArray(cfg.triggerProductIds) ? cfg.triggerProductIds : [])
        .map((id) => String(id || "").trim())
        .filter(Boolean);

      return finish(JSON.stringify({ productIds, bars }));
    },
  },
  subscription: {
    buildSelectedProductsPayload: ({ selectedProductsData }) => selectedProductsData,
    buildDiscountRulesPayload: () => [],
    trimSelectedProductsJsonForFunction:
      DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY.trimSelectedProductsJsonForFunction,
  },
  "free-gift": {
    buildSelectedProductsPayload: ({
      freeGiftTriggerProducts,
      freeGiftSharedGiftProductIds,
    }) => ({
      triggerProducts: freeGiftTriggerProducts,
      giftProducts: freeGiftSharedGiftProductIds,
    }),
    buildDiscountRulesPayload: ({ freeGiftRulesPayload }) => freeGiftRulesPayload,
    trimSelectedProductsJsonForFunction: (raw, finish) => {
      const { triggerProducts, giftProducts } = parseFreeGiftSelectedProducts(raw);
      return finish(JSON.stringify({ triggerProducts, giftProducts }));
    },
  },
};

function getOfferTypePayloadStrategy(offerType: string): OfferTypePayloadStrategy {
  return OFFER_TYPE_PAYLOAD_STRATEGIES[offerType] || DEFAULT_OFFER_TYPE_PAYLOAD_STRATEGY;
}

export function buildSelectedProductsPayloadForOfferType(
  params: OfferTypeSelectedProductsPayloadParams,
): unknown {
  return getOfferTypePayloadStrategy(params.offerType).buildSelectedProductsPayload(params);
}

export function buildDiscountRulesPayloadForOfferType(
  params: OfferTypeDiscountRulesPayloadParams,
): unknown {
  return getOfferTypePayloadStrategy(params.offerType).buildDiscountRulesPayload(params);
}

function trimSelectedProductsJsonForFunctionByOfferType(
  offerType: string,
  raw: string,
  finish: (next: string) => string | null,
): string | null {
  return getOfferTypePayloadStrategy(offerType).trimSelectedProductsJsonForFunction(
    raw,
    finish,
  );
}

function normalizeCompleteBundlePricingModeForFn(raw: unknown): CompleteBundlePricingMode {
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
