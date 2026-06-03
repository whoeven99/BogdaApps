// PricingPage.tsx
import { useEffect, useState } from "react";
import { useFetcher } from "react-router";
import "../../styles/tailwind.css";
import type { BillingPlanId } from "../../billing";
import { subscriptionDisplayName } from "../../billing";
import {
  AdminPageHeader,
  adminPrimaryButtonClass,
  adminSecondaryButtonClass,
  adminSurfaceCardClass,
} from "../component/adminUi";

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
      <AdminPageHeader
        title="Pricing"
        subtitle="Manage billing inside Shopify Admin with a compact plan comparison and a single clear subscription action."
      />

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
        <div className={`${adminSurfaceCardClass} mb-[24px] p-[14px]`}>
          <p className="m-0 text-[14px] leading-[21px] text-[#5c6166]">
            An active subscription already exists. Manage it in Shopify admin before switching plans.
          </p>
        </div>
      )}

      <div className={`${adminSurfaceCardClass} mb-[24px] p-[20px] sm:p-[24px]`}>
        <div className="flex flex-col gap-[16px] lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[680px]">
            <h2 className="m-0 text-[18px] font-semibold leading-[28px] text-[#1c1f23]">
              Plan comparison
            </h2>
            <p className="mt-[6px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
              Start with a 14-day free trial. Shopify handles billing and confirmation.
            </p>
          </div>
          <div>
            <div className="mb-[6px] text-[13px] font-medium text-[#1c1f23]">
              Billing cycle
            </div>
            <div className="inline-flex items-center gap-[8px] rounded-[10px] border border-[#e5e7eb] bg-[#fcfcfd] p-[4px]">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-[8px] px-[12px] py-[8px] text-[13px] font-medium transition-colors ${
                  billingCycle === "monthly"
                    ? "bg-white text-[#1c1f23] shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                    : "text-[#5c6166] hover:bg-[#f6f6f7]"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`rounded-[8px] px-[12px] py-[8px] text-[13px] font-medium transition-colors ${
                  billingCycle === "yearly"
                    ? "bg-white text-[#1c1f23] shadow-[0_1px_2px_rgba(16,24,40,0.06)]"
                    : "text-[#5c6166] hover:bg-[#f6f6f7]"
                }`}
              >
                Yearly
              </button>
              <span className="rounded-full bg-[#f0f9f6] px-[8px] py-[4px] text-[12px] font-medium text-[#108043]">
                Save 17%
              </span>
            </div>
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
              className={`relative flex h-full flex-col rounded-[12px] bg-white p-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                plan.popular
                  ? "border-2 border-[#008060]"
                  : "border border-[#dfe3e8]"
              }`}
            >
              {plan.popular && (
                <div className="absolute right-[16px] top-[16px] rounded-full bg-[#f0f9f6] px-[10px] py-[4px] text-[12px] font-medium text-[#108043]">
                  Recommended
                </div>
              )}

              <div className="flex h-full flex-col">
                <div className="pr-[96px]">
                <h3 className="m-0 text-[20px] font-semibold leading-[30px] text-[#1c1f23]">
                  {plan.name}
                </h3>
                <div className="mt-[12px]">
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
                </div>

                <ul className="my-[20px] space-y-[10px] p-0 text-left">
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
                          ? adminPrimaryButtonClass
                          : adminSecondaryButtonClass
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

      <div className={`${adminSurfaceCardClass} mt-[24px] p-[20px] sm:p-[24px]`}>
        <h2 className="mb-[16px] text-[18px] font-semibold leading-[28px] text-[#1c1f23]">
          Billing notes
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
              Refund handling depends on the approved billing flow and Shopify billing terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
