import { Button, Checkbox, Input, Select } from "antd";
import {
  buildDraftRuleId,
  type DifferentProductsDiscountRule,
} from "../../../utils/offerParsing";
import type { DraftSelectedProduct } from "./campaignDraft";
import {
  OfferRuleCard,
  OfferRuleFooterRow,
  OfferRuleFormGrid,
  OfferRuleAddPanel,
  OfferRuleNotice,
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
    id: buildDraftRuleId("different_products_rule"),
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
  const ruleEntries = differentProductsDiscountRules.map((rule, index) => ({
    rule,
    actualIndex: index,
  }));
  const productOptions = eligibleProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));
  const sharedPoolCount = eligibleProductsData.length;

  const updateRule = (
    actualIndex: number,
    patch: Partial<DifferentProductsDiscountRule>,
  ) => {
    const currentRule = differentProductsDiscountRules[actualIndex];
    const ruleId = getDifferentProductsUnifiedRuleId(
      currentRule || buildDefaultTier(eligibleProductsData),
      actualIndex,
    );
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
        ruleIndex === actualIndex ? normalizedPatch : rule,
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
    <OfferRulesSection>
      <OfferRuleNotice title="Cross-product rule scope" intent="info">
        Each bar is a mix-and-match threshold. Shoppers can combine any products from the shared eligible pool, and each bar can narrow that pool to a smaller subset.
      </OfferRuleNotice>
      {ruleEntries.map(({ rule, actualIndex }, index) => {
        const normalizedRule = normalizeRule(rule);
        const eligibleProductsInTier = eligibleProductsData.filter((product) =>
          normalizedRule.buyProductIds.includes(String(product.id)),
        );

        return (
          <OfferRuleCard
            key={`${normalizedRule.tierType}-${index}`}
            index={index}
            disableRemove={ruleEntries.length <= 1}
            onRemove={() => {
              setDifferentProductsDiscountRules((prev) => {
                if (ruleEntries.length <= 1) return prev;
                return prev.filter((_, currentIndex) => currentIndex !== actualIndex);
              });
            }}
          >
              {(() => {
                const ruleId = getDifferentProductsUnifiedRuleId(rule, actualIndex);
                return (
                  <>
              <OfferRuleFormGrid columns={3}>
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Mix-and-match quantity
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
                      updateRule(actualIndex, { count: value });
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
                      updateRule(actualIndex, { discountPercent: value });
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Bar product pool
                  <Select
                    mode="multiple"
                    size="large"
                    className="mt-1"
                    value={normalizedRule.buyProductIds}
                    options={productOptions}
                    onChange={(values) => updateRule(actualIndex, { buyProductIds: values })}
                    placeholder="Choose the subset that counts for this bar"
                  />
                </label>
              </OfferRuleFormGrid>

              <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
                Shoppers unlock this bar when they add any {normalizedRule.count} product
                {normalizedRule.count === 1 ? "" : "s"} from this pool.
                {" "}
                {normalizedRule.buyProductIds.length === sharedPoolCount
                  ? "This bar currently uses the full shared eligible pool."
                  : "This bar currently uses a narrower subset than the shared pool."}
              </div>

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
                      updateRule(actualIndex, { title: e.target.value });
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
                      updateRule(actualIndex, { subtitle: e.target.value });
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
                      updateRule(actualIndex, { badge: e.target.value });
                    }}
                  />
                </label>
              </OfferRuleFormGrid>

              {eligibleProductsInTier.length > 0 ? (
                <div className="mt-3 rounded-[10px] border border-[#e3e8ed] bg-[#fafbfb] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[12px] font-medium text-[#5c6166]">
                      Current bar pool
                    </div>
                    <div className="text-[12px] text-[#5c6166]">
                      {eligibleProductsInTier.length} of {sharedPoolCount} product
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
                    {eligibleProductsInTier.length > 4 ? (
                      <div className="flex items-center rounded-[8px] border border-dashed border-[#dfe3e8] bg-white px-2 py-1 text-[12px] text-[#5c6166]">
                        +{eligibleProductsInTier.length - 4} more
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[13px] text-[#5c6166]">
                  Select the products shoppers can mix together in this bar.
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
        );
      })}

      <OfferRuleAddPanel>
        <Button type="dashed" onClick={() => appendTier("simple")}>
          + Add rule
        </Button>
      </OfferRuleAddPanel>
    </OfferRulesSection>
  );
}
