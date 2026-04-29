import { Button, Dropdown, Input, Select } from "antd";
import type { DraftSelectedProduct } from "./campaignDraft";
import type { DiscountRule } from "../../../utils/offerParsing";
import {
  applyDiscountType,
  CONDITION_TYPE_OPTIONS,
  createRuleFromTemplate,
  getAvailableDiscountTypes,
  getDiscountTypeFromRule,
  getUnifiedRuleIssues,
  syncRuleDependencies,
} from "./unifiedRuleModel";

type Props = {
  rules: DiscountRule[];
  setRules: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
  selectedProductsData: DraftSelectedProduct[];
  offerType?: string;
};

export default function UnifiedRulesEditor({
  rules,
  setRules,
  selectedProductsData,
  offerType,
}: Props) {
  const issues = getUnifiedRuleIssues(rules);
  const productOptions = selectedProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));
  const discountTypeOptions = getAvailableDiscountTypes(offerType);

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
      | "free_gift"
      | "bxgy",
  ) => {
    setRules((prev) => [...prev.map(syncRuleDependencies), createRuleFromTemplate(template)]);
  };

  return (
    <div>
      <h3 className="mb-3 text-[14px] font-medium text-[#1c1f23]">
        Logic Block: Unified Rules
      </h3>
      <p className="mb-4 text-[13px] font-normal text-[#5c6166]">
        Choose the discount type first. The rule form then switches to the right
        condition and reward fields automatically.
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
          const discountType = getDiscountTypeFromRule(rule);
          const usesCartAmount = rule.conditionType === "cart_amount";
          const usesGiftReward = rule.rewardType === "gift_product";
          const usesShippingReward = rule.rewardType === "free_shipping";
          const usesPercentageReward = rule.rewardType === "percentage_off";
          const usesQuantityBreak = discountType === "quantity_break";
          const usesOrderDiscount = discountType === "order_discount";
          const usesBxgy = discountType === "bxgy";

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
                    value={rule.conditionType || "item_quantity"}
                    options={CONDITION_TYPE_OPTIONS}
                    onChange={(value) => updateRule(index, { conditionType: value })}
                  />
                </label>

                <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3">
                  <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
                    Reward Summary
                  </div>
                  <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
                    {usesGiftReward
                      ? "Gift product reward"
                      : usesShippingReward
                        ? "Free shipping reward"
                        : usesOrderDiscount
                          ? "Order percentage discount"
                          : usesBxgy
                            ? "BXGY percentage discount"
                            : "Product percentage discount"}
                  </div>
                  <div className="mt-1 text-[12px] text-[#5c6166]">
                    {usesGiftReward
                      ? "Reward products are configured below."
                      : usesShippingReward
                        ? "This rule maps to the shipping discount function automatically."
                        : usesOrderDiscount
                          ? "Applies a subtotal-level order discount when the rule is satisfied."
                          : usesBxgy
                            ? "This type will later expand into buy/get specific rule fields."
                            : "Applies a percentage discount to the matched products."}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  {usesCartAmount
                    ? "Cart Amount Threshold"
                    : usesBxgy
                      ? "Buy Quantity"
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
                  <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3 text-[13px] text-[#5c6166]">
                    {usesShippingReward
                      ? "Free shipping rules map to the delivery discount function target."
                      : "BXGY is currently represented by the shared rule shell; buy/get product selectors are the next step."}
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
          items: discountTypeOptions.map((option) => ({
            key:
              option.value === "quantity_break"
                ? "product_discount"
                : option.value === "order_discount"
                  ? "order_discount"
                  : option.value === "free_shipping"
                    ? "shipping_discount"
                    : option.value === "free_gift"
                      ? "free_gift"
                      : "bxgy",
            label: `Add ${option.label} Rule`,
          })),
          onClick: ({ key }) =>
            appendRule(
              key as
                | "product_discount"
                | "order_discount"
                | "shipping_discount"
                | "free_gift"
                | "bxgy",
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
