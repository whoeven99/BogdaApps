import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Badge,
  Button,
  Card,
  ConfigProvider,
  Flex,
  Skeleton,
  Typography,
} from "antd";
import { useTranslation } from "react-i18next";
// import useReport from "scripts/eventReport";
import { useState, useEffect } from "react";
import useReport from "scripts/eventReport";
const { Text } = Typography;

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
  const { reportClick, report } = useReport();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  const graphqlFetcher = useFetcher<any>();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  //   const { report, trackExposure, fetcherState } = useReport();
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
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);
  return (
    <Card
      title={
        <Flex align="center" gap={10}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
            {t("Image Translation Plugin")}
          </h2>
          {switcherOpen ? (
            <Badge color="hsl(102, 53%, 61%)" />
          ) : (
            <Badge color="#f50" />
          )}
        </Flex>
      }
      styles={{
        header: { borderBottom: "none" },
        body: {
          padding: "0 24px 12px 24px",
        },
      }}
    >
      <Flex vertical align="center" gap={8}>
        <Flex
          gap={8}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Text style={{ fontSize: "14px" }}>
            {switcherOpen
              ? t(
                  "Plugin enabled — product images and alt text will appear in the right language based on your site’s language settings.",
                )
              : t(
                  "Enable the plugin to ensure product images and alt text are displayed correctly for each published language.",
                )}
          </Text>
        </Flex>
        <Button
          onClick={handleSetting}
          type="default"
          style={{ width: "auto", alignSelf: "flex-end" }}
        >
          {switcherOpen ? t("Manage") : t("Enable")}
        </Button>
      </Flex>
    </Card>
  );
};

export default WelcomeCard;
