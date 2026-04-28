import { Button, Checkbox, Input, Select, Segmented } from "antd";
import type { DifferentProductsDiscountRule } from "../../../utils/offerParsing";
import type { DraftSelectedProduct } from "./campaignDraft";

type Props = {
  selectedProductsData: DraftSelectedProduct[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  setDifferentProductsDiscountRules: React.Dispatch<
    React.SetStateAction<DifferentProductsDiscountRule[]>
  >;
};

function buildDefaultTier(
  selectedProductsData: DraftSelectedProduct[],
  tierType: DifferentProductsDiscountRule["tierType"],
): DifferentProductsDiscountRule {
  const sharedProductIds = selectedProductsData.map((product) => String(product.id));
  return {
    count: 2,
    discountPercent: tierType === "bxgy" ? 100 : 15,
    buyQuantity: 2,
    getQuantity: tierType === "bxgy" ? 1 : 0,
    buyProductIds: sharedProductIds,
    getProductIds: [],
    maxUsesPerOrder: 1,
    tierType,
    title: "",
    subtitle: "",
    badge: "",
    isDefault: false,
  };
}

export default function DifferentProductsLogicEditor({
  selectedProductsData,
  differentProductsDiscountRules,
  setDifferentProductsDiscountRules,
}: Props) {
  const productOptions = selectedProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));

  const updateRule = (
    index: number,
    patch: Partial<DifferentProductsDiscountRule>,
  ) => {
    setDifferentProductsDiscountRules((prev) =>
      prev.map((rule, ruleIndex) =>
        ruleIndex === index ? { ...rule, ...patch } : rule,
      ),
    );
  };

  return (
    <div>
      <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
        Logic Block: Cross-product Tiers
      </h3>
      <p className="text-[13px] text-[#5c6166] mb-4 font-normal">
        Mix simple quantity discounts and BXGY-style tiers across the shared product
        pool. Each tier can target different buy and reward products.
      </p>

      {differentProductsDiscountRules.map((rule, index) => {
        const buyProductsData = selectedProductsData.filter((product) =>
          rule.buyProductIds.includes(String(product.id)),
        );
        const getProductsData =
          rule.getProductIds.length > 0
            ? selectedProductsData.filter((product) =>
                rule.getProductIds.includes(String(product.id)),
              )
            : buyProductsData;

        return (
          <div className="create-offer-discount-card" key={`${rule.tierType}-${index}`}>
            <div className="create-offer-discount-body">
              <div className="mb-3">
                <div className="mb-1 text-[12px] font-medium text-[#5c6166]">
                  Tier Type
                </div>
                <Segmented
                  value={rule.tierType}
                  options={[
                    { label: "Simple", value: "simple" },
                    { label: "BXGY", value: "bxgy" },
                  ]}
                  onChange={(value) => {
                    const tierType = value as DifferentProductsDiscountRule["tierType"];
                    updateRule(index, {
                      tierType,
                      getQuantity: tierType === "bxgy" ? Math.max(1, rule.getQuantity || 1) : 0,
                      getProductIds: tierType === "bxgy" ? rule.getProductIds : [],
                      discountPercent:
                        tierType === "bxgy" && rule.discountPercent === 0
                          ? 100
                          : rule.discountPercent,
                    });
                  }}
                />
              </div>

              <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Count Threshold
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.count}
                    onChange={(e) => {
                      const value = Math.max(
                        1,
                        Math.trunc(Number(e.target.value) || 1),
                      );
                      updateRule(index, { count: value });
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
                      const value = Math.max(
                        0,
                        Math.min(100, Number(e.target.value) || 0),
                      );
                      updateRule(index, { discountPercent: value });
                    }}
                  />
                </label>
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
                      const value = Math.max(
                        1,
                        Math.trunc(Number(e.target.value) || 1),
                      );
                      updateRule(index, { maxUsesPerOrder: value });
                    }}
                  />
                </label>
              </div>

              <div
                className="create-offer-discount-form-row"
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gridTemplateColumns:
                    rule.tierType === "bxgy" ? "1fr 1fr 1fr 1fr" : "1fr 1fr",
                  gap: "12px",
                }}
              >
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Buy Quantity
                  <Input
                    size="large"
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1"
                    value={rule.buyQuantity}
                    onChange={(e) => {
                      const value = Math.max(
                        1,
                        Math.trunc(Number(e.target.value) || 1),
                      );
                      updateRule(index, { buyQuantity: value });
                    }}
                  />
                </label>
                {rule.tierType === "bxgy" ? (
                  <>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                      Get Quantity
                      <Input
                        size="large"
                        type="number"
                        min={1}
                        step={1}
                        className="mt-1"
                        value={rule.getQuantity}
                        onChange={(e) => {
                          const value = Math.max(
                            1,
                            Math.trunc(Number(e.target.value) || 1),
                          );
                          updateRule(index, { getQuantity: value });
                        }}
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                      Buy Products
                      <Select
                        mode="multiple"
                        size="large"
                        className="mt-1 w-full"
                        value={rule.buyProductIds}
                        options={productOptions}
                        onChange={(values) =>
                          updateRule(index, { buyProductIds: values })
                        }
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                      Get Products
                      <Select
                        mode="multiple"
                        size="large"
                        className="mt-1 w-full"
                        value={rule.getProductIds}
                        options={productOptions}
                        onChange={(values) =>
                          updateRule(index, { getProductIds: values })
                        }
                        placeholder="Leave empty to reuse buy products"
                        allowClear
                      />
                    </label>
                  </>
                ) : (
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Eligible Products
                    <Select
                      mode="multiple"
                      size="large"
                      className="mt-1 w-full"
                      value={rule.buyProductIds}
                      options={productOptions}
                      onChange={(values) => updateRule(index, { buyProductIds: values })}
                    />
                  </label>
                )}
              </div>

              <div
                className="create-offer-discount-form-row"
                style={{
                  marginTop: "12px",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "12px",
                }}
              >
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Title
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.title || ""}
                    placeholder="e.g. Mix & Match Trio"
                    onChange={(e) => updateRule(index, { title: e.target.value })}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Subtitle
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.subtitle || ""}
                    placeholder="e.g. Buy any 3 and save 15%"
                    onChange={(e) => updateRule(index, { subtitle: e.target.value })}
                  />
                </label>
                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                  Badge
                  <Input
                    size="large"
                    className="mt-1"
                    value={rule.badge || ""}
                    placeholder="e.g. Best seller mix"
                    onChange={(e) => updateRule(index, { badge: e.target.value })}
                  />
                </label>
              </div>

              {(buyProductsData.length > 0 || getProductsData.length > 0) && (
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-[12px] font-medium text-[#5c6166]">
                      Buy Scope Preview
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {buyProductsData.slice(0, 4).map((product) => (
                        <div
                          key={`buy-${product.id}`}
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
                    </div>
                  </div>
                  {rule.tierType === "bxgy" ? (
                    <div>
                      <div className="mb-1 text-[12px] font-medium text-[#5c6166]">
                        Reward Scope Preview
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {getProductsData.slice(0, 4).map((product) => (
                          <div
                            key={`get-${product.id}`}
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
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div
                className="create-offer-discount-form-row"
                style={{
                  marginTop: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Checkbox
                  checked={!!rule.isDefault}
                  onChange={(e) => {
                    const checked = e.target.checked;
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
                <Button
                  danger
                  onClick={() => {
                    setDifferentProductsDiscountRules((prev) => {
                      if (prev.length <= 1) return prev;
                      return prev.filter((_, currentIndex) => currentIndex !== index);
                    });
                  }}
                  disabled={differentProductsDiscountRules.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex flex-wrap gap-3">
        <Button
          type="dashed"
          onClick={() => {
            setDifferentProductsDiscountRules((prev) => [
              ...prev,
              buildDefaultTier(selectedProductsData, "simple"),
            ]);
          }}
        >
          + Add Simple Tier
        </Button>
        <Button
          type="dashed"
          onClick={() => {
            setDifferentProductsDiscountRules((prev) => [
              ...prev,
              buildDefaultTier(selectedProductsData, "bxgy"),
            ]);
          }}
        >
          + Add BXGY Tier
        </Button>
      </div>
    </div>
  );
}
