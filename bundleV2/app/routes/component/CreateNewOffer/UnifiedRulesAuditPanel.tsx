import type { UnifiedRuleAuditIssue } from "./unifiedRulesValidation";
import { OfferRuleNotice } from "./OfferRulesShared";

type Props = {
  rulesCount: number;
  issues: UnifiedRuleAuditIssue[];
};

function getStatusTone(issues: UnifiedRuleAuditIssue[]) {
  const hasError = issues.some((issue) => issue.severity === "error");
  const hasWarning = issues.some((issue) => issue.severity === "warning");

  if (hasError) {
    return {
      badge: "Needs fixes",
      badgeClasses: "border-[#ffd6d2] bg-[#fff1f0] text-[#b42318]",
      title: "Fix these rule issues before continuing.",
      description:
        "Some configurations in this rules setup are not publishable in the current flow.",
    };
  }

  if (hasWarning) {
    return {
      badge: "Check setup",
      badgeClasses: "border-[#ffe58f] bg-[#fffbe6] text-[#ad6800]",
      title: "Review this rules setup before continuing.",
      description:
        "The current rules state is incomplete or needs confirmation before moving on.",
    };
  }

  return {
    badge: "Ready",
    badgeClasses: "border-[#b7ebc6] bg-[#f6ffed] text-[#237804]",
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
          <div
            className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[12px] font-medium ${status.badgeClasses}`}
          >
            {status.badge}
          </div>
          <div className="inline-flex w-fit items-center rounded-full border border-[#dfe3e8] bg-white px-3 py-1 text-[12px] font-medium text-[#5c6166]">
            {rulesCount} rule{rulesCount === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <OfferRuleNotice
        title="Rule readiness"
        intent={
          errorCount > 0
            ? "critical"
            : warningCount > 0
              ? "warning"
              : "success"
        }
      >
        <div className="text-[14px] font-medium text-[#1c1f23]">{status.title}</div>
        <div className="mt-1 text-[12px] text-[#5c6166]">{status.description}</div>
        {issues.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2 text-[12px] font-medium">
            {errorCount > 0 ? (
              <span className="rounded-full bg-[#fff1f0] px-2 py-1 text-[#b42318]">
                {errorCount} error{errorCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {warningCount > 0 ? (
              <span className="rounded-full bg-[#fffbe6] px-2 py-1 text-[#ad6800]">
                {warningCount} warning{warningCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        ) : null}
      </OfferRuleNotice>

      {issues.length > 0 ? (
        <div className="mt-4 space-y-2">
          {issues.map((issue, index) => (
            <OfferRuleNotice
              key={`${issue.severity}-${index}`}
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
