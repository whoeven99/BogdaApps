import { useEffect, useRef, useState, useMemo } from "react";
import { useFetcher, useNavigate, useSearchParams } from "react-router";
import { Button, Input, Select, Switch, Checkbox, DatePicker, Modal, message } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  X,
} from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);
import "./CreateNewOffer.css";
import BundlePreview from "../BundlePreview/BundlePreview";
import { PreviewItem } from "../BundlePreview/bundlePreviewShared";
import {
  OFFER_TEXT_LIMITS,
  normalizeOfferNameKey,
  parseDiscountRules,
  parseBxgyDiscountRules,
  parseOfferSettings,
  parseSelectedProductIds,
} from "../../../utils/offerParsing";

type DiscountRule = {
  // 数量阈值：例如 count=2 表示"买 2 件及以上"生效
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
};

type BxgyDiscountRule = {
  buyQuantity: number;
  getQuantity: number;
  buyProductIds: string[];
  getProductIds: string[];
  discountPercent: number;
  maxUsesPerOrder: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
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
  cartTitle: string;
  offerType: string;
  discountRulesJson: string | null;
  startTime: string;
  endTime: string;
  selectedProductsJson: string | null;
  offerSettingsJson: string | null;
  status: boolean;
}

interface MarketItem {
  id: string;
  name: string;
  handle: string;
}

interface CreateNewOfferProps {
  onBack?: () => void;
  initialOffer?: InitialOffer;
  storeProducts?: Product[];
  markets?: MarketItem[];
  /** 当前店铺已有 offers，用于名称重复校验（与后台 normalize 规则一致） */
  existingOffers?: Array<{ id: string; name: string }>;
  ianaTimezone?: string;
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

function formatForDateTimeLocal(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "";
  return d.toISOString();
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
      isDefault: !!tier.isDefault,
    });
  }

  return out
    .sort((a, b) => a.count - b.count)
    .filter((tier, index, arr) =>
      index === arr.findIndex((x) => x.count === tier.count),
    );
}

function calculatePreviewBundleAmounts(
  unitPrice: number,
  quantity: number,
  discountPercent: number,
) {
  const MONEY_SCALE = 10000;
  const safeQty = Math.max(1, Math.trunc(Number(quantity) || 1));
  const safeDiscountPercent = Math.max(
    0,
    Math.min(100, Number(discountPercent) || 0),
  );
  const unitPriceScaled = Math.round(unitPrice * MONEY_SCALE);
  const originalTotalScaled = unitPriceScaled * safeQty;
  const discountedTotalScaled = Math.round(
    originalTotalScaled * (1 - safeDiscountPercent / 100),
  );
  const originalTotal = Math.round(originalTotalScaled / (MONEY_SCALE / 100)) / 100;
  const discountedTotal =
    Math.round(discountedTotalScaled / (MONEY_SCALE / 100)) / 100;

  return {
    originalTotal,
    discountedTotal,
    saved: originalTotal - discountedTotal,
  };
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
        isDefault: !!tier.isDefault,
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
  markets: shopMarkets = [],
  existingOffers = [],
  ianaTimezone = "UTC",
}: CreateNewOfferProps) {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitErrorToast, setSubmitErrorToast] = useState<string | null>(null);
  const wasSubmittingRef = useRef(false);
  const confirmedHighDiscountRef = useRef(false);

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
  
  useEffect(() => {
    if (!initialOffer?.name) {
      setOfferName(`#offer ${dayjs().tz(ianaTimezone).format('YYYY-MM-DD HH:mm:ss')}`);
    }
  }, [initialOffer?.name, ianaTimezone]);
  const [cartTitle, setCartTitle] = useState(initialOffer?.cartTitle ?? "Bundle Discount");
  const [offerNameError, setOfferNameError] = useState("");
  const [cartTitleError, setCartTitleError] = useState("");
  const [startTime, setStartTime] = useState(
    initialOffer && initialOffer.startTime
      ? new Date(initialOffer.startTime).toISOString()
      : new Date().toISOString(),
  );
  const [endTime, setEndTime] = useState(
    initialOffer && initialOffer.endTime ? new Date(initialOffer.endTime).toISOString() : "",
  );
  const [startTimeError, setStartTimeError] = useState("");
  const [endTimeError, setEndTimeError] = useState("");

  const offerSettings = parseOfferSettings(
    initialOffer?.offerSettingsJson,
  );

  const [scheduleTimezone, setScheduleTimezone] = useState(
    offerSettings.scheduleTimezone || ianaTimezone
  );

  const tzOptions = useMemo(() => {
    try {
      const tzs = Intl.supportedValuesOf('timeZone');
      const uniqueOptions = new Map<string, { value: string, label: string, offset: number }>();
      
      tzs.forEach(tz => {
        const offsetString = dayjs().tz(tz).format('Z');
        const offsetMinutes = dayjs().tz(tz).utcOffset();
        const label = `(UTC${offsetString}) ${tz}`;
        uniqueOptions.set(label, { value: tz, label, offset: offsetMinutes });
      });

      const sortedOptions = Array.from(uniqueOptions.values()).sort((a, b) => {
        if (a.offset !== b.offset) {
          return a.offset - b.offset;
        }
        return a.value.localeCompare(b.value);
      });

      return sortedOptions.map(opt => ({ value: opt.value, label: opt.label }));
    } catch (e) {
      return [
        { value: 'UTC', label: '(UTC+00:00) UTC' },
        { value: ianaTimezone, label: `(UTC${dayjs().tz(ianaTimezone).format('Z')}) ${ianaTimezone}` }
      ];
    }
  }, [ianaTimezone]);

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
  const [layoutFormat, setLayoutFormat] = useState<
    "vertical" | "horizontal" | "card" | "compact"
  >(offerSettings.layoutFormat);
  const [cardBackgroundColor, setCardBackgroundColor] = useState(
    offerSettings.cardBackgroundColor,
  );
  const [accentColor, setAccentColor] = useState(offerSettings.accentColor);
  const [titleFontSize, setTitleFontSize] = useState(offerSettings.titleFontSize);
  const [titleFontWeight, setTitleFontWeight] = useState(offerSettings.titleFontWeight);
  const [titleColor, setTitleColor] = useState(offerSettings.titleColor);
  const [borderColor, setBorderColor] = useState(offerSettings.borderColor);
  const [labelColor, setLabelColor] = useState(offerSettings.labelColor);
  const [buttonText, setButtonText] = useState(offerSettings.buttonText);
  const [buttonPrimaryColor, setButtonPrimaryColor] = useState(offerSettings.buttonPrimaryColor);
  const [showCustomButton, setShowCustomButton] = useState(offerSettings.showCustomButton);
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
  const [selectedProductsData, setSelectedProductsData] = useState<{
    id: string;
    title: string;
    image: string;
    price: string;
    variantsCount: number;
  }[]>(() => {
    const ids = initialOffer?.selectedProductsJson
      ? parseSelectedProductIds(initialOffer.selectedProductsJson)
      : [];

    let parsedObjects: any[] = [];
    try {
      if (initialOffer?.selectedProductsJson) {
        parsedObjects = JSON.parse(initialOffer.selectedProductsJson);
      }
    } catch (e) {}

    return ids.map((id: string) => {
      const savedObj = parsedObjects.find(
        (o) => o && typeof o === "object" && String(o.id) === id
      );
      if (savedObj && savedObj.title) {
        return {
          id,
          title: savedObj.title,
          image: savedObj.image || "https://via.placeholder.com/60",
          price: savedObj.price || "€0.00",
          variantsCount: savedObj.variantsCount || 1,
        };
      }

      const found = storeProducts.find((p) => String(p.id) === id);
      return {
        id,
        title: found?.name ?? "Unknown product",
        image: found?.image ?? "https://via.placeholder.com/60",
        price: found?.price ?? "€0.00",
        variantsCount: 1,
      };
    });
  });

  const handleSelectProducts = async (type: "buy" | "get" | "normal" = "normal") => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      selectionIds: type === "buy" 
        ? buyProducts.map((id) => ({ id }))
        : type === "get"
        ? getProducts.map((id) => ({ id }))
        : selectedProductsData.map((p) => ({ id: p.id })),
    });

    if (selected) {
      const newData = selected.map((item: any) => ({
        id: item.id,
        title: item.title,
        image: item.images?.[0]?.originalSrc || "https://via.placeholder.com/60",
        price: item.variants?.[0]?.price || "€0.00",
        variantsCount: item.variants?.length || 1,
      }));
      
      if (type === "buy") {
        setBuyProducts(newData.map((item: any) => item.id));
      } else if (type === "get") {
        setGetProducts(newData.map((item: any) => item.id));
      } else {
        setSelectedProductsData(newData);
      }
    }
  };
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() =>
    parseDiscountRules(initialOffer?.discountRulesJson),
  );
  const [bxgyDiscountRules, setBxgyDiscountRules] = useState<BxgyDiscountRule[]>(
    parseBxgyDiscountRules(initialOffer?.discountRulesJson),
  );
  const [buyProducts, setBuyProducts] = useState<string[]>([]);
  const [getProducts, setGetProducts] = useState<string[]>([]);
  const [status, setStatus] = useState<boolean>(
    initialOffer ? initialOffer.status : true
  );

  const normalizedDiscountRules = sanitizeDiscountRules(discountRules);
  const featuredRule = normalizedDiscountRules[0];

  const hasDefault = normalizedDiscountRules.some(r => r.isDefault);

  const previewItems: PreviewItem[] = useMemo(() => {
    if (offerType === "bxgy" && bxgyDiscountRules.length > 0) {
      const rule = bxgyDiscountRules[0];
      return [
        {
          id: "bxgy-single",
          title: `Buy ${rule.buyQuantity} Get ${rule.getQuantity}`,
          subtitle:
            rule.discountPercent === 100
              ? "Y items FREE"
              : `Save ${rule.discountPercent}% on Y items`,
          price: formatPreviewPrice(baseUnitPrice * rule.buyQuantity),
          badge: rule.badge || "BXGY",
        },
      ];
    }

    return [
      {
        id: "single",
        title: "Single",
        subtitle: "Standard price",
        price: formatPreviewPrice(baseUnitPrice),
      },
      ...normalizedDiscountRules.map((rule, index) => {
        const { originalTotal, discountedTotal, saved } =
          calculatePreviewBundleAmounts(
            baseUnitPrice,
            rule.count,
            rule.discountPercent,
          );
        const isFeatured = hasDefault ? !!rule.isDefault : index === 0;
        return {
          id: `tier-${rule.count}`,
          title: rule.title || `${rule.count} items`,
          subtitle: rule.subtitle || `You save ${rule.discountPercent}%`,
          price: formatPreviewPrice(discountedTotal),
          original: formatPreviewPrice(originalTotal),
          featured: isFeatured,
          badge: rule.badge || (isFeatured ? "Most Popular" : ""),
          saveLabel: `SAVE ${formatPreviewPrice(saved)}`,
        };
      }),
    ];
  }, [
    offerType,
    bxgyDiscountRules,
    normalizedDiscountRules,
    baseUnitPrice,
    formatPreviewPrice,
    hasDefault,
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
      id: "bxgy",
      name: "Buy X, Get Y (BXGY)",
      description:
        "Buy X products and get Y products with discount (e.g., Buy 2 get 1 free)",
    },
  ];


  return (
    <fetcher.Form
      className="relative max-w-[1280px] mx-auto pb-6 px-6"
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

        if (offerType === "bxgy" && (buyProducts.length === 0 || getProducts.length === 0)) {
          e.preventDefault();
          Modal.error({
            title: "Validation Error",
            content: "For BXGY offers, you must select both Buy Products and Get Products.",
          });
          setStep(2);
          return;
        }

        let hasError = false;
        if (!offerName.trim()) {
          setOfferNameError("Offer Name is required.");
          hasError = true;
        }
        if (!cartTitle.trim()) {
          setCartTitleError("Display Title is required.");
          hasError = true;
        }
        if (!startTime) {
          setStartTimeError("Start Time is required.");
          hasError = true;
        } else if (startTime && (!dayjs(startTime).isValid() || startTime === "")) {
          setStartTimeError("Invalid start time format.");
          hasError = true;
        } else {
          setStartTimeError("");
        }
        if (!endTime) {
          setEndTimeError("End Time is required.");
          hasError = true;
        } else if (endTime && (!dayjs(endTime).isValid() || endTime === "")) {
          setEndTimeError("Invalid end time format.");
          hasError = true;
        } else if (startTime && endTime && dayjs(endTime).isBefore(dayjs(startTime))) {
          setEndTimeError("End time must be after start time.");
          hasError = true;
        } else {
          setEndTimeError("");
        }
        if (hasError) {
          e.preventDefault();
          return;
        }

        const hasHighDiscount = normalizedDiscountRules.some(r => r.discountPercent >= 90);
        if (hasHighDiscount && !confirmedHighDiscountRef.current) {
          e.preventDefault();
          Modal.confirm({
            title: "High Discount Warning",
            content: "You have set a discount of 90% or more. This means the product is nearly free. Are you sure you want to proceed?",
            okText: "Yes, proceed",
            cancelText: "Cancel",
            onOk: () => {
              confirmedHighDiscountRef.current = true;
              // form elements trigger re-submit
              e.target.requestSubmit();
            },
            onCancel: () => {
              confirmedHighDiscountRef.current = false;
            }
          });
          return;
        }
      }}
    >
      {submitErrorToast && (
        <div
          className="fixed z-50 top-4 left-1/2 -translate-x-1/2 bg-[rgba(0,0,0,0.75)] backdrop-blur-sm !text-white px-4 py-2 rounded shadow-lg text-sm font-sans max-w-[min(520px,calc(100vw-32px))] text-center"
          role="alert"
        >
          {submitErrorToast}
        </div>
      )}
      <div className="mb-6">
        <div>
          <Button
            type="text"
            className="px-0 text-gray-600 hover:text-gray-900"
            onClick={(e) => {
              onBack?.();
              e.preventDefault();
            }}
          >
            ← Back
          </Button>
          <div className="flex items-center justify-between w-full gap-[16px] mt-1">
            <h1 className="text-[24px] font-semibold m-0 text-[#1c1f23]">
              {initialOffer ? "Edit Offer" : "Create New Offer"}
            </h1>
            
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
      <input type="hidden" name="cartTitle" value={cartTitle} />
      <input type="hidden" name="title" value={widgetTitle} />
      <input type="hidden" name="offerType" value={offerType} />
      <input type="hidden" name="layoutFormat" value={layoutFormat} />
      <input type="hidden" name="scheduleTimezone" value={scheduleTimezone} />
      <input type="hidden" name="accentColor" value={accentColor} />
      <input type="hidden" name="titleFontSize" value={titleFontSize} />
      <input type="hidden" name="titleFontWeight" value={titleFontWeight} />
      <input type="hidden" name="titleColor" value={titleColor} />
      <input type="hidden" name="borderColor" value={borderColor} />
      <input type="hidden" name="labelColor" value={labelColor} />
      <input type="hidden" name="buttonText" value={buttonText} />
      <input type="hidden" name="buttonPrimaryColor" value={buttonPrimaryColor} />
      <input type="hidden" name="showCustomButton" value={showCustomButton ? "true" : "false"} />
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
        value={JSON.stringify(offerType === "bxgy" ? { buyProducts, getProducts } : selectedProductsData)}
      />
      <input
        type="hidden"
        name="discountRulesJson"
        value={JSON.stringify(offerType === "bxgy" ? bxgyDiscountRules : buildDiscountRulesJson(normalizedDiscountRules))}
      />

      <div className="bg-[#ffffff] rounded-[8px] shadow-[0_1px_3px_rgba(0,0,0,0.1)] p-[20px] mb-[100px]">
        <div className="grid grid-cols-2 sm:flex sm:gap-[12px] gap-[8px] mb-6">
          {steps.map((stepName, index) => {
            const stepNumber = index + 1;
            const isActive = step === stepNumber;
            const isClickable = stepNumber <= step;
            return (
              <div
                key={index}
                role="button"
                tabIndex={isClickable ? 0 : -1}
                className={`flex-1 py-[10px] px-2 sm:p-[12px] rounded-md text-center text-[13px] sm:text-[14px] font-medium transition-colors ${
                  isActive
                    ? "bg-[#008060] !text-white"
                    : "bg-[#f4f6f8] text-[#5c6166]"
                } ${
                  isClickable
                    ? "cursor-pointer hover:opacity-80"
                    : "cursor-not-allowed opacity-50"
                }`}
                onClick={(e) => {
                  if (isClickable) {
                    setStep(stepNumber);
                  }
                  e.preventDefault();
                }}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === "Enter" || e.key === " ")) {
                    setStep(stepNumber);
                    e.preventDefault();
                  }
                }}
              >
                <span className="hidden sm:inline">
                  {stepNumber}.{" "}
                </span>
                {stepName}
              </div>
            );
          })}
        </div>

        <div>
          {step === 1 && (
            <div className="create-offer-basic-grid lg:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-6">
                <div>
                  <h2 className="text-[20px] font-semibold mb-4 text-[#1c1f23]">
                    Basic Information
                  </h2>
                  <div className="flex flex-col gap-4">
                    <div>
                      <label className="block">
                        <span className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                          Offer Name
                        </span>
                        <Input
                          size="large"
                          placeholder="e.g., Summer Bundle Deal"
                          value={offerName}
                          onChange={(e) => {
                            setOfferName(e.target.value.replace(/[\r\n]+/g, " "));
                            if (offerNameError && e.target.value.trim()) {
                              setOfferNameError("");
                            }
                          }}
                          status={offerNameError ? "error" : ""}
                          maxLength={OFFER_TEXT_LIMITS.offerName}
                          showCount
                        />
                      </label>
                      {offerNameError && (
                        <p className="text-red-500 text-xs mt-1">
                          {offerNameError}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block">
                        <span className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                          Offer Type
                        </span>
                        <Select
                          size="large"
                          value={offerType}
                          onChange={(val) => setOfferType(val)}
                          disabled
                          className="w-full"
                          options={offerTypes.map(t => ({ label: t.name, value: t.id }))}
                        />
                      </label>
                    </div>
                    
                    <div>
                      <label className="block">
                        <span className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                          Display Title (Cart & Checkout)
                        </span>
                        <Input
                          size="large"
                          placeholder="e.g., Bundle Discount"
                          value={cartTitle}
                          onChange={(e) => {
                            setCartTitle(e.target.value.replace(/[\r\n]+/g, " "));
                            if (cartTitleError && e.target.value.trim()) {
                              setCartTitleError("");
                            }
                          }}
                          status={cartTitleError ? "error" : ""}
                          maxLength={OFFER_TEXT_LIMITS.cartTitle}
                          showCount
                        />
                      </label>
                      <div className="text-[13px] text-[#5c6166] mt-1">
                        This is the discount name shown to customers in their cart and checkout.
                      </div>
                      {cartTitleError && (
                        <div className="text-red-500 text-xs mt-1">
                          {cartTitleError}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="create-offer-sticky-preview">
                <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                  Live Preview
                </h3>
                <p className="text-[13px] text-[#5c6166] mb-6 font-normal">
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
                  borderColor={borderColor}
                  labelColor={labelColor}
                  titleFontSize={titleFontSize}
                  titleFontWeight={titleFontWeight}
                  titleColor={titleColor}
                  buttonText={buttonText}
                  buttonPrimaryColor={buttonPrimaryColor}
                  showCustomButton={showCustomButton}
                  title={widgetTitle}
                  items={previewItems}
                />
                <p className="text-[12px] text-[#5c6166] mt-3 italic font-normal">
                  Note: This is a live preview. Changes will update in real-time when state is connected.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="create-offer-products-grid">
                <div>
                  <h2 className="text-[20px] font-semibold mb-6 text-[#1c1f23]">
                    Products & Discounts
                  </h2>

                  {offerType === "bxgy" ? (
                    <>
                      <div className="mb-6">
                        <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                          Buy Products (X)
                        </h3>
                        {buyProducts.length === 0 ? (
                          <Button
                            size="large"
                            className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
                            onClick={(e) => {
                              handleSelectProducts("buy");
                              e.preventDefault();
                            }}
                          >
                            Select buy products
                          </Button>
                        ) : (
                          <div>
                            <div className="text-[12px] text-[#5c6166] mb-2">
                              {buyProducts.length} product{buyProducts.length > 1 ? "s" : ""} selected
                            </div>
                            <Button
                              size="small"
                              onClick={(e) => {
                                handleSelectProducts("buy");
                                e.preventDefault();
                              }}
                            >
                              Edit buy products
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="mb-8">
                        <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                          Get Products (Y) 
                        </h3>
                        {getProducts.length === 0 ? (
                          <Button
                            size="large"
                            className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
                            onClick={(e) => {
                              handleSelectProducts("get");
                              e.preventDefault();
                            }}
                          >
                            Select get products
                          </Button>
                        ) : (
                          <div>
                            <div className="text-[12px] text-[#5c6166] mb-2">
                              {getProducts.length} product{getProducts.length > 1 ? "s" : ""} selected
                            </div>
                            <Button
                              size="small"
                              onClick={(e) => {
                                handleSelectProducts("get");
                                e.preventDefault();
                              }}
                            >
                              Edit get products
                            </Button>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="mb-8">
                      <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                        Products eligible for offer
                      </h3>

                      {selectedProductsData.length === 0 ? (
                        <Button
                          size="large"
                          className="text-[#008060] border-[#008060] hover:text-[#006e52] hover:border-[#006e52] hover:bg-[#f0f9f6]"
                          onClick={(e) => {
                            handleSelectProducts();
                            e.preventDefault();
                          }}
                        >
                          Add products eligible for offer
                        </Button>
                      ) : (
                        <div>
                          <div className="create-offer-selected-grid">
                            {selectedProductsData.slice(0, 3).map((product) => (
                              <div
                                key={product.id}
                                className="create-offer-selected-card"
                              >
                                <button
                                  type="button"
                                  className="create-offer-selected-remove"
                                  onClick={(e) => {
                                    setSelectedProductsData(
                                      selectedProductsData.filter(
                                        (p) => p.id !== product.id,
                                      ),
                                    );
                                    e.preventDefault();
                                  }}
                                  aria-label={`Remove ${product.title}`}
                                >
                                  <X size={14} />
                                </button>
                                <img
                                  src={product.image}
                                  alt={product.title}
                                  className="create-offer-selected-image"
                                />
                                <div className="create-offer-selected-name">
                                  {product.title}
                                </div>
                                <div className="create-offer-selected-price">
                                  {product.price}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="create-offer-selected-count">
                            {selectedProductsData.length} product
                            {selectedProductsData.length > 1 ? "s" : ""}{" "}
                            selected
                            {(() => {
                              const totalVariants = selectedProductsData.reduce(
                                (sum, p) => sum + (p.variantsCount || 1),
                                0
                              );
                              return totalVariants > 0
                                ? ` (${totalVariants} variant${totalVariants > 1 ? "s" : ""})`
                                : "";
                            })()}
                          </div>
                          <Button
                            type="link"
                            onClick={(e) => {
                              handleSelectProducts();
                              e.preventDefault();
                            }}
                            className="px-0"
                          >
                            Edit products
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                      {offerType === "bxgy" ? "BXGY Rules" : "Discount Setting"}
                    </h3>
                    {offerType === "bxgy" ? (
                      <div className="create-offer-discount-card">
                        <div className="create-offer-discount-body">
                          <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                            <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                              Buy Quantity (X)
                              <Input
                                size="large"
                                type="number"
                                min={1}
                                step={1}
                                className="mt-1"
                                value={bxgyDiscountRules[0]?.buyQuantity || 1}
                                onChange={(e) => {
                                  const parsedValue = Number(e.target.value);
                                  const nextCount =
                                    Number.isFinite(parsedValue) && parsedValue >= 1
                                      ? Math.trunc(parsedValue)
                                      : 1;
                                  setBxgyDiscountRules(prev => prev.length > 0 
                                    ? [{ ...prev[0], buyQuantity: nextCount }]
                                    : [{ 
                                        buyQuantity: nextCount,
                                        getQuantity: 1,
                                        buyProductIds: buyProducts,
                                        getProductIds: getProducts,
                                        discountPercent: 100,
                                        maxUsesPerOrder: 1
                                      }]
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
                                value={bxgyDiscountRules[0]?.getQuantity || 1}
                                onChange={(e) => {
                                  const parsedValue = Number(e.target.value);
                                  const nextCount =
                                    Number.isFinite(parsedValue) && parsedValue >= 1
                                      ? Math.trunc(parsedValue)
                                      : 1;
                                  setBxgyDiscountRules(prev => prev.length > 0 
                                    ? [{ ...prev[0], getQuantity: nextCount }]
                                    : [{ 
                                        buyQuantity: 1,
                                        getQuantity: nextCount,
                                        buyProductIds: buyProducts,
                                        getProductIds: getProducts,
                                        discountPercent: 100,
                                        maxUsesPerOrder: 1
                                      }]
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
                                value={bxgyDiscountRules[0]?.discountPercent || 100}
                                onChange={(e) => {
                                  const parsedValue = Number(e.target.value);
                                  if (parsedValue > 100) return;
                                  const nextPercent =
                                    Number.isFinite(parsedValue) && parsedValue >= 0
                                      ? parsedValue
                                      : 100;
                                  setBxgyDiscountRules(prev => prev.length > 0 
                                    ? [{ ...prev[0], discountPercent: nextPercent }]
                                    : [{ 
                                        buyQuantity: 1,
                                        getQuantity: 1,
                                        buyProductIds: buyProducts,
                                        getProductIds: getProducts,
                                        discountPercent: nextPercent,
                                        maxUsesPerOrder: 1
                                      }]
                                  );
                                }}
                              />
                              {bxgyDiscountRules[0]?.discountPercent === 100 && (
                                <div className="text-[#52c41a] text-[12px] mt-1 font-normal">
                                  Y products will be FREE
                                </div>
                              )}
                            </label>
                          </div>
                          <div className="create-offer-discount-form-row" style={{ marginTop: '12px' }}>
                            <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                              Max Uses Per Order
                              <Input
                                size="large"
                                type="number"
                                min={1}
                                step={1}
                                className="mt-1"
                                value={bxgyDiscountRules[0]?.maxUsesPerOrder || 1}
                                onChange={(e) => {
                                  const parsedValue = Number(e.target.value);
                                  const nextMax =
                                    Number.isFinite(parsedValue) && parsedValue >= 1
                                      ? Math.trunc(parsedValue)
                                      : 1;
                                  setBxgyDiscountRules(prev => prev.length > 0 
                                    ? [{ ...prev[0], maxUsesPerOrder: nextMax }]
                                    : [{ 
                                        buyQuantity: 1,
                                        getQuantity: 1,
                                        buyProductIds: buyProducts,
                                        getProductIds: getProducts,
                                        discountPercent: 100,
                                        maxUsesPerOrder: nextMax
                                      }]
                                  );
                                }}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="create-offer-discount-card" key={`${rule.count}-${index}`}>
                        <div className="create-offer-discount-body">
                          <div className="create-offer-discount-form-row create-offer-discount-form-row--inline">
                            <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                              Item quantity
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
                                  setDiscountRules((prev) =>
                                    prev.map((r, i) =>
                                      i === index ? { ...r, count: nextCount } : r,
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
                                  if (parsedValue > 100) return; // Do not allow entering > 100
                                  const nextPercent =
                                    Number.isFinite(parsedValue) && parsedValue >= 0
                                      ? parsedValue
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
                              {rule.discountPercent > 50 && rule.discountPercent < 90 && (
                                <div className="text-[#faad14] text-[12px] mt-1 font-normal">
                                  A discount over 50% may result in losses. Please double-check.
                                </div>
                              )}
                              {rule.discountPercent >= 90 && (
                                <div className="text-[#ff4d4f] text-[12px] mt-1 font-normal">
                                  A discount of 90% or more means the product is nearly free.
                                </div>
                              )}
                            </label>
                          </div>
                          
                          {/* 新增的文本配置字段 */}
                          <div className="create-offer-discount-form-row" style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                            <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                              Title
                              <Input
                                size="large"
                                className="mt-1"
                                value={rule.title || ''}
                                placeholder="e.g. Duo, Trio"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, title: val } : r));
                                }}
                              />
                            </label>
                            <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                              Subtitle
                              <Input
                                size="large"
                                className="mt-1"
                                value={rule.subtitle || ''}
                                placeholder="e.g. You save 20%"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, subtitle: val } : r));
                                }}
                              />
                            </label>
                            <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                              Badge
                              <Input
                                size="large"
                                className="mt-1"
                                value={rule.badge || ''}
                                placeholder="e.g. Most Popular"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, badge: val } : r));
                                }}
                              />
                            </label>
                          </div>
                          
                          <div className="create-offer-discount-form-row" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Checkbox
                              checked={!!rule.isDefault}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setDiscountRules((prev) =>
                                  prev.map((r, i) => ({
                                    ...r,
                                    isDefault: checked ? i === index : false,
                                  }))
                                );
                              }}
                            >
                              Set as Default Selected
                            </Checkbox>
                            <Button
                              danger
                              onClick={() => {
                                setDiscountRules((prev) => {
                                  if (prev.length <= 1) return prev;
                                  return prev.filter((_, i) => i !== index);
                                });
                              }}
                              disabled={discountRules.length <= 1}
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
                    </Button>
                  )}
                </div>
                </div>

                <div className="create-offer-sticky-preview">
                  <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                    Live Preview
                  </h3>
                  <p className="text-[13px] text-[#5c6166] mb-6 font-normal">
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
                    borderColor={borderColor}
                    labelColor={labelColor}
                    titleFontSize={titleFontSize}
                    titleFontWeight={titleFontWeight}
                    titleColor={titleColor}
                  buttonText={buttonText}
                  buttonPrimaryColor={buttonPrimaryColor}
                  showCustomButton={showCustomButton}
                  title={widgetTitle}
                  items={previewItems}
                  />
                  <p className="text-[12px] text-[#5c6166] mt-3 italic font-normal">
                    Note: This is a live preview. Changes will update in real-time when state is connected.
                  </p>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="create-offer-style-grid">
              <div>
                <h2 className="text-[20px] font-semibold mb-2 text-[#1c1f23]">
                  Style Design
                </h2>
                <p className="text-[13px] text-[#5c6166] mb-6 font-normal">
                  Customize the appearance of your bundle widget
                </p>

                <div className="mb-6">
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-2">
                    Widget Title
                  </label>
                  <Input
                    size="large"
                    value={widgetTitle}
                    placeholder="e.g. Bundle & Save"
                    onChange={(e) =>
                      setWidgetTitle(e.target.value.replace(/[\r\n]+/g, " "))
                    }
                    maxLength={OFFER_TEXT_LIMITS.widgetTitle}
                    showCount
                  />
                  <p className="text-[13px] text-[#5c6166] mt-1">
                    The main heading displayed above your bundle options
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-2">
                    Layout Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      role="button"
                      tabIndex={0}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        layoutFormat === "vertical"
                          ? "border-[#008060] bg-[#f0faf6]"
                          : "border-gray-200 bg-white"
                      }`}
                      onClick={(e) => {
                        setLayoutFormat("vertical");
                        e.preventDefault();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setLayoutFormat("vertical");
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="font-medium mb-1 text-[#1c1f23]">
                        Vertical Stack
                      </div>
                      <div className="text-[13px] text-[#5c6166]">
                        Products stacked vertically
                      </div>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        layoutFormat === "horizontal"
                          ? "border-[#008060] bg-[#f0faf6]"
                          : "border-gray-200 bg-white"
                      }`}
                      onClick={(e) => {
                        setLayoutFormat("horizontal");
                        e.preventDefault();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setLayoutFormat("horizontal");
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="font-medium mb-1 text-[#1c1f23]">
                        Horizontal Grid
                      </div>
                      <div className="text-[13px] text-[#5c6166]">
                        Products in a row
                      </div>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        layoutFormat === "card"
                          ? "border-[#008060] bg-[#f0faf6]"
                          : "border-gray-200 bg-white"
                      }`}
                      onClick={(e) => {
                        setLayoutFormat("card");
                        e.preventDefault();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setLayoutFormat("card");
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="font-medium mb-1 text-[#1c1f23]">
                        Card Grid
                      </div>
                      <div className="text-[13px] text-[#5c6166]">
                        2x2 grid layout
                      </div>
                    </div>
                    <div
                      role="button"
                      tabIndex={0}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        layoutFormat === "compact"
                          ? "border-[#008060] bg-[#f0faf6]"
                          : "border-gray-200 bg-white"
                      }`}
                      onClick={(e) => {
                        setLayoutFormat("compact");
                        e.preventDefault();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          setLayoutFormat("compact");
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="font-medium mb-1 text-[#1c1f23]">
                        Compact List
                      </div>
                      <div className="text-[13px] text-[#5c6166]">
                        Condensed view
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                    Card & Typography Colors
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Card Background Color
                      <input
                        type="color"
                        value={cardBackgroundColor}
                        onChange={(e) =>
                          setCardBackgroundColor(e.target.value)
                        }
                        className="w-full h-10 mt-1 border border-gray-300 rounded-md p-1 cursor-pointer"
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Accent Color
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full h-10 mt-1 border border-gray-300 rounded-md p-1 cursor-pointer"
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Border Color
                      <input
                        type="color"
                        value={borderColor}
                        onChange={(e) => setBorderColor(e.target.value)}
                        className="w-full h-10 mt-1 border border-gray-300 rounded-md p-1 cursor-pointer"
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Label Text Color
                      <input
                        type="color"
                        value={labelColor}
                        onChange={(e) => setLabelColor(e.target.value)}
                        className="w-full h-10 mt-1 border border-gray-300 rounded-md p-1 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                    Title Typography
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Font Size (px)
                      <Input
                        size="large"
                        type="number"
                        min={10}
                        max={36}
                        value={titleFontSize}
                        onChange={(e) => setTitleFontSize(Number(e.target.value))}
                        className="mt-1"
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Font Weight
                      <Select
                        size="large"
                        value={titleFontWeight}
                        onChange={(val) => setTitleFontWeight(val)}
                        className="w-full mt-1"
                        options={[
                          { label: "Regular (400)", value: "400" },
                          { label: "Medium (500)", value: "500" },
                          { label: "Semi Bold (600)", value: "600" },
                          { label: "Bold (700)", value: "700" }
                        ]}
                      />
                    </label>
                    <label className="block text-[14px] font-medium text-[#1c1f23]">
                      Title Color
                      <input
                        type="color"
                        value={titleColor}
                        onChange={(e) => setTitleColor(e.target.value)}
                        className="w-full h-10 mt-1 border border-gray-300 rounded-md p-1 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                    Button Style & Extra
                  </h3>
                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg mb-4">
                    <div>
                      <div className="text-[14px] font-medium text-[#1c1f23]">
                        Show App's Add to Cart Button
                      </div>
                      <div className="text-[13px] text-[#5c6166]">
                        If disabled, customers will use your theme's native Add to Cart button.
                      </div>
                    </div>
                    <Switch
                      checked={showCustomButton}
                      onChange={(checked) => setShowCustomButton(checked)}
                    />
                  </div>
                  
                  {showCustomButton && (
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block text-[14px] font-medium text-[#1c1f23]">
                        Button Text
                        <Input
                          size="large"
                          value={buttonText}
                          onChange={(e) =>
                            setButtonText(e.target.value.replace(/[\r\n]+/g, " "))
                          }
                          className="mt-1"
                          maxLength={OFFER_TEXT_LIMITS.buttonText}
                          showCount
                        />
                      </label>
                      <label className="block text-[14px] font-medium text-[#1c1f23]">
                        Button Color
                        <input
                          type="color"
                          value={buttonPrimaryColor}
                          onChange={(e) => setButtonPrimaryColor(e.target.value)}
                          className="w-full h-10 mt-1 border border-gray-300 rounded-md p-1 cursor-pointer"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div className="create-offer-sticky-preview">
                <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                  Live Preview
                </h3>
                <p className="text-[13px] text-[#5c6166] mb-6 font-normal">
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
                  borderColor={borderColor}
                  labelColor={labelColor}
                  titleFontSize={titleFontSize}
                  titleFontWeight={titleFontWeight}
                  titleColor={titleColor}
                  buttonText={buttonText}
                  buttonPrimaryColor={buttonPrimaryColor}
                  showCustomButton={showCustomButton}
                  title={widgetTitle}
                  items={previewItems}
                />
                <p className="text-[12px] text-[#5c6166] mt-3 italic font-normal">
                  Note: This is a live preview. Changes will update in real-time when state is connected.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-[20px] font-semibold mb-6 text-[#1c1f23]">
                Targeting & Settings
              </h2>

              <div className="mb-8">
                <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                  Target Audience
                </h3>
                <div className="flex flex-col gap-4">
                  {/* Hidden Customer Segments */}
                  {false && <div>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-2">
                      Customer Segments
                    </label>
                    <div className="grid grid-cols-2 gap-3 border border-gray-200 rounded-md p-4">
                      <Checkbox
                        checked={customerSegments.includes("all")}
                        onChange={(e) => {
                          if (e.target.checked) setCustomerSegments(["all"]);
                        }}
                      >
                        All Customers
                      </Checkbox>
                      <Checkbox
                        checked={customerSegments.includes("vip")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomerSegments(prev => prev.includes("all") ? ["vip"] : [...prev, "vip"]);
                          } else {
                            setCustomerSegments(prev => prev.filter(v => v !== "vip"));
                          }
                        }}
                      >
                        VIP Customers
                      </Checkbox>
                      <Checkbox
                        checked={customerSegments.includes("new")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomerSegments(prev => prev.includes("all") ? ["new"] : [...prev, "new"]);
                          } else {
                            setCustomerSegments(prev => prev.filter(v => v !== "new"));
                          }
                        }}
                      >
                        New Customers
                      </Checkbox>
                      <Checkbox
                        checked={customerSegments.includes("returning")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomerSegments(prev => prev.includes("all") ? ["returning"] : [...prev, "returning"]);
                          } else {
                            setCustomerSegments(prev => prev.filter(v => v !== "returning"));
                          }
                        }}
                      >
                        Returning Customers
                      </Checkbox>
                      <Checkbox
                        checked={customerSegments.includes("high-value")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomerSegments(prev => prev.includes("all") ? ["high-value"] : [...prev, "high-value"]);
                          } else {
                            setCustomerSegments(prev => prev.filter(v => v !== "high-value"));
                          }
                        }}
                      >
                        High-Value Customers
                      </Checkbox>
                      <Checkbox
                        checked={customerSegments.includes("at-risk")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCustomerSegments(prev => prev.includes("all") ? ["at-risk"] : [...prev, "at-risk"]);
                          } else {
                            setCustomerSegments(prev => prev.filter(v => v !== "at-risk"));
                          }
                        }}
                      >
                        At-Risk Customers
                      </Checkbox>
                    </div>
                    <p className="text-[13px] text-[#5c6166] mt-2">
                      Select one or more customer segments to target
                    </p>
                  </div>}

                  <div>
                    <label className="block text-[14px] font-medium text-[#1c1f23] mb-2">
                      Market Visibility
                    </label>
                    <div className="grid grid-cols-2 gap-3 border border-gray-200 rounded-md p-4">
                      <Checkbox
                        checked={markets.includes("all")}
                        onChange={(e) => {
                          if (e.target.checked) setMarkets(["all"]);
                        }}
                      >
                        All Markets
                      </Checkbox>
                      {shopMarkets.map((market) => (
                        <Checkbox
                          key={market.id}
                          checked={markets.includes(market.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setMarkets((prev) =>
                                prev.includes("all") ? [market.id] : [...prev, market.id]
                              );
                            } else {
                              setMarkets((prev) => prev.filter((v) => v !== market.id));
                            }
                          }}
                        >
                          {market.name}
                        </Checkbox>
                      ))}
                    </div>
                    <p className="text-[13px] text-[#5c6166] mt-2">
                      Select which markets can see this offer
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[14px] font-medium text-[#1c1f23] flex items-center">
                    Schedule
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[#5c6166]">Timezone:</span>
                    <Select
                      size="small"
                      showSearch
                      className="w-[240px]"
                      value={scheduleTimezone}
                      onChange={setScheduleTimezone}
                      options={tzOptions}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Start Time
                    <DatePicker
                      size="large"
                      showTime={{ format: 'HH:mm' }}
                      format="YYYY-MM-DD HH:mm"
                      className="mt-1 w-full text-[14px]"
                      value={startTime && dayjs(startTime).isValid() ? dayjs(startTime).tz(scheduleTimezone) : null}
                      onChange={(date) => {
                        const val = date ? dayjs.tz(date.format('YYYY-MM-DD HH:mm:ss'), scheduleTimezone).toISOString() : '';
                        setStartTime(val);
                        if (val && endTime && dayjs(endTime).isBefore(dayjs(val))) {
                          setStartTimeError("Start time must be before end time.");
                        } else {
                          setStartTimeError("");
                          setEndTimeError("");
                        }
                      }}
                      status={startTimeError ? "error" : ""}
                    />
                    <input type="hidden" name="startTime" value={startTime} />
                    {startTimeError ? (
                      <p className="text-red-500 text-xs mt-1">
                        {startTimeError}
                      </p>
                    ) : (
                      <p className="text-[13px] text-[#5c6166] mt-1 font-normal">
                        When the offer becomes active
                      </p>
                    )}
                  </label>
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    End Time
                    <DatePicker
                      size="large"
                      showTime={{ format: 'HH:mm' }}
                      format="YYYY-MM-DD HH:mm"
                      className="mt-1 w-full"
                      value={endTime && dayjs(endTime).isValid() ? dayjs(endTime).tz(scheduleTimezone) : null}
                      onChange={(date) => {
                        const val = date ? dayjs.tz(date.format('YYYY-MM-DD HH:mm:ss'), scheduleTimezone).toISOString() : '';
                        setEndTime(val);
                        if (val && startTime && dayjs(val).isBefore(dayjs(startTime))) {
                          setEndTimeError("End time must be after start time.");
                        } else {
                          setEndTimeError("");
                          setStartTimeError("");
                        }
                      }}
                      status={endTimeError ? "error" : ""}
                    />
                    <input type="hidden" name="endTime" value={endTime} />
                    {endTimeError ? (
                      <p className="text-red-500 text-xs mt-1">
                        {endTimeError}
                      </p>
                    ) : (
                      <p className="text-[13px] text-[#5c6166] mt-1 font-normal">
                        When the offer expires
                      </p>
                    )}
                  </label>
                </div>
              </div>

              {/* Hidden Budget Module */}
              {false && <div className="mb-8">
                <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                  Budget
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Total Budget (Optional)
                    <Input
                      size="large"
                      type="number"
                      placeholder="$0.00"
                      className="mt-1 w-full"
                      name="totalBudget"
                      value={totalBudget}
                      onChange={(e) => setTotalBudget(e.target.value)}
                    />
                    <p className="text-[13px] text-[#5c6166] mt-1 font-normal">
                      Maximum total spend for this offer
                    </p>
                  </label>
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Daily Budget (Optional)
                    <Input
                      size="large"
                      type="number"
                      placeholder="$0.00"
                      className="mt-1 w-full"
                      name="dailyBudget"
                      value={dailyBudget}
                      onChange={(e) => setDailyBudget(e.target.value)}
                    />
                    <p className="text-[13px] text-[#5c6166] mt-1 font-normal">
                      Maximum spend per day
                    </p>
                  </label>
                </div>
              </div>}

              {/* Hidden Risk Control Module */}
              {false && <div className="mb-8">
                <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                  Risk Control
                </h3>
                <div>
                  <label className="block text-[14px] font-medium text-[#1c1f23]">
                    Usage Limit Per Customer
                    <Select
                      size="large"
                      value={usageLimitPerCustomer}
                      onChange={(val) => setUsageLimitPerCustomer(val)}
                      className="w-full mt-1"
                      options={[
                        { label: "Unlimited", value: "unlimited" },
                        { label: "1 time only", value: "1" },
                        { label: "2 times", value: "2" },
                        { label: "3 times", value: "3" },
                        { label: "5 times", value: "5" },
                        { label: "10 times", value: "10" },
                        { label: "Custom...", value: "custom" }
                      ]}
                    />
                    <p className="text-[13px] text-[#5c6166] mt-1 font-normal">
                      How many times each customer can use this offer
                    </p>
                  </label>
                </div>
              </div>}
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#dfe3e8] py-4 px-6 flex justify-center items-center gap-3 z-[100] shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
        {step > 1 && (
          <Button
            size="large"
            disabled={fetcher.state !== "idle"}
            onClick={(e) => {
              setStep(step - 1);
              e.preventDefault();
            }}
          >
            Previous
          </Button>
        )}
        <Button
          size="large"
          style={{ backgroundColor: "#008060", borderColor: "#008060", color: "#fff" }}
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

            if (step === 2) {
              if (selectedProductsData.length === 0) {
                message.error("Please select at least one product.");
                e.preventDefault();
                return;
              }
              setStep(3);
              e.preventDefault();
              return;
            }

            if (step < 4) {
              setStep(step + 1);
              e.preventDefault();
            }
            if (step === 4) {
              let hasError = false;
              if (!startTime) {
                setStartTimeError("Start Time is required.");
                hasError = true;
              } else if (startTime && (!dayjs(startTime).isValid() || startTime === "")) {
                setStartTimeError("Invalid start time format.");
                hasError = true;
              } else {
                setStartTimeError("");
              }
              if (!endTime) {
                setEndTimeError("End Time is required.");
                hasError = true;
              } else if (endTime && (!dayjs(endTime).isValid() || endTime === "")) {
                setEndTimeError("Invalid end time format.");
                hasError = true;
              } else {
                setEndTimeError("");
              }
              if (hasError) {
                e.preventDefault();
                return;
              }
            }
            // 第 4 步由表单 onSubmit 校验并提交，不在此处校验（避免校验失败仍触发 submit）
          }}
          htmlType={step === 4 ? "submit" : "button"}
        >
          {fetcher.state !== "idle"
            ? "Saving…"
            : step === 4
              ? initialOffer
                ? "Update Offer"
                : "Create Offer"
              : "Next"}
        </Button>
      </div>
    </fetcher.Form>
  );
}
