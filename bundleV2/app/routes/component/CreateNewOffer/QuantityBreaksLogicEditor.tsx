import { Button, Checkbox, Dropdown, Input } from "antd";

type DiscountRule = {
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

type Props = {
  discountRules: DiscountRule[];
  setDiscountRules: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
  section?: "tiers" | "presentation" | "all";
};

export default function QuantityBreaksLogicEditor({
  discountRules,
  setDiscountRules,
  section = "all",
}: Props) {
  const showTiers = section === "all" || section === "tiers";
  const showPresentation = section === "all" || section === "presentation";
  const appendDiscountTier = () => {
    setDiscountRules((prev) => {
      const maxCount = prev.reduce(
        (max, rule) => Math.max(max, rule.count),
        1,
      );
      return [...prev, { count: maxCount + 1, discountPercent: 15 }];
    });
  };

  return (
    <div>
      {showTiers ? (
        <>
          <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
            Logic Block: Quantity Rules
          </h3>
          <p className="text-[13px] text-[#5c6166] mb-4 font-normal">
            Define when each quantity tier unlocks and how much discount it gives.
          </p>
        </>
      ) : null}
      {showPresentation ? (
        <>
          <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
            Logic Block: Card Content
          </h3>
          <p className="text-[13px] text-[#5c6166] mb-4 font-normal">
            Titles, subtitles, badges, and default selection control how each tier
            is presented inside the offer card.
          </p>
        </>
      ) : null}
      {discountRules.map((rule, index) => (
        <div className="create-offer-discount-card" key={`${rule.count}-${index}`}>
          <div className="create-offer-discount-body">
            {showTiers ? (
              <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Item quantity
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.count}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value);
                      const nextCount =
                        Number.isFinite(parsedValue) && parsedValue >= 1
                          ? Math.trunc(parsedValue)
                          : 1;
                      setDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, count: nextCount }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Discount (%)
                  <Input
                    size="large"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="mt-1"
                    value={rule.discountPercent}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value);
                      if (parsedValue > 100) return;
                      const nextPercent =
                        Number.isFinite(parsedValue) && parsedValue >= 0
                          ? parsedValue
                          : 0;
                      setDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? {
                                ...currentRule,
                                discountPercent: nextPercent,
                              }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                  {rule.discountPercent > 50 && rule.discountPercent < 90 && (
                    <div className="text-[#faad14] text-[12px] mt-1 font-normal">
                      A discount over 50% may result in losses. Please double-check.
                    </div>
                  )}
                  {rule.discountPercent >= 90 && (
                    <div className="text-[#ff4d4f] text-[12px] mt-1 font-normal">
                      A discount of 90% or more means the product is nearly free.
                    </div>
                  )}
                </label>
              </div>
            ) : null}

            {showPresentation ? (
              <div
                className="create-offer-discount-form-row"
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                }}
              >
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Title
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.title || ""}
                    placeholder="e.g. Duo, Trio"
                    onChange={(e) => {
                      const value = e.target.value;
                      setDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, title: value }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Subtitle
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.subtitle || ""}
                    placeholder="e.g. You save 20%"
                    onChange={(e) => {
                      const value = e.target.value;
                      setDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, subtitle: value }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Badge
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.badge || ""}
                    placeholder="e.g. Most Popular"
                    onChange={(e) => {
                      const value = e.target.value;
                      setDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, badge: value }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
              </div>
            ) : null}

            <div
              className="create-offer-discount-form-row"
              style={{
                marginTop: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {showPresentation ? (
                <Checkbox
                  checked={!!rule.isDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setDiscountRules((prev) =>
                      prev.map((currentRule, currentIndex) => ({
                        ...currentRule,
                        isDefault: checked ? currentIndex === index : false,
                      })),
                    );
                  }}
                >
                  Set as Default Selected
                </Checkbox>
              ) : (
                <div />
              )}
              {showTiers ? (
                <Button
                  danger
                  onClick={() => {
                    setDiscountRules((prev) => {
                      if (prev.length <= 1) return prev;
                      return prev.filter((_, currentIndex) => currentIndex !== index);
                    });
                  }}
                  disabled={discountRules.length <= 1}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ))}
      {showTiers ? (
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [{ key: "discount", label: "Add Discount Tier" }],
            onClick: appendDiscountTier,
          }}
        >
          <Button type="dashed" className="w-full">
            + Add tier
          </Button>
        </Dropdown>
      ) : null}
    </div>
  );
}
