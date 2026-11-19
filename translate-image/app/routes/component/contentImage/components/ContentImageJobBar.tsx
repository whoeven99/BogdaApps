import { BlockStack, Button, InlineStack, Text } from "@shopify/polaris";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ImageJobMiniStageTrack, StatusTag } from "~/routes/app.translate-v4/components/V4JobCardParts";
import {
  controlContentImageJob,
  imageJobKindLabelKey,
  isActiveJob,
  type ContentImageJob,
} from "../contentImageClient";
import { imageJobProcessedCount, jobProgressPercent } from "../imageJobProgress";
import {
  imageJobMiniStageTrackLabels,
  imageJobStageSummary,
  imageJobStatusForTag,
  imageJobStatusLabel,
} from "../imageJobQueueDisplay";

export { jobProgressPercent };

type Props = {
  job: ContentImageJob;
  languageLabel: string;
  onChanged: (job: ContentImageJob | null) => void;
  onOpen?: () => void;
};

export default function ContentImageJobBar({ job, languageLabel, onChanged, onOpen }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const miniStageSegments = imageJobMiniStageTrackLabels(job, t);
  const statusLabel = imageJobStatusLabel(job, t);
  const stageSummary = imageJobStageSummary(job, t);
  const processed = imageJobProcessedCount(job);

  const control = async (intent: "pause" | "resume" | "cancel") => {
    setBusy(intent);
    const res = await controlContentImageJob(job.id, intent);
    setBusy(null);
    if (res.success) onChanged(res.response);
    else shopify.toast.show(t("Image translation failed"), { isError: true });
  };

  const active = isActiveJob(job);

  return (
    <BlockStack gap="300">
      <InlineStack align="space-between" blockAlign="center" gap="200" wrap={false}>
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          style={{
            background: "none",
            border: 0,
            padding: 0,
            textAlign: "start",
            cursor: onOpen ? "pointer" : "default",
            flex: 1,
            minWidth: 0,
          }}
        >
          <BlockStack gap="100">
            <InlineStack gap="200" blockAlign="center" wrap>
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {t("contentImage.job.title", {
                  kind: t(imageJobKindLabelKey(job.kind)),
                  language: languageLabel,
                })}
              </Text>
              <StatusTag status={imageJobStatusForTag(job.status)} label={statusLabel} />
            </InlineStack>
            {stageSummary ? (
              <Text as="p" variant="bodySm" tone="subdued">
                {stageSummary}
                {" · "}
                {t("contentImage.job.imagesShort", { done: processed, total: job.total })}
                {job.failed > 0 ? ` · ${t("contentImage.job.failed", { count: job.failed })}` : ""}
              </Text>
            ) : (
              <Text as="p" variant="bodySm" tone="subdued">
                {t("contentImage.job.imagesShort", { done: processed, total: job.total })}
                {job.failed > 0 ? ` · ${t("contentImage.job.failed", { count: job.failed })}` : ""}
              </Text>
            )}
          </BlockStack>
        </button>
        <InlineStack gap="200">
          {active ? (
            <>
              {job.status === "PAUSED" ? (
                <Button loading={busy === "resume"} onClick={() => void control("resume")}>
                  {t("v4.tasks.resume")}
                </Button>
              ) : (
                <Button loading={busy === "pause"} onClick={() => void control("pause")}>
                  {t("v4.tasks.pause")}
                </Button>
              )}
              {job.status !== "PAUSED" ? (
                <Button
                  tone="critical"
                  variant="plain"
                  loading={busy === "cancel"}
                  onClick={() => void control("cancel")}
                >
                  {t("v4.tasks.cancelTask")}
                </Button>
              ) : null}
            </>
          ) : null}
          {onOpen ? (
            <Button variant="plain" onClick={onOpen}>
              {t("contentImage.job.viewResult")}
            </Button>
          ) : null}
        </InlineStack>
      </InlineStack>
      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        style={{
          background: "none",
          border: 0,
          padding: 0,
          width: "100%",
          cursor: onOpen ? "pointer" : "default",
        }}
      >
        <ImageJobMiniStageTrack segments={miniStageSegments} />
      </button>
    </BlockStack>
  );
}
