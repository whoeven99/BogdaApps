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
  embedded?: boolean;
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
  embedded = false,
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

  const sectionMeta = [
    value.gifts.length ? `${value.gifts.length} gift slots` : "No gifts yet",
    value.enabled ? "Enabled" : "Disabled",
  ].join(" • ");

  return (
    <div className={embedded ? "space-y-4" : "mt-8 space-y-4 rounded-[12px] border border-[#e3e8ed] bg-white p-4"}>
      {!embedded ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">Progressive gifts</h3>
            <div className="mt-1 text-[12px] text-[#5c6166]">{sectionMeta}</div>
          </div>
          {showToggle ? (
            <Switch
              checked={value.enabled}
              onChange={(checked) => patch({ enabled: checked })}
            />
          ) : null}
        </div>
      ) : null}

      {!value.enabled ? (
        <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-4 text-[13px] text-[#5c6166]">
          Progressive gifts stay hidden until this component is enabled.
        </div>
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
                    <div className="flex items-center justify-between rounded-[10px] bg-[#f6f8f9] px-4 py-3">
                      <span className="text-[14px] text-[#1c1f23]">Hide gift cards until unlocked</span>
                      <Switch
                        checked={value.hideGiftsUntilUnlocked}
                        onChange={(c) => patch({ hideGiftsUntilUnlocked: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-[10px] bg-[#f6f8f9] px-4 py-3">
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
                      <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-4 text-[13px] text-[#5c6166]">
                        No gifts yet. Add one to configure a progressive reward.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {value.gifts.map((gift) => (
                          <div
                            key={gift.id}
                            className="grid grid-cols-1 gap-3 rounded-[12px] border border-[#e3e8ed] bg-white p-4 md:grid-cols-2"
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
                <div className="flex max-w-md flex-col gap-3 pt-2">
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
                  <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
                    Uses the same storefront styling system as the main bundle card.
                  </div>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
