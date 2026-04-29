import type { UnifiedRuleAuditIssue } from "./unifiedRulesValidation";
import {
  describeUnifiedRuleCondition,
  describeUnifiedRuleReward,
  describeUnifiedRuleScope,
  getPublishSupportLabel,
  getUnifiedRuleTypeLabel,
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";

type Props = {
  rules: UnifiedRuleNode[];
  issues: UnifiedRuleAuditIssue[];
};

function getSupportClasses(support: UnifiedRuleNode["publishSupport"]) {
  if (support === "supported") {
    return "border-[#b7ebc6] bg-[#f6ffed] text-[#237804]";
  }
  if (support === "draft_only") {
    return "border-[#ffe58f] bg-[#fffbe6] text-[#ad6800]";
  }
  return "border-[#d9d9d9] bg-[#fafafa] text-[#595959]";
}

export default function UnifiedRulesAuditPanel({ rules, issues }: Props) {
  return (
    <div className="rounded-[12px] border border-[#e3e8ed] bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">
            Unified Rule Audit
          </h3>
          <p className="m-0 mt-2 text-[13px] text-[#5c6166]">
            Cross-checks the current editor state against the unified rule schema,
            including scope, condition, reward, and publish support.
          </p>
        </div>
        <div className="inline-flex w-fit items-center rounded-full border border-[#dfe3e8] bg-[#f6f6f7] px-3 py-1 text-[12px] font-medium text-[#5c6166]">
          {rules.length} rule{rules.length === 1 ? "" : "s"}
        </div>
      </div>

      {issues.length > 0 ? (
        <div className="mt-4 space-y-2">
          {issues.map((issue, index) => (
            <div
              key={`${issue.severity}-${index}`}
              className={`rounded-[10px] border px-3 py-2 text-[12px] ${
                issue.severity === "error"
                  ? "border-[#ffd6d2] bg-[#fff1f0] text-[#b42318]"
                  : "border-[#ffe58f] bg-[#fffbe6] text-[#ad6800]"
              }`}
            >
              {issue.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {rules.map((rule, index) => (
          <div
            key={rule.id}
            className="rounded-[12px] border border-[#e3e8ed] bg-[#fcfcfd] p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-[14px] font-semibold text-[#1c1f23]">
                  Rule {index + 1}: {rule.presentation.title || getUnifiedRuleTypeLabel(rule.type)}
                </div>
                <div className="mt-1 text-[12px] text-[#5c6166]">
                  {rule.presentation.subtitle || describeUnifiedRuleCondition(rule.condition)}
                </div>
              </div>
              <div
                className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[12px] font-medium ${getSupportClasses(
                  rule.publishSupport,
                )}`}
              >
                {getPublishSupportLabel(rule.publishSupport)}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-4">
              <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-white px-3 py-3">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                  Type
                </div>
                <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                  {getUnifiedRuleTypeLabel(rule.type)}
                </div>
              </div>
              <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-white px-3 py-3">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                  Scope
                </div>
                <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                  {describeUnifiedRuleScope(rule.scope)}
                </div>
              </div>
              <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-white px-3 py-3">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                  Condition
                </div>
                <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                  {describeUnifiedRuleCondition(rule.condition)}
                </div>
              </div>
              <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-white px-3 py-3">
                <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                  Reward
                </div>
                <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                  {describeUnifiedRuleReward(rule.reward)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
