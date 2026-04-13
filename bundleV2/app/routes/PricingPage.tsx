// PricingPage.tsx
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import "../styles/tailwind.css";
import "../styles/polaris-custom.css";
import type { BillingPlanId } from "../billing";
import { subscriptionDisplayName } from "../billing";

type BillingSubscribeJson =
  | { ok: true; confirmationUrl: string; testCharge?: boolean }
  | { ok: false; error?: string };

const plans: Array<{
  id: BillingPlanId;
  name: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  popular?: boolean;
}> = [
  {
    id: "starter",
    name: "Starter",
    monthlyPrice: "$29",
    yearlyPrice: "$290",
    features: [
      "Up to 5 active offers",
      "1,000 orders/month",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    monthlyPrice: "$79",
    yearlyPrice: "$790",
    popular: true,
    features: [
      "Up to 20 active offers",
      "10,000 orders/month",
      "Advanced analytics",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthlyPrice: "$199",
    yearlyPrice: "$1,990",
    features: [
      "Unlimited offers",
      "Unlimited orders",
      "Custom analytics",
      "Dedicated support",
      "White label",
    ],
  },
];

export type PricingPageProps = {
  activeSubscriptions: Array<{ name: string; status: string }>;
  billingTestMode: boolean;
};

export function PricingPage({
  activeSubscriptions,
  billingTestMode,
}: PricingPageProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const fetcher = useFetcher<BillingSubscribeJson>();

  useEffect(() => {
    const data = fetcher.data;
    if (!data || !data.ok || !data.confirmationUrl) return;
    const url = data.confirmationUrl;
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
    } else {
      window.location.href = url;
    }
  }, [fetcher.data]);

  const fetcherError =
    fetcher.data && "ok" in fetcher.data && fetcher.data.ok === false
      ? fetcher.data.error || "订阅创建失败"
      : null;

  const isCurrentPlan = (planId: BillingPlanId) => {
    const expectedName = subscriptionDisplayName(planId, billingCycle);
    return activeSubscriptions.some(
      (s) => s.status === "ACTIVE" && s.name === expectedName,
    );
  };

  const hasAnyActive = activeSubscriptions.some((s) => s.status === "ACTIVE");

  return (
    <div className="polaris-page" style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div className="polaris-page__header" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="polaris-page__title">Pricing Plans</h1>
        </div>
      </div>

      {billingTestMode && (
        <div
          className="polaris-card"
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#fff5e6",
            border: "1px solid #ffc453",
          }}
        >
          <p className="polaris-text-body-sm" style={{ margin: 0 }}>
            开发环境：计费为 <strong>测试模式</strong>（test charge），不会产生真实扣款。
          </p>
        </div>
      )}

      {fetcherError && (
        <div
          className="polaris-card"
          style={{
            marginBottom: 16,
            padding: 12,
            background: "#fed3d1",
            border: "1px solid #d72c0c",
          }}
        >
          <p className="polaris-text-body-sm" style={{ margin: 0, color: "#6b2916" }}>
            {fetcherError}
          </p>
        </div>
      )}

      {hasAnyActive && (
        <div className="polaris-card" style={{ marginBottom: 16, padding: 12 }}>
          <p className="polaris-text-body-sm" style={{ margin: 0 }}>
            当前店铺已有生效中的应用订阅。若需更换套餐，请在 Shopify
            后台的「设置 → 应用和销售渠道」中管理该应用订阅，或选择其他周期/套餐发起新订阅（以 Shopify
            规则为准）。
          </p>
        </div>
      )}

      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <h2 className="polaris-text-heading-lg" style={{ marginBottom: "8px" }}>
          Choose the perfect plan for your business
        </h2>
        <p className="polaris-text-subdued">
          含 14 天试用（通过 Shopify 结算）。点击按钮将跳转至 Shopify 后台确认订阅。
        </p>

        {/* Billing Cycle Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontWeight: billingCycle === "monthly" ? 600 : 400,
              color: billingCycle === "monthly" ? "#202223" : "#6d7175",
            }}
          >
            Monthly
          </span>
          <button
            type="button"
            onClick={() =>
              setBillingCycle((prev) => (prev === "monthly" ? "yearly" : "monthly"))
            }
            style={{
              position: "relative",
              width: 52,
              height: 28,
              backgroundColor: billingCycle === "yearly" ? "#008060" : "#c4cdd5",
              border: "none",
              borderRadius: 14,
              cursor: "pointer",
              transition: "background-color 0.2s",
              padding: 0,
            }}
          >
            <span
              style={{
                position: "absolute",
                top: 2,
                left: billingCycle === "yearly" ? 26 : 2,
                width: 24,
                height: 24,
                backgroundColor: "white",
                borderRadius: "50%",
                transition: "left 0.2s",
                boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              }}
            />
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: billingCycle === "yearly" ? 600 : 400,
                color: billingCycle === "yearly" ? "#202223" : "#6d7175",
              }}
            >
              Yearly
            </span>
            <span
              style={{
                backgroundColor: "#d1f7c4",
                color: "#108043",
                fontSize: 12,
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: 4,
              }}
            >
              Save 17%
            </span>
          </div>
        </div>
      </div>

      <div className="polaris-grid grid grid-cols-1 md:grid-cols-3 gap-[16px] sm:gap-[24px]">
        {plans.map((plan, index) => {
          const yearlyNumber = parseInt(plan.yearlyPrice.replace(/[$,]/g, ""), 10);
          const current = isCurrentPlan(plan.id);
          return (
            <div
              key={index}
              className="polaris-card"
              style={{
                border: plan.popular ? "2px solid #008060" : "none",
                position: "relative",
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#008060",
                    color: "white",
                    padding: "4px 16px",
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  MOST POPULAR
                </div>
              )}

              <div
                className="polaris-stack polaris-stack--vertical"
                style={{ textAlign: "center" }}
              >
                <h3 className="polaris-text-heading-md">{plan.name}</h3>
                <div style={{ margin: "16px 0" }}>
                  <span style={{ fontSize: 36, fontWeight: 600 }}>
                    {billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="polaris-text-subdued">
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                  {billingCycle === "yearly" && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#108043",
                        marginTop: 4,
                        fontWeight: 500,
                      }}
                    >
                      ${(yearlyNumber / 12).toFixed(0)}/month billed annually
                    </div>
                  )}
                </div>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "24px 0",
                    textAlign: "left",
                  }}
                >
                  {plan.features.map((feature, i) => (
                    <li key={i} style={{ padding: "8px 0", fontSize: 14 }}>
                      ✓ {feature}
                    </li>
                  ))}
                </ul>

                <fetcher.Form method="post" style={{ width: "100%", marginTop: "auto" }}>
                  <input type="hidden" name="intent" value="billing-subscribe" />
                  <input type="hidden" name="plan" value={plan.id} />
                  <input type="hidden" name="cycle" value={billingCycle} />
                  <button
                    type="submit"
                    className="polaris-button"
                    style={{ width: "100%" }}
                    disabled={fetcher.state !== "idle" || current}
                  >
                    {current
                      ? "当前套餐"
                      : fetcher.state !== "idle"
                        ? "处理中…"
                        : "在 Shopify 中订阅"}
                  </button>
                </fetcher.Form>
              </div>
            </div>
          );
        })}
      </div>

      <div className="polaris-card" style={{ marginTop: "40px" }}>
        <h2 className="polaris-text-heading-md" style={{ marginBottom: "16px" }}>
          Frequently Asked Questions
        </h2>
        <div className="polaris-stack polaris-stack--vertical">
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Can I change plans later?
            </h3>
            <p className="polaris-text-subdued">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect
              immediately.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              What happens after the trial?
            </h3>
            <p className="polaris-text-subdued">
              After your 14-day trial, you&apos;ll be charged based on your selected plan.
              You can cancel anytime.
            </p>
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
              Do you offer refunds?
            </h3>
            <p className="polaris-text-subdued">
              Yes, we offer a 30-day money-back guarantee for all plans.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
