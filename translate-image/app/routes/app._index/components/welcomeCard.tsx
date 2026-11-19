import { Banner } from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import useReport from "scripts/eventReport";

interface WelcomeCardProps {
  switcherOpen: boolean;
  blockUrl: string;
  shop: string;
}

const WelcomeCard: React.FC<WelcomeCardProps> = ({
  switcherOpen,
  blockUrl,
  shop,
}) => {
  const { reportClick } = useReport();
  const { t } = useTranslation();
  const fetcher = useFetcher<any>();

  const handleSetting = () => {
    reportClick("dashboard_open_setting");
    window.open(blockUrl, "_blank");
    fetcher.submit(
      {
        log: `${shop} 点击了配置switcher按钮，前往激活插件`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  };

  const action = { content: switcherOpen ? t("Manage") : t("Enable"), onAction: handleSetting };

  return (
    <Banner
      title={switcherOpen ? t("Plugin enabled") : t("Enable plugin")}
      tone={switcherOpen ? "success" : "warning"}
      action={switcherOpen ? undefined : action}
      secondaryAction={switcherOpen ? action : undefined}
    />
  );
};

export default WelcomeCard;
