import { useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { StatusTag } from "~/routes/app.translate-v4/components/V4JobCardParts";
import listStyles from "~/ui/styles/appListPage.module.css";
import { imageJobResultPath, type ContentImageJob } from "../contentImageClient";
import { isCurrentImageJob } from "../imageJobFilters";
import { imageJobProcessedCount } from "../imageJobProgress";
import { imageJobStatusForTag, imageJobStatusLabel } from "../imageJobQueueDisplay";

export function ImagePageJobSection({
  job,
  languageLabel,
}: {
  job: ContentImageJob | null;
  languageLabel: string;
  onChanged?: (job: ContentImageJob | null) => void;
}) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  if (!isCurrentImageJob(job) || !job) return null;
  const processed = imageJobProcessedCount(job);
  const statusLabel = imageJobStatusLabel(job, t);
  return (
    <button
      type="button"
      className={listStyles.imageJobChip}
      onClick={() => navigate(imageJobResultPath(job.id))}
      aria-label={t("contentImage.job.chipAria", {
        status: statusLabel,
        language: languageLabel,
        done: processed,
        total: job.total,
      })}
    >
      <StatusTag status={imageJobStatusForTag(job.status)} label={statusLabel} />
      <span className={listStyles.imageJobChipMeta}>
        {t("contentImage.job.chip", {
          language: languageLabel,
          done: processed,
          total: job.total,
        })}
      </span>
    </button>
  );
}
