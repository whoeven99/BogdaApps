import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { useTranslation } from "react-i18next";
import { InFlowSelect } from "~/ui/components/InFlowSelect";
import listStyles from "~/ui/styles/appListPage.module.css";
import {
  ImageManageSwitchers,
  type ImageManageSwitchersProps,
} from "../ImageManageSwitchers";

type StatusFilter = {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
};

type ImageManageToolbarProps = {
  searchPlaceholder: string;
  query: string;
  onQueryChange: (value: string) => void;
  switchers: ImageManageSwitchersProps;
  status?: StatusFilter;
};

export function ImageManageToolbar({
  searchPlaceholder,
  query,
  onQueryChange,
  switchers,
  status,
}: ImageManageToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className={listStyles.imageManageToolbarRow}>
      <div className={listStyles.imageManageSearchField}>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          aria-label={t("contentImage.search")}
        />
      </div>
      {status ? (
        <div className={listStyles.imageManageStatusSelect}>
          <InFlowSelect
            label={t("contentImage.column.status")}
            labelHidden
            toolbarTrigger
            triggerTextNowrap
            menuFitContent
            options={status.options}
            value={status.value}
            onChange={status.onChange}
          />
        </div>
      ) : null}
      <ImageManageSwitchers {...switchers} />
    </div>
  );
}
