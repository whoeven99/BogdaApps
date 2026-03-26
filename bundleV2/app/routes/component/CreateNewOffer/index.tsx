import { useRef, useState } from "react";
import { Form } from "react-router";
import {
  X,
} from "lucide-react";
import "./CreateNewOffer.css";

type DiscountRule = {
  // 数量阈值：例如 count=2 表示“买 2 件及以上”生效
  count: number;
  discountPercent: number;
};

type Product = {
  id: string | number;
  name: string;
  price: string;
  image: string;
};

interface InitialOffer {
  id: string;
  name: string;
  offerType: string;
  discountRulesJson: string | null;
  startTime: string;
  endTime: string;
  selectedProductsJson: string | null;
  offerSettingsJson: string | null;
}

interface CreateNewOfferProps {
  onBack?: () => void;
  initialOffer?: InitialOffer;
  storeProducts?: Product[];
}

function formatForDateTimeLocal(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function parseSelectedProductIds(
  selectedProductsJson?: string | null,
): string[] {
  if (!selectedProductsJson) return [];

  try {
    const parsed = JSON.parse(selectedProductsJson);
    if (!Array.isArray(parsed)) return [];

    // 兼容：
    // - 新格式：["gid://shopify/Product/xxx", ...]
    // - 旧格式：[{ id: "gid://shopify/Product/xxx", name, price, image }, ...]
    const ids: string[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        ids.push(item);
        continue;
      }

      if (item && typeof item === "object") {
        const id = (item as { id?: unknown }).id;
        if (typeof id === "string") ids.push(id);
        else if (typeof id === "number") ids.push(String(id));
      }
    }

    return ids;
  } catch {
    return [];
  }
}

function parseOfferSettings(
  offerSettingsJson?: string | null,
): {
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  totalBudget: number | null;
  dailyBudget: number | null;
  customerSegments: string | null;
  markets: string | null;
  usageLimitPerCustomer: string;
} {
  if (!offerSettingsJson) {
    return {
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
      markets: null,
      usageLimitPerCustomer: "unlimited",
    };
  }

  try {
    const parsed = JSON.parse(offerSettingsJson) as Partial<{
      layoutFormat: "vertical" | "horizontal" | "card" | "compact";
      totalBudget: number | null;
      dailyBudget: number | null;
      customerSegments: string | null;
      markets: string | null;
      usageLimitPerCustomer: string;
    }>;

    return {
      layoutFormat: parsed.layoutFormat ?? "vertical",
      totalBudget:
        parsed.totalBudget !== undefined ? parsed.totalBudget : null,
      dailyBudget:
        parsed.dailyBudget !== undefined ? parsed.dailyBudget : null,
      customerSegments:
        parsed.customerSegments !== undefined
          ? parsed.customerSegments
          : null,
      markets: parsed.markets !== undefined ? parsed.markets : null,
      usageLimitPerCustomer:
        parsed.usageLimitPerCustomer ?? "unlimited",
    };
  } catch {
    return {
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
      markets: null,
      usageLimitPerCustomer: "unlimited",
    };
  }
}

function parseDiscountRules(
  discountRulesJson?: string | null,
): DiscountRule[] {
  // discountRulesJson 现在是一个对象：{ "2": 20, "3": 25 }
  // key: count（字符串），value: discountPercent（数字）
  if (!discountRulesJson) return [{ count: 2, discountPercent: 15 }];

  const parsed = JSON.parse(discountRulesJson) as Record<string, unknown>;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [{ count: 2, discountPercent: 15 }];
  }

  return Object.entries(parsed)
    .map(([countStr, percentRaw]) => {
      const count = Number(countStr);
      const discountPercent = Number(percentRaw);
      if (!Number.isFinite(count) || count < 1) return null;
      if (!Number.isFinite(discountPercent)) return null;
      return {
        count,
        discountPercent: Math.max(0, Math.min(100, discountPercent)),
      } satisfies DiscountRule;
    })
    .filter((x): x is DiscountRule => x !== null)
    .sort((a, b) => a.count - b.count);
}

function buildDiscountRulesJson(tiers: DiscountRule[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;
    out[String(Math.trunc(tier.count))] = Math.max(
      0,
      Math.min(100, tier.discountPercent),
    );
  }
  return out;
}

export function CreateNewOffer({
  onBack,
  initialOffer,
  storeProducts = [],
}: CreateNewOfferProps) {
  const startTimeInputRef = useRef<HTMLInputElement | null>(null);
  const endTimeInputRef = useRef<HTMLInputElement | null>(null);
  const openDateTimePicker = (input: HTMLInputElement | null) => {
    const pickerInput = input as
      | (HTMLInputElement & {
          showPicker?: () => void;
        })
      | null;
    if (!pickerInput) return;
    pickerInput.focus();
    pickerInput.showPicker?.();
  };
  const [step, setStep] = useState(1);
  const [offerType, setOfferType] = useState(
    initialOffer?.offerType ?? "quantity-breaks-same",
  );
  const [offerName, setOfferName] = useState(initialOffer?.name ?? "");
  const [offerNameError, setOfferNameError] = useState("");
  const [startTime, setStartTime] = useState(
    initialOffer
      ? formatForDateTimeLocal(initialOffer.startTime)
      : formatForDateTimeLocal(new Date()),
  );
  const [endTime, setEndTime] = useState(
    initialOffer ? formatForDateTimeLocal(initialOffer.endTime) : "",
  );
  const [startTimeError, setStartTimeError] = useState("");
  const [endTimeError, setEndTimeError] = useState("");

  const offerSettings = parseOfferSettings(
    initialOffer?.offerSettingsJson,
  );

  const [totalBudget, setTotalBudget] = useState(
    offerSettings.totalBudget != null
      ? String(offerSettings.totalBudget)
      : "",
  );
  const [dailyBudget, setDailyBudget] = useState(
    offerSettings.dailyBudget != null
      ? String(offerSettings.dailyBudget)
      : "",
  );
  const [productSelection, setProductSelection] = useState(
    "specific-selected",
  );
  const [layoutFormat, setLayoutFormat] = useState<
    "vertical" | "horizontal" | "card" | "compact"
  >(offerSettings.layoutFormat);
  const [cardBackgroundColor, setCardBackgroundColor] = useState("#ffffff");
  const [accentColor, setAccentColor] = useState("#008060");
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialOffer?.selectedProductsJson
      ? parseSelectedProductIds(initialOffer.selectedProductsJson)
      : [],
  );

  // 仅用于页面展示；落库/提交只需要 ids。
  const selectedProducts: Product[] = selectedProductIds.map((id) => {
    const found = storeProducts.find((p) => String(p.id) === String(id));
    return (
      found ?? {
        id,
        name: "Unknown product",
        price: "€0.00",
        image: "https://via.placeholder.com/60",
      }
    );
  });
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() => {
    const parsed = parseDiscountRules(initialOffer?.discountRulesJson);
    const byCount = new Map<number, number>(
      parsed.map((r) => [r.count, r.discountPercent]),
    );
    const get = (count: number) => byCount.get(count) ?? 15;
    return [
      { count: 2, discountPercent: get(2) },
      { count: 3, discountPercent: get(3) },
    ];
  });

  const steps = [
    "Basic Information",
    "Products & Discounts",
    "Style Design",
    "Schedule & Budget",
  ];

  const offerTypes = [
    {
      id: "quantity-breaks-same",
      name: "Quantity breaks for the same product",
      description:
        "Offer discounts when customers buy multiple quantities of the same product",
    },
  ];
  const filteredStoreProducts = storeProducts.filter((product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase().trim()),
  );

  return (
    <Form className="polaris-page create-offer-page" method="post">
      <div className="polaris-page__header">
        <div>
          <button
            className="polaris-button polaris-button--plain"
            onClick={onBack}
            type="button"
          >
            ← Back
          </button>
          <h1 className="polaris-page__title">
            {initialOffer ? "Edit Offer" : "Create New Offer"}
          </h1>
        </div>
      </div>

      <input
        type="hidden"
        name="intent"
        value={initialOffer ? "update-offer" : "create-offer"}
      />
      {initialOffer && (
        <input type="hidden" name="offerId" value={initialOffer.id} />
      )}
      {/* 始终提交的核心字段（即使对应输入步骤已切换隐藏） */}
      {/* 保留 offer name 中间的空格（避免某些情况下 trim 触发不符合预期的问题） */}
      <input type="hidden" name="name" value={offerName} />
      <input type="hidden" name="offerType" value={offerType} />
      <input type="hidden" name="layoutFormat" value={layoutFormat} />
      <input
        type="hidden"
        name="selectedProductsJson"
        value={JSON.stringify(selectedProductIds)}
      />
      <input
        type="hidden"
        name="discountRulesJson"
        value={JSON.stringify(buildDiscountRulesJson(discountRules))}
      />

      <div className="polaris-card create-offer-card">
        <div className="create-offer-steps sm:flex sm:gap-[12px]">
          {steps.map((stepName, index) => (
            <div
              key={index}
              className={`create-offer-step sm:text-[14px] sm:p-[12px] ${
                step === index + 1 ? "create-offer-step--active" : ""
              }`}
              onClick={() => setStep(index + 1)}
            >
              <span className="hidden sm:inline">
                {index + 1}.{" "}
              </span>
              {stepName}
            </div>
          ))}
        </div>

        <div className="polaris-layout">
          {step === 1 && (
            <div className="create-offer-basic-grid lg:grid-cols-[1fr_400px]">
              <div>
                <h2 className="polaris-text-heading-md create-offer-section-title">
                  Basic Information
                </h2>
                <div className="polaris-stack polaris-stack--vertical">
                  <label className="create-offer-label">
                    Offer Name
                    <input
                      type="text"
                      placeholder="e.g., Summer Bundle Deal"
                      className="create-offer-input"
                      value={offerName}
                      onChange={(e) => {
                        setOfferName(e.target.value);
                        if (offerNameError && e.target.value.trim()) {
                          setOfferNameError("");
                        }
                      }}
                      required
                    />
                    {offerNameError && (
                      <p className="create-offer-error-text">
                        {offerNameError}
                      </p>
                    )}
                  </label>

                  <label className="create-offer-label create-offer-label--mt">
                    Offer Type
                    <select
                      value={offerType}
                      onChange={(e) =>
                        setOfferType(e.target.value)
                      }
                      className="create-offer-input"
                      disabled
                    >
                      {offerTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="create-offer-sticky-preview">
                <h3 className="create-offer-section-heading">
                  Preview
                </h3>
                <p className="polaris-text-subdued create-offer-text-subdued">
                  {
                    offerTypes.find(
                      (type) => type.id === offerType,
                    )?.description
                  }
                </p>

                <div className="create-offer-preview-card">
                  {offerType === "quantity-breaks-same" && (
                    <>
                      <div
                        className="create-offer-pricing-card create-offer-pricing-card--readonly"
                      >
                        <div className="create-offer-pricing-header">
                          <input
                            type="radio"
                            checked={false}
                            readOnly
                            disabled
                            className="create-offer-radio"
                          />
                          <div className="create-offer-pricing-title">
                            <strong>Single</strong>
                            <div className="create-offer-pricing-subtitle">
                              Standard price
                            </div>
                          </div>
                          <strong className="create-offer-pricing-price">
                            €65,00
                          </strong>
                        </div>
                      </div>
                      <div
                        className="create-offer-pricing-card create-offer-pricing-card--primary create-offer-pricing-card--readonly create-offer-pricing-card--selected"
                      >
                        <div className="create-offer-pricing-badge">
                          Most Popular
                        </div>
                        <div className="create-offer-pricing-header">
                          <input
                            type="radio"
                            checked={true}
                            readOnly
                            disabled
                            className="create-offer-radio"
                          />
                          <div className="create-offer-pricing-title">
                            <div className="create-offer-pricing-meta">
                              <strong>Duo</strong>
                              <span className="create-offer-pricing-save">
                                SAVE €19,50
                              </span>
                            </div>
                            <div className="create-offer-pricing-subtitle">
                              You save 15%
                            </div>
                          </div>
                          <div className="create-offer-pricing-right">
                            <strong className="create-offer-pricing-price">
                              €110,50
                            </strong>
                            <div className="create-offer-pricing-original">
                              €130,00
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="create-offer-pricing-footer">
                        <strong>
                          Quantity breaks for the same product
                        </strong>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              {showProductModal && (
              <div className="create-offer-modal-backdrop">
                <div className="create-offer-modal">
                  <div className="create-offer-modal-header">
                    <h2 className="create-offer-modal-title">
                        Select Products
                      </h2>
                      <button
                        onClick={() => setShowProductModal(false)}
                      className="create-offer-modal-close"
                        type="button"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search products..."
                      className="create-offer-modal-search"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                    />

                  <div className="create-offer-modal-products">
                      {filteredStoreProducts.map((product) => (
                        <div
                          key={product.id}
                        className="create-offer-modal-product"
                          onClick={() => {
                            const productId = String(product.id);
                            if (!selectedProductIds.includes(productId)) {
                              setSelectedProductIds([
                                ...selectedProductIds,
                                productId,
                              ]);
                            }
                          }}
                        >
                          <img
                            src={product.image}
                            alt={product.name}
                          className="create-offer-modal-product-image"
                          />
                        <div style={{ flex: 1 }}>
                          <div className="create-offer-modal-product-name">
                              {product.name}
                            </div>
                          <div className="create-offer-modal-product-price">
                              {product.price}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedProductIds.includes(
                              String(product.id),
                            )}
                            readOnly
                          className="create-offer-modal-product-checkbox"
                          />
                        </div>
                      ))}
                      {filteredStoreProducts.length === 0 && (
                        <div className="create-offer-helper-text">
                          No products found.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowProductModal(false)}
                    className="create-offer-modal-footer-button"
                      type="button"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              <div className="create-offer-products-grid">
                <div>
                  <h2 className="polaris-text-heading-md create-offer-section-title">
                    Products & Discounts
                  </h2>

                  <div className="create-offer-selected-products">
                    <h3 className="create-offer-section-heading">
                      Products eligible for offer
                    </h3>

                    {selectedProductIds.length === 0 ? (
                      <button
                        onClick={() => setShowProductModal(true)}
                        className="create-offer-modal-footer-button"
                        type="button"
                      >
                        Add products eligible for offer
                      </button>
                    ) : (
                      <div>
                        <div className="create-offer-selected-grid">
                          {selectedProducts.slice(0, 3).map(
                            (product) => (
                              <div
                                key={product.id}
                                className="create-offer-selected-card"
                              >
                                <button
                                  type="button"
                                  className="create-offer-selected-remove"
                                  onClick={() =>
                                    setSelectedProductIds(
                                      selectedProductIds.filter(
                                        (id) => id !== String(product.id),
                                      ),
                                    )
                                  }
                                  aria-label={`Remove ${product.name}`}
                                >
                                  <X size={14} />
                                </button>
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="create-offer-selected-image"
                                />
                                <div className="create-offer-selected-name">
                                  {product.name}
                                </div>
                                <div className="create-offer-selected-price">
                                  {product.price}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        <div className="create-offer-selected-count">
                          {selectedProductIds.length} product
                          {selectedProductIds.length > 1 ? "s" : ""}{" "}
                          selected
                        </div>
                        <button
                          onClick={() => setShowProductModal(true)}
                          className="create-offer-selected-edit"
                          type="button"
                        >
                          Edit products
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="create-offer-section-heading">
                      Buy more, save more
                    </h3>

                    <div className="create-offer-discount-card">
                      <div className="create-offer-discount-body">
                        <div className="create-offer-discount-form-row">
                          <label className="create-offer-label">
                            Discount for 2 items (%)
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              className="create-offer-input"
                              value={
                                discountRules.find((r) => r.count === 2)
                                  ?.discountPercent ?? 15
                              }
                              onChange={(e) => {
                                const parsedValue = Number(e.target.value);
                                const nextPercent =
                                  Number.isFinite(parsedValue) &&
                                  parsedValue >= 0
                                    ? Math.max(
                                        0,
                                        Math.min(100, parsedValue),
                                      )
                                    : 0;
                                setDiscountRules((prev) =>
                                  prev.map((r) =>
                                    r.count === 2
                                      ? { ...r, discountPercent: nextPercent }
                                      : r,
                                  ),
                                );
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="create-offer-discount-card">
                      <div className="create-offer-discount-body">
                        <div className="create-offer-discount-form-row">
                          <label className="create-offer-label">
                            Discount for 3 items (%)
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="1"
                              className="create-offer-input"
                              value={
                                discountRules.find((r) => r.count === 3)
                                  ?.discountPercent ?? 15
                              }
                              onChange={(e) => {
                                const parsedValue = Number(e.target.value);
                                const nextPercent =
                                  Number.isFinite(parsedValue) &&
                                  parsedValue >= 0
                                    ? Math.max(
                                        0,
                                        Math.min(100, parsedValue),
                                      )
                                    : 0;
                                setDiscountRules((prev) =>
                                  prev.map((r) =>
                                    r.count === 3
                                      ? { ...r, discountPercent: nextPercent }
                                      : r,
                                  ),
                                );
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="create-offer-sticky-preview">
                  <h3 className="create-offer-section-heading">
                    Preview
                  </h3>
                  <p className="polaris-text-subdued create-offer-text-subdued">
                    {
                      offerTypes.find(
                        (type) => type.id === offerType,
                      )?.description
                    }
                  </p>
                  <div className="create-offer-preview-card">
                    {offerType === "quantity-breaks-same" && (
                      <>
                        <div
                              className="create-offer-pricing-card create-offer-pricing-card--readonly"
                        >
                          <div className="create-offer-pricing-header">
                            <input
                              type="radio"
                                  checked={false}
                              readOnly
                              disabled
                              className="create-offer-radio"
                            />
                            <div className="create-offer-pricing-title">
                              <strong>Single</strong>
                              <div className="create-offer-pricing-subtitle">
                                Standard price
                              </div>
                            </div>
                            <strong className="create-offer-pricing-price">
                              €65,00
                            </strong>
                          </div>
                        </div>
                        <div
                              className="create-offer-pricing-card create-offer-pricing-card--primary create-offer-pricing-card--readonly create-offer-pricing-card--selected"
                        >
                          <div className="create-offer-pricing-badge">
                            Most Popular
                          </div>
                          <div className="create-offer-pricing-header">
                            <input
                              type="radio"
                                  checked={true}
                              readOnly
                              disabled
                              className="create-offer-radio"
                            />
                            <div className="create-offer-pricing-title">
                              <div className="create-offer-pricing-meta">
                                <strong>Duo</strong>
                                <span className="create-offer-pricing-save">
                                  SAVE €19,50
                                </span>
                              </div>
                              <div className="create-offer-pricing-subtitle">
                                You save{" "}
                                {discountRules[0]?.discountPercent ?? 15}%
                              </div>
                            </div>
                            <div className="create-offer-pricing-right">
                              <strong className="create-offer-pricing-price">
                                €110,50
                              </strong>
                              <div className="create-offer-pricing-original">
                                €130,00
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="create-offer-pricing-footer">
                          <strong>
                            Quantity breaks for the same product
                          </strong>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="create-offer-style-grid">
              <div>
                <h2 className="polaris-text-heading-md create-offer-section-title">
                  Style Design
                </h2>
                <p className="polaris-text-subdued">
                  Customize the appearance of your bundle widget
                </p>

                <div className="create-offer-layout-options">
                  <label className="create-offer-layout-label">
                    Layout Format
                  </label>
                  <div className="create-offer-layout-grid">
                    <div
                      className={`create-offer-layout-card ${
                        layoutFormat === "vertical"
                          ? "create-offer-layout-card--active"
                          : ""
                      }`}
                      onClick={() => setLayoutFormat("vertical")}
                    >
                      <div className="create-offer-layout-card-title">
                        Vertical Stack
                      </div>
                      <div className="create-offer-layout-card-desc">
                        Products stacked vertically
                      </div>
                    </div>
                    <div
                      className={`create-offer-layout-card ${
                        layoutFormat === "horizontal"
                          ? "create-offer-layout-card--active"
                          : ""
                      }`}
                      onClick={() => setLayoutFormat("horizontal")}
                    >
                      <div className="create-offer-layout-card-title">
                        Horizontal Grid
                      </div>
                      <div className="create-offer-layout-card-desc">
                        Products in a row
                      </div>
                    </div>
                    <div
                      className={`create-offer-layout-card ${
                        layoutFormat === "card"
                          ? "create-offer-layout-card--active"
                          : ""
                      }`}
                      onClick={() => setLayoutFormat("card")}
                    >
                      <div className="create-offer-layout-card-title">
                        Card Grid
                      </div>
                      <div className="create-offer-layout-card-desc">
                        2x2 grid layout
                      </div>
                    </div>
                    <div
                      className={`create-offer-layout-card ${
                        layoutFormat === "compact"
                          ? "create-offer-layout-card--active"
                          : ""
                      }`}
                      onClick={() => setLayoutFormat("compact")}
                    >
                      <div className="create-offer-layout-card-title">
                        Compact List
                      </div>
                      <div className="create-offer-layout-card-desc">
                        Condensed view
                      </div>
                    </div>
                  </div>
                </div>

                <div className="create-offer-card-colors">
                  <h3 className="create-offer-section-heading">
                    Card Colors
                  </h3>
                  <div className="polaris-grid">
                    <label
                      className="create-offer-label"
                    >
                      Card Background Color
                      <input
                        type="color"
                        value={cardBackgroundColor}
                        onChange={(e) =>
                          setCardBackgroundColor(e.target.value)
                        }
                        className="create-offer-color-input"
                      />
                    </label>
                    <label
                      className="create-offer-label"
                    >
                      Accent Color
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="create-offer-color-input"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="create-offer-sticky-preview">
                <h3 className="create-offer-section-heading">
                  Preview
                </h3>
                <p className="polaris-text-subdued create-offer-text-subdued">
                  {
                    offerTypes.find(
                      (type) => type.id === offerType,
                    )?.description
                  }
                </p>
                <div className="create-offer-preview-card">
                  <div
                    className="create-offer-style-preview-header"
                    style={{ color: accentColor }}
                  >
                    Bundle & Save
                  </div>
                  <div
                    className={`create-offer-style-preview-list create-offer-style-preview-list--${layoutFormat}`}
                  >
                    <div
                      className="create-offer-style-preview-item"
                      style={{ background: cardBackgroundColor }}
                    >
                      <div className="create-offer-style-preview-item-title">
                        Single
                      </div>
                      <div className="create-offer-style-preview-item-subtitle">
                        Standard price
                      </div>
                      <div className="create-offer-style-preview-item-price">
                        €65,00
                      </div>
                    </div>
                    <div
                      className="create-offer-style-preview-item create-offer-style-preview-item--featured"
                      style={{
                        background: cardBackgroundColor,
                        borderColor: accentColor,
                      }}
                    >
                      <div
                        className="create-offer-style-preview-badge"
                        style={{ background: accentColor }}
                      >
                        Most Popular
                      </div>
                      <div className="create-offer-style-preview-item-title">
                        Duo
                      </div>
                      <div className="create-offer-style-preview-item-subtitle">
                        Buy more, save more
                      </div>
                      <div className="create-offer-style-preview-item-price">
                        €110,50
                      </div>
                      <div className="create-offer-style-preview-item-original">
                        €130,00
                      </div>
                    </div>
                    <div
                      className="create-offer-style-preview-item"
                      style={{ background: cardBackgroundColor }}
                    >
                      <div className="create-offer-style-preview-item-title">
                        Trio
                      </div>
                      <div className="create-offer-style-preview-item-subtitle">
                        Extra savings
                      </div>
                      <div className="create-offer-style-preview-item-price">
                        €149,00
                      </div>
                    </div>
                    <div
                      className="create-offer-style-preview-item"
                      style={{ background: cardBackgroundColor }}
                    >
                      <div className="create-offer-style-preview-item-title">
                        Pack of 4
                      </div>
                      <div className="create-offer-style-preview-item-subtitle">
                        Best value
                      </div>
                      <div className="create-offer-style-preview-item-price">
                        €185,00
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="polaris-text-heading-md create-offer-section-title">
                Targeting & Settings
              </h2>

              <div className="create-offer-section">
                <h3 className="create-offer-section-heading">
                  Target Audience
                </h3>
                <div className="polaris-stack polaris-stack--vertical">
                  <label
                    className="create-offer-label"
                  >
                    Customer Segments
                    <div className="create-offer-checkbox-grid">
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          name="customerSegments"
                          value="all"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          All Customers
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="customerSegments"
                          value="vip"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          VIP Customers
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="customerSegments"
                          value="new"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          New Customers
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="customerSegments"
                          value="returning"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Returning Customers
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="customerSegments"
                          value="high-value"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          High-Value Customers
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="customerSegments"
                          value="at-risk"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          At-Risk Customers
                        </span>
                      </label>
                    </div>
                    <p className="create-offer-helper-text">
                      Select one or more customer segments to target
                    </p>
                  </label>

                  <label
                    className="create-offer-label create-offer-label--mt"
                  >
                    Market Visibility
                    <div className="create-offer-checkbox-grid">
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          name="markets"
                          value="all"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          All Markets
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="markets"
                          value="us"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          United States
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="markets"
                          value="eu"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Europe
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="markets"
                          value="uk"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          United Kingdom
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="markets"
                          value="ca"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Canada
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="markets"
                          value="au"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Australia
                        </span>
                      </label>
                      <label
                        className="create-offer-checkbox-label"
                      >
                        <input
                          type="checkbox"
                          name="markets"
                          value="apac"
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Asia Pacific
                        </span>
                      </label>
                    </div>
                    <p className="create-offer-helper-text">
                      Select which markets can see this offer
                    </p>
                  </label>
                </div>
              </div>

              <div className="create-offer-section">
                <h3 className="create-offer-section-heading">
                  Schedule
                </h3>
                <div className="polaris-grid create-offer-schedule-grid">
                  <label
                    className="create-offer-label"
                  >
                    Start Time
                    <input
                      ref={startTimeInputRef}
                      type="datetime-local"
                      step="1"
                      className="create-offer-datetime"
                      name="startTime"
                      value={startTime}
                      onClick={() => {
                        openDateTimePicker(startTimeInputRef.current);
                      }}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        if (startTimeError && e.target.value) {
                          setStartTimeError("");
                        }
                      }}
                      required
                    />
                    {startTimeError ? (
                      <p className="create-offer-error-text">
                        {startTimeError}
                      </p>
                    ) : (
                      <p className="create-offer-helper-text">
                        When the offer becomes active
                      </p>
                    )}
                  </label>
                  <label
                    className="create-offer-label"
                  >
                    End Time
                    <input
                      ref={endTimeInputRef}
                      type="datetime-local"
                      step="1"
                      className="create-offer-datetime"
                      name="endTime"
                      value={endTime}
                      onClick={() => {
                        openDateTimePicker(endTimeInputRef.current);
                      }}
                      onChange={(e) => {
                        setEndTime(e.target.value);
                        if (endTimeError && e.target.value) {
                          setEndTimeError("");
                        }
                      }}
                      required
                    />
                    {endTimeError ? (
                      <p className="create-offer-error-text">
                        {endTimeError}
                      </p>
                    ) : (
                      <p className="create-offer-helper-text">
                        When the offer expires
                      </p>
                    )}
                  </label>
                </div>
              </div>

              <div className="create-offer-section">
                <h3 className="create-offer-section-heading">
                  Budget
                </h3>
                <div className="polaris-grid create-offer-budget-grid">
                  <label
                    className="create-offer-label"
                  >
                    Total Budget (Optional)
                    <input
                      type="number"
                      placeholder="$0.00"
                      className="create-offer-input"
                      name="totalBudget"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                    />
                    <p className="create-offer-helper-text">
                      Maximum total spend for this offer
                    </p>
                  </label>
                  <label
                    className="create-offer-label"
                  >
                    Daily Budget (Optional)
                    <input
                      type="number"
                      placeholder="$0.00"
                      className="create-offer-input"
                      name="dailyBudget"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                    />
                    <p className="create-offer-helper-text">
                      Maximum spend per day
                    </p>
                  </label>
                </div>
              </div>

              <div className="create-offer-section">
                <h3 className="create-offer-section-heading">
                  Risk Control
                </h3>
                <div className="polaris-stack polaris-stack--vertical">
                  <label
                    className="create-offer-label"
                  >
                    Usage Limit Per Customer
                    <select
                      defaultValue={
                        offerSettings.usageLimitPerCustomer ??
                        "unlimited"
                      }
                      name="usageLimitPerCustomer"
                      className="create-offer-select"
                    >
                      <option value="unlimited">Unlimited</option>
                      <option value="1">1 time only</option>
                      <option value="2">2 times</option>
                      <option value="3">3 times</option>
                      <option value="5">5 times</option>
                      <option value="10">10 times</option>
                      <option value="custom">Custom...</option>
                    </select>
                    <p className="create-offer-helper-text">
                      How many times each customer can use this offer
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="create-offer-bottom-bar">
        {step > 1 && (
          <button
            className="polaris-button polaris-button--plain"
            onClick={() => setStep(step - 1)}
            type="button"
          >
            Previous
          </button>
        )}
        <button
          className="polaris-button"
          onClick={() => {
            if (step === 1) {
              if (!offerName.trim()) {
                setOfferNameError("Offer Name is required.");
                return;
              }
              setOfferNameError("");
              setStep(2);
              return;
            }

            if (step < 4) {
              setStep(step + 1);
              return;
            }

            // step === 4, validate schedule fields before creating
            let hasError = false;
            if (!startTime) {
              setStartTimeError("Start Time is required.");
              hasError = true;
            } else {
              setStartTimeError("");
            }
            if (!endTime) {
              setEndTimeError("End Time is required.");
              hasError = true;
            } else {
              setEndTimeError("");
            }

            if (hasError) {
              return;
            }
          }}
          type={step === 4 ? "submit" : "button"}
        >
          {step === 4
            ? initialOffer
              ? "Update Offer"
              : "Create Offer"
            : "Next"}
        </button>
      </div>
    </Form>
  );
}

