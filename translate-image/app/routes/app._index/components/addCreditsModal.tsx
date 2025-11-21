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
export const AddCreaditsModal = ({
  openModal,
  onClose,
  action,
  productId,
  imageId,
}: {
  openModal: boolean;
  onClose: () => void;
  action: string;
  productId?: string;
  imageId?: string;
}) => {
  const { reportClick, report } = useReport();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const { t } = useTranslation();
  const [addCreditsModalOpen, setAddCreditsModalOpen] = useState(openModal);
  const [selectedOptionKey, setSelectedOption] = useState<string>("option-1");
  const creditOptions: OptionType[] = [
    {
      key: "option-1",
      name: "50",
      Credits: 500000 / 2000 / 5,
      price: {
        comparedPrice: 3.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-2",
      name: "100",
      Credits: 1000000 / 2000 / 5,
      price: {
        comparedPrice: 7.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-3",
      name: "200",
      Credits: 2000000 / 2000 / 5,
      price: {
        comparedPrice: 15.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-4",
      name: "300",
      Credits: 3000000 / 2000 / 5,
      price: {
        comparedPrice: 23.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-5",
      name: "500",
      Credits: 5000000 / 2000 / 5,
      price: {
        comparedPrice: 39.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-6",
      name: "1000",
      Credits: 10000000 / 2000 / 5,
      price: {
        comparedPrice: 79.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-7",
      name: "2000",
      Credits: 20000000 / 2000 / 5,
      price: {
        comparedPrice: 159.99,
        currencyCode: "USD",
      },
    },
    {
      key: "option-8",
      name: "3000",
      Credits: 30000000 / 2000 / 5,
      price: {
        comparedPrice: 239.99,
        currencyCode: "USD",
      },
    },
  ];
  const fetcher = useFetcher();
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const handlePay = () => {
    reportClick("pricing_buy_credits");
    setBuyButtonLoading(true);
    console.log(selectedOptionKey);
    const selectedOption = creditOptions.find(
      (item) => item.key === selectedOptionKey,
    );

    const payInfo = {
      name: selectedOption?.name,
      price: {
        amount: selectedOption?.price.comparedPrice,
        currencyCode: selectedOption?.price.currencyCode,
      },
      action,
      productId,
      imageId,
    };
    console.log(payInfo);

    const formData = new FormData();
    formData.append("payInfo", JSON.stringify(payInfo));
    payFetcher.submit(formData, {
      method: "POST",
      action: "/app",
    });
  };
  useEffect(() => {
    if (payFetcher.data) {
      console.log(payFetcher.data);

      if (payFetcher.data?.success) {
        const order =
          payFetcher.data?.response?.appPurchaseOneTimeCreate
            ?.appPurchaseOneTime;
        const confirmationUrl =
          payFetcher.data?.response?.appPurchaseOneTimeCreate?.confirmationUrl;
        const orderInfo = {
          id: order?.id,
          amount: order?.price.amount,
          name: order?.name,
          createdAt: order?.createdAt,
          status: order?.status,
          confirmationUrl: confirmationUrl,
        };
        const formData = new FormData();
        formData.append("orderInfo", JSON.stringify(orderInfo));
        orderFetcher.submit(formData, {
          method: "post",
          action: "/app",
        });
        open(confirmationUrl, "_top");
      } else {
        setBuyButtonLoading(false);
      }
    }
  }, [payFetcher.data]);
  return (
    <Modal
      title={t("Buy Extra Image Translation Times")}
      open={openModal}
      width={900}
      centered
      onCancel={onClose}
      footer={null}
    >
      <Space direction="vertical" size="small" style={{ width: "100%" }}>
        <Row gutter={[16, 16]}>
          {creditOptions.map((option) => (
            <Col key={option.key} xs={12} sm={12} md={6} lg={6} xl={6}>
              <Card
                hoverable
                style={{
                  textAlign: "center",
                  borderColor:
                    JSON.stringify(selectedOptionKey) ===
                    JSON.stringify(option.key)
                      ? "#007F61"
                      : undefined,
                  borderWidth:
                    JSON.stringify(selectedOptionKey) ===
                    JSON.stringify(option.key)
                      ? "2px"
                      : "1px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "150px",
                }}
                onClick={() => setSelectedOption(option.key)}
              >
                <Text
                  style={{
                    fontSize: "16px",
                    fontWeight: 500,
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {option.Credits.toLocaleString()} {t("extra times")}
                </Text>
                <Title
                  level={3}
                  style={{ margin: 0, color: "#007F61", fontWeight: 700 }}
                >
                  ${option.price.comparedPrice.toFixed(2)}
                </Title>
              </Card>
            </Col>
          ))}
        </Row>
        <Flex align="center" justify="center">
          <Space direction="vertical" align="center">
            <Text type="secondary" style={{ margin: "16px 0 8px 0" }}>
              {t("Total pay")}: $
              {selectedOptionKey
                ? creditOptions
                    .find((item) => item.key === selectedOptionKey)
                    ?.price.comparedPrice.toFixed(2)
                : "0.00"}
            </Text>
            <Button
              type="primary"
              size="large"
              disabled={!selectedOptionKey}
              loading={buyButtonLoading}
              onClick={handlePay}
            >
              {t("Buy now")}
            </Button>
          </Space>
        </Flex>
      </Space>
    </Modal>
  );
};
