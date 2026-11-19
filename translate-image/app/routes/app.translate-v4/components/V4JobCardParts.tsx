import type { ReactNode } from "react";
import { Badge, ProgressBar } from "@shopify/polaris";
import { v4Colors } from "../v4Styles";

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

const PROGRESS_RING_R = 15.5;
const PROGRESS_RING_C = 2 * Math.PI * PROGRESS_RING_R;

export function ProgressRing({ percent, size = "md" }: { percent: number; size?: "md" | "sm" }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const filled = (clamped / 100) * PROGRESS_RING_C;
  const dash = `${filled} ${PROGRESS_RING_C - filled}`;
  const done = clamped >= 100;
  const dim = size === "sm" ? 44 : 58;
  const fontSize = size === "sm" ? 10 : 12;
  const strokeWidth = size === "sm" ? 2.8 : 3.2;
  return (
    <div style={{ position: "relative", width: dim, height: dim, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: dim, height: dim, transform: "rotate(-90deg)" }}>
        <circle cx="18" cy="18" r="15.5" fill="none" stroke={v4Colors.ringTrack} strokeWidth={strokeWidth} />
        <circle
          cx="18"
          cy="18"
          r="15.5"
          fill="none"
          stroke={done ? v4Colors.success : v4Colors.primary}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinecap="round"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: v4Colors.mono,
          fontSize,
          fontWeight: 600,
          color: v4Colors.text,
        }}
      >
        {clamped}%
      </div>
    </div>
  );
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
