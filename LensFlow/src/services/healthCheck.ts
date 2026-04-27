import { buildLensVisibilityDiagnostic } from "./diagnostics.js";
import type { LensRule } from "../types/lens.js";
import type {
  ProductHealthCheckInput,
  ProductHealthIssue,
  ProductHealthReport,
  ProductHealthStatus,
} from "../types/sync.js";

function getReferencedVariantIds(rules: LensRule[]): string[] {
  return rules.flatMap((rule) =>
    rule.actions
      .map((action) => action.variantId)
      .filter((variantId): variantId is string => Boolean(variantId)),
  );
}

function getStatusFromIssues(issues: ProductHealthIssue[]): ProductHealthStatus {
  if (issues.some((issue) => issue.severity === "error")) {
    return "error";
  }

  if (issues.length > 0) {
    return "warning";
  }

  return "healthy";
}

export function buildProductHealthReport(
  input: ProductHealthCheckInput,
): ProductHealthReport {
  const issues: ProductHealthIssue[] = [];
  const { configuration, context, rules } = input;

  if (configuration && !configuration.prescriptionTypeConfigured) {
    issues.push({
      code: "MISSING_PRESCRIPTION_TYPE_METAFIELD",
      severity: "warning",
      message: "当前商品缺少处方类型 Metafield，系统已回退为标签推断或默认值",
      relatedRuleIds: [],
      relatedVariantIds: [],
    });
  }

  if (configuration && !configuration.lensOptionsConfigured) {
    issues.push({
      code: "MISSING_LENS_OPTIONS_METAFIELD",
      severity: "warning",
      message: "当前商品缺少镜片选项 Metafield，系统已回退为默认镜片配置",
      relatedRuleIds: [],
      relatedVariantIds: [],
    });
  }

  if (configuration && !configuration.subscriptionPlansConfigured) {
    issues.push({
      code: "MISSING_SUBSCRIPTION_PLANS_METAFIELD",
      severity: "warning",
      message: "当前商品缺少订阅方案 Metafield，前台不会展示周期购买方案",
      relatedRuleIds: [],
      relatedVariantIds: [],
    });
  }

  if (
    configuration?.subscriptionPlansConfigured &&
    configuration.subscriptionPlansRequiresSellingPlanIntegration
  ) {
    issues.push({
      code: "SUBSCRIPTION_PLAN_NOT_BOUND",
      severity: "warning",
      message: "当前商品存在订阅方案配置，但部分方案尚未绑定正式 Selling Plan",
      relatedRuleIds: [],
      relatedVariantIds: [],
    });
  }

  if (rules.length === 0) {
    issues.push({
      code: "MISSING_RULES",
      severity: "error",
      message: "当前商品未配置任何镜片规则",
      relatedRuleIds: [],
      relatedVariantIds: [],
    });
  }

  const referencedVariantIds = getReferencedVariantIds(rules);
  const missingVariantIds = referencedVariantIds.filter(
    (variantId) => !context.variants.some((variant) => variant.id === variantId),
  );
  const deletedVariantIds = referencedVariantIds.filter((variantId) =>
    context.variants.some(
      (variant) => variant.id === variantId && variant.isDeleted,
    ),
  );

  if (missingVariantIds.length > 0) {
    issues.push({
      code: "MISSING_VARIANT",
      severity: "error",
      message: "存在规则引用了未同步到本地上下文的 Shopify 变体",
      relatedRuleIds: rules
        .filter((rule) =>
          rule.actions.some(
            (action) =>
              action.variantId !== undefined &&
              missingVariantIds.includes(action.variantId),
          ),
        )
        .map((rule) => rule.id),
      relatedVariantIds: missingVariantIds,
    });
  }

  if (deletedVariantIds.length > 0) {
    issues.push({
      code: "DELETED_VARIANT_REFERENCED",
      severity: "error",
      message: "存在规则引用了已删除的 Shopify 变体",
      relatedRuleIds: rules
        .filter((rule) =>
          rule.actions.some(
            (action) =>
              action.variantId !== undefined &&
              deletedVariantIds.includes(action.variantId),
          ),
        )
        .map((rule) => rule.id),
      relatedVariantIds: deletedVariantIds,
    });
  }

  const priorities = new Map<number, string[]>();
  for (const rule of rules) {
    const group = priorities.get(rule.priority) ?? [];
    group.push(rule.id);
    priorities.set(rule.priority, group);
  }

  for (const [priority, ruleIds] of priorities) {
    if (ruleIds.length > 1) {
      issues.push({
        code: "RULE_PRIORITY_CONFLICT",
        severity: "warning",
        message: `存在多个规则使用相同优先级 ${priority}`,
        relatedRuleIds: ruleIds,
        relatedVariantIds: [],
      });
    }
  }

  const diagnostic = buildLensVisibilityDiagnostic(context, rules);
  if (rules.length > 0 && diagnostic.visibleLensOptionIds.length === 0) {
    issues.push({
      code: "NO_VISIBLE_LENS",
      severity: "warning",
      message: "当前商品在给定条件下没有可展示的镜片选项",
      relatedRuleIds: rules.map((rule) => rule.id),
      relatedVariantIds: [],
    });
  }

  return {
    productId: context.productId,
    status: getStatusFromIssues(issues),
    issues,
  };
}
