import { useNavigate } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import type { ImageResourceType } from "~/lib/imageResourcePaths";
import { switcherImageListPath } from "~/lib/switcherPagePath";
import { stripTrailingLocaleCode } from "~/routes/app.translate-v4/localeDisplay";
import { InFlowSelect } from "~/ui/components/InFlowSelect";
import listStyles from "~/ui/styles/appListPage.module.css";

const MODULE_PATH: Record<string, string> = {
  product: "/app/product",
  article: "/app/article",
  page: "/app/page",
  collection: "/app/collection",
  file: "/app/file",
  theme: "/app/theme",
  switcherImage: "/app/third-party",
};

export type ImageManageSwitchersProps = {
  type: ImageResourceType | "switcher";
  moduleValue?: string;
  language: string;
  languageOptions: Array<{ value: string; label: string }>;
  onLanguageChange: (value: string) => void;
};

export function ImageManageSwitchers(props: ImageManageSwitchersProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const itemOptions = [
    { value: "product", label: t("Product images") },
    { value: "article", label: t("Article images") },
    { value: "page", label: t("Page images") },
    { value: "collection", label: t("Collection images") },
    { value: "file", label: t("Other images") },
    { value: "theme", label: t("Theme images") },
    { value: "switcherImage", label: t("Third-party images") },
  ];
  const current =
    props.moduleValue ??
    (props.type === "switcher" ? "switcherImage" : props.type);
  return (
    <div className={listStyles.imageManageSwitchers}>
      {props.languageOptions.length > 0 ? (
        <div className={listStyles.imageManageLangSelect}>
          <InFlowSelect
            label=""
            labelHidden
            toolbarTrigger
            triggerTextNowrap
            menuFitContent
            options={props.languageOptions.map((option) => ({
              ...option,
              label: stripTrailingLocaleCode(option.label),
            }))}
            value={props.language}
            onChange={props.onLanguageChange}
          />
        </div>
      ) : null}
      <div className={listStyles.imageManageModuleSelect}>
        <InFlowSelect
          label=""
          labelHidden
          toolbarTrigger
          triggerTextNowrap
          menuFitContent
          options={itemOptions}
          value={current}
          onChange={(item) => {
            const qs = props.language ? `?language=${encodeURIComponent(props.language)}` : "";
            if (item === "switcherImage") {
              navigate(switcherImageListPath({ language: props.language || undefined }));
              return;
            }
            navigate(`${MODULE_PATH[item] ?? "/app/product"}${qs}`);
          }}
        />
      </div>
    </div>
  );
}
