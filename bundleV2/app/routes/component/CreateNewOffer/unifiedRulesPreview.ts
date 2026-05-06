import type { PreviewItem, PreviewProduct } from "../BundlePreview/bundlePreviewShared";
import type { CompleteBundleBar, CompleteBundlePricingMode } from "../../../utils/offerParsing";
import type { OfferTypeId } from "./offerTypeOptions";
import type { UnifiedRuleNode } from "./unifiedRulesSchema";

type SelectedPreviewProduct = {
  id: string | number;
  title: string;
  image: string;
};

type BuildPreviewParams = {
  offerType: OfferTypeId;
  rules: UnifiedRuleNode[];
  selectedProducts: SelectedPreviewProduct[];
  completeBundleBars: CompleteBundleBar[];
  baseUnitPrice: number;
  formatPrice: (value: number) => string;
};

function parseMoneyStringToNumber(raw?: string): number {
  if (raw == null) return 0;
  const stripped = String(raw).trim().replace(/[^\d.,-]/g, "");
  if (!stripped) return 0;
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let normalized = stripped;
  if (lastComma > lastDot) {
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = stripped.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function applyCompleteBundleProductPricing(
  mode: CompleteBundlePricingMode,
  value: number,
  basePrice: number,
): { final: number; original: number } {
  const original = Math.max(0, basePrice);
  if (mode === "full_price") return { final: original, original };
  if (mode === "percentage_off") {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return { final: Math.round(original * (1 - pct / 100) * 100) / 100, original };
  }
  if (mode === "amount_off") {
    const off = Math.max(0, Number(value) || 0);
    return { final: Math.max(0, Math.round((original - off) * 100) / 100), original };
  }
  const fixed = Math.max(0, Number(value) || 0);
  return { final: Math.round(fixed * 100) / 100, original };
}

function calculatePreviewBundleAmounts(
  unitPrice: number,
  quantity: number,
  discountPercent: number,
) {
  const moneyScale = 10000;
  const safeQty = Math.max(1, Math.trunc(Number(quantity) || 1));
  const safeDiscountPercent = Math.max(0, Math.min(100, Number(discountPercent) || 0));
  const unitPriceScaled = Math.round(unitPrice * moneyScale);
  const originalTotalScaled = unitPriceScaled * safeQty;
  const discountedTotalScaled = Math.round(
    originalTotalScaled * (1 - safeDiscountPercent / 100),
  );
  const originalTotal = Math.round(originalTotalScaled / (moneyScale / 100)) / 100;
  const discountedTotal =
    Math.round(discountedTotalScaled / (moneyScale / 100)) / 100;

  return {
    originalTotal,
    discountedTotal,
    saved: originalTotal - discountedTotal,
  };
}

function getFeaturedState(rules: UnifiedRuleNode[], index: number) {
  const hasDefault = rules.some((rule) => !!rule.presentation.isDefault);
  return hasDefault ? !!rules[index]?.presentation.isDefault : index === 0;
}

function mapProducts(ids: string[], selectedProducts: SelectedPreviewProduct[]): PreviewProduct[] {
  return ids
    .map((productId) =>
      selectedProducts.find((product) => String(product.id) === String(productId)),
    )
    .filter((product): product is SelectedPreviewProduct => Boolean(product))
    .slice(0, 4)
    .map((product) => ({
      image: product.image,
      name: product.title,
    }));
}

function buildStandardRuleItem(
  rule: UnifiedRuleNode,
  index: number,
  params: BuildPreviewParams,
): PreviewItem {
  const featured = getFeaturedState(params.rules, index);
  const badge = rule.presentation.badge || (featured ? "Most Popular" : "");

  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    const percentOff =
      rule.reward.kind === "percentage_off" ? rule.reward.discountPercent : 0;
    return {
      id: rule.id,
      title:
        rule.presentation.title ||
        `Buy ${rule.condition.buyQuantity}, Get ${rule.condition.getQuantity}`,
      subtitle:
        rule.presentation.subtitle ||
        `Same product scope, ${percentOff}% off reward items`,
      price:
        percentOff === 100
          ? `${rule.condition.getQuantity} FREE`
          : `${percentOff}% OFF`,
      featured,
      badge,
      saveLabel: `BUY ${rule.condition.buyQuantity} + GET ${rule.condition.getQuantity}`,
    };
  }

  if (rule.reward.kind === "gift_product" && rule.condition.kind === "item_quantity") {
    return {
      id: rule.id,
      title: rule.presentation.title || `Buy ${rule.condition.count}`,
      subtitle:
        rule.presentation.subtitle ||
        `Unlock ${rule.reward.giftQuantity} free gift${rule.reward.giftQuantity > 1 ? "s" : ""}`,
      price: `${rule.reward.giftQuantity} FREE`,
      featured,
      badge: rule.presentation.badge || (featured ? "Gift included" : ""),
      saveLabel: `TRIGGER AT ${rule.condition.count}`,
    };
  }

  if (
    rule.reward.kind === "percentage_off" &&
    rule.condition.kind === "item_quantity"
  ) {
    const { originalTotal, discountedTotal, saved } = calculatePreviewBundleAmounts(
      params.baseUnitPrice,
      rule.condition.count,
      rule.reward.discountPercent,
    );
    return {
      id: rule.id,
      title: rule.presentation.title || `${rule.condition.count} items`,
      subtitle:
        rule.presentation.subtitle || `You save ${rule.reward.discountPercent}%`,
      price: params.formatPrice(discountedTotal),
      original: params.formatPrice(originalTotal),
      featured,
      badge,
      saveLabel: `SAVE ${params.formatPrice(saved)}`,
    };
  }

  if (
    rule.reward.kind === "percentage_off" &&
    rule.condition.kind === "buy_x_get_y"
  ) {
    return {
      id: rule.id,
      title:
        rule.presentation.title ||
        `Buy ${rule.condition.buyQuantity}, Get ${rule.condition.getQuantity}`,
      subtitle:
        rule.presentation.subtitle ||
        `Across ${
          rule.scope.kind === "buy_get_products"
            ? rule.scope.buyProductIds.length
            : 0
        } buy products`,
      price:
        rule.reward.discountPercent === 100
          ? `${rule.condition.getQuantity} FREE`
          : `${rule.reward.discountPercent}% OFF`,
      featured,
      badge: rule.presentation.badge || (featured ? "Best Reward" : ""),
      saveLabel: `BUY ${rule.condition.buyQuantity} + GET ${rule.condition.getQuantity}`,
      products:
        rule.scope.kind === "buy_get_products"
          ? mapProducts(
              rule.scope.getProductIds.length > 0
                ? rule.scope.getProductIds
                : rule.scope.buyProductIds,
              params.selectedProducts,
            )
          : undefined,
    };
  }

  if (rule.reward.kind === "free_shipping") {
    return {
      id: rule.id,
      title: rule.presentation.title || "Free Shipping",
      subtitle:
        rule.presentation.subtitle || "Unlock free shipping with this rule",
      price: "FREE SHIPPING",
      featured,
      badge,
      saveLabel:
        rule.condition.kind === "item_quantity"
          ? `TRIGGER AT ${rule.condition.count}`
          : "SHIPPING PERK",
    };
  }

  return {
    id: rule.id,
    title: rule.presentation.title || `Rule ${index + 1}`,
    subtitle: rule.presentation.subtitle || "Offer preview",
    price: "CUSTOM",
    featured,
    badge,
  };
}

function buildDifferentProductsItem(
  rule: UnifiedRuleNode,
  index: number,
  params: BuildPreviewParams,
): PreviewItem {
  const featured = getFeaturedState(params.rules, index);

  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    return {
      id: rule.id,
      title:
        rule.presentation.title ||
        `Buy ${rule.condition.buyQuantity}, Get ${rule.condition.getQuantity}`,
      subtitle:
        rule.presentation.subtitle ||
        `Across ${
          rule.scope.kind === "buy_get_products"
            ? rule.scope.buyProductIds.length
            : 0
        } buy products`,
      price:
        rule.reward.kind === "percentage_off" && rule.reward.discountPercent === 100
          ? `${rule.condition.getQuantity} FREE`
          : `${
              rule.reward.kind === "percentage_off"
                ? rule.reward.discountPercent
                : 0
            }% OFF`,
      featured,
      badge: rule.presentation.badge || (featured ? "Best Reward" : ""),
      saveLabel: `BUY ${rule.condition.buyQuantity} + GET ${rule.condition.getQuantity}`,
      products:
        rule.scope.kind === "buy_get_products"
          ? mapProducts(
              rule.scope.getProductIds.length > 0
                ? rule.scope.getProductIds
                : rule.scope.buyProductIds,
              params.selectedProducts,
            )
          : undefined,
    };
  }

  return {
    id: rule.id,
    title:
      rule.presentation.title ||
      (rule.condition.kind === "item_quantity"
        ? `${rule.condition.count} mixed items`
        : `Rule ${index + 1}`),
    subtitle:
      rule.presentation.subtitle ||
      (rule.reward.kind === "percentage_off"
        ? `Mix products and save ${rule.reward.discountPercent}%`
        : "Mix products offer"),
    price:
      rule.reward.kind === "percentage_off"
        ? `${rule.reward.discountPercent}% OFF`
        : "CUSTOM",
    featured,
    badge: rule.presentation.badge || (featured ? "Most Popular" : ""),
    saveLabel:
      rule.condition.kind === "item_quantity"
        ? `COUNT ${rule.condition.count}+`
        : undefined,
    products:
      rule.scope.kind === "shared_product_pool"
        ? mapProducts(rule.scope.productIds, params.selectedProducts)
        : undefined,
  };
}

function buildCompleteBundleItem(
  rule: UnifiedRuleNode,
  index: number,
  params: BuildPreviewParams,
): PreviewItem {
  const barId =
    rule.scope.kind === "bundle_bar_products" ? rule.scope.barId : undefined;
  const bar = barId
    ? params.completeBundleBars.find((entry) => entry.id === barId)
    : undefined;
  const productsCount = Array.isArray(bar?.products) ? bar.products.length : 0;
  let sumOriginal = 0;
  let sumFinal = 0;

  for (const product of bar?.products || []) {
    const variants = Array.isArray((product as any).variants) ? ((product as any).variants as any[]) : [];
    const selectedVariant =
      variants.find((variant) => String(variant?.id) === String((product as any).selectedVariantId)) ||
      variants[0];
    const base = parseMoneyStringToNumber((selectedVariant as any)?.price || (product as any).price);
    const pricing = ((product as any).pricing && typeof (product as any).pricing === "object"
      ? (product as any).pricing
      : {}) as any;
    const mode = (pricing.mode as any) ?? "full_price";
    const value = Number.isFinite(Number(pricing.value)) ? Number(pricing.value) : 0;
    const { final, original } = applyCompleteBundleProductPricing(mode, value, base);
    sumOriginal += original;
    sumFinal += final;
  }

  const saved = Math.max(0, sumOriginal - sumFinal);
  const products = (bar?.products || []).slice(0, 4).map((product) => {
    const variants = Array.isArray((product as any).variants) ? ((product as any).variants as any[]) : [];
    const selectedVariant =
      variants.find((variant) => String(variant?.id) === String((product as any).selectedVariantId)) ||
      variants[0];
    return {
      image: (product as any).image || "https://via.placeholder.com/48",
      name: (product as any).title || "Bundle product",
      variant:
        (selectedVariant as any)?.title && (selectedVariant as any).title !== "Default Title"
          ? (selectedVariant as any).title
          : undefined,
    };
  });

  return {
    id: rule.id,
    title: rule.presentation.title || `Bar #${index + 1}`,
    subtitle:
      rule.presentation.subtitle ||
      `${rule.type === "bxgy" ? "Buy X Get Y" : "Quantity break"} · ${productsCount} products`,
    price: params.formatPrice(sumFinal),
    original: sumOriginal > sumFinal ? params.formatPrice(sumOriginal) : undefined,
    featured: index === 0,
    badge: rule.presentation.badge || (index === 0 ? "Most Popular" : ""),
    saveLabel:
      saved > 0
        ? `SAVE ${params.formatPrice(saved)}`
        : rule.condition.kind === "bundle_completion"
          ? `Qty ${Math.max(1, Number(rule.condition.quantity) || 1)}`
          : undefined,
    products: products.length > 0 ? products : undefined,
  };
}

export function buildUnifiedPreviewItems(params: BuildPreviewParams): PreviewItem[] {
  if (params.offerType === "complete-bundle") {
    return params.rules.map((rule, index) =>
      buildCompleteBundleItem(rule, index, params),
    );
  }

  if (params.offerType === "quantity-breaks-different") {
    return params.rules.map((rule, index) =>
      buildDifferentProductsItem(rule, index, params),
    );
  }

  if (params.offerType === "quantity-breaks-same") {
    return [
      {
        id: "single",
        title: "Single",
        subtitle: "Standard price",
        price: params.formatPrice(params.baseUnitPrice),
      },
      ...params.rules.map((rule, index) =>
        buildStandardRuleItem(rule, index, params),
      ),
    ];
  }

  return params.rules.map((rule, index) =>
    buildStandardRuleItem(rule, index, params),
  );
}

export function buildCompositionPreviewItems(
  params: Omit<BuildPreviewParams, "offerType">,
): PreviewItem[] {
  const mixedParams: BuildPreviewParams = {
    ...params,
    offerType: "quantity-breaks-same",
  };

  return params.rules.map((rule, index) => {
    if (rule.type === "complete_bundle") {
      return buildCompleteBundleItem(rule, index, mixedParams);
    }

    if (rule.sourceOfferType === "quantity-breaks-different") {
      return buildDifferentProductsItem(rule, index, mixedParams);
    }

    return buildStandardRuleItem(rule, index, mixedParams);
  });
}
