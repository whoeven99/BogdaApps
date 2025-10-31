import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { Button, Card, ConfigProvider, Flex, Skeleton, Typography } from "antd";
import { useTranslation } from "react-i18next";
// import useReport from "scripts/eventReport";
import { useState, useEffect } from "react";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  const graphqlFetcher = useFetcher<any>();
  const [isMobile, setIsMobile] = useState<boolean>(false);
  //   const { report, trackExposure, fetcherState } = useReport();
  const handleSetting = () => {
    window.open(blockUrl, "_blank");
    // if (!switcherOpen) {
    //   // TODO: Disable App
    //   window.open(blockUrl, "_blank");
    //   // fetcher.submit(
    //   //   {
    //   //     log: `${shop} 前往开启switcher, 从主页面点击`,
    //   //   },
    //   //   {
    //   //     method: "POST",
    //   //     action: "/log",
    //   //   },
    //   // );
    // } else {
    //   // TODO: Setup App
    //   localStorage.setItem("switcherCard", "true");
    //   // fetcher.submit(
    //   //   {
    //   //     log: `${shop} 前往配置switcher, 从主页面点击`,
    //   //   },
    //   //   {
    //   //     method: "POST",
    //   //     action: "/log",
    //   //   },
    //   // );
    //   // setTimeout(() => {
    //   //   navigate("/app/switcher");
    //   // }, 500);
    // }
    // report(
    //   { status: !switcherOpen ? 0 : 1 },
    //   { method: "post", action: "/app", eventType: "click" },
    //   "dashboard_switcher_button",
    // );
  };
  const handleTestGraphqlData = () => {
    const formData = new FormData();
    formData.append("quailtyEvaluation", JSON.stringify({}));
    graphqlFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
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
        <h2 style={{ margin: 0, fontSize: "20px",fontWeight:600 }}>
          {switcherOpen
            ? t("Image Translation Plugin active")
            : t("Image Translation Plugin not enabled")}
        </h2>
      }
      styles={{
        header: { borderBottom: "none" },
        body: {
          padding: "0 24px 12px 24px",
        },
      }}
      // extra={
      //   <Button
      //     icon={<RedoOutlined spin={loading} />}
      //     type="link"
      //     onClick={handleReload}
      //   />
      // }
    >
      <Flex vertical align="center" gap={8}>
        <Flex
          gap={8}
          style={{ width: "100%", justifyContent: "space-between" }}
        >
          <Text style={{ fontSize: "14px" }}>
            {switcherOpen
              ? t(
                  "Your image translation plugin is currently active. Product images and alt text are automatically synced and translated for all enabled languages. ",
                )
              : t(
                  "Enable the plugin to automatically translate product images and alt text across languages. This allows your store visuals to stay consistent with translated content.",
                )}
          </Text>
        </Flex>
        <Button
          onClick={() => {
            handleSetting();
          }}
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
