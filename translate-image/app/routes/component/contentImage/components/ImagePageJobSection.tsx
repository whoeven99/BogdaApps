import { useNavigate } from "@remix-run/react";
import ContentImageJobBar from "./ContentImageJobBar";
import { imageJobResultPath, type ContentImageJob } from "../contentImageClient";
import { isCurrentImageJob } from "../imageJobFilters";

export function ImagePageJobSection({
  job,
  languageLabel,
  onChanged,
}: {
  job: ContentImageJob | null;
  languageLabel: string;
  onChanged: (job: ContentImageJob | null) => void;
}) {
  const navigate = useNavigate();
  if (!isCurrentImageJob(job) || !job) return null;
  return (
    <ContentImageJobBar
      job={job}
      languageLabel={languageLabel}
      onChanged={onChanged}
      onOpen={() => navigate(imageJobResultPath(job.id))}
    />
  );
}
