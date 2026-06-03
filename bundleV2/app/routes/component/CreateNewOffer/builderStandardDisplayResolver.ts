import type { UnifiedRuleNode } from "./unifiedRulesSchema";
import type { BuilderDisplayCard } from "./displayCardContract";

export type BuilderStandardDisplayContext = {
  baseUnitPrice: number;
  formatPrice: (value: number) => string;
};

export function resolvePresentationTextWithSource(
  explicitValue: unknown,
  explicitSource: "auto" | "custom" | undefined,
  fallbackValue: string,
): string {
  const normalizedValue = String(explicitValue ?? "").trim();
  if (explicitSource === "custom") {
    return normalizedValue || fallbackValue;
  }
  if (explicitSource === "auto") {
    return fallbackValue;
  }
  return normalizedValue || fallbackValue;
}

export function calculatePreviewBundleAmounts(
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

export function resolveBuilderStandardRuleDisplay(
  rule: UnifiedRuleNode,
  context: BuilderStandardDisplayContext,
): BuilderDisplayCard | null {
  const triggerLabel =
    rule.condition.kind === "cart_amount"
      ? context.formatPrice(rule.condition.amountThreshold)
      : null;

  if (rule.reward.kind === "gift_product" && rule.condition.kind === "item_quantity") {
    return {
      title: resolvePresentationTextWithSource(
        rule.presentation.title,
        rule.presentation.titleSource,
        `Buy ${rule.condition.count}`,
      ),
      subtitle: resolvePresentationTextWithSource(
        rule.presentation.subtitle,
        rule.presentation.subtitleSource,
        `Unlock ${rule.reward.giftQuantity} free gift${rule.reward.giftQuantity > 1 ? "s" : ""}`,
      ),
      price: `${rule.reward.giftQuantity} FREE`,
      saveLabel: `TRIGGER AT ${rule.condition.count}`,
    };
  }

  if (rule.reward.kind === "gift_product" && rule.condition.kind === "cart_amount") {
    return {
      title: resolvePresentationTextWithSource(
        rule.presentation.title,
        rule.presentation.titleSource,
        `Spend ${triggerLabel}`,
      ),
      subtitle: resolvePresentationTextWithSource(
        rule.presentation.subtitle,
        rule.presentation.subtitleSource,
        `Unlock ${rule.reward.giftQuantity} free gift${rule.reward.giftQuantity > 1 ? "s" : ""}`,
      ),
      price: `${rule.reward.giftQuantity} FREE`,
      saveLabel: `UNLOCK AT ${triggerLabel}`,
    };
  }

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
      title: resolvePresentationTextWithSource(
        rule.presentation.title,
        rule.presentation.titleSource,
        `${rule.condition.count} items`,
      ),
      subtitle: resolvePresentationTextWithSource(
        rule.presentation.subtitle,
        rule.presentation.subtitleSource,
        `You save ${rule.reward.discountPercent}%`,
      ),
      price: context.formatPrice(discountedTotal),
      original: context.formatPrice(originalTotal),
      saveLabel: `SAVE ${context.formatPrice(saved)}`,
    };
  }

  if (
    rule.reward.kind === "percentage_off" &&
    rule.condition.kind === "cart_amount"
  ) {
    const rewardLabel =
      rule.reward.discountClass === "order" ? "order" : "selected products";
    return {
      title: resolvePresentationTextWithSource(
        rule.presentation.title,
        rule.presentation.titleSource,
        `Spend ${triggerLabel}`,
      ),
      subtitle: resolvePresentationTextWithSource(
        rule.presentation.subtitle,
        rule.presentation.subtitleSource,
        `Unlock ${rule.reward.discountPercent}% off ${rewardLabel}`,
      ),
      price: `${rule.reward.discountPercent}% OFF`,
      saveLabel: `AT ${triggerLabel}`,
    };
  }

  if (rule.reward.kind === "free_shipping") {
    return {
      title: resolvePresentationTextWithSource(
        rule.presentation.title,
        rule.presentation.titleSource,
        rule.condition.kind === "cart_amount" ? `Spend ${triggerLabel}` : "Free Shipping",
      ),
      subtitle: resolvePresentationTextWithSource(
        rule.presentation.subtitle,
        rule.presentation.subtitleSource,
        rule.condition.kind === "cart_amount"
          ? "Unlock free shipping once the cart threshold is met"
          : "Unlock free shipping with this rule",
      ),
      price: "FREE SHIPPING",
      saveLabel:
        rule.condition.kind === "item_quantity"
          ? `TRIGGER AT ${rule.condition.count}`
          : `AT ${triggerLabel}`,
    };
  }

  return null;
}
