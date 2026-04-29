import { Button, Checkbox, Dropdown, Input } from "antd";
import type { FreeGiftRule } from "../../../utils/offerParsing";

type Props = {
  triggerProductsCount: number;
  giftProductsCount: number;
  onSelectTriggerProducts: () => void | Promise<void>;
  onSelectGiftProducts: () => void | Promise<void>;
  freeGiftRules: FreeGiftRule[];
  setFreeGiftRules: React.Dispatch<React.SetStateAction<FreeGiftRule[]>>;
};

export default function FreeGiftLogicEditor({
  triggerProductsCount,
  giftProductsCount,
  onSelectTriggerProducts,
  onSelectGiftProducts,
  freeGiftRules,
  setFreeGiftRules,
}: Props) {
  const appendFreeGiftTier = () => {
    setFreeGiftRules((prev) => {
      const maxCount = prev.reduce(
        (max, rule) => Math.max(max, rule.count),
        1,
      );
      return [
        ...prev,
        {
          count: maxCount + 1,
          giftQuantity: 1,
          title: "",
          subtitle: "",
          badge: "",
          isDefault: false,
        },
      ];
    });
  };

  return (
    <>
      <div className="mb-6">
        <div className="create-offer-panel create-offer-panel--muted">
          <div className="create-offer-panel__header">
            <div>
              <div className="create-offer-panel__eyebrow">Free Gift Setup</div>
              <h3 className="create-offer-panel__title">Trigger Products</h3>
            </div>
            {triggerProductsCount > 0 ? (
              <div className="create-offer-kpi-badge">{triggerProductsCount} selected</div>
            ) : null}
          </div>
          {triggerProductsCount === 0 ? (
            <Button
              size="large"
              className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
              onClick={(e) => {
                void onSelectTriggerProducts();
                e.preventDefault();
              }}
            >
              Select trigger products
            </Button>
          ) : (
            <div className="create-offer-panel__footer">
              <Button
                size="small"
                onClick={(e) => {
                  void onSelectTriggerProducts();
                  e.preventDefault();
                }}
              >
                Edit trigger products
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="create-offer-panel create-offer-panel--muted">
          <div className="create-offer-panel__header">
            <div>
              <div className="create-offer-panel__eyebrow">Free Gift Setup</div>
              <h3 className="create-offer-panel__title">Gift Products</h3>
            </div>
            {giftProductsCount > 0 ? (
              <div className="create-offer-kpi-badge">{giftProductsCount} selected</div>
            ) : null}
          </div>
          {giftProductsCount === 0 ? (
            <Button
              size="large"
              className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
              onClick={(e) => {
                void onSelectGiftProducts();
                e.preventDefault();
              }}
            >
              Select gift products
            </Button>
          ) : (
            <div className="create-offer-panel__footer">
              <Button
                size="small"
                onClick={(e) => {
                  void onSelectGiftProducts();
                  e.preventDefault();
                }}
              >
                Edit gift products
              </Button>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-[14px] font-medium text-[#1c1f23]">
          Logic Block: Offer Rules
        </h3>
        <p className="mb-4 text-[13px] font-normal text-[#5c6166]">
          Free gift rules use a fixed discount type. Configure the trigger
          threshold and how many gift items unlock for each rule.
        </p>
        {freeGiftRules.map((rule, index) => (
          <div className="create-offer-discount-card" key={index}>
            <div className="create-offer-discount-body">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[14px] font-semibold text-[#1c1f23]">
                  Rule {index + 1}
                </div>
                <Button
                  danger
                  size="small"
                  onClick={() => {
                    setFreeGiftRules((prev) => {
                      if (prev.length <= 1) return prev;
                      return prev.filter((_, currentIndex) => currentIndex !== index);
                    });
                  }}
                  disabled={freeGiftRules.length <= 1}
                >
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3">
                  <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                    Discount Type
                  </div>
                  <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                    Free Gift
                  </div>
                  <div className="mt-1 text-[12px] text-[#5c6166]">
                    Unlocks gift items from the selected reward products.
                  </div>
                </div>

                <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3">
                  <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                    Condition Type
                  </div>
                  <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                    Quantity threshold
                  </div>
                  <div className="mt-1 text-[12px] text-[#5c6166]">
                    The customer must reach the trigger quantity to unlock the gift.
                  </div>
                </div>

                <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3">
                  <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                    Reward Summary
                  </div>
                  <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                    Gift quantity from reward scope
                  </div>
                  <div className="mt-1 text-[12px] text-[#5c6166]">
                    Gift products are selected in the module above.
                  </div>
                </div>
              </div>

              <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Activation Quantity
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
                      setFreeGiftRules((prev) =>
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
                  Gift Quantity
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.giftQuantity}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value);
                      const nextQty =
                        Number.isFinite(parsedValue) && parsedValue >= 1
                          ? Math.trunc(parsedValue)
                          : 1;
                      setFreeGiftRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, giftQuantity: nextQty }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="create-offer-inline-grid-3">
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Title
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.title || ""}
                    placeholder="e.g. Free sample"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFreeGiftRules((prev) =>
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
                    placeholder="e.g. Buy 2 and unlock a free gift"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFreeGiftRules((prev) =>
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
                    placeholder="e.g. Gift included"
                    onChange={(e) => {
                      const value = e.target.value;
                      setFreeGiftRules((prev) =>
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

              <div className="create-offer-inline-row">
                <Checkbox
                  checked={!!rule.isDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFreeGiftRules((prev) =>
                      prev.map((currentRule, currentIndex) => ({
                        ...currentRule,
                        isDefault: checked ? currentIndex === index : false,
                      })),
                    );
                  }}
                >
                  Set as Default Selected
                </Checkbox>
              </div>
            </div>
          </div>
        ))}
        <Dropdown
          trigger={["click"]}
          menu={{
            items: [{ key: "free-gift", label: "Add Free Gift Rule" }],
            onClick: appendFreeGiftTier,
          }}
        >
          <Button type="dashed" className="w-full">
            + Add rule
          </Button>
        </Dropdown>
      </div>
    </>
  );
}
