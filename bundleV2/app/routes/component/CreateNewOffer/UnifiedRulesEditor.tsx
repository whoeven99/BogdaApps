import { Button, Dropdown, Input, Select } from "antd";
import type { DraftSelectedProduct } from "./campaignDraft";
import type { DiscountRule } from "../../../utils/offerParsing";
import {
  applyDiscountType,
  CONDITION_TYPE_OPTIONS,
  createRuleFromTemplate,
  getDiscountTypeFromRule,
  getUnifiedRuleIssues,
  syncRuleDependencies,
} from "./unifiedRuleModel";
import {
  getUnifiedDiscountRuleId,
  type UnifiedRuleValuePatch,
} from "./unifiedRuleValues";
import {
  OfferRuleAddPanel,
  OfferRuleCard,
} from "./OfferRulesShared";
import {
  getUnifiedRuleCapability,
  type UnifiedRuleTemplateId,
} from "./ruleCapabilityRegistry";

type Props = {
  rules: DiscountRule[];
  setRules: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  selectedProductsData: DraftSelectedProduct[];
  offerType?: string;
};

export default function UnifiedRulesEditor({
  rules,
  setRules,
  updateRuleValues,
  selectedProductsData,
  offerType,
}: Props) {
  const issues = getUnifiedRuleIssues(rules);
  const productOptions = selectedProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));
  const { discountTypeOptions, addMenuItems } = getUnifiedRuleCapability(offerType);

  const updateRule = (index: number, patch: Partial<DiscountRule>) => {
    const ruleId = getUnifiedDiscountRuleId(rules[index], index);
    if (updateRuleValues) {
      updateRuleValues(ruleId, patch as any);
      return;
    }
    setRules((prev) =>
      prev.map((rule, ruleIndex) =>
        ruleIndex === index
          ? syncRuleDependencies({ ...rule, ...patch })
          : syncRuleDependencies(rule),
      ),
    );
  };

  const appendRule = (template: UnifiedRuleTemplateId) => {
    setRules((prev) => [...prev.map(syncRuleDependencies), createRuleFromTemplate(template)]);
  };

  return (
    <div>
      {issues.length > 0 ? (
        <div className="mb-4 space-y-2">
          {issues.map((issue, index) => (
            <div
              key={`${issue.ruleIndex ?? "global"}-${index}`}
              className={`rounded-[10px] border px-3 py-2 text-[12px] ${
                issue.severity === "error"
                  ? "border-[#ffd6d2] bg-[#fff1f0] text-[#b42318]"
                  : "border-[#ffe58f] bg-[#fffbe6] text-[#ad6800]"
              }`}
            >
              {issue.ruleIndex !== undefined ? `Rule ${issue.ruleIndex + 1}: ` : ""}
              {issue.message}
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        {rules.map((rule, index) => {
          const discountType = getDiscountTypeFromRule(rule);
          const usesBxgy = discountType === "bxgy";
          const usesCartAmount = !usesBxgy && rule.conditionType === "cart_amount";
          const usesGiftReward = rule.rewardType === "gift_product";
          const usesShippingReward = rule.rewardType === "free_shipping";
          const usesPercentageReward = rule.rewardType === "percentage_off";
          const usesQuantityBreak = discountType === "quantity_break";
          const usesOrderDiscount = discountType === "order_discount";

          return (
            <OfferRuleCard
              key={rule.id || `rule-${index}`}
              index={index}
              disableRemove={rules.length <= 1}
              onRemove={() =>
                setRules((prev) => prev.filter((_, ruleIndex) => ruleIndex !== index))
              }
            >
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Discount Type
                  <Select
                    size="large"
                    className="mt-1 w-full"
                    value={discountType}
                    options={discountTypeOptions}
                    onChange={(value) => updateRule(index, applyDiscountType(rule, value))}
                  />
                </label>

                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Condition Type
                  <Select
                    size="large"
                    className="mt-1 w-full"
                    value={usesBxgy ? "buy_x_get_y" : rule.conditionType || "item_quantity"}
                    options={
                      usesBxgy
                        ? [{ label: "Buy X, Get Y", value: "buy_x_get_y" }]
                        : CONDITION_TYPE_OPTIONS
                    }
                    disabled={usesBxgy}
                    onChange={(value) => {
                      if (usesBxgy) return;
                      updateRule(index, {
                        conditionType: value as "item_quantity" | "cart_amount",
                      });
                    }}
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  {usesCartAmount
                    ? "Cart Amount Threshold"
                    : usesBxgy
                      ? "Trigger Quantity"
                      : "Item Quantity"}
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={usesCartAmount ? rule.amountThreshold || 0 : rule.count}
                    onChange={(e) => {
                      const value = Math.max(1, Number(e.target.value) || 0);
                      updateRule(
                        index,
                        usesCartAmount
                          ? { amountThreshold: value }
                          : { count: Math.trunc(value) },
                      );
                    }}
                  />
                </label>

                {usesPercentageReward ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    {usesOrderDiscount
                      ? "Order Discount (%)"
                      : usesBxgy
                        ? "Reward Discount (%)"
                        : usesQuantityBreak
                          ? "Discount (%)"
                          : "Discount (%)"}
                    <Input
                      size="large"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      className="mt-1"
                      value={rule.discountPercent}
                      onChange={(e) =>
                        updateRule(index, {
                          discountPercent: Math.max(
                            0,
                            Math.min(100, Number(e.target.value) || 0),
                          ),
                        })
                      }
                    />
                  </label>
                ) : null}

                {usesBxgy ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Buy Quantity (X)
                    <Input
                      size="large"
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      value={rule.buyQuantity || 2}
                      onChange={(e) =>
                        updateRule(index, {
                          buyQuantity: Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1),
                          ),
                        })
                      }
                    />
                  </label>
                ) : null}

                {usesBxgy ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Get Quantity (Y)
                    <Input
                      size="large"
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      value={rule.getQuantity || 1}
                      onChange={(e) =>
                        updateRule(index, {
                          getQuantity: Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1),
                          ),
                        })
                      }
                    />
                  </label>
                ) : null}

                {usesBxgy ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Max Uses Per Order
                    <Input
                      size="large"
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      value={rule.maxUsesPerOrder || 1}
                      onChange={(e) =>
                        updateRule(index, {
                          maxUsesPerOrder: Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1),
                          ),
                        })
                      }
                    />
                  </label>
                ) : null}

                {usesGiftReward ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Gift Quantity
                    <Input
                      size="large"
                      type="number"
                      min={1}
                      step={1}
                      className="mt-1"
                      value={rule.giftQuantity || 1}
                      onChange={(e) =>
                        updateRule(index, {
                          giftQuantity: Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1),
                          ),
                        })
                      }
                    />
                  </label>
                ) : null}

                {usesShippingReward || usesBxgy ? (
                  <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[13px] text-[#5c6166]">
                    {usesShippingReward
                      ? "Free shipping rules map to the delivery discount function target."
                      : "BXGY in this unified editor reuses the same product scope on both the buy and get sides for now."}
                  </div>
                ) : null}
              </div>

              {usesGiftReward ? (
                <div className="mt-4">
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Reward Products
                    <Select
                      mode="multiple"
                      size="large"
                      className="mt-1 w-full"
                      value={rule.rewardProductIds || []}
                      options={productOptions}
                      onChange={(values) => updateRule(index, { rewardProductIds: values })}
                      placeholder="Select reward products"
                    />
                  </label>
                </div>
              ) : null}
            </OfferRuleCard>
          );
        })}
      </div>

      <OfferRuleAddPanel description="Choose the next rule type that should be available in this offer.">
        <Dropdown
          trigger={["click"]}
          menu={{
            items: addMenuItems,
            onClick: ({ key }) => appendRule(key as UnifiedRuleTemplateId),
          }}
        >
          <Button type="dashed">+ Add rule</Button>
        </Dropdown>
      </OfferRuleAddPanel>
    </div>
  );
}
