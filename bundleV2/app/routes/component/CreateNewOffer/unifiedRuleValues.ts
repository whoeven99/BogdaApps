import type {
  BxgyDiscountRule,
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  DiscountRule,
  FreeGiftRule,
} from "../../../utils/offerParsing";
import { syncRuleDependencies } from "./unifiedRuleModel";

export type UnifiedRuleValuePatch = Partial<
  Pick<
    DiscountRule & BxgyDiscountRule & FreeGiftRule & DifferentProductsDiscountRule,
    | "count"
    | "discountPercent"
    | "conditionType"
    | "amountThreshold"
    | "rewardType"
    | "rewardProductIds"
    | "giftQuantity"
    | "logicType"
    | "buyQuantity"
    | "getQuantity"
    | "maxUsesPerOrder"
    | "discountClass"
    | "tierType"
    | "buyProductIds"
    | "getProductIds"
  >
>;

export function getUnifiedDiscountRuleId(
  rule: Pick<DiscountRule, "id">,
  index: number,
): string {
  return rule.id || `discount-rule-${index + 1}`;
}

export function getBxgyUnifiedRuleId(index: number): string {
  return `bxgy-rule-${index + 1}`;
}

export function getFreeGiftUnifiedRuleId(index: number): string {
  return `free-gift-rule-${index + 1}`;
}

export function getDifferentProductsUnifiedRuleId(index: number): string {
  return `different-products-rule-${index + 1}`;
}

export function getCompleteBundleUnifiedRuleId(barId: string): string {
  return barId;
}

export function updateUnifiedDiscountRuleValues(
  rules: DiscountRule[],
  ruleId: string,
  patch: UnifiedRuleValuePatch,
): DiscountRule[] {
  return rules.map((rule, index) => {
    const currentId = getUnifiedDiscountRuleId(rule, index);
    if (currentId === ruleId) {
      return syncRuleDependencies({ ...rule, ...patch });
    }
    return syncRuleDependencies(rule);
  });
}

export function updateBxgyRuleValues(
  rules: BxgyDiscountRule[],
  ruleId: string,
  patch: UnifiedRuleValuePatch,
): BxgyDiscountRule[] {
  return rules.map((rule, index) => {
    if (getBxgyUnifiedRuleId(index) !== ruleId) return rule;

    const nextRule = { ...rule, ...patch };
    const normalizedBuyQuantity =
      typeof patch.buyQuantity === "number"
        ? Math.max(1, Math.trunc(Number(patch.buyQuantity) || 1))
        : typeof patch.count === "number"
          ? Math.max(1, Math.trunc(Number(patch.count) || 1))
          : Math.max(1, Math.trunc(Number(nextRule.buyQuantity) || Number(nextRule.count) || 1));

    return {
      ...nextRule,
      buyQuantity: normalizedBuyQuantity,
      count: normalizedBuyQuantity,
      discountPercent: 100,
      maxUsesPerOrder: 1,
    };
  });
}

export function updateFreeGiftRuleValues(
  rules: FreeGiftRule[],
  ruleId: string,
  patch: UnifiedRuleValuePatch,
): FreeGiftRule[] {
  return rules.map((rule, index) =>
    getFreeGiftUnifiedRuleId(index) === ruleId ? { ...rule, ...patch } : rule,
  );
}

export function updateDifferentProductsRuleValues(
  rules: DifferentProductsDiscountRule[],
  ruleId: string,
  patch: UnifiedRuleValuePatch,
): DifferentProductsDiscountRule[] {
  return rules.map((rule, index) =>
    getDifferentProductsUnifiedRuleId(index) === ruleId
      ? { ...rule, ...patch }
      : rule,
  );
}

export function updateCompleteBundleRuleValues(
  bars: CompleteBundleBar[],
  ruleId: string,
  patch: UnifiedRuleValuePatch,
): CompleteBundleBar[] {
  return bars.map((bar) =>
    getCompleteBundleUnifiedRuleId(bar.id) === ruleId
      ? {
          ...bar,
          ...(typeof patch.count === "number"
            ? { quantity: Math.max(1, Math.trunc(Number(patch.count) || 1)) }
            : null),
          ...(patch.tierType
            ? {
                type:
                  patch.tierType === "bxgy"
                    ? "bxgy"
                    : "quantity-break-same",
              }
            : null),
        }
      : bar,
  );
}
