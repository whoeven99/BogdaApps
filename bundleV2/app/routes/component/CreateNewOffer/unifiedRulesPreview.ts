import type { PreviewItem, PreviewProduct } from "../BundlePreview/bundlePreviewShared";
import {
  type CompleteBundleBar,
} from "../../../utils/offerParsing";
import {
  resolveBuilderStandardRuleDisplay,
  resolvePresentationTextWithSource,
} from "./builderStandardDisplayResolver";
import { resolveBuilderCompleteBundleDisplay } from "./builderCompleteBundleDisplayResolver";
import { resolveBuilderDifferentProductsDisplay } from "./builderDifferentProductsDisplayResolver";
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
    title: resolvePresentationTextWithSource(
      rule.presentation.title,
      rule.presentation.titleSource,
      "Single",
    ),
    subtitle: resolvePresentationTextWithSource(
      rule.presentation.subtitle,
      rule.presentation.subtitleSource,
      "Standard price",
    ),
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
  const standardDisplay = resolveBuilderStandardRuleDisplay(rule, {
    baseUnitPrice: params.baseUnitPrice,
    formatPrice: params.formatPrice,
  });

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

  if (standardDisplay) {
    return {
      id: rule.id,
      title: standardDisplay.title,
      subtitle: standardDisplay.subtitle,
      price: standardDisplay.price,
      original: standardDisplay.original,
      featured,
      badge,
      saveLabel: standardDisplay.saveLabel,
    };
  }

  return {
    id: rule.id,
    title: resolvePresentationTextWithSource(
      rule.presentation.title,
      rule.presentation.titleSource,
      `Rule ${index + 1}`,
    ),
    subtitle: resolvePresentationTextWithSource(
      rule.presentation.subtitle,
      rule.presentation.subtitleSource,
      "Offer preview",
    ),
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
  const display = resolveBuilderDifferentProductsDisplay(rule, {
    baseUnitPrice: params.baseUnitPrice,
    formatPrice: params.formatPrice,
    scopedCount,
    scopedProducts,
  });

  return {
    id: rule.id,
    title: display.title,
    subtitle: display.subtitle,
    price: display.price,
    original: display.original,
    featured,
    badge: rule.presentation.badge || undefined,
    saveLabel: display.saveLabel,
    products: display.products,
  };
}

function buildCompleteBundleItem(
  bar: CompleteBundleBar,
  index: number,
  params: BuildPreviewParams,
): PreviewItem {
  const anchorProduct = params.selectedProducts[0];
  const display = resolveBuilderCompleteBundleDisplay(bar, index, {
    anchorProduct,
    anchorBasePrice: Math.max(0, Number(params.baseUnitPrice) || 0),
    formatPrice: params.formatPrice,
  });

  return {
    id: bar.id,
    title: display.title,
    subtitle: display.subtitle,
    price: display.price,
    original: display.original,
    featured: getCompleteBundleFeaturedState(params.completeBundleBars, index),
    badge: bar.badge || undefined,
    saveLabel: display.saveLabel,
    products: display.products,
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
