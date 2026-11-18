import { Banner } from "@shopify/polaris";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { openGrantFilesAccess, type FilesGrantContext } from "./filesAccess";

export function FilesAccessBanner(props: Partial<FilesGrantContext> = {}) {
  const { t } = useTranslation();
  const grantFiles = useCallback(() => {
    if (!props.shop) return;
    void openGrantFilesAccess(t, { apiKey: props.apiKey, shop: props.shop });
  }, [props.apiKey, props.shop, t]);
  if (!props.shop) return null;
  return (
    <Banner
      tone="warning"
      title={t("imageTranslate.scopeMissing")}
      action={{
        content: t("imageTranslate.grantAccess"),
        onAction: grantFiles,
      }}
    />
  );
}
