import { Button, Flex, Modal, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

const { Title, Text } = Typography;
const HAS_SHOWN_KEY = "ciwi-image-translation-freetrial-hasShow";

function shouldShowTrialStartedModal({
  isNew,
  isInFreePlanTime,
  hasShownLocal,
}: {
  isNew: boolean | null;
  isInFreePlanTime: boolean;
  hasShownLocal: boolean;
}) {
  return isNew === false && isInFreePlanTime === true && hasShownLocal !== true;
}

const HasPayForFreePlanModal: React.FC = () => {
  const { t } = useTranslation();
  const [content, setContent] = useState<{ show: boolean }>({ show: false });
  const { plan, isNew } = useSelector((state: any) => state.userConfig);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasShownLocal = Boolean(localStorage.getItem(HAS_SHOWN_KEY));
    const show = shouldShowTrialStartedModal({
      isNew,
      isInFreePlanTime: Boolean(plan?.isInFreePlanTime),
      hasShownLocal,
    });
    if (!show) return;
    localStorage.setItem(HAS_SHOWN_KEY, "1");
    setContent({ show: true });
  }, [isNew, plan?.isInFreePlanTime]);

  return (
    <Modal
      open={content.show}
      onCancel={() => setContent({ show: false })}
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
        <ul style={{ paddingLeft: "20px", margin: 0 }}>
          <li>
            {t(
              "Get 40 extra translations instantly,plus {{count}} more after 5 days",
              { count: plan.id === 2 ? 100 : plan.id === 3 ? 300 : 800 },
            )}
          </li>
          <li>{t("Clearer images with advanced AI models")}</li>
          <li>{t("More accurate multilingual results")}</li>
          <li>{t("Batch translate to save time")}</li>
        </ul>
        <Flex justify="center">
          <Button
            type="primary"
            onClick={() => setContent({ show: false })}
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
