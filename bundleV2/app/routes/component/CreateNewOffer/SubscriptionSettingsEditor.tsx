import { Checkbox, Input, Select, Switch } from "antd";
import type { RulePresentationPatch } from "./unifiedRulePresentation";

type Props = {
  subscriptionEnabled: boolean;
  setSubscriptionEnabled: (value: boolean) => void;
  subscriptionTitle: string;
  setSubscriptionTitle: (value: string) => void;
  subscriptionSubtitle: string;
  setSubscriptionSubtitle: (value: string) => void;
  oneTimeTitle: string;
  setOneTimeTitle: (value: string) => void;
  oneTimeSubtitle: string;
  setOneTimeSubtitle: (value: string) => void;
  subscriptionPosition: "below-bundle-bars";
  setSubscriptionPosition: (value: "below-bundle-bars") => void;
  subscriptionDefaultSelected: boolean;
  setSubscriptionDefaultSelected: (value: boolean) => void;
  shouldShowSubscriptionPreview: boolean;
  allSelectedProductsHaveSubscription: boolean;
  shouldShowSubscriptionExplanation: boolean;
  subscriptionExplanationTitle: string;
  subscriptionExplanationBody: string;
  section?: "subscription-offer" | "one-time-message" | "all";
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

export default function SubscriptionSettingsEditor({
  subscriptionEnabled,
  setSubscriptionEnabled,
  subscriptionTitle,
  setSubscriptionTitle,
  subscriptionSubtitle,
  setSubscriptionSubtitle,
  oneTimeTitle,
  setOneTimeTitle,
  oneTimeSubtitle,
  setOneTimeSubtitle,
  subscriptionPosition,
  setSubscriptionPosition,
  subscriptionDefaultSelected,
  setSubscriptionDefaultSelected,
  shouldShowSubscriptionPreview,
  allSelectedProductsHaveSubscription,
  shouldShowSubscriptionExplanation,
  subscriptionExplanationTitle,
  subscriptionExplanationBody,
  section = "all",
  updateRulePresentation,
}: Props) {
  const showSubscriptionOffer =
    section === "all" || section === "subscription-offer";
  const showOneTimeMessage =
    section === "all" || section === "one-time-message";

  return (
    <div className="flex flex-col gap-4">
      {showSubscriptionOffer ? (
        <>
          <div className="flex items-center justify-between rounded-[10px] bg-[#f6f8f9] px-4 py-3">
            <div>
              <div className="text-[14px] font-medium text-[#1c1f23]">
                Enable subscription option
              </div>
              <div className="mt-1 text-[12px] text-[#5c6166]">
                {subscriptionEnabled ? "Enabled" : "Optional"}
              </div>
            </div>
            <Switch
              checked={subscriptionEnabled}
              onChange={(checked) => setSubscriptionEnabled(checked)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                Subscribe subtitle
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

          {shouldShowSubscriptionPreview && (
            <div className="mt-4">
              <div
                className={`rounded-[10px] bg-white p-3 ${
                  allSelectedProductsHaveSubscription
                    ? "border border-[#c9ccd0]"
                    : "border border-[#e3e8ed]"
                }`}
              >
                <div className="text-[14px] font-semibold text-[#1c1f23]">
                  {subscriptionTitle}
                </div>
                {subscriptionSubtitle ? (
                  <div className="text-[13px] text-[#8c9196] mt-1">
                    {subscriptionSubtitle}
                  </div>
                ) : null}
              </div>
              {shouldShowSubscriptionExplanation && (
                <div className="mt-3 rounded-[10px] bg-[#f6f8f9] p-3">
                  <div className="text-[13px] font-semibold text-[#1c1f23]">
                    {subscriptionExplanationTitle}
                  </div>
                  <div className="text-[12px] text-[#4f5b67] mt-1 leading-[1.5]">
                    {subscriptionExplanationBody}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : null}

      {showOneTimeMessage ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-[#1c1f23] mb-1">
                One-time title
              </label>
              <Input
                size="large"
                value={oneTimeTitle}
                onChange={(e) =>
                  updateRulePresentation
                    ? updateRulePresentation("one-time-option", {
                        title: e.target.value,
                      })
                    : setOneTimeTitle(e.target.value)
                }
                maxLength={60}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1c1f23] mb-1">
                One-time subtitle
              </label>
              <Input
                size="large"
                value={oneTimeSubtitle}
                onChange={(e) =>
                  updateRulePresentation
                    ? updateRulePresentation("one-time-option", {
                        subtitle: e.target.value,
                      })
                    : setOneTimeSubtitle(e.target.value)
                }
                maxLength={60}
              />
            </div>
          </div>
          <div className="mt-3 rounded-[10px] bg-[#f6f8f9] px-4 py-3">
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              Placement
              <Select
                className="mt-1 w-full"
                value={subscriptionPosition}
                onChange={(value) =>
                  setSubscriptionPosition(value as "below-bundle-bars")
                }
                options={[
                  {
                    value: "below-bundle-bars",
                    label: "Below bundle deal bars",
                  },
                ]}
              />
            </label>
          </div>
          <div className="mt-3 rounded-[10px] bg-[#f6f8f9] px-4 py-3">
            <Checkbox
              checked={subscriptionDefaultSelected}
              onChange={(e) =>
                updateRulePresentation
                  ? updateRulePresentation("subscription-option", {
                      isDefault: e.target.checked,
                    })
                  : setSubscriptionDefaultSelected(e.target.checked)
              }
            >
              Make subscription option selected by default
            </Checkbox>
          </div>
        </>
      ) : null}
    </div>
  );
}
