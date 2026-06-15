import type {
  CompleteBundleBar,
  CompleteBundleConfig,
  CompleteBundlePricingMode,
  CompleteBundleProduct,
} from "./types";
import {
  inferCompleteBundleTitleSource,
  inferCompleteBundleSubtitleSource,
} from "./types";

export function isCompleteBundleSingleBar(
  bar: Pick<CompleteBundleBar, "type"> | null | undefined,
): boolean {
  return bar?.type === "single";
}

export function createDefaultCompleteBundleSingleBar(
  overrides: Partial<CompleteBundleBar> = {},
): CompleteBundleBar {
  return {
    id: String(overrides.id || "complete-bundle-single"),
    type: "single",
    title: typeof overrides.title === "string" ? overrides.title : "Single",
    titleSource:
      typeof overrides.titleSource === "string" ? overrides.titleSource : "auto",
    subtitle:
      typeof overrides.subtitle === "string" ? overrides.subtitle : "Standard price",
    subtitleSource:
      typeof overrides.subtitleSource === "string" ? overrides.subtitleSource : "auto",
    badge: typeof overrides.badge === "string" ? overrides.badge : "",
    isDefault: overrides.isDefault === true,
    minQuantity: 1,
    maxQuantity: 1,
    excludeTriggerProduct: false,
    quantity: 1,
    products: [],
    pricing: { mode: "full_price", value: 0 },
  };
}

export function normalizeCompleteBundleBars(
  bars: CompleteBundleBar[],
): CompleteBundleBar[] {
  const safeBars = Array.isArray(bars) ? bars : [];
  let singleBar: CompleteBundleBar | null = null;
  const bundleBars: CompleteBundleBar[] = [];

  for (const bar of safeBars) {
    if (!bar || typeof bar !== "object" || !String(bar.id || "").trim()) continue;
    if (isCompleteBundleSingleBar(bar)) {
      if (!singleBar) {
        singleBar = createDefaultCompleteBundleSingleBar(bar);
      }
      continue;
    }
    bundleBars.push({
      ...bar,
      // Historical payloads may still contain "bxgy"; normalize them to the
      // regular bundle bar type because complete-bundle is an order module.
      type: "quantity-break-same",
      title: String(bar.title || ""),
      titleSource:
        bar.titleSource === "custom"
          ? "custom"
          : inferCompleteBundleTitleSource(bar.title),
      subtitle: String(bar.subtitle || ""),
      subtitleSource:
        bar.subtitleSource === "custom"
          ? "custom"
          : inferCompleteBundleSubtitleSource(bar.subtitle),
      badge: String(bar.badge || ""),
      isDefault: !!bar.isDefault,
      minQuantity: Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
      maxQuantity: Math.max(
        Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
        Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
      ),
      excludeTriggerProduct: bar.excludeTriggerProduct !== false,
      quantity: Math.max(
        Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
        Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
      ),
      pricing: {
        mode: (
          ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
        ).includes(bar.pricing?.mode as CompleteBundlePricingMode)
          ? (bar.pricing.mode as CompleteBundlePricingMode)
          : "full_price",
        value: Number.isFinite(Number(bar.pricing?.value)) ? Number(bar.pricing?.value) : 0,
      },
      products: Array.isArray(bar.products) ? bar.products : [],
    });
  }

  if (!singleBar) {
    singleBar = createDefaultCompleteBundleSingleBar();
  }

  const orderedBars = [singleBar, ...bundleBars];
  const explicitDefaultBar = orderedBars.find((bar) => bar.isDefault);
  const fallbackDefaultBar = bundleBars[0] || singleBar;
  const defaultBarId = explicitDefaultBar?.id || fallbackDefaultBar.id;

  return orderedBars.map((bar) =>
    isCompleteBundleSingleBar(bar)
      ? createDefaultCompleteBundleSingleBar({
          ...bar,
          isDefault: bar.id === defaultBarId,
        })
      : {
          ...bar,
          badge: String(bar.badge || ""),
          isDefault: bar.id === defaultBarId,
        },
  );
}

/** 主题 / 下拉选项展示：优先用显式 title，否则用 option 值拼接（与瘦 metafield 变体省略 title 兼容） */
function completeBundleVariantDisplayTitle(
  explicitTitle: unknown,
  selectedOptions: Array<{ name: string; value: string }>,
): string {
  const t = String(explicitTitle ?? "").trim();
  if (t) return t;
  if (!selectedOptions.length) return "";
  return selectedOptions
    .map((o) => String(o.value ?? "").trim())
    .filter(Boolean)
    .join(" / ");
}

export function parseCompleteBundleConfig(
  selectedProductsJson?: string | null,
): CompleteBundleConfig {
  if (!selectedProductsJson) return { triggerProductIds: [], bars: [] };
  try {
    const parsed = JSON.parse(selectedProductsJson) as unknown;
    const parsedRecord = parsed as {
      productIds?: unknown[];
      triggerProductIds?: unknown[];
      bars?: unknown;
    };
    const rawTriggerProductIds = Array.isArray(parsedRecord.triggerProductIds)
      ? parsedRecord.triggerProductIds
      : Array.isArray(parsedRecord.productIds)
        ? parsedRecord.productIds
        : [];
    const triggerProductIds = rawTriggerProductIds
          .map((id) => String(id || "").trim())
          .filter(Boolean);
    const barsInput = parsedRecord.bars;
    if (!Array.isArray(barsInput)) return { triggerProductIds, bars: [] };

    const bars: CompleteBundleBar[] = [];
    for (const rawBar of barsInput) {
      if (!rawBar || typeof rawBar !== "object") continue;
      const id = String((rawBar as { id?: unknown }).id || "").trim();
      if (!id) continue;
      const typeRaw = String((rawBar as { type?: unknown }).type || "quantity-break-same");
      const type: CompleteBundleBar["type"] =
        typeRaw === "single"
          ? "single"
          : "quantity-break-same";
      const quantityNum = Number((rawBar as { quantity?: unknown }).quantity);
      const quantity = Number.isFinite(quantityNum) && quantityNum > 0 ? Math.trunc(quantityNum) : 1;
      const minQuantityRaw = Number((rawBar as { minQuantity?: unknown }).minQuantity);
      const minQuantity =
        Number.isFinite(minQuantityRaw) && minQuantityRaw > 0
          ? Math.trunc(minQuantityRaw)
          : 1;
      const maxQuantityRaw = Number((rawBar as { maxQuantity?: unknown }).maxQuantity);
      const maxQuantityCandidate =
        Number.isFinite(maxQuantityRaw) && maxQuantityRaw > 0
          ? Math.trunc(maxQuantityRaw)
          : quantity;
      const maxQuantity = Math.max(minQuantity, maxQuantityCandidate);
      const excludeTriggerProduct =
        (rawBar as { excludeTriggerProduct?: unknown }).excludeTriggerProduct !== false;

      const pricingRaw = (rawBar as { pricing?: unknown }).pricing;
      const modeRaw = String((pricingRaw as { mode?: unknown })?.mode || "full_price");
      const mode: CompleteBundlePricingMode = (
        ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
      ).includes(modeRaw as CompleteBundlePricingMode)
        ? (modeRaw as CompleteBundlePricingMode)
        : "full_price";
      const valueRaw = Number((pricingRaw as { value?: unknown })?.value);
      const value = Number.isFinite(valueRaw) ? valueRaw : 0;

      const productsRaw = (rawBar as { products?: unknown }).products;
      const products: CompleteBundleProduct[] = Array.isArray(productsRaw)
        ? productsRaw
            .filter((p) => p && typeof p === "object")
            .map((p) => {
              const productId = String((p as { productId?: unknown }).productId || "").trim();
              const variantsRaw = (p as { variants?: unknown }).variants;
              const productPricingRaw = (p as { pricing?: unknown }).pricing;
              const pModeRaw = String((productPricingRaw as { mode?: unknown })?.mode || "");
              const pMode: CompleteBundlePricingMode = (
                ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
              ).includes(pModeRaw as CompleteBundlePricingMode)
                ? (pModeRaw as CompleteBundlePricingMode)
                : "full_price";
              const pValueRaw = Number((productPricingRaw as { value?: unknown })?.value);
              const pValue = Number.isFinite(pValueRaw) ? pValueRaw : 0;
              return {
                productId,
                handle: String((p as { handle?: unknown }).handle || ""),
                title: String((p as { title?: unknown }).title || ""),
                image: String((p as { image?: unknown }).image || ""),
                price: String((p as { price?: unknown }).price || ""),
                defaultVariantId: String((p as { defaultVariantId?: unknown }).defaultVariantId || ""),
                selectedVariantId: String((p as { selectedVariantId?: unknown }).selectedVariantId || ""),
                selectionMode: (
                  String((p as { selectionMode?: unknown }).selectionMode || "") === "variant"
                    ? "variant"
                    : "product"
                ) as "product" | "variant",
                selectedOptions:
                  (p as { selectedOptions?: unknown }).selectedOptions &&
                  typeof (p as { selectedOptions?: unknown }).selectedOptions === "object"
                    ? ((p as { selectedOptions?: Record<string, string> }).selectedOptions || {})
                    : {},
                pricing: { mode: pMode, value: pValue },
                variants: Array.isArray(variantsRaw)
                  ? variantsRaw
                      .filter((v) => v && typeof v === "object")
                      .map((v) => {
                        const selectedOptions = Array.isArray(
                          (v as { selectedOptions?: unknown }).selectedOptions,
                        )
                          ? (
                              (v as { selectedOptions?: Array<{ name?: unknown; value?: unknown }> })
                                .selectedOptions || []
                            ).map((opt) => ({
                              name: String(opt.name || ""),
                              value: String(opt.value || ""),
                            }))
                          : [];
                        return {
                          id: String((v as { id?: unknown }).id || ""),
                          title: completeBundleVariantDisplayTitle(
                            (v as { title?: unknown }).title,
                            selectedOptions,
                          ),
                          price: String((v as { price?: unknown }).price || ""),
                          selectedOptions,
                        };
                      })
                  : [],
              };
            })
            .filter((p) => p.productId)
        : [];

      // 兼容旧数据：仅有 bar 级 pricing、商品未单独配置时，把 bar 的定价合并到第一件商品
      const allProductsDefaultPricing = products.every(
        (p) => p.pricing?.mode === "full_price" && (p.pricing?.value ?? 0) === 0,
      );
      if (products.length && allProductsDefaultPricing && (mode !== "full_price" || value !== 0)) {
        products[0] = { ...products[0], pricing: { mode, value } };
      }

      bars.push(
        type === "single"
          ? createDefaultCompleteBundleSingleBar({
              id,
              title: String((rawBar as { title?: unknown }).title || ""),
              subtitle: String((rawBar as { subtitle?: unknown }).subtitle || ""),
              badge: String((rawBar as { badge?: unknown }).badge || ""),
              isDefault: !!(rawBar as { isDefault?: unknown }).isDefault,
            })
          : {
              id,
              type,
              title: String((rawBar as { title?: unknown }).title || ""),
              subtitle: String((rawBar as { subtitle?: unknown }).subtitle || ""),
              badge: String((rawBar as { badge?: unknown }).badge || ""),
              isDefault: !!(rawBar as { isDefault?: unknown }).isDefault,
              minQuantity,
              maxQuantity,
              excludeTriggerProduct,
              quantity,
              pricing: { mode, value },
              products,
            },
      );
    }
    return { triggerProductIds, bars: normalizeCompleteBundleBars(bars) };
  } catch {
    return { triggerProductIds: [], bars: [] };
  }
}

export function buildCompleteBundleConfig(
  config: CompleteBundleConfig,
): CompleteBundleConfig {
  const bars = Array.isArray(config?.bars) ? config.bars : [];
  return {
    triggerProductIds: Array.isArray(config?.triggerProductIds)
      ? config.triggerProductIds.map((id) => String(id || "").trim()).filter(Boolean)
      : [],
    bars: normalizeCompleteBundleBars(
      bars
        .filter((bar) => bar && typeof bar === "object" && String(bar.id || "").trim())
        .map((bar) => ({
          id: String(bar.id).trim(),
          type:
            bar.type === "single"
              ? "single"
              : "quantity-break-same",
          title: String(bar.title || ""),
          subtitle: String(bar.subtitle || ""),
          badge: String(bar.badge || ""),
          isDefault: !!bar.isDefault,
          minQuantity: Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
          maxQuantity: Math.max(
            Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
            Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
          ),
          excludeTriggerProduct: bar.excludeTriggerProduct !== false,
          quantity: Math.max(
            Math.max(1, Math.trunc(Number(bar.minQuantity) || 1)),
            Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
          ),
          pricing: {
            mode: (
              ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
            ).includes(bar.pricing?.mode as CompleteBundlePricingMode)
              ? (bar.pricing.mode as CompleteBundlePricingMode)
              : "full_price",
            value: Number.isFinite(Number(bar.pricing?.value)) ? Number(bar.pricing?.value) : 0,
          },
          products: Array.isArray(bar.products)
            ? bar.products
                .filter((p) => p && typeof p === "object" && String(p.productId || "").trim())
                .map((p) => ({
                  productId: String(p.productId).trim(),
                  selectedVariantId: String(p.selectedVariantId || ""),
                  selectionMode: p.selectionMode === "variant" ? "variant" : "product",
                  pricing: (() => {
                    const pmRaw = String(p.pricing?.mode || "full_price");
                    const pm: CompleteBundlePricingMode = (
                      ["full_price", "percentage_off", "amount_off", "fixed_price"] as const
                    ).includes(pmRaw as CompleteBundlePricingMode)
                      ? (pmRaw as CompleteBundlePricingMode)
                      : "full_price";
                    const pv = Number.isFinite(Number(p.pricing?.value))
                      ? Number(p.pricing?.value)
                      : 0;
                    return { mode: pm, value: pv };
                  })(),
                }))
            : [],
        })),
    ),
  };
}
