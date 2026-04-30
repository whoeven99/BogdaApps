import { Button, Checkbox, Dropdown, Input, Select } from "antd";
import type { FreeGiftRule } from "../../../utils/offerParsing";
import {
  OfferRuleAddPanel,
  OfferRuleCard,
  OfferRuleFooterRow,
  OfferRuleFormGrid,
  OfferRulesSection,
} from "./OfferRulesShared";
import type { RulePresentationPatch } from "./unifiedRulePresentation";
import {
  getFreeGiftUnifiedRuleId,
  type UnifiedRuleValuePatch,
} from "./unifiedRuleValues";
import { getFreeGiftRuleCapability } from "./ruleCapabilityRegistry";

type Props = {
  triggerProductsCount: number;
  giftProductsCount: number;
  onSelectTriggerProducts: () => void | Promise<void>;
  onSelectGiftProducts: () => void | Promise<void>;
  freeGiftRules: FreeGiftRule[];
  setFreeGiftRules: React.Dispatch<React.SetStateAction<FreeGiftRule[]>>;
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

export default function FreeGiftLogicEditor({
  triggerProductsCount,
  giftProductsCount,
  onSelectTriggerProducts,
  onSelectGiftProducts,
  freeGiftRules,
  setFreeGiftRules,
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const { discountTypeOptions, addMenuItems } = getFreeGiftRuleCapability();
  const conditionTypeOptions = [
    { label: "Quantity threshold", value: "quantity_threshold" },
  ];
  const appendFreeGiftTier = () => {
    setFreeGiftRules((prev) => {
      const maxCount = prev.reduce(
        (max, rule) => Math.max(max, rule.count),
        1,
      );
      return [
        ...prev,
        {
          count: maxCount + 1,
          giftQuantity: 1,
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
      <div className="mb-6">
        <div className="create-offer-panel create-offer-panel--muted">
          <div className="create-offer-panel__header">
            <div>
              <div className="create-offer-panel__eyebrow">Scope</div>
              <h3 className="create-offer-panel__title">Trigger Products</h3>
            </div>
            {triggerProductsCount > 0 ? (
              <div className="create-offer-kpi-badge">{triggerProductsCount} selected</div>
            ) : null}
          </div>
          {triggerProductsCount === 0 ? (
            <Button
              size="large"
              className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
              onClick={(e) => {
                void onSelectTriggerProducts();
                e.preventDefault();
              }}
            >
              Select trigger products
            </Button>
          ) : (
            <div className="create-offer-panel__footer">
              <Button
                size="small"
                onClick={(e) => {
                  void onSelectTriggerProducts();
                  e.preventDefault();
                }}
              >
                Edit trigger products
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="create-offer-panel create-offer-panel--muted">
          <div className="create-offer-panel__header">
            <div>
              <div className="create-offer-panel__eyebrow">Scope</div>
              <h3 className="create-offer-panel__title">Gift Products</h3>
            </div>
            {giftProductsCount > 0 ? (
              <div className="create-offer-kpi-badge">{giftProductsCount} selected</div>
            ) : null}
          </div>
          {giftProductsCount === 0 ? (
            <Button
              size="large"
              className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
              onClick={(e) => {
                void onSelectGiftProducts();
                e.preventDefault();
              }}
            >
              Select gift products
            </Button>
          ) : (
            <div className="create-offer-panel__footer">
              <Button
                size="small"
                onClick={(e) => {
                  void onSelectGiftProducts();
                  e.preventDefault();
                }}
              >
                Edit gift products
              </Button>
            </div>
          )}
        </div>
      </div>

      <OfferRulesSection description="Free gift rules use a fixed discount type. Configure the trigger threshold and how many gift items unlock for each rule.">
        {freeGiftRules.map((rule, index) => (
          <OfferRuleCard
            key={index}
            index={index}
            disableRemove={freeGiftRules.length <= 1}
            onRemove={() => {
              setFreeGiftRules((prev) => {
                if (prev.length <= 1) return prev;
                return prev.filter((_, currentIndex) => currentIndex !== index);
              });
            }}
          >
              {(() => {
                const ruleId = getFreeGiftUnifiedRuleId(index);
                return (
                  <>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Discount Type
                  <Select
                    size="large"
                    className="mt-1 w-full"
                    value="free_gift"
                    options={discountTypeOptions}
                    disabled
                  />
                </label>

                <label className="block text-[14px] font-medium text-[#1c1f23]">
                  Condition Type
                  <Select
                    size="large"
                    className="mt-1 w-full"
                    value="quantity_threshold"
                    options={conditionTypeOptions}
                    disabled
                  />
                </label>
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
                      setFreeGiftRules((prev) =>
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
                  Gift Quantity
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.giftQuantity}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value);
                      const nextQty =
                        Number.isFinite(parsedValue) && parsedValue >= 1
                          ? Math.trunc(parsedValue)
                          : 1;
                      if (updateRuleValues) {
                        updateRuleValues(ruleId, { giftQuantity: nextQty });
                        return;
                      }
                      setFreeGiftRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, giftQuantity: nextQty }
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
                    placeholder="e.g. Free sample"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { title: value });
                        return;
                      }
                      setFreeGiftRules((prev) =>
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
                    placeholder="e.g. Buy 2 and unlock a free gift"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { subtitle: value });
                        return;
                      }
                      setFreeGiftRules((prev) =>
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
                    placeholder="e.g. Gift included"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { badge: value });
                        return;
                      }
                      setFreeGiftRules((prev) =>
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

              <OfferRuleFooterRow>
                <Checkbox
                  checked={!!rule.isDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    if (updateRulePresentation) {
                      updateRulePresentation(ruleId, { isDefault: checked });
                      return;
                    }
                    setFreeGiftRules((prev) =>
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
        <OfferRuleAddPanel description="Each free gift rule adds another quantity threshold and reward level.">
          <Dropdown
            trigger={["click"]}
            menu={{
              items: addMenuItems,
              onClick: appendFreeGiftTier,
            }}
          >
            <Button type="dashed">+ Add rule</Button>
          </Dropdown>
        </OfferRuleAddPanel>
      </OfferRulesSection>
    </>
  );
}
