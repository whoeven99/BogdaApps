import type {
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  FreeGiftRule,
} from "../../../utils/offerParsing";
import type {
  DraftBxgyDiscountRule,
  DraftDiscountRule,
} from "./campaignDraft";

export type RulePresentationPatch = Partial<{
  title: string;
  subtitle: string;
  badge: string;
  isDefault: boolean;
}>;

type PresentationRule = {
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

function applyIndexedPresentationPatch<T extends PresentationRule>(
  rules: T[],
  index: number,
  patch: RulePresentationPatch,
): T[] {
  return rules.map((rule, ruleIndex) => {
    if (patch.isDefault === true) {
      return { ...rule, isDefault: ruleIndex === index };
    }

    if (patch.isDefault === false && ruleIndex === index) {
      return { ...rule, ...patch, isDefault: false };
    }

    if (ruleIndex !== index) {
      return rule;
    }

    return { ...rule, ...patch };
  });
}

export function updateDiscountRulePresentation(
  rules: DraftDiscountRule[],
  index: number,
  patch: RulePresentationPatch,
): DraftDiscountRule[] {
  return applyIndexedPresentationPatch(rules, index, patch);
}

export function updateBxgyRulePresentation(
  rules: DraftBxgyDiscountRule[],
  index: number,
  patch: RulePresentationPatch,
): DraftBxgyDiscountRule[] {
  return applyIndexedPresentationPatch(rules, index, patch);
}

export function updateFreeGiftRulePresentation(
  rules: FreeGiftRule[],
  index: number,
  patch: RulePresentationPatch,
): FreeGiftRule[] {
  return applyIndexedPresentationPatch(rules, index, patch);
}

export function updateDifferentProductsRulePresentation(
  rules: DifferentProductsDiscountRule[],
  index: number,
  patch: RulePresentationPatch,
): DifferentProductsDiscountRule[] {
  return applyIndexedPresentationPatch(rules, index, patch);
}

export function updateCompleteBundleBarPresentation(
  bars: CompleteBundleBar[],
  barId: string,
  patch: RulePresentationPatch,
): CompleteBundleBar[] {
  return bars.map((bar) =>
    bar.id === barId
      ? {
          ...bar,
          ...(typeof patch.title === "string" ? { title: patch.title } : null),
          ...(typeof patch.subtitle === "string"
            ? { subtitle: patch.subtitle }
            : null),
          ...(typeof patch.badge === "string" ? { badge: patch.badge } : null),
        }
      : bar,
  );
}
