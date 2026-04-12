import React, { useEffect, useRef, useState } from "react";
import { useFetcher, useNavigate, useSearchParams } from "react-router";
import {
  X,
} from "lucide-react";
import "./CreateNewOffer.css";
import BundlePreview from "./BundlePreview";

type DiscountRule = {
  // 数量阈值：例如 count=2 表示“买 2 件及以上”生效
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
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
  status: boolean;
}

interface CreateNewOfferProps {
  onBack?: () => void;
  initialOffer?: InitialOffer;
  storeProducts?: Product[];
  /** 当前店铺已有 offers，用于名称重复校验（与后台 normalize 规则一致） */
  existingOffers?: Array<{ id: string; name: string }>;
}

/** 与 `_index/route` action 错误响应一致，避免从 route 循环引用 */
type OfferActionErrorBody = {
  _offerActionError: true;
  message: string;
};

function isOfferActionErrorBody(data: unknown): data is OfferActionErrorBody {
  if (typeof data !== "object" || data === null) return false;
  const o = data as Record<string, unknown>;
  return (
    o._offerActionError === true && typeof o.message === "string"
  );
}

function normalizeOfferNameKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
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

function sanitizeHexColor(raw: unknown, fallback: string): string {
  const t = String(raw ?? "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(t)) return t.toLowerCase();
  if (/^#[0-9A-Fa-f]{3}$/.test(t)) {
    const r = t[1];
    const g = t[2];
    const b = t[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{8}$/.test(t)) return `#${t.slice(1, 7)}`.toLowerCase();
  return fallback;
}

function parseOfferSettings(
  offerSettingsJson?: string | null,
): {
  title: string;
  layoutFormat: "vertical" | "horizontal" | "card" | "compact";
  totalBudget: number | null;
  dailyBudget: number | null;
  customerSegments: string | null;
  markets: string | null;
  usageLimitPerCustomer: string;
  accentColor: string;
  cardBackgroundColor: string;
} {
  if (!offerSettingsJson) {
    return {
      title: "Bundle & Save",
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
      markets: null,
      usageLimitPerCustomer: "unlimited",
      accentColor: "#008060",
      cardBackgroundColor: "#ffffff",
    };
  }

  try {
    const parsed = JSON.parse(offerSettingsJson) as Partial<{
      title: string;
      layoutFormat: "vertical" | "horizontal" | "card" | "compact";
      totalBudget: number | null;
      dailyBudget: number | null;
      customerSegments: string | null;
      markets: string | null;
      usageLimitPerCustomer: string;
      accentColor?: string;
      cardBackgroundColor?: string;
    }>;

    return {
      title: parsed.title || "Bundle & Save",
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
      accentColor: sanitizeHexColor(parsed.accentColor, "#008060"),
      cardBackgroundColor: sanitizeHexColor(
        parsed.cardBackgroundColor,
        "#ffffff",
      ),
    };
  } catch {
    return {
      title: "Bundle & Save",
      layoutFormat: "vertical",
      totalBudget: null,
      dailyBudget: null,
      customerSegments: null,
      markets: null,
      usageLimitPerCustomer: "unlimited",
      accentColor: "#008060",
      cardBackgroundColor: "#ffffff",
    };
  }
}

function parseDiscountRules(
  discountRulesJson?: string | null,
): DiscountRule[] {
  if (!discountRulesJson) return [];

  try {
    const parsed = JSON.parse(discountRulesJson) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const count = Number((item as { count?: unknown }).count);
        const discountPercent = Number(
          (item as { discountPercent?: unknown }).discountPercent,
        );
        if (!Number.isFinite(count) || count < 1) return null;
        if (!Number.isFinite(discountPercent)) return null;
        return {
          count: Math.trunc(count),
          discountPercent: Math.max(0, Math.min(100, discountPercent)),
          title: (item as { title?: string }).title || "",
          subtitle: (item as { subtitle?: string }).subtitle || "",
          badge: (item as { badge?: string }).badge || "",
        } as DiscountRule;
      })
      .filter((x): x is DiscountRule => x !== null)
      .sort((a, b) => a.count - b.count);
  } catch {
    return [];
  }
}

function buildDiscountRulesJson(tiers: DiscountRule[]): DiscountRule[] {
  const out: DiscountRule[] = [];
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;
    out.push({
      count: Math.trunc(tier.count),
      discountPercent: Math.max(0, Math.min(100, tier.discountPercent)),
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
    });
  }

  return out
    .sort((a, b) => a.count - b.count)
    .filter((tier, index, arr) =>
      index === arr.findIndex((x) => x.count === tier.count),
    );
}

function sanitizeDiscountRules(tiers: DiscountRule[]): DiscountRule[] {
  const dedupedByCount = new Map<number, DiscountRule>();
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (!Number.isFinite(tier.discountPercent)) continue;
    dedupedByCount.set(
      Math.trunc(tier.count),
      {
        count: Math.trunc(tier.count),
        discountPercent: Math.max(0, Math.min(100, tier.discountPercent)),
        title: tier.title || "",
        subtitle: tier.subtitle || "",
        badge: tier.badge || "",
      }
    );
  }

  return Array.from(dedupedByCount.values())
    .sort((a, b) => a.count - b.count);
}

export function CreateNewOffer({
  onBack,
  initialOffer,
  storeProducts = [],
  existingOffers = [],
}: CreateNewOfferProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitErrorToast, setSubmitErrorToast] = useState<string | null>(null);
  const wasSubmittingRef = useRef(false);

  useEffect(() => {
    if (fetcher.state === "submitting") {
      setSubmitErrorToast(null);
      wasSubmittingRef.current = true;
      return;
    }
    if (fetcher.state !== "idle" || !wasSubmittingRef.current) return;
    wasSubmittingRef.current = false;
    const data = fetcher.data as any;
    if (data?.success && data?.toast) {
      const next = new URLSearchParams(searchParams);
      next.set("toast", data.toast);
      const qs = next.toString();
      navigate({ search: qs ? `?${qs}` : "" }, { replace: true });
      return;
    }
    if (!isOfferActionErrorBody(data)) return;
    setSubmitErrorToast(data.message);
    // 去掉 URL 里的成功 toast，避免保存失败时仍显示绿色「创建/更新成功」
    const next = new URLSearchParams(searchParams);
    next.delete("toast");
    const qs = next.toString();
    navigate({ search: qs ? `?${qs}` : "" }, { replace: true });
  }, [fetcher.state, fetcher.data, navigate, searchParams]);

  const baseUnitPrice = 100;
  const formatPreviewPrice = (value: number) =>
    `€${value.toFixed(2).replace(".", ",")}`;
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
  const [cardBackgroundColor, setCardBackgroundColor] = useState(
    offerSettings.cardBackgroundColor,
  );
  const [accentColor, setAccentColor] = useState(offerSettings.accentColor);
  const [widgetTitle, setWidgetTitle] = useState(offerSettings.title);
  const [customerSegments, setCustomerSegments] = useState<string[]>(
    offerSettings.customerSegments ? offerSettings.customerSegments.split(",") : ["all"]
  );
  const [markets, setMarkets] = useState<string[]>(
    offerSettings.markets ? offerSettings.markets.split(",") : ["all"]
  );
  const [usageLimitPerCustomer, setUsageLimitPerCustomer] = useState(
    offerSettings.usageLimitPerCustomer
  );
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    initialOffer?.selectedProductsJson
      ? parseSelectedProductIds(initialOffer.selectedProductsJson)
      : [],
  );

  // 仅用于页面展示；落库/提交只需要 ids。
  const selectedProducts: Product[] = selectedProductIds.map((id: string) => {
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
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() =>
    parseDiscountRules(initialOffer?.discountRulesJson),
  );
  const [status, setStatus] = useState<boolean>(
    initialOffer ? initialOffer.status : true
  );

  const normalizedDiscountRules = sanitizeDiscountRules(discountRules);
  const featuredRule = normalizedDiscountRules[0];

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
    <fetcher.Form
      className="polaris-page create-offer-page"
      method="post"
      onSubmit={(e: any) => {
        const key = normalizeOfferNameKey(offerName);
        const taken = existingOffers.some(
          (o) =>
            normalizeOfferNameKey(o.name) === key &&
            o.id !== initialOffer?.id,
        );
        if (taken) {
          e.preventDefault();
          setOfferNameError(
            "An offer with this name already exists. Choose another name.",
          );
          setStep(1);
          return;
        }

        // 非最后一步一律不提交：防止 Enter、隐式提交或按钮 type 切换导致误保存
        if (step !== 4) {
          e.preventDefault();
          return;
        }

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
          e.preventDefault();
        }
      }}
    >
      {submitErrorToast && (
        <div
          className="fixed z-50 top-4 left-1/2 -translate-x-1/2 bg-[#d72c0d] text-white px-4 py-2 rounded shadow-lg text-sm font-['Inter'] max-w-[min(520px,calc(100vw-32px))] text-center"
          role="alert"
        >
          {submitErrorToast}
        </div>
      )}
      <div className="polaris-page__header">
        <div>
          <button
            className="polaris-button polaris-button--plain"
            onClick={(e) => {
              onBack?.();
              e.preventDefault();
            }}
            type="button"
          >
            ← Back
          </button>
          <div className="flex items-center justify-between w-full gap-[16px]">
            <h1 className="polaris-page__title m-0">
              {initialOffer ? "Edit Offer" : "Create New Offer"}
            </h1>
            <div className="flex items-center gap-[8px]">
              <span className="text-[14px] text-[#6d7175] font-medium">Status:</span>
              <button
                type="button"
                onClick={() => setStatus(!status)}
                className="flex items-center gap-[8px] bg-transparent border-0 p-0 cursor-pointer"
              >
                <span
                  className="relative inline-block w-[44px] h-[24px] rounded-[12px] transition-colors duration-200"
                  style={{
                    backgroundColor: status ? "#008060" : "#c4cdd5",
                  }}
                >
                  <span
                    className="absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.2)] transition-all duration-200"
                    style={{
                      left: status ? "22px" : "2px",
                    }}
                  />
                </span>
                <span className="text-[14px] font-medium min-w-[50px] text-left" style={{ color: status ? "#008060" : "#6d7175" }}>
                  {status ? "Active" : "Paused"}
                </span>
              </button>
            </div>
          </div>
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
      <input type="hidden" name="status" value={status ? "true" : "false"} />
      {/* 始终提交的核心字段（即使对应输入步骤已切换隐藏） */}
      {/* 使用 offerName 避免与表单语义字段 name 冲突；中间空格由服务端 trim 首尾后落库 */}
      <input type="hidden" name="offerName" value={offerName} />
      <input type="hidden" name="title" value={widgetTitle} />
      <input type="hidden" name="offerType" value={offerType} />
      <input type="hidden" name="layoutFormat" value={layoutFormat} />
      <input type="hidden" name="accentColor" value={accentColor} />
      <input
        type="hidden"
        name="cardBackgroundColor"
        value={cardBackgroundColor}
      />
      <input
        type="hidden"
        name="usageLimitPerCustomer"
        value={usageLimitPerCustomer}
      />
      {customerSegments.map((segment) => (
        <input key={segment} type="hidden" name="customerSegments" value={segment} />
      ))}
      {markets.map((market) => (
        <input key={market} type="hidden" name="markets" value={market} />
      ))}
      <input
        type="hidden"
        name="selectedProductsJson"
        value={JSON.stringify(selectedProductIds)}
      />
      <input
        type="hidden"
        name="discountRulesJson"
        value={JSON.stringify(buildDiscountRulesJson(normalizedDiscountRules))}
      />

      <div className="polaris-card create-offer-card">
        <div className="create-offer-steps sm:flex sm:gap-[12px]">
          {steps.map((stepName, index) => (
            <div
              key={index}
              className={`create-offer-step sm:text-[14px] sm:p-[12px] ${
                step === index + 1 ? "create-offer-step--active" : ""
              }`}
              onClick={(e) => {
                setStep(index + 1);
                e.preventDefault();
              }}
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
                            {formatPreviewPrice(baseUnitPrice)}
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
                        onClick={(e) => {
                          setShowProductModal(false);
                          e.preventDefault();
                        }}
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
                          onClick={(e) => {
                            const productId = String(product.id);
                            if (!selectedProductIds.includes(productId)) {
                              setSelectedProductIds([
                                ...selectedProductIds,
                                productId,
                              ]);
                            }
                            e.preventDefault();
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
                      onClick={(e) => {
                        setShowProductModal(false);
                        e.preventDefault();
                      }}
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
                        onClick={(e) => {
                          setShowProductModal(true);
                          e.preventDefault();
                        }}
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
                                  onClick={(e) => {
                                    setSelectedProductIds(
                                      selectedProductIds.filter(
                                        (id) => id !== String(product.id),
                                      ),
                                    );
                                    e.preventDefault();
                                  }}
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
                          onClick={(e) => {
                            setShowProductModal(true);
                            e.preventDefault();
                          }}
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
                    {discountRules.map((rule, index) => (
                      <div className="create-offer-discount-card" key={`${rule.count}-${index}`}>
                        <div className="create-offer-discount-body">
                          <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                            <label className="create-offer-label">
                              Item quantity
                              <input
                                type="number"
                                min="1"
                                step="1"
                                className="create-offer-input"
                                value={rule.count}
                                onChange={(e) => {
                                  const parsedValue = Number(e.target.value);
                                  const nextCount =
                                    Number.isFinite(parsedValue) && parsedValue >= 1
                                      ? Math.trunc(parsedValue)
                                      : 1;
                                  setDiscountRules((prev) =>
                                    prev.map((r, i) =>
                                      i === index ? { ...r, count: nextCount } : r,
                                    ),
                                  );
                                }}
                              />
                            </label>
                            <label className="create-offer-label">
                              Discount (%)
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                className="create-offer-input"
                                value={rule.discountPercent}
                                onChange={(e) => {
                                  const parsedValue = Number(e.target.value);
                                  const nextPercent =
                                    Number.isFinite(parsedValue) && parsedValue >= 0
                                      ? Math.max(0, Math.min(100, parsedValue))
                                      : 0;
                                  setDiscountRules((prev) =>
                                    prev.map((r, i) =>
                                      i === index
                                        ? { ...r, discountPercent: nextPercent }
                                        : r,
                                    ),
                                  );
                                }}
                              />
                            </label>
                          </div>
                          
                          {/* 新增的文本配置字段 */}
                          <div className="create-offer-discount-form-row" style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <label className="create-offer-label">
                              Title
                              <input
                                type="text"
                                className="create-offer-input"
                                value={rule.title || ''}
                                placeholder="e.g. Duo, Trio"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, title: val } : r));
                                }}
                              />
                            </label>
                            <label className="create-offer-label">
                              Subtitle
                              <input
                                type="text"
                                className="create-offer-input"
                                value={rule.subtitle || ''}
                                placeholder="e.g. You save 20%"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, subtitle: val } : r));
                                }}
                              />
                            </label>
                            <label className="create-offer-label">
                              Badge
                              <input
                                type="text"
                                className="create-offer-input"
                                value={rule.badge || ''}
                                placeholder="e.g. Most Popular"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, badge: val } : r));
                                }}
                              />
                            </label>
                          </div>
                          
                          <div className="create-offer-discount-form-row" style={{ marginTop: '12px' }}>
                            <button
                              type="button"
                              className="create-offer-remove-tier-button"
                              onClick={() => {
                                setDiscountRules((prev) => {
                                  if (prev.length <= 1) return prev;
                                  return prev.filter((_, i) => i !== index);
                                });
                              }}
                              disabled={discountRules.length <= 1}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="create-offer-add-tier-button"
                      onClick={() => {
                        setDiscountRules((prev) => {
                          const maxCount = prev.reduce(
                            (max, rule) => Math.max(max, rule.count),
                            1,
                          );
                          return [...prev, { count: maxCount + 1, discountPercent: 15 }];
                        });
                      }}
                    >
                      + Add discount tier
                    </button>
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
                              {formatPreviewPrice(baseUnitPrice)}
                            </strong>
                          </div>
                        </div>
                        {featuredRule && (
                          <div
                            className="create-offer-pricing-card create-offer-pricing-card--primary create-offer-pricing-card--readonly create-offer-pricing-card--selected"
                          >
                            <div className="create-offer-pricing-badge">
                              {featuredRule.badge || "Most Popular"}
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
                                  <strong>{featuredRule.title || `${featuredRule.count} items`}</strong>
                                  <span className="create-offer-pricing-save">
                                    SAVE{" "}
                                    {formatPreviewPrice(
                                      featuredRule.count *
                                        baseUnitPrice *
                                        (featuredRule.discountPercent / 100),
                                    )}
                                  </span>
                                </div>
                                <div className="create-offer-pricing-subtitle">
                                  {featuredRule.subtitle || `You save ${featuredRule.discountPercent}%`}
                                </div>
                              </div>
                              <div className="create-offer-pricing-right">
                                <strong className="create-offer-pricing-price">
                                  {formatPreviewPrice(
                                    featuredRule.count *
                                      baseUnitPrice *
                                      (1 - featuredRule.discountPercent / 100),
                                  )}
                                </strong>
                                <div className="create-offer-pricing-original">
                                  {formatPreviewPrice(
                                    featuredRule.count * baseUnitPrice,
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {normalizedDiscountRules.slice(1).map((rule) => {
                          const originalTotal = rule.count * baseUnitPrice;
                          const discountedTotal =
                            originalTotal * (1 - rule.discountPercent / 100);
                          const saved = originalTotal - discountedTotal;
                          return (
                            <div
                              key={`preview-tier-${rule.count}`}
                              className="create-offer-pricing-card create-offer-pricing-card--readonly"
                            >
                              {rule.badge && (
                                <div className="create-offer-pricing-badge" style={{ backgroundColor: "#000" }}>
                                  {rule.badge}
                                </div>
                              )}
                              <div className="create-offer-pricing-header">
                                <input
                                  type="radio"
                                  checked={false}
                                  readOnly
                                  disabled
                                  className="create-offer-radio"
                                />
                                <div className="create-offer-pricing-title">
                                  <div className="create-offer-pricing-meta">
                                    <strong>{rule.title || `${rule.count} items`}</strong>
                                    <span className="create-offer-pricing-save">
                                      SAVE {formatPreviewPrice(saved)}
                                    </span>
                                  </div>
                                  <div className="create-offer-pricing-subtitle">
                                    {rule.subtitle || `You save ${rule.discountPercent}%`}
                                  </div>
                                </div>
                                <div className="create-offer-pricing-right">
                                  <strong className="create-offer-pricing-price">
                                    {formatPreviewPrice(discountedTotal)}
                                  </strong>
                                  <div className="create-offer-pricing-original">
                                    {formatPreviewPrice(originalTotal)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

                <div className="create-offer-layout-options" style={{ marginTop: '24px' }}>
                  <label className="create-offer-layout-label">
                    Widget Title
                  </label>
                  <input
                    type="text"
                    className="create-offer-input"
                    value={widgetTitle}
                    placeholder="e.g. Bundle & Save"
                    onChange={(e) => setWidgetTitle(e.target.value)}
                  />
                  <p className="create-offer-helper-text">
                    The main heading displayed above your bundle options
                  </p>
                </div>

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
                      onClick={(e) => {
                        setLayoutFormat("vertical");
                        e.preventDefault();
                      }}
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
                      onClick={(e) => {
                        setLayoutFormat("horizontal");
                        e.preventDefault();
                      }}
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
                      onClick={(e) => {
                        setLayoutFormat("card");
                        e.preventDefault();
                      }}
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
                      onClick={(e) => {
                        setLayoutFormat("compact");
                        e.preventDefault();
                      }}
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
                    <label className="create-offer-label">
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
                    <label className="create-offer-label">
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
                <BundlePreview
                  layoutFormat={layoutFormat}
                  cardBackgroundColor={cardBackgroundColor}
                  accentColor={accentColor}
                  title={widgetTitle}
                />
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
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={customerSegments.includes("all")}
                          onChange={(e) => {
                            if (e.target.checked) setCustomerSegments(["all"]);
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          All Customers
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={customerSegments.includes("vip")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomerSegments(prev => prev.includes("all") ? ["vip"] : [...prev, "vip"]);
                            } else {
                              setCustomerSegments(prev => prev.filter(v => v !== "vip"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          VIP Customers
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={customerSegments.includes("new")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomerSegments(prev => prev.includes("all") ? ["new"] : [...prev, "new"]);
                            } else {
                              setCustomerSegments(prev => prev.filter(v => v !== "new"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          New Customers
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={customerSegments.includes("returning")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomerSegments(prev => prev.includes("all") ? ["returning"] : [...prev, "returning"]);
                            } else {
                              setCustomerSegments(prev => prev.filter(v => v !== "returning"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Returning Customers
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={customerSegments.includes("high-value")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomerSegments(prev => prev.includes("all") ? ["high-value"] : [...prev, "high-value"]);
                            } else {
                              setCustomerSegments(prev => prev.filter(v => v !== "high-value"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          High-Value Customers
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={customerSegments.includes("at-risk")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCustomerSegments(prev => prev.includes("all") ? ["at-risk"] : [...prev, "at-risk"]);
                            } else {
                              setCustomerSegments(prev => prev.filter(v => v !== "at-risk"));
                            }
                          }}
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
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={markets.includes("all")}
                          onChange={(e) => {
                            if (e.target.checked) setMarkets(["all"]);
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          All Markets
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={markets.includes("us")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMarkets(prev => prev.includes("all") ? ["us"] : [...prev, "us"]);
                            } else {
                              setMarkets(prev => prev.filter(v => v !== "us"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          United States
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={markets.includes("eu")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMarkets(prev => prev.includes("all") ? ["eu"] : [...prev, "eu"]);
                            } else {
                              setMarkets(prev => prev.filter(v => v !== "eu"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Europe
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={markets.includes("uk")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMarkets(prev => prev.includes("all") ? ["uk"] : [...prev, "uk"]);
                            } else {
                              setMarkets(prev => prev.filter(v => v !== "uk"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          United Kingdom
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={markets.includes("ca")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMarkets(prev => prev.includes("all") ? ["ca"] : [...prev, "ca"]);
                            } else {
                              setMarkets(prev => prev.filter(v => v !== "ca"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Canada
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={markets.includes("au")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMarkets(prev => prev.includes("all") ? ["au"] : [...prev, "au"]);
                            } else {
                              setMarkets(prev => prev.filter(v => v !== "au"));
                            }
                          }}
                          className="create-offer-checkbox"
                        />
                        <span className="create-offer-checkbox-text">
                          Australia
                        </span>
                      </label>
                      <label className="create-offer-checkbox-label">
                        <input
                          type="checkbox"
                          checked={markets.includes("apac")}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMarkets(prev => prev.includes("all") ? ["apac"] : [...prev, "apac"]);
                            } else {
                              setMarkets(prev => prev.filter(v => v !== "apac"));
                            }
                          }}
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
                      value={usageLimitPerCustomer}
                      onChange={(e) => setUsageLimitPerCustomer(e.target.value)}
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
            disabled={fetcher.state !== "idle"}
            onClick={(e) => {
              setStep(step - 1);
              e.preventDefault();
            }}
            type="button"
          >
            Previous
          </button>
        )}
        <button
          className="polaris-button"
          disabled={fetcher.state !== "idle"}
          onClick={(e: any) => {
            if (step === 1) {
              if (!offerName.trim()) {
                setOfferNameError("Offer Name is required.");
                e.preventDefault();
                return;
              }
              const key = normalizeOfferNameKey(offerName);
              const taken = existingOffers.some(
                (o) =>
                  normalizeOfferNameKey(o.name) === key &&
                  o.id !== initialOffer?.id,
              );
              if (taken) {
                setOfferNameError(
                  "An offer with this name already exists. Choose another name.",
                );
                e.preventDefault();
                return;
              }
              setOfferNameError("");
              setStep(2);
              e.preventDefault();
              return;
            }

            if (step < 4) {
              setStep(step + 1);
              e.preventDefault();
            }
            // 第 4 步由表单 onSubmit 校验并提交，不在此处校验（避免校验失败仍触发 submit）
          }}
          type={step === 4 ? "submit" : "button"}
        >
          {fetcher.state !== "idle"
            ? "Saving…"
            : step === 4
              ? initialOffer
                ? "Update Offer"
                : "Create Offer"
              : "Next"}
        </button>
      </div>
    </fetcher.Form>
  );
}

