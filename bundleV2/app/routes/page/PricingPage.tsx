// PricingPage.tsx
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import "../../styles/tailwind.css";
import type { BillingPlanId } from "../../billing";
import { subscriptionDisplayName } from "../../billing";

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
  const surfaceCardClass =
    "rounded-[12px] border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]";
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
      ? fetcher.data.error || "Failed to create subscription"
      : null;

  const isCurrentPlan = (planId: BillingPlanId) => {
    const expectedName = subscriptionDisplayName(planId, billingCycle);
    return activeSubscriptions.some(
      (s) => s.status === "ACTIVE" && s.name === expectedName,
    );
  };

  const hasAnyActive = activeSubscriptions.some((s) => s.status === "ACTIVE");

  return (
    <div className="mx-auto max-w-[1280px] pb-[24px]">
      <div className="mb-[24px] flex flex-col gap-[16px] lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[760px]">
          <div className="mb-[8px] inline-flex items-center rounded-full border border-[#dfe3e8] bg-[#f6f6f7] px-[10px] py-[4px] text-[12px] font-medium text-[#5c6166]">
            Billing & Plans
          </div>
          <h1 className="m-0 text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[#1c1f23] sm:text-[32px] sm:leading-[40px]">
            Pricing Plans
          </h1>
          <p className="mt-[10px] mb-0 text-[14px] leading-[22px] text-[#5c6166] sm:text-[15px] sm:leading-[24px]">
            Choose a plan that matches your store volume and analytics needs.
            Billing is confirmed through Shopify.
          </p>
        </div>
      </div>

      {billingTestMode && (
        <div className="mb-[16px] rounded-[12px] border border-[#ffd79d] bg-[#fff7e8] p-[14px]">
          <p className="m-0 text-[14px] leading-[21px] text-[#7a4a00]">
            Development environment: Billing is in <strong>test mode</strong> (test charge) and will not incur real charges.
          </p>
        </div>
      )}

      {fetcherError && (
        <div className="mb-[16px] rounded-[12px] border border-[#f7b4ae] bg-[#fef3f2] p-[14px]">
          <p className="m-0 text-[14px] leading-[21px] text-[#912018]">
            {fetcherError}
          </p>
        </div>
      )}

      {hasAnyActive && (
        <div className="mb-[24px] rounded-[12px] border border-[#dfe3e8] bg-white p-[14px] shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <p className="m-0 text-[14px] leading-[21px] text-[#5c6166]">
            This store already has an active app subscription. To change your plan, please manage your app subscription in the Shopify admin under "Settings → Apps and sales channels", or select a different billing cycle/plan to start a new subscription (subject to Shopify rules).
          </p>
        </div>
      )}

      <div className={`${surfaceCardClass} mb-[24px] p-[24px] text-center sm:p-[28px]`}>
        <h2 className="m-0 text-[24px] font-semibold leading-[32px] text-[#1c1f23] sm:text-[28px] sm:leading-[36px]">
          Choose the right plan for your growth stage
        </h2>
        <p className="mx-auto mt-[8px] mb-0 max-w-[720px] text-[14px] leading-[22px] text-[#5c6166]">
          Includes a 14-day free trial (billed through Shopify). Clicking the button will redirect you to the Shopify admin to confirm the subscription.
        </p>

        {/* Billing Cycle Toggle */}
        <div className="mt-[24px] flex items-center justify-center gap-[16px]">
          <span
            className={`text-[14px] ${
              billingCycle === "monthly"
                ? "font-semibold text-[#202223]"
                : "font-normal text-[#6d7175]"
            }`}
          >
            Monthly
          </span>
          <button
            type="button"
            onClick={() =>
              setBillingCycle((prev) => (prev === "monthly" ? "yearly" : "monthly"))
            }
            className={`relative h-[28px] w-[52px] rounded-full border-0 p-0 transition-colors cursor-pointer ${
              billingCycle === "yearly" ? "bg-[#008060]" : "bg-[#c4cdd5]"
            }`}
          >
            <span
              className={`absolute top-[2px] h-[24px] w-[24px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all ${
                billingCycle === "yearly" ? "left-[26px]" : "left-[2px]"
              }`}
            />
          </button>
          <div className="flex items-center gap-[8px]">
            <span
              className={`text-[14px] ${
                billingCycle === "yearly"
                  ? "font-semibold text-[#202223]"
                  : "font-normal text-[#6d7175]"
              }`}
            >
              Yearly
            </span>
            <span className="rounded-full bg-[#d1f7c4] px-[8px] py-[2px] text-[12px] font-semibold text-[#108043]">
              Save 17%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[16px] md:grid-cols-3 sm:gap-[24px]">
        {plans.map((plan, index) => {
          const yearlyNumber = parseInt(plan.yearlyPrice.replace(/[$,]/g, ""), 10);
          const current = isCurrentPlan(plan.id);
          return (
            <div
              key={index}
              className={`relative flex h-full flex-col rounded-[16px] bg-white p-[24px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                plan.popular
                  ? "border-2 border-[#008060]"
                  : "border border-[#dfe3e8]"
              }`}
            >
              {plan.popular && (
                <div className="absolute left-1/2 top-[-12px] -translate-x-1/2 rounded-full bg-[#008060] px-[14px] py-[4px] text-[12px] font-semibold text-white">
                  MOST POPULAR
                </div>
              )}

              <div className="text-center">
                <h3 className="text-[22px] font-semibold leading-[30px] text-[#1c1f23]">
                  {plan.name}
                </h3>
                <div className="my-[16px]">
                  <span className="text-[36px] font-semibold leading-[44px] text-[#1c1f23]">
                    {billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice}
                  </span>
                  <span className="text-[14px] text-[#6d7175]">
                    /{billingCycle === "monthly" ? "month" : "year"}
                  </span>
                  {billingCycle === "yearly" && (
                    <div className="mt-[4px] text-[12px] font-medium text-[#108043]">
                      ${(yearlyNumber / 12).toFixed(0)}/month billed annually
                    </div>
                  )}
                </div>

                <ul className="my-[24px] space-y-[10px] p-0 text-left">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-[10px] text-[14px] leading-[21px] text-[#1c1f23]"
                    >
                      <span className="mt-[2px] inline-flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#f0f9f6] text-[12px] font-semibold text-[#108043]">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <fetcher.Form method="post" className="mt-auto w-full">
                  <input type="hidden" name="intent" value="billing-subscribe" />
                  <input type="hidden" name="plan" value={plan.id} />
                  <input type="hidden" name="cycle" value={billingCycle} />
                  <button
                    type="submit"
                    className={`w-full rounded-[8px] px-[16px] py-[10px] text-[14px] font-medium transition-colors ${
                      current
                        ? "cursor-not-allowed border border-[#dfe3e8] bg-[#f6f6f7] text-[#6d7175]"
                        : plan.popular
                          ? "border-0 bg-[#008060] text-white hover:bg-[#006e52]"
                          : "border border-[#dfe3e8] bg-white text-[#1c1f23] hover:bg-[#f6f6f7]"
                    }`}
                    disabled={fetcher.state !== "idle" || current}
                  >
                    {current
                      ? "Current Plan"
                      : fetcher.state !== "idle"
                        ? "Processing..."
                        : "Subscribe in Shopify"}
                  </button>
                </fetcher.Form>
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${surfaceCardClass} mt-[32px] p-[24px]`}>
        <h2 className="mb-[16px] text-[22px] font-semibold leading-[30px] text-[#1c1f23]">
          Frequently Asked Questions
        </h2>
        <div className="space-y-[20px]">
          <div>
            <h3 className="mb-[8px] text-[16px] font-semibold text-[#1c1f23]">
              Can I change plans later?
            </h3>
            <p className="m-0 text-[14px] leading-[22px] text-[#5c6166]">
              Yes, you can upgrade or downgrade your plan at any time. Changes take effect
              immediately.
            </p>
          </div>
          <div>
            <h3 className="mb-[8px] text-[16px] font-semibold text-[#1c1f23]">
              What happens after the trial?
            </h3>
            <p className="m-0 text-[14px] leading-[22px] text-[#5c6166]">
              After your 14-day trial, you&apos;ll be charged based on your selected plan.
              You can cancel anytime.
            </p>
          </div>
          <div>
            <h3 className="mb-[8px] text-[16px] font-semibold text-[#1c1f23]">
              Do you offer refunds?
            </h3>
            <p className="m-0 text-[14px] leading-[22px] text-[#5c6166]">
              Yes, we offer a 30-day money-back guarantee for all plans.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
