import { Icon, InlineStack, Text } from "@shopify/polaris";
import { InfoIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";

/** 当前语言下仍有批量失败图时，列表顶轻提示（非跳转、非重试入口）。 */
export function ImageTranslationFailureHint({ count }: { count: number }) {
  const { t } = useTranslation();
  if (count <= 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <InlineStack gap="200" blockAlign="start" wrap={false}>
        <Icon source={InfoIcon} tone="caution" />
        <Text as="p" variant="bodySm" tone="subdued">
          {t("contentImage.failed.hint", { count })}
        </Text>
      </InlineStack>
    </div>
  );
}
