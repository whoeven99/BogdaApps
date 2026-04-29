import { Button, Checkbox, Dropdown, Input, Select } from "antd";
import type { BxgyDiscountRule } from "../../../utils/offerParsing";
import {
  OfferRuleAddPanel,
  OfferRuleCard,
  OfferRuleFooterRow,
  OfferRuleFormGrid,
  OfferRuleNotice,
  OfferRuleSummaryBox,
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
  getProductsCount: number;
  onSelectBuyProducts: () => void | Promise<void>;
  onSelectGetProducts: () => void | Promise<void>;
  bxgyDiscountRules: BxgyDiscountRule[];
  setBxgyDiscountRules: React.Dispatch<React.SetStateAction<BxgyDiscountRule[]>>;
  section?: "buy-products" | "get-products" | "rules" | "all";
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

export default function BxgyLogicEditor({
  buyProductsCount,
  getProductsCount,
  onSelectBuyProducts,
  onSelectGetProducts,
  bxgyDiscountRules,
  setBxgyDiscountRules,
  section = "all",
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const { discountTypeOptions, addMenuItems } = getBxgyRuleCapability();
  const conditionTypeOptions = [{ label: "Buy X, Get Y", value: "buy_x_get_y" }];
  const showBuyProducts = section === "all" || section === "buy-products";
  const showGetProducts = section === "all" || section === "get-products";
  const showRules = section === "all" || section === "rules";
  const appendBxgyTier = () => {
    setBxgyDiscountRules((prev) => {
      const maxCount = prev.reduce(
        (max, rule) => Math.max(max, rule.count),
        1,
      );
      return [
        ...prev,
        {
          count: maxCount + 1,
          buyQuantity: 2,
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
          <div className="create-offer-panel create-offer-panel--muted">
            <div className="create-offer-panel__header">
              <div>
                <div className="create-offer-panel__eyebrow">Scope</div>
                <h3 className="create-offer-panel__title">Buy Products (X)</h3>
              </div>
              {buyProductsCount > 0 ? (
                <div className="create-offer-kpi-badge">{buyProductsCount} selected</div>
              ) : null}
            </div>
            {buyProductsCount === 0 ? (
              <Button
                size="large"
                className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
                onClick={(e) => {
                  void onSelectBuyProducts();
                  e.preventDefault();
                }}
              >
                Select buy products
              </Button>
            ) : (
              <div className="create-offer-panel__footer">
                <Button
                  size="small"
                  onClick={(e) => {
                    void onSelectBuyProducts();
                    e.preventDefault();
                  }}
                >
                  Edit buy products
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showGetProducts ? (
        <div className="mb-8">
          <div className="create-offer-panel create-offer-panel--muted">
            <div className="create-offer-panel__header">
              <div>
                <div className="create-offer-panel__eyebrow">Scope</div>
                <h3 className="create-offer-panel__title">Get Products (Y)</h3>
              </div>
              {getProductsCount > 0 ? (
                <div className="create-offer-kpi-badge">{getProductsCount} selected</div>
              ) : null}
            </div>
            {getProductsCount === 0 ? (
              <Button
                size="large"
                className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
                onClick={(e) => {
                  void onSelectGetProducts();
                  e.preventDefault();
                }}
              >
                Select get products
              </Button>
            ) : (
              <div className="create-offer-panel__footer">
                <Button
                  size="small"
                  onClick={(e) => {
                    void onSelectGetProducts();
                    e.preventDefault();
                  }}
                >
                  Edit get products
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {showRules ? (
        <OfferRulesSection description="BXGY rules use a fixed discount type. Configure the buy condition, the reward quantity, and the reward discount per rule.">
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
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
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

                  <OfferRuleSummaryBox
                    label="Reward Summary"
                    value="Percentage discount on Y products"
                    description="Set the reward percentage below. `100%` means the reward products are free."
                  />
                </div>

                <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Trigger Quantity
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
                        if (updateRuleValues) {
                          updateRuleValues(ruleId, { count: nextCount });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
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
                          updateRuleValues(ruleId, { buyQuantity: nextCount });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === index
                              ? { ...currentRule, buyQuantity: nextCount }
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
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Reward Discount (%)
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
                        if (updateRuleValues) {
                          updateRuleValues(ruleId, { discountPercent: nextPercent });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === index
                              ? { ...currentRule, discountPercent: nextPercent }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                    {rule.discountPercent === 100 && (
                      <div className="text-[#52c41a] text-[12px] mt-1 font-normal">
                        Y products will be FREE
                      </div>
                    )}
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
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Max Uses Per Order
                    <Input
                      size="large"
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      value={rule.maxUsesPerOrder}
                      onChange={(e) => {
                        const parsedValue = Number(e.target.value);
                        const nextMax =
                          Number.isFinite(parsedValue) && parsedValue >= 1
                            ? Math.trunc(parsedValue)
                            : 1;
                        if (updateRuleValues) {
                          updateRuleValues(ruleId, { maxUsesPerOrder: nextMax });
                          return;
                        }
                        setBxgyDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === index
                              ? { ...currentRule, maxUsesPerOrder: nextMax }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                  </label>
                  <OfferRuleNotice>
                    Buy scope and reward scope are managed in the modules above,
                    so each BXGY rule here only controls the unlock math and
                    reward intensity.
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
