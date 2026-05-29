import type { PreviewProduct } from "../BundlePreview/bundlePreviewShared";
import type { UnifiedRuleNode } from "./unifiedRulesSchema";
import { calculatePreviewBundleAmounts } from "./builderStandardDisplayResolver";
import { resolveBuilderBxgyDisplay } from "./bxgyDisplayResolver";
import type { BuilderDisplayCard } from "./displayCardContract";

const DIFFERENT_PRODUCTS_AUTO_TITLE_PATTERN = /^(any\s+\d+\s+items|rule)$/i;
const DIFFERENT_PRODUCTS_AUTO_SUBTITLE_PATTERN =
  /includes .* trigger product|mix any \d+ from \d+ (?:eligible|shared-pool) products|mix across \d+ (?:eligible|shared-pool) products/i;

export type BuilderDifferentProductsDisplayContext = {
  baseUnitPrice: number;
  formatPrice: (value: number) => string;
  scopedCount: number;
  scopedProducts?: PreviewProduct[];
};

function buildSharedPoolProductsLabel(scopedCount: number): string {
  return `${scopedCount} shared-pool product${scopedCount === 1 ? "" : "s"}`;
}

function resolveDifferentProductsTitle(explicitTitle: unknown, fallbackTitle: string): string {
  const normalizedTitle = String(explicitTitle ?? "").trim();
  if (normalizedTitle && !DIFFERENT_PRODUCTS_AUTO_TITLE_PATTERN.test(normalizedTitle)) {
    return normalizedTitle;
  }
  return fallbackTitle;
}

function resolveDifferentProductsSubtitle(
  explicitSubtitle: unknown,
  fallbackSubtitle: string,
): string {
  const normalizedSubtitle = String(explicitSubtitle ?? "").trim();
  if (
    normalizedSubtitle &&
    !DIFFERENT_PRODUCTS_AUTO_SUBTITLE_PATTERN.test(normalizedSubtitle)
  ) {
    return normalizedSubtitle;
  }
  return fallbackSubtitle;
}

function resolveDifferentProductsTitleWithSource(
  explicitTitle: unknown,
  explicitTitleSource: "auto" | "custom" | undefined,
  fallbackTitle: string,
): string {
  if (explicitTitleSource === "custom") {
    const normalizedTitle = String(explicitTitle ?? "").trim();
    return normalizedTitle || fallbackTitle;
  }
  return resolveDifferentProductsTitle(explicitTitle, fallbackTitle);
}

function resolveDifferentProductsSubtitleWithSource(
  explicitSubtitle: unknown,
  explicitSubtitleSource: "auto" | "custom" | undefined,
  fallbackSubtitle: string,
): string {
  if (explicitSubtitleSource === "custom") {
    const normalizedSubtitle = String(explicitSubtitle ?? "").trim();
    return normalizedSubtitle || fallbackSubtitle;
  }
  return resolveDifferentProductsSubtitle(explicitSubtitle, fallbackSubtitle);
}

export function resolveBuilderDifferentProductsDisplay(
  rule: UnifiedRuleNode,
  context: BuilderDifferentProductsDisplayContext,
): BuilderDisplayCard {
  if (
    rule.reward.kind === "percentage_off" &&
    rule.condition.kind === "item_quantity"
  ) {
    const { originalTotal, discountedTotal, saved } = calculatePreviewBundleAmounts(
      context.baseUnitPrice,
      rule.condition.count,
      rule.reward.discountPercent,
    );
    return {
      title: resolveDifferentProductsTitleWithSource(
        rule.presentation.title,
        rule.presentation.titleSource,
        `Any ${rule.condition.count} items`,
      ),
      subtitle: resolveDifferentProductsSubtitleWithSource(
        rule.presentation.subtitle,
        rule.presentation.subtitleSource,
        `Mix any ${rule.condition.count} from ${buildSharedPoolProductsLabel(context.scopedCount)}`,
      ),
      price: context.formatPrice(discountedTotal),
      original: context.formatPrice(originalTotal),
      saveLabel: `SAVE ${context.formatPrice(saved)}`,
      products: context.scopedProducts && context.scopedProducts.length > 0
        ? context.scopedProducts
        : undefined,
    };
  }

  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    const bxgyDisplay = resolveBuilderBxgyDisplay(rule.condition, rule.presentation);
    return {
      title: bxgyDisplay.title,
      subtitle: resolveDifferentProductsSubtitleWithSource(
        rule.presentation.subtitle,
        rule.presentation.subtitleSource,
        `Mix any ${rule.condition.triggerCount} from ${buildSharedPoolProductsLabel(context.scopedCount)}`,
      ),
      price:
        rule.reward.kind === "percentage_off"
          ? `${rule.reward.discountPercent}% OFF`
          : "CUSTOM",
      saveLabel: bxgyDisplay.saveLabel,
      products: context.scopedProducts && context.scopedProducts.length > 0
        ? context.scopedProducts
        : undefined,
    };
  }

  return {
    title: resolveDifferentProductsTitleWithSource(
      rule.presentation.title,
      rule.presentation.titleSource,
      "Rule",
    ),
    subtitle: resolveDifferentProductsSubtitleWithSource(
      rule.presentation.subtitle,
      rule.presentation.subtitleSource,
      `Mix across ${buildSharedPoolProductsLabel(context.scopedCount)}`,
    ),
    price:
      rule.reward.kind === "percentage_off"
        ? `${rule.reward.discountPercent}% OFF`
        : "CUSTOM",
    products: context.scopedProducts && context.scopedProducts.length > 0
      ? context.scopedProducts
      : undefined,
  };
}
