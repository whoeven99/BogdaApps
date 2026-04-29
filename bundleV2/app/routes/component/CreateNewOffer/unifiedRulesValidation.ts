import type { CampaignDraft } from "./campaignDraft";
import { getUnifiedRuleBlockingMessage as getLegacyUnifiedRuleBlockingMessage } from "./unifiedRuleModel";

export type UnifiedRuleAuditIssue = {
  severity: "error" | "warning";
  message: string;
};

export function getUnifiedRuleAuditIssues(
  draft: CampaignDraft,
): UnifiedRuleAuditIssue[] {
  const issues: UnifiedRuleAuditIssue[] = [];

  if (draft.unifiedRulesSnapshot.length === 0) {
    issues.push({
      severity: "warning",
      message: "No rules are configured yet.",
    });
    return issues;
  }

  const hasDraftOnlyRule = draft.unifiedRulesSnapshot.some(
    (rule) => rule.publishSupport === "draft_only",
  );
  if (hasDraftOnlyRule) {
    issues.push({
      severity: "error",
      message:
        "Some rules are draft-only in the unified model and cannot be published yet.",
    });
  }

  const hasSpecializedRuleOutsideNativeOffer =
    draft.offerType !== "complete-bundle" &&
    draft.offerType !== "subscription" &&
    draft.unifiedRulesSnapshot.some(
      (rule) => rule.publishSupport === "specialized_editor_only",
    );
  if (hasSpecializedRuleOutsideNativeOffer) {
    issues.push({
      severity: "error",
      message:
        "Some rules require a specialized editor flow and cannot be published from this offer type.",
    });
  }

  if (draft.offerType === "quantity-breaks-same") {
    const legacyBlockingMessage = getLegacyUnifiedRuleBlockingMessage(draft.discountRules);
    if (legacyBlockingMessage) {
      issues.push({
        severity: "error",
        message: legacyBlockingMessage,
      });
    }
  }

  return issues;
}

export function getUnifiedRuleBlockingMessage(
  draft: CampaignDraft,
): string | null {
  const issue = getUnifiedRuleAuditIssues(draft).find(
    (entry) => entry.severity === "error",
  );
  return issue?.message ?? null;
}
