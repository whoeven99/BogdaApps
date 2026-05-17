import { Button, Checkbox, Dropdown, Input, Select } from "antd";
import {
  buildDraftRuleId,
  type BxgyDiscountRule,
} from "../../../utils/offerParsing";
import {
  OfferRuleAddPanel,
  OfferRuleCard,
  OfferRuleFooterRow,
  OfferRuleFormGrid,
  OfferRuleNotice,
  OfferRulesSection,
} from "./OfferRulesShared";
import type { RulePresentationPatch } from "./unifiedRulePresentation";
import {
  getBxgyUnifiedRuleId,
  type UnifiedRuleValuePatch,
} from "./unifiedRuleValues";
import { getBxgyRuleCapability } from "./ruleCapabilityRegistry";

type Props = {
  buyProductsCount: number;
  onSelectBuyProducts: () => void | Promise<void>;
  bxgyDiscountRules: BxgyDiscountRule[];
  setBxgyDiscountRules: React.Dispatch<React.SetStateAction<BxgyDiscountRule[]>>;
  section?: "buy-products" | "rules" | "all";
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

export default function BxgyLogicEditor({
  buyProductsCount,
  onSelectBuyProducts,
  bxgyDiscountRules,
  setBxgyDiscountRules,
  section = "all",
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const { discountTypeOptions, addMenuItems } = getBxgyRuleCapability();
  const conditionTypeOptions = [{ label: "Buy X, Get Y", value: "buy_x_get_y" }];
  const showBuyProducts = section === "all" || section === "buy-products";
  const showRules = section === "all" || section === "rules";
  const ruleEntries = bxgyDiscountRules.map((rule, index) => ({ rule, actualIndex: index }));
  const appendBxgyTier = () => {
    setBxgyDiscountRules((prev) => {
      const maxBuyQuantity = prev.reduce(
        (max, rule) => Math.max(max, rule.buyQuantity || rule.count),
        1,
      );
      const nextBuyQuantity = maxBuyQuantity + 1;
      return [
        ...prev,
        {
          id: buildDraftRuleId("bxgy_rule"),
          count: nextBuyQuantity,
          buyQuantity: nextBuyQuantity,
          getQuantity: 1,
          buyProductIds: [],
          getProductIds: [],
          discountPercent: 100,
          maxUsesPerOrder: 1,
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
      {showBuyProducts ? (
        <div className="mb-6">
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[14px] font-medium text-[#1c1f23]">Buy Products (X)</div>
                <div className="mt-1 text-[12px] text-[#5c6166]">
                  {buyProductsCount} selected
                </div>
              </div>
              <Button
                size="middle"
                onClick={(e) => {
                  void onSelectBuyProducts();
                  e.preventDefault();
                }}
              >
                {buyProductsCount === 0 ? "Select buy products" : "Edit buy products"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showRules ? (
        <OfferRulesSection>
          {ruleEntries.map(({ rule, actualIndex }, index) => (
            <OfferRuleCard
              key={actualIndex}
              index={index}
              disableRemove={ruleEntries.length <= 1}
              onRemove={() => {
                setBxgyDiscountRules((prev) => {
                  if (ruleEntries.length <= 1) return prev;
                  return prev.filter((_, currentIndex) => currentIndex !== actualIndex);
                });
              }}
            >
                {(() => {
                  const ruleId = getBxgyUnifiedRuleId(rule, actualIndex);
                  return (
                    <>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Discount Type
                    <Select
                      size="large"
                      className="mt-1 w-full"
                      value="bxgy"
                      options={discountTypeOptions}
                      disabled
                    />
                  </label>

                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Condition Type
                    <Select
                      size="large"
                      className="mt-1 w-full"
                      value="buy_x_get_y"
                      options={conditionTypeOptions}
                      disabled
                    />
                  </label>
                </div>

                <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Buy Quantity (X)
                    <Input
                      size="large"
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      value={rule.buyQuantity}
                      onChange={(e) => {
                        const parsedValue = Number(e.target.value);
                        const nextCount =
                          Number.isFinite(parsedValue) && parsedValue >= 1
                            ? Math.trunc(parsedValue)
                            : 1;
                        if (updateRuleValues) {
                          updateRuleValues(ruleId, {
                            buyQuantity: nextCount,
                            count: nextCount,
                          });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === actualIndex
                              ? {
                                  ...currentRule,
                                  buyQuantity: nextCount,
                                  count: nextCount,
                                }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                  </label>
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Get Quantity (Y)
                    <Input
                      size="large"
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      value={rule.getQuantity}
                      onChange={(e) => {
                        const parsedValue = Number(e.target.value);
                        const nextCount =
                          Number.isFinite(parsedValue) && parsedValue >= 1
                            ? Math.trunc(parsedValue)
                            : 1;
                        if (updateRuleValues) {
                          updateRuleValues(ruleId, { getQuantity: nextCount });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === actualIndex
                              ? { ...currentRule, getQuantity: nextCount }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                  </label>
                </div>

                <OfferRuleFormGrid columns={3}>
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Title
                    <Input
                      size="large"
                      className="mt-1"
                      value={rule.title || ""}
                      placeholder="e.g. Duo, Trio"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { title: value });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === actualIndex
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
                      placeholder="e.g. Buy 3, get 5 total"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { subtitle: value });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === actualIndex
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
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { badge: value });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === actualIndex
                              ? { ...currentRule, badge: value }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                  </label>
                </OfferRuleFormGrid>

                <OfferRuleFormGrid columns={2}>
                  <OfferRuleNotice title="Scope source" intent="info">
                    BXGY applies within the selected buy products, so each rule
                    here only controls the buy quantity and target quantity.
                  </OfferRuleNotice>
                  <OfferRuleNotice title="Reward behavior" intent="success">
                    If Y is larger than X, the bar is treated as pay X for Y
                    total items. Otherwise it keeps the legacy free-item model.
                  </OfferRuleNotice>
                </OfferRuleFormGrid>

                <OfferRuleFooterRow>
                  <Checkbox
                    checked={!!rule.isDefault}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { isDefault: checked });
                        return;
                      }
                      setBxgyDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) => ({
                          ...currentRule,
                          isDefault: checked ? currentIndex === actualIndex : false,
                        })),
                      );
                    }}
                  >
                    Set as Default Selected
                  </Checkbox>
                </OfferRuleFooterRow>
                    </>
                  );
                })()}
            </OfferRuleCard>
          ))}
          <OfferRuleAddPanel>
            <Dropdown
              trigger={["click"]}
              menu={{
                items: addMenuItems,
                onClick: appendBxgyTier,
              }}
            >
              <Button type="dashed">+ Add rule</Button>
            </Dropdown>
          </OfferRuleAddPanel>
        </OfferRulesSection>
      ) : null}
    </>
  );
}
