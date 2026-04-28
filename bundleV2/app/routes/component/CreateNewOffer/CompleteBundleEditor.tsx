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
}: Props) {
  return (
    <div className="mb-8">
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
      <div className="flex flex-col gap-3">
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
            <div className="mt-3 pt-3 border-t border-[#ebedef]">
              <div className="text-[13px] font-medium text-[#1c1f23] mb-2">
                Bar Pricing & Variant Preview
              </div>
              {index === 0 ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="small"
                    onClick={(e) => {
                      setActiveBundleBarId(bar.id);
                      void handleSelectProductsForBundleBar(bar.id);
                      e.preventDefault();
                    }}
                  >
                    {bar.products.length
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
                      setActiveBundleBarId(bar.id);
                      void appendProductsToBundleBar(bar.id);
                      e.preventDefault();
                    }}
                  >
                    + Add product
                  </Button>
                </div>
              )}
              {bar.products.length === 0 ? (
                <div className="text-[12px] text-[#5c6166]">
                  {index === 0
                    ? "Select the default product first."
                    : 'This bar has no products yet. Click "+ Add product" to continue.'}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {bar.products.map((product, productIdx) =>
                    renderCompleteBundleProductPricingCard(
                      bar,
                      product,
                      productIdx,
                      index === 0,
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
