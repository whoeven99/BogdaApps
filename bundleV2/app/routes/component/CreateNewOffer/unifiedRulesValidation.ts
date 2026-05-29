import type { CampaignDraft } from "./campaignDraft";
import {
  describeUnifiedRuleCondition,
  describeUnifiedRuleReward,
  getUnifiedRuleTypeLabel,
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";

export type UnifiedRuleAuditIssue = {
  severity: "error" | "warning";
  code?: string;
  message: string;
};

function describeDraftOnlyRule(rule: UnifiedRuleNode): string {
  return `${getUnifiedRuleTypeLabel(rule.type)} using ${describeUnifiedRuleCondition(
    rule.condition,
  )} with ${describeUnifiedRuleReward(rule.reward)}`;
}

function isNonBlockingDraftOnlyRule(rule: UnifiedRuleNode): boolean {
  return rule.type === "single_purchase";
}

function getDifferentProductsRequiredSelectionCount(rule: UnifiedRuleNode): number {
  if (rule.sourceOfferType !== "quantity-breaks-different") return 0;
  if (rule.condition.kind === "item_quantity") {
    return Math.max(1, Math.trunc(Number(rule.condition.count) || 1));
  }
  if (rule.condition.kind === "buy_x_get_y") {
    return Math.max(1, Math.trunc(Number(rule.condition.triggerCount) || 1));
  }
  return 0;
}

export function getUnifiedRuleAuditIssuesForRules(
  draft: CampaignDraft,
  rules: UnifiedRuleNode[],
): UnifiedRuleAuditIssue[] {
  const issues: UnifiedRuleAuditIssue[] = [];
  const differentProductsSharedPoolProducts =
    draft.differentProductsSharedPoolProductsData.length > 0
      ? draft.differentProductsSharedPoolProductsData
      : draft.selectedProductsData;
  const differentProductsSharedPoolIds = differentProductsSharedPoolProducts.map((product) =>
    String(product.id),
  );

  if (rules.length === 0) {
    issues.push({
      severity: "warning",
      code: "empty_rules",
      message: "No rules are configured yet.",
    });
    return issues;
  }

  const draftOnlyRules = rules.filter(
    (rule) =>
      rule.publishSupport === "draft_only" && !isNonBlockingDraftOnlyRule(rule),
  );
  if (draftOnlyRules.length > 0) {
    issues.push({
      severity: "error",
      message:
        "Some rules are still draft-only in the unified model and cannot be published yet.",
    });
    Array.from(new Set(draftOnlyRules.map(describeDraftOnlyRule))).forEach((description) => {
      issues.push({
        severity: "error",
        message: `${description} is not publishable in the current flow yet.`,
      });
    });
  }

  const hasSelectedProductsGap = rules.some(
    (rule) =>
      rule.scope.kind === "selected_products" &&
      draft.selectedProductsData.length === 0,
  );
  if (hasSelectedProductsGap) {
    issues.push({
      severity: "error",
      message:
        "At least one quantity-based bar requires selected campaign products.",
    });
  }

  const hasBxgyScopeGap = rules.some(
    (rule) =>
      rule.scope.kind === "buy_get_products" &&
      rule.scope.buyProductIds.length === 0,
  );
  if (hasBxgyScopeGap) {
    issues.push({
      severity: "error",
      message:
        "BXGY bars require a BXGY product pool before continuing.",
    });
  }

  const hasFreeGiftScopeGap = rules.some(
    (rule) =>
      rule.scope.kind === "trigger_gift_products" &&
      (rule.scope.triggerProductIds.length === 0 ||
        rule.scope.giftProductIds.length === 0),
  );
  if (hasFreeGiftScopeGap) {
    issues.push({
      severity: "error",
      message:
        "Gift reward rules require the global trigger pool and reward products inside every rule before continuing.",
    });
  }

  const hasSharedPoolGap = rules.some(
    (rule) =>
      rule.scope.kind === "shared_product_pool" &&
      (
        rule.scope.productIds.length === 0 &&
        (rule.sourceOfferType !== "quantity-breaks-different" ||
          differentProductsSharedPoolIds.length === 0)
      ),
  );
  if (hasSharedPoolGap) {
    issues.push({
      severity: "error",
      message:
        "Cross-product bars require a shared product pool before continuing.",
    });
  }

  const differentProductsRules = rules.filter(
    (rule) =>
      rule.sourceOfferType === "quantity-breaks-different" &&
      rule.type !== "single_purchase",
  );
  if (differentProductsRules.length > 0 && differentProductsSharedPoolProducts.length > 0) {
    const highestRequiredSelectionCount = Math.max(
      ...differentProductsRules.map(getDifferentProductsRequiredSelectionCount),
    );
    const sharedPoolProductCount = differentProductsSharedPoolProducts.length;
    const sharedPoolSelectableCapacity = differentProductsSharedPoolProducts.reduce(
      (sum, product) => sum + Math.max(1, Math.trunc(Number(product.variantsCount) || 1)),
      0,
    );

    if (sharedPoolSelectableCapacity < highestRequiredSelectionCount) {
      issues.push({
        severity: "warning",
        code: "different_products_pool_capacity",
        message: `The largest cross-product bar requires ${highestRequiredSelectionCount} selections, but the current shared offer pool only exposes up to ${sharedPoolSelectableCapacity} product/variant choices.`,
      });
    } else if (sharedPoolProductCount < highestRequiredSelectionCount) {
      issues.push({
        severity: "warning",
        code: "different_products_pool_variants",
        message: `The largest cross-product bar requires ${highestRequiredSelectionCount} selections. With only ${sharedPoolProductCount} product${sharedPoolProductCount === 1 ? "" : "s"} in the shared offer pool, shoppers will need multiple variants of the same product to reach it.`,
      });
    }
  }

  const hasBundleBarGap = rules.some(
    (rule) =>
      rule.scope.kind === "bundle_bar_products" &&
      rule.scope.productIds.length === 0,
  );
  if (hasBundleBarGap) {
    issues.push({
      severity: "error",
      message:
        "Complete bundle bars require at least one configured product.",
    });
  }

  return issues;
}

export function getUnifiedRuleAuditIssues(
  draft: CampaignDraft,
): UnifiedRuleAuditIssue[] {
  return getUnifiedRuleAuditIssuesForRules(draft, draft.unifiedRulesSnapshot);
}

export function getUnifiedRuleBlockingMessage(
  draft: CampaignDraft,
): string | null {
  const issue = getUnifiedRuleAuditIssues(draft).find(
    (entry) => entry.severity === "error",
  );
  return issue?.message ?? null;
}

export function getUnifiedRuleBlockingMessageForRules(
  draft: CampaignDraft,
  rules: UnifiedRuleNode[],
): string | null {
  const issue = getUnifiedRuleAuditIssuesForRules(draft, rules).find(
    (entry) => entry.severity === "error",
  );
  return issue?.message ?? null;
}
