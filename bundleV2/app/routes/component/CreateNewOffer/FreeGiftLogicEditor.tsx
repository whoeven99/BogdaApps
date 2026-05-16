import { Button, Checkbox, Dropdown, Input, Select } from "antd";
import {
  isSingleFreeGiftRule,
  type FreeGiftRule,
} from "../../../utils/offerParsing";
import type { DraftSelectedProduct } from "./campaignDraft";
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
  getFreeGiftUnifiedRuleId,
  type UnifiedRuleValuePatch,
} from "./unifiedRuleValues";
import { getFreeGiftRuleCapability } from "./ruleCapabilityRegistry";

type Props = {
  triggerProductsCount: number;
  giftProductsCount: number;
  giftProductsData: DraftSelectedProduct[];
  onSelectTriggerProducts: () => void | Promise<void>;
  onSelectGiftProducts: () => void | Promise<void>;
  onSelectRuleGiftProducts?: (ruleIndex: number) => void | Promise<void>;
  freeGiftRules: FreeGiftRule[];
  setFreeGiftRules: React.Dispatch<React.SetStateAction<FreeGiftRule[]>>;
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

export default function FreeGiftLogicEditor({
  triggerProductsCount,
  giftProductsCount,
  giftProductsData,
  onSelectTriggerProducts,
  onSelectGiftProducts,
  onSelectRuleGiftProducts,
  freeGiftRules,
  setFreeGiftRules,
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const { discountTypeOptions, addMenuItems } = getFreeGiftRuleCapability();
  const conditionTypeOptions = [
    { label: "Quantity threshold", value: "quantity_threshold" },
  ];
  const indexedRules = freeGiftRules.map((rule, index) => ({ rule, actualIndex: index }));
  const singleEntry =
    indexedRules.find((entry) => isSingleFreeGiftRule(entry.rule)) || null;
  const ruleEntries = indexedRules.filter((entry) => !isSingleFreeGiftRule(entry.rule));
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
  const giftProductMap = new Map(
    giftProductsData.map((product) => [String(product.id), product]),
  );

  return (
    <>
      <div className="mb-6">
        <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[14px] font-medium text-[#1c1f23]">Trigger Products</div>
              <div className="mt-1 text-[12px] text-[#5c6166]">
                {triggerProductsCount} selected
              </div>
            </div>
            <Button
              size="middle"
              onClick={(e) => {
                void onSelectTriggerProducts();
                e.preventDefault();
              }}
            >
              {triggerProductsCount === 0
                ? "Select trigger products"
                : "Edit trigger products"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[14px] font-medium text-[#1c1f23]">Gift Products</div>
              <div className="mt-1 text-[12px] text-[#5c6166]">
                {giftProductsCount} selected
              </div>
            </div>
            <Button
              size="middle"
              onClick={(e) => {
                void onSelectGiftProducts();
                e.preventDefault();
              }}
            >
              {giftProductsCount === 0 ? "Select gift products" : "Edit gift products"}
            </Button>
          </div>
          <div className="mt-2 text-[12px] text-[#5c6166]">
            This bulk picker updates the default reward pool for every free gift rule.
          </div>
        </div>
      </div>

      <OfferRulesSection>
        <OfferRuleNotice title="Trigger vs reward scope" intent="info">
          Trigger products decide when the offer unlocks. Reward products stay separate and can be overridden per rule when a tier needs a different gift selection.
        </OfferRuleNotice>
        {singleEntry ? (
          <OfferRuleCard key="single-free-gift" index={0} disableRemove onRemove={() => {}}>
            {(() => {
              const ruleId = getFreeGiftUnifiedRuleId(singleEntry.actualIndex);
              return (
                <>
                  <OfferRuleFormGrid columns={3}>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                      Title
                      <Input
                        size="large"
                        className="mt-1"
                        value={singleEntry.rule.title || ""}
                        placeholder="e.g. Single"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (updateRulePresentation) {
                            updateRulePresentation(ruleId, { title: value });
                            return;
                          }
                          setFreeGiftRules((prev) =>
                            prev.map((currentRule, currentIndex) =>
                              currentIndex === singleEntry.actualIndex
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
                        value={singleEntry.rule.subtitle || ""}
                        placeholder="e.g. Standard price"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (updateRulePresentation) {
                            updateRulePresentation(ruleId, { subtitle: value });
                            return;
                          }
                          setFreeGiftRules((prev) =>
                            prev.map((currentRule, currentIndex) =>
                              currentIndex === singleEntry.actualIndex
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
                        value={singleEntry.rule.badge || ""}
                        placeholder="Optional"
                        onChange={(e) => {
                          const value = e.target.value;
                          if (updateRulePresentation) {
                            updateRulePresentation(ruleId, { badge: value });
                            return;
                          }
                          setFreeGiftRules((prev) =>
                            prev.map((currentRule, currentIndex) =>
                              currentIndex === singleEntry.actualIndex
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
                      checked={!!singleEntry.rule.isDefault}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { isDefault: checked });
                          return;
                        }
                        setFreeGiftRules((prev) =>
                          prev.map((currentRule, currentIndex) => ({
                            ...currentRule,
                            isDefault: checked ? currentIndex === singleEntry.actualIndex : false,
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
        ) : null}
        {ruleEntries.map(({ rule, actualIndex }, index) => (
          <OfferRuleCard
            key={actualIndex}
            index={index}
            disableRemove={ruleEntries.length <= 1}
            onRemove={() => {
              setFreeGiftRules((prev) => {
                if (ruleEntries.length <= 1) return prev;
                return prev.filter((_, currentIndex) => currentIndex !== actualIndex);
              });
            }}
          >
              {(() => {
                const ruleId = getFreeGiftUnifiedRuleId(actualIndex);
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
                          currentIndex === actualIndex
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
                          currentIndex === actualIndex
                            ? { ...currentRule, giftQuantity: nextQty }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="mt-3 rounded-[10px] bg-[#f6f8f9] px-4 py-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      Reward Products
                    </div>
                    <div className="mt-1 text-[12px] text-[#5c6166]">
                      {rule.giftProductIds?.length
                        ? `${rule.giftProductIds.length} selected for this rule`
                        : "Using the shared gift product pool"}
                    </div>
                  </div>
                  {onSelectRuleGiftProducts ? (
                    <Button
                      size="middle"
                      onClick={(e) => {
                        void onSelectRuleGiftProducts(actualIndex);
                        e.preventDefault();
                      }}
                    >
                      {rule.giftProductIds?.length
                        ? "Edit rule reward products"
                        : "Override reward products"}
                    </Button>
                  ) : null}
                </div>
                {rule.giftProductIds?.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {rule.giftProductIds.slice(0, 4).map((productId) => {
                      const product = giftProductMap.get(String(productId));
                      return (
                        <div
                          key={`${ruleId}-gift-${productId}`}
                          className="flex items-center gap-2 rounded-[8px] border border-[#dfe3e8] bg-white px-2 py-1"
                        >
                          {product?.image ? (
                            <img
                              src={product.image}
                              alt={product.title}
                              className="h-8 w-8 rounded object-cover"
                            />
                          ) : null}
                          <span className="max-w-[160px] truncate text-[12px] text-[#1c1f23]">
                            {product?.title || "Selected gift product"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-3 text-[12px] text-[#5c6166]">
                    No rule-specific override yet. This tier will use the shared gift products selected above.
                  </div>
                )}
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
                    placeholder="e.g. Buy 2 and unlock a free gift"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { subtitle: value });
                        return;
                      }
                      setFreeGiftRules((prev) =>
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
                    placeholder="e.g. Gift included"
                    onChange={(e) => {
                      const value = e.target.value;
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { badge: value });
                        return;
                      }
                      setFreeGiftRules((prev) =>
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
