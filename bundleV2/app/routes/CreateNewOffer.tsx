import { useState } from "react";
import {
  X,
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

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

interface CreateNewOfferProps {
  onBack?: () => void;
}

export function CreateNewOffer({ onBack }: CreateNewOfferProps) {
  const [step, setStep] = useState(1);
  const [offerType, setOfferType] = useState("quantity-breaks-same");
  const [productSelection, setProductSelection] = useState(
    "specific-selected",
  );
  const [pricingOption, setPricingOption] = useState<"single" | "duo">("duo");
  const [layoutFormat, setLayoutFormat] = useState<
    "vertical" | "horizontal" | "card" | "compact"
  >("vertical");
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([
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
  ]);

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
    <div className="polaris-page">
      <div className="polaris-page__header">
        <div>
          <button
            className="polaris-button polaris-button--plain"
            onClick={onBack}
            type="button"
          >
            ← Back
          </button>
          <h1 className="polaris-page__title">Create New Offer</h1>
        </div>
      </div>

      <div className="polaris-card" style={{ marginBottom: "80px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "8px",
            marginBottom: "24px",
          }}
          className="sm:flex sm:gap-[12px]"
        >
          {steps.map((stepName, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                padding: "10px 8px",
                background: step === index + 1 ? "#008060" : "#f4f6f8",
                color: step === index + 1 ? "white" : "#6d7175",
                borderRadius: "6px",
                textAlign: "center",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
              }}
              className="sm:text-[14px] sm:p-[12px]"
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: "24px",
                alignItems: "start",
              }}
              className="lg:grid-cols-[1fr_400px]"
            >
              <div>
                <h2
                  className="polaris-text-heading-md"
                  style={{ marginBottom: "16px" }}
                >
                  Basic Information
                </h2>
                <div className="polaris-stack polaris-stack--vertical">
                  <label
                    style={{ fontSize: "14px", fontWeight: 500 }}
                  >
                    Offer Name
                    <input
                      type="text"
                      placeholder="e.g., Summer Bundle Deal"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                  </label>

                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      marginTop: "16px",
                    }}
                  >
                    Offer Type
                    <select
                      value={offerType}
                      onChange={(e) =>
                        setOfferType(e.target.value)
                      }
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
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

              <div style={{ position: "sticky", top: "24px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "12px",
                  }}
                >
                  Preview
                </h3>
                <p
                  className="polaris-text-subdued"
                  style={{ fontSize: "13px", marginBottom: "12px" }}
                >
                  {
                    offerTypes.find(
                      (type) => type.id === offerType,
                    )?.description
                  }
                </p>

                <div
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    border: "1px solid #dfe3e8",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {offerType === "quantity-breaks-same" && (
                    <>
                      <div
                        style={{
                          border:
                            pricingOption === "single"
                              ? "2px solid #000"
                              : "1px solid #e0e0e0",
                          borderRadius: "8px",
                          padding: "12px",
                          marginBottom: "12px",
                          background: "#f9fafb",
                          cursor: "pointer",
                        }}
                        onClick={() => setPricingOption("single")}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                            <input
                              type="radio"
                              checked={pricingOption === "single"}
                              readOnly
                              style={{ width: "16px", height: "16px" }}
                            />
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: "14px" }}>
                              Single
                            </strong>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6d7175",
                              }}
                            >
                              Standard price
                            </div>
                          </div>
                          <strong style={{ fontSize: "16px" }}>
                            €65,00
                          </strong>
                        </div>
                      </div>
                      <div
                        style={{
                          border:
                            pricingOption === "duo"
                              ? "2px solid #000"
                              : "1px solid #e0e0e0",
                          borderRadius: "8px",
                          padding: "12px",
                          position: "relative",
                          background: "#ffffff",
                          cursor: "pointer",
                        }}
                        onClick={() => setPricingOption("duo")}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "12px",
                            background: "#000",
                            color: "#fff",
                            padding: "2px 12px",
                            borderRadius: "12px",
                            fontSize: "10px",
                            fontWeight: 600,
                          }}
                        >
                          Most Popular
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                          }}
                        >
                            <input
                              type="radio"
                              checked={pricingOption === "duo"}
                              readOnly
                              style={{ width: "16px", height: "16px" }}
                            />
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: "8px",
                                alignItems: "center",
                                flexWrap: "wrap",
                              }}
                            >
                              <strong style={{ fontSize: "14px" }}>
                                Duo
                              </strong>
                              <span
                                style={{
                                  background: "#f0f0f0",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                }}
                              >
                                SAVE €19,50
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6d7175",
                              }}
                            >
                              You save 15%
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <strong style={{ fontSize: "16px" }}>
                              €110,50
                            </strong>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#6d7175",
                                textDecoration: "line-through",
                              }}
                            >
                              €130,00
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{ marginTop: "auto", padding: "12px 0" }}>
                        <strong style={{ fontSize: "13px" }}>
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
                <div
                  style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1000,
                  }}
                >
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: "12px",
                      width: "90%",
                      maxWidth: "800px",
                      maxHeight: "90vh",
                      overflow: "auto",
                      padding: "24px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "20px",
                      }}
                    >
                      <h2
                        style={{
                          fontSize: "18px",
                          fontWeight: 600,
                        }}
                      >
                        Select Products
                      </h2>
                      <button
                        onClick={() => setShowProductModal(false)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                        type="button"
                      >
                        <X size={24} />
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Search products..."
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        marginBottom: "16px",
                        fontSize: "14px",
                      }}
                    />

                    <div
                      style={{
                        display: "grid",
                        gap: "12px",
                        marginBottom: "20px",
                      }}
                    >
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
                          style={{
                            display: "flex",
                            gap: "12px",
                            padding: "12px",
                            border: "1px solid #dfe3e8",
                            borderRadius: "8px",
                            cursor: "pointer",
                          }}
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
                            style={{
                              width: "60px",
                              height: "60px",
                              borderRadius: "6px",
                            }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500 }}>
                              {product.name}
                            </div>
                            <div
                              style={{
                                color: "#6d7175",
                                fontSize: "14px",
                              }}
                            >
                              {product.price}
                            </div>
                          </div>
                          <input
                            type="checkbox"
                            checked={selectedProducts.some(
                              (p) => p.id === product.id,
                            )}
                            readOnly
                            style={{ width: "20px", height: "20px" }}
                          />
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowProductModal(false)}
                      style={{
                        width: "100%",
                        background: "#2b2b2b",
                        color: "#fff",
                        padding: "12px",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                      type="button"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 400px",
                  gap: "24px",
                  alignItems: "start",
                }}
              >
                <div>
                  <h2
                    className="polaris-text-heading-md"
                    style={{ marginBottom: "16px" }}
                  >
                    Products & Discounts
                  </h2>

                  <div style={{ marginBottom: "32px" }}>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        marginBottom: "12px",
                      }}
                    >
                      Products eligible for offer
                    </h3>

                    {selectedProducts.length === 0 ? (
                      <button
                        onClick={() => setShowProductModal(true)}
                        style={{
                          width: "100%",
                          background: "#ffffff",
                          color: "#202223",
                          padding: "14px 20px",
                          fontSize: "14px",
                          fontWeight: 500,
                          border: "1px solid #dfe3e8",
                          borderRadius: "8px",
                          cursor: "pointer",
                        }}
                        type="button"
                      >
                        Add products eligible for offer
                      </button>
                    ) : (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            gap: "12px",
                            marginBottom: "12px",
                          }}
                        >
                          {selectedProducts.slice(0, 3).map(
                            (product) => (
                              <div
                                key={product.id}
                                style={{
                                  border: "1px solid #dfe3e8",
                                  borderRadius: "8px",
                                  padding: "8px",
                                  textAlign: "center",
                                  flex: 1,
                                }}
                              >
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  style={{
                                    width: "60px",
                                    height: "60px",
                                    borderRadius: "6px",
                                    marginBottom: "8px",
                                  }}
                                />
                                <div
                                  style={{
                                    fontSize: "12px",
                                    fontWeight: 500,
                                  }}
                                >
                                  {product.name}
                                </div>
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "#6d7175",
                                  }}
                                >
                                  {product.price}
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#6d7175",
                            marginBottom: "12px",
                          }}
                        >
                          {selectedProducts.length} product
                          {selectedProducts.length > 1 ? "s" : ""}{" "}
                          selected
                        </div>
                        <button
                          onClick={() => setShowProductModal(true)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#008060",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: 500,
                            padding: 0,
                          }}
                          type="button"
                        >
                          Edit products
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                        marginBottom: "12px",
                      }}
                    >
                      Discount rules
                    </h3>

                    {discountRules.map((rule, index) => (
                      <div
                        key={rule.id}
                        style={{
                          border: "1px solid #dfe3e8",
                          borderRadius: "8px",
                          marginBottom: "16px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            padding: "16px",
                            background: rule.isExpanded
                              ? "#f9fafb"
                              : "#fff",
                            borderBottom: rule.isExpanded
                              ? "1px solid #dfe3e8"
                              : "none",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            const newRules = [...discountRules];
                            newRules[index].isExpanded =
                              !newRules[index].isExpanded;
                            setDiscountRules(newRules);
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>🎯</span>
                          <span
                            style={{
                              flex: 1,
                              fontSize: "14px",
                              fontWeight: 500,
                            }}
                          >
                            Bar #{index + 1} - {rule.title}
                          </span>

                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                            }}
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
                              style={{
                                background: "none",
                                border: "none",
                                cursor:
                                  index === 0
                                    ? "not-allowed"
                                    : "pointer",
                                opacity: index === 0 ? 0.3 : 1,
                                padding: "4px",
                              }}
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
                              style={{
                                background: "none",
                                border: "none",
                                cursor:
                                  index ===
                                  discountRules.length - 1
                                    ? "not-allowed"
                                    : "pointer",
                                opacity:
                                  index ===
                                  discountRules.length - 1
                                    ? 0.3
                                    : 1,
                                padding: "4px",
                              }}
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
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                              }}
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
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                color: "#d72c0d",
                              }}
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

                <div
                  style={{
                    position: "sticky",
                    top: "24px",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      marginBottom: "12px",
                    }}
                  >
                    Preview
                  </h3>
                  <p
                    className="polaris-text-subdued"
                    style={{ fontSize: "13px", marginBottom: "12px" }}
                  >
                    {
                      offerTypes.find(
                        (type) => type.id === offerType,
                      )?.description
                    }
                  </p>
                  <div
                    style={{
                      width: "100%",
                      minHeight: "300px",
                      border: "1px solid #dfe3e8",
                      borderRadius: "8px",
                      padding: "16px",
                      background: "#ffffff",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {offerType === "quantity-breaks-same" && (
                      <>
                        <div
                          style={{
                            border:
                              pricingOption === "single"
                                ? "2px solid #000"
                                : "1px solid #e0e0e0",
                            borderRadius: "8px",
                            padding: "12px",
                            marginBottom: "12px",
                            background: "#f9fafb",
                            cursor: "pointer",
                          }}
                          onClick={() => setPricingOption("single")}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <input
                              type="radio"
                              checked={pricingOption === "single"}
                              readOnly
                              style={{
                                width: "16px",
                                height: "16px",
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <strong style={{ fontSize: "14px" }}>
                                Single
                              </strong>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#6d7175",
                                }}
                              >
                                Standard price
                              </div>
                            </div>
                            <strong style={{ fontSize: "16px" }}>
                              €65,00
                            </strong>
                          </div>
                        </div>
                        <div
                          style={{
                            border:
                              pricingOption === "duo"
                                ? "2px solid #000"
                                : "1px solid #e0e0e0",
                            borderRadius: "8px",
                            padding: "12px",
                            position: "relative",
                            background: "#ffffff",
                            cursor: "pointer",
                          }}
                          onClick={() => setPricingOption("duo")}
                        >
                          <div
                            style={{
                              position: "absolute",
                              top: "-8px",
                              right: "12px",
                              background: "#000",
                              color: "#fff",
                              padding: "2px 12px",
                              borderRadius: "12px",
                              fontSize: "10px",
                              fontWeight: 600,
                            }}
                          >
                            Most Popular
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <input
                              type="radio"
                              checked={pricingOption === "duo"}
                              readOnly
                              style={{
                                width: "16px",
                                height: "16px",
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                }}
                              >
                                <strong style={{ fontSize: "14px" }}>
                                  Duo
                                </strong>
                                <span
                                  style={{
                                    background: "#f0f0f0",
                                    padding: "2px 6px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                  }}
                                >
                                  SAVE €19,50
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#6d7175",
                                }}
                              >
                                You save 15%
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <strong style={{ fontSize: "16px" }}>
                                €110,50
                              </strong>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#6d7175",
                                  textDecoration: "line-through",
                                }}
                              >
                                €130,00
                              </div>
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            marginTop: "auto",
                            padding: "12px 0",
                          }}
                        >
                          <strong style={{ fontSize: "13px" }}>
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
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 400px",
                gap: "24px",
                alignItems: "start",
              }}
            >
              <div>
                <h2
                  className="polaris-text-heading-md"
                  style={{ marginBottom: "16px" }}
                >
                  Style Design
                </h2>
                <p className="polaris-text-subdued">
                  Customize the appearance of your bundle widget
                </p>

                <div style={{ marginTop: "24px" }}>
                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      display: "block",
                      marginBottom: "12px",
                    }}
                  >
                    Layout Format
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, 1fr)",
                      gap: "12px",
                    }}
                  >
                    <div
                      style={{
                        border:
                          layoutFormat === "vertical"
                            ? "2px solid #008060"
                            : "2px solid #dfe3e8",
                        borderRadius: "8px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background:
                          layoutFormat === "vertical"
                            ? "#f0faf6"
                            : "#ffffff",
                      }}
                      onClick={() => setLayoutFormat("vertical")}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          marginBottom: "4px",
                        }}
                      >
                        Vertical Stack
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6d7175",
                        }}
                      >
                        Products stacked vertically
                      </div>
                    </div>
                    <div
                      style={{
                        border:
                          layoutFormat === "horizontal"
                            ? "2px solid #008060"
                            : "2px solid #dfe3e8",
                        borderRadius: "8px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background:
                          layoutFormat === "horizontal"
                            ? "#f0faf6"
                            : "#ffffff",
                      }}
                      onClick={() => setLayoutFormat("horizontal")}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          marginBottom: "4px",
                        }}
                      >
                        Horizontal Grid
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6d7175",
                        }}
                      >
                        Products in a row
                      </div>
                    </div>
                    <div
                      style={{
                        border:
                          layoutFormat === "card"
                            ? "2px solid #008060"
                            : "2px solid #dfe3e8",
                        borderRadius: "8px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background:
                          layoutFormat === "card"
                            ? "#f0faf6"
                            : "#ffffff",
                      }}
                      onClick={() => setLayoutFormat("card")}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          marginBottom: "4px",
                        }}
                      >
                        Card Grid
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6d7175",
                        }}
                      >
                        2x2 grid layout
                      </div>
                    </div>
                    <div
                      style={{
                        border:
                          layoutFormat === "compact"
                            ? "2px solid #008060"
                            : "2px solid #dfe3e8",
                        borderRadius: "8px",
                        padding: "16px",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        background:
                          layoutFormat === "compact"
                            ? "#f0faf6"
                            : "#ffffff",
                      }}
                      onClick={() => setLayoutFormat("compact")}
                    >
                      <div
                        style={{
                          fontWeight: 500,
                          marginBottom: "4px",
                        }}
                      >
                        Compact List
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#6d7175",
                        }}
                      >
                        Condensed view
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "24px" }}>
                  <h3
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      marginBottom: "12px",
                    }}
                  >
                    Card Colors
                  </h3>
                  <div className="polaris-grid">
                    <label
                      style={{ fontSize: "14px", fontWeight: 500 }}
                    >
                      Card Background Color
                      <input
                        type="color"
                        defaultValue="#ffffff"
                        style={{
                          width: "100%",
                          height: "40px",
                          marginTop: "8px",
                          border: "1px solid #dfe3e8",
                          borderRadius: "6px",
                        }}
                      />
                    </label>
                    <label
                      style={{
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      Accent Color
                      <input
                        type="color"
                        defaultValue="#008060"
                        style={{
                          width: "100%",
                          height: "40px",
                          marginTop: "8px",
                          border: "1px solid #dfe3e8",
                          borderRadius: "6px",
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: "sticky",
                  top: "24px",
                }}
              >
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "12px",
                  }}
                >
                  Preview
                </h3>
                <p
                  className="polaris-text-subdued"
                  style={{ fontSize: "13px", marginBottom: "12px" }}
                >
                  {
                    offerTypes.find(
                      (type) => type.id === offerType,
                    )?.description
                  }
                </p>
                <div
                  style={{
                    width: "100%",
                    minHeight: "300px",
                    border: "1px solid #dfe3e8",
                    borderRadius: "8px",
                    padding: "16px",
                    background: "#ffffff",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* 这里可以按需补充更详细的样式预览 */}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2
                className="polaris-text-heading-md"
                style={{ marginBottom: "16px" }}
              >
                Targeting & Settings
              </h2>

              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "12px",
                  }}
                >
                  Target Audience
                </h3>
                <div className="polaris-stack polaris-stack--vertical">
                  <label
                    style={{ fontSize: "14px", fontWeight: 500 }}
                  >
                    Customer Segments
                    <div
                      style={{
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        padding: "12px",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "12px",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          All Customers
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          VIP Customers
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          New Customers
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          Returning Customers
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          High-Value Customers
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          At-Risk Customers
                        </span>
                      </label>
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6d7175",
                        marginTop: "4px",
                      }}
                    >
                      Select one or more customer segments to target
                    </p>
                  </label>

                  <label
                    style={{
                      fontSize: "14px",
                      fontWeight: 500,
                      marginTop: "16px",
                    }}
                  >
                    Market Visibility
                    <div
                      style={{
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        padding: "12px",
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "12px",
                      }}
                    >
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          All Markets
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          United States
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          Europe
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          United Kingdom
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          Canada
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          Australia
                        </span>
                      </label>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          style={{
                            marginRight: "8px",
                            width: "16px",
                            height: "16px",
                          }}
                        />
                        <span style={{ fontSize: "14px" }}>
                          Asia Pacific
                        </span>
                      </label>
                    </div>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6d7175",
                        marginTop: "4px",
                      }}
                    >
                      Select which markets can see this offer
                    </p>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "12px",
                  }}
                >
                  Schedule
                </h3>
                <div className="polaris-grid">
                  <label
                    style={{ fontSize: "14px", fontWeight: 500 }}
                  >
                    Start Time
                    <input
                      type="datetime-local"
                      step="1"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6d7175",
                        marginTop: "4px",
                      }}
                    >
                      When the offer becomes active
                    </p>
                  </label>
                  <label
                    style={{ fontSize: "14px", fontWeight: 500 }}
                  >
                    End Time
                    <input
                      type="datetime-local"
                      step="1"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6d7175",
                        marginTop: "4px",
                      }}
                    >
                      When the offer expires
                    </p>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "12px",
                  }}
                >
                  Budget
                </h3>
                <div className="polaris-grid">
                  <label
                    style={{ fontSize: "14px", fontWeight: 500 }}
                  >
                    Total Budget (Optional)
                    <input
                      type="number"
                      placeholder="$0.00"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6d7175",
                        marginTop: "4px",
                      }}
                    >
                      Maximum total spend for this offer
                    </p>
                  </label>
                  <label
                    style={{ fontSize: "14px", fontWeight: 500 }}
                  >
                    Daily Budget (Optional)
                    <input
                      type="number"
                      placeholder="$0.00"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6d7175",
                        marginTop: "4px",
                      }}
                    >
                      Maximum spend per day
                    </p>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: "32px" }}>
                <h3
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "12px",
                  }}
                >
                  Risk Control
                </h3>
                <div className="polaris-stack polaris-stack--vertical">
                  <label
                    style={{ fontSize: "14px", fontWeight: 500 }}
                  >
                    Usage Limit Per Customer
                    <select
                      defaultValue="unlimited"
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        marginTop: "8px",
                        border: "1px solid #dfe3e8",
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                    >
                      <option value="unlimited">Unlimited</option>
                      <option value="1">1 time only</option>
                      <option value="2">2 times</option>
                      <option value="3">3 times</option>
                      <option value="5">5 times</option>
                      <option value="10">10 times</option>
                      <option value="custom">Custom...</option>
                    </select>
                    <p
                      style={{
                        fontSize: "12px",
                        color: "#6d7175",
                        marginTop: "4px",
                      }}
                    >
                      How many times each customer can use this offer
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#ffffff",
          borderTop: "1px solid #dfe3e8",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          zIndex: 100,
          boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.1)",
        }}
      >
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
            if (step < 4) {
              setStep(step + 1);
            } else if (onBack) {
              onBack();
            }
          }}
          type="button"
        >
          {step === 4 ? "Create Offer" : "Next"}
        </button>
      </div>
    </div>
  );
}

