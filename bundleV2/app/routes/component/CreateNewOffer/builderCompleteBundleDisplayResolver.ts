import type { PreviewItem, PreviewProduct } from "../BundlePreview/bundlePreviewShared";
import {
  isCompleteBundleSingleBar,
  type CompleteBundleBar,
  type CompleteBundlePricingMode,
} from "../../../utils/offerParsing";
import type { BuilderDisplayCard } from "./displayCardContract";

const COMPLETE_BUNDLE_AUTO_TITLE_PATTERN = /^(single|bar #\d+|complete the bundle)$/i;
const COMPLETE_BUNDLE_AUTO_SUBTITLE_PATTERN =
  /standard price|pick \d+-\d+ bundle items|current product \+ \d+-\d+ bundle items from \d+ options/i;

type SelectedPreviewProduct = {
  id: string | number;
  title: string;
  image: string;
};

export type BuilderCompleteBundleDisplayContext = {
  anchorProduct?: SelectedPreviewProduct;
  anchorBasePrice: number;
  formatPrice: (value: number) => string;
};

function resolveCompleteBundleTitle(explicitTitle: unknown, fallbackTitle: string): string {
  const normalizedTitle = String(explicitTitle ?? "").trim();
  if (normalizedTitle && !COMPLETE_BUNDLE_AUTO_TITLE_PATTERN.test(normalizedTitle)) {
    return normalizedTitle;
  }
  return fallbackTitle;
}

function resolveCompleteBundleSubtitle(
  explicitSubtitle: unknown,
  fallbackSubtitle: string,
): string {
  const normalizedSubtitle = String(explicitSubtitle ?? "").trim();
  if (
    normalizedSubtitle &&
    !COMPLETE_BUNDLE_AUTO_SUBTITLE_PATTERN.test(normalizedSubtitle)
  ) {
    return normalizedSubtitle;
  }
  return fallbackSubtitle;
}

function resolveCompleteBundleTitleWithSource(
  explicitTitle: unknown,
  explicitTitleSource: "auto" | "custom" | undefined,
  fallbackTitle: string,
): string {
  if (explicitTitleSource === "custom") {
    const normalizedTitle = String(explicitTitle ?? "").trim();
    return normalizedTitle || fallbackTitle;
  }
  return resolveCompleteBundleTitle(explicitTitle, fallbackTitle);
}

function resolveCompleteBundleSubtitleWithSource(
  explicitSubtitle: unknown,
  explicitSubtitleSource: "auto" | "custom" | undefined,
  fallbackSubtitle: string,
): string {
  if (explicitSubtitleSource === "custom") {
    const normalizedSubtitle = String(explicitSubtitle ?? "").trim();
    return normalizedSubtitle || fallbackSubtitle;
  }
  return resolveCompleteBundleSubtitle(explicitSubtitle, fallbackSubtitle);
}

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

export function resolveBuilderCompleteBundleDisplay(
  bar: CompleteBundleBar,
  index: number,
  context: BuilderCompleteBundleDisplayContext,
): BuilderDisplayCard {
  const anchorProductPreview = context.anchorProduct
    ? {
        image: context.anchorProduct.image || "https://via.placeholder.com/48",
        name: context.anchorProduct.title || "Current product",
      }
    : null;

  if (isCompleteBundleSingleBar(bar)) {
    return {
      title: resolveCompleteBundleTitleWithSource(
        bar.title,
        bar.titleSource,
        "Single",
      ),
      subtitle: resolveCompleteBundleSubtitleWithSource(
        bar.subtitle,
        bar.subtitleSource,
        "Standard price",
      ),
      price: context.formatPrice(context.anchorBasePrice),
      products: anchorProductPreview ? [anchorProductPreview] : undefined,
    };
  }

  const productsCount = Array.isArray(bar.products) ? bar.products.length : 0;
  let sumOriginal = context.anchorBasePrice;

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
    anchorProductPreview,
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
    title: resolveCompleteBundleTitleWithSource(
      bar.title,
      bar.titleSource,
      `Bar #${index + 1}`,
    ),
    subtitle: resolveCompleteBundleSubtitleWithSource(
      bar.subtitle,
      bar.subtitleSource,
      `Current product + ${minQuantity}-${maxQuantity} bundle items from ${productsCount} options`,
    ),
    price: context.formatPrice(sumFinal),
    original: sumOriginal > sumFinal ? context.formatPrice(sumOriginal) : undefined,
    saveLabel:
      saved > 0
        ? `SAVE ${context.formatPrice(saved)}`
        : `SELECT ${maxQuantity} ITEMS`,
    products: products.length > 0 ? products : undefined,
  };
}
