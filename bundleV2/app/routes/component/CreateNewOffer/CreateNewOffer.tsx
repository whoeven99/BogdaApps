import { useEffect, useRef, useState, useMemo } from "react";
import { useFetcher, useNavigate, useSearchParams } from "react-router";
import { Button, Input, Select, Switch, Checkbox, DatePicker, Modal, message, Dropdown } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  X,
  Trash2,
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
  buildBxgyDiscountRulesJson,
  parseCompleteBundleConfig,
  buildCompleteBundleConfig,
  type CompleteBundleBar,
  type CompleteBundleProduct,
  type CompleteBundlePricingMode,
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
  /** Cart quantity threshold (from buy-product list) to trigger this tier */
  count: number;
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
  handle?: string;
  price: string;
  image: string;
  variants?: Array<{
    id: string;
    title: string;
    price?: string;
    selectedOptions?: Array<{ name: string; value: string }>;
  }>;
};

type CompleteBundleProductDraft = {
  productId: string;
  handle?: string;
  title: string;
  image: string;
  price: string;
  defaultVariantId?: string;
  selectedVariantId?: string;
  selectedOptions?: Record<string, string>;
  pricing?: { mode: CompleteBundlePricingMode; value: number };
  variants?: Array<{
    id: string;
    title: string;
    price?: string;
    selectedOptions?: Array<{ name: string; value: string }>;
  }>;
};

/** 从价格字符串解析为数字（支持 12.99 / 12,99 / €12.99） */
function parseMoneyStringToNumber(raw?: string): number {
  if (raw == null) return 0;
  const stripped = String(raw).trim().replace(/[^\d.,-]/g, "");
  if (!stripped) return 0;
  const lastComma = stripped.lastIndexOf(",");
  const lastDot = stripped.lastIndexOf(".");
  let normalized = stripped;
  if (lastComma > lastDot) {
    normalized = stripped.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = stripped.replace(/,/g, "");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 单件商品定价：原价 / 百分比优惠 / 立减金额 / 固定价
 * full_price：原价；percentage_off：按百分比减价；amount_off：减固定金额；fixed_price：指定售价
 */
function applyCompleteBundleProductPricing(
  mode: CompleteBundlePricingMode,
  value: number,
  basePrice: number,
): { final: number; original: number } {
  const original = Math.max(0, basePrice);
  if (mode === "full_price") {
    return { final: original, original };
  }
  if (mode === "percentage_off") {
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    const final = Math.round(original * (1 - pct / 100) * 100) / 100;
    return { final, original };
  }
  if (mode === "amount_off") {
    const off = Math.max(0, Number(value) || 0);
    const final = Math.max(0, Math.round((original - off) * 100) / 100);
    return { final, original };
  }
  const fixed = Math.max(0, Number(value) || 0);
  return { final: Math.round(fixed * 100) / 100, original };
}

function formatEuroFromNumber(amount: number): string {
  return `€${amount.toFixed(2).replace(".", ",")}`;
}

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
  const initialCompleteBundleConfig = useMemo(
    () => parseCompleteBundleConfig(initialOffer?.selectedProductsJson),
    [initialOffer?.selectedProductsJson],
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
  const addCompleteBundleBar = (type: "quantity-break-same" | "bxgy") => {
    const id = `bar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const seededProducts =
      mainBundleProduct && mainBundleProduct.productId
        ? [
            {
              ...mainBundleProduct,
              pricing: mainBundleProduct.pricing ?? { mode: "full_price", value: 0 },
              selectedVariantId:
                mainBundleProduct.selectedVariantId ||
                mainBundleProduct.defaultVariantId ||
                mainBundleProduct.variants?.[0]?.id ||
                "",
            },
          ]
        : [];
    const newBar: CompleteBundleBar = {
      id,
      type,
      title: type === "bxgy" ? "Buy X, Get Y" : "Complete the bundle",
      subtitle: "",
      quantity: 2,
      // 新增 bar 默认继承主产品，后续可在预览里继续编辑
      products: seededProducts,
      pricing: { mode: "full_price", value: 0 },
    };
    setCompleteBundleBars((prev) => [...prev, newBar]);
    setActiveBundleBarId(id);
  };

  const removeCompleteBundleBar = (barId: string) => {
    setCompleteBundleBars((prev) => {
      const next = prev.filter((bar) => bar.id !== barId);
      if (!next.length) return prev;
      if (activeBundleBarId === barId) {
        setActiveBundleBarId(next[0].id);
      }
      return next;
    });
  };

  const updateCompleteBundleBar = (
    barId: string,
    patch: Partial<CompleteBundleBar>,
  ) => {
    setCompleteBundleBars((prev) =>
      prev.map((bar) => (bar.id === barId ? { ...bar, ...patch } : bar)),
    );
  };

  const handleSelectProductsForBundleBar = async (barId: string) => {
    const targetBar = completeBundleBars.find((bar) => bar.id === barId);
    if (!targetBar) return;
    const targetBarIndex = completeBundleBars.findIndex((bar) => bar.id === barId);
    const isFirstBar = targetBarIndex === 0;
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      // bar #1 仅允许一个主产品；其他 bar 允许扩展多产品
      multiple: !isFirstBar,
      selectionIds: targetBar.products.map((p) => ({ id: p.productId })),
    });
    if (!selected) return;
    let mappedProducts: CompleteBundleProductDraft[] = selected.map((item: any) => ({
      productId: String(item.id),
      handle: String(item.handle || ""),
      title: item.title,
      image: item.images?.[0]?.originalSrc || "https://via.placeholder.com/60",
      price: item.variants?.[0]?.price || "€0.00",
      defaultVariantId: item.variants?.[0]?.id ? String(item.variants[0].id) : "",
      selectedVariantId: item.variants?.[0]?.id ? String(item.variants[0].id) : "",
      selectedOptions: {},
      variants: Array.isArray(item.variants)
        ? item.variants.map((variant: any) => ({
            id: String(variant.id),
            title: String(variant.title || ""),
            price: String(variant.price || ""),
            selectedOptions: Array.isArray(variant.selectedOptions)
              ? variant.selectedOptions.map((opt: any) => ({
                  name: String(opt.name || ""),
                  value: String(opt.value || ""),
                }))
              : [],
          }))
        : [],
    }));
    if (isFirstBar) {
      mappedProducts = mappedProducts.slice(0, 1);
    } else if (mainBundleProduct?.productId) {
      const hasMain = mappedProducts.some(
        (product) => product.productId === mainBundleProduct.productId,
      );
      if (!hasMain) {
        // 后续 bar 默认包含主产品
        mappedProducts = [mainBundleProduct as CompleteBundleProductDraft, ...mappedProducts];
      }
    }
    updateCompleteBundleBar(barId, {
      products: mappedProducts.map((p) => {
        const prev = targetBar.products.find((op) => op.productId === p.productId);
        return {
          productId: p.productId,
          handle: p.handle || "",
          title: p.title,
          image: p.image,
          price: p.price,
          defaultVariantId: p.defaultVariantId,
          selectedVariantId: p.selectedVariantId,
          selectedOptions: p.selectedOptions,
          variants: p.variants,
          pricing: prev?.pricing ?? p.pricing ?? { mode: "full_price" as const, value: 0 },
        };
      }),
    });
  };

  const [discountRules, setDiscountRules] = useState<DiscountRule[]>(() =>
    parseDiscountRules(initialOffer?.discountRulesJson),
  );
  const [bxgyDiscountRules, setBxgyDiscountRules] = useState<BxgyDiscountRule[]>(
    parseBxgyDiscountRules(initialOffer?.discountRulesJson),
  );
  const [buyProducts, setBuyProducts] = useState<string[]>(() => {
    if (initialOffer?.offerType !== 'bxgy' || !initialOffer.selectedProductsJson) return [];
    try {
      const parsed = JSON.parse(initialOffer.selectedProductsJson);
      return Array.isArray(parsed.buyProducts) ? parsed.buyProducts.map(String) : [];
    } catch (e) {
      return [];
    }
  });
  const [getProducts, setGetProducts] = useState<string[]>(() => {
    if (initialOffer?.offerType !== 'bxgy' || !initialOffer.selectedProductsJson) return [];
    try {
      const parsed = JSON.parse(initialOffer.selectedProductsJson);
      return Array.isArray(parsed.getProducts) ? parsed.getProducts.map(String) : [];
    } catch (e) {
      return [];
    }
  });
  const [completeBundleBars, setCompleteBundleBars] = useState<CompleteBundleBar[]>(
    () =>
      initialOffer?.offerType === "complete-bundle" &&
      initialCompleteBundleConfig.bars.length > 0
        ? initialCompleteBundleConfig.bars
        : [
            {
              id: `bar-${Date.now()}`,
              type: "quantity-break-same",
              title: "Complete the bundle",
              subtitle: "",
              quantity: 2,
              products: [],
              pricing: { mode: "full_price", value: 0 },
            },
          ],
  );
  const [activeBundleBarId, setActiveBundleBarId] = useState<string>(
    () => initialCompleteBundleConfig.bars[0]?.id || "",
  );
  const activeBundleBar =
    completeBundleBars.find((bar) => bar.id === activeBundleBarId) ||
    completeBundleBars[0] ||
    null;
  const mainBundleProduct = completeBundleBars[0]?.products?.[0];
  const storeProductMap = useMemo(
    () =>
      new Map(
        (storeProducts || []).map((p) => [
          String(p.id || ""),
          p,
        ]),
      ),
    [storeProducts],
  );

  // 兼容历史轻量数据：若 selectedProductsJson 里没有变体明细，则用 storeProducts 按 productId 动态补全
  useEffect(() => {
    if (offerType !== "complete-bundle") return;
    if (!storeProductMap.size) return;
    setCompleteBundleBars((prev) => {
      let changed = false;
      const next = prev.map((bar) => ({
        ...bar,
        products: (bar.products || []).map((product) => {
          const noVariants = !Array.isArray(product.variants) || product.variants.length === 0;
          const missingDisplayData = !product.title || !product.image || !product.price;
          if (!noVariants && !missingDisplayData) return product;
          const hit = storeProductMap.get(String(product.productId || ""));
          if (!hit) return product;
          const variants = Array.isArray(hit.variants) ? hit.variants : [];
          if (!variants.length && !missingDisplayData) return product;
          const preferredVariantId = String(product.selectedVariantId || "");
          const chosen = variants.find((v) => String(v.id) === preferredVariantId) || variants[0];
          changed = true;
          return {
            ...product,
            handle: product.handle || hit.handle || "",
            title: product.title || hit.name || "",
            image: product.image || hit.image || "",
            price: chosen?.price || product.price || hit.price || "",
            defaultVariantId: product.defaultVariantId || String(variants[0]?.id || ""),
            selectedVariantId:
              chosen?.id || product.selectedVariantId || String(variants[0]?.id || ""),
            selectedOptions:
              product.selectedOptions && Object.keys(product.selectedOptions).length > 0
                ? product.selectedOptions
                : Object.fromEntries((chosen?.selectedOptions || []).map((opt) => [opt.name, opt.value])),
            variants: variants.length ? variants : product.variants,
          };
        }),
      }));
      return changed ? next : prev;
    });
  }, [offerType, storeProductMap]);
  // 统一格式化价格，优先显示为欧元格式，避免预览里丢失价格展示
  const formatBundlePrice = (raw?: string) => {
    if (!raw) return "€0.00";
    const cleaned = String(raw).trim();
    if (/[€$£¥]/.test(cleaned)) return cleaned;
    const parsed = Number(cleaned.replace(",", "."));
    if (Number.isFinite(parsed)) return `€${parsed.toFixed(2)}`;
    return cleaned;
  };

  const updateBundleBarProductVariant = (
    barId: string,
    productId: string,
    variantId: string,
  ) => {
    setCompleteBundleBars((prev) =>
      prev.map((bar) => {
        if (bar.id !== barId) return bar;
        return {
          ...bar,
          products: bar.products.map((product) => {
            if (product.productId !== productId) return product;
            const hit = product.variants?.find((v) => v.id === variantId);
            return {
              ...product,
              selectedVariantId: variantId,
              selectedOptions: Array.isArray(hit?.selectedOptions)
                ? Object.fromEntries(
                    (hit?.selectedOptions || []).map((opt) => [opt.name, opt.value]),
                  )
                : product.selectedOptions || {},
              price: hit?.price || product.price,
            };
          }),
        };
      }),
    );
  };

  const updateBundleBarProductOption = (
    barId: string,
    productId: string,
    optionName: string,
    optionValue: string,
  ) => {
    setCompleteBundleBars((prev) =>
      prev.map((bar) => {
        if (bar.id !== barId) return bar;
        return {
          ...bar,
          products: bar.products.map((product) => {
            if (product.productId !== productId) return product;
            const currentVariant =
              product.variants?.find((v) => v.id === product.selectedVariantId) ||
              product.variants?.[0];
            const currentOptions = Object.fromEntries(
              (currentVariant?.selectedOptions || []).map((opt) => [opt.name, opt.value]),
            );
            const nextOptions = {
              ...currentOptions,
              ...(product.selectedOptions || {}),
              [optionName]: optionValue,
            };
            const matchedVariant = product.variants?.find((variant) => {
              const variantOptions = Object.fromEntries(
                (variant.selectedOptions || []).map((opt) => [opt.name, opt.value]),
              );
              return Object.entries(nextOptions).every(
                ([name, value]) => variantOptions[name] === value,
              );
            });
            return {
              ...product,
              selectedOptions: nextOptions,
              selectedVariantId: matchedVariant?.id || product.selectedVariantId,
              price: matchedVariant?.price || product.price,
            };
          }),
        };
      }),
    );
  };

  const updateBundleProductPricing = (
    barId: string,
    productId: string,
    pricing: { mode: CompleteBundlePricingMode; value: number },
  ) => {
    setCompleteBundleBars((prev) =>
      prev.map((bar) => {
        if (bar.id !== barId) return bar;
        return {
          ...bar,
          products: bar.products.map((p) =>
            p.productId === productId ? { ...p, pricing } : p,
          ),
        };
      }),
    );
  };

  /**
   * 向 Bar #2 及之后追加新商品（多选 resourcePicker，按 productId 去重后合并到该栏）
   */
  const appendProductsToBundleBar = async (barId: string) => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      selectionIds: [],
    });
    if (!selected || !Array.isArray(selected) || selected.length === 0) return;
    const mappedProducts: CompleteBundleProductDraft[] = selected.map((item: any) => ({
      productId: String(item.id),
      handle: String(item.handle || ""),
      title: item.title,
      image: item.images?.[0]?.originalSrc || "https://via.placeholder.com/60",
      price: item.variants?.[0]?.price || "€0.00",
      defaultVariantId: item.variants?.[0]?.id ? String(item.variants[0].id) : "",
      selectedVariantId: item.variants?.[0]?.id ? String(item.variants[0].id) : "",
      selectedOptions: {},
      variants: Array.isArray(item.variants)
        ? item.variants.map((variant: any) => ({
            id: String(variant.id),
            title: String(variant.title || ""),
            price: String(variant.price || ""),
            selectedOptions: Array.isArray(variant.selectedOptions)
              ? variant.selectedOptions.map((opt: any) => ({
                  name: String(opt.name || ""),
                  value: String(opt.value || ""),
                }))
              : [],
          }))
        : [],
    }));
    setCompleteBundleBars((prev) => {
      const targetBarIndex = prev.findIndex((bar) => bar.id === barId);
      if (targetBarIndex <= 0) return prev;
      const targetBar = prev[targetBarIndex];
      const existingIds = new Set(targetBar.products.map((p) => p.productId));
      const toAdd = mappedProducts.filter((p) => !existingIds.has(p.productId));
      if (!toAdd.length) return prev;
      return prev.map((bar) =>
        bar.id !== barId
          ? bar
          : {
              ...bar,
              products: [
                ...bar.products,
                ...toAdd.map((p) => ({
                  ...p,
                  pricing: { mode: "full_price" as const, value: 0 },
                })),
              ],
            },
      );
    });
  };

  /**
   * 仅 Bar #2 及之后：从该 bundle 栏移除单个商品（Bar1 仅默认主商品，不提供删除入口）
   */
  const removeProductFromBundleBar = (barId: string, productId: string) => {
    setCompleteBundleBars((prev) => {
      const targetBarIndex = prev.findIndex((bar) => bar.id === barId);
      if (targetBarIndex <= 0) return prev;
      return prev.map((bar) =>
        bar.id !== barId
          ? bar
          : { ...bar, products: bar.products.filter((p) => p.productId !== productId) },
      );
    });
  };

  /**
   * 左侧栏内：单个商品的定价模式 + 变体预览控件（Bar1 与 Bar2+ 共用；仅 Bar2+ 显示删除）
   */
  const renderCompleteBundleProductPricingCard = (
    bar: CompleteBundleBar,
    product: CompleteBundleProduct,
    productIdx: number,
    isFirstOfferBar: boolean,
  ) => {
    const selectedVariant =
      product.variants?.find((v) => v.id === product.selectedVariantId) ||
      product.variants?.[0];
    const optionNames = Array.from(
      new Set(
        (product.variants || [])
          .flatMap((variant) => variant.selectedOptions || [])
          .map((opt) => opt.name)
          .filter(Boolean),
      ),
    );
    const selectedOptionsMap = Object.fromEntries(
      (selectedVariant?.selectedOptions || []).map((opt) => [opt.name, opt.value]),
    );
    const pMode = product.pricing?.mode ?? "full_price";
    const pValue = product.pricing?.value ?? 0;
    const valueLabel =
      pMode === "percentage_off"
        ? "Discount per item (%)"
        : pMode === "amount_off"
          ? "Amount off (€)"
          : pMode === "fixed_price"
            ? "Total price (€)"
            : "Pricing value";
    const productLabel = isFirstOfferBar ? "默认产品" : `商品 ${productIdx + 1}`;

    return (
      <div
        key={product.productId}
        className="border border-[#dfe3e8] rounded-md p-3 bg-[#fafbfc]"
      >
        <div className="flex items-start gap-2 mb-2 justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {product.image ? (
              <img
                src={product.image}
                alt=""
                className="w-10 h-10 rounded object-cover shrink-0"
              />
            ) : null}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[#1c1f23]">{productLabel}</div>
              <div className="text-[11px] text-[#5c6166] truncate">
                {product.title || product.productId}
              </div>
            </div>
          </div>
          {!isFirstOfferBar && (
            <Button
              type="text"
              danger
              size="small"
              className="shrink-0"
              icon={<Trash2 size={14} aria-hidden />}
              onClick={() => removeProductFromBundleBar(bar.id, product.productId)}
            >
              删除
            </Button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[12px] font-medium text-[#1c1f23]">
            Price
            <Select
              size="small"
              className="mt-1 w-full"
              value={pMode}
              onChange={(val) =>
                updateBundleProductPricing(bar.id, product.productId, {
                  mode: val as CompleteBundlePricingMode,
                  value: val === "full_price" ? 0 : pValue,
                })
              }
              options={[
                { label: "Full price", value: "full_price" },
                { label: "Percentage off", value: "percentage_off" },
                { label: "Amount off", value: "amount_off" },
                { label: "Fixed price", value: "fixed_price" },
              ]}
            />
          </label>
          <label className="block text-[12px] font-medium text-[#1c1f23]">
            {valueLabel}
            <Input
              size="small"
              type="number"
              min={0}
              disabled={pMode === "full_price"}
              className="mt-1"
              value={pMode === "full_price" ? 0 : pValue}
              onChange={(e) =>
                updateBundleProductPricing(bar.id, product.productId, {
                  mode: pMode,
                  value: Number(e.target.value) || 0,
                })
              }
            />
          </label>
        </div>
        <div className="mt-3">
          <div className="text-[12px] font-medium mb-1 text-[#1c1f23]">Variant / Option preview</div>
          {Array.isArray(product.variants) &&
            product.variants.length > 0 &&
            optionNames.length === 0 && (
              <Select
                size="small"
                className="w-full mb-2"
                value={product.selectedVariantId || product.variants[0].id}
                onChange={(variantId) =>
                  updateBundleBarProductVariant(bar.id, product.productId, String(variantId))
                }
                options={product.variants.map((variant) => ({
                  label: variant.title,
                  value: variant.id,
                }))}
              />
            )}
          {optionNames.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {optionNames.map((optionName) => {
                const optionValues = Array.from(
                  new Set(
                    (product.variants || [])
                      .flatMap((variant) => variant.selectedOptions || [])
                      .filter((opt) => opt.name === optionName)
                      .map((opt) => opt.value)
                      .filter(Boolean),
                  ),
                );
                return (
                  <Select
                    key={`${product.productId}-${optionName}-cfg`}
                    size="small"
                    className="w-full"
                    value={selectedOptionsMap[optionName] || optionValues[0]}
                    onChange={(value) =>
                      updateBundleBarProductOption(bar.id, product.productId, optionName, String(value))
                    }
                    options={optionValues.map((value) => ({
                      label: value,
                      value,
                    }))}
                  />
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (offerType === 'bxgy') {
      setBxgyDiscountRules(prev =>
        prev.map(rule => ({
          ...rule,
          count: rule.count || 1,
          buyProductIds: buyProducts,
          getProductIds: getProducts,
        })),
      );
    }
  }, [buyProducts, getProducts, offerType]);
  useEffect(() => {
    if (offerType !== "complete-bundle") return;
    if (!completeBundleBars.length) return;
    const exists = completeBundleBars.some((bar) => bar.id === activeBundleBarId);
    if (!exists) {
      setActiveBundleBarId(completeBundleBars[0].id);
    }
  }, [offerType, completeBundleBars, activeBundleBarId]);

  const [status, setStatus] = useState<boolean>(
    initialOffer ? initialOffer.status : true
  );

  const normalizedDiscountRules = sanitizeDiscountRules(discountRules);
  const featuredRule = normalizedDiscountRules[0];

  const hasDefault = normalizedDiscountRules.some(r => r.isDefault);

  const previewItems: PreviewItem[] = useMemo(() => {
    if (offerType === "complete-bundle" && completeBundleBars.length > 0) {
      return completeBundleBars.map((bar, index) => {
        const productsCount = Array.isArray(bar.products) ? bar.products.length : 0;
        let sumOriginal = 0;
        let sumFinal = 0;
        for (const p of bar.products) {
          const selectedVariant =
            p.variants?.find((v) => v.id === p.selectedVariantId) || p.variants?.[0];
          const base = parseMoneyStringToNumber(selectedVariant?.price || p.price);
          const mode = p.pricing?.mode ?? "full_price";
          const val = p.pricing?.value ?? 0;
          const { final, original } = applyCompleteBundleProductPricing(mode, val, base);
          sumOriginal += original;
          sumFinal += final;
        }
        const saved = Math.max(0, sumOriginal - sumFinal);
        return {
          id: bar.id,
          title: bar.title || `Bar #${index + 1}`,
          subtitle:
            bar.subtitle ||
            `${bar.type === "bxgy" ? "Buy X Get Y" : "Quantity break"} · ${productsCount} products`,
          price: formatPreviewPrice(sumFinal),
          original: sumOriginal > sumFinal ? formatPreviewPrice(sumOriginal) : undefined,
          featured: index === 0,
          badge: index === 0 ? "Most Popular" : "",
          saveLabel:
            saved > 0 ? `SAVE ${formatPreviewPrice(saved)}` : `Qty ${Math.max(1, Number(bar.quantity) || 1)}`,
        };
      });
    }

    if (offerType === "bxgy" && bxgyDiscountRules.length > 0) {
      const bxgyHasDefault = bxgyDiscountRules.some(r => r.isDefault);
      return bxgyDiscountRules.map((rule, index) => {
        const isFeatured = bxgyHasDefault ? !!rule.isDefault : index === 0;
        const displayCount = rule.count || 1;
        return {
          id: `bxgy-tier-${rule.count}`,
          title: rule.title || `${displayCount} items`,
          subtitle: rule.subtitle || `Buy ${rule.buyQuantity}, Get ${rule.getQuantity}`,
          price: rule.discountPercent === 100
            ? `${rule.getQuantity} FREE`
            : `${rule.discountPercent}% OFF`,
          featured: isFeatured,
          badge: rule.badge || (isFeatured ? "Most Popular" : ""),
          saveLabel: `BUY ${rule.buyQuantity} + GET ${rule.getQuantity}`,
        };
      });
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
    completeBundleBars,
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
    {
      id: "complete-bundle",
      name: "Complete the bundle",
      description:
        "Create multiple bundle bars and let customers choose product variants/options",
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
        if (offerType === "complete-bundle") {
          const hasInvalidBar = completeBundleBars.some(
            (bar) => !bar.products?.length || !Number.isFinite(Number(bar.quantity)) || Number(bar.quantity) < 1,
          );
          if (hasInvalidBar) {
            e.preventDefault();
            Modal.error({
              title: "Validation Error",
              content: "Each bundle bar must contain at least one product and a valid quantity.",
            });
            setStep(2);
            return;
          }
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
        value={JSON.stringify(
          offerType === "bxgy"
            ? { buyProducts, getProducts }
            : offerType === "complete-bundle"
              ? buildCompleteBundleConfig({ bars: completeBundleBars })
              : selectedProductsData,
        )}
      />
      <input
        type="hidden"
        name="discountRulesJson"
        value={JSON.stringify(
          offerType === "bxgy"
            ? buildBxgyDiscountRulesJson(bxgyDiscountRules)
            : offerType === "complete-bundle"
              ? completeBundleBars.map((bar) => ({
                  id: bar.id,
                  type: bar.type,
                  quantity: bar.quantity,
                  pricing: bar.pricing,
                  products: bar.products.map((p) => ({
                    productId: p.productId,
                    pricing: p.pricing ?? { mode: "full_price" as const, value: 0 },
                  })),
                }))
              : buildDiscountRulesJson(normalizedDiscountRules),
        )}
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
                            setOfferName(e.target.value.replace(/[]+/g, " "));
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
                          disabled={!!initialOffer}
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
                            setCartTitle(e.target.value.replace(/[]+/g, " "));
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
                  ) : offerType === "complete-bundle" ? (
                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-[14px] font-medium text-[#1c1f23]">
                          Bundle bars
                        </h3>
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
                      <div className="flex flex-col gap-3">
                        {completeBundleBars.map((bar, index) => (
                          <div
                            key={bar.id}
                            className={`border rounded-md p-3 ${activeBundleBar?.id === bar.id ? "border-[#008060]" : "border-[#dfe3e8]"}`}
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
                                Bar #{index + 1} - {bar.title || (bar.type === "bxgy" ? "Buy X, Get Y" : "Complete the bundle")}
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
                            {/* 每栏内嵌「定价 + 变体预览」：Bar1 仅默认主商品；Bar2+ 可多商品并支持追加/删除 */}
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
                                      handleSelectProductsForBundleBar(bar.id);
                                      e.preventDefault();
                                    }}
                                  >
                                    {bar.products.length ? "Change default product" : "Select default product"}
                                  </Button>
                                  <span className="text-[11px] text-[#5c6166]">
                                    Bar #1 仅允许 1 个默认主商品
                                  </span>
                                </div>
                              ) : (
                                <div className="mb-2">
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={(e) => {
                                      setActiveBundleBarId(bar.id);
                                      appendProductsToBundleBar(bar.id);
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
                                    ? "请先选择默认主商品。"
                                    : "本栏暂无商品，可点击「+ Add product」添加。"}
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

                  {/* complete-bundle 的定价与变体已并入各 Bundle bar 卡片，此处仅渲染 BXGY 或普通折扣阶梯 */}
                  {offerType === "bxgy" ? (
                    <div>
                      <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">BXGY Rules</h3>
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
                                      setBxgyDiscountRules(prev =>
                                        prev.map((r, i) =>
                                          i === index ? { ...r, count: nextCount } : r,
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
                                      setBxgyDiscountRules(prev =>
                                        prev.map((r, i) =>
                                          i === index ? { ...r, buyQuantity: nextCount } : r,
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
                                      setBxgyDiscountRules(prev =>
                                        prev.map((r, i) =>
                                          i === index ? { ...r, getQuantity: nextCount } : r,
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
                                      setBxgyDiscountRules(prev =>
                                        prev.map((r, i) =>
                                          i === index
                                            ? { ...r, discountPercent: nextPercent }
                                            : r,
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
                                      setBxgyDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, title: val } : r));
                                    }}
                                  />
                                </label>
                                <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                                  Subtitle
                                  <Input
                                    size="large"
                                    className="mt-1"
                                    value={rule.subtitle || ''}
                                    placeholder="e.g. Buy 2, get 1 free"
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setBxgyDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, subtitle: val } : r));
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
                                      setBxgyDiscountRules(prev => prev.map((r, i) => i === index ? { ...r, badge: val } : r));
                                    }}
                                  />
                                </label>
                              </div>

                              <div className="create-offer-discount-form-row" style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                                      setBxgyDiscountRules(prev =>
                                        prev.map((r, i) =>
                                          i === index ? { ...r, maxUsesPerOrder: nextMax } : r,
                                        ),
                                      );
                                    }}
                                  />
                                </label>
                              </div>

                              <div className="create-offer-discount-form-row" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Checkbox
                                  checked={!!rule.isDefault}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setBxgyDiscountRules(prev =>
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
                                    setBxgyDiscountRules(prev => {
                                      if (prev.length <= 1) return prev;
                                      return prev.filter((_, i) => i !== index);
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
                            setBxgyDiscountRules(prev => {
                              const maxCount = prev.reduce((max, rule) => Math.max(max, rule.count), 1);
                              return [...prev, {
                                count: maxCount + 1,
                                buyQuantity: 2,
                                getQuantity: 1,
                                buyProductIds: buyProducts,
                                getProductIds: getProducts,
                                discountPercent: 100,
                                maxUsesPerOrder: 1,
                              }];
                            });
                          }}
                        >
                          + Add BXGY tier
                        </Button>
                    </div>
                    ) : offerType === "complete-bundle" ? null : (
                    <div>
                      <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">Discount Setting</h3>
                        {discountRules.map((rule, index) => (
                          <div className="create-offer-discount-card" key={index}>
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
                    </div>
                    )}
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
                  {offerType === "complete-bundle" ? (
                    <div className="create-offer-preview-card">
                      <div className="create-offer-style-preview-header">
                        {widgetTitle || "Bundle & Save"}
                      </div>
                      <div className="create-offer-style-preview-list create-offer-style-preview-list--vertical">
                        {completeBundleBars.map((bar, barIndex) => (
                          <div
                            key={bar.id}
                            className="create-offer-style-preview-item"
                            style={{
                              borderColor:
                                activeBundleBar?.id === bar.id ? accentColor : borderColor,
                              background: cardBackgroundColor,
                            }}
                          >
                            {/* Live Preview：单选表示「当前生效 / 顾客将选购」的 bundle 栏，与左侧配置 active 同步 */}
                            <div className="flex items-start gap-2 mb-1">
                              <input
                                type="radio"
                                name="complete-bundle-live-preview-bar"
                                className="mt-1 shrink-0"
                                checked={activeBundleBarId === bar.id}
                                onChange={() => setActiveBundleBarId(bar.id)}
                                aria-label={`Select bundle bar ${barIndex + 1}`}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="create-offer-style-preview-item-title">
                                    {bar.title || `Bar #${barIndex + 1}`}
                                  </div>
                                  <Button
                                    type="link"
                                    className="px-0 h-auto shrink-0"
                                    onClick={(e) => {
                                      setActiveBundleBarId(bar.id);
                                      handleSelectProductsForBundleBar(bar.id);
                                      e.preventDefault();
                                    }}
                                  >
                                    {bar.products.length ? "Edit bar products" : "Select bar products"}
                                  </Button>
                                </div>
                                <div className="create-offer-style-preview-item-subtitle">
                                  {bar.subtitle ||
                                    `${bar.type === "bxgy" ? "Buy X Get Y" : "Quantity break"} · Qty ${bar.quantity}`}
                                </div>
                              </div>
                            </div>
                            {bar.products.length >= 1 ? (() => {
                              let sumOriginal = 0;
                              let sumFinal = 0;
                              for (const p of bar.products) {
                                const v =
                                  p.variants?.find((x) => x.id === p.selectedVariantId) ||
                                  p.variants?.[0];
                                const base = parseMoneyStringToNumber(v?.price || p.price);
                                const { final, original } = applyCompleteBundleProductPricing(
                                  p.pricing?.mode ?? "full_price",
                                  p.pricing?.value ?? 0,
                                  base,
                                );
                                sumOriginal += original;
                                sumFinal += final;
                              }
                              const saved = Math.max(0, sumOriginal - sumFinal);
                              return (
                                <>
                                  <div className="mt-2 text-[13px] font-semibold text-[#1c1f23] flex flex-wrap items-baseline gap-2">
                                    <span>{formatEuroFromNumber(sumFinal)}</span>
                                    {sumOriginal > sumFinal ? (
                                      <span className="text-[12px] text-[#9aa0a6] line-through font-normal">
                                        {formatEuroFromNumber(sumOriginal)}
                                      </span>
                                    ) : null}
                                  </div>
                                  {saved > 0 ? (
                                    <div className="mt-1 text-[12px] text-[#008060] font-medium">
                                      Save {formatEuroFromNumber(saved)}!
                                    </div>
                                  ) : null}
                                </>
                              );
                            })() : null}
                            <div
                              className={
                                bar.products.length >= 2
                                  ? "mt-2 flex flex-wrap items-stretch gap-2"
                                  : "mt-2 flex flex-col gap-2"
                              }
                            >
                              {bar.products.length === 0 ? (
                                <div className="text-[12px] text-[#5c6166]">
                                  No products selected.
                                </div>
                              ) : (
                                bar.products.map((product, pIdx) => {
                                  const selectedVariant =
                                    product.variants?.find((v) => v.id === product.selectedVariantId) ||
                                    product.variants?.[0];
                                  const optionNames = Array.from(
                                    new Set(
                                      (product.variants || [])
                                        .flatMap((variant) => variant.selectedOptions || [])
                                        .map((opt) => opt.name)
                                        .filter(Boolean),
                                    ),
                                  );
                                  const selectedOptionsMap = Object.fromEntries(
                                    (selectedVariant?.selectedOptions || []).map((opt) => [
                                      opt.name,
                                      opt.value,
                                    ]),
                                  );
                                  const base = parseMoneyStringToNumber(
                                    selectedVariant?.price || product.price,
                                  );
                                  const { final, original } = applyCompleteBundleProductPricing(
                                    product.pricing?.mode ?? "full_price",
                                    product.pricing?.value ?? 0,
                                    base,
                                  );
                                  return (
                                    <div key={product.productId} className="contents">
                                      {bar.products.length >= 2 && pIdx > 0 ? (
                                        <div className="flex items-center justify-center px-1 text-[16px] font-bold text-[#9aa0a6] self-center">
                                          +
                                        </div>
                                      ) : null}
                                      <div
                                        className={
                                          bar.products.length >= 2
                                            ? "rounded border border-[#e5e7eb] p-2 flex-1 min-w-[140px] bg-white"
                                            : "rounded border border-[#e5e7eb] p-2 bg-white"
                                        }
                                      >
                                        {product.image ? (
                                          <img
                                            src={product.image}
                                            alt={product.title || "product"}
                                            className="w-12 h-12 rounded object-cover mb-2"
                                          />
                                        ) : null}
                                        <div className="text-[11px] font-medium text-[#1c1f23] line-clamp-2">
                                          {product.title || product.productId}
                                        </div>
                                        <div className="text-[12px] mt-1 flex flex-wrap items-baseline gap-1">
                                          <span className="font-semibold text-[#1c1f23]">
                                            {formatEuroFromNumber(final)}
                                          </span>
                                          {original > final ? (
                                            <span className="text-[11px] text-[#9aa0a6] line-through">
                                              {formatEuroFromNumber(original)}
                                            </span>
                                          ) : null}
                                        </div>
                                        {Array.isArray(product.variants) &&
                                          product.variants.length > 0 &&
                                          optionNames.length === 0 && (
                                            <Select
                                              size="small"
                                              className="w-full mt-2"
                                              value={product.selectedVariantId || product.variants[0].id}
                                              onChange={(variantId) =>
                                                updateBundleBarProductVariant(
                                                  bar.id,
                                                  product.productId,
                                                  String(variantId),
                                                )
                                              }
                                              options={product.variants.map((variant) => ({
                                                label: variant.title || "Default",
                                                value: variant.id,
                                              }))}
                                            />
                                          )}
                                        {optionNames.length > 0 ? (
                                          <div className="grid grid-cols-1 gap-2 mt-2">
                                            {optionNames.map((optionName) => {
                                              const optionValues = Array.from(
                                                new Set(
                                                  (product.variants || [])
                                                    .flatMap((variant) => variant.selectedOptions || [])
                                                    .filter((opt) => opt.name === optionName)
                                                    .map((opt) => opt.value)
                                                    .filter(Boolean),
                                                ),
                                              );
                                              return (
                                                <Select
                                                  key={`${product.productId}-${optionName}-live`}
                                                  size="small"
                                                  className="w-full"
                                                  value={
                                                    selectedOptionsMap[optionName] || optionValues[0]
                                                  }
                                                  onChange={(value) =>
                                                    updateBundleBarProductOption(
                                                      bar.id,
                                                      product.productId,
                                                      optionName,
                                                      String(value),
                                                    )
                                                  }
                                                  options={optionValues.map((value) => ({
                                                    label: value,
                                                    value,
                                                  }))}
                                                />
                                              );
                                            })}
                                          </div>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {showCustomButton ? (
                        <button
                          className="create-offer-preview-button"
                          style={{ background: buttonPrimaryColor, marginTop: 12 }}
                        >
                          {buttonText}
                        </button>
                      ) : null}
                    </div>
                  ) : (
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
                  )}
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
                      setWidgetTitle(e.target.value.replace(/[]+/g, " "))
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
                            setButtonText(e.target.value.replace(/[]+/g, " "))
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
              if (offerType === "bxgy") {
                if (buyProducts.length === 0 || getProducts.length === 0) {
                  message.error("Please select both Buy and Get products for a BXGY offer.");
                  e.preventDefault();
                  return;
                }
              } else if (offerType === "complete-bundle") {
                const hasEmptyBar = completeBundleBars.some((bar) => bar.products.length === 0);
                if (hasEmptyBar) {
                  message.error("Please select products for every bundle bar.");
                  e.preventDefault();
                  return;
                }
              } else {
                if (selectedProductsData.length === 0) {
                  message.error("Please select at least one product.");
                  e.preventDefault();
                  return;
                }
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
