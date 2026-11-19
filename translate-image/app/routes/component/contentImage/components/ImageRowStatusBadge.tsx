import { StatusTag } from "~/routes/app.translate-v4/components/V4JobCardParts";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import type { ImageRowLiveStatus } from "../imageRowLiveStatus";

export default function ImageRowStatusBadge({ status }: { status: ImageRowLiveStatus }) {
  if (status.kind === "tag") {
    return <StatusTag status={status.tagStatus} label={status.label} />;
  }
  return <AppStatusBadge tone={status.tone}>{status.label}</AppStatusBadge>;
}
