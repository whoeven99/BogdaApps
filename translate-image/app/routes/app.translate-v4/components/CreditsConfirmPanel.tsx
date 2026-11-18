import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { v4Colors } from "../v4Styles";

export type CreateTaskConfirmScenario =
  | "ready"
  | "insufficient_paid"
  | "insufficient_trial"
  | "insufficient_pricing";

export type CreateTaskQuotaOfferMode = "paid" | "trial" | "pricing";

type TranslateFn = (
  key: string,
  options?: Record<string, unknown>,
) => string;

export function resolveScenarioFromOfferMode(
  offerMode: CreateTaskQuotaOfferMode,
): CreateTaskConfirmScenario {
  if (offerMode === "paid") return "insufficient_paid";
  return offerMode === "trial" ? "insufficient_trial" : "insufficient_pricing";
}

export function shouldShowQuotaOffer(
  scenario: CreateTaskConfirmScenario,
): boolean {
  return scenario !== "ready" && scenario !== "insufficient_paid";
}

export function getConfirmScenarioTitle(
  t: TranslateFn,
  scenario: CreateTaskConfirmScenario,
  canStartPartial: boolean,
): string {
  if (canStartPartial) {
    return t("v4.createTask.confirmPartialTitle");
  }
  if (scenario === "ready") {
    return t("v4.createTask.confirmReadyTitle");
  }
  if (scenario === "insufficient_paid") {
    return t("v4.createTask.confirmNoCreditsTitle");
  }
  if (scenario === "insufficient_trial") {
    return t("v4.createTask.confirmTrialTitle");
  }
  return t("v4.createTask.confirmPricingTitle");
}

export function formatConfirmCredits(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function ConfirmInfoCard({
  title,
  highlighted = false,
  compact = false,
  children,
}: {
  title: string;
  highlighted?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        ...cardStyle,
        ...(compact ? compactCardStyle : null),
        borderColor: highlighted
          ? "rgba(33, 128, 255, 0.22)"
          : v4Colors.cardBorder,
        boxShadow: highlighted ? "0 8px 30px rgba(33, 128, 255, 0.08)" : "none",
      }}
    >
      <div style={compact ? compactCardTitleStyle : cardTitleStyle}>{title}</div>
      {children}
    </div>
  );
}

export function CreditsEstimatePanel({
  requiredValue,
  availableValue,
  hint,
  requiredAction,
  requiredBreakdown,
  compact = false,
}: {
  requiredValue: ReactNode;
  availableValue: ReactNode;
  hint?: string;
  requiredAction?: ReactNode;
  /** 「所需」下方的组成说明，例如「含 AI 润色约 12K」。 */
  requiredBreakdown?: string | null;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <section style={compact ? compactEstimateSectionStyle : estimateSectionStyle}>
      <div
        style={
          compact ? compactEstimateSectionTitleStyle : estimateSectionTitleStyle
        }
      >
        {t("v4.createTask.confirmEstimatePanelTitle")}
      </div>
      <div style={compact ? compactSummaryStatsRowStyle : summaryStatsRowStyle}>
        <div style={summaryStatStyle}>
          <div style={summaryStatLabelStyle}>
            {t("v4.createTask.confirmCreditsRequired")}
          </div>
          <div
            style={
              compact ? compactSummaryStatValueStyle : summaryStatValueStyle
            }
          >
            {requiredValue}
          </div>
          {requiredBreakdown ? (
            <div style={requiredBreakdownStyle}>{requiredBreakdown}</div>
          ) : null}
          {requiredAction ? (
            <div
              style={
                compact ? compactRequiredActionRowStyle : requiredActionRowStyle
              }
            >
              {requiredAction}
            </div>
          ) : null}
        </div>
        <div style={summaryStatStyle}>
          <div style={summaryStatLabelStyle}>
            {t("v4.createTask.confirmCreditsAvailable")}
          </div>
          <div
            style={
              compact ? compactSummaryStatValueStyle : summaryStatValueStyle
            }
          >
            {availableValue}
          </div>
        </div>
      </div>
      {hint ? (
        <div style={compact ? compactEstimateHintStyle : estimateHintStyle}>
          {hint}
        </div>
      ) : null}
    </section>
  );
}

export function QuotaOfferPanel({
  scenario,
  subscriptionBenefitValue,
  subscriptionBenefitCaption,
  subdued = false,
}: {
  scenario: CreateTaskConfirmScenario;
  subscriptionBenefitValue?: string | null;
  subscriptionBenefitCaption?: string | null;
  /** 弱化营销卡片（如图片译确认弹窗）：无高亮边框、不展示功能格。 */
  subdued?: boolean;
}) {
  const { t } = useTranslation();
  if (!shouldShowQuotaOffer(scenario)) return null;

  const description = offerDescription(t, scenario);

  return (
    <ConfirmInfoCard
      title={offerTitle(t, scenario)}
      highlighted={!subdued}
      compact={subdued}
    >
      {description ? (
        <div
          style={
            subdued ? subduedOfferDescriptionStyle : offerDescriptionStyle
          }
        >
          {description}
        </div>
      ) : null}
      {!subdued && subscriptionBenefitValue ? (
        <div style={subscriptionBenefitStyle}>
          <div style={subscriptionBenefitLabelStyle}>
            {t("pricing.firstPayBonusRow", {
              defaultValue: "First-pay bonus (Basic)",
            })}
          </div>
          <div style={subscriptionBenefitValueStyle}>
            {subscriptionBenefitValue}
          </div>
          {subscriptionBenefitCaption ? (
            <div style={subscriptionBenefitCaptionStyle}>
              {t("v4.createTask.confirmRecommendedPlan")}:{" "}
              {subscriptionBenefitCaption}
            </div>
          ) : null}
        </div>
      ) : null}
      {!subdued ? (
        <div style={offerFeatureGridStyle}>
          {offerFeatures(t, scenario).map((feature) => (
            <div
              key={`${feature.title}-${feature.note ?? ""}`}
              style={offerFeatureItemStyle}
            >
              {feature.badge ? (
                <div style={offerFeatureBadgeStyle}>{feature.badge}</div>
              ) : null}
              <div style={offerFeatureTitleStyle}>{feature.title}</div>
              {feature.note ? (
                <div style={offerFeatureNoteStyle}>{feature.note}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </ConfirmInfoCard>
  );
}

function offerTitle(t: TranslateFn, scenario: CreateTaskConfirmScenario): string {
  if (scenario === "insufficient_paid") {
    return t("v4.createTask.confirmPaidOfferTitle");
  }
  return scenario === "insufficient_trial"
    ? t("v4.createTask.confirmTrialOfferTitle")
    : t("v4.createTask.confirmPricingOfferTitle");
}

function offerDescription(
  t: TranslateFn,
  scenario: CreateTaskConfirmScenario,
): string | null {
  if (scenario === "insufficient_paid") {
    return t("v4.createTask.confirmPaidOfferDesc");
  }
  if (scenario === "insufficient_trial") {
    return null;
  }
  return t("v4.createTask.confirmPricingOfferDesc");
}

function offerFeatures(
  t: TranslateFn,
  scenario: CreateTaskConfirmScenario,
): Array<{ title: string; note?: string; badge?: string }> {
  return scenario === "insufficient_trial"
    ? [
        {
          title: t("v4.createTask.confirmTrialFeatureModel"),
          note: t("v4.createTask.confirmTrialFeatureModelValue"),
        },
      ]
    : [
        { title: t("v4.createTask.confirmPricingFeatureCredits") },
        { title: t("v4.createTask.confirmPricingFeatureModel") },
        { title: t("v4.createTask.confirmPricingFeatureSpeed") },
      ];
}

const cardStyle = {
  borderRadius: 20,
  background: v4Colors.summaryBg,
  border: `1px solid ${v4Colors.cardBorder}`,
  padding: "20px 18px",
} as const;

const compactCardStyle = {
  borderRadius: 14,
  padding: "12px 14px",
} as const;

const cardTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  lineHeight: "20px",
  color: v4Colors.text,
  marginBottom: 14,
} as const;

const compactCardTitleStyle = {
  ...cardTitleStyle,
  marginBottom: 8,
} as const;

const estimateSectionStyle = {
  padding: "2px 0 4px",
} as const;

const estimateSectionTitleStyle = {
  fontSize: 13,
  fontWeight: 700,
  lineHeight: "20px",
  color: v4Colors.text,
  marginBottom: 14,
  overflowWrap: "anywhere",
} as const;

const summaryStatsRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 20,
} as const;

const summaryStatStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  minWidth: 0,
} as const;

const summaryStatLabelStyle = {
  color: v4Colors.textMuted,
  fontSize: 12,
  fontWeight: 700,
  lineHeight: "18px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  overflowWrap: "anywhere",
} as const;

const requiredBreakdownStyle = {
  color: v4Colors.textMuted,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "18px",
  overflowWrap: "anywhere",
} as const;

const summaryStatValueStyle = {
  color: v4Colors.text,
  fontSize: 30,
  fontWeight: 700,
  lineHeight: "34px",
  minWidth: 0,
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
} as const;

const requiredActionRowStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  minWidth: 0,
  marginTop: 10,
} as const;

const estimateHintStyle = {
  color: v4Colors.textMuted,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "18px",
  marginTop: 12,
  overflowWrap: "anywhere",
} as const;

const compactEstimateSectionStyle = {
  padding: 0,
} as const;

const compactEstimateSectionTitleStyle = {
  ...estimateSectionTitleStyle,
  marginBottom: 8,
} as const;

const compactSummaryStatsRowStyle = {
  ...summaryStatsRowStyle,
  gap: 12,
} as const;

const compactSummaryStatValueStyle = {
  ...summaryStatValueStyle,
  fontSize: 22,
  lineHeight: "26px",
} as const;

const compactRequiredActionRowStyle = {
  ...requiredActionRowStyle,
  marginTop: 6,
} as const;

const compactEstimateHintStyle = {
  ...estimateHintStyle,
  marginTop: 6,
} as const;

const offerFeatureGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
} as const;

const offerDescriptionStyle = {
  marginBottom: 14,
  color: v4Colors.textMuted,
  fontSize: 14,
  lineHeight: "22px",
} as const;

const subduedOfferDescriptionStyle = {
  color: v4Colors.textMuted,
  fontSize: 13,
  fontWeight: 500,
  lineHeight: "20px",
} as const;

const subscriptionBenefitStyle = {
  marginBottom: 14,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid rgba(122, 60, 255, 0.18)",
  background:
    "linear-gradient(180deg, rgba(122, 60, 255, 0.08) 0%, rgba(33, 128, 255, 0.04) 100%)",
} as const;

const subscriptionBenefitLabelStyle = {
  marginBottom: 6,
  color: "#7a3cff",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: "18px",
  letterSpacing: "0.02em",
  textTransform: "uppercase",
} as const;

const subscriptionBenefitValueStyle = {
  color: v4Colors.text,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: "24px",
} as const;

const subscriptionBenefitCaptionStyle = {
  marginTop: 8,
  color: v4Colors.textMuted,
  fontSize: 13,
  lineHeight: "20px",
} as const;

const offerFeatureItemStyle = {
  position: "relative",
  minHeight: 108,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  textAlign: "center",
  padding: "18px 12px 14px",
  borderRadius: 16,
  border: `1px solid ${v4Colors.cardBorder}`,
  background: v4Colors.cardBg,
} as const;

const offerFeatureBadgeStyle = {
  position: "absolute",
  top: 10,
  insetInlineEnd: 10,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 8px",
  borderRadius: 999,
  background: "rgba(122, 60, 255, 0.1)",
  color: "#7a3cff",
  fontSize: 11,
  fontWeight: 700,
  lineHeight: "16px",
} as const;

const offerFeatureTitleStyle = {
  color: v4Colors.text,
  fontSize: 15,
  fontWeight: 700,
  lineHeight: "22px",
} as const;

const offerFeatureNoteStyle = {
  marginTop: 6,
  color: v4Colors.textMuted,
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "18px",
} as const;
