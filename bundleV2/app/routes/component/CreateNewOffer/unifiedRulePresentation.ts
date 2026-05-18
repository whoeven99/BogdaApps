import type {
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  FreeGiftRule,
} from "../../../utils/offerParsing";
import type {
  DraftBxgyDiscountRule,
  DraftDiscountRule,
} from "./campaignDraft";
import {
  getBxgyUnifiedRuleId,
  getDifferentProductsUnifiedRuleId,
  getFreeGiftUnifiedRuleId,
  getUnifiedDiscountRuleId,
} from "./unifiedRuleValues";

export type RulePresentationPatch = Partial<{
  title: string;
  subtitle: string;
  badge: string;
  isDefault: boolean;
}>;

type PresentationRule = {
  title?: string;
  subtitle?: string;
  titleSource?: "auto" | "custom";
  subtitleSource?: "auto" | "custom";
  badge?: string;
  isDefault?: boolean;
};

function applyPresentationPatchByRuleId<T extends PresentationRule>(
  rules: T[],
  matchesRuleId: (rule: T, index: number) => boolean,
  patch: RulePresentationPatch,
): T[] {
  return rules.map((rule, ruleIndex) => {
    const isTarget = matchesRuleId(rule, ruleIndex);

    if (patch.isDefault === true) {
      return { ...rule, isDefault: isTarget };
    }

    if (patch.isDefault === false && isTarget) {
      return {
        ...rule,
        ...patch,
        ...(typeof patch.title === "string" ? { titleSource: "custom" as const } : null),
        ...(typeof patch.subtitle === "string"
          ? { subtitleSource: "custom" as const }
          : null),
        isDefault: false,
      };
    }

    if (!isTarget) {
      return rule;
    }

    return {
      ...rule,
      ...patch,
      ...(typeof patch.title === "string" ? { titleSource: "custom" as const } : null),
      ...(typeof patch.subtitle === "string"
        ? { subtitleSource: "custom" as const }
        : null),
    };
  });
}

export function updateDiscountRulePresentation(
  rules: DraftDiscountRule[],
  ruleId: string,
  patch: RulePresentationPatch,
): DraftDiscountRule[] {
  return applyPresentationPatchByRuleId(
    rules,
    (rule, index) => getUnifiedDiscountRuleId(rule, index) === ruleId,
    patch,
  );
}

export function updateBxgyRulePresentation(
  rules: DraftBxgyDiscountRule[],
  ruleId: string,
  patch: RulePresentationPatch,
): DraftBxgyDiscountRule[] {
  return applyPresentationPatchByRuleId(
    rules,
    (rule, index) => getBxgyUnifiedRuleId(rule, index) === ruleId,
    patch,
  );
}

export function updateFreeGiftRulePresentation(
  rules: FreeGiftRule[],
  ruleId: string,
  patch: RulePresentationPatch,
): FreeGiftRule[] {
  return applyPresentationPatchByRuleId(
    rules,
    (rule, index) => getFreeGiftUnifiedRuleId(rule, index) === ruleId,
    patch,
  );
}

export function updateDifferentProductsRulePresentation(
  rules: DifferentProductsDiscountRule[],
  ruleId: string,
  patch: RulePresentationPatch,
): DifferentProductsDiscountRule[] {
  return applyPresentationPatchByRuleId(
    rules,
    (rule, index) => getDifferentProductsUnifiedRuleId(rule, index) === ruleId,
    patch,
  );
}

export function updateCompleteBundleBarPresentation(
  bars: CompleteBundleBar[],
  barId: string,
  patch: RulePresentationPatch,
): CompleteBundleBar[] {
  return bars.map((bar) => {
    if (patch.isDefault === true) {
      return {
        ...bar,
        ...(typeof patch.title === "string" && bar.id === barId ? { title: patch.title } : null),
        ...(typeof patch.title === "string" && bar.id === barId
          ? { titleSource: "custom" as const }
          : null),
        ...(typeof patch.subtitle === "string" && bar.id === barId
          ? { subtitle: patch.subtitle }
          : null),
        ...(typeof patch.subtitle === "string" && bar.id === barId
          ? { subtitleSource: "custom" as const }
          : null),
        ...(typeof patch.badge === "string" && bar.id === barId ? { badge: patch.badge } : null),
        isDefault: bar.id === barId,
      };
    }

    if (bar.id !== barId) {
      return bar;
    }

    return {
      ...bar,
      ...(typeof patch.title === "string" ? { title: patch.title } : null),
      ...(typeof patch.title === "string" ? { titleSource: "custom" as const } : null),
      ...(typeof patch.subtitle === "string" ? { subtitle: patch.subtitle } : null),
      ...(typeof patch.subtitle === "string"
        ? { subtitleSource: "custom" as const }
        : null),
      ...(typeof patch.badge === "string" ? { badge: patch.badge } : null),
      ...(typeof patch.isDefault === "boolean" ? { isDefault: patch.isDefault } : null),
    };
  });
}
