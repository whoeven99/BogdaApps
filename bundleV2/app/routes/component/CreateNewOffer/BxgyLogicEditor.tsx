import { Button, Checkbox, Input } from "antd";
import type { BxgyDiscountRule } from "../../../utils/offerParsing";

type Props = {
  buyProductsCount: number;
  getProductsCount: number;
  onSelectBuyProducts: () => void | Promise<void>;
  onSelectGetProducts: () => void | Promise<void>;
  bxgyDiscountRules: BxgyDiscountRule[];
  setBxgyDiscountRules: React.Dispatch<React.SetStateAction<BxgyDiscountRule[]>>;
};

export default function BxgyLogicEditor({
  buyProductsCount,
  getProductsCount,
  onSelectBuyProducts,
  onSelectGetProducts,
  bxgyDiscountRules,
  setBxgyDiscountRules,
}: Props) {
  return (
    <>
      <div className="mb-6">
        <div className="create-offer-panel create-offer-panel--muted">
          <div className="create-offer-panel__header">
            <div>
              <div className="create-offer-panel__eyebrow">BXGY Setup</div>
              <h3 className="create-offer-panel__title">Buy Products (X)</h3>
            </div>
            {buyProductsCount > 0 ? (
              <div className="create-offer-kpi-badge">{buyProductsCount} selected</div>
            ) : null}
          </div>
          {buyProductsCount === 0 ? (
            <Button
              size="large"
              className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
              onClick={(e) => {
                void onSelectBuyProducts();
                e.preventDefault();
              }}
            >
              Select buy products
            </Button>
          ) : (
            <div className="create-offer-panel__footer">
              <Button
                size="small"
                onClick={(e) => {
                  void onSelectBuyProducts();
                  e.preventDefault();
                }}
              >
                Edit buy products
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <div className="create-offer-panel create-offer-panel--muted">
          <div className="create-offer-panel__header">
            <div>
              <div className="create-offer-panel__eyebrow">BXGY Setup</div>
              <h3 className="create-offer-panel__title">Get Products (Y)</h3>
            </div>
            {getProductsCount > 0 ? (
              <div className="create-offer-kpi-badge">{getProductsCount} selected</div>
            ) : null}
          </div>
          {getProductsCount === 0 ? (
            <Button
              size="large"
              className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
              onClick={(e) => {
                void onSelectGetProducts();
                e.preventDefault();
              }}
            >
              Select get products
            </Button>
          ) : (
            <div className="create-offer-panel__footer">
              <Button
                size="small"
                onClick={(e) => {
                  void onSelectGetProducts();
                  e.preventDefault();
                }}
              >
                Edit get products
              </Button>
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="create-offer-panel create-offer-panel--muted mb-4">
          <div className="create-offer-panel__header">
            <div>
              <div className="create-offer-panel__eyebrow">Discount Logic</div>
              <h3 className="create-offer-panel__title">BXGY Rules</h3>
            </div>
          </div>
        </div>
        {bxgyDiscountRules.map((rule, index) => (
          <div className="create-offer-discount-card" key={index}>
            <div className="create-offer-discount-body">
              <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Cart quantity
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
                      setBxgyDiscountRules((prev) =>
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
                  Buy Quantity (X)
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.buyQuantity}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value);
                      const nextCount =
                        Number.isFinite(parsedValue) && parsedValue >= 1
                          ? Math.trunc(parsedValue)
                          : 1;
                      setBxgyDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, buyQuantity: nextCount }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Get Quantity (Y)
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.getQuantity}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value);
                      const nextCount =
                        Number.isFinite(parsedValue) && parsedValue >= 1
                          ? Math.trunc(parsedValue)
                          : 1;
                      setBxgyDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, getQuantity: nextCount }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Discount (%)
                  <Input
                    size="large"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    className="mt-1"
                    value={rule.discountPercent}
                    onChange={(e) => {
                      const parsedValue = Number(e.target.value);
                      if (parsedValue > 100) return;
                      const nextPercent =
                        Number.isFinite(parsedValue) && parsedValue >= 0
                          ? parsedValue
                          : 0;
                      setBxgyDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, discountPercent: nextPercent }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                  {rule.discountPercent === 100 && (
                    <div className="text-[#52c41a] text-[12px] mt-1 font-normal">
                      Y products will be FREE
                    </div>
                  )}
                </label>
              </div>

              <div className="create-offer-inline-grid-3">
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Title
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.title || ""}
                    placeholder="e.g. Duo, Trio"
                    onChange={(e) => {
                      const value = e.target.value;
                      setBxgyDiscountRules((prev) =>
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
                    placeholder="e.g. Buy 2, get 1 free"
                    onChange={(e) => {
                      const value = e.target.value;
                      setBxgyDiscountRules((prev) =>
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
                    placeholder="e.g. Most Popular"
                    onChange={(e) => {
                      const value = e.target.value;
                      setBxgyDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, badge: value }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="create-offer-inline-grid-2">
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
                      const parsedValue = Number(e.target.value);
                      const nextMax =
                        Number.isFinite(parsedValue) && parsedValue >= 1
                          ? Math.trunc(parsedValue)
                          : 1;
                      setBxgyDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) =>
                          currentIndex === index
                            ? { ...currentRule, maxUsesPerOrder: nextMax }
                            : currentRule,
                        ),
                      );
                    }}
                  />
                </label>
              </div>

              <div className="create-offer-inline-row">
                <Checkbox
                  checked={!!rule.isDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setBxgyDiscountRules((prev) =>
                      prev.map((currentRule, currentIndex) => ({
                        ...currentRule,
                        isDefault: checked ? currentIndex === index : false,
                      })),
                    );
                  }}
                >
                  Set as Default Selected
                </Checkbox>
                <Button
                  danger
                  onClick={() => {
                    setBxgyDiscountRules((prev) => {
                      if (prev.length <= 1) return prev;
                      return prev.filter((_, currentIndex) => currentIndex !== index);
                    });
                  }}
                  disabled={bxgyDiscountRules.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        ))}
        <Button
          type="dashed"
          className="w-full"
          onClick={() => {
            setBxgyDiscountRules((prev) => {
              const maxCount = prev.reduce(
                (max, rule) => Math.max(max, rule.count),
                1,
              );
              return [
                ...prev,
                {
                  count: maxCount + 1,
                  buyQuantity: 2,
                  getQuantity: 1,
                  buyProductIds: [],
                  getProductIds: [],
                  discountPercent: 100,
                  maxUsesPerOrder: 1,
                  title: "",
                  subtitle: "",
                  badge: "",
                  isDefault: false,
                },
              ];
            });
          }}
        >
          + Add BXGY tier
        </Button>
      </div>
    </>
  );
}
