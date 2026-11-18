import type { CSSProperties } from "react";
import { Badge } from "@shopify/polaris";

type AppStatusTone = "neutral" | "info" | "success" | "caution" | "critical";

interface AppStatusBadgeProps {
  tone?: AppStatusTone;
  children: string;
  style?: CSSProperties;
}

const TONE: Record<AppStatusTone, "enabled" | "info" | "success" | "attention" | "critical"> = {
  neutral: "enabled",
  info: "info",
  success: "success",
  caution: "attention",
  critical: "critical",
};

export default function AppStatusBadge({ tone = "neutral", children }: AppStatusBadgeProps) {
  return <Badge tone={TONE[tone]}>{children}</Badge>;
}
