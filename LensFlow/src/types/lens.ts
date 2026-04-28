export type PrescriptionType =
  | "non_prescription"
  | "single_vision"
  | "progressive"
  | "reading";

export type LensVisibilityAction = "show" | "hide" | "disable";

export type ConditionOperator = "eq" | "neq" | "includes";

export type LensOption = {
  id: string;
  name: string;
  basePrice: number;
};

export type ProductVariant = {
  id: string;
  sku: string;
  isDeleted: boolean;
  inventoryAvailable: boolean;
};

export type ProductContext = {
  productId: string;
  productType?: string;
  tags: string[];
  prescriptionType?: PrescriptionType;
  selectedVariantId?: string;
  variants: ProductVariant[];
};

export type RuleConditionField =
  | "prescriptionType"
  | "productType"
  | "tags"
  | "variantExists";

export type RuleCondition = {
  field: RuleConditionField;
  operator: ConditionOperator;
  value: string;
};

export type RuleAction = {
  type: LensVisibilityAction;
  lensOptionId: string;
  message?: string;
  variantId?: string;
};

export type LensRule = {
  id: string;
  name: string;
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
};

export type ReasonCode =
  | "PRESCRIPTION_TYPE_NOT_MATCH"
  | "SHOPIFY_VARIANT_MISSING"
  | "RULE_NOT_MATCHED"
  | "LENS_VISIBLE"
  | "LENS_DISABLED"
  | "LENS_HIDDEN";

export type LensDecisionState = "visible" | "disabled" | "hidden";

export type LensDecision = {
  lensOptionId: string;
  state: LensDecisionState;
  reasonCodes: ReasonCode[];
  messages: string[];
  appliedRuleIds: string[];
};

export type RuleEvaluationTrace = {
  ruleId: string;
  matched: boolean;
  reason: string;
};

export type LensRuleEngineResult = {
  decisions: Record<string, LensDecision>;
  traces: RuleEvaluationTrace[];
};
