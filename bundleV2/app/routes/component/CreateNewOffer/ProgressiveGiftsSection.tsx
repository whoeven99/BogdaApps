import { Button, Input, Select, Switch, Tabs } from "antd";
import type {
  ProgressiveGift,
  ProgressiveGiftsConfig,
  ProgressiveGiftUnlockMode,
} from "../../../utils/offerParsing";

type DiscountRuleLite = { count: number };
type BxgyRuleLite = { count: number };
type DifferentProductsRuleLite = { count: number; tierType: "bxgy" | "simple" };

type Props = {
  offerType: string;
  normalizedDiscountRules: DiscountRuleLite[];
  bxgyDiscountRules: BxgyRuleLite[];
  differentProductsDiscountRules: DifferentProductsRuleLite[];
  value: ProgressiveGiftsConfig;
  onChange: (next: ProgressiveGiftsConfig) => void;
  showToggle?: boolean;
};

/** 生成「Bar #N」下拉选项，与店面前台档位顺序一致 */
function buildBarOptions(
  offerType: string,
  normalizedDiscountRules: DiscountRuleLite[],
  bxgyDiscountRules: BxgyRuleLite[],
  differentProductsDiscountRules: DifferentProductsRuleLite[],
): { value: number; label: string }[] {
  if (offerType === "bxgy") {
    return bxgyDiscountRules.map((r, i) => ({
      value: i + 1,
      label: `Bar #${i + 1} (count >= ${r.count})`,
    }));
  }
  if (offerType === "quantity-breaks-different") {
    return differentProductsDiscountRules.map((r, i) => ({
      value: i + 1,
      label:
        r.tierType === "bxgy"
          ? `Tier #${i + 1} (BXGY, count >= ${r.count})`
          : `Tier #${i + 1} (simple, count >= ${r.count})`,
    }));
  }
  return [
    { value: 1, label: "Bar #1 (Single, qty 1)" },
    ...normalizedDiscountRules.map((r, i) => ({
      value: i + 2,
      label: `Bar #${i + 2} (qty ${r.count})`,
    })),
  ];
}

function newGiftId(): string {
  return `gift_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}

export function ProgressiveGiftsSection({
  offerType,
  normalizedDiscountRules,
  bxgyDiscountRules,
  differentProductsDiscountRules,
  value,
  onChange,
  showToggle = true,
}: Props) {
  const barOptions = buildBarOptions(
    offerType,
    normalizedDiscountRules,
    bxgyDiscountRules,
    differentProductsDiscountRules,
  );

  const patch = (partial: Partial<ProgressiveGiftsConfig>) => {
    onChange({ ...value, ...partial });
  };

  const patchGift = (id: string, partial: Partial<ProgressiveGift>) => {
    onChange({
      ...value,
      gifts: value.gifts.map((g) => (g.id === id ? { ...g, ...partial } : g)),
    });
  };

  const addGift = () => {
    const defaultBar = barOptions[0]?.value ?? 1;
    onChange({
      ...value,
      gifts: [
        ...value.gifts,
        {
          id: newGiftId(),
          type: "free_shipping",
          title: "Free shipping",
          subtitle: "Unlocked on higher tiers",
          imageUrl: "",
          unlockMode: "tier_index",
          unlockTierIndex: defaultBar,
          unlockAtCount: 2,
          freeShippingMaxRateAmount: null,
        },
      ],
    });
  };

  const removeGift = (id: string) => {
    onChange({ ...value, gifts: value.gifts.filter((g) => g.id !== id) });
  };

  return (
    <div className="mt-8 border border-gray-200 rounded-lg p-4 bg-[#fafbfb]">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-[16px] font-semibold text-[#1c1f23] m-0">Progressive gifts</h3>
          <p className="text-[13px] text-[#5c6166] m-0 mt-1">
            Progressive gifts currently support the "Free shipping" reward. It is
            applied at checkout by the delivery Discount Function. Free shipping
            depends on an active SHIPPING automatic app discount in the store. If
            the theme does not pass line item properties to checkout, the
            Function infers the unlocked tier by product plus line quantity. If
            multiple offers for the same product use progressive gifts at the
            same time, each line should include the offer id.
          </p>
        </div>
        {showToggle ? (
          <Switch
            checked={value.enabled}
            onChange={(checked) => patch({ enabled: checked })}
          />
        ) : null}
      </div>

      {!value.enabled ? (
        <p className="text-[13px] text-[#5c6166]">
          When disabled, the storefront block is hidden and free shipping checks do not apply.
        </p>
      ) : (
        <Tabs
          items={[
            {
              key: "settings",
              label: "Settings",
              children: (
                <div className="flex flex-col gap-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Section title
                      <Input
                        className="mt-1"
                        value={value.title}
                        onChange={(e) => patch({ title: e.target.value })}
                        placeholder="Progressive gifts"
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Subtitle (optional)
                      <Input
                        className="mt-1"
                        value={value.subtitle}
                        onChange={(e) => patch({ subtitle: e.target.value })}
                        placeholder="Unlock rewards as you upgrade your pack"
                      />
                    </label>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-md bg-white">
                      <span className="text-[14px] text-[#1c1f23]">Hide gift cards until unlocked</span>
                      <Switch
                        checked={value.hideGiftsUntilUnlocked}
                        onChange={(c) => patch({ hideGiftsUntilUnlocked: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-md bg-white">
                      <span className="text-[14px] text-[#1c1f23]">Show labels while locked</span>
                      <Switch
                        checked={value.showLabelsForLockedGifts}
                        onChange={(c) => patch({ showLabelsForLockedGifts: c })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-medium text-[#1c1f23]">Gift slots</span>
                      <Button type="dashed" size="small" onClick={addGift}>
                        + Add gift
                      </Button>
                    </div>
                    {value.gifts.length === 0 ? (
                      <p className="text-[13px] text-[#5c6166]">No gifts yet. Click "Add gift" to create one.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {value.gifts.map((gift) => (
                          <div
                            key={gift.id}
                            className="border border-gray-200 rounded-md p-3 bg-white grid grid-cols-1 md:grid-cols-2 gap-3"
                          >
                            <label className="block text-[13px] font-medium text-[#1c1f23]">
                              Type
                              <Select
                                className="mt-1 w-full"
                                value={gift.type}
                                options={[{ value: "free_shipping", label: "Free shipping" }]}
                                onChange={(v) => patchGift(gift.id, { type: v as ProgressiveGift["type"] })}
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23]">
                              Display title
                              <Input
                                className="mt-1"
                                value={gift.title}
                                onChange={(e) => patchGift(gift.id, { title: e.target.value })}
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23] md:col-span-2">
                              Subtitle
                              <Input
                                className="mt-1"
                                value={gift.subtitle}
                                onChange={(e) => patchGift(gift.id, { subtitle: e.target.value })}
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23] md:col-span-2">
                              Image URL (optional)
                              <Input
                                className="mt-1"
                                value={gift.imageUrl}
                                onChange={(e) => patchGift(gift.id, { imageUrl: e.target.value })}
                                placeholder="https://..."
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23]">
                              Unlock mode
                              <Select
                                className="mt-1 w-full"
                                value={gift.unlockMode}
                                options={[
                                  { value: "tier_index", label: "By bar tier (tier_index)" },
                                  { value: "at_count", label: "By cart quantity (at_count)" },
                                ]}
                                onChange={(v) =>
                                  patchGift(gift.id, { unlockMode: v as ProgressiveGiftUnlockMode })
                                }
                              />
                            </label>
                            {gift.unlockMode === "tier_index" ? (
                              <label className="block text-[13px] font-medium text-[#1c1f23]">
                                Unlock from bar
                                <Select
                                  className="mt-1 w-full"
                                  value={gift.unlockTierIndex}
                                  options={barOptions}
                                  onChange={(v) => patchGift(gift.id, { unlockTierIndex: Number(v) })}
                                />
                              </label>
                            ) : (
                              <label className="block text-[13px] font-medium text-[#1c1f23]">
                            Required quantity to unlock
                                <Input
                                  type="number"
                                  min={1}
                                  className="mt-1"
                                  value={gift.unlockAtCount}
                                  onChange={(e) => {
                                    const n = Math.max(1, Math.trunc(Number(e.target.value) || 1));
                                    patchGift(gift.id, { unlockAtCount: n });
                                  }}
                                />
                              </label>
                            )}
                            <label className="block text-[13px] font-medium text-[#1c1f23] md:col-span-2">
                              Max shipping rate covered by free shipping (optional, blank = no limit)
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="mt-1"
                                placeholder="e.g. 9.99 - only shipping rates priced at or below this amount get a 100% discount"
                                value={
                                  gift.freeShippingMaxRateAmount == null
                                    ? ""
                                    : String(gift.freeShippingMaxRateAmount)
                                }
                                onChange={(e) => {
                                  const raw = e.target.value.trim();
                                  if (!raw) {
                                    patchGift(gift.id, { freeShippingMaxRateAmount: null });
                                    return;
                                  }
                                  const n = Number(raw);
                                  if (!Number.isFinite(n) || n < 0) return;
                                    patchGift(gift.id, { freeShippingMaxRateAmount: n });
                                }}
                              />
                              <span className="text-[12px] text-[#5c6166] block mt-1">
                                Compared against the checkout shipping rate amount. Rates above this threshold do not qualify for free shipping.
                              </span>
                            </label>
                            <div className="md:col-span-2 flex justify-end">
                              <Button danger type="link" size="small" onClick={() => removeGift(gift.id)}>
                                Remove gift
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ),
            },
            {
              key: "style",
              label: "Style",
              children: (
                <div className="flex flex-col gap-3 pt-2 max-w-md">
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Gift area layout
                    <Select
                      className="mt-1 w-full"
                      value={value.layout}
                      options={[
                        { value: "vertical", label: "Vertical" },
                        { value: "horizontal", label: "Horizontal" },
                        { value: "card", label: "Card" },
                        { value: "compact", label: "Compact" },
                      ]}
                      onChange={(v) =>
                        patch({ layout: v as ProgressiveGiftsConfig["layout"] })
                      }
                    />
                  </label>
                  <p className="text-[12px] text-[#5c6166]">
                    Uses the same CSS class set as the main bundle card for consistent storefront styling.
                  </p>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
