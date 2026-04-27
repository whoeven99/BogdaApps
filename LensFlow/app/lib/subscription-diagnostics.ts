import type { ProductSubscriptionPlan } from "../services/shopify-products.server";

export type SubscriptionDiagnosticIssueCode =
  | "NOT_BOUND"
  | "REMOTE_GROUP_MISSING"
  | "REMOTE_PLAN_MISMATCH"
  | "REMOTE_PRODUCT_SCOPE_MISMATCH"
  | "REMOTE_VARIANT_SCOPE_MISMATCH";

export type SubscriptionDiagnosticIssue = {
  code: SubscriptionDiagnosticIssueCode;
  severity: "warning" | "error";
  message: string;
  relatedVariantIds: string[];
};

export type SubscriptionPlanDiagnostic = {
  planId: string;
  planName: string;
  status: "healthy" | "warning" | "error";
  remoteSellingPlanGroupId?: string;
  remoteSellingPlanIds: string[];
  issues: SubscriptionDiagnosticIssue[];
};

export type SubscriptionDiagnosticsSummary = {
  status: "healthy" | "warning" | "error";
  totalPlans: number;
  healthyPlans: number;
  warningPlans: number;
  errorPlans: number;
  issueCount: number;
};

export type ProductSubscriptionDiagnostics = {
  summary: SubscriptionDiagnosticsSummary;
  plans: SubscriptionPlanDiagnostic[];
};

export type SubscriptionRepairMode =
  | "none"
  | "bind"
  | "rebind"
  | "recreate_missing";

export function getSubscriptionRepairMode(
  plan: ProductSubscriptionPlan,
  diagnostic?: SubscriptionPlanDiagnostic,
): SubscriptionRepairMode {
  if (!diagnostic) {
    return plan.sellingPlanId ? "none" : "bind";
  }

  const issueCodes = new Set(diagnostic.issues.map((issue) => issue.code));

  if (issueCodes.has("REMOTE_GROUP_MISSING")) {
    return "recreate_missing";
  }

  if (
    issueCodes.has("REMOTE_PLAN_MISMATCH") ||
    issueCodes.has("REMOTE_PRODUCT_SCOPE_MISMATCH") ||
    issueCodes.has("REMOTE_VARIANT_SCOPE_MISMATCH")
  ) {
    return "rebind";
  }

  if (issueCodes.has("NOT_BOUND")) {
    return "bind";
  }

  return "none";
}

export function getRepairableSubscriptionPlans(
  plans: ProductSubscriptionPlan[],
  diagnostics: ProductSubscriptionDiagnostics,
) {
  return plans
    .map((plan) => {
      const diagnostic = diagnostics.plans.find((item) => item.planId === plan.id);
      const mode = getSubscriptionRepairMode(plan, diagnostic);

      return {
        plan,
        diagnostic,
        mode,
      };
    })
    .filter((item) => item.mode !== "none");
}
