import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
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
  getCampaignCompositionBars,
  getCampaignCompositionModules,
  getCampaignCompositionRulesSnapshot,
  orderCampaignCompositionBars,
  orderCampaignCompositionRules,
} from "./campaignCompositionAdapter";
import {
  buildDiscountRulesPayload,
  buildSelectedProductsPayload,
  validateFinalSubmitScopeAndLogic,
  validateScopeAndLogicStep,
} from "./campaignBuilderRegistry";
import OfferComponentsDisplayCustomizer from "./OfferComponentsDisplayCustomizer";
import { ProgressiveGiftsSection } from "./ProgressiveGiftsSection";
import ScheduleTargetingEditor from "./ScheduleTargetingEditor";
import StepTwoCompositionBuilder from "./StepTwoCompositionBuilder";
import {
  COMPLETE_BUNDLE_TEMPLATE_PREVIEW_ITEMS,
  getStarterTemplateDefaults,
} from "./starterTemplateDefaults";
import {
  OFFER_TEXT_LIMITS,
  buildLegacyFieldsFromCampaignConfig,
  buildDifferentProductsDiscountRulesJson,
  getInvalidIpCountryCodes,
  migrateLegacyOfferToCampaignConfig,
  normalizeCustomerProfileFilters,
  normalizeCustomerSegments,
  normalizeDraftIpCountryCodes,
  normalizeIpCountryCodes,
  normalizeTargetMarkets,
  normalizeOfferNameKey,
  parseCampaignConfig,
  parseDiscountRules,
  parseBxgyDiscountRules,
  parseDifferentProductsDiscountRules,
  parseFreeGiftRules,
  parseOfferSettings,
  parseSelectedProductIds,
  sanitizeSingleLineText,
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
import { buildUnifiedRulesSnapshot } from "./unifiedRulesAdapters";
import {
  buildSubscriptionDisplayCustomizerItems,
  buildUnifiedDisplayCustomizerItems,
} from "./unifiedRulesDisplay";
import {
  type RulePresentationPatch,
  updateBxgyRulePresentation,
  updateCompleteBundleBarPresentation,
  updateDifferentProductsRulePresentation,
  updateDiscountRulePresentation,
  updateFreeGiftRulePresentation,
} from "./unifiedRulePresentation";
import {
  buildCompositionPreviewItems,
  buildUnifiedPreviewItems,
} from "./unifiedRulesPreview";
import {
  type UnifiedRuleValuePatch,
  updateBxgyRuleValues,
  updateCompleteBundleRuleValues,
  updateDifferentProductsRuleValues,
  updateFreeGiftRuleValues,
  updateUnifiedDiscountRuleValues,
} from "./unifiedRuleValues";
import {
  getUnifiedRuleBlockingMessageForRules,
  getUnifiedRuleBlockingMessage,
} from "./unifiedRulesValidation";

function PreviewShell({
  meta,
  children,
}: {
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="create-offer-preview-shell">
      <div className="create-offer-preview-shell__header">
        <h3 className="create-offer-preview-shell__title">Preview</h3>
        {meta ? <div className="create-offer-preview-shell__meta">{meta}</div> : null}
      </div>
      {children}
    </div>
  );
}

function FloatingFeedbackBanner({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div
      className="fixed left-1/2 top-4 z-50 max-w-[min(560px,calc(100vw-32px))] -translate-x-1/2 rounded-[12px] border border-[#ffd6d2] bg-white px-4 py-3 shadow-lg"
      role="alert"
    >
      <div className="text-[13px] font-semibold text-[#1c1f23]">{title}</div>
      <div className="mt-1 text-[13px] text-[#5c6166]">{message}</div>
    </div>
  );
}

function openBuilderValidationModal(message: string) {
  Modal.error({
    title: "Fix these issues before saving",
    content: message,
    okText: "Back to builder",
  });
}

function openHighDiscountWarning(onConfirm: () => void) {
  Modal.confirm({
    title: "Review high discount",
    content:
      "One or more rules discount 90% or more. Confirm that this campaign should still be saved.",
    okText: "Save anyway",
    cancelText: "Review rules",
    onOk: onConfirm,
  });
}

type DiscountRule = {
  // 数量阈值：例如 count=2 表示"买 2 件及以上"生效
  id?: string;
  count: number;
  discountPercent: number;
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
  discountClass?: "product" | "order" | "shipping";
  offerKind?: "percentage_discount" | "free_gift" | "free_shipping";
  conditionType?: "item_quantity" | "cart_amount";
  amountThreshold?: number;
  rewardType?: "percentage_off" | "gift_product" | "free_shipping";
  rewardProductIds?: string[];
  giftQuantity?: number;
  logicType?: "standard" | "bxgy";
  buyQuantity?: number;
  getQuantity?: number;
  maxUsesPerOrder?: number;
};

type BxgyDiscountRule = {
  /** Dedicated BXGY keeps count mirrored with buyQuantity for compatibility. */
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
  collections?: Array<{
    id: string;
    title: string;
  }>;
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

type CollectionOption = {
  label: string;
  value: string;
};

type TriggerSelectionMode = "all" | "collection" | "exclude" | "custom" | null;

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
    const isBxgy = tier.logicType === "bxgy";
    const normalizedBuyQuantity = isBxgy
      ? Math.max(1, Math.trunc(Number(tier.buyQuantity) || Number(tier.count) || 2))
      : undefined;
    out.push({
      id: tier.id,
      count: isBxgy ? normalizedBuyQuantity! : Math.trunc(tier.count),
      discountPercent: isBxgy ? 100 : Math.max(0, Math.min(100, tier.discountPercent)),
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
      discountClass: tier.discountClass || "product",
      offerKind: tier.offerKind || "percentage_discount",
      conditionType: tier.conditionType || "item_quantity",
      amountThreshold:
        tier.conditionType === "cart_amount"
          ? Math.max(0, Number(tier.amountThreshold) || 0)
          : undefined,
      rewardType: tier.rewardType || "percentage_off",
      rewardProductIds: Array.isArray(tier.rewardProductIds)
        ? tier.rewardProductIds
        : [],
      giftQuantity:
        tier.rewardType === "gift_product"
          ? Math.max(1, Math.trunc(Number(tier.giftQuantity) || 1))
          : undefined,
      logicType: tier.logicType === "bxgy" ? "bxgy" : "standard",
      buyQuantity: isBxgy ? normalizedBuyQuantity : undefined,
      getQuantity:
        tier.logicType === "bxgy"
          ? Math.max(1, Math.trunc(Number(tier.getQuantity) || 1))
          : undefined,
      maxUsesPerOrder: tier.logicType === "bxgy" ? 1 : undefined,
    });
  }

  return out
    .sort((a, b) => a.count - b.count)
    .filter((tier, index, arr) => {
      const tierKey = [
        tier.logicType || "standard",
        tier.count,
        tier.conditionType || "item_quantity",
        tier.amountThreshold ?? "",
        tier.buyQuantity ?? "",
        tier.getQuantity ?? "",
      ].join("|");
      return (
        index ===
        arr.findIndex((x) => {
          const key = [
            x.logicType || "standard",
            x.count,
            x.conditionType || "item_quantity",
            x.amountThreshold ?? "",
            x.buyQuantity ?? "",
            x.getQuantity ?? "",
          ].join("|");
          return key === tierKey;
        })
      );
    });
}

function sanitizeDiscountRules(tiers: DiscountRule[]): DiscountRule[] {
  const dedupedByKey = new Map<string, DiscountRule>();
  for (const tier of tiers) {
    if (!Number.isFinite(tier.count) || tier.count < 1) continue;
    if (
      tier.rewardType === "percentage_off" &&
      !Number.isFinite(tier.discountPercent)
    ) {
      continue;
    }
    const normalizedCount = Math.trunc(tier.count);
    const isBxgy = tier.logicType === "bxgy";
    const normalizedBuyQuantity = isBxgy
      ? Math.max(1, Math.trunc(Number(tier.buyQuantity) || normalizedCount || 2))
      : undefined;
    const normalizedThreshold =
      tier.conditionType === "cart_amount"
        ? Math.max(0, Number(tier.amountThreshold) || 0)
        : undefined;
    const key = [
      tier.logicType || "standard",
      tier.discountClass || "product",
      tier.conditionType || "item_quantity",
      normalizedThreshold ?? normalizedCount,
      tier.rewardType || "percentage_off",
    ].join("|");
    dedupedByKey.set(key, {
      id: tier.id,
      count: isBxgy ? normalizedBuyQuantity! : normalizedCount,
      discountPercent: isBxgy ? 100 : Math.max(0, Math.min(100, tier.discountPercent)),
      title: tier.title || "",
      subtitle: tier.subtitle || "",
      badge: tier.badge || "",
      isDefault: !!tier.isDefault,
      discountClass: tier.discountClass || "product",
      offerKind:
        tier.rewardType === "free_shipping"
          ? "free_shipping"
          : tier.rewardType === "gift_product"
            ? "free_gift"
            : "percentage_discount",
      conditionType: tier.conditionType || "item_quantity",
      amountThreshold: normalizedThreshold,
      rewardType: tier.rewardType || "percentage_off",
      rewardProductIds: Array.isArray(tier.rewardProductIds)
        ? tier.rewardProductIds
        : [],
      giftQuantity:
        tier.rewardType === "gift_product"
          ? Math.max(1, Math.trunc(Number(tier.giftQuantity) || 1))
          : undefined,
      logicType: tier.logicType === "bxgy" ? "bxgy" : "standard",
      buyQuantity: isBxgy ? normalizedBuyQuantity : undefined,
      getQuantity:
        tier.logicType === "bxgy"
          ? Math.max(1, Math.trunc(Number(tier.getQuantity) || 1))
          : undefined,
      maxUsesPerOrder: tier.logicType === "bxgy" ? 1 : undefined,
    });
  }

  return Array.from(dedupedByKey.values())
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
  const [marketsError, setMarketsError] = useState("");
  const [ipCountryCodesError, setIpCountryCodesError] = useState("");

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
  const [customerSegments, setCustomerSegments] = useState<string[]>(
    normalizeCustomerSegments(
      offerSettings.customerSegments ? offerSettings.customerSegments.split(",") : ["all"],
    ),
  );
  const [customerProfileFilters, setCustomerProfileFilters] = useState<string[]>(
    normalizeCustomerProfileFilters(
      offerSettings.customerProfileFilters
        ? offerSettings.customerProfileFilters.split(",")
        : [],
    ),
  );
  const [ipCountryCodes, setIpCountryCodes] = useState<string[]>(
    normalizeDraftIpCountryCodes(
      offerSettings.ipCountryCodes ? offerSettings.ipCountryCodes.split(",") : [],
    ),
  );
  const [markets, setMarkets] = useState<string[]>(
    normalizeTargetMarkets(
      offerSettings.markets ? offerSettings.markets.split(",") : ["all"],
    ),
  );
  const [usageLimitPerCustomer, setUsageLimitPerCustomer] = useState(
    offerSettings.usageLimitPerCustomer
  );
  const normalizedMarkets = useMemo(() => normalizeTargetMarkets(markets), [markets]);
  const normalizedCustomerSegments = useMemo(
    () => normalizeCustomerSegments(customerSegments),
    [customerSegments],
  );
  const normalizedCustomerProfileFilters = useMemo(
    () => normalizeCustomerProfileFilters(customerProfileFilters),
    [customerProfileFilters],
  );
  const normalizedIpCountryCodes = useMemo(
    () => normalizeIpCountryCodes(ipCountryCodes),
    [ipCountryCodes],
  );
  const invalidIpCountryCodes = useMemo(
    () => getInvalidIpCountryCodes(ipCountryCodes),
    [ipCountryCodes],
  );

  useEffect(() => {
    if (marketsError && normalizedMarkets.length > 0) {
      setMarketsError("");
    }
  }, [marketsError, normalizedMarkets]);

  useEffect(() => {
    if (ipCountryCodesError && invalidIpCountryCodes.length === 0) {
      setIpCountryCodesError("");
    }
  }, [invalidIpCountryCodes, ipCountryCodesError]);

  const validateTargetingInputs = () => {
    let hasError = false;

    if (normalizedMarkets.length === 0) {
      setMarketsError("Select at least one market or keep All markets enabled.");
      hasError = true;
    } else {
      setMarketsError("");
    }

    if (invalidIpCountryCodes.length > 0) {
      setIpCountryCodesError(
        `Use 2-letter ISO country codes like US or CA. Remove: ${invalidIpCountryCodes.join(", ")}.`,
      );
      hasError = true;
    } else {
      setIpCountryCodesError("");
    }

    if (!startTime) {
      setStartTimeError("Start Time is required.");
      hasError = true;
    } else if (!dayjs(startTime).isValid() || startTime === "") {
      setStartTimeError("Invalid start time format.");
      hasError = true;
    } else {
      setStartTimeError("");
    }

    if (endTime && (!dayjs(endTime).isValid() || endTime === "")) {
      setEndTimeError("Invalid end time format.");
      hasError = true;
    } else if (startTime && endTime && !dayjs(endTime).isAfter(dayjs(startTime))) {
      setEndTimeError("End time must be after start time.");
      hasError = true;
    } else if (showCountdownBlock && !endTime) {
      setEndTimeError("Countdown requires an end time.");
      hasError = true;
    } else {
      setEndTimeError("");
    }

    return !hasError;
  };
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
  const selectedProductsJsonForLegacyRewards =
    initialCampaignLegacy?.selectedProductsJson ??
    initialOffer?.selectedProductsJson;
  const selectedSourceOfferTypeForLegacyRewards =
    (initialCampaignLegacy?.offerType as OfferTypeId | undefined) ??
    (initialOffer?.offerType as OfferTypeId | undefined);
  const legacyFreeGiftRewardIds =
    selectedSourceOfferTypeForLegacyRewards === "free-gift"
      ? parseFreeGiftSelectedProducts(selectedProductsJsonForLegacyRewards).giftProducts
      : [];

  const mapProductIdsToDraftProducts = (ids: string[]) =>
    ids.map((id) => {
      const found = storeProducts.find((p) => String(p.id) === String(id));
      return {
        id: String(id),
        title: found?.name ?? "Unknown product",
        image: found?.image ?? "https://via.placeholder.com/60",
        price: found?.price ?? "€0.00",
        variantsCount: Array.isArray(found?.variants) ? found.variants.length : 1,
        hasSubscription: found?.hasSubscription === true,
      };
    });
  const mapPickerSelectionToDraftProducts = (selectedList: any[]) =>
    selectedList.map((item: any) => ({
      id: String(item.id),
      title: String(item.title || ""),
      image: item.images?.[0]?.originalSrc || "https://via.placeholder.com/60",
      price: item.variants?.[0]?.price || "€0.00",
      variantsCount: item.variants?.length || 1,
      hasSubscription:
        ((item.sellingPlanGroups?.edges as Array<unknown> | undefined) ?? []).length > 0 ||
        storeProducts.some((p) => String(p.id) === String(item.id) && p.hasSubscription),
    }));
  const [collectionSelectionModalOpen, setCollectionSelectionModalOpen] = useState(false);
  const [pendingCollectionIds, setPendingCollectionIds] = useState<string[]>([]);
  const [triggerSelectionMode, setTriggerSelectionMode] = useState<TriggerSelectionMode>(null);
  const [triggerSelectionSummary, setTriggerSelectionSummary] = useState("");
  const allStoreProductIds = useMemo(
    () => storeProducts.map((product) => String(product.id || "")).filter(Boolean),
    [storeProducts],
  );
  const collectionOptions = useMemo(
    () =>
      Array.from(
        new Map(
          storeProducts.flatMap((product) =>
            (product.collections || []).map((collection) => [
              String(collection.id || ""),
              {
                label: String(collection.title || ""),
                value: String(collection.id || ""),
              } satisfies CollectionOption,
            ]),
          ),
        ).values(),
      )
        .filter((option) => option.value && option.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [storeProducts],
  );
  const areStringArraysEqual = (left: string[], right: string[]) =>
    left.length === right.length && left.every((value, index) => value === right[index]);
  const createDefaultCompleteBundleBar = (
    type: "quantity-break-same" | "bxgy" = "quantity-break-same",
  ): CompleteBundleBar => ({
    id: `bar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    title: "Complete the bundle",
    subtitle: "Pick up to 3 accessories and unlock accessory savings",
    minQuantity: 1,
    maxQuantity: 3,
    excludeTriggerProduct: true,
    quantity: 3,
    products: [],
    pricing: { mode: "percentage_off", value: 15 },
  });

  const handleSelectProducts = async (
    type: "buy" | "gift" | "normal" | "product_bundle" = "normal",
  ) => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      // 保持 Shopify 原生 picker 机制，不传 filter.query，避免 collection 过滤 UI 失效
      multiple: type === "normal" && offerType === "subscription" ? false : true,
      selectionIds:
        type === "buy"
          ? buyProducts.map((id) => ({ id }))
          : type === "gift"
            ? aggregatedFreeGiftRewardProductIds.map((id) => ({ id }))
            : type === "product_bundle"
              ? productBundleProductIds.map((id) => ({ id }))
              : selectedProductsData.map((p) => ({ id: p.id })),
    });

    if (!selected) return;
    const selectedList = Array.isArray(selected) ? selected : [selected];
    const newData = mapPickerSelectionToDraftProducts(selectedList);

    if (type === "buy") {
      const nextIds = newData.map((item: any) => String(item.id));
      setBuyProducts(nextIds);
      setSelectedProductsData(newData);
      if (freeGiftRules.length > 0) {
        setFreeGiftTriggerProducts(nextIds);
      }
      return;
    }

    if (type === "gift") {
      const nextIds = newData.map((item: any) => String(item.id));
      setFreeGiftRules((prev) =>
        prev.map((rule) => ({
          ...rule,
          giftProductIds: nextIds,
        })),
      );
      return;
    }

    if (type === "product_bundle") {
      setProductBundleProductIds(newData.map((item: any) => String(item.id)));
      return;
    }

    const nextProducts = offerType === "subscription" ? newData.slice(0, 1) : newData;
    const nextIds = nextProducts.map((item: any) => String(item.id));
    setSelectedProductsData(nextProducts);
    if (bxgyDiscountRules.length > 0 || offerType === "bxgy") {
      setBuyProducts(nextIds);
    }
    if (freeGiftRules.length > 0 || offerType === "free-gift") {
      setFreeGiftTriggerProducts(nextIds);
    }

    if (offerType === "subscription" && nextProducts[0]?.id) {
      subscriptionStatusFetcher.submit(
        {
          intent: "get-product-subscription-status",
          productId: String(nextProducts[0].id),
        },
        { method: "post" },
      );
    }
  };
  const applyStepTwoTriggerProducts = (products: ReturnType<typeof mapProductIdsToDraftProducts>) => {
    const nextProducts = offerType === "subscription" ? products.slice(0, 1) : products;
    const nextIds = nextProducts.map((product) => String(product.id));
    setSelectedProductsData(nextProducts);
    if (bxgyDiscountRules.length > 0 || offerType === "bxgy") {
      setBuyProducts(nextIds);
    }
    if (freeGiftRules.length > 0 || offerType === "free-gift") {
      setFreeGiftTriggerProducts(nextIds);
    }
    if (offerType === "subscription" && nextProducts[0]?.id) {
      subscriptionStatusFetcher.submit(
        {
          intent: "get-product-subscription-status",
          productId: String(nextProducts[0].id),
        },
        { method: "post" },
      );
    }
  };
  const openStepTwoTriggerProductPicker = async (
    selectionProductIds?: string[],
    meta?: { mode: Exclude<TriggerSelectionMode, null>; summary: string },
  ) => {
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: offerType === "subscription" ? false : true,
      selectionIds: (selectionProductIds || selectedProductsData.map((product) => String(product.id))).map(
        (id) => ({ id }),
      ),
    });
    if (!selected) return;
    const selectedList = Array.isArray(selected) ? selected : [selected];
    applyStepTwoTriggerProducts(mapPickerSelectionToDraftProducts(selectedList));
    if (meta) {
      setTriggerSelectionMode(meta.mode);
      setTriggerSelectionSummary(meta.summary);
    }
  };
  const handleSelectAllTriggerProducts = () => {
    if (allStoreProductIds.length === 0) {
      message.warning("Products are still loading. Please try again in a moment.");
      return;
    }
    applyStepTwoTriggerProducts(mapProductIdsToDraftProducts(allStoreProductIds));
    setTriggerSelectionMode("all");
    setTriggerSelectionSummary(`All products selected (${allStoreProductIds.length})`);
  };
  const handleExcludeTriggerProducts = async () => {
    if (allStoreProductIds.length === 0) {
      message.warning("Products are still loading. Please try again in a moment.");
      return;
    }
    await openStepTwoTriggerProductPicker(allStoreProductIds, {
      mode: "exclude",
      summary: "All products selected, with excluded items removed in picker",
    });
  };
  const handleSelectTriggerProductsByCollection = () => {
    if (collectionOptions.length === 0) {
      message.warning("No collections are available for selection right now.");
      return;
    }
    setPendingCollectionIds([]);
    setCollectionSelectionModalOpen(true);
  };
  const confirmTriggerProductsByCollection = () => {
    if (pendingCollectionIds.length === 0) {
      message.warning("Select at least one collection first.");
      return;
    }
    const collectionIdSet = new Set(pendingCollectionIds);
    const matchedProductIds = Array.from(
      new Set(
        storeProducts
          .filter((product) =>
            (product.collections || []).some((collection) =>
              collectionIdSet.has(String(collection.id || "")),
            ),
          )
          .map((product) => String(product.id || ""))
          .filter(Boolean),
      ),
    );
    if (matchedProductIds.length === 0) {
      message.warning("No products were found in the selected collections.");
      return;
    }
    const summaryLabel = collectionOptions
      .filter((option) => pendingCollectionIds.includes(option.value))
      .slice(0, 2)
      .map((option) => option.label)
      .join(", ");
    setCollectionSelectionModalOpen(false);
    setPendingCollectionIds([]);
    window.setTimeout(() => {
      void openStepTwoTriggerProductPicker(matchedProductIds, {
        mode: "collection",
        summary:
          pendingCollectionIds.length > 2
            ? `Collection selection: ${summaryLabel} +${pendingCollectionIds.length - 2} more`
            : `Collection selection: ${summaryLabel}`,
      });
    }, 0);
  };
  const handleCustomFilterTriggerProducts = async () => {
    await openStepTwoTriggerProductPicker(undefined, {
      mode: "custom",
      summary: "Custom filter with Shopify product picker",
    });
  };
  const selectFreeGiftRewardProducts = async (ruleIndex: number) => {
    const targetRule = freeGiftRules[ruleIndex];
    if (!targetRule) return;
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      selectionIds: (targetRule.giftProductIds || []).map((id) => ({ id })),
    });
    if (!selected) return;
    const selectedList = Array.isArray(selected) ? selected : [selected];
    const nextIds = selectedList.map((item: any) => String(item.id));
    setFreeGiftRules((prev) =>
      prev.map((rule, index) =>
        index === ruleIndex ? { ...rule, giftProductIds: nextIds } : rule,
      ),
    );
  };
  const addCompleteBundleBar = (type: "quantity-break-same" | "bxgy") => {
    const nextBar = createDefaultCompleteBundleBar(type);
    const newBar: CompleteBundleBar = {
      ...nextBar,
      products: [],
    };
    setCompleteBundleBars((prev) => [...prev, newBar]);
    setActiveBundleBarId(newBar.id);
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
  const clearCompleteBundleBars = () => {
    if (offerType === "complete-bundle") {
      const fallbackBar = createDefaultCompleteBundleBar();
      setCompleteBundleBars([fallbackBar]);
      setActiveBundleBarId(fallbackBar.id);
      return;
    }
    setCompleteBundleBars([]);
    setActiveBundleBarId("");
  };

  const handleSelectProductsForBundleBar = async (barId: string) => {
    const targetBar = completeBundleBars.find((bar) => bar.id === barId);
    if (!targetBar) return;
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      selectionIds: targetBar.products.map((p) => ({ id: p.productId })),
    });
    if (!selected) return;
    const triggerProductIds = new Set(
      selectedProductsData.map((product) => String(product.id || "")),
    );
    const mappedProducts: CompleteBundleProductDraft[] = selected
      .map((item: any) => ({
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
    }))
      .filter((product: CompleteBundleProductDraft) => !triggerProductIds.has(product.productId));
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
      ).map((rule) => ({
        ...rule,
        giftProductIds:
          Array.isArray(rule.giftProductIds) && rule.giftProductIds.length > 0
            ? rule.giftProductIds
            : legacyFreeGiftRewardIds,
      })),
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
  const aggregatedFreeGiftRewardProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          freeGiftRules.flatMap((rule) =>
            Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
          ),
        ),
      ),
    [freeGiftRules],
  );
  const giftProductsData = useMemo(
    () => mapProductIdsToDraftProducts(aggregatedFreeGiftRewardProductIds),
    [aggregatedFreeGiftRewardProductIds, storeProducts],
  );
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
    () => {
      if (initialCompleteBundleConfig.bars.length > 0) {
        return initialCompleteBundleConfig.bars;
      }
      if (
        (initialCampaignLegacy?.offerType as OfferTypeId | undefined) === "complete-bundle" ||
        initialOffer?.offerType === "complete-bundle"
      ) {
        return starterTemplateDefaults?.completeBundleBars?.length
          ? starterTemplateDefaults.completeBundleBars
          : [createDefaultCompleteBundleBar()];
      }
      return [];
    },
  );
  const [activeBundleBarId, setActiveBundleBarId] = useState<string>(
    () =>
      initialCompleteBundleConfig.bars[0]?.id ||
      (((initialCampaignLegacy?.offerType as OfferTypeId | undefined) === "complete-bundle" ||
        initialOffer?.offerType === "complete-bundle") &&
      starterTemplateDefaults?.completeBundleBars?.[0]?.id) ||
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
  const [productBundleEnabled, setProductBundleEnabled] = useState(
    offerSettings.productBundleEnabled,
  );
  const [productBundleTitle, setProductBundleTitle] = useState(
    offerSettings.productBundleTitle,
  );
  const [productBundleSubtitle, setProductBundleSubtitle] = useState(
    offerSettings.productBundleSubtitle,
  );
  const [productBundleMinQuantity, setProductBundleMinQuantity] = useState(
    offerSettings.productBundleMinQuantity,
  );
  const [productBundleProductIds, setProductBundleProductIds] = useState<string[]>(
    offerSettings.productBundleProductIds,
  );
  const [checkboxUpsellsEnabled, setCheckboxUpsellsEnabled] = useState(
    offerSettings.checkboxUpsellsEnabled,
  );
  const [checkboxUpsellsTitle, setCheckboxUpsellsTitle] = useState(
    offerSettings.checkboxUpsellsTitle,
  );
  const [checkboxUpsellsSubtitle, setCheckboxUpsellsSubtitle] = useState(
    offerSettings.checkboxUpsellsSubtitle,
  );
  const [checkboxUpsellsDefaultChecked, setCheckboxUpsellsDefaultChecked] = useState(
    offerSettings.checkboxUpsellsDefaultChecked,
  );
  const [stickyAddToCartEnabled, setStickyAddToCartEnabled] = useState(
    offerSettings.stickyAddToCartEnabled,
  );
  const [stickyAddToCartTitle, setStickyAddToCartTitle] = useState(
    offerSettings.stickyAddToCartTitle,
  );
  const [stickyAddToCartSubtitle, setStickyAddToCartSubtitle] = useState(
    offerSettings.stickyAddToCartSubtitle,
  );
  const [stickyAddToCartButtonText, setStickyAddToCartButtonText] = useState(
    offerSettings.stickyAddToCartButtonText,
  );
  const [compositionBarOrder, setCompositionBarOrder] = useState<string[]>([]);
  const productBundleProductsData = useMemo(
    () =>
      productBundleProductIds.map((id) => {
        const product = storeProducts.find((entry) => String(entry.id) === String(id));
        return {
          id: String(id),
          title: product?.name || "Selected product",
          image: product?.image || "https://via.placeholder.com/60",
          price: product?.price || "€0.00",
          variantsCount: Array.isArray(product?.variants) ? product.variants.length : 1,
          hasSubscription: product?.hasSubscription === true,
        };
      }),
    [productBundleProductIds, storeProducts],
  );
  useEffect(() => {
    if (selectedProductsData.length > 0) return;
    const fallbackIds =
      buyProducts.length > 0
        ? buyProducts
        : freeGiftTriggerProducts.length > 0
          ? freeGiftTriggerProducts
          : [];
    if (!fallbackIds.length) return;
    setSelectedProductsData(mapProductIdsToDraftProducts(fallbackIds));
  }, [
    selectedProductsData.length,
    buyProducts,
    freeGiftTriggerProducts,
    storeProducts,
  ]);

  useEffect(() => {
    const globalTriggerIds = selectedProductsData.map((product) => String(product.id));
    if (bxgyDiscountRules.length > 0 && !areStringArraysEqual(buyProducts, globalTriggerIds)) {
      setBuyProducts(globalTriggerIds);
    }
    if (
      freeGiftRules.length > 0 &&
      !areStringArraysEqual(freeGiftTriggerProducts, globalTriggerIds)
    ) {
      setFreeGiftTriggerProducts(globalTriggerIds);
    }
  }, [
    selectedProductsData,
    bxgyDiscountRules.length,
    freeGiftRules.length,
    buyProducts,
    freeGiftTriggerProducts,
  ]);
  useEffect(() => {
    const triggerIds = selectedProductsData.map((product) => String(product.id));
    const triggerIdSet = new Set(triggerIds);
    setDifferentProductsDiscountRules((prev) => {
      let changed = false;
      const next = prev.map((rule) => {
        const scopedIds = (rule.buyProductIds || []).filter((id) =>
          triggerIdSet.has(String(id)),
        );
        const normalizedScopedIds =
          triggerIds.length > 0
            ? scopedIds.length > 0
              ? scopedIds
              : triggerIds
            : [];
        if (areStringArraysEqual(rule.buyProductIds || [], normalizedScopedIds)) {
          return rule;
        }
        changed = true;
        return {
          ...rule,
          buyProductIds: normalizedScopedIds,
        };
      });
      return changed ? next : prev;
    });
  }, [selectedProductsData]);
  useEffect(() => {
    const persistedOrder = initialCampaignConfig?.settings.compositionBarOrder;
    if (Array.isArray(persistedOrder) && persistedOrder.length > 0) {
      setCompositionBarOrder(
        persistedOrder.map((id) => String(id || "").trim()).filter(Boolean),
      );
    }
  }, [initialCampaignConfig]);
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
    await handleSelectProductsForBundleBar(barId);
  };

  /**
   * 仅 Bar #2 及之后：从该 bundle 栏移除单个商品（Bar1 仅默认主商品，不提供删除入口）
   */
  const removeProductFromBundleBar = (barId: string, productId: string) => {
    setCompleteBundleBars((prev) =>
      prev.map((bar) =>
        bar.id !== barId
          ? bar
          : { ...bar, products: bar.products.filter((p) => p.productId !== productId) },
      ),
    );
  };

  /**
   * 配件池内：单个配件商品的折扣模式 + 变体预览控件。
   */
  const renderCompleteBundleProductPricingCard = (
    bar: CompleteBundleBar,
    product: CompleteBundleProduct,
    productIdx: number,
    _isFirstOfferBar: boolean,
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
    const productLabel = `Accessory ${productIdx + 1}`;

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
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-[12px] font-medium text-[#1c1f23]">
            Accessory pricing
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
          count: rule.buyQuantity || rule.count || 1,
          buyProductIds: buyProducts,
          getProductIds: buyProducts,
        })),
      );
    }
  }, [buyProducts, offerType]);
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
        label: `Bar #${i + 1} (buy ${r.buyQuantity}, get ${r.getQuantity})`,
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
          label:
            r.logicType === "bxgy"
              ? `Bar #${i + 2} (BXGY, buy ${r.buyQuantity || 2} get ${r.getQuantity || 1})`
              : `Bar #${i + 2} (qty ${r.count})`,
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
    const addScopeProducts = (ids: string[]) => {
      scopeProductIds = Array.from(
        new Set([...scopeProductIds, ...ids.map((id) => String(id)).filter(Boolean)]),
      );
    };

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
              discountClass: rule.discountClass || "product",
              offerKind: rule.offerKind || "percentage_discount",
              conditionType: rule.conditionType || "item_quantity",
              amountThreshold: rule.amountThreshold,
              rewardType: rule.rewardType || "percentage_off",
              rewardProductIds: Array.isArray(rule.rewardProductIds)
                ? rule.rewardProductIds
                : [],
              giftQuantity: rule.giftQuantity,
              logicType: rule.logicType === "bxgy" ? "bxgy" : "standard",
              buyQuantity: rule.buyQuantity,
              getQuantity: rule.getQuantity,
              maxUsesPerOrder: rule.maxUsesPerOrder,
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
      scopeProductIds = Array.from(new Set(buyProducts));
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
      const completeBundleConfig = buildCompleteBundleConfig({
        triggerProductIds: selectedProductsData.map((product) => String(product.id)),
        bars: completeBundleBars,
      });
      scopeProductIds = Array.from(
        new Set(
          [
            ...selectedProductsData.map((product) => String(product.id)),
            ...completeBundleConfig.bars.flatMap((bar) =>
              bar.products.map((product) => String(product.productId)),
            ),
          ],
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
          ...aggregatedFreeGiftRewardProductIds,
        ]),
      );
      logicBlocks = [
        {
          id: logicBlockId,
          type: "free-gift",
          config: {
            triggerProductIds: freeGiftTriggerProducts,
            giftProductIds: aggregatedFreeGiftRewardProductIds,
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

    if (offerType !== "quantity-breaks-same" && normalizedDiscountRules.length > 0) {
      logicBlocks.push({
        id: "logic-quantity-breaks",
        type: "quantity-breaks",
        config: {
          tiers: normalizedDiscountRules.map((rule) => ({
            qty: rule.count,
            discountPercent: rule.discountPercent,
            title: rule.title || "",
            subtitle: rule.subtitle || "",
            badge: rule.badge || "",
            isDefault: !!rule.isDefault,
            discountClass: rule.discountClass || "product",
            offerKind: rule.offerKind || "percentage_discount",
            conditionType: rule.conditionType || "item_quantity",
            amountThreshold: rule.amountThreshold,
            rewardType: rule.rewardType || "percentage_off",
            rewardProductIds: Array.isArray(rule.rewardProductIds)
              ? rule.rewardProductIds
              : [],
            giftQuantity: rule.giftQuantity,
            logicType: rule.logicType === "bxgy" ? "bxgy" : "standard",
            buyQuantity: rule.buyQuantity,
            getQuantity: rule.getQuantity,
            maxUsesPerOrder: rule.maxUsesPerOrder,
          })),
        },
      });
      addScopeProducts(selectedProductsData.map((product) => String(product.id)));
    }

    if (offerType !== "quantity-breaks-different" && differentProductsDiscountRules.length > 0) {
      logicBlocks.push({
        id: "logic-quantity-breaks-different",
        type: "quantity-breaks-different",
        config: {
          tiers: buildDifferentProductsDiscountRulesJson(differentProductsDiscountRules),
        },
      });
      addScopeProducts(selectedProductsData.map((product) => String(product.id)));
    }

    if (offerType !== "bxgy" && bxgyDiscountRules.length > 0) {
      logicBlocks.push({
        id: "logic-bxgy",
        type: "bxgy",
        config: {
          tiers: buildBxgyDiscountRulesJson(bxgyDiscountRules),
        },
      });
      addScopeProducts(buyProducts);
    }

    if (offerType !== "free-gift" && freeGiftRules.length > 0) {
      logicBlocks.push({
        id: "logic-free-gift",
        type: "free-gift",
        config: {
          triggerProductIds: freeGiftTriggerProducts,
          giftProductIds: aggregatedFreeGiftRewardProductIds,
          tiers: buildFreeGiftRulesJson(freeGiftRules),
        },
      });
      addScopeProducts([
        ...freeGiftTriggerProducts,
        ...aggregatedFreeGiftRewardProductIds,
      ]);
    }

    if (offerType !== "complete-bundle" && completeBundleBars.length > 0) {
      const completeBundleConfig = buildCompleteBundleConfig({
        triggerProductIds: selectedProductsData.map((product) => String(product.id)),
        bars: completeBundleBars,
      });
      logicBlocks.push({
        id: "logic-complete-bundle",
        type: "complete-bundle",
        config: completeBundleConfig,
      });
      addScopeProducts(
        [
          ...(completeBundleConfig.triggerProductIds ?? []),
          ...completeBundleConfig.bars.flatMap((bar) =>
            bar.products.map((product) => String(product.productId)),
          ),
        ],
      );
    }

    if (subscriptionEnabled && offerType !== "subscription") {
      const subscriptionProductIds = selectedProductsData.map((product) => String(product.id));
      logicBlocks.push({
        id: "logic-subscription",
        type: "subscription",
        config: {
          enabled: true,
          position: subscriptionPosition,
          title: subscriptionTitle,
          subtitle: subscriptionSubtitle,
          oneTimeTitle,
          oneTimeSubtitle,
          defaultSelected: subscriptionDefaultSelected,
          productIds: subscriptionProductIds,
        },
      });
      addScopeProducts(subscriptionProductIds);
    }

    return {
      version: 1,
      scope: {
        productIds: scopeProductIds,
        markets: normalizedMarkets,
        customerSegments: normalizedCustomerSegments,
        customerProfileFilters: normalizedCustomerProfileFilters,
        ipCountryCodes: normalizedIpCountryCodes,
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
        compositionBarOrder,
        checkboxUpsellsEnabled,
        checkboxUpsellsTitle: sanitizeSingleLineText(
          checkboxUpsellsTitle,
          OFFER_TEXT_LIMITS.widgetTitle,
          "Add this offer to my order",
        ),
        checkboxUpsellsSubtitle: sanitizeSingleLineText(
          checkboxUpsellsSubtitle,
          120,
          "Customers can opt in before adding the bundle.",
        ),
        checkboxUpsellsDefaultChecked,
        stickyAddToCartEnabled,
        stickyAddToCartTitle: sanitizeSingleLineText(
          stickyAddToCartTitle,
          OFFER_TEXT_LIMITS.widgetTitle,
          "Ready to add this offer?",
        ),
        stickyAddToCartSubtitle: sanitizeSingleLineText(
          stickyAddToCartSubtitle,
          120,
          "Keep the bundle CTA visible while customers compare options.",
        ),
        stickyAddToCartButtonText: sanitizeSingleLineText(
          stickyAddToCartButtonText,
          OFFER_TEXT_LIMITS.buttonText,
          "Add bundle",
        ),
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
    checkboxUpsellsEnabled,
    checkboxUpsellsTitle,
    checkboxUpsellsSubtitle,
    checkboxUpsellsDefaultChecked,
    completeBundleBars,
    countdownLabel,
    normalizedCustomerSegments,
    normalizedCustomerProfileFilters,
    dailyBudget,
    differentProductsDiscountRules,
    endTime,
    freeGiftRules,
    freeGiftTriggerProducts,
    aggregatedFreeGiftRewardProductIds,
    compositionBarOrder,
    labelColor,
    layoutFormat,
    normalizedIpCountryCodes,
    normalizedMarkets,
    normalizedDiscountRules,
    oneTimeSubtitle,
    oneTimeTitle,
    productBundleEnabled,
    productBundleMinQuantity,
    productBundleProductIds,
    productBundleSubtitle,
    productBundleTitle,
    scheduleTimezone,
    selectedProductsData,
    showCountdownBlock,
    showCustomButton,
    startTime,
    status,
    subscriptionDefaultSelected,
    subscriptionEnabled,
    subscriptionPosition,
    subscriptionSubtitle,
    subscriptionTitle,
    stickyAddToCartEnabled,
    stickyAddToCartTitle,
    stickyAddToCartSubtitle,
    stickyAddToCartButtonText,
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
  const checkboxUpsellPreview = useMemo(
    () => ({
      enabled: checkboxUpsellsEnabled,
      title: checkboxUpsellsTitle.trim() || "Add this offer to my order",
      subtitle:
        checkboxUpsellsSubtitle.trim() ||
        "Customers can opt in before adding the bundle.",
      defaultChecked: checkboxUpsellsDefaultChecked,
    }),
    [
      checkboxUpsellsEnabled,
      checkboxUpsellsTitle,
      checkboxUpsellsSubtitle,
      checkboxUpsellsDefaultChecked,
    ],
  );
  const stickyAddToCartPreview = useMemo(
    () => ({
      enabled: stickyAddToCartEnabled,
      title: stickyAddToCartTitle.trim() || "Ready to add this offer?",
      subtitle:
        stickyAddToCartSubtitle.trim() ||
        "Keep the bundle CTA visible while customers compare options.",
      buttonText: stickyAddToCartButtonText.trim() || "Add bundle",
    }),
    [
      stickyAddToCartEnabled,
      stickyAddToCartTitle,
      stickyAddToCartSubtitle,
      stickyAddToCartButtonText,
    ],
  );
  const unifiedRulesSnapshot = useMemo(
    () =>
      buildUnifiedRulesSnapshot({
        offerType,
        selectedProductIds: selectedProductsData.map((product) => String(product.id)),
        buyProductIds: buyProducts,
        getProductIds: buyProducts,
        freeGiftTriggerProductIds: freeGiftTriggerProducts,
        freeGiftGiftProductIds: aggregatedFreeGiftRewardProductIds,
        discountRules: normalizedDiscountRules,
        bxgyDiscountRules,
        freeGiftRules,
        differentProductsDiscountRules,
        completeBundleBars,
        subscriptionEnabled,
      }),
    [
      offerType,
      selectedProductsData,
      buyProducts,
      buyProducts,
      freeGiftTriggerProducts,
      aggregatedFreeGiftRewardProductIds,
      normalizedDiscountRules,
      bxgyDiscountRules,
      freeGiftRules,
      differentProductsDiscountRules,
      completeBundleBars,
      subscriptionEnabled,
    ],
  );
  const campaignDraft = useMemo<CampaignDraft>(
    () => ({
      offerType,
      selectedProductsData,
      discountRules,
      buyProducts,
      getProducts: buyProducts,
      activeBundleBarId,
      completeBundleBars,
      productBundleEnabled,
      productBundleTitle,
      productBundleSubtitle,
      productBundleMinQuantity,
      productBundleProductIds,
      productBundleProductsData,
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
      checkboxUpsellsEnabled,
      checkboxUpsellsTitle,
      checkboxUpsellsSubtitle,
      checkboxUpsellsDefaultChecked,
      stickyAddToCartEnabled,
      stickyAddToCartTitle,
      stickyAddToCartSubtitle,
      stickyAddToCartButtonText,
      normalizedDiscountRules,
      bxgyDiscountRules,
      differentProductsDiscountRules,
      freeGiftRules,
      subscriptionEnabled,
      unifiedRulesSnapshot,
    }),
    [
      offerType,
      selectedProductsData,
      discountRules,
      buyProducts,
      activeBundleBarId,
      completeBundleBars,
      productBundleEnabled,
      productBundleTitle,
      productBundleSubtitle,
      productBundleMinQuantity,
      productBundleProductIds,
      productBundleProductsData,
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
      checkboxUpsellsEnabled,
      checkboxUpsellsTitle,
      checkboxUpsellsSubtitle,
      checkboxUpsellsDefaultChecked,
      stickyAddToCartEnabled,
      stickyAddToCartTitle,
      stickyAddToCartSubtitle,
      stickyAddToCartButtonText,
      normalizedDiscountRules,
      bxgyDiscountRules,
      differentProductsDiscountRules,
      freeGiftRules,
      subscriptionEnabled,
      unifiedRulesSnapshot,
    ],
  );
  const compositionBars = getCampaignCompositionBars(campaignDraft);
  const compositionModules = getCampaignCompositionModules(campaignDraft, {
    showCountdownBlock,
  });
  const compositionRulesSnapshot = useMemo(
    () => getCampaignCompositionRulesSnapshot(campaignDraft),
    [campaignDraft],
  );
  useEffect(() => {
    const currentIds = compositionBars.map((bar) => bar.id);
    setCompositionBarOrder((prev) => {
      const filtered = prev.filter((id) => currentIds.includes(id));
      const missing = currentIds.filter((id) => !filtered.includes(id));
      const next = [...filtered, ...missing];
      if (
        next.length === prev.length &&
        next.every((id, index) => id === prev[index])
      ) {
        return prev;
      }
      return next;
    });
  }, [compositionBars]);
  const orderedCompositionBars = useMemo(
    () => orderCampaignCompositionBars(compositionBars, compositionBarOrder),
    [compositionBars, compositionBarOrder],
  );
  const orderedCompositionRulesSnapshot = useMemo(
    () => orderCampaignCompositionRules(compositionRulesSnapshot, compositionBarOrder),
    [compositionRulesSnapshot, compositionBarOrder],
  );
  const hasMixedCompositionSources = useMemo(
    () =>
      new Set(orderedCompositionRulesSnapshot.map((rule) => rule.sourceOfferType))
        .size > 1,
    [orderedCompositionRulesSnapshot],
  );
  const activeDisplayRules = orderedCompositionRulesSnapshot;
  const getModuleBlockingMessage = () => {
    if (
      completeBundleBars.length > 0 &&
      completeBundleBars.every((bar) => bar.products.length === 0)
    ) {
      return "Complete bundle module requires at least one configured bundle product.";
    }
    return null;
  };
  const clearAllCompositionBarDefaults = () => {
    setDiscountRules((prev) => prev.map((rule) => ({ ...rule, isDefault: false })));
    setBxgyDiscountRules((prev) => prev.map((rule) => ({ ...rule, isDefault: false })));
    setFreeGiftRules((prev) => prev.map((rule) => ({ ...rule, isDefault: false })));
    setDifferentProductsDiscountRules((prev) =>
      prev.map((rule) => ({ ...rule, isDefault: false })),
    );
  };
  const updateUnifiedRulePresentation = (
    id: string,
    patch: RulePresentationPatch,
  ) => {
    if (offerType === "subscription") {
      if (id === "subscription-option") {
        if (typeof patch.title === "string") setSubscriptionTitle(patch.title);
        if (typeof patch.subtitle === "string") setSubscriptionSubtitle(patch.subtitle);
        if (typeof patch.isDefault === "boolean") {
          setSubscriptionDefaultSelected(patch.isDefault);
        }
        return;
      }
      if (id === "one-time-option") {
        if (typeof patch.title === "string") setOneTimeTitle(patch.title);
        if (typeof patch.subtitle === "string") setOneTimeSubtitle(patch.subtitle);
      }
      return;
    }

    const compositionRule = orderedCompositionRulesSnapshot.find((rule) => rule.id === id);
    if (compositionRule) {
      if (patch.isDefault === true) {
        clearAllCompositionBarDefaults();
      }
      switch (compositionRule.sourceOfferType) {
        case "quantity-breaks-same": {
          const index = compositionRule.id
            ? orderedCompositionRulesSnapshot
                .filter((rule) => rule.sourceOfferType === "quantity-breaks-same")
                .findIndex((rule) => rule.id === id)
            : -1;
          if (index >= 0) {
            setDiscountRules((prev) =>
              updateDiscountRulePresentation(prev, index, patch),
            );
          }
          return;
        }
        case "bxgy": {
          const index = orderedCompositionRulesSnapshot
            .filter((rule) => rule.sourceOfferType === "bxgy")
            .findIndex((rule) => rule.id === id);
          if (index >= 0) {
            setBxgyDiscountRules((prev) =>
              updateBxgyRulePresentation(prev, index, patch),
            );
          }
          return;
        }
        case "free-gift": {
          const index = orderedCompositionRulesSnapshot
            .filter((rule) => rule.sourceOfferType === "free-gift")
            .findIndex((rule) => rule.id === id);
          if (index >= 0) {
            setFreeGiftRules((prev) =>
              updateFreeGiftRulePresentation(prev, index, patch),
            );
          }
          return;
        }
        case "quantity-breaks-different": {
          const index = orderedCompositionRulesSnapshot
            .filter((rule) => rule.sourceOfferType === "quantity-breaks-different")
            .findIndex((rule) => rule.id === id);
          if (index >= 0) {
            setDifferentProductsDiscountRules((prev) =>
              updateDifferentProductsRulePresentation(prev, index, patch),
            );
          }
          return;
        }
        case "complete-bundle":
          setCompleteBundleBars((prev) =>
            updateCompleteBundleBarPresentation(prev, id, patch),
          );
          return;
        default:
          break;
      }
    }

    const index = campaignDraft.unifiedRulesSnapshot.findIndex((rule) => rule.id === id);
    if (index < 0) return;

    switch (offerType) {
      case "quantity-breaks-same":
        setDiscountRules((prev) =>
          updateDiscountRulePresentation(prev, index, patch),
        );
        return;
      case "bxgy":
        setBxgyDiscountRules((prev) =>
          updateBxgyRulePresentation(prev, index, patch),
        );
        return;
      case "free-gift":
        setFreeGiftRules((prev) =>
          updateFreeGiftRulePresentation(prev, index, patch),
        );
        return;
      case "quantity-breaks-different":
        setDifferentProductsDiscountRules((prev) =>
          updateDifferentProductsRulePresentation(prev, index, patch),
        );
        return;
      case "complete-bundle":
        setCompleteBundleBars((prev) =>
          updateCompleteBundleBarPresentation(prev, id, patch),
        );
        return;
      default:
        return;
    }
  };
  const updateUnifiedRuleValues = (
    id: string,
    patch: UnifiedRuleValuePatch,
  ) => {
    const compositionRule = compositionRulesSnapshot.find((rule) => rule.id === id);
    if (compositionRule) {
      switch (compositionRule.sourceOfferType) {
        case "quantity-breaks-same":
          setDiscountRules((prev) => updateUnifiedDiscountRuleValues(prev, id, patch));
          return;
        case "bxgy":
          setBxgyDiscountRules((prev) => updateBxgyRuleValues(prev, id, patch));
          return;
        case "free-gift":
          setFreeGiftRules((prev) => updateFreeGiftRuleValues(prev, id, patch));
          return;
        case "quantity-breaks-different":
          setDifferentProductsDiscountRules((prev) =>
            updateDifferentProductsRuleValues(prev, id, patch),
          );
          return;
        case "complete-bundle":
          setCompleteBundleBars((prev) =>
            updateCompleteBundleRuleValues(prev, id, patch),
          );
          return;
        default:
          break;
      }
    }

    switch (offerType) {
      case "quantity-breaks-same":
        setDiscountRules((prev) => updateUnifiedDiscountRuleValues(prev, id, patch));
        return;
      case "bxgy":
        setBxgyDiscountRules((prev) => updateBxgyRuleValues(prev, id, patch));
        return;
      case "free-gift":
        setFreeGiftRules((prev) => updateFreeGiftRuleValues(prev, id, patch));
        return;
      case "quantity-breaks-different":
        setDifferentProductsDiscountRules((prev) =>
          updateDifferentProductsRuleValues(prev, id, patch),
        );
        return;
      case "complete-bundle":
        setCompleteBundleBars((prev) =>
          updateCompleteBundleRuleValues(prev, id, patch),
        );
        return;
      default:
        return;
    }
  };
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
    clearCompleteBundleBars,
    updateCompleteBundleBar,
    handleSelectProductsForBundleBar,
    appendProductsToBundleBar,
    setProductBundleEnabled,
    setProductBundleTitle,
    setProductBundleSubtitle,
    setProductBundleMinQuantity,
    setCheckboxUpsellsEnabled,
    setCheckboxUpsellsTitle,
    setCheckboxUpsellsSubtitle,
    setCheckboxUpsellsDefaultChecked,
    setStickyAddToCartEnabled,
    setStickyAddToCartTitle,
    setStickyAddToCartSubtitle,
    setStickyAddToCartButtonText,
    setSubscriptionEnabled,
    setSubscriptionTitle,
    setSubscriptionSubtitle,
    setOneTimeTitle,
    setOneTimeSubtitle,
    setSubscriptionPosition,
    setSubscriptionDefaultSelected,
    setFreeGiftTriggerProducts,
    setFreeGiftRules,
    selectFreeGiftRewardProducts,
    setProgressiveGifts,
    updateUnifiedRulePresentation,
    updateUnifiedRuleValues,
  };
  const countdownPreviewText = useMemo(() => {
    if (!showCountdownBlock || !endTime || !dayjs(endTime).isValid()) {
      return "";
    }
    return `${countdownLabel || "Limited time offer"} • Ends ${dayjs(endTime)
      .tz(scheduleTimezone)
      .format("YYYY-MM-DD HH:mm")}`;
  }, [countdownLabel, endTime, scheduleTimezone, showCountdownBlock]);
  const completeBundlePreviewFallbackItems = useMemo(() => {
    const source =
      starterTemplateDefaults?.previewFallbackItems?.length
        ? starterTemplateDefaults.previewFallbackItems
        : COMPLETE_BUNDLE_TEMPLATE_PREVIEW_ITEMS;
    const starterBar = completeBundleBars[0];
    return source.map((item, index, items) => {
      const shouldMirrorBundleCard =
        item.id === "starter-complete-bundle-offer" ||
        (index === items.length - 1 && item.featured);
      if (!shouldMirrorBundleCard) return item;
      return {
        ...item,
        id: starterBar?.id || item.id,
        title: starterBar?.title || item.title,
        subtitle: starterBar?.subtitle || item.subtitle,
      };
    });
  }, [starterTemplateDefaults, completeBundleBars]);
  const previewItems: PreviewItem[] = useMemo(() => {
    if (offerType === "complete-bundle") {
      const hasConfiguredProducts = completeBundleBars.some(
        (bar) => Array.isArray(bar.products) && bar.products.length > 0,
      );
      if (!hasConfiguredProducts) {
        return completeBundlePreviewFallbackItems;
      }
    }

    const previewSelectedProducts = selectedProductsData.map((product) => ({
      id: product.id,
      title: product.title,
      image: product.image,
    }));

    const hasMixedCompositionSources = new Set(
      orderedCompositionRulesSnapshot.map((rule) => rule.sourceOfferType),
    ).size > 1;

    const computedItems = hasMixedCompositionSources
      ? buildCompositionPreviewItems({
          rules: orderedCompositionRulesSnapshot,
          selectedProducts: previewSelectedProducts,
          completeBundleBars,
          baseUnitPrice,
          formatPrice: formatPreviewPrice,
        })
      : buildUnifiedPreviewItems({
          offerType,
          rules: orderedCompositionRulesSnapshot,
          selectedProducts: previewSelectedProducts,
          completeBundleBars,
          baseUnitPrice,
          formatPrice: formatPreviewPrice,
        });
    if (offerType === "complete-bundle" && computedItems.length === 0) {
      return completeBundlePreviewFallbackItems;
    }
    return computedItems;
  }, [
    offerType,
    orderedCompositionRulesSnapshot,
    completeBundleBars,
    selectedProductsData,
    baseUnitPrice,
    formatPreviewPrice,
    completeBundlePreviewFallbackItems,
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

  const displayCustomizerCommonProps = {
    widgetTitle,
    setWidgetTitle,
    layoutFormat,
    setLayoutFormat,
    cardBackgroundColor,
    setCardBackgroundColor,
    accentColor,
    setAccentColor,
    borderColor,
    setBorderColor,
    labelColor,
    setLabelColor,
    titleFontSize,
    setTitleFontSize,
    titleFontWeight,
    setTitleFontWeight,
    titleColor,
    setTitleColor,
    showCustomButton,
    setShowCustomButton,
    buttonText,
    setButtonText,
    buttonPrimaryColor,
    setButtonPrimaryColor,
  };
  const unifiedDisplayItems = useMemo(
    () => buildUnifiedDisplayCustomizerItems(activeDisplayRules),
    [activeDisplayRules],
  );
  const subscriptionDisplayItems = useMemo(
    () =>
      buildSubscriptionDisplayCustomizerItems({
        subscriptionTitle,
        subscriptionSubtitle,
        subscriptionDefaultSelected,
        oneTimeTitle,
        oneTimeSubtitle,
      }),
    [
      subscriptionTitle,
      subscriptionSubtitle,
      subscriptionDefaultSelected,
      oneTimeTitle,
      oneTimeSubtitle,
    ],
  );


  const progressiveGiftDisplaySections =
    progressiveGifts.enabled && offerType !== "complete-bundle"
      ? [
          {
            id: "progressive-gifts",
            title: "Progressive Gifts",
            content: (
              <ProgressiveGiftsSection
                offerType={offerType}
                normalizedDiscountRules={normalizedDiscountRules}
                bxgyDiscountRules={bxgyDiscountRules}
                differentProductsDiscountRules={differentProductsDiscountRules}
                value={progressiveGifts}
                onChange={setProgressiveGifts}
                showToggle={false}
                embedded
              />
            ),
          },
        ]
      : [];
  const renderDisplayCustomizer = () => {

    if (offerType === "quantity-breaks-same") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Tier Components"
          extraSections={progressiveGiftDisplaySections}
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (offerType === "bxgy") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="BXGY Components"
          extraSections={progressiveGiftDisplaySections}
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (offerType === "free-gift") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Free Gift Components"
          extraSections={progressiveGiftDisplaySections}
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (offerType === "quantity-breaks-different") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Cross-product Components"
          extraSections={progressiveGiftDisplaySections}
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (offerType === "complete-bundle") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Bundle Components"
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (offerType === "subscription") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Subscription Components"
          extraSections={progressiveGiftDisplaySections}
          items={subscriptionDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    return null;
  };

  const displayComponentCount =
    offerType === "subscription"
      ? subscriptionDisplayItems.length
      : unifiedDisplayItems.length;
  const displayStepMeta = [
    `${displayComponentCount} components`,
    showCountdownBlock ? "Countdown enabled" : null,
    progressiveGifts.enabled && offerType !== "complete-bundle"
      ? "Progressive gifts"
      : null,
  ]
    .filter(Boolean)
    .join(" • ");
  const targetingStepMeta = [
    normalizedMarkets.includes("all")
      ? "All markets"
      : normalizedMarkets.length > 0
        ? `${normalizedMarkets.length} markets`
        : "No markets",
    normalizedCustomerSegments.includes("all")
      ? "All customers"
      : normalizedCustomerSegments.length > 0
        ? `${normalizedCustomerSegments.length} segments`
        : "No segment filter",
    normalizedCustomerProfileFilters.length > 0 || normalizedIpCountryCodes.length > 0
      ? `${normalizedCustomerProfileFilters.length + normalizedIpCountryCodes.length} extra filters`
      : null,
    endTime ? "Scheduled end date" : startTime ? "Long-term" : "No schedule",
  ]
    .filter(Boolean)
    .join(" • ");
  const previewPanelMeta =
    offerType === "complete-bundle" ? "Bundle preview" : "Storefront preview";
  const progressiveGiftPreviewControls =
    progressiveGifts.enabled && offerType !== "complete-bundle" ? (
      <div className="mb-4 rounded-[10px] bg-[#f6f8f9] px-4 py-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[13px] font-medium text-[#1c1f23]">
            Progressive gifts preview
          </div>
          <div className="text-[12px] text-[#5c6166]">Simulation</div>
        </div>
        <div className="grid grid-cols-1 gap-3">
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
    ) : null;

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

        const finalScopeLogicError =
          validateFinalSubmitScopeAndLogic(campaignDraft);
        if (finalScopeLogicError) {
          e.preventDefault();
          openBuilderValidationModal(finalScopeLogicError);
          setStep(2);
          return;
        }
        const moduleBlockingMessage = getModuleBlockingMessage();
        if (moduleBlockingMessage) {
          e.preventDefault();
          openBuilderValidationModal(moduleBlockingMessage);
          setStep(2);
          return;
        }
        const unifiedRuleBlockingMessage = hasMixedCompositionSources
          ? getUnifiedRuleBlockingMessageForRules(
              campaignDraft,
              compositionRulesSnapshot,
            )
          : getUnifiedRuleBlockingMessage(campaignDraft);
        if (unifiedRuleBlockingMessage) {
          e.preventDefault();
          openBuilderValidationModal(unifiedRuleBlockingMessage);
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
        if (!validateTargetingInputs()) {
          hasError = true;
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
          openHighDiscountWarning(() => {
            confirmedHighDiscountRef.current = true;
            // form elements trigger re-submit
            e.target.requestSubmit();
          });
          return;
        }
      }}
    >
      <Modal
        open={collectionSelectionModalOpen}
        title="Select collections"
        okText="Continue to product picker"
        cancelText="Cancel"
        onCancel={() => {
          setCollectionSelectionModalOpen(false);
          setPendingCollectionIds([]);
        }}
        onOk={confirmTriggerProductsByCollection}
      >
        <div className="space-y-3">
          <div className="text-[13px] text-[#5c6166]">
            Choose one or more collections first. The next step opens Shopify&apos;s native
            product picker with those collection products preselected so you can confirm the final
            discount scope.
          </div>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Collections
            <Select
              mode="multiple"
              size="large"
              className="mt-1 w-full"
              value={pendingCollectionIds}
              options={collectionOptions}
              placeholder="Select collections"
              allowClear
              onChange={(values) => setPendingCollectionIds(values)}
            />
          </label>
        </div>
      </Modal>
      {submitErrorToast && (
        <FloatingFeedbackBanner
          title="Save failed"
          message={submitErrorToast}
        />
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
      {normalizedCustomerSegments.map((segment) => (
        <input key={segment} type="hidden" name="customerSegments" value={segment} />
      ))}
      {normalizedCustomerProfileFilters.map((filter) => (
        <input key={filter} type="hidden" name="customerProfileFilters" value={filter} />
      ))}
      {normalizedIpCountryCodes.map((countryCode) => (
        <input key={countryCode} type="hidden" name="ipCountryCodes" value={countryCode} />
      ))}
      {normalizedMarkets.map((market) => (
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
                <PreviewShell meta={previewPanelMeta}>
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
                    checkboxUpsellPreview={checkboxUpsellPreview}
                    stickyAddToCartPreview={stickyAddToCartPreview}
                  />
                </PreviewShell>
              </div>
            </div>
          )}

          {step === 2 && (
            <>
              <BuilderStepIntro title="Scope & Logic" />

              <StepTwoCompositionBuilder
                draft={campaignDraft}
                actions={campaignDraftActions}
                totalStoreProductsCount={allStoreProductIds.length}
                activeTriggerSelectionMode={triggerSelectionMode}
                activeTriggerSelectionSummary={triggerSelectionSummary}
                onSelectAllTriggerProducts={handleSelectAllTriggerProducts}
                onSelectTriggerProductsByCollection={handleSelectTriggerProductsByCollection}
                onExcludeTriggerProducts={() => void handleExcludeTriggerProducts()}
                onCustomFilterTriggerProducts={() => void handleCustomFilterTriggerProducts()}
                bars={orderedCompositionBars}
                modules={compositionModules}
                showCountdownBlock={showCountdownBlock}
                setShowCountdownBlock={setShowCountdownBlock}
                countdownLabel={countdownLabel}
                setCountdownLabel={setCountdownLabel}
                onMoveBarUp={(barId) =>
                  setCompositionBarOrder((prev) => {
                    const index = prev.indexOf(barId);
                    if (index <= 0) return prev;
                    const next = [...prev];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    return next;
                  })
                }
                onMoveBarDown={(barId) =>
                  setCompositionBarOrder((prev) => {
                    const index = prev.indexOf(barId);
                    if (index < 0 || index >= prev.length - 1) return prev;
                    const next = [...prev];
                    [next[index], next[index + 1]] = [next[index + 1], next[index]];
                    return next;
                  })
                }
                renderCompleteBundleProductPricingCard={
                  renderCompleteBundleProductPricingCard
                }
                preview={
                  <PreviewShell meta={previewPanelMeta}>
                    {progressiveGiftPreviewControls}
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
                      checkboxUpsellPreview={checkboxUpsellPreview}
                      stickyAddToCartPreview={stickyAddToCartPreview}
                      subscriptionExplanationTitle={subscriptionExplanationTitle}
                      subscriptionExplanationBody={subscriptionExplanationBody}
                    />
                  </PreviewShell>
                }
              />
            </>
          )}

          {step === 3 && (
            <div className="create-offer-style-grid">
              <div>
                <BuilderStepIntro
                  title="Display"
                  meta={displayStepMeta}
                />

                {renderDisplayCustomizer()}
              </div>

              <div className="create-offer-sticky-preview">
                <PreviewShell meta={previewPanelMeta}>
                  {showCountdownBlock && countdownPreviewText ? (
                    <div className="mb-4 rounded-[10px] bg-[#fff7e6] px-3 py-2 text-[12px] text-[#ad6800]">
                      {countdownPreviewText}
                    </div>
                  ) : null}
                  {progressiveGiftPreviewControls}
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
                    checkboxUpsellPreview={checkboxUpsellPreview}
                    stickyAddToCartPreview={stickyAddToCartPreview}
                    showSubscriptionExplanation={shouldShowSubscriptionExplanation}
                    subscriptionExplanationTitle={subscriptionExplanationTitle}
                    subscriptionExplanationBody={subscriptionExplanationBody}
                  />
                </PreviewShell>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <BuilderStepIntro
                title="Targeting"
                meta={targetingStepMeta}
              />
              <ScheduleTargetingEditor
                markets={markets}
                setMarkets={setMarkets}
                customerSegments={customerSegments}
                setCustomerSegments={setCustomerSegments}
                customerProfileFilters={customerProfileFilters}
                setCustomerProfileFilters={setCustomerProfileFilters}
                ipCountryCodes={ipCountryCodes}
                setIpCountryCodes={setIpCountryCodes}
                marketsError={marketsError}
                ipCountryCodesError={ipCountryCodesError}
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
              <div className="mb-8 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="m-0 text-[14px] font-medium text-[#1c1f23]">
                    Campaign Status
                  </h3>
                  <div className="text-[12px] text-[#5c6166]">
                    {status ? "Active after save" : "Draft after save"}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-[12px] border border-[#e3e8ed] bg-white p-4">
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      Activate after save
                    </div>
                    <div className="mt-1 text-[12px] text-[#5c6166]">
                      Disable this if you want to finish setup before showing the offer.
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
              const moduleBlockingMessage = getModuleBlockingMessage();
              if (moduleBlockingMessage) {
                message.error(moduleBlockingMessage);
                e.preventDefault();
                return;
              }
              const unifiedRuleBlockingMessage = hasMixedCompositionSources
                ? getUnifiedRuleBlockingMessageForRules(
                    campaignDraft,
                    compositionRulesSnapshot,
                  )
                : getUnifiedRuleBlockingMessage(campaignDraft);
              if (unifiedRuleBlockingMessage) {
                message.error(unifiedRuleBlockingMessage);
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
              if (!validateTargetingInputs()) {
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
