import { Icon, InlineStack, Text } from "@shopify/polaris";
import { InfoIcon } from "@shopify/polaris-icons";
import { useTranslation } from "react-i18next";
import AppButton from "~/ui/components/AppButton";

/** 当前语言下仍有批量失败图时，列表顶提示；可跳进失败图筛选列表。 */
export function ImageTranslationFailureHint({
  count,
  active = false,
  onToggle,
}: {
  count: number;
  active?: boolean;
  onToggle?: () => void;
}) {
  const { t } = useTranslation();
  if (count <= 0 && !active) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <InlineStack gap="200" blockAlign="center" wrap>
        <Icon source={InfoIcon} tone="caution" />
        <Text as="p" variant="bodySm" tone="subdued">
          {active
            ? t("contentImage.failed.showing", { count })
            : t("contentImage.failed.hint", { count })}
        </Text>
        {onToggle ? (
          <AppButton type="text" size="small" onClick={onToggle}>
            {active ? t("contentImage.failed.showAll") : t("contentImage.failed.viewList")}
          </AppButton>
        ) : null}
      </InlineStack>
    </div>
  );
}
