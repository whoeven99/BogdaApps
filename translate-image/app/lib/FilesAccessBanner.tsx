import { Banner } from "@shopify/polaris";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { openGrantFilesAccess, type FilesGrantContext } from "./filesAccess";

export function FilesAccessBanner(props: FilesGrantContext) {
  const { t } = useTranslation();
  const grantFiles = useCallback(() => {
    void openGrantFilesAccess(t, { apiKey: props.apiKey, shop: props.shop });
  }, [props.apiKey, props.shop, t]);
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
