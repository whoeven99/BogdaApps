import type { ReactNode } from "react";
import { Badge, ProgressBar } from "@shopify/polaris";

export function StatusTag({
  status,
  label,
}: {
  status?: string;
  label: string;
}) {
  const tone =
    status === "COMPLETED" || status === "success"
      ? "success"
      : status === "FAILED" || status === "critical"
        ? "critical"
        : status === "PAUSED" || status === "caution"
          ? "attention"
          : "info";
  return <Badge tone={tone}>{label}</Badge>;
}

export function ProgressRing({ percent }: { percent: number }) {
  return <ProgressBar progress={Math.max(0, Math.min(100, percent))} size="small" />;
}

export function ImageJobMiniStageTrack({
  segments,
}: {
  segments: Array<{ label: string; percent: number; complete: boolean; active: boolean }>;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {segments.map((segment) => (
        <div key={segment.label}>
          <div style={{ fontSize: 12, marginBottom: 2 }}>{segment.label}</div>
          <ProgressBar progress={segment.percent} size="small" />
        </div>
      ))}
    </div>
  );
}

export function JobCardShell({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}
