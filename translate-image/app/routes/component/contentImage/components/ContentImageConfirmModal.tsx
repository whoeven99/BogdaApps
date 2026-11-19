import { Checkbox, Text } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppSModal } from "~/ui/components/AppSModal";
import {
  ConfirmInfoCard,
  CreditsEstimatePanel,
  formatConfirmCredits,
  getConfirmScenarioTitle,
  QuotaOfferPanel,
  shouldShowQuotaOffer,
  type CreateTaskQuotaOfferMode,
} from "~/routes/app.translate-v4/components/CreditsConfirmPanel";
import { resolveImageTranslateConfirmState } from "../imageTranslateConfirmState";
import type { InFlowOption } from "~/ui/components/InFlowSelect";
import { ImageTranslateModelSelect } from "./ImageTranslateModelSelect";
import listStyles from "~/ui/styles/appListPage.module.css";
import "~/routes/app.translate-v4/components/createTaskConfirmModal.css";

type Props = {
  open: boolean;
  count: number;
  languageLabel: string;
  model: string;
  modelOptions: InFlowOption[];
  onModelChange: (model: string) => void;
  creditsPerImage: number;
  remainingCredits: number | null;
  quotaOfferMode: CreateTaskQuotaOfferMode;
  hasTranslated: boolean;
  loading: boolean;
  onConfirm: (retranslate: boolean) => void;
  onBuyCredits: (requiredCredits: number) => void;
  onClose: () => void;
};

const bodyStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
};

const detailListStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
};

const detailLineStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(116px, 140px) minmax(0, 1fr)",
  gap: 8,
  alignItems: "start",
} as const;

const detailLabelStyle = {
  color: "var(--app-color-text-secondary)",
  fontSize: 13,
  fontWeight: 600,
  lineHeight: "20px",
} as const;

const detailValueStyle = {
  color: "var(--app-color-text)",
  fontSize: 13,
  fontWeight: 500,
  lineHeight: "20px",
  overflowWrap: "anywhere" as const,
};

export default function ContentImageConfirmModal(props: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [retranslate, setRetranslate] = useState(false);
  useEffect(() => {
    if (props.open) setRetranslate(false);
  }, [props.open]);

  const { scenario, canStartPartial, affordableCount, requiredCredits } =
    useMemo(
      () =>
        resolveImageTranslateConfirmState({
          count: props.count,
          creditsPerImage: props.creditsPerImage,
          remainingCredits: props.remainingCredits,
          quotaOfferMode: props.quotaOfferMode,
        }),
      [
        props.count,
        props.creditsPerImage,
        props.remainingCredits,
        props.quotaOfferMode,
      ],
    );

  const isReady = scenario === "ready";
  const isInsufficientPaid = scenario === "insufficient_paid";
  const scenarioTitle = getConfirmScenarioTitle(t, scenario, canStartPartial);
  const remaining = props.remainingCredits;

  const estimateHint = useMemo(() => {
    if (isReady) return undefined;
    if (canStartPartial) {
      return t("contentImage.confirm.partial", { count: affordableCount });
    }
    if (isInsufficientPaid) {
      return t("imageTranslate.insufficientCredits");
    }
    return undefined;
  }, [affordableCount, canStartPartial, isInsufficientPaid, isReady, t]);

  const goPricing = scenario === "insufficient_trial" || scenario === "insufficient_pricing";
  const primaryActionLabel = isReady
    ? t("contentImage.confirm.start")
    : goPricing
      ? t("v4.createTask.confirmViewPlans")
      : canStartPartial
        ? t("v4.createTask.confirmStartPartial")
        : isInsufficientPaid
          ? t("v4.createTask.confirmBuyCreditsOnly")
          : t("v4.createTask.confirmBuyCreditsOnly");

  const secondaryActionLabel = isReady
    ? null
    : canStartPartial
      ? t("v4.createTask.confirmBuyCreditsAndStart")
      : null;

  const handlePrimaryAction = () => {
    if (isReady || canStartPartial) {
      props.onConfirm(retranslate);
      return;
    }
    if (goPricing) {
      props.onClose();
      navigate("/app/pricing");
      return;
    }
    props.onBuyCredits(requiredCredits);
  };

  const handleSecondaryAction = () => {
    if (canStartPartial) {
      props.onBuyCredits(requiredCredits);
    }
  };

  if (!props.open) return null;

  return (
    <AppSModal
      open
      heading={scenarioTitle}
      onClose={props.onClose}
      size="base"
      className="create-task-confirm-compact app-s-modal-inflow-host"
      primaryAction={{
        content: primaryActionLabel,
        onAction: handlePrimaryAction,
        loading: props.loading,
        disabled: affordableCount < 1 && (isReady || canStartPartial),
      }}
      secondaryActions={
        secondaryActionLabel
          ? [
              { content: t("Cancel"), onAction: props.onClose },
              {
                content: secondaryActionLabel,
                onAction: handleSecondaryAction,
              },
            ]
          : [{ content: t("Cancel"), onAction: props.onClose }]
      }
    >
      <div style={bodyStyle}>
        <CreditsEstimatePanel
          compact
          requiredValue={formatConfirmCredits(requiredCredits)}
          availableValue={
            remaining == null ? "—" : formatConfirmCredits(remaining)
          }
          requiredBreakdown={t("contentImage.confirm.perImage", {
            credits: formatConfirmCredits(props.creditsPerImage),
          })}
          hint={estimateHint}
        />

        {shouldShowQuotaOffer(scenario) ? (
          <QuotaOfferPanel scenario={scenario} subdued />
        ) : null}

        <ConfirmInfoCard title={t("contentImage.confirm.taskDetailTitle")} compact>
          <div style={detailListStyle}>
            <div style={detailLineStyle}>
              <div style={detailLabelStyle}>{t("contentImage.confirm.targetLanguage")}</div>
              <div style={detailValueStyle}>{props.languageLabel}</div>
            </div>
            <div style={detailLineStyle}>
              <div style={detailLabelStyle}>{t("contentImage.confirm.imageCount")}</div>
              <div style={detailValueStyle}>{props.count}</div>
            </div>
          </div>
        </ConfirmInfoCard>

        {props.hasTranslated ? (
          <Checkbox
            label={t("contentImage.confirm.retranslate")}
            checked={retranslate}
            onChange={setRetranslate}
          />
        ) : null}

        <Text as="p" tone="subdued" variant="bodySm">
          {t("imageTranslate.savedToFiles")}
        </Text>

        <div className={listStyles.contentImageConfirmModelRow}>
          <ImageTranslateModelSelect
            inModalConfirm
            active
            options={props.modelOptions}
            value={props.model}
            onChange={props.onModelChange}
            disabled={props.loading}
          />
        </div>
      </div>
    </AppSModal>
  );
}
