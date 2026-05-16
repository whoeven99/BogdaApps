import { Button, Input, Radio, Select } from "antd";
import type { ReactNode } from "react";
import {
  isCompleteBundleSingleBar,
} from "../../../utils/offerParsing";
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
  OfferRuleNotice,
} from "./OfferRulesShared";
import type { RulePresentationPatch } from "./unifiedRulePresentation";
import {
  getCompleteBundleUnifiedRuleId,
  type UnifiedRuleValuePatch,
} from "./unifiedRuleValues";

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
  simpleMode?: boolean;
  simpleModeContext?: "primary" | "component";
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

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
  simpleMode = false,
  simpleModeContext = "component",
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const showBars = section === "all" || section === "bars";
  const showProducts = section === "all" || section === "products";
  const bundleBars = completeBundleBars.filter((bar) => !isCompleteBundleSingleBar(bar));
  const activeBar = simpleMode
    ? completeBundleBars[0]
    : completeBundleBars.find((bar) => bar.id === activeBundleBarId) ||
      completeBundleBars[0];
  const activeBarIndex = simpleMode
    ? 0
    : completeBundleBars.findIndex((bar) => bar.id === activeBar?.id);
  const activeBarProductCount = activeBar?.products.length ?? 0;
  const activePricingMode = activeBar?.pricing?.mode ?? "full_price";
  const activePricingValue = Number(activeBar?.pricing?.value) || 0;
  const getPricingValueLabel = (mode: CompleteBundleBar["pricing"]["mode"]) =>
    mode === "percentage_off"
      ? "Bundle discount (%)"
      : mode === "amount_off"
        ? "Amount off bundle (€)"
        : mode === "fixed_price"
          ? "Bundle price (€)"
          : "Pricing value";

  return (
    <div className="mb-8">
      {showBars ? (
        <OfferRulesSection>
          <div className="mt-3 flex flex-col gap-3">
            {completeBundleBars.map((bar, index) => (
              <OfferRuleCard
                key={bar.id}
                index={index}
                onRemove={
                  !isCompleteBundleSingleBar(bar) && bundleBars.length > 1
                    ? () => {
                        removeCompleteBundleBar(bar.id);
                      }
                    : undefined
                }
                disableRemove={isCompleteBundleSingleBar(bar) || bundleBars.length <= 1}
              >
                {(() => {
                  const ruleId = getCompleteBundleUnifiedRuleId(bar.id);
                  const isSingleBar = isCompleteBundleSingleBar(bar);
                  const minQuantity = Math.max(1, Math.trunc(Number(bar.minQuantity) || 1));
                  const maxQuantity = Math.max(
                    minQuantity,
                    Math.trunc(Number(bar.maxQuantity) || Number(bar.quantity) || 1),
                  );
                  return (
                    <>
                      <div
                        className={`create-offer-bundle-bar ${
                          activeBundleBarId === bar.id ? "create-offer-bundle-bar--active" : ""
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <Button
                            type="link"
                            className="px-0"
                            onClick={(e) => {
                              setActiveBundleBarId(bar.id);
                              e.preventDefault();
                            }}
                          >
                            Bar #{index + 1} -{" "}
                            {bar.title || (isSingleBar ? "Single" : "Complete the bundle")}
                          </Button>
                          <Radio
                            checked={bar.isDefault === true}
                            onChange={() => {
                              if (updateRulePresentation) {
                                updateRulePresentation(ruleId, { isDefault: true });
                                return;
                              }
                              updateCompleteBundleBar(bar.id, { isDefault: true });
                            }}
                          >
                            Default selected
                          </Radio>
                        </div>
                        <OfferRuleFormGrid columns={isSingleBar ? 2 : 4}>
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
                            Subtitle
                            <Input
                              size="large"
                              className="mt-1"
                              value={bar.subtitle || ""}
                              onChange={(e) => {
                                if (updateRulePresentation) {
                                  updateRulePresentation(ruleId, { subtitle: e.target.value });
                                  return;
                                }
                                updateCompleteBundleBar(bar.id, { subtitle: e.target.value });
                              }}
                            />
                          </label>
                          {!isSingleBar ? (
                            <label className="block text-[14px] font-medium text-[#1c1f23]">
                              Min bundle items
                              <Input
                                size="large"
                                type="number"
                                min={1}
                                className="mt-1"
                                value={minQuantity}
                                onChange={(e) => {
                                  const nextMin = Math.max(1, Math.trunc(Number(e.target.value) || 1));
                                  updateCompleteBundleBar(bar.id, {
                                    minQuantity: nextMin,
                                    maxQuantity: Math.max(nextMin, maxQuantity),
                                    quantity: Math.max(nextMin, maxQuantity),
                                  });
                                }}
                              />
                            </label>
                          ) : null}
                          {!isSingleBar ? (
                            <label className="block text-[14px] font-medium text-[#1c1f23]">
                              Max bundle items
                              <Input
                                size="large"
                                type="number"
                                min={minQuantity}
                                className="mt-1"
                                value={maxQuantity}
                                onChange={(e) => {
                                  const nextMax = Math.max(
                                    minQuantity,
                                    Math.trunc(Number(e.target.value) || minQuantity),
                                  );
                                  if (updateRuleValues) {
                                    updateRuleValues(ruleId, { count: nextMax });
                                  }
                                  updateCompleteBundleBar(bar.id, {
                                    maxQuantity: nextMax,
                                    quantity: nextMax,
                                  });
                                }}
                              />
                            </label>
                          ) : null}
                        </OfferRuleFormGrid>
                        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                          <OfferRuleSummaryBox
                            label="Trigger model"
                            value={
                              isSingleBar
                                ? "Current product only"
                                : "Current product + bundle items"
                            }
                            description={
                              isSingleBar
                                ? "This bar preserves the standalone purchase path for the current product."
                                : "The current PDP product is always included. The selected bundle items join it and the discount applies to the whole bundle subtotal."
                            }
                          />
                          <OfferRuleSummaryBox
                            label="Selection rule"
                            value={
                              isSingleBar
                                ? "Standalone purchase"
                                : `${minQuantity}-${maxQuantity} bundle items`
                            }
                            description={
                              isSingleBar
                                ? "No bundle items are attached to this bar, and it stays at standard price."
                                : "Trigger products stay out of the selectable pool, so customers only choose the additional bundle items."
                            }
                          />
                        </div>
                        {!isSingleBar ? (
                          <div className="mt-3 text-[12px] text-[#5c6166]">
                            {bar.products.length} bundle item
                            {bar.products.length === 1 ? "" : "s"} in this pool
                          </div>
                        ) : null}
                      </div>
                    </>
                  );
                })()}
              </OfferRuleCard>
            ))}
          </div>
          <OfferRuleAddPanel>
            <Button type="dashed" onClick={() => addCompleteBundleBar("quantity-break-same")}>
              + Add bar
            </Button>
          </OfferRuleAddPanel>
        </OfferRulesSection>
      ) : null}

      {showProducts && activeBar ? (
        <div className={showBars ? "mt-6" : ""}>
          {isCompleteBundleSingleBar(activeBar) ? (
            <OfferRuleNotice title="Single purchase bar" intent="info">
              This bar only controls the standalone purchase option. Select a bundle bar to edit
              bundle items and bundle-level pricing.
            </OfferRuleNotice>
          ) : null}
          {simpleMode ? (
            <>
              {!isCompleteBundleSingleBar(activeBar) ? (
                <>
                  <div className="rounded-[10px] border border-[#e3e8ed] bg-white px-4 py-3 text-[12px] text-[#5c6166]">
                    Bundle item selection is defined when this offer is configured. Step 2 only
                    controls which items participate and how the whole bundle is discounted.
                    <span className="ml-1 font-medium text-[#1c1f23]">
                      {activeBarProductCount} item{activeBarProductCount === 1 ? "" : "s"} configured.
                    </span>
                  </div>

                  <div className="mt-4 rounded-[10px] border border-[#e3e8ed] bg-white p-4">
                    <div className="text-[14px] font-medium text-[#1c1f23]">Bundle discount</div>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <label className="block text-[13px] font-medium text-[#1c1f23]">
                        Discount model
                        <Select
                          size="large"
                          className="mt-1 w-full"
                          value={activePricingMode}
                          onChange={(value) =>
                            updateCompleteBundleBar(activeBar.id, {
                              pricing: {
                                mode: value as CompleteBundleBar["pricing"]["mode"],
                                value: value === "full_price" ? 0 : activePricingValue,
                              },
                            })
                          }
                          options={[
                            { label: "Full price", value: "full_price" },
                            { label: "Percentage off", value: "percentage_off" },
                            { label: "Amount off", value: "amount_off" },
                            { label: "Fixed bundle price", value: "fixed_price" },
                          ]}
                        />
                      </label>
                      <label className="block text-[13px] font-medium text-[#1c1f23]">
                        {getPricingValueLabel(activePricingMode)}
                        <Input
                          size="large"
                          type="number"
                          min={0}
                          disabled={activePricingMode === "full_price"}
                          className="mt-1"
                          value={activePricingMode === "full_price" ? 0 : activePricingValue}
                          onChange={(e) =>
                            updateCompleteBundleBar(activeBar.id, {
                              pricing: {
                                mode: activePricingMode,
                                value: Number(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[10px] bg-[#f6f8f9] px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[14px] font-medium text-[#1c1f23]">
                          Bundle items
                        </div>
                        <div className="mt-1 text-[12px] text-[#5c6166]">
                          {simpleModeContext === "primary"
                            ? "Add the items customers can combine with the current product into one discounted bundle."
                            : "Add the items customers can attach to this offer. This component stays additive and does not replace the main campaign logic."}
                        </div>
                      </div>
                      <Button
                        type="primary"
                        onClick={(e) => {
                          setActiveBundleBarId(activeBar.id);
                          void handleSelectProductsForBundleBar(activeBar.id);
                          e.preventDefault();
                        }}
                      >
                        {activeBarProductCount > 0 ? "Edit bundle items" : "Add bundle items"}
                      </Button>
                    </div>
                    <div className="mt-3 text-[12px] text-[#5c6166]">
                      {activeBarProductCount} product
                      {activeBarProductCount === 1 ? "" : "s"} selected
                    </div>
                  </div>

                  {activeBarProductCount === 0 ? (
                    <div className="mt-3 rounded-[10px] border border-dashed border-[#dfe3e8] bg-white px-4 py-4 text-[13px] text-[#5c6166]">
                      {simpleModeContext === "primary"
                        ? "No bundle items yet. Use the Shopify product picker to choose the items for this bundle configuration."
                        : "No bundle items yet. Use the Shopify product picker to choose the items for this bundle configuration."}
                    </div>
                  ) : (
                    <div className="mt-3 space-y-4">
                      <div className="space-y-2">
                        {activeBar.products.map((product) => {
                          const selectedVariant =
                            product.variants?.find((variant) => variant.id === product.selectedVariantId) ||
                            product.variants?.[0];

                          return (
                            <div
                              key={product.productId}
                              className="flex items-center gap-3 rounded-[10px] border border-[#e3e8ed] bg-white px-3 py-3"
                            >
                              <img
                                src={product.image || "https://via.placeholder.com/48"}
                                alt={product.title || "Bundle product"}
                                className="h-10 w-10 rounded-[8px] border border-[#edf1f4] object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[13px] font-medium text-[#1c1f23]">
                                  {product.title || "Bundle item"}
                                </div>
                                <div className="mt-1 truncate text-[12px] text-[#5c6166]">
                                  {selectedVariant?.title && selectedVariant.title !== "Default Title"
                                    ? selectedVariant.title
                                    : "Default variant"}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="rounded-[10px] border border-[#e3e8ed] bg-white p-4">
                        <div className="text-[14px] font-medium text-[#1c1f23]">Bundle items</div>
                        <div className="mt-1 text-[12px] text-[#5c6166]">
                          Each selected item joins the current product, and the bundle discount above
                          is applied to the combined subtotal.
                        </div>
                        <div className="mt-4 flex flex-col gap-4">
                          {activeBar.products.map((product, productIdx) =>
                            renderCompleteBundleProductPricingCard(
                              activeBar,
                              product,
                              productIdx,
                              true,
                            ),
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </>
          ) : (
            <>
          {!isCompleteBundleSingleBar(activeBar) ? (
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[14px] font-medium text-[#1c1f23]">Bundle-item pool</div>
                <div className="mt-1 text-[12px] text-[#5c6166]">
                  Add or edit the bundle items customers can pair with the current PDP product. Trigger products are excluded automatically.
                </div>
              </div>
              <div className="text-[12px] text-[#5c6166]">
                {activeBar.products.length} item
                {activeBar.products.length > 1 ? "s" : ""} selected
              </div>
            </div>
          </div>
          ) : null}

          {!simpleMode && completeBundleBars.length > 1 ? (
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
          ) : null}

          {!isCompleteBundleSingleBar(activeBar) ? (
          <div className="create-offer-bundle-bar mt-3 create-offer-bundle-bar--active">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[14px] font-semibold text-[#1c1f23]">
                {simpleMode
                  ? "Bundle items"
                  : `Bar #${activeBarIndex + 1} - ${activeBar.title || "Complete the bundle"}`}
              </div>
              <div className="text-[12px] text-[#5c6166]">
                {activeBar.products.length} product
                {activeBar.products.length > 1 ? "s" : ""} selected
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#ebedef]">
              <div className="text-[13px] font-medium text-[#1c1f23] mb-2">
                Bundle items
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button
                  size="small"
                  type="primary"
                  onClick={(e) => {
                    setActiveBundleBarId(activeBar.id);
                    void appendProductsToBundleBar(activeBar.id);
                    e.preventDefault();
                  }}
                >
                  {activeBar.products.length ? "Edit bundle items" : "Select bundle items"}
                </Button>
                <span className="text-[11px] text-[#5c6166]">
                  Products overlapping the trigger product are removed before saving.
                </span>
              </div>
              {activeBar.products.length === 0 ? (
                <div className="text-[12px] text-[#5c6166]">
                  This bar has no bundle items yet. Select the bundle-item pool to continue.
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {activeBar.products.map((product, productIdx) =>
                    renderCompleteBundleProductPricingCard(
                      activeBar,
                      product,
                      productIdx,
                      true,
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
          ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
