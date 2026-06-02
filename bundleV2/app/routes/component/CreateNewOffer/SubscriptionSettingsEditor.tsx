import { Input } from "antd";
import type { SubscriptionPreviewPlanDraft } from "./campaignDraft";
import type { RulePresentationPatch } from "./unifiedRulePresentation";

type Props = {
  subscriptionEnabled: boolean;
  selectedProductCount: number;
  subscriptionTitle: string;
  setSubscriptionTitle: (value: string) => void;
  subscriptionSubtitle: string;
  setSubscriptionSubtitle: (value: string) => void;
  previewOneTimePriceText: string;
  previewSubscriptionPriceText?: string | null;
  previewSubscriptionCompareAtPriceText?: string | null;
  previewSubscriptionSavingsText?: string | null;
  previewSubscriptionPlans: SubscriptionPreviewPlanDraft[];
  section?: "subscription-offer" | "one-time-message" | "all";
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

export default function SubscriptionSettingsEditor({
  subscriptionEnabled,
  selectedProductCount,
  subscriptionTitle,
  setSubscriptionTitle,
  subscriptionSubtitle,
  setSubscriptionSubtitle,
  previewOneTimePriceText,
  previewSubscriptionPriceText,
  previewSubscriptionCompareAtPriceText,
  previewSubscriptionSavingsText,
  previewSubscriptionPlans,
  section = "all",
  updateRulePresentation,
}: Props) {
  const showSubscriptionOffer =
    section === "all" || section === "subscription-offer";
  const usesGenericPreview = selectedProductCount > 1;
  const primaryPreviewPlan = previewSubscriptionPlans[0] ?? null;
  const resolvedSubscriptionDetail = usesGenericPreview
    ? `${selectedProductCount} selected products · each product keeps its own selling plans`
    : primaryPreviewPlan
      ? [primaryPreviewPlan.sellingPlanName, primaryPreviewPlan.billingLabel]
          .filter(Boolean)
          .join(" · ")
      : subscriptionSubtitle;
  const previewStatusMessage =
    usesGenericPreview
      ? "Storefront pricing, billing cycles, and savings will render from each product's own selling plans."
      : primaryPreviewPlan == null
      ? "Select a product with Shopify selling plans to preview cycle and savings."
      : null;

  return (
    <div className="flex flex-col gap-4">
      {showSubscriptionOffer ? (
        <>
          <div className="rounded-[10px] border border-[#dfe3e8] bg-[#ffffff] px-4 py-3 text-[12px] leading-[1.6] text-[#4f5b67]">
            Subscription sits alongside your existing bars. Select products in the
            product pool, and this module will read cycle and pricing from Shopify
            selling plans. When multiple products are selected, the storefront keeps
            each product's own subscription options.
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-[13px] font-medium text-[#1c1f23] mb-1">
                Subscribe title
              </label>
              <Input
                size="large"
                value={subscriptionTitle}
                onChange={(e) =>
                  updateRulePresentation
                    ? updateRulePresentation("subscription-option", {
                        title: e.target.value,
                      })
                    : setSubscriptionTitle(e.target.value)
                }
                maxLength={60}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1c1f23] mb-1">
                Subscription subtitle
              </label>
              <Input
                size="large"
                value={subscriptionSubtitle}
                onChange={(e) =>
                  updateRulePresentation
                    ? updateRulePresentation("subscription-option", {
                        subtitle: e.target.value,
                      })
                    : setSubscriptionSubtitle(e.target.value)
                }
                maxLength={60}
              />
            </div>
          </div>
          {subscriptionEnabled ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-[10px] border border-[#dfe3e8] bg-white p-3">
                <div className="text-[13px] font-semibold text-[#1c1f23]">
                  One-time purchase
                </div>
                <div className="mt-1 text-[12px] text-[#8c9196]">
                  Uses the current product price
                </div>
                <div className="mt-3 text-[22px] font-semibold leading-none text-[#1c1f23]">
                  {previewOneTimePriceText}
                </div>
              </div>
              <div className="rounded-[10px] border border-[#c9ccd0] bg-white p-3">
                <div className="text-[13px] font-semibold text-[#1c1f23]">
                  {subscriptionTitle || "Subscribe & Save"}
                </div>
                {resolvedSubscriptionDetail ? (
                  <div className="mt-1 text-[12px] text-[#8c9196]">
                    {resolvedSubscriptionDetail}
                  </div>
                ) : null}
                {previewStatusMessage ? (
                  <div className="mt-3 text-[12px] font-medium text-[#8c9196]">
                    {previewStatusMessage}
                  </div>
                ) : (
                  <div className="mt-3 text-[22px] font-semibold leading-none text-[#1c1f23]">
                    {previewSubscriptionPriceText}
                  </div>
                )}
                {previewSubscriptionCompareAtPriceText ? (
                  <div className="mt-2 text-[12px] text-[#8c9196] line-through">
                    {previewSubscriptionCompareAtPriceText}
                  </div>
                ) : null}
                {previewSubscriptionSavingsText ? (
                  <div className="mt-1 text-[12px] font-medium text-[#008060]">
                    {previewSubscriptionSavingsText}
                  </div>
                ) : null}
              </div>
              {!usesGenericPreview && previewSubscriptionPlans.length > 1 ? (
                <div className="md:col-span-2 rounded-[10px] border border-[#e3e8ed] bg-[#f6f8f9] p-3">
                  <div className="text-[12px] font-medium text-[#1c1f23]">
                    Preview subscription cycles
                  </div>
                  <div className="mt-3 grid gap-2">
                    {previewSubscriptionPlans.map((plan, index) => (
                      <div
                        key={plan.sellingPlanId || `${plan.sellingPlanName}-${index}`}
                        className={`rounded-[8px] border px-3 py-2 ${
                          index === 0
                            ? "border-[#008060] bg-[#f0faf6]"
                            : "border-[#dfe3e8] bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-[12px] font-medium text-[#1c1f23]">
                              {plan.sellingPlanName}
                            </div>
                            <div className="mt-1 text-[11px] text-[#8c9196]">
                              {plan.billingLabel}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[12px] font-semibold text-[#1c1f23]">
                              {`EUR ${plan.subscriptionPrice.toFixed(2)}`}
                            </div>
                            {plan.savingsAmount > 0 ? (
                              <div className="mt-1 text-[11px] font-medium text-[#008060]">
                                {`Save EUR ${plan.savingsAmount.toFixed(2)}`}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
