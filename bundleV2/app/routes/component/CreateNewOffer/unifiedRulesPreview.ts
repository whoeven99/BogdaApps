import type { PreviewItem, PreviewProduct } from "../BundlePreview/bundlePreviewShared";
import {
  isCompleteBundleSingleBar,
  type CompleteBundleBar,
  type CompleteBundlePricingMode,
} from "../../../utils/offerParsing";
import { resolveBuilderBxgyDisplay } from "./bxgyDisplayResolver";
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
  const explicitDefaultIndex = rules.findIndex(
    (rule) => rule.presentation.isDefault === true,
  );
  if (explicitDefaultIndex >= 0) {
    return index === explicitDefaultIndex;
  }
  return index === 0;
}

function getCompleteBundleFeaturedState(
  bars: CompleteBundleBar[],
  index: number,
): boolean {
  const explicitDefaultIndex = bars.findIndex((bar) => bar.isDefault === true);
  if (explicitDefaultIndex >= 0) {
    return index === explicitDefaultIndex;
  }
  return index === 0;
}

function buildSinglePurchaseItem(
  rule: UnifiedRuleNode,
  index: number,
  params: BuildPreviewParams,
): PreviewItem {
  const featured = getFeaturedState(params.rules, index);
  return {
    id: rule.id,
    title: rule.presentation.title || "Single",
    subtitle: rule.presentation.subtitle || "Standard price",
    price: params.formatPrice(params.baseUnitPrice),
    featured,
    badge: rule.presentation.badge || undefined,
    products:
      params.selectedProducts[0] != null
        ? [
            {
              image: params.selectedProducts[0].image || "https://via.placeholder.com/48",
              name: params.selectedProducts[0].title || "Current product",
            },
          ]
        : undefined,
  };
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

function mapDifferentProductsPool(
  ids: string[],
  selectedProducts: SelectedPreviewProduct[],
): PreviewProduct[] {
  return ids
    .map((productId) =>
      selectedProducts.find((product) => String(product.id) === String(productId)),
    )
    .filter((product): product is SelectedPreviewProduct => Boolean(product))
    .slice(0, 4)
    .map((product) => ({
      image: product.image,
      name: product.title,
      variant: "Eligible product",
      actionLabel: "Choose",
    }));
}

function buildStandardRuleItem(
  rule: UnifiedRuleNode,
  index: number,
  params: BuildPreviewParams,
): PreviewItem {
  if (rule.type === "single_purchase") {
    return buildSinglePurchaseItem(rule, index, params);
  }
  const featured = getFeaturedState(params.rules, index);
  const badge = rule.presentation.badge || undefined;
  const triggerLabel =
    rule.condition.kind === "cart_amount"
      ? params.formatPrice(rule.condition.amountThreshold)
      : null;

  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    const percentOff =
      rule.reward.kind === "percentage_off" ? rule.reward.discountPercent : 0;
    const bxgyDisplay = resolveBuilderBxgyDisplay(rule.condition, rule.presentation);
    return {
      id: rule.id,
      title: bxgyDisplay.title,
      subtitle: bxgyDisplay.subtitle,
      price:
        percentOff === 100 ? bxgyDisplay.price : `${percentOff}% OFF`,
      featured,
      badge,
      saveLabel: bxgyDisplay.saveLabel,
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
      badge: rule.presentation.badge || undefined,
      saveLabel: `TRIGGER AT ${rule.condition.count}`,
    };
  }

  if (rule.reward.kind === "gift_product" && rule.condition.kind === "cart_amount") {
    return {
      id: rule.id,
      title: rule.presentation.title || `Spend ${triggerLabel}`,
      subtitle:
        rule.presentation.subtitle ||
        `Unlock ${rule.reward.giftQuantity} free gift${rule.reward.giftQuantity > 1 ? "s" : ""}`,
      price: `${rule.reward.giftQuantity} FREE`,
      featured,
      badge: rule.presentation.badge || undefined,
      saveLabel: `UNLOCK AT ${triggerLabel}`,
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
    rule.condition.kind === "cart_amount"
  ) {
    const rewardLabel =
      rule.reward.discountClass === "order" ? "order" : "selected products";
    return {
      id: rule.id,
      title: rule.presentation.title || `Spend ${triggerLabel}`,
      subtitle:
        rule.presentation.subtitle ||
        `Unlock ${rule.reward.discountPercent}% off ${rewardLabel}`,
      price: `${rule.reward.discountPercent}% OFF`,
      featured,
      badge,
      saveLabel: `AT ${triggerLabel}`,
    };
  }

  if (
    rule.reward.kind === "percentage_off" &&
    rule.condition.kind === "buy_x_get_y"
  ) {
    const bxgyDisplay = resolveBuilderBxgyDisplay(rule.condition, rule.presentation);
    return {
      id: rule.id,
      title: bxgyDisplay.title,
      subtitle: bxgyDisplay.subtitle,
      price: bxgyDisplay.price,
      featured,
      badge: rule.presentation.badge || undefined,
      saveLabel: bxgyDisplay.saveLabel,
      products:
        rule.scope.kind === "buy_get_products"
          ? mapProducts(
              rule.scope.buyProductIds,
              params.selectedProducts,
            )
          : undefined,
    };
  }

  if (rule.reward.kind === "free_shipping") {
    return {
      id: rule.id,
      title:
        rule.presentation.title ||
        (rule.condition.kind === "cart_amount" ? `Spend ${triggerLabel}` : "Free Shipping"),
      subtitle:
        rule.presentation.subtitle ||
        (rule.condition.kind === "cart_amount"
          ? "Unlock free shipping once the cart threshold is met"
          : "Unlock free shipping with this rule"),
      price: "FREE SHIPPING",
      featured,
      badge,
      saveLabel:
        rule.condition.kind === "item_quantity"
          ? `TRIGGER AT ${rule.condition.count}`
          : `AT ${triggerLabel}`,
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
  if (rule.type === "single_purchase") {
    return buildSinglePurchaseItem(rule, index, params);
  }
  const featured = getFeaturedState(params.rules, index);
  const productPoolIds =
    rule.scope.kind === "shared_product_pool"
      ? rule.scope.productIds
      : rule.scope.kind === "buy_get_products"
        ? rule.scope.buyProductIds
        : [];
  const scopedProducts = mapDifferentProductsPool(productPoolIds, params.selectedProducts);
  const scopedCount = productPoolIds.length;

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
      title: rule.presentation.title || `Any ${rule.condition.count} items`,
      subtitle:
        rule.presentation.subtitle ||
        `Mix any ${rule.condition.count} from ${scopedCount} eligible product${scopedCount === 1 ? "" : "s"}`,
      price: params.formatPrice(discountedTotal),
      original: params.formatPrice(originalTotal),
      featured,
      badge: rule.presentation.badge || undefined,
      saveLabel: `SAVE ${params.formatPrice(saved)}`,
      products: scopedProducts.length > 0 ? scopedProducts : undefined,
    };
  }

  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    return {
      id: rule.id,
      title:
        rule.presentation.title ||
        `Buy ${rule.condition.buyQuantity}, get ${rule.condition.getQuantity}`,
      subtitle:
        rule.presentation.subtitle ||
        `Mix any ${rule.condition.triggerCount} from ${scopedCount} eligible product${scopedCount === 1 ? "" : "s"}`,
      price:
        rule.reward.kind === "percentage_off"
          ? `${rule.reward.discountPercent}% OFF`
          : "CUSTOM",
      featured,
      badge: rule.presentation.badge || undefined,
      saveLabel: `GET ${rule.condition.getQuantity} FREE`,
      products: scopedProducts.length > 0 ? scopedProducts : undefined,
    };
  }

  return {
    id: rule.id,
    title: rule.presentation.title || `Rule ${index + 1}`,
    subtitle:
      rule.presentation.subtitle ||
      `Mix across ${scopedCount} eligible product${scopedCount === 1 ? "" : "s"}`,
    price:
      rule.reward.kind === "percentage_off"
        ? `${rule.reward.discountPercent}% OFF`
        : "CUSTOM",
    featured,
    badge: rule.presentation.badge || undefined,
    products: scopedProducts.length > 0 ? scopedProducts : undefined,
  };
}

function buildCompleteBundleItem(
  bar: CompleteBundleBar,
  index: number,
  params: BuildPreviewParams,
): PreviewItem {
  const anchorProduct = params.selectedProducts[0];
  const anchorBase = Math.max(0, Number(params.baseUnitPrice) || 0);
  if (isCompleteBundleSingleBar(bar)) {
    if (!anchorProduct && anchorBase <= 0) {
      return {
        id: bar.id,
        title: bar.title || "Single",
        subtitle: bar.subtitle || "Standard price",
        price: params.formatPrice(0),
      };
    }
    return {
      id: bar.id,
      title: bar.title || "Single",
      subtitle: bar.subtitle || "Standard price",
      price: params.formatPrice(anchorBase),
      featured: getCompleteBundleFeaturedState(params.completeBundleBars, index),
      products: anchorProduct
        ? [
            {
              image: anchorProduct.image || "https://via.placeholder.com/48",
              name: anchorProduct.title || "Current product",
            },
          ]
        : undefined,
    };
  }

  const productsCount = Array.isArray(bar.products) ? bar.products.length : 0;
  let sumOriginal = anchorBase;

  for (const product of bar.products || []) {
    const selectedVariant =
      product.variants?.find((variant) => variant.id === product.selectedVariantId) ||
      product.variants?.[0];
    const base = parseMoneyStringToNumber(selectedVariant?.price || product.price);
    sumOriginal += Math.max(0, base);
  }

  const { final: sumFinal } = applyCompleteBundleProductPricing(
    bar?.pricing?.mode ?? "full_price",
    Number(bar?.pricing?.value) || 0,
    sumOriginal,
  );

  const saved = Math.max(0, sumOriginal - sumFinal);
  const products = [
    anchorProduct
      ? {
          image: anchorProduct.image || "https://via.placeholder.com/48",
          name: anchorProduct.title || "Current product",
        }
      : null,
    ...(bar?.products || []).slice(0, 3).map((product) => {
      const selectedVariant =
        product.variants?.find((variant) => variant.id === product.selectedVariantId) ||
        product.variants?.[0];
      return {
        image: product.image || "https://via.placeholder.com/48",
        name: product.title || "Bundle item",
        variant:
          selectedVariant?.title && selectedVariant.title !== "Default Title"
            ? selectedVariant.title
            : undefined,
      };
    }),
  ].filter(Boolean) as PreviewProduct[];
  const minQuantity = Math.max(1, Math.trunc(Number(bar?.minQuantity) || 1));
  const maxQuantity = Math.max(
    minQuantity,
    Math.trunc(Number(bar?.maxQuantity) || Number(bar?.quantity) || 1),
  );

  return {
    id: bar.id,
    title: bar.title || `Bar #${index + 1}`,
    subtitle:
      bar.subtitle ||
      `Current product + ${minQuantity}-${maxQuantity} bundle items from ${productsCount} options`,
    price: params.formatPrice(sumFinal),
    original: sumOriginal > sumFinal ? params.formatPrice(sumOriginal) : undefined,
    featured: getCompleteBundleFeaturedState(params.completeBundleBars, index),
    badge: bar.badge || undefined,
    saveLabel:
      saved > 0
        ? `SAVE ${params.formatPrice(saved)}`
        : `SELECT ${maxQuantity} ITEMS`,
    products: products.length > 0 ? products : undefined,
  };
}

export function buildUnifiedPreviewItems(params: BuildPreviewParams): PreviewItem[] {
  if (params.offerType === "complete-bundle") {
    return params.completeBundleBars.map((bar, index) =>
      buildCompleteBundleItem(bar, index, params),
    );
  }

  if (params.offerType === "quantity-breaks-different") {
    return params.rules.map((rule, index) => buildDifferentProductsItem(rule, index, params));
  }

  return params.rules.map((rule, index) => buildStandardRuleItem(rule, index, params));
}

export function buildCompositionPreviewItems(
  params: Omit<BuildPreviewParams, "offerType">,
): PreviewItem[] {
  const mixedParams: BuildPreviewParams = {
    ...params,
    rules: params.rules,
    offerType: "quantity-breaks-same",
  };

  return [
    ...params.rules.map((rule, index) => {
      if (rule.type === "complete_bundle") {
        const barId = rule.scope.kind === "bundle_bar_products" ? rule.scope.barId : undefined;
        const bar =
          params.completeBundleBars.find((entry) => entry.id === barId) ||
          params.completeBundleBars[index];
        if (bar) {
          return buildCompleteBundleItem(bar, index, mixedParams);
        }
      }

      if (rule.sourceOfferType === "quantity-breaks-different") {
        return buildDifferentProductsItem(rule, index, mixedParams);
      }

      return buildStandardRuleItem(rule, index, mixedParams);
    }),
  ];
}
