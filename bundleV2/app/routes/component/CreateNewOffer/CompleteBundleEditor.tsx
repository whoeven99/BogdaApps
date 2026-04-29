import { Button, Dropdown, Input, Select } from "antd";
import type { ReactNode } from "react";
import type {
  CompleteBundleBar,
  CompleteBundleProduct,
} from "../../../utils/offerParsing";
import {
  OfferRuleAddPanel,
  OfferRuleCard,
  OfferRuleFormGrid,
  OfferRuleSummaryBox,
  OfferRulesSection,
} from "./OfferRulesShared";
import type { RulePresentationPatch } from "./unifiedRulePresentation";
import {
  getCompleteBundleUnifiedRuleId,
  type UnifiedRuleValuePatch,
} from "./unifiedRuleValues";
import {
  getCompleteBundleRuleCapability,
  type CompleteBundleRuleTemplateId,
} from "./ruleCapabilityRegistry";

type Props = {
  completeBundleBars: CompleteBundleBar[];
  activeBundleBarId: string;
  setActiveBundleBarId: (barId: string) => void;
  addCompleteBundleBar: (type: "quantity-break-same" | "bxgy") => void;
  removeCompleteBundleBar: (barId: string) => void;
  updateCompleteBundleBar: (barId: string, patch: Partial<CompleteBundleBar>) => void;
  handleSelectProductsForBundleBar: (barId: string) => void | Promise<void>;
  appendProductsToBundleBar: (barId: string) => void | Promise<void>;
  renderCompleteBundleProductPricingCard: (
    bar: CompleteBundleBar,
    product: CompleteBundleProduct,
    productIdx: number,
    isFirstBar: boolean,
  ) => ReactNode;
  section?: "bars" | "products" | "all";
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

function getDefaultBarTitle(type: "quantity-break-same" | "bxgy") {
  return type === "bxgy" ? "Buy X, Get Y" : "Complete the bundle";
}

export default function CompleteBundleEditor({
  completeBundleBars,
  activeBundleBarId,
  setActiveBundleBarId,
  addCompleteBundleBar,
  removeCompleteBundleBar,
  updateCompleteBundleBar,
  handleSelectProductsForBundleBar,
  appendProductsToBundleBar,
  renderCompleteBundleProductPricingCard,
  section = "all",
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const { barTypeOptions, addMenuItems } = getCompleteBundleRuleCapability();
  const showBars = section === "all" || section === "bars";
  const showProducts = section === "all" || section === "products";
  const activeBar =
    completeBundleBars.find((bar) => bar.id === activeBundleBarId) ||
    completeBundleBars[0];
  const activeBarIndex = completeBundleBars.findIndex(
    (bar) => bar.id === activeBar?.id,
  );

  return (
    <div className="mb-8">
      {showBars ? (
        <OfferRulesSection description="Define each rule, then attach products and pricing in the section below.">
          <div className="mt-3 flex flex-col gap-3">
            {completeBundleBars.map((bar, index) => (
              <OfferRuleCard
                key={bar.id}
                index={index}
                onRemove={
                  completeBundleBars.length > 1
                    ? () => {
                        removeCompleteBundleBar(bar.id);
                      }
                    : undefined
                }
                disableRemove={completeBundleBars.length <= 1}
              >
                {(() => {
                  const ruleId = getCompleteBundleUnifiedRuleId(bar.id);
                  return (
                    <>
                <div
                  className={`create-offer-bundle-bar ${
                    activeBundleBarId === bar.id ? "create-offer-bundle-bar--active" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                  <Button
                    type="link"
                    className="px-0"
                    onClick={(e) => {
                      setActiveBundleBarId(bar.id);
                      e.preventDefault();
                    }}
                  >
                    Rule #{index + 1} - {bar.title || getDefaultBarTitle(bar.type)}
                  </Button>
                  </div>
                  <OfferRuleFormGrid columns={3}>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Discount Type
                      <Select
                        size="large"
                        className="mt-1 w-full"
                        value={bar.type}
                        options={barTypeOptions.map((option) => ({
                          label: option.label,
                          value: option.value,
                        }))}
                        onChange={(value) => {
                          const nextType = value as "quantity-break-same" | "bxgy";
                          const shouldResetTitle =
                            !bar.title ||
                            bar.title === getDefaultBarTitle("quantity-break-same") ||
                            bar.title === getDefaultBarTitle("bxgy");
                          if (updateRuleValues || updateRulePresentation) {
                            updateRuleValues?.(ruleId, {
                              tierType: nextType === "bxgy" ? "bxgy" : "simple",
                            });
                            if (shouldResetTitle) {
                              updateRulePresentation?.(ruleId, {
                                title: getDefaultBarTitle(nextType),
                              });
                            }
                            return;
                          }
                          updateCompleteBundleBar(bar.id, {
                            type: nextType,
                            title: shouldResetTitle ? getDefaultBarTitle(nextType) : bar.title,
                          });
                        }}
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Title
                      <Input
                        size="large"
                        className="mt-1"
                        value={bar.title || ""}
                        onChange={(e) => {
                          if (updateRulePresentation) {
                            updateRulePresentation(ruleId, { title: e.target.value });
                            return;
                          }
                          updateCompleteBundleBar(bar.id, { title: e.target.value });
                        }}
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Trigger Quantity
                      <Input
                        size="large"
                        type="number"
                        min={1}
                        className="mt-1"
                        value={bar.quantity}
                        onChange={(e) => {
                          const nextQuantity = Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1),
                          );
                          if (updateRuleValues) {
                            updateRuleValues(ruleId, { count: nextQuantity });
                            return;
                          }
                          updateCompleteBundleBar(bar.id, {
                            quantity: nextQuantity,
                          });
                        }}
                      />
                    </label>
                  </OfferRuleFormGrid>
                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <OfferRuleSummaryBox
                      label="Condition Type"
                      value={bar.type === "bxgy" ? "Buy X, Get Y" : "Bundle completion"}
                      description={
                        bar.type === "bxgy"
                          ? "Customers unlock this bar when the buy/get rule is satisfied."
                          : "Customers unlock this bar by completing the configured bundle group."
                      }
                    />
                    <OfferRuleSummaryBox
                      label="Reward Summary"
                      value={`${bar.products.length} configured product${bar.products.length === 1 ? "" : "s"}`}
                      description="Product selection and pricing stay aligned in the Products & pricing section."
                    />
                  </div>
                  <div className="text-[12px] text-[#5c6166] mt-3">
                    {bar.products.length} products selected
                  </div>
                </div>
                    </>
                  );
                })()}
              </OfferRuleCard>
            ))}
          </div>
          <OfferRuleAddPanel description="Add another bundle bar when this offer needs more bundle paths or a BXGY alternative.">
            <Dropdown
              trigger={["click"]}
              menu={{
                items: addMenuItems,
                onClick: ({ key }) => {
                  addCompleteBundleBar(
                    key as CompleteBundleRuleTemplateId,
                  );
                },
              }}
            >
              <Button type="dashed">+ Add rule</Button>
            </Dropdown>
          </OfferRuleAddPanel>
        </OfferRulesSection>
      ) : null}

      {showProducts && activeBar ? (
        <div className={showBars ? "mt-6" : ""}>
          <div className="create-offer-panel create-offer-panel--muted">
            <div className="create-offer-panel__header">
              <div>
                <div className="create-offer-panel__eyebrow">Scope</div>
                <h3 className="create-offer-panel__title">Products & pricing</h3>
              </div>
            </div>
            <div className="create-offer-panel__meta">
              Configure products for the active bar, then review pricing and variant previews.
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {completeBundleBars.map((bar, index) => (
              <Button
                key={bar.id}
                size="small"
                type={bar.id === activeBar.id ? "primary" : "default"}
                onClick={(e) => {
                  setActiveBundleBarId(bar.id);
                  e.preventDefault();
                }}
              >
                Bar #{index + 1}
              </Button>
            ))}
          </div>

          <div className="create-offer-bundle-bar mt-3 create-offer-bundle-bar--active">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[14px] font-semibold text-[#1c1f23]">
                Bar #{activeBarIndex + 1} -{" "}
                {activeBar.title ||
                  (activeBar.type === "bxgy" ? "Buy X, Get Y" : "Complete the bundle")}
              </div>
              <div className="text-[12px] text-[#5c6166]">
                {activeBar.products.length} product
                {activeBar.products.length > 1 ? "s" : ""} selected
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#ebedef]">
              <div className="text-[13px] font-medium text-[#1c1f23] mb-2">
                Bar Pricing & Variant Preview
              </div>
              {activeBarIndex === 0 ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="small"
                    onClick={(e) => {
                      setActiveBundleBarId(activeBar.id);
                      void handleSelectProductsForBundleBar(activeBar.id);
                      e.preventDefault();
                    }}
                  >
                    {activeBar.products.length
                      ? "Change default product"
                      : "Select default product"}
                  </Button>
                  <span className="text-[11px] text-[#5c6166]">
                    Bar #1 only allows one default product
                  </span>
                </div>
              ) : (
                <div className="mb-2">
                  <Button
                    size="small"
                    type="primary"
                    onClick={(e) => {
                      setActiveBundleBarId(activeBar.id);
                      void appendProductsToBundleBar(activeBar.id);
                      e.preventDefault();
                    }}
                  >
                    + Add product
                  </Button>
                </div>
              )}
              {activeBar.products.length === 0 ? (
                <div className="text-[12px] text-[#5c6166]">
                  {activeBarIndex === 0
                    ? "Select the default product first."
                    : 'This bar has no products yet. Click "+ Add product" to continue.'}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {activeBar.products.map((product, productIdx) =>
                    renderCompleteBundleProductPricingCard(
                      activeBar,
                      product,
                      productIdx,
                      activeBarIndex === 0,
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
