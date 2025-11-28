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
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import ScrollNotice from "~/components/ScrollNotice";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import {
  GetLatestActiveSubscribeId,
  InsertOrUpdateFreePlan,
} from "~/api/JavaServer";
import { authenticate } from "~/shopify.server";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  AddCreaditsModal,
  OptionType,
} from "../app._index/components/addCreditsModal";
import { CheckOutlined, QuestionCircleOutlined } from "@ant-design/icons";
import "./style.css";
import {
  mutationAppPurchaseOneTimeCreate,
  mutationAppSubscriptionCreate,
} from "~/api/admin";
import { useDispatch, useSelector } from "react-redux";
import { handleContactSupport } from "../app._index/route";
import { setPlan, setUpdateTime } from "~/store/modules/userConfig";
import useReport from "scripts/eventReport";
// import HasPayForFreePlanModal from "./components/hasPayForFreePlanModal";
import { QuotaCard } from "../app._index/components/quotaCard";
import { globalStore } from "~/globalStore";
import HasPayForFreePlanModal from "./components/hasPayForFreePlanModal";
const { Title, Text, Paragraph } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  return {
    shop: shop,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const payForPlan = JSON.parse(formData.get("payForPlan") as string);
  const cancelId = JSON.parse(formData.get("cancelId") as string);
  switch (true) {
    case !!payForPlan:
      try {
        const returnUrl = new URL(
          `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
        );
        const res = await mutationAppSubscriptionCreate({
          shop,
          accessToken: accessToken as string,
          name: payForPlan.title,
          yearly: payForPlan.yearly,
          price: {
            amount: payForPlan.yearly
              ? payForPlan.yearlyPrice * 12
              : payForPlan.monthlyPrice,
            currencyCode: "USD",
          },
          trialDays: payForPlan.trialDays,
          returnUrl,
          test:
            process.env.NODE_ENV === "development" ||
            process.env.NODE_ENV === "test",
        });

        return {
          success: true,
          errorCode: 0,
          errorMsg: "",
          response: {
            ...res,
            appSubscription: {
              ...res.appSubscription,
              price: {
                amount: payForPlan.yearly
                  ? payForPlan.yearlyPrice
                  : payForPlan.monthlyPrice,
                currencyCode: "USD",
              },
            },
          },
        };
      } catch (error) {
        console.error("Error payForPlan action:", error);
        return {
          success: false,
          errorCode: 10001,
          errorMsg: "SERVER_ERROR",
          response: undefined,
        };
      }
    case !!cancelId:
      try {
        const response = await admin.graphql(
          `#graphql
          mutation AppSubscriptionCancel($id: ID!, $prorate: Boolean) {
            appSubscriptionCancel(id: $id, prorate: $prorate) {
              userErrors {
                field
                message
              }
              appSubscription {
                id
                status
              }
            }
          }`,
          {
            variables: {
              id: cancelId,
            },
          },
        );

        const data = await response.json();
        console.log(`应用日志: ${shop} 取消计划: `, data);
        return data;
      } catch (error) {
        console.error("Error cancelId action:", error);
      }
  }
  return null;
};

const Index = () => {
  const { plan, updateTime, chars, totalChars, isNew } = useSelector(
    (state: any) => state.userConfig,
  );
  const { shop } = useLoaderData<typeof loader>();
  const { reportClick, report } = useReport();
  const creditOptions: OptionType[] = useMemo(
    () => [
      {
        key: "option-1",
        name: "500K",
        Credits: 500000,
        price: {
          currentPrice: plan?.isInFreePlanTime
            ? 3.99
            : plan?.type === "Premium"
              ? 1.99
              : plan?.type === "Pro"
                ? 2.99
                : plan?.type === "Basic"
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
          currentPrice: plan?.isInFreePlanTime
            ? 7.99
            : plan?.type === "Premium"
              ? 3.99
              : plan?.type === "Pro"
                ? 5.99
                : plan?.type === "Basic"
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
          currentPrice: plan?.isInFreePlanTime
            ? 15.99
            : plan?.type === "Premium"
              ? 7.99
              : plan?.type === "Pro"
                ? 11.99
                : plan?.type === "Basic"
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
          currentPrice: plan?.isInFreePlanTime
            ? 23.99
            : plan?.type === "Premium"
              ? 11.99
              : plan?.type === "Pro"
                ? 17.99
                : plan?.type === "Basic"
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
          currentPrice: plan?.isInFreePlanTime
            ? 39.99
            : plan?.type === "Premium"
              ? 19.99
              : plan?.type === "Pro"
                ? 29.99
                : plan?.type === "Basic"
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
          currentPrice: plan?.isInFreePlanTime
            ? 79.99
            : plan?.type === "Premium"
              ? 39.99
              : plan?.type === "Pro"
                ? 59.99
                : plan?.type === "Basic"
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
          currentPrice: plan?.isInFreePlanTime
            ? 159.99
            : plan?.type === "Premium"
              ? 79.99
              : plan?.type === "Pro"
                ? 119.99
                : plan?.type === "Basic"
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
          currentPrice: plan?.isInFreePlanTime
            ? 239.99
            : plan?.type === "Premium"
              ? 119.99
              : plan?.type === "Pro"
                ? 179.99
                : plan?.type === "Basic"
                  ? 215.99
                  : 239.99,
          comparedPrice: 239.99,
          currencyCode: "USD",
        },
      },
    ],
    [plan],
  );
  const [yearly, setYearly] = useState(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [selectedOptionKey, setSelectedOption] = useState<string>("option-1");
  const [isLoading, setIsLoading] = useState(true);
  const [cancelPlanWarnModal, setCancelPlanWarnModal] = useState(false);
  const [buyButtonLoading, setBuyButtonLoading] = useState<boolean>(false);
  const [payForPlanButtonLoading, setPayForPlanButtonLoading] =
    useState<string>("");
  const [selectedPayPlanOption, setSelectedPayPlanOption] = useState<any>();
  // const isQuotaExceeded = useMemo(
  //   () => chars >= totalChars && totalChars > 0,
  //   [chars, totalChars],
  // );
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const fetcher = useFetcher<any>();
  const planCancelFetcher = useFetcher<any>();
  const payFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const payForPlanFetcher = useFetcher<any>();

  const { useBreakpoint } = Grid;
  const screens = useBreakpoint(); // 监听屏幕断点
  const handleSetYearlyReport = () => {
    setYearly(!yearly);
    report(
      {
        status: yearly ? 0 : 1,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "pricing_plan_yearly_switcher",
    );
  };

  useEffect(() => {
    setIsLoading(false);
    fetcher.submit(
      {
        log: `${globalStore?.shop} 目前在付费页面`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  }, []);

  useEffect(() => {
    if (payFetcher.data) {
      if (payFetcher.data?.success) {
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
    if (payForPlanFetcher.data) {
      if (payForPlanFetcher.data?.success) {
        const order = payForPlanFetcher.data?.response?.appSubscription;
        const confirmationUrl =
          payForPlanFetcher.data?.response?.confirmationUrl;
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
        setPayForPlanButtonLoading("");
      }
    }
  }, [payForPlanFetcher.data]);

  useEffect(() => {
    if (planCancelFetcher.data) {
      dispatch(
        setPlan({
          plan: {
            id: 1,
            type: "Free",
            feeType: 0,
            isInFreePlanTime: false,
          },
        }),
      );
      dispatch(setUpdateTime({ updateTime: "" }));
      setCancelPlanWarnModal(false);
    }
  }, [planCancelFetcher.data]);

  const plans = useMemo(
    () => [
      {
        title: "Basic",
        yearlyTitle: "Basic - Yearly",
        monthlyPrice: 9.99,
        yearlyPrice: 7.99,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: 95.88,
        }),
        buttonText:
          plan.type === "Basic" && yearly === !!(plan.feeType === 1)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        buttonType: "default",
        disabled: plan.type === "Basic" && yearly === !!(plan.feeType === 1),
        features: [
          //   t("{{credits}} credits/month", { credits: "1,500,000" }),
          //   t("Glossary ({{count}} entries)", { count: 10 }),
          t("basic_features1"),
          t("basic_features2"),
          t("basic_features3"),
          t("basic_features4"),
          t("basic_features5"),
        ],
      },
      {
        title: "Pro",
        yearlyTitle: "Pro - Yearly",
        monthlyPrice: 29.99,
        yearlyPrice: 23.99,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: 287.88,
        }),
        buttonText:
          plan.type === "Pro" && yearly === !!(plan.feeType === 1)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        buttonType: "default",
        disabled: plan.type === "Pro" && yearly === !!(plan.feeType === 1),
        features: [
          //   t("all in Basic Plan"),
          //   t("{{credits}} credits/month", { credits: "3,000,000" }),
          //   t("Glossary ({{count}} entries)", { count: 50 }),
          t("pro_features1"),
          t("pro_features2"),
          t("pro_features3"),
          t("pro_features4"),
          t("pro_features5"),
        ],
      },
      {
        title: "Premium",
        yearlyTitle: "Premium - Yearly",
        monthlyPrice: 79.99,
        yearlyPrice: 63.99,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: 767.88,
        }),
        buttonText:
          plan.type === "Premium" && yearly === !!(plan.feeType === 1)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        disabled: plan.type === "Premium" && yearly === !!(plan.feeType === 1),
        isRecommended: true,
        features: [
          //   t("all in Pro Plan"),
          //   t("{{credits}} credits/month", { credits: "8,000,000" }),
          //   t("Glossary ({{count}} entries)", { count: 100 }),
          t("premium_features1"),
          t("premium_features2"),
          t("premium_features3"),
          t("premium_features4"),
          t("premium_features5"),
        ],
      },
    ],
    [plan, yearly],
  );

  const tableData = useMemo(
    () => [
      {
        key: 0,
        features: t("Monthly Payment"),
        free: "0",
        basic: "9.99",
        pro: "29.99",
        premium: "79.99",
        type: "text",
      },
      {
        key: 1,
        features: t("Translation quota"),
        free: "0",
        basic: t("100 images/month"),
        pro: t("300 images/month"),
        premium: t("800 images/month"),
        type: "text",
      },
      {
        key: 2,
        features: t("Translation Model"),
        free: t("Machine translation"),
        basic: t("AI large-scale model translation"),
        pro: t("AI large-scale model translation"),
        premium: t("AI large-scale model translation"),
        type: "text",
      },
      {
        key: 3,
        features: t("Translation quality"),
        free: t("medium"),
        basic: t("Original image resolution"),
        pro: t("Original image resolution"),
        premium: t("Original image resolution"),
        type: "text",
      },
      {
        key: 4,
        features: t("Supported languages"),
        free: t("Original language: English"),
        basic: t("50+ languages"),
        pro: t("50+ languages"),
        premium: t("50+ languages"),
        type: "text",
      },
      {
        key: 5,
        features: t("Batch translation"),
        free: "",
        basic: t("support"),
        pro: t("support"),
        premium: t("support"),
        type: "text",
      },
    ],
    [],
  );

  const collapseData: CollapseProps["items"] = useMemo(
    () => [
      {
        key: 0,
        label: t("How does the 5-day free trial work?"),
        children: t(
          "Choosing Pro or Premium gives you 5 days of full access to all features, along with 40 trial times. Cancel anytime before the trial ends to avoid billing.",
        ),
      },
      {
        key: 1,
        label: t("Can I get a discount on my plan?"),
        children: t(
          "Yes. You'll save 20% when you choose yearly billing. Discount applies automatically at checkout.",
        ),
      },
      {
        key: 2,
        label: t("Can I get a refund?"),
        children: t(
          "No. We do not offer refunds. You can cancel anytime to stop future billing, and your plan will remain active until the end of the billing period.",
        ),
      },
      {
        key: 3,
        label: t("What happens when I run out of credits?"),
        children: t(
          "You'll need to purchase extra credits to keep translating images. You won't lose access to features, only to credit-based actions.",
        ),
      },
      {
        key: 4,
        label: t("Do unused credits carry over?"),
        children: t(
          "Plan credits reset at the end of each billing cycle. But if you cancel or downgrade, any unused credits stay active for 3 more months.",
        ),
      },
      {
        key: 5,
        label: t("Do extra credits affect my plan or features?"),
        children: t(
          "No. Plan credits come with your subscription and reset monthly. Extra credits are only used when plan credits run out, and they never expire. They don't unlock new features or raise limits.",
        ),
      },
      {
        key: 6,
        label: t("What happens if I upgrade my plan?"),
        children: t(
          "You get your new plan's credits and features right away. Any remaining credits from your previous plan won't carry over.",
        ),
      },
      {
        key: 7,
        label: t("Will I lose credits if I cancel or downgrade?"),
        children: t(
          "No. Your unused credits stay available for 3 months. But you'll only have access to the features included in your new (lower) plan.",
        ),
      },
    ],
    [],
  );

  const columns = [
    {
      title: t("Features"),
      dataIndex: "features",
      key: "features",
    },
    {
      title: "Free",
      dataIndex: "free",
      key: "free",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.free}</Text>;
          case record.type === "boolean":
            return <Text>{record.free ? "√" : "×"}</Text>;
          default:
            return <Text>{record.free}</Text>;
        }
      },
    },
    {
      title: "Basic",
      dataIndex: "basic",
      key: "basic",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.basic}</Text>;
          case record.type === "boolean":
            return <Text>{record.basic ? "√" : "×"}</Text>;
          default:
            return <Text>{record.basic}</Text>;
        }
      },
    },
    {
      title: "Pro",
      dataIndex: "pro",
      key: "pro",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.pro}</Text>;
          case record.type === "boolean":
            return <Text>{record.pro ? "√" : "×"}</Text>;
          default:
            return <Text>{record.pro}</Text>;
        }
      },
    },
    {
      title: "Premium",
      dataIndex: "premium",
      key: "premium",
      render: (_: any, record: any) => {
        switch (true) {
          case record.type === "credits":
            return <Text>{record.premium}</Text>;
          case record.type === "boolean":
            return <Text>{record.premium ? "√" : "×"}</Text>;
          default:
            return <Text>{record.premium}</Text>;
        }
      },
    },
  ];
  const handleAddCredits = () => {
    setOpenModal(true);
    reportClick("pricing_balance_add");
    fetcher.submit(
      {
        log: `${shop} 点击了添加积分按钮`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  };

  const handleCancelPlan = async () => {
    const data = await GetLatestActiveSubscribeId({
      shop: globalStore?.shop as string,
      server: globalStore?.server as string,
    });
    if (data.success) {
      // InsertOrUpdateFreePlan({
      //   shop: globalStore?.shop as string,
      //   server: globalStore?.server as string,
      // });
      planCancelFetcher.submit(
        {
          cancelId: JSON.stringify(data.response),
        },
        { method: "POST" },
      );
    }
  };
  useEffect(() => {
    if (planCancelFetcher.data) {
      const userErrors =
        planCancelFetcher.data.data?.appSubscriptionCancel?.userErrors ?? [];
      const subscription =
        planCancelFetcher.data.data?.appSubscriptionCancel?.appSubscription;
      if (userErrors.length === 0 && subscription) {
        // 取消成功
        InsertOrUpdateFreePlan({
          shop: globalStore?.shop as string,
          server: globalStore?.server as string,
        });
      } else {
        // 取消失败
        console.error("取消失败:", userErrors);
      }
    }
  }, [planCancelFetcher.data]);

  const handlePayForPlan = ({
    plan,
    trialDays,
    id,
  }: {
    plan: any;
    trialDays: number;
    id: string;
  }) => {
    setPayForPlanButtonLoading(id);
    setSelectedPayPlanOption({ ...plan, yearly, trialDays });
    payForPlanFetcher.submit(
      { payForPlan: JSON.stringify({ ...plan, yearly, trialDays }) },
      { method: "POST" },
    );
    reportClick(trialDays !== 5 ? "pricing_plan_start" : "pricing_plan_trial");
  };

  return (
    <Page>
      <TitleBar title={t("Pricing")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
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
                  <Title
                    level={2}
                    style={{ marginBottom: 0, fontSize: "20px" }}
                  >
                    {t("Translation Quota")}
                  </Title>
                  <Popover
                    content={t(
                      "Permanent quotas · Never expire · Top up anytime.",
                    )}
                  >
                    <QuestionCircleOutlined />
                  </Popover>
                  <Button type="default" onClick={handleAddCredits}>
                    {t("Buy more")}
                  </Button>
                </Flex>
                {plan && (
                  <div>
                    <Text>{t("Current plan: ")}</Text>
                    <Text style={{ color: "#007F61", fontWeight: "bold" }}>
                      {plan.type === "Basic"
                        ? "Basic"
                        : plan.type === "Pro"
                          ? "Pro"
                          : plan.type === "Premium"
                            ? "Premium"
                            : "Free"}
                      {t("Plan")}
                    </Text>
                  </div>
                )}
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
                      "{{currentCredits}} of {{maxCredits}} translations used",
                      {
                        currentCredits: Math.floor((Number(chars) || 0) / 2000),
                        maxCredits: Math.floor(
                          (Number(totalChars) || 0) / 2000,
                        ),
                      },
                    ),
                  }}
                />
              )}
              <Text
                style={{
                  display: updateTime && totalChars ? "block" : "none",
                }}
              >
                {t("This bill was issued on {{date}}", { date: updateTime })}
              </Text>
            </div>
            <Progress
              percent={
                totalChars == 0
                  ? 100
                  : Math.round(
                      (Math.floor((Number(chars) || 0) / 2000) /
                        Math.floor((Number(totalChars) || 0) / 2000)) *
                        100,
                    )
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
        <Flex vertical align="center" style={{ width: "100%" }}>
          <Title level={3} style={{ fontWeight: 700 }}>
            {t("Choose the right plan for you")}
          </Title>
          <Row style={{ width: "100%" }}>
            <Col
              span={screens.xs ? 16 : 18}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: screens.xs ? "left" : "center",
                left: screens.xs ? "0" : "50%",
                transform: screens.xs ? "translateX(0)" : "translateX(-50%)",
              }}
            >
              <Flex align="center">
                <Space align="center" size="small">
                  <Switch checked={yearly} onChange={handleSetYearlyReport} />
                  <Text>{t("Yearly")}</Text>
                </Space>
                <div className="yearly_save">
                  <Text strong>{t("Save 20%")}</Text>
                </div>
              </Flex>
            </Col>
          </Row>
        </Flex>
        <Row gutter={[16, 16]}>
          <Col
            key={t("Free")}
            xs={24}
            sm={24}
            md={12}
            lg={6}
            style={{
              display: "flex",
              width: "100%",
            }}
          >
            <Card
              hoverable
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                borderColor: plan.type === "Free" ? "#007F61" : undefined,
                minWidth: "220px",
              }}
              styles={{
                body: {
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px",
                },
              }}
              loading={!plan.id}
            >
              <Title level={5}>Free</Title>
              <div style={{ margin: yearly ? "12px 0 46px 0" : "12px  0" }}>
                <Text style={{ fontSize: "28px", fontWeight: "bold" }}>$0</Text>
                <Text style={{ fontSize: "14px" }}>{t("/month")}</Text>
              </div>

              <Button
                type="default"
                block
                disabled={plan.type === "Free" || selectedPayPlanOption}
                style={{ marginBottom: isNew ? "70px" : "20px" }}
                onClick={() => {
                  setCancelPlanWarnModal(true);
                  reportClick("pricing_plan_trial");
                }}
              >
                {plan.type === "Free"
                  ? t("pricing.current_plan")
                  : t("pricing.get_start")}
              </Button>
              <div style={{ flex: 1 }}>
                <div
                  key={0}
                  style={{
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <CheckOutlined
                    style={{
                      color: "#52c41a",
                      fontSize: "12px",
                    }}
                  />
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features1")}
                  </Text>
                </div>
                <div
                  key={1}
                  style={{
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <CheckOutlined
                    style={{
                      color: "#52c41a",
                      fontSize: "12px",
                    }}
                  />
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features2")}
                  </Text>
                </div>
                <div
                  key={2}
                  style={{
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                  }}
                >
                  <CheckOutlined
                    style={{
                      color: "#52c41a",
                      fontSize: "12px",
                    }}
                  />
                  <Text style={{ fontSize: "13px" }}>
                    {t("starter_features3")}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
          {plans.map((item, index) => (
            <Col
              key={item.title}
              xs={24}
              sm={24}
              md={12}
              lg={6}
              style={{
                display: "flex",
                width: "100%",
              }}
            >
              <Badge.Ribbon
                text={t("pricing.recommended")}
                color="#1890ff"
                style={{
                  display:
                    item.isRecommended && plan.type === "Free" && plan.id
                      ? "block"
                      : "none",
                  right: -8,
                }}
              >
                <Card
                  hoverable
                  style={{
                    flex: 1,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    position: "relative",
                    borderColor: item.disabled
                      ? "#007F61"
                      : item.isRecommended && plan.type === "Free" && plan.id
                        ? "#1890ff"
                        : undefined,
                    minWidth: "220px",
                  }}
                  styles={{
                    body: {
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      padding: "16px",
                    },
                  }}
                  loading={!plan.id}
                >
                  <Title level={5}>
                    {yearly ? item.yearlyTitle : item.title}
                  </Title>
                  <div style={{ margin: "12px 0" }}>
                    <Text style={{ fontSize: "28px", fontWeight: "bold" }}>
                      ${yearly ? item.yearlyPrice : item.monthlyPrice}
                    </Text>
                    <Text style={{ fontSize: "14px" }}>{t("/month")}</Text>
                  </div>
                  {yearly && (
                    <div
                      dangerouslySetInnerHTML={{ __html: item.subtitle }}
                      style={{ marginBottom: "12px" }}
                    />
                  )}
                  <Button
                    id={`${item.title}-${yearly ? "yearly" : "month"}-${index}-0`}
                    type="default"
                    block
                    disabled={item.disabled || selectedPayPlanOption}
                    style={{ marginBottom: "20px" }}
                    onClick={() =>
                      handlePayForPlan({
                        plan: item,
                        trialDays: 0,
                        id: `${item.title}-${yearly ? "yearly" : "month"}-${index}-0`,
                      })
                    }
                    loading={
                      payForPlanButtonLoading ==
                      `${item.title}-${yearly ? "yearly" : "month"}-${index}-0`
                    }
                  >
                    {item.buttonText}
                  </Button>
                  {isNew && (
                    <Button
                      id={`${item.title}-${yearly ? "yearly" : "month"}-${index}-5`}
                      type="primary"
                      block
                      disabled={item.disabled || selectedPayPlanOption}
                      style={{ marginBottom: "20px" }}
                      onClick={() =>
                        handlePayForPlan({
                          plan: item,
                          trialDays: 5,
                          id: `${item.title}-${yearly ? "yearly" : "month"}-${index}-5`,
                        })
                      }
                      loading={
                        payForPlanButtonLoading ==
                        `${item.title}-${yearly ? "yearly" : "month"}-${index}-5`
                      }
                    >
                      {t("Free trial")}
                    </Button>
                  )}
                  <div style={{ flex: 1 }}>
                    {item.features.map((feature, idx) => (
                      <div
                        key={idx}
                        style={{
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "6px",
                        }}
                      >
                        <CheckOutlined
                          style={{
                            color: "#52c41a",
                            fontSize: "12px",
                          }}
                        />
                        <Text style={{ fontSize: "13px" }}>{feature}</Text>
                      </div>
                    ))}
                  </div>
                </Card>
              </Badge.Ribbon>
            </Col>
          ))}
        </Row>
        <Space
          direction="vertical"
          size="small"
          style={{
            display: "flex",
          }}
        >
          <Title
            level={3}
            style={{
              fontWeight: 700,
              textAlign: "center",
            }}
          >
            {t("Compare plans")}
          </Title>
          <Table
            dataSource={tableData}
            columns={columns}
            pagination={false}
            // style={{
            //   width: "100%",
            // }}
          />
        </Space>
        <Row>
          <Col span={6}>
            <Space direction="vertical" size="small">
              <Title level={3} style={{ fontWeight: 700 }}>
                {t("FAQs")}
              </Title>
              <Text type="secondary">
                {t("Everything you need to know about pricing and billing.")}
              </Text>
            </Space>
          </Col>
          <Col span={18}>
            <Collapse
              items={collapseData}
              onChange={() => {
                reportClick("pricing_faq_click");
              }}
            />
          </Col>
        </Row>
      </Space>
      <HasPayForFreePlanModal />
      <Modal
        title={t("Cancel paid plan?")}
        open={cancelPlanWarnModal}
        centered
        onCancel={() => setCancelPlanWarnModal(false)}
        footer={
          <Flex align="end" justify="end" gap={10}>
            <Button
              loading={planCancelFetcher.state == "submitting"}
              onClick={handleCancelPlan}
            >
              {t("Switch to free plan")}
            </Button>
            <Button
              type="primary"
              onClick={() => setCancelPlanWarnModal(false)}
            >
              {t("Keep paid plan")}
            </Button>
          </Flex>
        }
      >
        <Text>
          {t(
            "Moving to the free plan will turn off key features. Are you sure you want to switch?",
          )}
        </Text>
      </Modal>
    </Page>
  );
};

export default Index;
