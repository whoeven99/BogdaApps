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
import { OptionType } from "~/components/paymentModal";
import { useFetcher } from "@remix-run/react/dist/components";
const { Title, Text, Paragraph } = Typography;

export const QuotaCard = () => {
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const { reportClick, report } = useReport();
  const { t } = useTranslation();
  const { plan, updateTime, chars, totalChars, isNew } = useSelector(
    (state: any) => state.userConfig,
  );
  console.log(chars,totalChars);
  
  const [isLoading, setIsLoading] = useState(true);
  const [addCreditsModalOpen, setAddCreditsModalOpen] = useState(false);
  const [selectedOptionKey, setSelectedOption] = useState<string>("option-1");

  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const creditOptions: OptionType[] = useMemo(
    () => [
      {
        key: "option-1",
        name: "500K",
        Credits: 500000,
        price: {
          currentPrice:
            plan.id === 6
              ? 1.99
              : plan.id === 5
                ? 2.99
                : plan.id === 4
                  ? 3.59
                  : 3.99,
          comparedPrice: 3.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-2",
        name: "1M",
        Credits: 1000000,
        price: {
          currentPrice:
            plan.id === 6
              ? 3.99
              : plan.id === 5
                ? 5.99
                : plan.id === 4
                  ? 7.19
                  : 7.99,
          comparedPrice: 7.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-3",
        name: "2M",
        Credits: 2000000,
        price: {
          currentPrice:
            plan.id === 6
              ? 7.99
              : plan.id === 5
                ? 11.99
                : plan.id === 4
                  ? 14.39
                  : 15.99,
          comparedPrice: 15.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-4",
        name: "3M",
        Credits: 3000000,
        price: {
          currentPrice:
            plan.id === 6
              ? 11.99
              : plan.id === 5
                ? 17.99
                : plan.id === 4
                  ? 21.79
                  : 23.99,
          comparedPrice: 23.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-5",
        name: "5M",
        Credits: 5000000,
        price: {
          currentPrice:
            plan.id === 6
              ? 19.99
              : plan.id === 5
                ? 29.99
                : plan.id === 4
                  ? 35.99
                  : 39.99,
          comparedPrice: 39.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-6",
        name: "10M",
        Credits: 10000000,
        price: {
          currentPrice:
            plan.id === 6
              ? 39.99
              : plan.id === 5
                ? 59.99
                : plan.id === 4
                  ? 71.99
                  : 79.99,
          comparedPrice: 79.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-7",
        name: "20M",
        Credits: 20000000,
        price: {
          currentPrice:
            plan.id === 6
              ? 79.99
              : plan.id === 5
                ? 119.99
                : plan.id === 4
                  ? 143.99
                  : 159.99,
          comparedPrice: 159.99,
          currencyCode: "USD",
        },
      },
      {
        key: "option-8",
        name: "30M",
        Credits: 30000000,
        price: {
          currentPrice:
            plan.id === 6
              ? 119.99
              : plan.id === 5
                ? 179.99
                : plan.id === 4
                  ? 215.99
                  : 239.99,
          comparedPrice: 239.99,
          currencyCode: "USD",
        },
      },
    ],
    [plan],
  );

  const handlePay = () => {
    // setBuyButtonLoading(true);
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
        console.log(payFetcher.data);

        const order =
          payFetcher.data?.response?.appPurchaseOneTimeCreate
            ?.appPurchaseOneTime;
        const confirmationUrl =
          payFetcher.data?.response?.appPurchaseOneTimeCreate?.confirmationUrl;
        const orderInfo = {
          id: order.id,
          amount: order.price.amount,
          name: order.name,
          createdAt: order.createdAt,
          status: order.status,
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
  useEffect(() => {
    if (orderFetcher.data) {
      console.log(orderFetcher.data);
    }
  }, [orderFetcher.data]);
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
              <Title level={4} style={{ marginBottom: 0 }}>
                {t("Your translation quota")}
              </Title>
              <Popover
                content={t("Permanent quotas · Never expire · Top up anytime.")}
              >
                <QuestionCircleOutlined />
              </Popover>
            </Flex>
            <Button
              type="default"
              onClick={() => {
                setAddCreditsModalOpen(true);
                reportClick("pricing_balance_add");
              }}
            >
              {t("Add credits")}
            </Button>
          </Flex>
          {/* {plan && (
            <div>
              <Text>{t("Current plan: ")}</Text>
              <Text style={{ color: "#007F61", fontWeight: "bold" }}>
                {plan.id === 3
                  ? "Starter"
                  : plan.id === 4
                    ? "Basic"
                    : plan.id === 5
                      ? "Pro"
                      : plan.id === 6
                        ? "Premium"
                        : plan.id === 7
                          ? "Free Trial"
                          : "Free"}{" "}
                {t("plan")}
              </Text>
            </div>
          )} */}
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
          {/* <Text
            style={{
              display: updateTime && totalChars ? "block" : "none",
            }}
          >
            {t("This bill was issued on {{date}}", { date: updateTime })}
          </Text> */}
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
      <Modal
        title={t("Buy Credits")}
        open={addCreditsModalOpen}
        width={900}
        centered
        onCancel={() => setAddCreditsModalOpen(false)}
        footer={null}
      >
        <Space direction="vertical" size="small" style={{ width: "100%" }}>
          {/* <div
            style={{
              textAlign: "left",
              display: "flex",
              alignItems: "flex-end",
              marginBottom: 10,
            }}
          >
            <Title level={4} style={{ marginBottom: 0, marginRight: 10 }}>
              {t("Buy Credits")}
            </Title>
            <Text style={{ fontWeight: "bold" }}>
              {plan.id === 6
                ? t("discountText.premium")
                : plan.id === 5
                  ? t("discountText.pro")
                  : plan.id === 4
                    ? t("discountText.basic")
                    : t("discountText.free")}
            </Text>
          </div> */}
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
                    {option.Credits.toLocaleString()} {t("Credits")}
                  </Text>
                  {/* {plan.id === 6 || plan.id === 5 || plan.id === 4 ? (
                    <>
                      <Title
                        level={3}
                        style={{
                          margin: 0,
                          color: "#007F61",
                          fontWeight: 700,
                        }}
                      >
                        ${option.price.currentPrice.toFixed(2)}
                      </Title>
                      <Text
                        delete
                        type="secondary"
                        style={{ fontSize: "14px" }}
                      >
                        ${option.price.comparedPrice.toFixed(2)}
                      </Text>
                    </>
                  ) : (
                    
                  )} */}
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
                      ?.price.currentPrice.toFixed(2)
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
    </Card>
  );
};
