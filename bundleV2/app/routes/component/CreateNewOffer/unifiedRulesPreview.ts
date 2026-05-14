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
  const featured = getFeaturedState(params.rules, index);
  const badge = rule.presentation.badge || (featured ? "Most Popular" : "");
  const triggerLabel =
    rule.condition.kind === "cart_amount"
      ? params.formatPrice(rule.condition.amountThreshold)
      : null;

  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    const percentOff =
      rule.reward.kind === "percentage_off" ? rule.reward.discountPercent : 0;
    return {
      id: rule.id,
      title:
        rule.presentation.title ||
        `Buy ${rule.condition.buyQuantity}, Get ${rule.condition.getQuantity} Free`,
      subtitle:
        rule.presentation.subtitle ||
        `Same product scope, Buy ${rule.condition.buyQuantity}, Get ${rule.condition.getQuantity} Free`,
      price:
        percentOff === 100
          ? `Get ${rule.condition.getQuantity} Free`
          : `${percentOff}% OFF`,
      featured,
      badge,
      saveLabel: `BUY ${rule.condition.buyQuantity}, GET ${rule.condition.getQuantity} FREE`,
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

  if (rule.reward.kind === "gift_product" && rule.condition.kind === "cart_amount") {
    return {
      id: rule.id,
      title: rule.presentation.title || `Spend ${triggerLabel}`,
      subtitle:
        rule.presentation.subtitle ||
        `Unlock ${rule.reward.giftQuantity} free gift${rule.reward.giftQuantity > 1 ? "s" : ""}`,
      price: `${rule.reward.giftQuantity} FREE`,
      featured,
      badge: rule.presentation.badge || (featured ? "Gift included" : ""),
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
    return {
      id: rule.id,
      title:
        rule.presentation.title ||
        `Buy ${rule.condition.buyQuantity}, Get ${rule.condition.getQuantity} Free`,
      subtitle:
        rule.presentation.subtitle ||
        `Same product scope across ${
          rule.scope.kind === "buy_get_products"
            ? rule.scope.buyProductIds.length
            : 0
        } selected products`,
      price: `Get ${rule.condition.getQuantity} Free`,
      featured,
      badge: rule.presentation.badge || (featured ? "Best Reward" : ""),
      saveLabel: `BUY ${rule.condition.buyQuantity}, GET ${rule.condition.getQuantity} FREE`,
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
        `Choose from ${scopedCount} eligible product${scopedCount === 1 ? "" : "s"}`,
      price: params.formatPrice(discountedTotal),
      original: params.formatPrice(originalTotal),
      featured,
      badge: rule.presentation.badge || (featured ? "Most Popular" : ""),
      saveLabel: `SAVE ${params.formatPrice(saved)}`,
      products: scopedProducts.length > 0 ? scopedProducts : undefined,
    };
  }

  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    return {
      id: rule.id,
      title: rule.presentation.title || `Any ${rule.condition.triggerCount} items`,
      subtitle:
        rule.presentation.subtitle ||
        `Legacy mix-and-match reward across ${scopedCount} eligible product${scopedCount === 1 ? "" : "s"}`,
      price:
        rule.reward.kind === "percentage_off"
          ? `${rule.reward.discountPercent}% OFF`
          : "CUSTOM",
      featured,
      badge: rule.presentation.badge || (featured ? "Recommended" : ""),
      saveLabel: `AT ${rule.condition.triggerCount} ITEMS`,
      products: scopedProducts.length > 0 ? scopedProducts : undefined,
    };
  }

  return {
    id: rule.id,
    title: rule.presentation.title || `Rule ${index + 1}`,
    subtitle:
      rule.presentation.subtitle ||
      `Choose from ${scopedCount} eligible product${scopedCount === 1 ? "" : "s"}`,
    price:
      rule.reward.kind === "percentage_off"
        ? `${rule.reward.discountPercent}% OFF`
        : "CUSTOM",
    featured,
    badge: rule.presentation.badge || (featured ? "Most Popular" : ""),
    products: scopedProducts.length > 0 ? scopedProducts : undefined,
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
  const anchorProduct = params.selectedProducts[0];
  const anchorBase = Math.max(0, Number(params.baseUnitPrice) || 0);
  let sumOriginal = anchorBase;

  for (const product of bar?.products || []) {
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
    id: rule.id,
    title: rule.presentation.title || `Bar #${index + 1}`,
    subtitle:
      rule.presentation.subtitle ||
      `Current product + ${minQuantity}-${maxQuantity} bundle items from ${productsCount} options`,
    price: params.formatPrice(sumFinal),
    original: sumOriginal > sumFinal ? params.formatPrice(sumOriginal) : undefined,
    featured: index === 0,
    badge: rule.presentation.badge || (index === 0 ? "Most Popular" : ""),
    saveLabel:
      saved > 0
        ? `SAVE ${params.formatPrice(saved)}`
        : rule.condition.kind === "bundle_completion"
          ? `SELECT ${Math.max(1, Number(rule.condition.quantity) || 1)} ITEMS`
          : undefined,
    products: products.length > 0 ? products : undefined,
  };
}

function buildCompleteBundleSingleItem(
  params: BuildPreviewParams,
): PreviewItem | null {
  const currentProduct = params.selectedProducts[0];
  const base = Math.max(0, Number(params.baseUnitPrice) || 0);
  if (!currentProduct && base <= 0) return null;

  return {
    id: "complete-bundle-single",
    title: currentProduct?.title || "Current product",
    subtitle: "Standard price",
    price: params.formatPrice(base),
  };
}

export function buildUnifiedPreviewItems(params: BuildPreviewParams): PreviewItem[] {
  if (params.offerType === "complete-bundle") {
    const singleItem = buildCompleteBundleSingleItem(params);
    const bundleItems = params.rules
      .filter((rule) => rule.sourceOfferType === "complete-bundle")
      .map((rule, index) => buildCompleteBundleItem(rule, index, params));
    return singleItem ? [singleItem, ...bundleItems] : bundleItems;
  }

  if (params.offerType === "quantity-breaks-different") {
    return [
      {
        id: "single",
        title: "Single",
        subtitle: "Standard price",
        price: params.formatPrice(params.baseUnitPrice),
      },
      ...params.rules.map((rule, index) =>
        buildDifferentProductsItem(rule, index, params),
      ),
    ];
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
