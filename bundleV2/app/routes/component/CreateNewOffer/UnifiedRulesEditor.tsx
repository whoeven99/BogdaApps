import { Button, Dropdown, Input, Select } from "antd";
import type { DraftSelectedProduct } from "./campaignDraft";
import type { DiscountRule } from "../../../utils/offerParsing";
import {
  CONDITION_TYPE_OPTIONS,
  DISCOUNT_CLASS_OPTIONS,
  createRuleFromTemplate,
  getRuleRewardOptions,
  getUnifiedRuleIssues,
  syncRuleDependencies,
} from "./unifiedRuleModel";

type Props = {
  rules: DiscountRule[];
  setRules: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
  selectedProductsData: DraftSelectedProduct[];
};

export default function UnifiedRulesEditor({
  rules,
  setRules,
  selectedProductsData,
}: Props) {
  const issues = getUnifiedRuleIssues(rules);
  const productOptions = selectedProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));

  const updateRule = (index: number, patch: Partial<DiscountRule>) => {
    setRules((prev) =>
      prev.map((rule, ruleIndex) =>
        ruleIndex === index
          ? syncRuleDependencies({ ...rule, ...patch })
          : syncRuleDependencies(rule),
      ),
    );
  };

  const appendRule = (
    template:
      | "product_discount"
      | "order_discount"
      | "shipping_discount"
      | "free_gift",
  ) => {
    setRules((prev) => [...prev.map(syncRuleDependencies), createRuleFromTemplate(template)]);
  };

  return (
    <div>
      <h3 className="mb-3 text-[14px] font-medium text-[#1c1f23]">
        Logic Block: Unified Rules
      </h3>
      <p className="mb-4 text-[13px] font-normal text-[#5c6166]">
        Define what condition qualifies, which Shopify discount class it belongs to,
        and what reward the customer receives. This is the foundation for mixed
        discount configuration.
      </p>

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
          const rewardOptions = getRuleRewardOptions(rule.discountClass);
          const usesCartAmount = rule.conditionType === "cart_amount";
          const usesGiftReward = rule.rewardType === "gift_product";
          const usesShippingReward = rule.rewardType === "free_shipping";

          return (
            <div
              key={rule.id || `rule-${index}`}
              className="rounded-[12px] border border-[#e3e8ed] bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[14px] font-semibold text-[#1c1f23]">
                  Rule {index + 1}
                </div>
                <Button
                  danger
                  size="small"
                  onClick={() =>
                    setRules((prev) => prev.filter((_, ruleIndex) => ruleIndex !== index))
                  }
                  disabled={rules.length <= 1}
                >
                  Remove
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Discount Class
                  <Select
                    size="large"
                    className="mt-1 w-full"
                    value={rule.discountClass || "product"}
                    options={DISCOUNT_CLASS_OPTIONS}
                    onChange={(value) =>
                      updateRule(index, {
                        discountClass: value,
                        rewardType:
                          value === "shipping"
                            ? "free_shipping"
                            : rule.rewardType === "free_shipping"
                              ? "percentage_off"
                              : rule.rewardType,
                      })
                    }
                  />
                </label>

                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Condition Type
                  <Select
                    size="large"
                    className="mt-1 w-full"
                    value={rule.conditionType || "item_quantity"}
                    options={CONDITION_TYPE_OPTIONS}
                    onChange={(value) => updateRule(index, { conditionType: value })}
                  />
                </label>

                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Reward Type
                  <Select
                    size="large"
                    className="mt-1 w-full"
                    value={rule.rewardType || "percentage_off"}
                    options={rewardOptions}
                    onChange={(value) => updateRule(index, { rewardType: value })}
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  {usesCartAmount ? "Cart Amount Threshold" : "Item Quantity"}
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

                {rule.rewardType === "percentage_off" ? (
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Discount (%)
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

                {usesShippingReward ? (
                  <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3 text-[13px] text-[#5c6166]">
                    Shipping discount rules will later map to the delivery discount
                    function target.
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
            </div>
          );
        })}
      </div>

      <Dropdown
        trigger={["click"]}
        menu={{
          items: [
            { key: "product_discount", label: "Add Product Discount Rule" },
            { key: "order_discount", label: "Add Order Discount Rule" },
            { key: "shipping_discount", label: "Add Shipping Discount Rule" },
            { key: "free_gift", label: "Add Free Gift Rule" },
          ],
          onClick: ({ key }) =>
            appendRule(
              key as
                | "product_discount"
                | "order_discount"
                | "shipping_discount"
                | "free_gift",
            ),
        }}
      >
        <Button type="dashed" className="mt-4 w-full">
          + Add rule
        </Button>
      </Dropdown>
    </div>
  );
}
