import type { UnifiedRuleAuditIssue } from "./unifiedRulesValidation";
import { OfferRuleNotice, OfferRuleStatusPill } from "./OfferRulesShared";

type Props = {
  rulesCount: number;
  issues: UnifiedRuleAuditIssue[];
};

function getStatusTone(issues: UnifiedRuleAuditIssue[]) {
  const hasError = issues.some((issue) => issue.severity === "error");
  const hasWarning = issues.some((issue) => issue.severity === "warning");

  if (hasError) {
    return {
      intent: "critical" as const,
      badge: "Needs fixes",
      title: "Fix these rule issues before continuing.",
      description:
        "Some configurations in this rules setup are not publishable in the current flow.",
    };
  }

  if (hasWarning) {
    return {
      intent: "warning" as const,
      badge: "Check setup",
      title: "Review this rules setup before continuing.",
      description:
        "The current rules state is incomplete or needs confirmation before moving on.",
    };
  }

  return {
    intent: "success" as const,
    badge: "Ready",
    title: "Rules are ready for the next step.",
    description:
      "This configuration passes the current unified compatibility and publishability checks.",
  };
}

export default function UnifiedRulesAuditPanel({ rulesCount, issues }: Props) {
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter(
    (issue) => issue.severity === "warning",
  ).length;
  const status = getStatusTone(issues);

  return (
    <div className="rounded-[12px] border border-[#e3e8ed] bg-white p-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">
            Rule Status
          </h3>
          <div className="mt-2 text-[12px] text-[#5c6166]">
            {rulesCount} rule{rulesCount === 1 ? "" : "s"} in this setup
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <OfferRuleStatusPill intent={status.intent}>
            {status.badge}
          </OfferRuleStatusPill>
          <OfferRuleStatusPill>
            {rulesCount} rule{rulesCount === 1 ? "" : "s"}
          </OfferRuleStatusPill>
        </div>
      </div>

      <OfferRuleNotice title={status.title} intent={status.intent}>
        <div>{status.description}</div>
        {issues.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {errorCount > 0 ? (
              <OfferRuleStatusPill intent="critical">
                {errorCount} error{errorCount === 1 ? "" : "s"}
              </OfferRuleStatusPill>
            ) : null}
            {warningCount > 0 ? (
              <OfferRuleStatusPill intent="warning">
                {warningCount} warning{warningCount === 1 ? "" : "s"}
              </OfferRuleStatusPill>
            ) : null}
          </div>
        ) : null}
      </OfferRuleNotice>

      {issues.length > 0 ? (
        <div className="mt-4 space-y-2">
          {issues.map((issue, index) => (
            <OfferRuleNotice
              key={`${issue.severity}-${index}`}
              title={issue.severity === "error" ? "Error" : "Warning"}
              intent={issue.severity === "error" ? "critical" : "warning"}
            >
              {issue.message}
            </OfferRuleNotice>
          ))}
        </div>
      ) : null}
    </div>
  );
}
