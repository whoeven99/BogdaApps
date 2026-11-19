import { Button } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatAppI18nNumber } from "~/lib/appI18nRtl";
import { v4CardStyle, v4Colors } from "~/routes/app.translate-v4/v4Styles";
import {
  ImageJobMiniStageTrack,
  ProgressRing,
  StatusTag,
} from "~/routes/app.translate-v4/components/V4JobCardParts";
import {
  controlContentImageJob,
  imageJobKindLabelKey,
  imageJobResultPath,
  isActiveJob,
  type ContentImageJob,
} from "../contentImageClient";
import { imageJobProcessedCount, jobProgressPercent } from "../imageJobProgress";
import {
  getImageJobPauseNotice,
  imageJobMiniStageTrackLabels,
  imageJobStageSummary,
  imageJobStatusForTag,
  imageJobStatusLabel,
} from "../imageJobQueueDisplay";
import { JobNoticeBar } from "~/routes/app.translate-v4/components/JobNoticeBar";

function ImageJobCollapsedMeta({ job }: { job: ContentImageJob }) {
  const { t, i18n } = useTranslation();
  const processed = imageJobProcessedCount(job);
  const items: string[] = [
    t("contentImage.job.imagesShort", { done: processed, total: job.total }),
  ];
  if (job.failed > 0) items.push(t("contentImage.job.failed", { count: job.failed }));
  if (job.creditsUsed > 0) {
    items.push(
      t("v4.job.creditsShort", {
        formattedCount: formatAppI18nNumber(job.creditsUsed, i18n.language),
      }),
    );
  }

  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: v4Colors.textMuted,
        lineHeight: 1.4,
      }}
    >
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}

export default function CompactImageJobCard({
  job,
  onChanged,
  onBuyCredits,
}: {
  job: ContentImageJob;
  onChanged: (job: ContentImageJob | null) => void;
  /** 积分不足暂停时打开补额度弹窗（与批量翻译确认弹窗一致）。 */
  onBuyCredits?: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const active = isActiveJob(job);
  const percent = jobProgressPercent(job);
  const miniStageSegments = imageJobMiniStageTrackLabels(job, t);
  const statusLabel = imageJobStatusLabel(job, t);
  const stageSummary = imageJobStageSummary(job, t);
  const pauseNotice = getImageJobPauseNotice(job, t);

  const control = async (intent: "pause" | "resume" | "cancel") => {
    setBusy(intent);
    const res = await controlContentImageJob(job.id, intent);
    setBusy(null);
    if (res.success) onChanged(res.response);
    else shopify.toast.show(t("Image translation failed"), { isError: true });
  };

  const canPause = active && job.status !== "PAUSED";
  const canResume = active && job.status === "PAUSED";
  const canCancel = active && job.status !== "PAUSED";

  return (
    <div
      style={{
        ...v4CardStyle,
        padding: expanded ? "16px 18px" : "14px 16px",
        marginBottom: 10,
        background: expanded ? v4Colors.cardSubdued : v4Colors.cardBg,
        border: expanded ? "1px solid #d6e4ff" : "none",
        boxShadow: "var(--app-shadow-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <ProgressRing percent={percent} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 5,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontWeight: 800,
                fontSize: 14,
                color: v4Colors.text,
                minWidth: 0,
                overflowWrap: "anywhere",
              }}
            >
              {t("contentImage.job.title", {
                kind: t(imageJobKindLabelKey(job.kind)),
                language: job.targetLanguage,
              })}
            </span>
            <StatusTag status={imageJobStatusForTag(job.status)} label={statusLabel} />
            {stageSummary ? (
              <span
                style={{
                  fontSize: 12,
                  color: v4Colors.textFaint,
                  fontWeight: 400,
                  minWidth: 0,
                  overflowWrap: "anywhere",
                }}
              >
                {stageSummary}
              </span>
            ) : null}
          </div>
          <ImageJobMiniStageTrack segments={miniStageSegments} />
          {!expanded ? <ImageJobCollapsedMeta job={job} /> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginTop: -2 }}>
          <Button
            variant={expanded ? "secondary" : "plain"}
            size="slim"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? t("v4.tasks.collapse") : t("v4.tasks.view")}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div
          style={{
            marginTop: 14,
            padding: "14px 14px 12px",
            borderTop: `1px solid ${v4Colors.divider}`,
            background: "rgba(255,255,255,0.6)",
            borderRadius: 10,
          }}
        >
          <ImageJobCollapsedMeta job={job} />
          {active ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
                marginTop: 14,
                paddingTop: 12,
                borderTop: `1px solid ${v4Colors.divider}`,
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {canResume ? (
                  <Button
                    variant="primary"
                    size="slim"
                    loading={busy === "resume"}
                    onClick={() => void control("resume")}
                  >
                    {t("v4.tasks.resume")}
                  </Button>
                ) : null}
                {canPause ? (
                  <Button size="slim" loading={busy === "pause"} onClick={() => void control("pause")}>
                    {t("v4.tasks.pause")}
                  </Button>
                ) : null}
                {canCancel ? (
                  <Button
                    tone="critical"
                    variant="secondary"
                    size="slim"
                    loading={busy === "cancel"}
                    onClick={() => void control("cancel")}
                  >
                    {t("v4.tasks.cancelTask")}
                  </Button>
                ) : null}
              </div>
              <Button size="slim" onClick={() => navigate(imageJobResultPath(job.id))}>
                {t("contentImage.job.viewResult")}
              </Button>
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <Button size="slim" onClick={() => navigate(imageJobResultPath(job.id))}>
                {t("contentImage.job.viewResult")}
              </Button>
            </div>
          )}
        </div>
      ) : null}

      {pauseNotice ? (
        <JobNoticeBar
          tone="warning"
          action={
            pauseNotice.showBuyCredits && onBuyCredits
              ? { content: t("Buy credits"), onAction: onBuyCredits }
              : undefined
          }
        >
          {pauseNotice.message}
        </JobNoticeBar>
      ) : null}
    </div>
  );
}
