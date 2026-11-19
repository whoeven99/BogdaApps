import { Banner } from "@shopify/polaris";

export function JobNoticeBar({
  tone,
  children,
  action,
}: {
  tone?: "info" | "warning" | "critical" | "success";
  children: string;
  action?: { content: string; onAction: () => void };
}) {
  return (
    <Banner
      tone={tone === "warning" ? "warning" : tone === "critical" ? "critical" : "info"}
      action={action}
    >
      <p>{children}</p>
    </Banner>
  );
}
