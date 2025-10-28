import {
  Button,
  Card,
  Col,
  Divider,
  Modal,
  Row,
  Space,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import PaymentOptionSelect from "./paymentOptionSelect";
import { useFetcher } from "@remix-run/react";
import { useTranslation } from "react-i18next";
import { handleContactSupport } from "~/routes/app._index/route";
import { useSelector } from "react-redux";
import useReport from "../../scripts/eventReport";
import "./styles.css";

const { Title, Text } = Typography;

interface PaymentModalProps {
  visible: boolean;
  setVisible: (visible: boolean) => void;
}

export interface OptionType {
  key: string;
  name: string;
  Credits: number;
  price: {
    currentPrice: number;
    comparedPrice: number;
    currencyCode: string;
  };
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible,
  setVisible,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>("option-1");
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const [credits, setCredits] = useState<number | undefined>(undefined);
  // const [multiple1, setMultiple1] = useState<number>(1);
  // const [multiple2, setMultiple2] = useState<number>(model?.speed || 2);
  const { t } = useTranslation();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const { reportClick } = useReport();
  const { plan } = useSelector((state: any) => state.userConfig);

  const options: OptionType[] = useMemo(
    () => [
      {
        key: "option-1",
        name: "500K",
        Credits: 500000,
        price: {
          currentPrice:
            plan === 6 ? 1.99 : plan === 5 ? 2.99 : plan === 4 ? 3.59 : 3.99,
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
            plan === 6 ? 3.99 : plan === 5 ? 5.99 : plan === 4 ? 7.19 : 7.99,
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
            plan === 6 ? 7.99 : plan === 5 ? 11.99 : plan === 4 ? 14.39 : 15.99,
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
            plan === 6
              ? 11.99
              : plan === 5
                ? 17.99
                : plan === 4
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
            plan === 6
              ? 19.99
              : plan === 5
                ? 29.99
                : plan === 4
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
            plan === 6
              ? 39.99
              : plan === 5
                ? 59.99
                : plan === 4
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
            plan === 6
              ? 79.99
              : plan === 5
                ? 119.99
                : plan === 4
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
            plan === 6
              ? 119.99
              : plan === 5
                ? 179.99
                : plan === 4
                  ? 215.99
                  : 239.99,
          comparedPrice: 239.99,
          currencyCode: "USD",
        },
      },
    ],
    [plan],
  );

  const selectedOption = useMemo(() => {
    return options.find((item) => item.key == selectedKey) || options[0];
  }, [selectedKey]);

  // useEffect(() => {
  //   if (credits && !selectedKey) {
  //     const matchedOption = options.find(
  //       (option) => option?.Credits >= credits * multiple1 * multiple2,
  //     ); // 找到第一个符合条件的选项
  //     if (matchedOption) {
  //       setSelectedKey(matchedOption?.key);
  //     }
  //   }
  // }, [credits]);

  useEffect(() => {
    if (payFetcher.data) {
      if (
        payFetcher.data.data.data.appPurchaseOneTimeCreate.appPurchaseOneTime &&
        payFetcher.data.data.data.appPurchaseOneTimeCreate.confirmationUrl
      ) {
        const order =
          payFetcher.data.data.data.appPurchaseOneTimeCreate.appPurchaseOneTime;
        const confirmationUrl =
          payFetcher.data.data.data.appPurchaseOneTimeCreate.confirmationUrl;
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
      }
      if (
        payFetcher.data.data.data.appPurchaseOneTimeCreate.userErrors.length
      ) {
        setBuyButtonLoading(false);
      }
    }
  }, [payFetcher.data]);

  const onClick = () => {
    setBuyButtonLoading(true);
    const payInfo = {
      name: selectedOption?.name,
      price: {
        amount: selectedOption?.price.currentPrice,
        currencyCode: selectedOption?.price.currencyCode,
      },
    };
    const formData = new FormData();
    formData.append("payInfo", JSON.stringify(payInfo));
    payFetcher.submit(formData, {
      method: "post",
      action: "/app",
    });
    reportClick("dashboard_translation_task_buy");
  };

  const onCancel = () => {
    setVisible(false);
    // if (recommendOption) setSelectedOption(recommendOption);
  };

  return (
    <Modal
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <div
          key="footer-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
          }}
        >
          <div key="support-section">
            <Text strong key="cost-question">
              {t("Cost questions: ")}
            </Text>
            <Button
              key="contact-support"
              type="link"
              onClick={handleContactSupport}
              style={{ marginLeft: "-15px" }}
            >
              {t("Contact support")}
            </Button>
          </div>
          <Button
            key="buy-now"
            type="primary"
            onClick={onClick}
            disabled={buyButtonLoading || !selectedKey}
            loading={buyButtonLoading}
            style={{
              height: "auto",
              paddingTop: "4px",
              paddingBottom: "4px",
            }}
          >
            <div
              key="button-content"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <Text key="price" strong style={{ color: "inherit" }}>
                ${selectedOption?.price.currentPrice ?? 0}
              </Text>
              <Text key="buy-text" style={{ color: "inherit" }}>
                {t("Buy now")}
              </Text>
            </div>
          </Button>
        </div>,
      ]}
    >
      <Title level={4} style={{ textAlign: "center", marginTop: "20px" }}>
        {t("Not enough translation credits. Purchase more to continue")}
      </Title>
      {/* <Card>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Title level={5}>{t("Translation tasks")}</Title>
          <Title level={5} style={{ marginTop: "0px" }}>{t("Credits to be consumed")}</Title>
        </div>
        <Divider style={{ margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Estimated number of words to translate: ")}</Text>
            {credits === undefined ? <Text strong>{t("Calculating...")}</Text> : credits >= 0 ? <Text strong>{credits.toLocaleString()} {t("words")}</Text> : <Text strong>{t("Calculation failed")}</Text>}
          </div>
          {credits === undefined ? <Text strong>{t("Calculating...")}</Text> : credits >= 0 ? <Text strong>{credits.toLocaleString()}</Text> : <Text strong>{t("Calculation failed")}</Text>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Translate files: ")}</Text>
            <Text strong>{source.toUpperCase()} {t("translate to")} {target.toUpperCase()}</Text>
          </div>
          <Text strong>*{multiple1}</Text>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Translate modal: ")}</Text>
            <Text strong>{model.label}</Text>
          </div>
          <Text strong>*{multiple2}</Text>
        </div>
        <Divider style={{ margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <Text strong>{t("Total: ")}</Text>
          </div>
          <Text strong> {credits === undefined ? <Text strong>{t("Calculating...")}</Text> : credits >= 0 ? <Text strong>{Number((credits * multiple1 * multiple2).toFixed(0)).toLocaleString()}</Text> : <Text strong>{t("Calculation failed")}</Text>}</Text>
        </div>
      </Card> */}

      <Divider />
      <Title level={5}>{t("Buy credits")}</Title>
      <div className="options_wrapper">
        <Space direction="vertical">
          <div
            style={{
              display: "flex",
              flexWrap: "wrap", // 允许自动换行
              gap: "16px",
              width: "100%",
            }}
          >
            {options.map((option: any) => (
              <div
                key={option.name}
                style={{
                  flex: "0 1 auto", // 允许缩小但不放大
                  // minWidth: '200px',  // 设置最小宽度
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <PaymentOptionSelect
                  option={option}
                  selectedOption={selectedOption}
                  onChange={(e) => setSelectedKey(e.key)}
                />
              </div>
            ))}
          </div>
        </Space>
      </div>
      <Divider />
      <div className="total_payment">
        <Text style={{ marginRight: "5px" }}>{t("Total Payment:")}</Text>
        <Text strong>
          $
          {selectedOption?.price.currentPrice
            ? selectedOption?.price.currentPrice
            : 0}
        </Text>
      </div>
    </Modal>
  );
};

export default PaymentModal;
