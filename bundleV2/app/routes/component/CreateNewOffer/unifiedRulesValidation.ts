import type { CampaignDraft } from "./campaignDraft";
import { getUnifiedRuleBlockingMessage as getLegacyUnifiedRuleBlockingMessage } from "./unifiedRuleModel";
import {
  describeUnifiedRuleCondition,
  describeUnifiedRuleReward,
  getUnifiedRuleTypeLabel,
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";

export type UnifiedRuleAuditIssue = {
  severity: "error" | "warning";
  message: string;
};

function describeDraftOnlyRule(rule: UnifiedRuleNode): string {
  return `${getUnifiedRuleTypeLabel(rule.type)} using ${describeUnifiedRuleCondition(
    rule.condition,
  )} with ${describeUnifiedRuleReward(rule.reward)}`;
}

export function getUnifiedRuleAuditIssuesForRules(
  draft: CampaignDraft,
  rules: UnifiedRuleNode[],
): UnifiedRuleAuditIssue[] {
  const issues: UnifiedRuleAuditIssue[] = [];

  if (rules.length === 0) {
    issues.push({
      severity: "warning",
      message: "No rules are configured yet.",
    });
    return issues;
  }

  const draftOnlyRules = rules.filter((rule) => rule.publishSupport === "draft_only");
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

  if (
    draft.offerType === "quantity-breaks-same" ||
    draft.offerType === "shipping-discount" ||
    draft.offerType === "order-discount" ||
    draft.offerType === "coupon"
  ) {
    const legacyBlockingMessage = getLegacyUnifiedRuleBlockingMessage(draft.discountRules);
    if (legacyBlockingMessage) {
      issues.push({
        severity: "error",
        message: legacyBlockingMessage,
      });
    }
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
        "Free-gift bars require the global trigger pool and gift products inside every bar before continuing.",
    });
  }

  const hasSharedPoolGap = rules.some(
    (rule) =>
      rule.scope.kind === "shared_product_pool" &&
      rule.scope.productIds.length === 0,
  );
  if (hasSharedPoolGap) {
    issues.push({
      severity: "error",
      message:
        "Cross-product bars require a shared product pool before continuing.",
    });
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
