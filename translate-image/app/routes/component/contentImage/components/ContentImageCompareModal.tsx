import { Spinner, Text } from "@shopify/polaris";
import { useTranslation } from "react-i18next";
import AppButton from "~/ui/components/AppButton";
import { AppSModal } from "~/ui/components/AppSModal";
import { StatusTag } from "~/routes/app.translate-v4/components/V4JobCardParts";
import type { ImageRowLiveStatus } from "../imageRowLiveStatus";
import ImageRowStatusBadge from "./ImageRowStatusBadge";

type Props = {
  open: boolean;
  originalUrl: string;
  translatedUrl?: string | null;
  liveStatus?: ImageRowLiveStatus | null;
  translateDisabled?: boolean;
  translateLoading?: boolean;
  onTranslate?: () => void;
  onClose: () => void;
};

const frameStyle = {
  width: "100%",
  maxHeight: 360,
  objectFit: "contain" as const,
  background: "var(--p-color-bg-surface-secondary)",
  borderRadius: "var(--p-border-radius-200)",
};

const paneFrameStyle = {
  width: "100%",
  minHeight: 200,
  maxHeight: 360,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--p-color-bg-surface-secondary)",
  borderRadius: "var(--p-border-radius-200)",
  marginTop: 8,
} as const;

export default function ContentImageCompareModal(props: Props) {
  const { t } = useTranslation();
  const liveInProgress = props.liveStatus?.kind === "tag";
  const hasTranslated = Boolean(props.translatedUrl?.trim()) && !liveInProgress;
  const showLiveStatus = Boolean(props.liveStatus) && !hasTranslated;
  const showSyncLoading = Boolean(props.translateLoading) && !hasTranslated && !showLiveStatus;

  return (
    <AppSModal
      open={props.open}
      heading={t("contentImage.compare.heading")}
      size="large"
      onClose={props.onClose}
      secondaryActions={[{ content: t("Cancel"), onAction: props.onClose }]}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--p-space-400)",
        }}
      >
        <div>
          <Text as="p" variant="bodySm" tone="subdued">
            {t("contentImage.compare.original")}
          </Text>
          <img src={props.originalUrl} alt="" style={{ ...frameStyle, marginTop: 8 }} />
        </div>
        <div>
          <Text as="p" variant="bodySm" tone="subdued">
            {t("contentImage.compare.translated")}
          </Text>
          {hasTranslated ? (
            <img
              src={props.translatedUrl!}
              alt=""
              style={{ ...frameStyle, marginTop: 8 }}
            />
          ) : showLiveStatus && props.liveStatus ? (
            <div style={{ ...paneFrameStyle, flexDirection: "column", gap: 12 }}>
              <ImageRowStatusBadge status={props.liveStatus} />
            </div>
          ) : showSyncLoading ? (
            <div style={{ ...paneFrameStyle, flexDirection: "column", gap: 10 }}>
              <Spinner accessibilityLabel={t("v4.status.TRANSLATING")} size="small" />
              <StatusTag status="TRANSLATING" label={t("v4.status.TRANSLATING")} />
            </div>
          ) : (
            <div style={paneFrameStyle}>
              <AppButton
                type="primary"
                disabled={props.translateDisabled}
                onClick={props.onTranslate}
              >
                {t("contentImage.action.translate")}
              </AppButton>
            </div>
          )}
        </div>
      </div>
    </AppSModal>
  );
}
