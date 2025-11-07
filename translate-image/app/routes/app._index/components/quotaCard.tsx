import { TitleBar } from "@shopify/app-bridge-react";
import { Page } from "@shopify/polaris";
import {
  Space,
  Row,
  Col,
  Card,
  Progress,
  Button,
  Typography,
  Alert,
  Skeleton,
  Popover,
  Badge,
  Flex,
  Switch,
  Table,
  Collapse,
  Modal,
  CollapseProps,
  Grid,
} from "antd";
import { CheckOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import { useEffect, useMemo, useState } from "react";
import useReport from "scripts/eventReport";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
// import { OptionType } from "~/components/paymentModal";
import { useFetcher } from "@remix-run/react/dist/components";
import { AddCreaditsModal } from "./addCreditsModal";
const { Title, Text, Paragraph } = Typography;
export interface OptionType {
  key: string;
  name: string;
  Credits: number;
  price: {
    comparedPrice: number;
    currencyCode: string;
  };
}
export const QuotaCard = () => {
  const { reportClick, report } = useReport();
  const { t } = useTranslation();
  const { chars, totalChars } = useSelector((state: any) => state.userConfig);

  const [isLoading, setIsLoading] = useState(true);
  const [openModal, setOpenModal] = useState<boolean>(false);
  useEffect(() => {
    setIsLoading(false);
  }, []);
  return (
    <Card loading={isLoading}>
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Flex
            gap={8}
            align="center"
            justify="space-between"
            style={{ width: "100%" }}
          >
            <Flex align="center" gap={8}>
              <Title level={2} style={{ marginBottom: 0, fontSize: "20px" }}>
                {t("Translation Quota")}
              </Title>
              <Popover
                content={t("Permanent quotas · Never expire · Top up anytime.")}
              >
                <QuestionCircleOutlined />
              </Popover>
            </Flex>
            {/* <Button
              type="default"
              onClick={() => {
                setOpenModal(true);
                reportClick("pricing_balance_add");
              }}
            >
              {t("Add credits")}
            </Button> */}
          </Flex>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {chars !== undefined && totalChars !== undefined && (
            <div
              dangerouslySetInnerHTML={{
                __html: t(
                  "{{currentCredits}} has been used, total credits: {{maxCredits}}.",
                  {
                    currentCredits: chars?.toLocaleString() || 0,
                    maxCredits: totalChars?.toLocaleString() || 0,
                  },
                ),
              }}
            />
          )}
        </div>
        <Progress
          percent={
            totalChars == 0 ? 100 : Math.round((chars / totalChars) * 100)
          }
          size={["100%", 15]}
          strokeColor="#007F61"
          showInfo={false}
        />
      </Space>
      <AddCreaditsModal
        openModal={openModal}
        onClose={() => setOpenModal(false)}
        action="quotacard"
      />
    </Card>
  );
};
