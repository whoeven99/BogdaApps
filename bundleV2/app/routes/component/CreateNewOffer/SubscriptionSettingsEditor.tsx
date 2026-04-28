import { Checkbox, Input, Select, Switch } from "antd";

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
}: Props) {
  const showSubscriptionOffer =
    section === "all" || section === "subscription-offer";
  const showOneTimeMessage =
    section === "all" || section === "one-time-message";

  return (
    <div className="mb-6 rounded-[12px] border border-[#e3e8ed] p-4 bg-[#fafbfb]">
      {showSubscriptionOffer ? (
        <>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[14px] font-medium text-[#1c1f23] m-0">
              Subscription
            </h3>
            <Switch
              checked={subscriptionEnabled}
              onChange={(checked) => setSubscriptionEnabled(checked)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] text-[#5c6166] mb-1">
                Subscribe title
              </label>
              <Input
                size="large"
                value={subscriptionTitle}
                onChange={(e) => setSubscriptionTitle(e.target.value)}
                maxLength={60}
              />
            </div>
            <div>
              <label className="block text-[13px] text-[#5c6166] mb-1">
                Subscribe subtitle
              </label>
              <Input
                size="large"
                value={subscriptionSubtitle}
                onChange={(e) => setSubscriptionSubtitle(e.target.value)}
                maxLength={60}
              />
            </div>
          </div>

          {shouldShowSubscriptionPreview && (
            <div className="mt-4">
              <div
                className={`rounded-[10px] p-3 ${
                  allSelectedProductsHaveSubscription
                    ? "border border-[#c9ccd0]"
                    : "border border-dashed border-[#b7b7b7]"
                }`}
              >
                <div className="text-[14px] font-semibold text-[#1c1f23]">
                  {subscriptionTitle || "Subscribe & Save 20%"}
                </div>
                <div className="text-[13px] text-[#8c9196] mt-1">
                  {subscriptionSubtitle || "Delivered weekly"}
                </div>
              </div>
              {shouldShowSubscriptionExplanation && (
                <div className="mt-3 rounded-[10px] bg-[#eaf4ff] p-3">
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
          <div className={showSubscriptionOffer ? "mt-4" : ""}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[13px] text-[#5c6166] mb-1">
                  One-time title
                </label>
                <Input
                  size="large"
                  value={oneTimeTitle}
                  onChange={(e) => setOneTimeTitle(e.target.value)}
                  maxLength={60}
                />
              </div>
              <div>
                <label className="block text-[13px] text-[#5c6166] mb-1">
                  One-time subtitle
                </label>
                <Input
                  size="large"
                  value={oneTimeSubtitle}
                  onChange={(e) => setOneTimeSubtitle(e.target.value)}
                  maxLength={60}
                />
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Select
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
              style={{ width: "100%" }}
            />
          </div>
          <div className="mt-3">
            <Checkbox
              checked={subscriptionDefaultSelected}
              onChange={(e) => setSubscriptionDefaultSelected(e.target.checked)}
            >
              Make subscription option selected by default
            </Checkbox>
          </div>
        </>
      ) : null}
    </div>
  );
}
