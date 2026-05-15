import { Button, Checkbox, Input, Select } from "antd";
import type { DifferentProductsDiscountRule } from "../../../utils/offerParsing";
import type { DraftSelectedProduct } from "./campaignDraft";
import {
  OfferRuleCard,
  OfferRuleFooterRow,
  OfferRuleFormGrid,
  OfferRuleAddPanel,
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
  eligibleProductsData: DraftSelectedProduct[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  setDifferentProductsDiscountRules: React.Dispatch<
    React.SetStateAction<DifferentProductsDiscountRule[]>
  >;
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

function buildDefaultTier(
  eligibleProductsData: DraftSelectedProduct[],
): DifferentProductsDiscountRule {
  const sharedProductIds = eligibleProductsData.map((product) => String(product.id));
  return {
    count: 2,
    discountPercent: 15,
    buyQuantity: 2,
    getQuantity: 0,
    buyProductIds: sharedProductIds,
    getProductIds: [],
    maxUsesPerOrder: 1,
    tierType: "simple",
    title: "",
    subtitle: "",
    badge: "",
    isDefault: false,
  };
}

function normalizeRule(
  rule: DifferentProductsDiscountRule,
): DifferentProductsDiscountRule {
  const count = Math.max(1, Math.trunc(Number(rule.count) || 1));
  return {
    ...rule,
    count,
    discountPercent: Math.max(0, Math.min(100, Number(rule.discountPercent) || 0)),
    buyQuantity: count,
    getQuantity: 0,
    getProductIds: [],
    maxUsesPerOrder: 1,
    tierType: "simple",
  };
}

export default function DifferentProductsLogicEditor({
  eligibleProductsData,
  differentProductsDiscountRules,
  setDifferentProductsDiscountRules,
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  getDifferentProductsRuleCapability();
  const productOptions = eligibleProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));

  const updateRule = (
    index: number,
    patch: Partial<DifferentProductsDiscountRule>,
  ) => {
    const ruleId = getDifferentProductsUnifiedRuleId(index);
    const currentRule = differentProductsDiscountRules[index];
    const normalizedPatch = normalizeRule({
      ...(currentRule || buildDefaultTier(eligibleProductsData)),
      ...patch,
    });
    if (updateRuleValues) {
      updateRuleValues(ruleId, normalizedPatch);
      return;
    }
    setDifferentProductsDiscountRules((prev) =>
      prev.map((rule, ruleIndex) =>
        ruleIndex === index ? normalizedPatch : rule,
      ),
    );
  };
  const appendTier = (_tierType: DifferentProductsRuleTemplateId) => {
    setDifferentProductsDiscountRules((prev) => [
      ...prev,
      buildDefaultTier(eligibleProductsData),
    ]);
  };

  return (
    <OfferRulesSection description="Configure quantity-break tiers across different products. Each rule keeps the same card structure as standard quantity breaks, while letting you assign a dedicated eligible product pool.">
      {differentProductsDiscountRules.map((rule, index) => {
        const normalizedRule = normalizeRule(rule);
        const eligibleProductsInTier = eligibleProductsData.filter((product) =>
          normalizedRule.buyProductIds.includes(String(product.id)),
        );

        return (
          <OfferRuleCard
            key={`${normalizedRule.tierType}-${index}`}
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
              <OfferRuleFormGrid columns={3}>
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Item Quantity
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={normalizedRule.count}
                    onChange={(e) => {
                      const value = Math.max(
                        1,
                        Math.trunc(Number(e.target.value) || 1),
                      );
                      updateRule(index, { count: value });
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Discount (%)
                  <Input
                    size="large"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="mt-1"
                    value={normalizedRule.discountPercent}
                    onChange={(e) => {
                      const value = Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0),
                      );
                      updateRule(index, { discountPercent: value });
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Eligible Products
                  <Select
                    mode="multiple"
                    size="large"
                    className="mt-1"
                    value={normalizedRule.buyProductIds}
                    options={productOptions}
                    onChange={(values) => updateRule(index, { buyProductIds: values })}
                    placeholder="Select the products included in this tier"
                  />
                </label>
              </OfferRuleFormGrid>

              <OfferRuleFormGrid columns={3}>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Title
                  <Input
                    size="large"
                    className="mt-1"
                    value={normalizedRule.title || ""}
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
                    value={normalizedRule.subtitle || ""}
                    placeholder="e.g. Pick any 3 from this product group and save 15%"
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
                    value={normalizedRule.badge || ""}
                    placeholder="e.g. Recommended"
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

              {eligibleProductsInTier.length > 0 ? (
                <div className="mt-3 rounded-[10px] border border-[#e3e8ed] bg-[#fafbfb] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[12px] font-medium text-[#5c6166]">
                      Eligible product pool
                    </div>
                    <div className="text-[12px] text-[#5c6166]">
                      {eligibleProductsInTier.length} product
                      {eligibleProductsInTier.length === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {eligibleProductsInTier.slice(0, 4).map((product) => (
                      <div
                        key={`pool-${product.id}`}
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
                    {eligibleProductsData.length > 4 ? (
                      <div className="flex items-center rounded-[8px] border border-dashed border-[#dfe3e8] bg-white px-2 py-1 text-[12px] text-[#5c6166]">
                        +{eligibleProductsData.length - 4} more
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[13px] text-[#5c6166]">
                  Select the products that should participate in this tier.
                </div>
              )}

              <OfferRuleFooterRow>
                <Checkbox
                  checked={!!normalizedRule.isDefault}
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

      <OfferRuleAddPanel description="Add another quantity-break tier and assign a product pool for that combination.">
        <Button type="dashed" onClick={() => appendTier("simple")}>
          + Add rule
        </Button>
      </OfferRuleAddPanel>
    </OfferRulesSection>
  );
}
