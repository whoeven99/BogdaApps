import { useState } from "react";
import { Form } from "react-router";
import {
  X,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import "./CreateNewOffer.css";

type DiscountRule = {
  id: number;
  isExpanded: boolean;
  title: string;
  buyQty: number;
  getQty: number;
  priceType: string;
  subtitle: string;
  badgeText: string;
  badgeStyle: string;
  label: string;
  selectedByDefault: boolean;
  showAsSoldOut: boolean;
};

type Product = {
  id: number;
  name: string;
  price: string;
  image: string;
};

interface InitialOffer {
  id: string;
  name: string;
  offerType: string;
  pricingOption: "single" | "duo";
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  startTime: string;
  endTime: string;
  totalBudget: number | null;
  dailyBudget: number | null;
  customerSegments: string | null;
  markets: string | null;
  usageLimitPerCustomer: string;
  selectedProductsJson: string | null;
  discountRulesJson: string | null;
}

interface CreateNewOfferProps {
  onBack?: () => void;
  initialOffer?: InitialOffer;
}

function formatForDateTimeLocal(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function CreateNewOffer({ onBack, initialOffer }: CreateNewOfferProps) {
  const [step, setStep] = useState(1);
  const [offerType, setOfferType] = useState(
    initialOffer?.offerType ?? "quantity-breaks-same",
  );
  const [offerName, setOfferName] = useState(initialOffer?.name ?? "");
  const [offerNameError, setOfferNameError] = useState("");
  const [startTime, setStartTime] = useState(
    initialOffer ? formatForDateTimeLocal(initialOffer.startTime) : "",
  );
  const [endTime, setEndTime] = useState(
    initialOffer ? formatForDateTimeLocal(initialOffer.endTime) : "",
  );
  const [startTimeError, setStartTimeError] = useState("");
  const [endTimeError, setEndTimeError] = useState("");
  const [productSelection, setProductSelection] = useState(
    "specific-selected",
  );
  const [pricingOption, setPricingOption] = useState<"single" | "duo">(
    initialOffer?.pricingOption ?? "duo",
  );
  const [layoutFormat, setLayoutFormat] = useState<
    "vertical" | "horizontal" | "card" | "compact"
  >(initialOffer?.layoutFormat ?? "vertical");
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>(
    initialOffer?.selectedProductsJson
      ? (JSON.parse(initialOffer.selectedProductsJson) as Product[])
      : [],
  );
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(
    initialOffer?.discountRulesJson
      ? (JSON.parse(initialOffer.discountRulesJson) as DiscountRule[])
      : [
          {
            id: 1,
            isExpanded: true,
            title: "Buy 1, get 1 free",
            buyQty: 1,
            getQty: 1,
            priceType: "default",
            subtitle: "",
            badgeText: "",
            badgeStyle: "simple",
            label: "SAVE {{saved_percentage}}",
            selectedByDefault: true,
            showAsSoldOut: false,
          },
        ],
  );

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
    {
      id: "bogo",
      name: "Buy X, get Y free (BOGO) deal",
      description:
        "Create buy-one-get-one or buy-X-get-Y-free promotions",
    },
    {
      id: "quantity-breaks-different",
      name: "Quantity breaks for different products",
      description:
        "Offer discounts when customers buy multiple different products together",
    },
    {
      id: "complete-bundle",
      name: "Complete the bundle",
      description:
        "Encourage customers to complete a bundle by adding recommended products",
    },
    {
      id: "subscription",
      name: "Subscription",
      description:
        "Offer recurring subscription discounts for regular deliveries",
    },
    {
      id: "progressive-gifts",
      name: "Progressive gifts",
      description:
        "Unlock free gifts as customers add more items to their cart",
    },
  ];

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
      <input type="hidden" name="name" value={offerName} />
      <input type="hidden" name="offerType" value={offerType} />
      <input type="hidden" name="pricingOption" value={pricingOption} />
      <input type="hidden" name="layoutFormat" value={layoutFormat} />
      <input
        type="hidden"
        name="selectedProductsJson"
        value={JSON.stringify(selectedProducts)}
      />
      <input
        type="hidden"
        name="discountRulesJson"
        value={JSON.stringify(discountRules)}
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
                        className={`create-offer-pricing-card ${
                          pricingOption === "single"
                            ? "create-offer-pricing-card--selected"
                            : ""
                        }`}
                        onClick={() => setPricingOption("single")}
                      >
                        <div className="create-offer-pricing-header">
                          <input
                            type="radio"
                            checked={pricingOption === "single"}
                            readOnly
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
                        className={`create-offer-pricing-card create-offer-pricing-card--primary ${
                          pricingOption === "duo"
                            ? "create-offer-pricing-card--selected"
                            : ""
                        }`}
                        onClick={() => setPricingOption("duo")}
                      >
                        <div className="create-offer-pricing-badge">
                          Most Popular
                        </div>
                        <div className="create-offer-pricing-header">
                          <input
                            type="radio"
                            checked={pricingOption === "duo"}
                            readOnly
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
                    />

                  <div className="create-offer-modal-products">
                      {[
                        {
                          id: 1,
                          name: "Product A",
                          price: "€65.00",
                          image: "https://via.placeholder.com/60",
                        },
                        {
                          id: 2,
                          name: "Product B",
                          price: "€75.00",
                          image: "https://via.placeholder.com/60",
                        },
                        {
                          id: 3,
                          name: "Product C",
                          price: "€85.00",
                          image: "https://via.placeholder.com/60",
                        },
                      ].map((product) => (
                        <div
                          key={product.id}
                        className="create-offer-modal-product"
                          onClick={() => {
                            if (
                              !selectedProducts.find(
                                (p) => p.id === product.id,
                              )
                            ) {
                              setSelectedProducts([
                                ...selectedProducts,
                                product,
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
                            checked={selectedProducts.some(
                              (p) => p.id === product.id,
                            )}
                            readOnly
                          className="create-offer-modal-product-checkbox"
                          />
                        </div>
                      ))}
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

                    {selectedProducts.length === 0 ? (
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
                          {selectedProducts.length} product
                          {selectedProducts.length > 1 ? "s" : ""}{" "}
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
                      Discount rules
                    </h3>

                    {discountRules.map((rule, index) => (
                      <div
                        key={rule.id}
                        className="create-offer-discount-card"
                      >
                        <div
                          className={`create-offer-discount-header ${
                            rule.isExpanded
                              ? "create-offer-discount-header--expanded"
                              : ""
                          }`}
                          onClick={() => {
                            const newRules = [...discountRules];
                            newRules[index].isExpanded =
                              !newRules[index].isExpanded;
                            setDiscountRules(newRules);
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>🎯</span>
                          <span className="create-offer-discount-title">
                            Bar #{index + 1} - {rule.title}
                          </span>

                          <div
                            className="create-offer-discount-actions"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              disabled={index === 0}
                              onClick={() => {
                                if (index > 0) {
                                  const newRules = [
                                    ...discountRules,
                                  ];
                                  [
                                    newRules[index],
                                    newRules[index - 1],
                                  ] = [
                                    newRules[index - 1],
                                    newRules[index],
                                  ];
                                  setDiscountRules(newRules);
                                }
                              }}
                              className={`create-offer-icon-button ${
                                index === 0
                                  ? "create-offer-icon-button--disabled"
                                  : ""
                              }`}
                              type="button"
                            >
                              <ArrowUp size={18} />
                            </button>
                            <button
                              disabled={
                                index === discountRules.length - 1
                              }
                              onClick={() => {
                                if (
                                  index <
                                  discountRules.length - 1
                                ) {
                                  const newRules = [
                                    ...discountRules,
                                  ];
                                  [
                                    newRules[index],
                                    newRules[index + 1],
                                  ] = [
                                    newRules[index + 1],
                                    newRules[index],
                                  ];
                                  setDiscountRules(newRules);
                                }
                              }}
                              className={`create-offer-icon-button ${
                                index === discountRules.length - 1
                                  ? "create-offer-icon-button--disabled"
                                  : ""
                              }`}
                              type="button"
                            >
                              <ArrowDown size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setDiscountRules([
                                  ...discountRules,
                                  {
                                    ...rule,
                                    id: Date.now(),
                                    isExpanded: false,
                                  },
                                ]);
                              }}
                              className="create-offer-icon-button"
                              type="button"
                            >
                              <Copy size={18} />
                            </button>
                            <button
                              onClick={() => {
                                setDiscountRules(
                                  discountRules.filter(
                                    (_, i) => i !== index,
                                  ),
                                );
                              }}
                              className="create-offer-icon-button create-offer-icon-button--danger"
                              type="button"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          {rule.isExpanded ? (
                            <ChevronUp size={20} />
                          ) : (
                            <ChevronDown size={20} />
                          )}
                        </div>
                      </div>
                    ))}
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
                          className={`create-offer-pricing-card ${
                            pricingOption === "single"
                              ? "create-offer-pricing-card--selected"
                              : ""
                          }`}
                          onClick={() => setPricingOption("single")}
                        >
                          <div className="create-offer-pricing-header">
                            <input
                              type="radio"
                              checked={pricingOption === "single"}
                              readOnly
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
                          className={`create-offer-pricing-card create-offer-pricing-card--primary ${
                            pricingOption === "duo"
                              ? "create-offer-pricing-card--selected"
                              : ""
                          }`}
                          onClick={() => setPricingOption("duo")}
                        >
                          <div className="create-offer-pricing-badge">
                            Most Popular
                          </div>
                          <div className="create-offer-pricing-header">
                            <input
                              type="radio"
                              checked={pricingOption === "duo"}
                              readOnly
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
                        defaultValue="#ffffff"
                        className="create-offer-color-input"
                      />
                    </label>
                    <label
                      className="create-offer-label"
                    >
                      Accent Color
                      <input
                        type="color"
                        defaultValue="#008060"
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
                  {/* 这里可以按需补充更详细的样式预览 */}
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
                      type="datetime-local"
                      step="1"
                      className="create-offer-datetime"
                      name="startTime"
                      value={startTime}
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
                      type="datetime-local"
                      step="1"
                      className="create-offer-datetime"
                      name="endTime"
                      value={endTime}
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
                      defaultValue="unlimited"
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

