import { Icon, InlineStack, Text, Tooltip } from "@shopify/polaris";
import { AlertCircleIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import type { ResourceListRow } from "./ContentImageResourceTable";

export function ImageResourceTranslationCell({
  row,
  failedInResource,
}: {
  row: ResourceListRow;
  failedInResource: number;
}) {
  const { t } = useTranslation();
  const total = row.imageCount ?? 0;
  const translated = row.translatedImageCount ?? 0;

  if (total <= 0 && failedInResource <= 0) {
    return <Text as="span" tone="subdued">—</Text>;
  }

  const complete = total > 0 && translated >= total && failedInResource === 0;
  const partial = total > 0 && (translated > 0 || failedInResource > 0);

  let tone: "success" | "caution" | "critical" | "neutral" = "neutral";
  if (complete) tone = "success";
  else if (failedInResource > 0) tone = "critical";
  else if (partial) tone = "caution";

  const label =
    total > 0
      ? t("contentImage.resourceTranslationCoverage", { translated, total })
      : t("contentImage.resourceTranslationFailuresOnly", { count: failedInResource });

  return (
    <InlineStack gap="150" blockAlign="center" wrap={false}>
      <AppStatusBadge tone={tone}>{label}</AppStatusBadge>
      {failedInResource > 0 ? (
        <Tooltip content={t("contentImage.resourceTranslationFailureTooltip", { count: failedInResource })}>
          <span style={{ display: "inline-flex", lineHeight: 0 }}>
            <Icon source={AlertCircleIcon} tone="critical" />
          </span>
        </Tooltip>
      ) : null}
    </InlineStack>
  );
}
