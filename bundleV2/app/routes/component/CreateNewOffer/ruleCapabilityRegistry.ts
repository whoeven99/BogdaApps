import type { OfferTypeId } from "./offerTypeOptions";
import {
  DISCOUNT_TYPE_OPTIONS,
  type DiscountTypeId,
} from "./unifiedRuleModel";

export type UnifiedRuleTemplateId =
  | "product_discount"
  | "order_discount"
  | "shipping_discount"
  | "free_gift"
  | "bxgy";

export type DifferentProductsRuleTemplateId = "simple" | "bxgy";

export type CompleteBundleRuleTemplateId = "quantity-break-same" | "bxgy";

type RuleOption<T extends string> = {
  label: string;
  value: T;
};

type AddMenuItem<T extends string> = {
  key: T;
  label: string;
};

type UnifiedRuleCapability = {
  discountTypeOptions: RuleOption<DiscountTypeId>[];
  addMenuItems: AddMenuItem<UnifiedRuleTemplateId>[];
};

function toUnifiedTemplateId(value: DiscountTypeId): UnifiedRuleTemplateId {
  switch (value) {
    case "quantity_break":
      return "product_discount";
    case "order_discount":
      return "order_discount";
    case "free_shipping":
      return "shipping_discount";
    case "free_gift":
      return "free_gift";
    case "bxgy":
    default:
      return "bxgy";
  }
}

function buildUnifiedMenuItems(
  options: RuleOption<DiscountTypeId>[],
): AddMenuItem<UnifiedRuleTemplateId>[] {
  return options.map((option) => ({
    key: toUnifiedTemplateId(option.value),
    label: `Add ${option.label} Rule`,
  }));
}

const DEFAULT_UNIFIED_RULE_CAPABILITY: UnifiedRuleCapability = {
  discountTypeOptions: [...DISCOUNT_TYPE_OPTIONS],
  addMenuItems: buildUnifiedMenuItems([...DISCOUNT_TYPE_OPTIONS]),
};

const UNIFIED_RULE_CAPABILITY_BY_OFFER_TYPE: Partial<
  Record<OfferTypeId, UnifiedRuleCapability>
> = {
  bxgy: {
    discountTypeOptions: [{ label: "BXGY", value: "bxgy" }],
    addMenuItems: [{ key: "bxgy", label: "Add BXGY Rule" }],
  },
  "free-gift": {
    discountTypeOptions: [{ label: "Free gift", value: "free_gift" }],
    addMenuItems: [{ key: "free_gift", label: "Add Free Gift Rule" }],
  },
};

export function getUnifiedRuleCapability(
  offerType?: OfferTypeId | string,
): UnifiedRuleCapability {
  if (offerType && offerType in UNIFIED_RULE_CAPABILITY_BY_OFFER_TYPE) {
    return UNIFIED_RULE_CAPABILITY_BY_OFFER_TYPE[offerType as OfferTypeId]!;
  }
  return DEFAULT_UNIFIED_RULE_CAPABILITY;
}

const DIFFERENT_PRODUCTS_RULE_CAPABILITY = {
  discountTypeOptions: [
    { label: "Quantity Break", value: "simple" },
    { label: "BXGY", value: "bxgy" },
  ] as RuleOption<DifferentProductsRuleTemplateId>[],
  addMenuItems: [
    { key: "simple", label: "Add Quantity Break Rule" },
    { key: "bxgy", label: "Add BXGY Rule" },
  ] as AddMenuItem<DifferentProductsRuleTemplateId>[],
};

export function getDifferentProductsRuleCapability() {
  return DIFFERENT_PRODUCTS_RULE_CAPABILITY;
}

const BXGY_RULE_CAPABILITY = {
  discountTypeOptions: [{ label: "BXGY", value: "bxgy" }] as RuleOption<"bxgy">[],
  addMenuItems: [{ key: "bxgy", label: "Add BXGY Rule" }] as AddMenuItem<"bxgy">[],
};

export function getBxgyRuleCapability() {
  return BXGY_RULE_CAPABILITY;
}

const FREE_GIFT_RULE_CAPABILITY = {
  discountTypeOptions: [
    { label: "Free Gift", value: "free_gift" },
  ] as RuleOption<"free_gift">[],
  addMenuItems: [
    { key: "free_gift", label: "Add Free Gift Rule" },
  ] as AddMenuItem<"free_gift">[],
};

export function getFreeGiftRuleCapability() {
  return FREE_GIFT_RULE_CAPABILITY;
}

const COMPLETE_BUNDLE_RULE_CAPABILITY = {
  barTypeOptions: [
    { label: "Complete Bundle", value: "quantity-break-same" },
    { label: "BXGY", value: "bxgy" },
  ] as RuleOption<CompleteBundleRuleTemplateId>[],
  addMenuItems: [
    { key: "quantity-break-same", label: "Add Complete Bundle Rule" },
    { key: "bxgy", label: "Add BXGY Rule" },
  ] as AddMenuItem<CompleteBundleRuleTemplateId>[],
};

export function getCompleteBundleRuleCapability() {
  return COMPLETE_BUNDLE_RULE_CAPABILITY;
}
