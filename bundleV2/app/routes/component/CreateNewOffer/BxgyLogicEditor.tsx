import { Button, Checkbox, Dropdown, Input, Select } from "antd";
import type { BxgyDiscountRule } from "../../../utils/offerParsing";
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
  const conditionTypeOptions = [{ label: "Buy X, Get Y Free", value: "buy_x_get_y" }];
  const showBuyProducts = section === "all" || section === "buy-products";
  const showRules = section === "all" || section === "rules";
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
        <OfferRulesSection description="BXGY rules use a fixed same-product free-item model. Configure the buy quantity, free quantity, and labels for each rule.">
          {bxgyDiscountRules.map((rule, index) => (
            <OfferRuleCard
              key={index}
              index={index}
              disableRemove={bxgyDiscountRules.length <= 1}
              onRemove={() => {
                setBxgyDiscountRules((prev) => {
                  if (prev.length <= 1) return prev;
                  return prev.filter((_, currentIndex) => currentIndex !== index);
                });
              }}
            >
                {(() => {
                  const ruleId = getBxgyUnifiedRuleId(index);
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
                            currentIndex === index
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
                            currentIndex === index
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
                      placeholder="e.g. Buy 2, get 1 free"
                      onChange={(e) => {
                        const value = e.target.value;
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { subtitle: value });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
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
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { badge: value });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === index
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
                    here only controls the buy quantity and free quantity.
                  </OfferRuleNotice>
                  <OfferRuleNotice title="Reward behavior" intent="success">
                    BXGY rewards use the same product and discount the cheapest
                    eligible variant once per order.
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
                          isDefault: checked ? currentIndex === index : false,
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
          <OfferRuleAddPanel description="BXGY offers use a fixed rule type, so each new rule adds another unlock tier.">
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
