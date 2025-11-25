import { useFetcher, useNavigate } from "@remix-run/react";
import { Button, ConfigProvider, Flex, Modal, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { IsShowFreePlan } from "~/api/JavaServer";
import { globalStore } from "~/globalStore";

const { Title, Text } = Typography;

interface HasPayForFreePlanModalProps {}

const HasPayForFreePlanModal: React.FC<HasPayForFreePlanModalProps> = ({}) => {
  const { t } = useTranslation();

  const [content, setContent] = useState<any>({
    show: false,
    plan: "",
  });

  const { plan, isNew } = useSelector((state: any) => state.userConfig);

  useEffect(() => {
    GetOrderStatus();
  }, [isNew]);

  const GetOrderStatus = async () => {
    if (!isNew && isNew !== null) {
      const hasShowModal = localStorage.getItem("ciwi-image-translation-freetrial-hasShow");
      if (hasShowModal) {
        return;
      } else {
        setTimeout(async () => {
          const hasShowModalResponse = await IsShowFreePlan({
            shop: globalStore?.shop || "",
            server: globalStore?.server || "",
          });
          console.log(hasShowModalResponse);
          
          if (hasShowModalResponse?.success) {
            if (hasShowModalResponse?.response) {
              setContent({
                show: true,
                success: true,
              });
            }
          }
          localStorage.setItem("ciwi-image-translation-freetrial-hasShow", "1");
        }, 100);
      }
    }
  };

  return (
    // 添加 Modal 组件
    <Modal
      open={content.show}
      onCancel={() =>
        setContent({
          ...content,
          show: false,
        })
      }
      footer={null}
      centered
      width={600}
      style={{
        maxWidth: "80%",
        border: "none",
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }}>
        <Title
          style={{
            margin: "0",
            fontSize: "1.25rem",
            fontWeight: 700,
            marginBottom: 24,
          }}
        >
          {t("Got a 5-day free trial")}
        </Title>
        <Text>
          {t("You have received {{ plan }} Plan benefits", {
            plan: plan?.type,
          })}
        </Text>
        <Space
          direction="vertical"
          style={{
            width: "100%",
            padding: "8px 4px",
            border: "1px solid #f0f0f0",
            borderRadius: "8px",
          }}
        >
          <Text>{t("Get 40 extra translations instantly")}</Text>
          <Text>{t("Clearer images with advanced AI models")}</Text>
          <Text>{t("More accurate multilingual results")}</Text>
          <Text>{t("Batch translate to save time")}</Text>
        </Space>
        <Flex justify="center">
          <Button
            type="primary"
            onClick={() =>
              setContent({
                ...content,
                show: false,
              })
            }
            style={{
              display: "flex",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            {t("Got it")}
          </Button>
        </Flex>
      </Space>
    </Modal>
  );
};

export default HasPayForFreePlanModal;
