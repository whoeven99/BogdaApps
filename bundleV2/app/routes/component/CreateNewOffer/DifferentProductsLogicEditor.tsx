import { Button, Checkbox, Dropdown, Input, Select } from "antd";
import type { DifferentProductsDiscountRule } from "../../../utils/offerParsing";
import type { DraftSelectedProduct } from "./campaignDraft";
import {
  OfferRuleAddPanel,
  OfferRuleCard,
  OfferRuleFooterRow,
  OfferRuleFormGrid,
  OfferRuleSummaryBox,
  OfferRulesSection,
} from "./OfferRulesShared";
import type { RulePresentationPatch } from "./unifiedRulePresentation";
import {
  getDifferentProductsUnifiedRuleId,
  type UnifiedRuleValuePatch,
} from "./unifiedRuleValues";
import {
  getDifferentProductsRuleCapability,
  type DifferentProductsRuleTemplateId,
} from "./ruleCapabilityRegistry";

type Props = {
  selectedProductsData: DraftSelectedProduct[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  setDifferentProductsDiscountRules: React.Dispatch<
    React.SetStateAction<DifferentProductsDiscountRule[]>
  >;
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

function buildDefaultTier(
  selectedProductsData: DraftSelectedProduct[],
  tierType: DifferentProductsDiscountRule["tierType"],
): DifferentProductsDiscountRule {
  const sharedProductIds = selectedProductsData.map((product) => String(product.id));
  return {
    count: 2,
    discountPercent: tierType === "bxgy" ? 100 : 15,
    buyQuantity: 2,
    getQuantity: tierType === "bxgy" ? 1 : 0,
    buyProductIds: sharedProductIds,
    getProductIds: [],
    maxUsesPerOrder: 1,
    tierType,
    title: "",
    subtitle: "",
    badge: "",
    isDefault: false,
  };
}

export default function DifferentProductsLogicEditor({
  selectedProductsData,
  differentProductsDiscountRules,
  setDifferentProductsDiscountRules,
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const { discountTypeOptions, addMenuItems } =
    getDifferentProductsRuleCapability();
  const productOptions = selectedProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));

  const updateRule = (
    index: number,
    patch: Partial<DifferentProductsDiscountRule>,
  ) => {
    const ruleId = getDifferentProductsUnifiedRuleId(index);
    if (updateRuleValues) {
      updateRuleValues(ruleId, patch);
      return;
    }
    setDifferentProductsDiscountRules((prev) =>
      prev.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
  };
  const appendTier = (tierType: DifferentProductsRuleTemplateId) => {
    setDifferentProductsDiscountRules((prev) => [
      ...prev,
      buildDefaultTier(selectedProductsData, tierType),
    ]);
  };

  return (
    <OfferRulesSection description="Configure cross-product rules across the shared pool. Each rule can be a quantity break or a BXGY reward flow.">
      {differentProductsDiscountRules.map((rule, index) => {
        const buyProductsData = selectedProductsData.filter((product) =>
          rule.buyProductIds.includes(String(product.id)),
        );
        const getProductsData =
          rule.getProductIds.length > 0
            ? selectedProductsData.filter((product) =>
                rule.getProductIds.includes(String(product.id)),
              )
            : buyProductsData;

        return (
          <OfferRuleCard
            key={`${rule.tierType}-${index}`}
            index={index}
            disableRemove={differentProductsDiscountRules.length <= 1}
            onRemove={() => {
              setDifferentProductsDiscountRules((prev) => {
                if (prev.length <= 1) return prev;
                return prev.filter((_, currentIndex) => currentIndex !== index);
              });
            }}
          >
              {(() => {
                const ruleId = getDifferentProductsUnifiedRuleId(index);
                return (
                  <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <div>
                  <div className="mb-1 text-[14px] font-medium text-[#1c1f23]">
                    Discount Type
                  </div>
                  <Select
                    size="large"
                    className="w-full"
                    value={rule.tierType}
                    options={discountTypeOptions}
                    onChange={(value) => {
                      const tierType = value as DifferentProductsDiscountRule["tierType"];
                      updateRule(index, {
                        tierType,
                        getQuantity: tierType === "bxgy" ? Math.max(1, rule.getQuantity || 1) : 0,
                        getProductIds: tierType === "bxgy" ? rule.getProductIds : [],
                        discountPercent:
                          tierType === "bxgy" && rule.discountPercent === 0
                            ? 100
                            : rule.discountPercent,
                      });
                    }}
                  />
                </div>

                <OfferRuleSummaryBox
                  label="Condition Type"
                  value={rule.tierType === "bxgy" ? "Buy X, Get Y" : "Quantity threshold"}
                  description={
                    rule.tierType === "bxgy"
                      ? "Uses dedicated buy and get quantities across the selected product pool."
                      : "Unlocks a shared discount when customers reach the threshold."
                  }
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
                      const value = Math.max(
                        1,
                        Math.trunc(Number(e.target.value) || 1),
                      );
                      updateRule(index, { count: value });
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  {rule.tierType === "bxgy" ? "Reward Discount (%)" : "Discount (%)"}
                  <Input
                    size="large"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="mt-1"
                    value={rule.discountPercent}
                    onChange={(e) => {
                      const value = Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0),
                      );
                      updateRule(index, { discountPercent: value });
                    }}
                  />
                </label>
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
                      const value = Math.max(
                        1,
                        Math.trunc(Number(e.target.value) || 1),
                      );
                      updateRule(index, { maxUsesPerOrder: value });
                    }}
                  />
                </label>
              </div>

              <OfferRuleFormGrid columns={rule.tierType === "bxgy" ? 4 : 2}>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Buy Quantity
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.buyQuantity}
                    onChange={(e) => {
                      const value = Math.max(
                        1,
                        Math.trunc(Number(e.target.value) || 1),
                      );
                      updateRule(index, { buyQuantity: value });
                    }}
                  />
                </label>
                {rule.tierType === "bxgy" ? (
                  <>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                      Get Quantity
                      <Input
                        size="large"
                        type="number"
                        min={1}
                        step={1}
                        className="mt-1"
                        value={rule.getQuantity}
                        onChange={(e) => {
                          const value = Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1),
                          );
                          updateRule(index, { getQuantity: value });
                        }}
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                      Buy Products
                      <Select
                        mode="multiple"
                        size="large"
                        className="mt-1 w-full"
                        value={rule.buyProductIds}
                        options={productOptions}
                        onChange={(values) =>
                          updateRule(index, { buyProductIds: values })
                        }
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                      Get Products
                      <Select
                        mode="multiple"
                        size="large"
                        className="mt-1 w-full"
                        value={rule.getProductIds}
                        options={productOptions}
                        onChange={(values) =>
                          updateRule(index, { getProductIds: values })
                        }
                        placeholder="Leave empty to reuse buy products"
                        allowClear
                      />
                    </label>
                  </>
                ) : (
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Eligible Products
                    <Select
                      mode="multiple"
                      size="large"
                      className="mt-1 w-full"
                      value={rule.buyProductIds}
                      options={productOptions}
                      onChange={(values) => updateRule(index, { buyProductIds: values })}
                    />
                  </label>
                )}
              </OfferRuleFormGrid>

              <OfferRuleFormGrid columns={3}>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Title
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.title || ""}
                    placeholder="e.g. Mix & Match Trio"
                    onChange={(e) => {
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { title: e.target.value });
                        return;
                      }
                      updateRule(index, { title: e.target.value });
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Subtitle
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.subtitle || ""}
                    placeholder="e.g. Buy any 3 and save 15%"
                    onChange={(e) => {
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { subtitle: e.target.value });
                        return;
                      }
                      updateRule(index, { subtitle: e.target.value });
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Badge
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.badge || ""}
                    placeholder="e.g. Best seller mix"
                    onChange={(e) => {
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { badge: e.target.value });
                        return;
                      }
                      updateRule(index, { badge: e.target.value });
                    }}
                  />
                </label>
              </OfferRuleFormGrid>

              {(buyProductsData.length > 0 || getProductsData.length > 0) && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[12px] font-medium text-[#5c6166]">
                      Buy Scope Preview
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {buyProductsData.slice(0, 4).map((product) => (
                        <div
                          key={`buy-${product.id}`}
                          className="flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1"
                        >
                          <img
                            src={product.image}
                            alt={product.title}
                            className="h-8 w-8 rounded object-cover"
                          />
                          <span className="max-w-[120px] truncate text-[12px] text-[#1c1f23]">
                            {product.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {rule.tierType === "bxgy" ? (
                    <div>
                      <div className="mb-1 text-[12px] font-medium text-[#5c6166]">
                        Reward Scope Preview
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getProductsData.slice(0, 4).map((product) => (
                          <div
                            key={`get-${product.id}`}
                            className="flex items-center gap-2 rounded-[8px] border border-[#e5e7eb] bg-white px-2 py-1"
                          >
                            <img
                              src={product.image}
                              alt={product.title}
                              className="h-8 w-8 rounded object-cover"
                            />
                            <span className="max-w-[120px] truncate text-[12px] text-[#1c1f23]">
                              {product.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <OfferRuleFooterRow>
                <Checkbox
                  checked={!!rule.isDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (updateRulePresentation) {
                      updateRulePresentation(ruleId, { isDefault: checked });
                      return;
                    }
                    setDifferentProductsDiscountRules((prev) =>
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
        );
      })}

      <OfferRuleAddPanel description="Mix quantity-break and BXGY tiers inside the same shared product pool.">
        <Dropdown
          trigger={["click"]}
          menu={{
            items: addMenuItems,
            onClick: ({ key }) => {
              appendTier(key as DifferentProductsRuleTemplateId);
            },
          }}
        >
          <Button type="dashed">+ Add rule</Button>
        </Dropdown>
      </OfferRuleAddPanel>
    </OfferRulesSection>
  );
}
