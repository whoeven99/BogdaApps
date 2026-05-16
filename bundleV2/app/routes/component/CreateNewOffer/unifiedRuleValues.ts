import type {
  BxgyDiscountRule,
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  DiscountRule,
  FreeGiftRule,
} from "../../../utils/offerParsing";
import { syncRuleDependencies } from "./unifiedRuleModel";

export type UnifiedRuleValuePatch = Partial<
  {
    count: number;
    discountPercent: number;
    conditionType: DiscountRule["conditionType"];
    amountThreshold: number;
    rewardType: DiscountRule["rewardType"];
    rewardProductIds: string[];
    giftQuantity: number;
    logicType: DiscountRule["logicType"];
    buyQuantity: number;
    getQuantity: number;
    maxUsesPerOrder: number;
    discountClass: DiscountRule["discountClass"];
    tierType:
      | DiscountRule["tierType"]
      | BxgyDiscountRule["tierType"]
      | DifferentProductsDiscountRule["tierType"]
      | FreeGiftRule["tierType"];
    buyProductIds: string[];
    getProductIds: string[];
  }
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
      return syncRuleDependencies({ ...rule, ...(patch as Partial<DiscountRule>) });
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

    const nextRule = { ...rule, ...(patch as Partial<BxgyDiscountRule>) };
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
    getFreeGiftUnifiedRuleId(index) === ruleId
      ? { ...rule, ...(patch as Partial<FreeGiftRule>) }
      : rule,
  );
}

export function updateDifferentProductsRuleValues(
  rules: DifferentProductsDiscountRule[],
  ruleId: string,
  patch: UnifiedRuleValuePatch,
): DifferentProductsDiscountRule[] {
  return rules.map((rule, index) =>
    getDifferentProductsUnifiedRuleId(index) === ruleId
      ? { ...rule, ...(patch as Partial<DifferentProductsDiscountRule>) }
      : rule,
  );
}

export function updateCompleteBundleRuleValues(
  bars: CompleteBundleBar[],
  ruleId: string,
  patch: UnifiedRuleValuePatch,
): CompleteBundleBar[] {
  return bars.map((bar) =>
    getCompleteBundleUnifiedRuleId(bar.id) !== ruleId
      ? bar
      : (() => {
          const minQuantity = Math.max(1, Math.trunc(Number(bar.minQuantity) || 1));
          const nextMax =
            typeof patch.count === "number"
              ? Math.max(minQuantity, Math.trunc(Number(patch.count) || 1))
              : Math.max(minQuantity, Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1));
          return {
            ...bar,
            maxQuantity: nextMax,
            quantity: nextMax,
          };
        })(),
  );
}
