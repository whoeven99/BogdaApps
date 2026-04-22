import { Button, Input, Select, Switch, Tabs } from "antd";
import type {
  ProgressiveGift,
  ProgressiveGiftsConfig,
  ProgressiveGiftUnlockMode,
} from "../../../utils/offerParsing";

type DiscountRuleLite = { count: number };
type BxgyRuleLite = { count: number };

type Props = {
  offerType: string;
  normalizedDiscountRules: DiscountRuleLite[];
  bxgyDiscountRules: BxgyRuleLite[];
  value: ProgressiveGiftsConfig;
  onChange: (next: ProgressiveGiftsConfig) => void;
};

/** 生成「Bar #N」下拉选项，与店面前台档位顺序一致 */
function buildBarOptions(
  offerType: string,
  normalizedDiscountRules: DiscountRuleLite[],
  bxgyDiscountRules: BxgyRuleLite[],
): { value: number; label: string }[] {
  if (offerType === "bxgy") {
    return bxgyDiscountRules.map((r, i) => ({
      value: i + 1,
      label: `Bar #${i + 1}（count ≥ ${r.count}）`,
    }));
  }
  return [
    { value: 1, label: "Bar #1（Single，数量 1）" },
    ...normalizedDiscountRules.map((r, i) => ({
      value: i + 2,
      label: `Bar #${i + 2}（数量 ${r.count}）`,
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
  value,
  onChange,
}: Props) {
  const barOptions = buildBarOptions(offerType, normalizedDiscountRules, bxgyDiscountRules);

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
            阶梯赠品：当前支持「免邮 / Free shipping」奖励；结账时由配送类 Discount Function 生效。
          </p>
        </div>
        <Switch checked={value.enabled} onChange={(checked) => patch({ enabled: checked })} />
      </div>

      {!value.enabled ? (
        <p className="text-[13px] text-[#5c6166]">关闭时不会展示前台区域，也不会参与免邮判定。</p>
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
                      区域标题
                      <Input
                        className="mt-1"
                        value={value.title}
                        onChange={(e) => patch({ title: e.target.value })}
                        placeholder="Progressive gifts"
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      副标题（可选）
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
                      <span className="text-[14px] text-[#1c1f23]">未解锁前隐藏赠品卡片</span>
                      <Switch
                        checked={value.hideGiftsUntilUnlocked}
                        onChange={(c) => patch({ hideGiftsUntilUnlocked: c })}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 border border-gray-100 rounded-md bg-white">
                      <span className="text-[14px] text-[#1c1f23]">锁定状态仍显示标签</span>
                      <Switch
                        checked={value.showLabelsForLockedGifts}
                        onChange={(c) => patch({ showLabelsForLockedGifts: c })}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-medium text-[#1c1f23]">赠品槽位</span>
                      <Button type="dashed" size="small" onClick={addGift}>
                        + 添加赠品
                      </Button>
                    </div>
                    {value.gifts.length === 0 ? (
                      <p className="text-[13px] text-[#5c6166]">暂无赠品，请点击「添加赠品」。</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {value.gifts.map((gift) => (
                          <div
                            key={gift.id}
                            className="border border-gray-200 rounded-md p-3 bg-white grid grid-cols-1 md:grid-cols-2 gap-3"
                          >
                            <label className="block text-[13px] font-medium text-[#1c1f23]">
                              类型
                              <Select
                                className="mt-1 w-full"
                                value={gift.type}
                                options={[{ value: "free_shipping", label: "Free shipping（免邮）" }]}
                                onChange={(v) => patchGift(gift.id, { type: v as ProgressiveGift["type"] })}
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23]">
                              展示标题
                              <Input
                                className="mt-1"
                                value={gift.title}
                                onChange={(e) => patchGift(gift.id, { title: e.target.value })}
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23] md:col-span-2">
                              副文案
                              <Input
                                className="mt-1"
                                value={gift.subtitle}
                                onChange={(e) => patchGift(gift.id, { subtitle: e.target.value })}
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23] md:col-span-2">
                              图片 URL（可选）
                              <Input
                                className="mt-1"
                                value={gift.imageUrl}
                                onChange={(e) => patchGift(gift.id, { imageUrl: e.target.value })}
                                placeholder="https://..."
                              />
                            </label>
                            <label className="block text-[13px] font-medium text-[#1c1f23]">
                              解锁方式
                              <Select
                                className="mt-1 w-full"
                                value={gift.unlockMode}
                                options={[
                                  { value: "tier_index", label: "按 Bar 档位（tier_index）" },
                                  { value: "at_count", label: "按购物车数量（at_count）" },
                                ]}
                                onChange={(v) =>
                                  patchGift(gift.id, { unlockMode: v as ProgressiveGiftUnlockMode })
                                }
                              />
                            </label>
                            {gift.unlockMode === "tier_index" ? (
                              <label className="block text-[13px] font-medium text-[#1c1f23]">
                                解锁起始 Bar
                                <Select
                                  className="mt-1 w-full"
                                  value={gift.unlockTierIndex}
                                  options={barOptions}
                                  onChange={(v) => patchGift(gift.id, { unlockTierIndex: Number(v) })}
                                />
                              </label>
                            ) : (
                              <label className="block text-[13px] font-medium text-[#1c1f23]">
                                解锁所需数量
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
                              免邮最高可覆盖运费（可选，留空=不限制）
                              <Input
                                type="number"
                                min={0}
                                step={0.01}
                                className="mt-1"
                                placeholder="例如 9.99 — 仅对标价 ≤ 此金额的配送方式给 100% 折扣"
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
                                说明：与结账页配送选项的标价（amount）比较；超过阈值的配送方式不参与免邮。
                              </span>
                            </label>
                            <div className="md:col-span-2 flex justify-end">
                              <Button danger type="link" size="small" onClick={() => removeGift(gift.id)}>
                                删除该赠品
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
                    赠品区布局
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
                    与主 Bundle 卡片使用同一套 CSS 类名，便于主题侧风格统一。
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
