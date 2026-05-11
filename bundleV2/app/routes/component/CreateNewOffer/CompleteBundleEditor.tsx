import { Button, Input, Select } from "antd";
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
  const activeBar = simpleMode
    ? completeBundleBars[0]
    : completeBundleBars.find((bar) => bar.id === activeBundleBarId) ||
      completeBundleBars[0];
  const activeBarIndex = simpleMode
    ? 0
    : completeBundleBars.findIndex((bar) => bar.id === activeBar?.id);
  const activeBarProductCount = activeBar?.products.length ?? 0;

  return (
    <div className="mb-8">
      {showBars ? (
        <OfferRulesSection description="Each bar represents one anchor-plus-accessories offer. The current PDP product acts as X, while this editor controls the accessory pool Y and its pricing.">
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
                            Bar #{index + 1} - {bar.title || "Complete the bundle"}
                          </Button>
                        </div>
                        <OfferRuleFormGrid columns={4}>
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
                          <label className="block text-[14px] font-medium text-[#1c1f23]">
                            Min accessories
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
                          <label className="block text-[14px] font-medium text-[#1c1f23]">
                            Max accessories
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
                        </OfferRuleFormGrid>
                        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                          <OfferRuleSummaryBox
                            label="Trigger model"
                            value="Current product + accessories"
                            description="The current PDP product is always X. Customers choose from this accessory pool without re-selecting the main product."
                          />
                          <OfferRuleSummaryBox
                            label="Selection rule"
                            value={`${minQuantity}-${maxQuantity} accessories`}
                            description="Trigger products are automatically excluded from the accessory pool to avoid self-bundling."
                          />
                        </div>
                        <div className="mt-3 text-[12px] text-[#5c6166]">
                          {bar.products.length} accessory product
                          {bar.products.length === 1 ? "" : "s"} in this pool
                        </div>
                      </div>
                    </>
                  );
                })()}
              </OfferRuleCard>
            ))}
          </div>
          <OfferRuleAddPanel description="Add another bar when the same trigger product needs a different accessory pool or pricing combination.">
            <Button type="dashed" onClick={() => addCompleteBundleBar("quantity-break-same")}>
              + Add bar
            </Button>
          </OfferRuleAddPanel>
        </OfferRulesSection>
      ) : null}

      {showProducts && activeBar ? (
        <div className={showBars ? "mt-6" : ""}>
          {simpleMode ? (
            <>
              <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      Bundle products
                    </div>
                    <div className="mt-1 text-[12px] text-[#5c6166]">
                      {simpleModeContext === "primary"
                        ? "Add the products customers can bundle with the trigger product."
                        : "Add the products customers can attach to this offer. This component stays additive and does not replace the main campaign logic."}
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
                    {activeBarProductCount > 0 ? "Edit bundle products" : "Add bundle products"}
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
                    ? "No bundle products yet. Use the Shopify product picker to choose the products for this offer."
                    : "No bundle products yet. Use the Shopify product picker to choose the accessory products for this component."}
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
                              {product.title || "Bundle product"}
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
                    <div className="text-[14px] font-medium text-[#1c1f23]">Bundle discount</div>
                    <div className="mt-1 text-[12px] text-[#5c6166]">
                      Configure how each selected bundle product is discounted when customers add
                      it through this bundle.
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
          ) : (
            <>
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-[14px] font-medium text-[#1c1f23]">Accessory pool</div>
                <div className="mt-1 text-[12px] text-[#5c6166]">
                  Add or edit the products customers can pair with the current PDP product. Trigger products are excluded automatically.
                </div>
              </div>
              <div className="text-[12px] text-[#5c6166]">
                {activeBar.products.length} product
                {activeBar.products.length > 1 ? "s" : ""} selected
              </div>
            </div>
          </div>

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

          <div className="create-offer-bundle-bar mt-3 create-offer-bundle-bar--active">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="text-[14px] font-semibold text-[#1c1f23]">
                {simpleMode
                  ? "Accessory products"
                  : `Bar #${activeBarIndex + 1} - ${activeBar.title || "Complete the bundle"}`}
              </div>
              <div className="text-[12px] text-[#5c6166]">
                {activeBar.products.length} product
                {activeBar.products.length > 1 ? "s" : ""} selected
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#ebedef]">
              <div className="text-[13px] font-medium text-[#1c1f23] mb-2">
                Accessory products
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
                  {activeBar.products.length ? "Edit accessory pool" : "Select accessory products"}
                </Button>
                <span className="text-[11px] text-[#5c6166]">
                  Products overlapping the trigger product are removed before saving.
                </span>
              </div>
              {activeBar.products.length === 0 ? (
                <div className="text-[12px] text-[#5c6166]">
                  This bar has no accessory products yet. Select the accessory pool to continue.
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
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
