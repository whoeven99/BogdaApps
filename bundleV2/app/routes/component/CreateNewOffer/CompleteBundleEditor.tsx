import { Button, Dropdown, Input } from "antd";
import type { ReactNode } from "react";
import type {
  CompleteBundleBar,
  CompleteBundleProduct,
} from "../../../utils/offerParsing";

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
}: Props) {
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
        <>
          <div className="create-offer-panel create-offer-panel--muted">
            <div className="create-offer-panel__header">
              <div>
                <div className="create-offer-panel__eyebrow">Bundle Structure</div>
                <h3 className="create-offer-panel__title">Bundle bars</h3>
              </div>
              <div className="create-offer-panel__actions">
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: [
                      { key: "quantity", label: "Add Quantity bar" },
                      { key: "bxgy", label: "Add Buy X Get Y bar" },
                    ],
                    onClick: ({ key }) => {
                      if (key === "bxgy") addCompleteBundleBar("bxgy");
                      else addCompleteBundleBar("quantity-break-same");
                    },
                  }}
                >
                  <Button size="small">Add bar</Button>
                </Dropdown>
              </div>
            </div>
            <div className="create-offer-panel__meta">
              {completeBundleBars.length} bar
              {completeBundleBars.length > 1 ? "s" : ""} configured
            </div>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {completeBundleBars.map((bar, index) => (
              <div
                key={bar.id}
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
                    Bar #{index + 1} -{" "}
                    {bar.title ||
                      (bar.type === "bxgy" ? "Buy X, Get Y" : "Complete the bundle")}
                  </Button>
                  {completeBundleBars.length > 1 && (
                    <Button
                      size="small"
                      danger
                      onClick={(e) => {
                        removeCompleteBundleBar(bar.id);
                        e.preventDefault();
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-[12px]">
                    <span className="block mb-1">Title</span>
                    <Input
                      size="small"
                      value={bar.title || ""}
                      onChange={(e) =>
                        updateCompleteBundleBar(bar.id, { title: e.target.value })
                      }
                    />
                  </label>
                  <label className="block text-[12px]">
                    <span className="block mb-1">Quantity</span>
                    <Input
                      size="small"
                      type="number"
                      min={1}
                      value={bar.quantity}
                      onChange={(e) =>
                        updateCompleteBundleBar(bar.id, {
                          quantity: Math.max(1, Math.trunc(Number(e.target.value) || 1)),
                        })
                      }
                    />
                  </label>
                </div>
                <div className="text-[12px] text-[#5c6166] mt-2">
                  {bar.products.length} products selected
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {showProducts && activeBar ? (
        <div className={showBars ? "mt-6" : ""}>
          <div className="create-offer-panel create-offer-panel--muted">
            <div className="create-offer-panel__header">
              <div>
                <div className="create-offer-panel__eyebrow">Bundle Products</div>
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
