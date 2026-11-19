import { Page } from "@shopify/polaris";
import {
  Space,
  Row,
  Col,
  Typography,
  Flex,
  Switch,
  Table,
  Collapse,
  CollapseProps,
} from "antd";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useState } from "react";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { resolveShouldCreateTestCharge } from "~/server/billing/chargeGuardApply.server";
import { listEnabledCatalog } from "~/server/billing/plans/planCatalog.server";
import { resolveCancelSubscriptionGid } from "~/server/billing/resolveSubscriptionGid.server";
import { BILLING_INTERVAL, PLAN_KIND } from "~/server/billing/types";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { CheckOutlined } from "@ant-design/icons";
import "./style.css";
import { mutationAppSubscriptionCreate } from "~/api/admin.server";
import { useDispatch, useSelector } from "react-redux";
import { setPlan, setUpdateTime } from "~/store/modules/userConfig";
import useReport from "scripts/eventReport";
import { globalStore } from "~/globalStore";
import HasPayForFreePlanModal from "./components/hasPayForFreePlanModal";
import AccountTranslationsCard from "./components/AccountTranslationsCard";
import AppPageHeader from "~/ui/components/AppPageHeader";
import AppSubpageTitleBar, {
  useAppHomeBackAction,
} from "~/ui/components/AppSubpageTitleBar";
import AppStatusBadge from "~/ui/components/AppStatusBadge";
import AppButton from "~/ui/components/AppButton";
import { AppSModal } from "~/ui/components/AppSModal";
import { openCreditsPurchaseModal } from "~/utils/creditsPurchaseModal";
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const catalog = await listEnabledCatalog();
  return {
    shop,
    catalog: catalog.map((row) => ({
      planKey: row.planKey,
      kind: row.kind,
      billingInterval: row.billingInterval,
      shopifyPlanName: row.shopifyPlanName,
      displayName: row.displayName,
      credits: row.credits,
      priceAmount: Number(row.priceAmount),
      trialDays: row.trialDays ?? 0,
    })),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const sessionEmail = (adminAuthResult.session as { email?: string | null }).email ?? null;
  const { admin } = adminAuthResult;

  const formData = await request.formData();
  const payForPlan = JSON.parse(formData.get("payForPlan") as string);
  const cancelPlan = JSON.parse(formData.get("cancelPlan") as string);
  const cancelId = JSON.parse(formData.get("cancelId") as string);
  switch (true) {
    case !!payForPlan:
      try {
        const returnUrl = new URL(
          `https://admin.shopify.com/store/${shop.split(".")[0]}/apps/${process.env.HANDLE}/app/pricing`,
        );
        const res = await mutationAppSubscriptionCreate({
          shop,
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
          test: await resolveShouldCreateTestCharge(shop, sessionEmail),
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
    case !!cancelPlan: {
      try {
        const gid = await resolveCancelSubscriptionGid(shop, admin);
        if (!gid) {
          return {
            success: false,
            errorCode: 10002,
            errorMsg: "NO_ACTIVE_SUBSCRIPTION",
            response: null,
          };
        }
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
              id: gid,
            },
          },
        );
        const data = await response.json();
        console.log(`应用日志: ${shop} 取消计划: `, data);
        return data;
      } catch (error) {
        console.error("Error cancelPlan action:", error);
      }
      break;
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
  const { plan, updateTime, remaining, isNew } = useSelector(
    (state: any) => state.userConfig,
  );
  const homeBackAction = useAppHomeBackAction("/app");
  const { shop, catalog } = useLoaderData<typeof loader>();
  const { reportClick, report } = useReport();
  const [yearly, setYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelPlanWarnModal, setCancelPlanWarnModal] = useState(false);
  const [payForPlanButtonLoading, setPayForPlanButtonLoading] =
    useState<string>("");
  const [selectedPayPlanOption, setSelectedPayPlanOption] = useState<any>();
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const fetcher = useFetcher<any>();
  const planCancelFetcher = useFetcher<any>();
  const orderFetcher = useFetcher<any>();
  const payForPlanFetcher = useFetcher<any>();

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

  const catalogPrices = useMemo(() => {
    const pick = (name: string) => {
      const monthly = catalog.find(
        (row) =>
          row.kind === PLAN_KIND.SUBSCRIPTION &&
          row.shopifyPlanName === name &&
          row.billingInterval === BILLING_INTERVAL.MONTHLY,
      );
      const annual = catalog.find(
        (row) =>
          row.kind === PLAN_KIND.SUBSCRIPTION &&
          row.shopifyPlanName === name &&
          row.billingInterval === BILLING_INTERVAL.ANNUAL,
      );
      return {
        monthlyPrice: Number(monthly?.priceAmount || 0),
        yearlyPrice: Number(annual?.priceAmount || 0),
        trialDays: Number(monthly?.trialDays || annual?.trialDays || 0),
      };
    };
    return {
      Basic: pick("Basic"),
      Pro: pick("Pro"),
      Premium: pick("Premium"),
    };
  }, [catalog]);

  const plans = useMemo(
    () => [
      {
        title: "Basic",
        yearlyTitle: "Basic - Yearly",
        monthlyPrice: catalogPrices.Basic.monthlyPrice,
        yearlyPrice: catalogPrices.Basic.yearlyPrice,
        trialDays: catalogPrices.Basic.trialDays,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: (catalogPrices.Basic.yearlyPrice * 12).toFixed(2),
        }),
        buttonText:
          plan.type === "Basic" && yearly === !!(plan.feeType === 1)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        buttonType: "default",
        disabled: plan.type === "Basic" && yearly === !!(plan.feeType === 1),
        features: [
          t("basic_features1"),
          t("basic_features2"),
          t("basic_features4"),
        ],
      },
      {
        title: "Pro",
        yearlyTitle: "Pro - Yearly",
        monthlyPrice: catalogPrices.Pro.monthlyPrice,
        yearlyPrice: catalogPrices.Pro.yearlyPrice,
        trialDays: catalogPrices.Pro.trialDays,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: (catalogPrices.Pro.yearlyPrice * 12).toFixed(2),
        }),
        buttonText:
          plan.type === "Pro" && yearly === !!(plan.feeType === 1)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        buttonType: "default",
        disabled: plan.type === "Pro" && yearly === !!(plan.feeType === 1),
        features: [
          t("pro_features1"),
          t("pro_features2"),
          t("pro_features5"),
        ],
      },
      {
        title: "Premium",
        yearlyTitle: "Premium - Yearly",
        monthlyPrice: catalogPrices.Premium.monthlyPrice,
        yearlyPrice: catalogPrices.Premium.yearlyPrice,
        trialDays: catalogPrices.Premium.trialDays,
        subtitle: t("<strong>${{amount}}</strong> billed once a year", {
          amount: (catalogPrices.Premium.yearlyPrice * 12).toFixed(2),
        }),
        buttonText:
          plan.type === "Premium" && yearly === !!(plan.feeType === 1)
            ? t("pricing.current_plan")
            : t("pricing.get_start"),
        disabled: plan.type === "Premium" && yearly === !!(plan.feeType === 1),
        isRecommended: true,
        features: [
          t("premium_features1"),
          t("premium_features2"),
          t("premium_features5"),
        ],
      },
    ],
    [plan, yearly, catalogPrices, t],
  );

  const tableData = useMemo(
    () => [
      {
        key: 0,
        features: t("Monthly Payment"),
        free: "0",
        basic: String(catalogPrices.Basic.monthlyPrice),
        pro: String(catalogPrices.Pro.monthlyPrice),
        premium: String(catalogPrices.Premium.monthlyPrice),
        type: "text",
      },
      {
        key: 1,
        features: t("Translation quota"),
        free: "10",
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
        free: t("Medium"),
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
        basic: t("Support"),
        pro: t("Support"),
        premium: t("Support"),
        type: "text",
      },
    ],
    [catalogPrices, t],
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
          "Plan credits reset at the end of each billing cycle. Extra credit packs never expire.",
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
          "Unused plan credits are removed when the subscription ends. Extra credit packs stay.",
        ),
      },
    ],
    [],
  );

  const comparisonFeatureColWidth = 156;
  const comparisonPlanColWidth = 188;
  const comparisonTableScrollX =
    comparisonFeatureColWidth + comparisonPlanColWidth * 4;

  const columns = [
    {
      title: t("Features"),
      dataIndex: "features",
      key: "features",
      width: comparisonFeatureColWidth,
      fixed: "left" as const,
      className: "pricing-comparison-table__feature",
    },
    {
      title: "Free",
      dataIndex: "free",
      key: "free",
      width: comparisonPlanColWidth,
      className: "pricing-comparison-table__plan",
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
      width: comparisonPlanColWidth,
      className: "pricing-comparison-table__plan",
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
      width: comparisonPlanColWidth,
      className: "pricing-comparison-table__plan",
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
      width: comparisonPlanColWidth,
      className: "pricing-comparison-table__plan",
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
    openCreditsPurchaseModal();
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
    planCancelFetcher.submit(
      { cancelPlan: JSON.stringify(true) },
      { method: "POST" },
    );
  };
  useEffect(() => {
    if (planCancelFetcher.data) {
      const userErrors =
        planCancelFetcher.data.data?.appSubscriptionCancel?.userErrors ?? [];
      const subscription =
        planCancelFetcher.data.data?.appSubscriptionCancel?.appSubscription;
      if (userErrors.length === 0 && subscription) {
        return;
      }
      if (planCancelFetcher.data.errorMsg === "NO_ACTIVE_SUBSCRIPTION") {
        console.error("取消失败: 没有可取消的订阅");
        return;
      }
      console.error("取消失败:", userErrors);
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
      <AppSubpageTitleBar title={t("Pricing")} />
      <div className="pricing-page">
      <Space direction="vertical" size="large" style={{ display: "flex" }}>
        <AppPageHeader
          title={t("Pricing")}
          backAction={homeBackAction}
          extra={
            plan.type || updateTime ? (
              <div className="pricing-page__header-meta">
                {plan.type ? (
                  <AppStatusBadge tone="info">
                    {plan.type === "Free" ? t("Free") : plan.type}
                  </AppStatusBadge>
                ) : null}
                {updateTime ? (
                  <span className="pricing-page__next-payment">
                    {t("pricing.nextPayment")}: {updateTime}
                  </span>
                ) : null}
              </div>
            ) : undefined
          }
        />
        <AccountTranslationsCard
          loading={isLoading || !plan.id}
          remainingCredits={Number(remaining ?? 0)}
          onBuyCredits={handleAddCredits}
        />
        <section className="pricing-section" id="pricing-plans">
          <div className="pricing-section__header">
            <div className="pricing-section__title-wrap">
              <h2 className="pricing-section__title">{t("pricing.plans")}</h2>
            </div>
            <Flex
              className="pricing-section__billing-toggle"
              align="center"
              gap={8}
              wrap="wrap"
            >
              <Text type="secondary">{t("pricing.monthly")}</Text>
              <Switch checked={yearly} onChange={handleSetYearlyReport} />
              <Text strong>{t("Yearly")}</Text>
              <div className="yearly_save">
                <Text strong>{t("Save 20%")}</Text>
              </div>
            </Flex>
          </div>
          <Row gutter={[16, 16]}>
          <Col xs={24} sm={24} md={12} lg={6} style={{ display: "flex" }}>
            <div
              className={
                plan.type === "Free"
                  ? "pricing-plan-card pricing-plan-card--current"
                  : "pricing-plan-card"
              }
            >
              {plan.type === "Free" ? (
                <div className="pricing-plan-card__badge">
                  <AppStatusBadge tone="info">
                    {t("pricing.current_plan")}
                  </AppStatusBadge>
                </div>
              ) : null}
              <div className="pricing-plan-card__hero">
                <Title level={4} style={{ margin: 0 }}>
                  {t("Free")}
                </Title>
                <div className="pricing-plan-card__price-row">
                  <span className="pricing-plan-card__price">$0</span>
                  <span className="pricing-plan-card__unit">{t("/month")}</span>
                </div>
              </div>
              <div className="pricing-plan-card__cta">
                <AppButton
                  block
                  disabled={plan.type === "Free" || selectedPayPlanOption}
                  onClick={() => {
                    setCancelPlanWarnModal(true);
                    reportClick("pricing_plan_trial");
                  }}
                >
                  {plan.type === "Free"
                    ? t("pricing.current_plan")
                    : t("pricing.get_start")}
                </AppButton>
              </div>
              <div className="pricing-plan-card__features">
                {[
                  t("starter_features1"),
                  t("starter_features2"),
                  t("starter_features3"),
                ].map((feature) => (
                  <div key={feature} className="pricing-plan-card__feature">
                    <CheckOutlined
                      style={{ color: "var(--p-color-text-success)", fontSize: 12 }}
                    />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </Col>
          {plans.map((item, index) => {
            const startId = `${item.title}-${yearly ? "yearly" : "month"}-${index}-0`;
            const trialId = `${item.title}-${yearly ? "yearly" : "month"}-${index}-5`;
            return (
              <Col
                key={item.title}
                xs={24}
                sm={24}
                md={12}
                lg={6}
                style={{ display: "flex" }}
              >
                <div
                  className={`pricing-plan-card ${
                    item.disabled
                      ? "pricing-plan-card--current"
                      : item.isRecommended && plan.type === "Free" && plan.id
                        ? "pricing-plan-card--recommended"
                        : ""
                  }`}
                >
                  {item.disabled ? (
                    <div className="pricing-plan-card__badge">
                      <AppStatusBadge tone="info">
                        {t("pricing.current_plan")}
                      </AppStatusBadge>
                    </div>
                  ) : item.isRecommended && plan.type === "Free" && plan.id ? (
                    <div className="pricing-plan-card__badge">
                      <AppStatusBadge tone="caution">
                        {t("pricing.recommended")}
                      </AppStatusBadge>
                    </div>
                  ) : null}
                  <div className="pricing-plan-card__hero">
                    <Title level={4} style={{ margin: 0 }}>
                      {yearly ? item.yearlyTitle : item.title}
                    </Title>
                    <div className="pricing-plan-card__price-row">
                      <span className="pricing-plan-card__price">
                        ${yearly ? item.yearlyPrice : item.monthlyPrice}
                      </span>
                      <span className="pricing-plan-card__unit">{t("/month")}</span>
                    </div>
                    {yearly ? (
                      <div
                        className="pricing-plan-card__billing-note"
                        dangerouslySetInnerHTML={{ __html: item.subtitle }}
                      />
                    ) : null}
                  </div>
                  <div className="pricing-plan-card__cta">
                    <AppButton
                      id={startId}
                      block
                      disabled={item.disabled || selectedPayPlanOption}
                      loading={payForPlanButtonLoading === startId}
                      onClick={() =>
                        handlePayForPlan({
                          plan: item,
                          trialDays: 0,
                          id: startId,
                        })
                      }
                    >
                      {item.buttonText}
                    </AppButton>
                    {isNew && item.trialDays > 0 ? (
                      <AppButton
                        id={trialId}
                        type="primary"
                        block
                        disabled={item.disabled || selectedPayPlanOption}
                        loading={payForPlanButtonLoading === trialId}
                        onClick={() =>
                          handlePayForPlan({
                            plan: item,
                            trialDays: item.trialDays,
                            id: trialId,
                          })
                        }
                      >
                        {t("Free trial")}
                      </AppButton>
                    ) : null}
                  </div>
                  <div className="pricing-plan-card__features">
                    {item.features.map((feature) => (
                      <div key={feature} className="pricing-plan-card__feature">
                        <CheckOutlined
                          style={{
                            color: "var(--p-color-text-success)",
                            fontSize: 12,
                          }}
                        />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
        </section>
        <section className="pricing-section pricing-section--compact">
          <div className="pricing-section__header">
            <div className="pricing-section__title-wrap">
              <h2 className="pricing-section__title">{t("Compare plans")}</h2>
              <p className="pricing-comparison-scroll-hint">
                {t("pricing.compare.scrollHint")}
              </p>
            </div>
          </div>
          <div className="pricing-comparison-table-wrap">
            <Table
              className="pricing-comparison-table"
              dataSource={tableData}
              columns={columns}
              pagination={false}
              scroll={{ x: comparisonTableScrollX }}
            />
          </div>
        </section>
        <section className="pricing-section pricing-section--compact">
          <div className="pricing-section__header">
            <div className="pricing-section__title-wrap">
              <h2 className="pricing-section__title">{t("FAQs")}</h2>
            </div>
          </div>
          <Collapse
            items={collapseData}
            onChange={() => {
              reportClick("pricing_faq_click");
            }}
          />
        </section>
      </Space>
      </div>
      <HasPayForFreePlanModal />
      <AppSModal
        open={cancelPlanWarnModal}
        heading={t("Cancel paid plan?")}
        onClose={() => setCancelPlanWarnModal(false)}
        primaryAction={{
          content: t("Keep paid plan"),
          onAction: () => setCancelPlanWarnModal(false),
        }}
        secondaryActions={[
          {
            content: t("Switch to free plan"),
            onAction: handleCancelPlan,
            loading: planCancelFetcher.state === "submitting",
            tone: "critical",
          },
        ]}
      >
        <Text>
          {t(
            "Moving to the free plan will turn off key features. Are you sure you want to switch?",
          )}
        </Text>
      </AppSModal>
    </Page>
  );
};

export default Index;
