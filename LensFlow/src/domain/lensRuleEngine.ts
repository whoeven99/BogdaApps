import type {
  LensDecision,
  LensRule,
  LensRuleEngineResult,
  ProductContext,
  ReasonCode,
  RuleAction,
  RuleCondition,
  RuleEvaluationTrace,
} from "../types/lens.js";

function getInitialDecision(lensOptionId: string): LensDecision {
  return {
    lensOptionId,
    state: "hidden",
    reasonCodes: ["RULE_NOT_MATCHED"],
    messages: [],
    appliedRuleIds: [],
  };
}

function replaceReasons(current: LensDecision, reasons: ReasonCode[]): void {
  current.reasonCodes = reasons;
}

function variantExists(context: ProductContext, variantId?: string): boolean {
  if (!variantId) {
    return true;
  }

  return context.variants.some(
    (variant) => variant.id === variantId && !variant.isDeleted,
  );
}

function matchesSelectedVariant(
  context: ProductContext,
  variantId?: string,
): boolean {
  if (!variantId || !context.selectedVariantId) {
    return true;
  }

  return context.selectedVariantId === variantId;
}

function matchesCondition(
  context: ProductContext,
  condition: RuleCondition,
): boolean {
  switch (condition.field) {
    case "prescriptionType": {
      const currentValue = context.prescriptionType ?? "";
      return condition.operator === "eq"
        ? currentValue === condition.value
        : currentValue !== condition.value;
    }
    case "productType": {
      const currentValue = context.productType ?? "";
      return condition.operator === "eq"
        ? currentValue === condition.value
        : currentValue !== condition.value;
    }
    case "tags": {
      const hasTag = context.tags.includes(condition.value);
      return condition.operator === "includes" ? hasTag : !hasTag;
    }
    case "variantExists": {
      const exists = variantExists(context, condition.value);
      return condition.operator === "eq" ? exists : !exists;
    }
    default:
      return false;
  }
}

function applyAction(
  context: ProductContext,
  decisions: Record<string, LensDecision>,
  ruleId: string,
  action: RuleAction,
): void {
  const current = decisions[action.lensOptionId] ?? getInitialDecision(action.lensOptionId);

  if (!variantExists(context, action.variantId)) {
    current.state = "hidden";
    replaceReasons(current, ["SHOPIFY_VARIANT_MISSING"]);
    current.messages.push(action.message ?? "关联 Shopify 变体不存在");
    current.appliedRuleIds.push(ruleId);
    decisions[action.lensOptionId] = current;
    return;
  }

  if (!matchesSelectedVariant(context, action.variantId)) {
    decisions[action.lensOptionId] = current;
    return;
  }

  if (action.type === "show") {
    current.state = "visible";
    replaceReasons(current, ["LENS_VISIBLE"]);
  } else if (action.type === "disable") {
    current.state = "disabled";
    replaceReasons(current, ["LENS_DISABLED"]);
  } else {
    current.state = "hidden";
    replaceReasons(current, ["LENS_HIDDEN"]);
  }

  if (action.message) {
    current.messages.push(action.message);
  }

  current.appliedRuleIds.push(ruleId);
  decisions[action.lensOptionId] = current;
}

function getMismatchReason(conditions: RuleCondition[]): string {
  const prescriptionCondition = conditions.find(
    (condition) => condition.field === "prescriptionType",
  );

  if (prescriptionCondition) {
    return "PRESCRIPTION_TYPE_NOT_MATCH";
  }

  return "RULE_NOT_MATCHED";
}

export function evaluateLensRules(
  context: ProductContext,
  rules: LensRule[],
): LensRuleEngineResult {
  const sortedRules = [...rules]
    .filter((rule) => rule.enabled)
    .sort((left, right) => right.priority - left.priority);

  const decisions: Record<string, LensDecision> = {};
  const traces: RuleEvaluationTrace[] = [];

  for (const rule of sortedRules) {
    const matched = rule.conditions.every((condition) =>
      matchesCondition(context, condition),
    );

    traces.push({
      ruleId: rule.id,
      matched,
      reason: matched ? "RULE_MATCHED" : getMismatchReason(rule.conditions),
    });

    if (!matched) {
      continue;
    }

    for (const action of rule.actions) {
      applyAction(context, decisions, rule.id, action);
    }
  }

  return {
    decisions,
    traces,
  };
}
