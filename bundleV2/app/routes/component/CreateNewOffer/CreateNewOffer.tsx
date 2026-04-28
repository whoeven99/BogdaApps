import { useEffect, useRef, useState, useMemo } from "react";
import { useFetcher, useNavigate, useSearchParams } from "react-router";
import { Button, Input, Select, Switch, Modal, message } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import {
  Trash2,
} from "lucide-react";

dayjs.extend(utc);
dayjs.extend(timezone);
import "./CreateNewOffer.css";
import {
  AdminPageHeader,
} from "../adminUi";
import BundlePreview from "../BundlePreview/BundlePreview";
import { PreviewItem } from "../BundlePreview/bundlePreviewShared";
import BuilderStepIntro from "./BuilderStepIntro";
import type { CampaignDraft, CampaignDraftActions } from "./campaignDraft";
import {
  buildDiscountRulesPayload,
  buildSelectedProductsPayload,
  validateFinalSubmitScopeAndLogic,
  validateScopeAndLogicStep,
} from "./campaignBuilderRegistry";
import DisplayBlocksEditor from "./DisplayBlocksEditor";
import LogicEditorsRenderer from "./LogicEditorsRenderer";
import QuantityBreaksDisplayCustomizer from "./QuantityBreaksDisplayCustomizer";
import ScheduleTargetingEditor from "./ScheduleTargetingEditor";
import { getStarterTemplateDefaults } from "./starterTemplateDefaults";
import {
  OFFER_TEXT_LIMITS,
  buildLegacyFieldsFromCampaignConfig,
  buildDifferentProductsDiscountRulesJson,
  migrateLegacyOfferToCampaignConfig,
  normalizeOfferNameKey,
  parseCampaignConfig,
  parseDiscountRules,
  parseBxgyDiscountRules,
  parseDifferentProductsDiscountRules,
  parseFreeGiftRules,
  parseOfferSettings,
  parseSelectedProductIds,
  buildBxgyDiscountRulesJson,
  buildFreeGiftRulesJson,
  progressiveGiftsConfigToStorableJson,
  type ProgressiveGiftsConfig,
  parseCompleteBundleConfig,
  parseFreeGiftSelectedProducts,
  buildCompleteBundleConfig,
  type CompleteBundleBar,
  type CompleteBundleProduct,
  type CompleteBundlePricingMode,
  type CampaignConfig,
  type DifferentProductsDiscountRule,
  type FreeGiftRule,
} from "../../../utils/offerParsing";
import { type OfferTypeId } from "./offerTypeOptions";

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
  hasSubscription?: boolean;
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
  campaignConfigJson?: string | null;
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
  initialOfferType?: OfferTypeId;
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
  initialOfferType,
  storeProducts = [],
  markets: shopMarkets = [],
  existingOffers = [],
  ianaTimezone = "UTC",
}: CreateNewOfferProps) {
  const fetcher = useFetcher();
  const subscriptionStatusFetcher = useFetcher<{
    ok: boolean;
    error?: string;
    product?: {
      id: string;
      title: string;
      requiresSellingPlan: boolean;
      sellingPlanGroups: Array<{ id?: string; name?: string }>;
      hasSubscription: boolean;
    };
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitErrorToast, setSubmitErrorToast] = useState<string | null>(null);
  const wasSubmittingRef = useRef(false);
  const confirmedHighDiscountRef = useRef(false);
  const initialCampaignConfig = useMemo(() => {
    if (!initialOffer) return null;
    return (
      parseCampaignConfig(initialOffer.campaignConfigJson) ??
      migrateLegacyOfferToCampaignConfig({
        offerType: initialOffer.offerType,
        selectedProductsJson: initialOffer.selectedProductsJson,
        discountRulesJson: initialOffer.discountRulesJson,
        offerSettingsJson: initialOffer.offerSettingsJson,
        startTime: initialOffer.startTime,
        endTime: initialOffer.endTime,
        status: initialOffer.status,
      })
    );
  }, [initialOffer]);
  const initialCampaignLegacy = useMemo(
    () =>
      initialCampaignConfig
        ? buildLegacyFieldsFromCampaignConfig(initialCampaignConfig)
        : null,
    [initialCampaignConfig],
  );
  const initialCountdownBlock = useMemo(
    () =>
      initialCampaignConfig?.displayBlocks.find(
        (block) => block.type === "countdown",
      ) ?? null,
    [initialCampaignConfig],
  );
  const starterTemplateDefaults = useMemo(() => {
    if (initialOffer || !initialOfferType) return null;
    return getStarterTemplateDefaults(initialOfferType);
  }, [initialOffer, initialOfferType]);

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
  const [step, setStep] = useState(1);
  const [offerType, setOfferType] = useState<OfferTypeId>(
    (initialCampaignLegacy?.offerType as OfferTypeId | undefined) ??
      (initialOffer?.offerType as OfferTypeId | undefined) ??
      initialOfferType ??
      "quantity-breaks-same",
  );
  const initialCompleteBundleConfig = useMemo(
    () =>
      parseCompleteBundleConfig(
        initialCampaignLegacy?.selectedProductsJson ?? initialOffer?.selectedProductsJson,
      ),
    [initialCampaignLegacy?.selectedProductsJson, initialOffer?.selectedProductsJson],
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
    initialCampaignConfig?.settings.startTime
      ? new Date(initialCampaignConfig.settings.startTime).toISOString()
      : initialOffer && initialOffer.startTime
        ? new Date(initialOffer.startTime).toISOString()
      : new Date().toISOString(),
  );
  const [endTime, setEndTime] = useState(
    initialCampaignConfig?.settings.endTime
      ? new Date(initialCampaignConfig.settings.endTime).toISOString()
      : initialOffer && initialOffer.endTime
        ? new Date(initialOffer.endTime).toISOString()
        : "",
  );
  const [startTimeError, setStartTimeError] = useState("");
  const [endTimeError, setEndTimeError] = useState("");

  const persistedOfferSettings = parseOfferSettings(
    initialCampaignLegacy?.offerSettingsJson ?? initialOffer?.offerSettingsJson,
  );
  const offerSettings = starterTemplateDefaults?.offerSettings ?? persistedOfferSettings;

  const [progressiveGifts, setProgressiveGifts] = useState<ProgressiveGiftsConfig>(
    () => offerSettings.progressiveGifts,
  );

  useEffect(() => {
    if (!initialOffer?.id) return;
    setProgressiveGifts(
      parseOfferSettings(initialOffer.offerSettingsJson).progressiveGifts,
    );
  }, [initialOffer?.id, initialOffer?.offerSettingsJson]);

  const [previewGiftBar, setPreviewGiftBar] = useState(1);
  const [previewGiftQty, setPreviewGiftQty] = useState(1);

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
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(
    offerSettings.subscriptionEnabled,
  );
  const [subscriptionPosition, setSubscriptionPosition] = useState(
    offerSettings.subscriptionPosition,
  );
  const [subscriptionTitle, setSubscriptionTitle] = useState(
    offerSettings.subscriptionTitle,
  );
  const [subscriptionSubtitle, setSubscriptionSubtitle] = useState(
    offerSettings.subscriptionSubtitle,
  );
  const [oneTimeTitle, setOneTimeTitle] = useState(offerSettings.oneTimeTitle);
  const [oneTimeSubtitle, setOneTimeSubtitle] = useState(
    offerSettings.oneTimeSubtitle,
  );
  const [subscriptionDefaultSelected, setSubscriptionDefaultSelected] = useState(
    offerSettings.subscriptionDefaultSelected,
  );
  const [widgetTitle, setWidgetTitle] = useState(offerSettings.title);
  const [customerSegments] = useState<string[]>(
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
    hasSubscription: boolean;
  }[]>(() => {
    const selectedProductsJson =
      initialCampaignLegacy?.selectedProductsJson ??
      initialOffer?.selectedProductsJson;
    const selectedSourceOfferType =
      (initialCampaignLegacy?.offerType as OfferTypeId | undefined) ??
      (initialOffer?.offerType as OfferTypeId | undefined);
    const freeGiftSelectedProducts =
      selectedSourceOfferType === "free-gift"
        ? parseFreeGiftSelectedProducts(selectedProductsJson)
        : { triggerProducts: [], giftProducts: [] };
    const ids =
      selectedSourceOfferType === "free-gift"
        ? freeGiftSelectedProducts.triggerProducts
        : selectedProductsJson
          ? parseSelectedProductIds(selectedProductsJson)
          : [];

    let parsedObjects: any[] = [];
    try {
      if (selectedProductsJson) {
        parsedObjects = JSON.parse(selectedProductsJson);
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
          hasSubscription: savedObj.hasSubscription === true,
        };
      }

      const found = storeProducts.find((p) => String(p.id) === id);
      return {
        id,
        title: found?.name ?? "Unknown product",
        image: found?.image ?? "https://via.placeholder.com/60",
        price: found?.price ?? "€0.00",
        variantsCount: 1,
        hasSubscription: found?.hasSubscription === true,
      };
    });
  });
  const [giftProductsData, setGiftProductsData] = useState<{
    id: string;
    title: string;
    image: string;
    price: string;
    variantsCount: number;
    hasSubscription: boolean;
  }[]>(() => {
    const selectedProductsJson =
      initialCampaignLegacy?.selectedProductsJson ??
      initialOffer?.selectedProductsJson;
    const selectedSourceOfferType =
      (initialCampaignLegacy?.offerType as OfferTypeId | undefined) ??
      (initialOffer?.offerType as OfferTypeId | undefined);
    const giftIds =
      selectedSourceOfferType === "free-gift"
        ? parseFreeGiftSelectedProducts(selectedProductsJson).giftProducts
        : [];

    return giftIds.map((id: string) => {
      const found = storeProducts.find((p) => String(p.id) === id);
      return {
        id,
        title: found?.name ?? "Unknown product",
        image: found?.image ?? "https://via.placeholder.com/60",
        price: found?.price ?? "€0.00",
        variantsCount: 1,
        hasSubscription: found?.hasSubscription === true,
      };
    });
  });

  const handleSelectProducts = async (
    type: "buy" | "get" | "gift" | "normal" = "normal",
  ) => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: type === "normal" && offerType === "subscription" ? false : true,
      selectionIds: type === "buy" 
        ? buyProducts.map((id) => ({ id }))
        : type === "get"
        ? getProducts.map((id) => ({ id }))
        : type === "gift"
        ? giftProductsData.map((p) => ({ id: p.id }))
        : selectedProductsData.map((p) => ({ id: p.id })),
    });

    if (selected) {
      const selectedList = Array.isArray(selected) ? selected : [selected];
      const newData = selectedList.map((item: any) => ({
        id: item.id,
        title: item.title,
        image: item.images?.[0]?.originalSrc || "https://via.placeholder.com/60",
        price: item.variants?.[0]?.price || "€0.00",
        variantsCount: item.variants?.length || 1,
        // 资源选择器不稳定返回 sellingPlan 字段，因此回退到 loader 的 GraphQL 结果
        hasSubscription:
          ((item.sellingPlanGroups?.edges as Array<unknown> | undefined) ?? [])
            .length > 0 ||
          storeProducts.some(
            (p) => String(p.id) === String(item.id) && p.hasSubscription,
          ),
      }));
      
      if (type === "buy") {
        setBuyProducts(newData.map((item: any) => item.id));
      } else if (type === "get") {
        setGetProducts(newData.map((item: any) => item.id));
      } else if (type === "gift") {
        setGiftProductsData(newData);
      } else if (offerType === "free-gift") {
        setFreeGiftTriggerProducts(newData.map((item: any) => String(item.id)));
        setSelectedProductsData(newData);
      } else {
        const nextProducts =
          offerType === "subscription" ? newData.slice(0, 1) : newData;
        setSelectedProductsData(nextProducts);

        // 中文注释：订阅型 offer 选完商品后，使用用户指定的 GraphQL 单独校验该商品是否有 selling plan
        if (offerType === "subscription" && nextProducts[0]?.id) {
          subscriptionStatusFetcher.submit(
            {
              intent: "get-product-subscription-status",
              productId: String(nextProducts[0].id),
            },
            { method: "post" },
          );
        }
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
    starterTemplateDefaults?.discountRules ??
      parseDiscountRules(
        initialCampaignLegacy?.discountRulesJson ?? initialOffer?.discountRulesJson,
      ),
  );
  const [bxgyDiscountRules, setBxgyDiscountRules] = useState<BxgyDiscountRule[]>(
    starterTemplateDefaults?.bxgyDiscountRules ??
      parseBxgyDiscountRules(
        initialCampaignLegacy?.discountRulesJson ?? initialOffer?.discountRulesJson,
      ),
  );
  const [freeGiftRules, setFreeGiftRules] = useState<FreeGiftRule[]>(
    starterTemplateDefaults?.freeGiftRules ??
      parseFreeGiftRules(
        initialCampaignLegacy?.discountRulesJson ?? initialOffer?.discountRulesJson,
      ),
  );
  const [differentProductsDiscountRules, setDifferentProductsDiscountRules] =
    useState<DifferentProductsDiscountRule[]>(
      starterTemplateDefaults?.differentProductsDiscountRules ??
        parseDifferentProductsDiscountRules(
          initialCampaignLegacy?.discountRulesJson ?? initialOffer?.discountRulesJson,
        ),
    );
  const [buyProducts, setBuyProducts] = useState<string[]>(() => {
    const selectedProductsJson =
      initialCampaignLegacy?.offerType === "bxgy"
        ? initialCampaignLegacy.selectedProductsJson
        : initialOffer?.offerType === "bxgy"
          ? initialOffer.selectedProductsJson
          : null;
    if (!selectedProductsJson) return [];
    try {
      const parsed = JSON.parse(selectedProductsJson);
      return Array.isArray(parsed.buyProducts) ? parsed.buyProducts.map(String) : [];
    } catch (e) {
      return [];
    }
  });
  const [getProducts, setGetProducts] = useState<string[]>(() => {
    const selectedProductsJson =
      initialCampaignLegacy?.offerType === "bxgy"
        ? initialCampaignLegacy.selectedProductsJson
        : initialOffer?.offerType === "bxgy"
          ? initialOffer.selectedProductsJson
          : null;
    if (!selectedProductsJson) return [];
    try {
      const parsed = JSON.parse(selectedProductsJson);
      return Array.isArray(parsed.getProducts) ? parsed.getProducts.map(String) : [];
    } catch (e) {
      return [];
    }
  });
  const [freeGiftTriggerProducts, setFreeGiftTriggerProducts] = useState<string[]>(() => {
    const selectedProductsJson =
      initialCampaignLegacy?.offerType === "free-gift"
        ? initialCampaignLegacy.selectedProductsJson
        : initialOffer?.offerType === "free-gift"
          ? initialOffer.selectedProductsJson
          : null;
    return parseFreeGiftSelectedProducts(selectedProductsJson).triggerProducts;
  });
  const [completeBundleBars, setCompleteBundleBars] = useState<CompleteBundleBar[]>(
    () =>
      ((initialCampaignLegacy?.offerType as OfferTypeId | undefined) === "complete-bundle" ||
        initialOffer?.offerType === "complete-bundle") &&
      initialCompleteBundleConfig.bars.length > 0
        ? initialCompleteBundleConfig.bars
        : starterTemplateDefaults?.completeBundleBars?.length
          ? starterTemplateDefaults.completeBundleBars
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
    () =>
      initialCompleteBundleConfig.bars[0]?.id ||
      starterTemplateDefaults?.completeBundleBars?.[0]?.id ||
      "",
  );
  const [status, setStatus] = useState<boolean>(
    initialCampaignConfig
      ? initialCampaignConfig.settings.status
      : initialOffer
        ? initialOffer.status
        : true,
  );
  const [showCountdownBlock, setShowCountdownBlock] = useState(
    initialCountdownBlock !== null || starterTemplateDefaults?.showCountdownBlock === true,
  );
  const [countdownLabel, setCountdownLabel] = useState(
    initialCountdownBlock?.type === "countdown"
      ? initialCountdownBlock.config.label
      : starterTemplateDefaults?.countdownLabel || "Limited time offer",
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
        className="create-offer-bundle-product-card"
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

  useEffect(() => {
    if (subscriptionStatusFetcher.state !== "idle") return;
    if (!subscriptionStatusFetcher.data?.ok) return;
    const result = subscriptionStatusFetcher.data.product;
    if (!result?.id) return;

    setSelectedProductsData((prev) =>
      prev.map((item) =>
        String(item.id) === String(result.id)
          ? {
              ...item,
              hasSubscription: result.hasSubscription,
            }
          : item,
      ),
    );
  }, [subscriptionStatusFetcher.state, subscriptionStatusFetcher.data]);

  const normalizedDiscountRules = sanitizeDiscountRules(discountRules);
  const previewBarOptions = useMemo(() => {
    if (offerType === "bxgy") {
      return bxgyDiscountRules.map((r, i) => ({
        value: i + 1,
        label: `Bar #${i + 1} (count ≥ ${r.count})`,
      }));
    }
    if (offerType === "quantity-breaks-different") {
      return differentProductsDiscountRules.map((r, i) => ({
        value: i + 1,
        label:
          r.tierType === "bxgy"
            ? `Tier #${i + 1} (BXGY, count ≥ ${r.count})`
            : `Tier #${i + 1} (simple, count ≥ ${r.count})`,
      }));
    }
    if (offerType === "free-gift") {
      return freeGiftRules.map((r, i) => ({
        value: i + 1,
        label: `Gift tier #${i + 1} (count ≥ ${r.count})`,
      }));
    }
    return [
      { value: 1, label: "Bar #1 (Single, qty 1)" },
      ...normalizedDiscountRules.map((r, i) => ({
        value: i + 2,
        label: `Bar #${i + 2} (qty ${r.count})`,
      })),
    ];
  }, [
    offerType,
    bxgyDiscountRules,
    differentProductsDiscountRules,
    normalizedDiscountRules,
  ]);
  const currentCampaignConfig = useMemo<CampaignConfig | null>(() => {
    const buildOfferCardConfig = () => ({
      title: widgetTitle,
      layoutFormat,
      accentColor,
      cardBackgroundColor,
      borderColor,
      labelColor,
      titleFontSize,
      titleFontWeight,
      titleColor,
      buttonText,
      buttonPrimaryColor,
      showCustomButton,
    });

    let logicBlockId = "logic-campaign";
    let scopeProductIds: string[] = [];
    let logicBlocks: CampaignConfig["logicBlocks"] = [];

    if (offerType === "quantity-breaks-same") {
      logicBlockId = "logic-quantity-breaks";
      scopeProductIds = selectedProductsData.map((product) => String(product.id));
      logicBlocks = [
        {
          id: logicBlockId,
          type: "quantity-breaks",
          config: {
            tiers: normalizedDiscountRules.map((rule) => ({
              qty: rule.count,
              discountPercent: rule.discountPercent,
              title: rule.title || "",
              subtitle: rule.subtitle || "",
              badge: rule.badge || "",
              isDefault: !!rule.isDefault,
            })),
          },
        },
      ];
    } else if (offerType === "quantity-breaks-different") {
      logicBlockId = "logic-quantity-breaks-different";
      scopeProductIds = selectedProductsData.map((product) => String(product.id));
      logicBlocks = [
        {
          id: logicBlockId,
          type: "quantity-breaks-different",
          config: {
            tiers: buildDifferentProductsDiscountRulesJson(
              differentProductsDiscountRules,
            ),
          },
        },
      ];
    } else if (offerType === "bxgy") {
      logicBlockId = "logic-bxgy";
      scopeProductIds = Array.from(new Set([...buyProducts, ...getProducts]));
      logicBlocks = [
        {
          id: logicBlockId,
          type: "bxgy",
          config: {
            tiers: buildBxgyDiscountRulesJson(bxgyDiscountRules),
          },
        },
      ];
    } else if (offerType === "complete-bundle") {
      logicBlockId = "logic-complete-bundle";
      const completeBundleConfig = buildCompleteBundleConfig({ bars: completeBundleBars });
      scopeProductIds = Array.from(
        new Set(
          completeBundleConfig.bars.flatMap((bar) =>
            bar.products.map((product) => String(product.productId)),
          ),
        ),
      );
      logicBlocks = [
        {
          id: logicBlockId,
          type: "complete-bundle",
          config: completeBundleConfig,
        },
      ];
    } else if (offerType === "free-gift") {
      logicBlockId = "logic-free-gift";
      scopeProductIds = Array.from(
        new Set([
          ...freeGiftTriggerProducts,
          ...giftProductsData.map((product) => String(product.id)),
        ]),
      );
      logicBlocks = [
        {
          id: logicBlockId,
          type: "free-gift",
          config: {
            triggerProductIds: freeGiftTriggerProducts,
            giftProductIds: giftProductsData.map((product) => String(product.id)),
            tiers: buildFreeGiftRulesJson(freeGiftRules),
          },
        },
      ];
    } else if (offerType === "subscription") {
      logicBlockId = "logic-subscription";
      scopeProductIds = selectedProductsData.map((product) => String(product.id));
      logicBlocks = [
        {
          id: logicBlockId,
          type: "subscription",
          config: {
            enabled: subscriptionEnabled,
            position: subscriptionPosition,
            title: subscriptionTitle,
            subtitle: subscriptionSubtitle,
            oneTimeTitle,
            oneTimeSubtitle,
            defaultSelected: subscriptionDefaultSelected,
            productIds: scopeProductIds,
          },
        },
      ];
    } else {
      return null;
    }

    return {
      version: 1,
      scope: {
        productIds: scopeProductIds,
        markets,
        customerSegments,
      },
      logicBlocks,
      displayBlocks: [
        {
          id: "display-offer-card",
          type: "offer-card",
          logicBlockRef: logicBlockId,
          config: buildOfferCardConfig(),
        },
        ...(showCountdownBlock
          ? [
              {
                id: "display-countdown",
                type: "countdown" as const,
                config: {
                  endTimeMode: "campaign-end-time" as const,
                  label: countdownLabel.trim() || "Limited time offer",
                },
              },
            ]
          : []),
      ],
      settings: {
        status,
        startTime,
        endTime,
        scheduleTimezone,
        totalBudget: totalBudget.trim() ? Number(totalBudget) : null,
        dailyBudget: dailyBudget.trim() ? Number(dailyBudget) : null,
        usageLimitPerCustomer,
      },
    };
  }, [
    accentColor,
    borderColor,
    buyProducts,
    bxgyDiscountRules,
    buttonPrimaryColor,
    buttonText,
    cardBackgroundColor,
    completeBundleBars,
    countdownLabel,
    customerSegments,
    dailyBudget,
    differentProductsDiscountRules,
    endTime,
    freeGiftRules,
    freeGiftTriggerProducts,
    giftProductsData,
    labelColor,
    layoutFormat,
    markets,
    normalizedDiscountRules,
    oneTimeSubtitle,
    oneTimeTitle,
    scheduleTimezone,
    selectedProductsData,
    getProducts,
    showCountdownBlock,
    showCustomButton,
    startTime,
    status,
    subscriptionDefaultSelected,
    subscriptionEnabled,
    subscriptionPosition,
    subscriptionSubtitle,
    subscriptionTitle,
    titleColor,
    titleFontSize,
    titleFontWeight,
    totalBudget,
    usageLimitPerCustomer,
    widgetTitle,
    offerType,
  ]);
  const campaignConfigJson = useMemo(
    () => (currentCampaignConfig ? JSON.stringify(currentCampaignConfig) : ""),
    [currentCampaignConfig],
  );
  const allSelectedProductsHaveSubscription = useMemo(
    () =>
      selectedProductsData.length > 0 &&
      selectedProductsData.every((item) => item.hasSubscription),
    [selectedProductsData],
  );
  const shouldShowSubscriptionPreview =
    offerType === "subscription" && subscriptionEnabled;
  const subscriptionPreviewStyle = allSelectedProductsHaveSubscription
    ? "solid"
    : "dashed";
  const shouldShowSubscriptionExplanation =
    shouldShowSubscriptionPreview && !allSelectedProductsHaveSubscription;
  const subscriptionExplanationTitle =
    selectedProductsData.length > 0
      ? "Some products aren't eligible for subscriptions"
      : "Select products to check subscription eligibility";
  const subscriptionExplanationBody =
    selectedProductsData.length > 0
      ? "Subscription bar will only be shown in products that are eligible for subscription. You can select those products in your subscription app."
      : "After selecting products, the app checks whether they have selling plans and decides whether to show a solid or dashed subscription bar.";
  const campaignDraft = useMemo<CampaignDraft>(
    () => ({
      offerType,
      selectedProductsData,
      discountRules,
      buyProducts,
      getProducts,
      activeBundleBarId,
      completeBundleBars,
      subscriptionTitle,
      subscriptionSubtitle,
      oneTimeTitle,
      oneTimeSubtitle,
      subscriptionPosition,
      subscriptionDefaultSelected,
      shouldShowSubscriptionPreview,
      allSelectedProductsHaveSubscription,
      shouldShowSubscriptionExplanation,
      subscriptionExplanationTitle,
      subscriptionExplanationBody,
      freeGiftTriggerProducts,
      giftProductsData,
      progressiveGifts,
      normalizedDiscountRules,
      bxgyDiscountRules,
      differentProductsDiscountRules,
      freeGiftRules,
      subscriptionEnabled,
    }),
    [
      offerType,
      selectedProductsData,
      discountRules,
      buyProducts,
      getProducts,
      activeBundleBarId,
      completeBundleBars,
      subscriptionTitle,
      subscriptionSubtitle,
      oneTimeTitle,
      oneTimeSubtitle,
      subscriptionPosition,
      subscriptionDefaultSelected,
      shouldShowSubscriptionPreview,
      allSelectedProductsHaveSubscription,
      shouldShowSubscriptionExplanation,
      subscriptionExplanationTitle,
      subscriptionExplanationBody,
      freeGiftTriggerProducts,
      giftProductsData,
      progressiveGifts,
      normalizedDiscountRules,
      bxgyDiscountRules,
      differentProductsDiscountRules,
      freeGiftRules,
      subscriptionEnabled,
    ],
  );
  const campaignDraftActions: CampaignDraftActions = {
    setOfferType,
    setSelectedProductsData,
    handleSelectProducts,
    setDiscountRules,
    setBxgyDiscountRules,
    setDifferentProductsDiscountRules,
    setActiveBundleBarId,
    addCompleteBundleBar,
    removeCompleteBundleBar,
    updateCompleteBundleBar,
    handleSelectProductsForBundleBar,
    appendProductsToBundleBar,
    setSubscriptionEnabled,
    setSubscriptionTitle,
    setSubscriptionSubtitle,
    setOneTimeTitle,
    setOneTimeSubtitle,
    setSubscriptionPosition,
    setSubscriptionDefaultSelected,
    setFreeGiftTriggerProducts,
    setFreeGiftRules,
    setProgressiveGifts,
  };
  const countdownPreviewText = useMemo(() => {
    if (!showCountdownBlock || !endTime || !dayjs(endTime).isValid()) {
      return "";
    }
    return `${countdownLabel || "Limited time offer"} • Ends ${dayjs(endTime)
      .tz(scheduleTimezone)
      .format("YYYY-MM-DD HH:mm")}`;
  }, [countdownLabel, endTime, scheduleTimezone, showCountdownBlock]);
  const hasDefault = normalizedDiscountRules.some(r => r.isDefault);

  const previewItems: PreviewItem[] = useMemo(() => {
    if (offerType === "complete-bundle" && completeBundleBars.length > 0) {
      const hasConfiguredProducts = completeBundleBars.some(
        (bar) => Array.isArray(bar.products) && bar.products.length > 0,
      );
      if (!hasConfiguredProducts && starterTemplateDefaults?.previewFallbackItems?.length) {
        const starterBar = completeBundleBars[0];
        const fallbackFirst = starterTemplateDefaults.previewFallbackItems[0];
        const fallbackOffer = starterTemplateDefaults.previewFallbackItems[1];
        return [
          fallbackFirst,
          {
            ...(fallbackOffer || {
              id: "starter-complete-bundle-offer",
              title: "Complete the bundle",
              subtitle: "Save EUR14.99",
              price: "EUR50.00",
              featured: true,
              badge: "Most Popular",
              saveLabel: "SAVE EUR14.99",
            }),
            id: starterBar?.id || fallbackOffer?.id || "starter-complete-bundle-offer",
            title:
              starterBar?.title ||
              fallbackOffer?.title ||
              "Complete the bundle",
            subtitle:
              starterBar?.subtitle ||
              fallbackOffer?.subtitle ||
              "Save EUR14.99",
          },
        ];
      }
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

    if (offerType === "free-gift" && freeGiftRules.length > 0) {
      const freeGiftHasDefault = freeGiftRules.some((r) => r.isDefault);
      return freeGiftRules.map((rule, index) => {
        const isFeatured = freeGiftHasDefault ? !!rule.isDefault : index === 0;
        return {
          id: `free-gift-tier-${rule.count}`,
          title: rule.title || `Buy ${rule.count}`,
          subtitle:
            rule.subtitle ||
            `Unlock ${rule.giftQuantity} free gift${rule.giftQuantity > 1 ? "s" : ""}`,
          price: `${rule.giftQuantity} FREE`,
          featured: isFeatured,
          badge: rule.badge || (isFeatured ? "Gift included" : ""),
          saveLabel: `TRIGGER AT ${rule.count}`,
        };
      });
    }

    if (offerType === "quantity-breaks-different" && differentProductsDiscountRules.length > 0) {
      const differentProductsHasDefault = differentProductsDiscountRules.some(
        (r) => r.isDefault,
      );
      return differentProductsDiscountRules.map((rule, index) => {
        const isFeatured = differentProductsHasDefault
          ? !!rule.isDefault
          : index === 0;
        const products =
          (rule.tierType === "bxgy"
            ? rule.getProductIds.length > 0
              ? rule.getProductIds
              : rule.buyProductIds
            : rule.buyProductIds
          )
            .map((productId) =>
              selectedProductsData.find(
                (product) => String(product.id) === String(productId),
              ),
            )
            .filter((product): product is (typeof selectedProductsData)[number] => Boolean(product))
            .slice(0, 4)
            .map((product) => ({
              image: product.image,
              name: product.title,
            }));

        return {
          id: `different-products-tier-${rule.count}-${rule.tierType}`,
          title:
            rule.title ||
            (rule.tierType === "bxgy"
              ? `Buy ${rule.buyQuantity}, Get ${rule.getQuantity}`
              : `${rule.count} mixed items`),
          subtitle:
            rule.subtitle ||
            (rule.tierType === "bxgy"
              ? `Across ${rule.buyProductIds.length} buy products`
              : `Mix products and save ${rule.discountPercent}%`),
          price:
            rule.tierType === "bxgy"
              ? rule.discountPercent === 100
                ? `${rule.getQuantity} FREE`
                : `${rule.discountPercent}% OFF`
              : `${rule.discountPercent}% OFF`,
          featured: isFeatured,
          badge:
            rule.badge ||
            (isFeatured
              ? rule.tierType === "bxgy"
                ? "Best Reward"
                : "Most Popular"
              : ""),
          saveLabel:
            rule.tierType === "bxgy"
              ? `BUY ${rule.buyQuantity} + GET ${rule.getQuantity}`
              : `COUNT ${rule.count}+`,
          products,
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
    differentProductsDiscountRules,
    freeGiftRules,
    selectedProductsData,
    normalizedDiscountRules,
    baseUnitPrice,
    formatPreviewPrice,
    hasDefault,
  ]);

  const steps = [
    "Campaign",
    "Scope & Logic",
    "Display",
    "Targeting",
  ];

  useEffect(() => {
    // 中文注释：当用户在第 1 步切换到 Subscription 类型时，默认自动打开订阅开关
    if (offerType === "subscription") {
      setSubscriptionEnabled(true);
    }
  }, [offerType]);

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
        const finalScopeLogicError =
          validateFinalSubmitScopeAndLogic(campaignDraft);
        if (finalScopeLogicError) {
          e.preventDefault();
          Modal.error({
            title: "Validation Error",
            content: finalScopeLogicError,
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

        const hasHighDiscount =
          normalizedDiscountRules.some((r) => r.discountPercent >= 90) ||
          differentProductsDiscountRules.some(
            (r) => r.discountPercent >= 90,
          );
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
      <div className="mb-4">
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
          <div className="mt-[8px]">
            <AdminPageHeader title={initialOffer ? "Edit Offer" : "Create New Offer"} />
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
        name="subscriptionEnabled"
        value={subscriptionEnabled ? "true" : "false"}
      />
      <input
        type="hidden"
        name="subscriptionPosition"
        value={subscriptionPosition}
      />
      <input type="hidden" name="subscriptionTitle" value={subscriptionTitle} />
      <input
        type="hidden"
        name="subscriptionSubtitle"
        value={subscriptionSubtitle}
      />
      <input type="hidden" name="oneTimeTitle" value={oneTimeTitle} />
      <input type="hidden" name="oneTimeSubtitle" value={oneTimeSubtitle} />
      <input
        type="hidden"
        name="subscriptionDefaultSelected"
        value={subscriptionDefaultSelected ? "true" : "false"}
      />
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
        value={JSON.stringify(buildSelectedProductsPayload(campaignDraft))}
      />
      <input
        type="hidden"
        name="discountRulesJson"
        value={JSON.stringify(
          buildDiscountRulesPayload(
            campaignDraft,
            buildDiscountRulesJson,
          ),
        )}
      />
      <input
        type="hidden"
        name="progressiveGiftsJson"
        value={JSON.stringify(progressiveGiftsConfigToStorableJson(progressiveGifts))}
      />
      <input type="hidden" name="campaignConfigJson" value={campaignConfigJson} />

      <div className="mb-[100px] rounded-[12px] border border-[#dfe3e8] bg-[#ffffff] p-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-[24px]">
        <div className="mb-[12px] rounded-[10px] border border-[#e9edf1] bg-[#fcfcfd] p-[10px] sm:p-[12px]">
          <div className="grid grid-cols-1 gap-[6px] md:grid-cols-4">
          {steps.map((stepName, index) => {
            const stepNumber = index + 1;
            const isActive = step === stepNumber;
            const isClickable = stepNumber <= step;
            return (
              <div
                key={index}
                role="button"
                tabIndex={isClickable ? 0 : -1}
                className={`rounded-[8px] border px-[10px] py-[9px] text-left transition-all ${
                  isActive
                    ? "border-[#008060] bg-[#f0faf6] shadow-[inset_0_0_0_1px_rgba(0,128,96,0.08)]"
                    : "border-[#e5e7eb] bg-[#ffffff]"
                } ${
                  isClickable
                    ? "cursor-pointer hover:border-[#bfd7cd] hover:bg-[#ffffff]"
                    : "cursor-not-allowed opacity-60"
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
                <div className="flex items-center gap-[8px]">
                  <div
                    className={`flex h-[24px] w-[24px] items-center justify-center rounded-full text-[11px] font-semibold ${
                      isActive
                        ? "bg-[#008060] text-white"
                        : "bg-[#f4f6f8] text-[#5c6166]"
                    }`}
                  >
                    {stepNumber}
                  </div>
                  <div
                    className={`text-[13px] font-semibold leading-[18px] ${
                      isActive ? "text-[#1c1f23]" : "text-[#5c6166]"
                    }`}
                  >
                    {stepName}
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>

        <div>
          {step === 1 && (
            <div className="create-offer-basic-grid lg:grid-cols-[1fr_400px]">
              <div className="flex flex-col gap-6">
                <div>
                  <div className="flex flex-col gap-4">
                      <BuilderStepIntro
                        title="Campaign Setup"
                      />
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
                <div className="create-offer-preview-shell">
                  <h3 className="create-offer-preview-shell__title">Preview</h3>

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
                    progressiveGifts={progressiveGifts}
                    progressivePreviewBarIndex={previewGiftBar}
                    progressivePreviewLineQty={previewGiftQty}
                    showSubscriptionPreview={shouldShowSubscriptionPreview}
                    subscriptionPreviewStyle={subscriptionPreviewStyle}
                    subscriptionTitle={subscriptionTitle}
                    subscriptionSubtitle={subscriptionSubtitle}
                    showSubscriptionExplanation={shouldShowSubscriptionExplanation}
                    subscriptionExplanationTitle={subscriptionExplanationTitle}
                    subscriptionExplanationBody={subscriptionExplanationBody}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <div className="create-offer-products-grid">
                <div>
                  <BuilderStepIntro
                    title="Scope & Logic"
                  />

                  <LogicEditorsRenderer
                    draft={campaignDraft}
                    actions={campaignDraftActions}
                    renderCompleteBundleProductPricingCard={
                      renderCompleteBundleProductPricingCard
                    }
                  />
                </div>

                <div className="create-offer-sticky-preview">
                  <div className="create-offer-preview-shell">
                    <h3 className="create-offer-preview-shell__title">Preview</h3>
                  {progressiveGifts.enabled && offerType !== "complete-bundle" ? (
                    <div className="mb-4 space-y-2">
                      <div className="text-[13px] font-medium text-[#1c1f23]">
                        Progressive gifts preview
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        <label className="block text-[12px] text-[#5c6166]">
                          Simulated bar # (free shipping unlock preview)
                          <Select
                            size="small"
                            className="mt-1 w-full"
                            value={previewGiftBar}
                            options={previewBarOptions}
                            onChange={(v) => setPreviewGiftBar(Number(v))}
                          />
                        </label>
                        <label className="block text-[12px] text-[#5c6166]">
                          Simulated line qty (at_count mode)
                          <Input
                            size="small"
                            type="number"
                            min={1}
                            className="mt-1"
                            value={previewGiftQty}
                            onChange={(e) => {
                              const n = Math.max(1, Math.trunc(Number(e.target.value) || 1));
                              setPreviewGiftQty(n);
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
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
                      progressiveGifts={progressiveGifts}
                      progressivePreviewBarIndex={previewGiftBar}
                      progressivePreviewLineQty={previewGiftQty}
                      showSubscriptionPreview={shouldShowSubscriptionPreview}
                      subscriptionPreviewStyle={subscriptionPreviewStyle}
                      subscriptionTitle={subscriptionTitle}
                      subscriptionSubtitle={subscriptionSubtitle}
                      showSubscriptionExplanation={shouldShowSubscriptionExplanation}
                      subscriptionExplanationTitle={subscriptionExplanationTitle}
                      subscriptionExplanationBody={subscriptionExplanationBody}
                    />
                  )}
                  </div>
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="create-offer-style-grid">
              <div>
                <BuilderStepIntro
                  title="Display"
                />

                <DisplayBlocksEditor
                  showCountdownBlock={showCountdownBlock}
                  setShowCountdownBlock={setShowCountdownBlock}
                  countdownLabel={countdownLabel}
                  setCountdownLabel={setCountdownLabel}
                />

                {offerType === "quantity-breaks-same" ? (
                  <QuantityBreaksDisplayCustomizer
                    discountRules={discountRules}
                    setDiscountRules={setDiscountRules}
                    widgetTitle={widgetTitle}
                    setWidgetTitle={setWidgetTitle}
                    layoutFormat={layoutFormat}
                    setLayoutFormat={setLayoutFormat}
                    cardBackgroundColor={cardBackgroundColor}
                    setCardBackgroundColor={setCardBackgroundColor}
                    accentColor={accentColor}
                    setAccentColor={setAccentColor}
                    borderColor={borderColor}
                    setBorderColor={setBorderColor}
                    labelColor={labelColor}
                    setLabelColor={setLabelColor}
                    titleFontSize={titleFontSize}
                    setTitleFontSize={setTitleFontSize}
                    titleFontWeight={titleFontWeight}
                    setTitleFontWeight={setTitleFontWeight}
                    titleColor={titleColor}
                    setTitleColor={setTitleColor}
                    showCustomButton={showCustomButton}
                    setShowCustomButton={setShowCustomButton}
                    buttonText={buttonText}
                    setButtonText={setButtonText}
                    buttonPrimaryColor={buttonPrimaryColor}
                    setButtonPrimaryColor={setButtonPrimaryColor}
                  />
                ) : (
                  <>
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
                  </>
                )}
              </div>

              <div className="create-offer-sticky-preview">
                <div className="create-offer-preview-shell">
                  <h3 className="create-offer-preview-shell__title">Preview</h3>
                {showCountdownBlock && countdownPreviewText ? (
                  <div className="mb-4 rounded-lg border border-[#ffe58f] bg-[#fffbe6] px-3 py-2 text-[12px] text-[#ad6800]">
                    {countdownPreviewText}
                  </div>
                ) : null}
                {progressiveGifts.enabled ? (
                  <div className="mb-4 space-y-2">
                    <div className="text-[13px] font-medium text-[#1c1f23]">
                      Progressive gifts preview
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <label className="block text-[12px] text-[#5c6166]">
                        Simulated bar #
                        <Select
                          size="small"
                          className="mt-1 w-full"
                          value={previewGiftBar}
                          options={previewBarOptions}
                          onChange={(v) => setPreviewGiftBar(Number(v))}
                        />
                      </label>
                      <label className="block text-[12px] text-[#5c6166]">
                        Simulated line qty
                        <Input
                          size="small"
                          type="number"
                          min={1}
                          className="mt-1"
                          value={previewGiftQty}
                          onChange={(e) => {
                            const n = Math.max(1, Math.trunc(Number(e.target.value) || 1));
                            setPreviewGiftQty(n);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                ) : null}
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
                  progressiveGifts={progressiveGifts}
                  progressivePreviewBarIndex={previewGiftBar}
                  progressivePreviewLineQty={previewGiftQty}
                  showSubscriptionPreview={shouldShowSubscriptionPreview}
                  subscriptionPreviewStyle={subscriptionPreviewStyle}
                  subscriptionTitle={subscriptionTitle}
                  subscriptionSubtitle={subscriptionSubtitle}
                  showSubscriptionExplanation={shouldShowSubscriptionExplanation}
                  subscriptionExplanationTitle={subscriptionExplanationTitle}
                  subscriptionExplanationBody={subscriptionExplanationBody}
                />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <BuilderStepIntro
                title="Targeting"
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
                <div className="rounded-lg border border-[#dfe3e8] bg-white p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5c6166]">
                    Schedule
                  </div>
                  <div className="mt-1 text-[14px] text-[#1c1f23]">
                    {startTime && endTime ? "Start and end time set" : "Schedule needs attention"}
                  </div>
                </div>
                <div className="rounded-lg border border-[#dfe3e8] bg-white p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5c6166]">
                    Markets
                  </div>
                  <div className="mt-1 text-[14px] text-[#1c1f23]">
                    {markets.includes("all")
                      ? "Visible in all markets"
                      : `${markets.length} market${markets.length > 1 ? "s" : ""} selected`}
                  </div>
                </div>
                <div className="rounded-lg border border-[#dfe3e8] bg-white p-3">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#5c6166]">
                    Status
                  </div>
                  <div className="mt-1 text-[14px] text-[#1c1f23]">
                    {status ? "Campaign will be active after save" : "Campaign will be saved as inactive"}
                  </div>
                </div>
              </div>

              <ScheduleTargetingEditor
                markets={markets}
                setMarkets={setMarkets}
                shopMarkets={shopMarkets}
                scheduleTimezone={scheduleTimezone}
                setScheduleTimezone={setScheduleTimezone}
                tzOptions={tzOptions}
                startTime={startTime}
                setStartTime={setStartTime}
                endTime={endTime}
                setEndTime={setEndTime}
                startTimeError={startTimeError}
                setStartTimeError={setStartTimeError}
                endTimeError={endTimeError}
                setEndTimeError={setEndTimeError}
              />

              <div className="mb-8">
                <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
                  Campaign Status
                </h3>
                <div className="flex items-center justify-between rounded-lg border border-[#dfe3e8] bg-white p-4">
                  <div>
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      Activate after save
                    </div>
                    <div className="text-[13px] text-[#5c6166]">
                      Turn this off if you want to finish setup before showing the offer.
                    </div>
                  </div>
                  <Switch checked={status} onChange={setStatus} />
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

      <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#dfe3e8] bg-[rgba(255,255,255,0.96)] px-[16px] py-[14px] backdrop-blur-sm shadow-[0_-8px_24px_rgba(15,23,42,0.08)] sm:px-[24px]">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-[12px]">
          <div className="flex items-center justify-center gap-3">
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
              const stepTwoError = validateScopeAndLogicStep(
                campaignDraft,
              );
              if (stepTwoError) {
                message.error(stepTwoError);
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
        </div>
      </div>
    </fetcher.Form>
  );
}
