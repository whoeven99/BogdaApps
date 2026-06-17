import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import { useFetcher, useNavigate, useSearchParams } from "react-router";
import { Button, Input, Select, Switch, Modal, message } from "antd";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

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
  getStarterTemplateDefaults,
} from "./starterTemplateDefaults";
import {
  OFFER_TEXT_LIMITS,
  buildOfferSettingsJsonFromCampaignConfig,
  buildDifferentProductsDiscountRulesJson,
  compileCampaignRuntimeOutputs,
  getInvalidIpCountryCodes,
  migrateLegacyOfferToCampaignConfig,
  normalizeCustomerProfileFilters,
  normalizeCustomerSegments,
  normalizeDraftIpCountryCodes,
  normalizeDiscountRules,
  normalizeDifferentProductsDiscountRules,
  normalizeBxgyRules,
  normalizeFreeGiftRules,
  normalizeIpCountryCodes,
  normalizeTargetMarkets,
  normalizeOfferNameKey,
  normalizeOfferEndTimeForUi,
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
  createDefaultCompleteBundleSingleBar,
  isCompleteBundleSingleBar,
  normalizeCompleteBundleBars,
  type CompleteBundleBar,
  type CompleteBundleProduct,
  type CompleteBundlePricingMode,
  type CampaignConfig,
  type DifferentProductsDiscountRule,
  type FreeGiftRule,
} from "../../../utils/offerParsing";
import { type OfferTypeId } from "./offerTypeOptions";
import { resolveBuilderBxgyDisplay } from "./bxgyDisplayResolver";
import {
  adaptBxgyRules,
  adaptCompleteBundleBars,
  adaptDifferentProductsRules,
  adaptDiscountRules,
  adaptFreeGiftRules,
  adaptSubscriptionRule,
} from "./unifiedRulesAdapters";
import type { UnifiedRuleNode } from "./unifiedRulesSchema";
import { buildUnifiedDisplayCustomizerItems } from "./unifiedRulesDisplay";
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
  getUnifiedRuleAuditIssues,
  getUnifiedRuleAuditIssuesForRules,
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

function normalizeBuilderCampaignConfig(
  config: CampaignConfig | null,
): CampaignConfig | null {
  if (!config) return null;
  const fallbackConfig = migrateLegacyOfferToCampaignConfig({});

  return {
    ...config,
    scope:
      config.scope && typeof config.scope === "object"
        ? config.scope
        : fallbackConfig.scope,
    logicBlocks: Array.isArray(config.logicBlocks) ? config.logicBlocks : [],
    displayBlocks: Array.isArray(config.displayBlocks) ? config.displayBlocks : [],
    settings:
      config.settings && typeof config.settings === "object"
        ? config.settings
        : fallbackConfig.settings,
  };
}

type CampaignModuleDescriptor = {
  logicBlockId: string;
  logicBlock: CampaignConfig["logicBlocks"][number];
  rules: UnifiedRuleNode[];
  scopeIds: string[];
  includeAsAdditional: boolean;
};

const FIXED_ONE_TIME_TITLE = "One-time purchase";
const FIXED_ONE_TIME_SUBTITLE = "Uses the current product price";
const FIXED_SUBSCRIPTION_POSITION = "below-bundle-bars" as const;
const FIXED_SUBSCRIPTION_DEFAULT_SELECTED = false;

function buildCampaignModuleDescriptors(params: {
  behaviorOfferType: Exclude<OfferTypeId, "progressive-gifts">;
  selectedScopeProductIds: string[];
  differentProductsSharedPoolProductIds: string[];
  discountRules: DiscountRule[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  bxgyDiscountRules: BxgyDiscountRule[];
  buyProducts: string[];
  freeGiftRules: FreeGiftRule[];
  freeGiftTriggerProducts: string[];
  freeGiftSharedGiftProductIds: string[];
  aggregatedFreeGiftRewardProductIds: string[];
  completeBundleBars: CompleteBundleBar[];
  subscriptionEnabled: boolean;
  subscriptionTitle: string;
  subscriptionSubtitle: string;
}): Record<OfferTypeId, CampaignModuleDescriptor> {
  const {
    behaviorOfferType,
    selectedScopeProductIds,
    differentProductsSharedPoolProductIds,
    discountRules,
    differentProductsDiscountRules,
    bxgyDiscountRules,
    buyProducts,
    freeGiftRules,
    freeGiftTriggerProducts,
    freeGiftSharedGiftProductIds,
    aggregatedFreeGiftRewardProductIds,
    completeBundleBars,
    subscriptionEnabled,
    subscriptionTitle,
    subscriptionSubtitle,
  } = params;

  const sharedQuantityBreakOfferType: OfferTypeId =
    behaviorOfferType === "quantity-breaks-same" ||
    behaviorOfferType === "shipping-discount" ||
    behaviorOfferType === "order-discount" ||
    behaviorOfferType === "coupon"
      ? behaviorOfferType
      : "quantity-breaks-same";

  const quantityBreaksLogicBlock: CampaignConfig["logicBlocks"][number] = {
    id: "logic-quantity-breaks",
    type: "quantity-breaks",
    config: {
      tiers: discountRules.map((rule) => ({
        id: rule.id || "",
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
        rewardProductIds: Array.isArray(rule.rewardProductIds) ? rule.rewardProductIds : [],
        giftQuantity: rule.giftQuantity,
        logicType: rule.logicType === "bxgy" ? "bxgy" : "standard",
        buyQuantity: rule.buyQuantity,
        getQuantity: rule.getQuantity,
        maxUsesPerOrder: rule.maxUsesPerOrder,
      })),
    },
  };
  const differentProductsScopeProductIds =
    differentProductsSharedPoolProductIds.length > 0
      ? Array.from(new Set(differentProductsSharedPoolProductIds))
      : selectedScopeProductIds;
  const differentProductsRulesPayload = buildDifferentProductsDiscountRulesJson(
    differentProductsDiscountRules,
  ).map((rule) => ({
    ...rule,
    buyProductIds: differentProductsScopeProductIds,
    getProductIds: rule.tierType === "bxgy" ? differentProductsScopeProductIds : [],
  }));
  const differentProductsLogicBlock: CampaignConfig["logicBlocks"][number] = {
    id: "logic-quantity-breaks-different",
    type: "quantity-breaks-different",
    config: {
      tiers: differentProductsRulesPayload,
    },
  };
  const bxgyRulesPayload = buildBxgyDiscountRulesJson(bxgyDiscountRules);
  const bxgyPoolIds = Array.from(new Set(buyProducts));
  const bxgyLogicBlock: CampaignConfig["logicBlocks"][number] = {
    id: "logic-bxgy",
    type: "bxgy",
    config: {
      tiers: bxgyRulesPayload,
    },
  };
  const freeGiftRulesPayload = buildFreeGiftRulesJson(freeGiftRules);
  const freeGiftLogicBlock: CampaignConfig["logicBlocks"][number] = {
    id: "logic-free-gift",
    type: "free-gift",
    config: {
      triggerProductIds: freeGiftTriggerProducts,
      giftProductIds: freeGiftSharedGiftProductIds,
      tiers: freeGiftRulesPayload,
    },
  };
  const completeBundleConfig = buildCompleteBundleConfig({
    triggerProductIds: selectedScopeProductIds,
    bars: completeBundleBars,
  });
  const completeBundleLogicBlock: CampaignConfig["logicBlocks"][number] = {
    id: "logic-complete-bundle",
    type: "complete-bundle",
    config: completeBundleConfig,
  };
  const subscriptionLogicBlock: CampaignConfig["logicBlocks"][number] = {
    id: "logic-subscription",
    type: "subscription",
    config: {
      enabled: subscriptionEnabled,
      position: FIXED_SUBSCRIPTION_POSITION,
      title: subscriptionTitle,
      subtitle: subscriptionSubtitle,
      oneTimeTitle: FIXED_ONE_TIME_TITLE,
      oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
      defaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
      productIds: selectedScopeProductIds,
    },
  };

  const sharedQuantityBreakRules = adaptDiscountRules(
    sharedQuantityBreakOfferType,
    discountRules,
  );
  const differentProductsRules = adaptDifferentProductsRules(
    differentProductsRulesPayload,
    differentProductsScopeProductIds,
  );
  const bxgyRules = adaptBxgyRules(bxgyRulesPayload, bxgyPoolIds, bxgyPoolIds);
  const freeGiftRulesSnapshot = adaptFreeGiftRules(
    freeGiftRulesPayload,
    freeGiftTriggerProducts,
    Array.from(
      new Set([
        ...freeGiftSharedGiftProductIds,
        ...aggregatedFreeGiftRewardProductIds,
      ]),
    ),
  );
  const completeBundleRules = adaptCompleteBundleBars(completeBundleConfig.bars);
  const subscriptionRules = adaptSubscriptionRule(
    selectedScopeProductIds,
    subscriptionEnabled,
  );

  return {
    "quantity-breaks-same": {
      logicBlockId: "logic-quantity-breaks",
      logicBlock: quantityBreaksLogicBlock,
      rules: sharedQuantityBreakRules,
      scopeIds: selectedScopeProductIds,
      includeAsAdditional:
        behaviorOfferType === "subscription" && sharedQuantityBreakRules.length > 0,
    },
    "progressive-gifts": {
      logicBlockId: "logic-quantity-breaks",
      logicBlock: quantityBreaksLogicBlock,
      rules: sharedQuantityBreakRules,
      scopeIds: selectedScopeProductIds,
      includeAsAdditional: false,
    },
    "shipping-discount": {
      logicBlockId: "logic-quantity-breaks",
      logicBlock: quantityBreaksLogicBlock,
      rules: sharedQuantityBreakRules,
      scopeIds: selectedScopeProductIds,
      includeAsAdditional: false,
    },
    "order-discount": {
      logicBlockId: "logic-quantity-breaks",
      logicBlock: quantityBreaksLogicBlock,
      rules: sharedQuantityBreakRules,
      scopeIds: selectedScopeProductIds,
      includeAsAdditional: false,
    },
    coupon: {
      logicBlockId: "logic-quantity-breaks",
      logicBlock: quantityBreaksLogicBlock,
      rules: sharedQuantityBreakRules,
      scopeIds: selectedScopeProductIds,
      includeAsAdditional: false,
    },
    "quantity-breaks-different": {
      logicBlockId: "logic-quantity-breaks-different",
      logicBlock: differentProductsLogicBlock,
      rules: differentProductsRules,
      scopeIds: differentProductsScopeProductIds,
      includeAsAdditional: differentProductsRules.length > 0,
    },
    bxgy: {
      logicBlockId: "logic-bxgy",
      logicBlock: bxgyLogicBlock,
      rules: bxgyRules,
      scopeIds: bxgyPoolIds,
      includeAsAdditional: bxgyRules.length > 0,
    },
    "free-gift": {
      logicBlockId: "logic-free-gift",
      logicBlock: freeGiftLogicBlock,
      rules: freeGiftRulesSnapshot,
      scopeIds: Array.from(
        new Set([
          ...freeGiftTriggerProducts,
          ...aggregatedFreeGiftRewardProductIds,
        ]),
      ),
      includeAsAdditional: freeGiftRulesSnapshot.length > 0,
    },
    "complete-bundle": {
      logicBlockId: "logic-complete-bundle",
      logicBlock: completeBundleLogicBlock,
      rules: completeBundleRules,
      scopeIds: Array.from(
        new Set([
          ...selectedScopeProductIds,
          ...completeBundleConfig.bars.flatMap((bar) =>
            bar.products.map((product) => String(product.productId)),
          ),
        ]),
      ),
      includeAsAdditional: completeBundleConfig.bars.some(
        (bar) => !isCompleteBundleSingleBar(bar),
      ),
    },
    subscription: {
      logicBlockId: "logic-subscription",
      logicBlock: subscriptionLogicBlock,
      rules: subscriptionRules,
      scopeIds: selectedScopeProductIds,
      includeAsAdditional: subscriptionEnabled,
    },
  };
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
  tierType?: "single" | "standard";
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
  tierType?: "single" | "bxgy" | "simple";
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
  selectionMode?: "product" | "variant";
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
  startTime: string | Date;
  endTime: string | Date;
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
  onSaveSuccess?: (mode: "create" | "update", toast?: string | null) => void;
  initialOffer?: InitialOffer;
  initialOfferType?: OfferTypeId;
  storeProducts?: Product[];
  /** collection 下拉选项（按需化后不再从全量商品派生） */
  storeCollections?: Array<{ id: string; title: string }>;
  /** 店铺商品总数，用于「是否已选全店」判定 */
  totalStoreProductCount?: number;
  /** 展开所选 collection → 商品 id（服务端按需查询） */
  onExpandCollections?: (collectionIds: string[]) => Promise<string[]>;
  /** select-all / invert / exclude 时按需加载全量轻量商品 */
  onLoadAllProducts?: () => Promise<Product[]>;
  markets?: MarketItem[];
  /** 当前店铺已有 offers，用于名称重复校验（与后台 normalize 规则一致） */
  existingOffers?: Array<{ id: string; name: string }>;
  ianaTimezone?: string;
}

type SubscriptionPreviewPlan = {
  sellingPlanId: string;
  sellingPlanName: string;
  billingLabel: string;
  subscriptionPrice: number;
  compareAtPrice: number;
  savingsAmount: number;
  savingsPercent: number;
};

type SubscriptionPreviewSnapshot = {
  productId: string;
  plans: SubscriptionPreviewPlan[];
};

type CollectionOption = {
  label: string;
  value: string;
};

type TriggerSelectionMode = "all" | "collection" | "exclude" | "custom" | "inverse" | null;
type TriggerSelectionMeta =
  | {
      mode: Exclude<TriggerSelectionMode, null>;
      collectionIds?: string[];
    }
  | null;

type InitialEditorState = {
  selectedProductsData: Array<{
    id: string;
    title: string;
    image: string;
    price: string;
    variantsCount: number;
    hasSubscription: boolean;
  }>;
  differentProductsSharedPoolProductsData: CampaignDraft["selectedProductsData"];
  discountRules: DiscountRule[];
  bxgyDiscountRules: BxgyDiscountRule[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  freeGiftRules: FreeGiftRule[];
  freeGiftSharedGiftProductIds: string[];
  buyProducts: string[];
  freeGiftTriggerProducts: string[];
};

function buildTriggerSelectionSummary(params: {
  selection: TriggerSelectionMeta;
  selectedCount: number;
  totalStoreProductsCount: number;
  collectionOptions: CollectionOption[];
}) {
  const {
    selection,
    selectedCount,
    totalStoreProductsCount,
    collectionOptions,
  } = params;

  if (!selection) return "";

  if (selection.mode === "all") {
    return `All products selected (${selectedCount})`;
  }

  if (selection.mode === "exclude") {
    const excludedCount = Math.max(0, totalStoreProductsCount - selectedCount);
    return totalStoreProductsCount > 0
      ? `All products minus ${excludedCount} exclusion${excludedCount === 1 ? "" : "s"}`
      : `Exclude mode (${selectedCount} selected)`;
  }

  if (selection.mode === "collection") {
    const selectedLabels = collectionOptions
      .filter((option) => selection.collectionIds?.includes(option.value))
      .map((option) => option.label);
    if (selectedLabels.length === 0) {
      return `Collection selection (${selectedCount} products)`;
    }
    const visibleLabels = selectedLabels.slice(0, 2).join(", ");
    return selectedLabels.length > 2
      ? `Collection selection: ${visibleLabels} +${selectedLabels.length - 2} more`
      : `Collection selection: ${visibleLabels}`;
  }

  if (selection.mode === "inverse") {
    return `Inverse selection (${selectedCount} product${selectedCount === 1 ? "" : "s"})`;
  }

  return `Custom picker selection (${selectedCount})`;
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

const SHOPIFY_PRODUCT_GID_PREFIX = "gid://shopify/Product/";

function getShopifyProductLookupKeys(productId: string | null | undefined): string[] {
  const raw = String(productId || "").trim();
  if (!raw) return [];
  const numericTailMatch = raw.match(/(\d+)\s*$/);
  const numericTail = numericTailMatch?.[1] || "";
  return Array.from(
    new Set(
      [raw, numericTail, numericTail ? `${SHOPIFY_PRODUCT_GID_PREFIX}${numericTail}` : ""].filter(
        Boolean,
      ),
    ),
  );
}

function toShopifyProductGid(productId: string | null | undefined): string {
  const raw = String(productId || "").trim();
  if (!raw) return "";
  if (raw.startsWith(SHOPIFY_PRODUCT_GID_PREFIX)) return raw;
  const numericTailMatch = raw.match(/(\d+)\s*$/);
  return numericTailMatch?.[1] ? `${SHOPIFY_PRODUCT_GID_PREFIX}${numericTailMatch[1]}` : raw;
}

function getDefaultCartTitleForOfferType(offerType?: string | null): string {
  return offerType === "quantity-breaks-different" ? "多件优惠" : "组合优惠";
}

function normalizeInitialCartTitle(rawTitle: string | null | undefined, offerType?: string | null): string {
  const title = String(rawTitle || "").trim();
  if (title && title !== "Bundle Discount") return title;
  return getDefaultCartTitleForOfferType(offerType);
}

export function CreateNewOffer({
  onBack,
  onSaveSuccess,
  initialOffer,
  initialOfferType,
  storeProducts = [],
  storeCollections = [],
  totalStoreProductCount = 0,
  onExpandCollections,
  onLoadAllProducts,
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
      previewPlans?: SubscriptionPreviewPlan[] | null;
    };
  }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [submitErrorToast, setSubmitErrorToast] = useState<string | null>(null);
  const wasSubmittingRef = useRef(false);
  const handledSubmissionToastRef = useRef<string | null>(null);
  const confirmedHighDiscountRef = useRef(false);
  const initialCampaignConfig = useMemo(() => {
    if (!initialOffer) return null;
    return normalizeBuilderCampaignConfig(
      parseCampaignConfig(initialOffer.campaignConfigJson) ??
        migrateLegacyOfferToCampaignConfig({
          offerType: initialOffer.offerType,
          selectedProductsJson: initialOffer.selectedProductsJson,
          discountRulesJson: initialOffer.discountRulesJson,
          offerSettingsJson: initialOffer.offerSettingsJson,
          startTime: initialOffer.startTime,
          endTime: initialOffer.endTime,
          status: initialOffer.status,
        }),
    );
  }, [initialOffer]);
  const initialCountdownBlock = useMemo(() => {
    const displayBlocks = Array.isArray(initialCampaignConfig?.displayBlocks)
      ? initialCampaignConfig.displayBlocks
      : [];
    return (
      displayBlocks.find(
        (block) => block.type === "countdown",
      ) ?? null
    );
  }, [initialCampaignConfig]);
  const initialCampaignRuntimeOutputs = useMemo(
    () =>
      initialCampaignConfig
        ? compileCampaignRuntimeOutputs(initialCampaignConfig)
        : null,
    [initialCampaignConfig],
  );
  const initialProgressiveGiftsEnabled = useMemo(() => {
    const offerSettingsJson = initialCampaignConfig
      ? buildOfferSettingsJsonFromCampaignConfig(
          initialCampaignConfig,
          initialOffer?.offerSettingsJson,
        )
      : initialOffer?.offerSettingsJson;
    return parseOfferSettings(offerSettingsJson).progressiveGifts.enabled;
  }, [initialCampaignConfig, initialOffer?.offerSettingsJson]);
  const initialBuilderOfferType = useMemo(
    () => {
      const inferredPrimary =
        (initialCampaignRuntimeOutputs?.primaryOfferType as OfferTypeId | undefined) ??
        (initialOffer?.offerType as OfferTypeId | undefined);
      if (
        inferredPrimary === "quantity-breaks-same" &&
        initialProgressiveGiftsEnabled
      ) {
        return "progressive-gifts";
      }
      return inferredPrimary;
    },
    [
      initialCampaignRuntimeOutputs?.primaryOfferType,
      initialOffer?.offerType,
      initialProgressiveGiftsEnabled,
    ],
  );
  const initialPrimarySelectedProductsJson = useMemo(() => {
    switch (initialBuilderOfferType) {
      case "bxgy":
        return initialCampaignRuntimeOutputs?.modules.bxgy?.selectedProductsJson ?? null;
      case "free-gift":
        return initialCampaignRuntimeOutputs?.modules.freeGift?.selectedProductsJson ?? null;
      case "quantity-breaks-different":
        return (
          initialCampaignRuntimeOutputs?.modules.quantityBreaksDifferent
            ?.selectedProductsJson ?? null
        );
      case "complete-bundle":
        return initialCampaignRuntimeOutputs?.modules.completeBundle?.selectedProductsJson ?? null;
      case "subscription":
        return initialCampaignRuntimeOutputs?.modules.subscription?.selectedProductsJson ?? null;
      case "progressive-gifts":
      case "quantity-breaks-same":
      case "shipping-discount":
      case "order-discount":
      case "coupon":
      default:
        return initialCampaignRuntimeOutputs?.modules.quantityBreaks?.selectedProductsJson ?? null;
    }
  }, [initialBuilderOfferType, initialCampaignRuntimeOutputs]);
  const initialFreeGiftSelectedProductsJson =
    initialCampaignRuntimeOutputs?.modules.freeGift?.selectedProductsJson ?? null;
  const initialCompleteBundleSelectedProductsJson =
    initialCampaignRuntimeOutputs?.modules.completeBundle?.selectedProductsJson ?? null;
  const starterTemplateDefaults = useMemo(() => {
    if (initialOffer || !initialOfferType) return null;
    return getStarterTemplateDefaults(initialOfferType);
  }, [initialOffer, initialOfferType]);
  const initialEditorState = useMemo<InitialEditorState>(() => {
    const parseSelectedProductObjects = (...jsonValues: Array<string | null | undefined>) => {
      const productObjects: any[] = [];
      for (const jsonValue of jsonValues) {
        if (!jsonValue) continue;
        try {
          const parsedSelectedProducts = JSON.parse(jsonValue);
          const parsedObjects = Array.isArray(parsedSelectedProducts)
            ? parsedSelectedProducts
            : Array.isArray(parsedSelectedProducts?.products)
              ? parsedSelectedProducts.products
              : Array.isArray(parsedSelectedProducts?.selectedProducts)
                ? parsedSelectedProducts.selectedProducts
                : [];
          productObjects.push(...parsedObjects);
        } catch {}
      }
      return productObjects;
    };
    const mapProductIdsToInitialDraftProducts = (
      ids: string[],
      savedProductObjects: any[] = [],
    ) =>
      ids.map((id) => {
        const savedObj = savedProductObjects.find(
          (o) => o && typeof o === "object" && String(o.id) === String(id),
        );
        if (savedObj && savedObj.title) {
          return {
            id: String(id),
            title: String(savedObj.title),
            image: String(savedObj.image || "https://via.placeholder.com/60"),
            price: String(savedObj.price || "€0.00"),
            variantsCount: Math.max(1, Math.trunc(Number(savedObj.variantsCount) || 1)),
            hasSubscription: savedObj.hasSubscription === true,
          };
        }
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

    const selectedProductsJson = initialPrimarySelectedProductsJson;
    const selectedSourceOfferType = initialBuilderOfferType;
    const freeGiftSelectedProducts =
      selectedSourceOfferType === "free-gift"
        ? parseFreeGiftSelectedProducts(selectedProductsJson)
        : { triggerProducts: [], giftProducts: [] };
    const persistedFreeGiftSelectedProducts =
      selectedSourceOfferType === "free-gift"
        ? parseFreeGiftSelectedProducts(initialFreeGiftSelectedProductsJson)
        : { triggerProducts: [], giftProducts: [] };
    const completeBundleSelectedProducts =
      selectedSourceOfferType === "complete-bundle"
        ? parseCompleteBundleConfig(selectedProductsJson)
        : { triggerProductIds: [], bars: [] };
    const parsedBxgyRules = normalizeBxgyRules(
      starterTemplateDefaults?.bxgyDiscountRules ??
        parseBxgyDiscountRules(initialCampaignRuntimeOutputs?.modules.bxgy?.discountRulesJson ?? null),
    );
    const bxgyRuleBuyProducts = Array.from(
      new Set(
        parsedBxgyRules.flatMap((rule) =>
          Array.isArray(rule.buyProductIds) ? rule.buyProductIds.map(String) : [],
        ),
      ),
    );
    const bxgyBuyProducts =
      selectedSourceOfferType === "bxgy"
        ? (() => {
            if (selectedProductsJson) {
              try {
                const parsed = JSON.parse(selectedProductsJson);
                if (Array.isArray(parsed?.buyProducts) && parsed.buyProducts.length > 0) {
                  return parsed.buyProducts.map(String);
                }
              } catch {}
            }
            return bxgyRuleBuyProducts;
          })()
        : [];
    const selectedProductIds =
      selectedSourceOfferType === "free-gift"
        ? freeGiftSelectedProducts.triggerProducts
        : selectedSourceOfferType === "complete-bundle"
          ? completeBundleSelectedProducts.triggerProductIds
        : selectedSourceOfferType === "bxgy"
          ? bxgyBuyProducts
          : selectedProductsJson
            ? parseSelectedProductIds(selectedProductsJson)
            : [];

    const parsedSelectedObjects = parseSelectedProductObjects(
      selectedProductsJson,
      initialOffer?.selectedProductsJson,
    );

    const selectedProductsData = selectedProductIds.map((id: string) => {
      const savedObj = parsedSelectedObjects.find(
        (o) => o && typeof o === "object" && String(o.id) === id,
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

    const differentProductsSelectedProductsJson =
      initialCampaignRuntimeOutputs?.modules.quantityBreaksDifferent?.selectedProductsJson ?? null;
    const differentProductsDiscountRulesJson =
      initialCampaignRuntimeOutputs?.modules.quantityBreaksDifferent?.discountRulesJson ?? null;
    const parsedDifferentProductsRules = parseDifferentProductsDiscountRules(
      differentProductsDiscountRulesJson,
    );
    const differentProductsPoolIds = Array.from(
      new Set(
        parsedDifferentProductsRules.flatMap((rule) =>
          Array.isArray(rule.buyProductIds) ? rule.buyProductIds : [],
        ),
      ),
    );
    const differentProductsSavedObjects = parseSelectedProductObjects(
      differentProductsSelectedProductsJson,
      initialOffer?.selectedProductsJson,
    );
    const differentProductsSharedPoolProductsData = mapProductIdsToInitialDraftProducts(
      differentProductsPoolIds.length > 0
        ? differentProductsPoolIds
        : differentProductsSelectedProductsJson
          ? parseSelectedProductIds(differentProductsSelectedProductsJson)
          : [],
      differentProductsSavedObjects,
    );

    const parsedFreeGiftRules = normalizeFreeGiftRules(
      (
        starterTemplateDefaults?.freeGiftRules ??
        parseFreeGiftRules(initialCampaignRuntimeOutputs?.modules.freeGift?.discountRulesJson ?? null)
      ).map((rule) =>
        rule.tierType === "single"
          ? rule
          : {
              ...rule,
              giftProductIds: Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
            },
      ),
    );
    const freeGiftRuleGiftProductIds = Array.from(
      new Set(
        parsedFreeGiftRules.flatMap((rule) =>
          Array.isArray(rule.giftProductIds) ? rule.giftProductIds.map(String) : [],
        ),
      ),
    );
    const freeGiftSharedGiftProductIds =
      selectedSourceOfferType === "free-gift"
        ? persistedFreeGiftSelectedProducts.giftProducts.length > 0
          ? persistedFreeGiftSelectedProducts.giftProducts
          : freeGiftSelectedProducts.giftProducts.length > 0
            ? freeGiftSelectedProducts.giftProducts
            : freeGiftRuleGiftProductIds
        : [];
    const discountRules =
      selectedSourceOfferType === "subscription"
        ? []
        : normalizeDiscountRules(
            starterTemplateDefaults?.discountRules ??
              parseDiscountRules(
                initialCampaignRuntimeOutputs?.modules.quantityBreaks?.discountRulesJson ??
                  null,
              ),
          );
    const bxgyDiscountRules = parsedBxgyRules;
    const freeGiftRules = parsedFreeGiftRules;
    const differentProductsDiscountRules = normalizeDifferentProductsDiscountRules(
      starterTemplateDefaults?.differentProductsDiscountRules ?? parsedDifferentProductsRules,
    );

    return {
      selectedProductsData,
      differentProductsSharedPoolProductsData,
      discountRules,
      bxgyDiscountRules,
      differentProductsDiscountRules,
      freeGiftRules,
      freeGiftSharedGiftProductIds,
      buyProducts: bxgyBuyProducts,
      freeGiftTriggerProducts:
        selectedSourceOfferType === "free-gift"
          ? persistedFreeGiftSelectedProducts.triggerProducts.length > 0
            ? persistedFreeGiftSelectedProducts.triggerProducts
            : freeGiftSelectedProducts.triggerProducts
          : [],
    };
  }, [
    initialBuilderOfferType,
    initialCampaignRuntimeOutputs,
    initialFreeGiftSelectedProductsJson,
    initialOffer?.selectedProductsJson,
    initialPrimarySelectedProductsJson,
    starterTemplateDefaults,
    storeProducts,
  ]);

  useEffect(() => {
    if (fetcher.state === "submitting") {
      setSubmitErrorToast(null);
      wasSubmittingRef.current = true;
      return;
    }
    if (!wasSubmittingRef.current) return;
    const data = fetcher.data as any;
    if (data?.success && data?.toast) {
      if (handledSubmissionToastRef.current === data.toast) return;
      handledSubmissionToastRef.current = data.toast;
      wasSubmittingRef.current = false;
      const mode = initialOffer ? "update" : "create";
      if (onSaveSuccess) {
        onSaveSuccess(mode, data.toast);
      } else {
        message.success(initialOffer ? "Offer updated successfully" : "Offer created successfully");
        const next = new URLSearchParams(searchParams);
        next.set("toast", data.toast);
        const qs = next.toString();
        navigate({ search: qs ? `?${qs}` : "" }, { replace: true });
      }
      return;
    }
    if (!isOfferActionErrorBody(data)) {
      // 兜底：响应格式不匹配（例如网络错误、非预期重定向等）
      // 必须重置 wasSubmittingRef，否则按钮永远停留在 "Saving…"
      wasSubmittingRef.current = false;
      setSubmitErrorToast(
        typeof data === "string"
          ? data
          : "Something went wrong. Please try again.",
      );
      const next = new URLSearchParams(searchParams);
      next.delete("toast");
      const qs = next.toString();
      navigate({ search: qs ? `?${qs}` : "" }, { replace: true });
      return;
    }
    wasSubmittingRef.current = false;
    setSubmitErrorToast(data.message);
    // 去掉 URL 里的成功 toast，避免保存失败时仍显示绿色「创建/更新成功」
    const next = new URLSearchParams(searchParams);
    next.delete("toast");
    const qs = next.toString();
    navigate({ search: qs ? `?${qs}` : "" }, { replace: true });
  }, [fetcher.state, fetcher.data, initialOffer, navigate, onSaveSuccess, searchParams]);
  const isSubmittingOffer = fetcher.state === "submitting";

  const baseUnitPrice = 100;
  const parsePreviewMoney = (rawValue: string | null | undefined) => {
    const normalized = String(rawValue || "")
      .replace(/[^\d,.-]/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const formatPreviewPrice = (value: number) =>
    `€${value.toFixed(2).replace(".", ",")}`;
  const [step, setStep] = useState(1);
  const [offerType, setOfferType] = useState<OfferTypeId>(
    initialBuilderOfferType ??
      (initialOffer?.offerType as OfferTypeId | undefined) ??
      initialOfferType ??
      "quantity-breaks-same",
  );
  const isProgressiveGiftsTemplate = offerType === "progressive-gifts";
  const behaviorOfferType: Exclude<OfferTypeId, "progressive-gifts"> =
    isProgressiveGiftsTemplate ? "quantity-breaks-same" : offerType;
  const initialCompleteBundleConfig = useMemo(
    () =>
      parseCompleteBundleConfig(initialCompleteBundleSelectedProductsJson),
    [initialCompleteBundleSelectedProductsJson],
  );
  const [offerName, setOfferName] = useState(initialOffer?.name ?? "");
  
  useEffect(() => {
    if (!initialOffer?.name) {
      setOfferName(`#offer ${dayjs().tz(ianaTimezone).format('YYYY-MM-DD HH:mm:ss')}`);
    }
  }, [initialOffer?.name, ianaTimezone]);
  const [cartTitle, setCartTitle] = useState(() =>
    normalizeInitialCartTitle(
      initialOffer?.cartTitle,
      initialBuilderOfferType ??
        (initialOffer?.offerType as OfferTypeId | undefined) ??
        initialOfferType,
    ),
  );
  const [offerNameError, setOfferNameError] = useState("");
  const [cartTitleError, setCartTitleError] = useState("");
  const [startTime, setStartTime] = useState(
    initialCampaignConfig?.settings.startTime
      ? new Date(initialCampaignConfig.settings.startTime).toISOString()
      : initialOffer && initialOffer.startTime
        ? new Date(initialOffer.startTime).toISOString()
      : new Date().toISOString(),
  );
  const initialEndTimeValue = normalizeOfferEndTimeForUi(
    initialCampaignConfig?.settings.endTime || initialOffer?.endTime || "",
  );
  const [endTime, setEndTime] = useState(() => {
    if (!initialEndTimeValue) return "";
    const parsed = new Date(initialEndTimeValue);
    return Number.isNaN(parsed.getTime())
      ? initialEndTimeValue
      : parsed.toISOString();
  });
  const [startTimeError, setStartTimeError] = useState("");
  const [endTimeError, setEndTimeError] = useState("");
  const [marketsError, setMarketsError] = useState("");
  const [ipCountryCodesError, setIpCountryCodesError] = useState("");

  const persistedOfferSettings = useMemo(() => {
    return parseOfferSettings(
      initialCampaignConfig
        ? buildOfferSettingsJsonFromCampaignConfig(
            initialCampaignConfig,
            initialOffer?.offerSettingsJson,
          )
        : initialOffer?.offerSettingsJson,
    );
  }, [initialCampaignConfig, initialOffer?.id, initialOffer?.offerSettingsJson]);
  const offerSettings = starterTemplateDefaults?.offerSettings ?? persistedOfferSettings;

  const [progressiveGifts, setProgressiveGifts] = useState<ProgressiveGiftsConfig>(
    () => offerSettings.progressiveGifts,
  );

  useEffect(() => {
    if (!initialOffer?.id) return;
    setProgressiveGifts(persistedOfferSettings.progressiveGifts);
  }, [initialOffer?.id, persistedOfferSettings.progressiveGifts]);
  useEffect(() => {
    if (offerType === "subscription") {
      setSubscriptionEnabled(true);
    }
    if (isProgressiveGiftsTemplate && !progressiveGifts.enabled) {
      setProgressiveGifts((prev) => ({ ...prev, enabled: true }));
    }
  }, [isProgressiveGiftsTemplate, offerType, progressiveGifts.enabled]);

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
  const [subscriptionTitle, setSubscriptionTitle] = useState(
    offerSettings.subscriptionTitle,
  );
  const [subscriptionSubtitle, setSubscriptionSubtitle] = useState(
    offerSettings.subscriptionSubtitle,
  );
  const [subscriptionPreviewSnapshot, setSubscriptionPreviewSnapshot] =
    useState<SubscriptionPreviewSnapshot | null>(null);
  const effectiveSubscriptionEnabled =
    behaviorOfferType === "subscription" ? true : subscriptionEnabled;
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

    if (behaviorOfferType === "coupon" && couponEnabled && !couponCode.trim()) {
      message.error("Coupon offers require a shared coupon code.");
      hasError = true;
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
  }[]>(() => initialEditorState.selectedProductsData);
  const [differentProductsSharedPoolProductsData, setDifferentProductsSharedPoolProductsData] =
    useState<CampaignDraft["selectedProductsData"]>(
      () => initialEditorState.differentProductsSharedPoolProductsData,
    );

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
  const hydrateDraftProductsFromStore = (
    products: CampaignDraft["selectedProductsData"],
  ): CampaignDraft["selectedProductsData"] =>
    products.map((product) => {
      const found = storeProducts.find((p) => String(p.id) === String(product.id));
      if (!found) return product;
      if (
        product.title !== "Unknown product" &&
        product.image !== "https://via.placeholder.com/60" &&
        product.price !== "€0.00"
      ) {
        return product;
      }
      return {
        ...product,
        title: found.name,
        image: found.image,
        price: found.price,
        variantsCount: Array.isArray(found.variants) ? found.variants.length : product.variantsCount,
        hasSubscription: found.hasSubscription === true,
      };
    });

  useEffect(() => {
    if (storeProducts.length === 0) return;
    setSelectedProductsData((prev) => hydrateDraftProductsFromStore(prev));
    setDifferentProductsSharedPoolProductsData((prev) => hydrateDraftProductsFromStore(prev));
  }, [storeProducts]);
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
  const normalizeResourcePickerSelection = (selected: any): any[] => {
    if (!selected) return [];
    const rawList = Array.isArray(selected)
      ? selected
      : Array.isArray(selected.selection)
        ? selected.selection
        : [selected];

    const deduped = new Map<string, any>();
    rawList.forEach((item: any) => {
      const id = String(item?.id || "").trim();
      if (!id) return;
      deduped.set(id, item);
    });
    return Array.from(deduped.values());
  };
  const [collectionSelectionModalOpen, setCollectionSelectionModalOpen] = useState(false);
  const [pendingCollectionIds, setPendingCollectionIds] = useState<string[]>([]);
  const [triggerSelection, setTriggerSelection] = useState<TriggerSelectionMeta>(null);
  useEffect(() => {
    if (behaviorOfferType !== "quantity-breaks-different") return;
    if (differentProductsSharedPoolProductsData.length > 0) return;
    if (selectedProductsData.length === 0) return;
    setDifferentProductsSharedPoolProductsData(
      selectedProductsData.map((product) => ({ ...product })),
    );
  }, [
    behaviorOfferType,
    selectedProductsData,
    differentProductsSharedPoolProductsData,
  ]);
  useEffect(() => {
    if (triggerSelection !== null) return;
    if (selectedProductsData.length === 0) return;

    // 按需化后不再持有全量 id；用店铺商品总数作为「全店已选」的判定代理。
    const selectedIds = selectedProductsData.map((product) => String(product.id));
    if (totalStoreProductCount > 0 && selectedIds.length === totalStoreProductCount) {
      setTriggerSelection({ mode: "all" });
      return;
    }

    setTriggerSelection({ mode: "custom" });
  }, [totalStoreProductCount, selectedProductsData, triggerSelection]);
  const collectionOptions = useMemo(
    () =>
      Array.from(
        new Map(
          storeCollections.map((collection) => [
            String(collection.id || ""),
            {
              label: String(collection.title || ""),
              value: String(collection.id || ""),
            } satisfies CollectionOption,
          ]),
        ).values(),
      )
        .filter((option) => option.value && option.label)
        .sort((left, right) => left.label.localeCompare(right.label)),
    [storeCollections],
  );
  const triggerSelectionSummary = useMemo(
    () =>
      buildTriggerSelectionSummary({
        selection: triggerSelection,
        selectedCount: selectedProductsData.length,
        totalStoreProductsCount: totalStoreProductCount,
        collectionOptions,
      }),
    [
      triggerSelection,
      selectedProductsData.length,
      totalStoreProductCount,
      collectionOptions,
    ],
  );
  const triggerSelectionDetails = useMemo(() => {
    if (triggerSelection?.mode !== "collection") return [];
    return collectionOptions
      .filter((option) => triggerSelection.collectionIds?.includes(option.value))
      .map((option) => option.label);
  }, [triggerSelection, collectionOptions]);
  // 按需化后 collection 下的商品 id 改由服务端查询；选中的 collection 变化时拉取一次用于展示匹配数。
  const [pendingCollectionMatchedIds, setPendingCollectionMatchedIds] = useState<string[]>([]);
  const [pendingCollectionMatchLoading, setPendingCollectionMatchLoading] = useState(false);
  useEffect(() => {
    if (pendingCollectionIds.length === 0 || !onExpandCollections) {
      setPendingCollectionMatchedIds([]);
      setPendingCollectionMatchLoading(false);
      return;
    }
    let cancelled = false;
    setPendingCollectionMatchLoading(true);
    onExpandCollections(pendingCollectionIds)
      .then((ids) => {
        if (!cancelled) setPendingCollectionMatchedIds(ids);
      })
      .catch(() => {
        if (!cancelled) setPendingCollectionMatchedIds([]);
      })
      .finally(() => {
        if (!cancelled) setPendingCollectionMatchLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pendingCollectionIds, onExpandCollections]);
  const pendingCollectionMatchedProductCount = pendingCollectionMatchedIds.length;
  const areStringArraysEqual = (left: string[], right: string[]) =>
    left.length === right.length && left.every((value, index) => value === right[index]);
  const normalizeDifferentProductsRuleToSharedPool = (
    rule: DifferentProductsDiscountRule,
    sharedPoolIds: string[],
  ): DifferentProductsDiscountRule => {
    const normalizedSharedPoolIds = Array.from(
      new Set(sharedPoolIds.map((id) => String(id || "").trim()).filter(Boolean)),
    );
    return {
      ...rule,
      buyProductIds: normalizedSharedPoolIds,
      getProductIds: rule.tierType === "bxgy" ? normalizedSharedPoolIds : [],
    };
  };
  const createCompleteBundleBarId = () =>
    `bar-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createDefaultCompleteBundleBar = (
    type: "single" | "quantity-break-same" = "quantity-break-same",
  ): CompleteBundleBar => ({
    ...(type === "single"
      ? createDefaultCompleteBundleSingleBar({
          id: createCompleteBundleBarId(),
          isDefault: true,
        })
      : {
          id: createCompleteBundleBarId(),
          type,
          title: "Complete the bundle",
          subtitle: "Choose bundle items and set the pricing for the whole bundle total",
          badge: "",
          isDefault: false,
          minQuantity: 1,
          maxQuantity: 3,
          excludeTriggerProduct: true,
          quantity: 3,
          products: [],
          pricing: { mode: "percentage_off" as const, value: 15 },
        }),
  });
  const createInitialCompleteBundleBars = () =>
    normalizeCompleteBundleBars([
      createDefaultCompleteBundleBar("single"),
      createDefaultCompleteBundleBar("quantity-break-same"),
    ]);
  const getPreferredActiveCompleteBundleBarId = (bars: CompleteBundleBar[]) =>
    bars.find((bar) => !isCompleteBundleSingleBar(bar))?.id || bars[0]?.id || "";

  const handleSelectProducts = async (
    type: "buy" | "gift" | "normal" = "normal",
  ) => {
    const giftSelectionIds =
      freeGiftSharedGiftProductIds.length > 0
        ? freeGiftSharedGiftProductIds
        : aggregatedFreeGiftRewardProductIds;
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      // 保持 Shopify 原生 picker 机制，不传 filter.query，避免 collection 过滤 UI 失效
      multiple: true,
      selectionIds:
        type === "buy"
          ? buyProducts.map((id) => ({ id }))
          : type === "gift"
            ? giftSelectionIds.map((id) => ({ id }))
              : selectedProductsData.map((p) => ({ id: p.id })),
    });

    if (!selected) return;
    const selectedList = normalizeResourcePickerSelection(selected);
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
      setFreeGiftSharedGiftProductIds(nextIds);
      return;
    }

    const nextProducts = newData;
    const nextIds = nextProducts.map((item: any) => String(item.id));
    setSelectedProductsData(nextProducts);
    if (behaviorOfferType === "quantity-breaks-different") {
      setDifferentProductsSharedPoolProductsData(nextProducts);
      setDifferentProductsDiscountRules((prev) =>
        prev.map((rule) => normalizeDifferentProductsRuleToSharedPool(rule, nextIds)),
      );
    }
    if (bxgyDiscountRules.length > 0 || behaviorOfferType === "bxgy") {
      setBuyProducts(nextIds);
    }
    if (freeGiftRules.length > 0 || behaviorOfferType === "free-gift") {
      setFreeGiftTriggerProducts(nextIds);
    }
  };
  const handleSelectDifferentProductsSharedPoolProducts = async () => {
    const fallbackEligibleProducts =
      differentProductsSharedPoolProductsData.length > 0
        ? differentProductsSharedPoolProductsData
        : selectedProductsData;
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      selectionIds: fallbackEligibleProducts.map((product) => ({
        id: product.id,
      })),
    });

    if (!selected) return;
    const selectedList = normalizeResourcePickerSelection(selected);
    const nextProducts = selectedList.length > 0
      ? mapPickerSelectionToDraftProducts(selectedList)
      : selectedProductsData.map((product) => ({ ...product }));
    const nextIds = nextProducts.map((product: any) => String(product.id));
    setSelectedProductsData(nextProducts);
    setDifferentProductsSharedPoolProductsData(nextProducts);
    setDifferentProductsDiscountRules((prev) =>
      prev.map((rule) => normalizeDifferentProductsRuleToSharedPool(rule, nextIds)),
    );
  };
  const applyStepTwoTriggerProducts = (products: ReturnType<typeof mapProductIdsToDraftProducts>) => {
    const nextProducts = products;
    const nextIds = nextProducts.map((product) => String(product.id));
    setSelectedProductsData(nextProducts);
    if (behaviorOfferType === "quantity-breaks-different") {
      setDifferentProductsSharedPoolProductsData(nextProducts);
      setDifferentProductsDiscountRules((prev) =>
        prev.map((rule) => normalizeDifferentProductsRuleToSharedPool(rule, nextIds)),
      );
    }
    if (bxgyDiscountRules.length > 0 || behaviorOfferType === "bxgy") {
      setBuyProducts(nextIds);
    }
    if (freeGiftRules.length > 0 || behaviorOfferType === "free-gift") {
      setFreeGiftTriggerProducts(nextIds);
    }
  };
  const openStepTwoTriggerProductPicker = async (
    selectionProductIds?: string[],
    meta?: TriggerSelectionMeta,
  ) => {
    const currentStepTwoPoolIds =
      behaviorOfferType === "quantity-breaks-different" &&
      differentProductsSharedPoolProductsData.length > 0
        ? differentProductsSharedPoolProductsData.map((product) => String(product.id))
        : selectedProductsData.map((product) => String(product.id));
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      selectionIds: (selectionProductIds || currentStepTwoPoolIds).map((id) => ({ id })),
    });
    if (!selected) return;
    const selectedList = normalizeResourcePickerSelection(selected);
    applyStepTwoTriggerProducts(mapPickerSelectionToDraftProducts(selectedList));
    if (meta) {
      setTriggerSelection(meta);
    }
  };
  // 全量商品按需加载并缓存（select-all / invert / exclude 共用，避免重复扫店）。
  const allProductsCacheRef = useRef<Product[] | null>(null);
  const mapStoreProductsToDraftProducts = (products: Product[]) =>
    products.map((product) => ({
      id: String(product.id),
      title: product.name ?? "Unknown product",
      image: product.image ?? "https://via.placeholder.com/60",
      price: product.price ?? "€0.00",
      variantsCount: Array.isArray(product.variants) ? product.variants.length : 1,
      hasSubscription: product.hasSubscription === true,
    }));
  const ensureAllProducts = async (): Promise<Product[]> => {
    if (allProductsCacheRef.current) return allProductsCacheRef.current;
    if (!onLoadAllProducts) return [];
    try {
      const products = await onLoadAllProducts();
      allProductsCacheRef.current = products;
      return products;
    } catch {
      return [];
    }
  };
  const handleSelectAllTriggerProducts = async () => {
    const products = await ensureAllProducts();
    if (products.length === 0) {
      message.warning("Product list is still loading. Opening the product picker instead.");
      void openStepTwoTriggerProductPicker(undefined, {
        mode: "custom",
      });
      return;
    }
    applyStepTwoTriggerProducts(mapStoreProductsToDraftProducts(products));
    setTriggerSelection({ mode: "all" });
  };
  const handleExcludeTriggerProducts = async () => {
    const products = await ensureAllProducts();
    if (products.length === 0) {
      message.warning("Product list is still loading. Opening the product picker instead.");
      await openStepTwoTriggerProductPicker(undefined, {
        mode: "custom",
      });
      return;
    }
    await openStepTwoTriggerProductPicker(
      products.map((product) => String(product.id)),
      { mode: "exclude" },
    );
  };
  const handleInvertTriggerProducts = async () => {
    const products = await ensureAllProducts();
    if (products.length === 0) {
      message.warning("Product list is still loading. Opening the product picker instead.");
      void openStepTwoTriggerProductPicker(undefined, {
        mode: "custom",
      });
      return;
    }
    const selectedIdSet = new Set(selectedProductsData.map((product) => String(product.id)));
    const inverted = products.filter((product) => !selectedIdSet.has(String(product.id)));
    applyStepTwoTriggerProducts(mapStoreProductsToDraftProducts(inverted));
    setTriggerSelection({ mode: "inverse" });
  };
  const handleSelectTriggerProductsByCollection = () => {
    if (collectionOptions.length === 0) {
      message.warning("No collections are available for selection right now.");
      return;
    }
    setPendingCollectionIds([]);
    setCollectionSelectionModalOpen(true);
  };
  const confirmTriggerProductsByCollection = async () => {
    if (pendingCollectionIds.length === 0) {
      message.warning("Select at least one collection first.");
      return;
    }
    // 已选 collection 的展开 id 通常已被上面的 effect 拉取缓存；若尚未就绪则现拉一次（权威）。
    const collectionIdsForConfirm = pendingCollectionIds;
    let matchedProductIds = pendingCollectionMatchedIds;
    if (matchedProductIds.length === 0 && onExpandCollections) {
      try {
        matchedProductIds = await onExpandCollections(collectionIdsForConfirm);
      } catch {
        matchedProductIds = [];
      }
    }
    if (matchedProductIds.length === 0) {
      message.warning("No products were found in the selected collections.");
      return;
    }
    setCollectionSelectionModalOpen(false);
    setPendingCollectionIds([]);
    window.setTimeout(() => {
      void openStepTwoTriggerProductPicker(matchedProductIds, {
        mode: "collection",
        collectionIds: collectionIdsForConfirm,
      });
    }, 0);
  };
  const handleCustomFilterTriggerProducts = async () => {
    await openStepTwoTriggerProductPicker(undefined, {
      mode: "custom",
    });
  };
  const selectFreeGiftRewardProducts = async (ruleIndex: number) => {
    const targetRule = freeGiftRules[ruleIndex];
    if (!targetRule) return;
    const selected = await (window as any).shopify.resourcePicker({
      type: "product",
      action: "select",
      multiple: true,
      selectionIds: (
        Array.isArray(targetRule.giftProductIds) && targetRule.giftProductIds.length > 0
          ? targetRule.giftProductIds
          : freeGiftSharedGiftProductIds
      ).map((id) => ({ id })),
    });
    if (!selected) return;
    const selectedList = normalizeResourcePickerSelection(selected);
    const nextIds = selectedList.map((item: any) => String(item.id));
    setFreeGiftRules((prev) =>
      prev.map((rule, index) =>
        index === ruleIndex ? { ...rule, giftProductIds: nextIds } : rule,
      ),
    );
  };
  const addCompleteBundleBar = (type: "quantity-break-same") => {
    const nextBar = createDefaultCompleteBundleBar(type);
    const newBar: CompleteBundleBar = {
      ...nextBar,
      products: [],
    };
    setCompleteBundleBars((prev) => normalizeCompleteBundleBars([...prev, newBar]));
    setActiveBundleBarId(newBar.id);
  };

  const removeCompleteBundleBar = (barId: string) => {
    setCompleteBundleBars((prev) => {
      if (prev.find((bar) => bar.id === barId && isCompleteBundleSingleBar(bar))) {
        return prev;
      }
      const next = normalizeCompleteBundleBars(prev.filter((bar) => bar.id !== barId));
      if (!next.length) return prev;
      if (activeBundleBarId === barId) {
        setActiveBundleBarId(getPreferredActiveCompleteBundleBarId(next));
      }
      return next;
    });
  };

  const updateCompleteBundleBar = (
    barId: string,
    patch: Partial<CompleteBundleBar>,
  ) => {
    setCompleteBundleBars((prev) =>
      normalizeCompleteBundleBars(
        prev.map((bar) => (bar.id === barId ? { ...bar, ...patch } : bar)),
      ),
    );
  };
  const clearCompleteBundleBars = () => {
    if (behaviorOfferType === "complete-bundle") {
      const fallbackBars = createInitialCompleteBundleBars();
      setCompleteBundleBars(fallbackBars);
      setActiveBundleBarId(getPreferredActiveCompleteBundleBarId(fallbackBars));
      return;
    }
    setCompleteBundleBars([]);
    setActiveBundleBarId("");
  };

  const handleSelectProductsForBundleBar = async (barId: string) => {
    const targetBar = completeBundleBars.find((bar) => bar.id === barId);
    if (!targetBar || isCompleteBundleSingleBar(targetBar)) return;
    try {
      const selected = await (window as any).shopify.resourcePicker({
        type: "product",
        action: "select",
        multiple: true,
        selectionIds: targetBar.products
          .map((p) => toShopifyProductGid(p.productId))
          .filter(Boolean)
          .map((id) => ({ id })),
      });
      if (!selected) return;

      const selectedList = normalizeResourcePickerSelection(selected);
      if (selectedList.length === 0) {
        message.warning("No bundle items were returned from Shopify. Please try again.");
        return;
      }

      const triggerProductIds = new Set(
        selectedProductsData.map((product) => String(product.id || "")),
      );
      const mappedProducts: CompleteBundleProductDraft[] = selectedList
        .map((item: any) => ({
          productId: String(item.id),
          handle: String(item.handle || ""),
          title: item.title,
          image: item.images?.[0]?.originalSrc || "https://via.placeholder.com/60",
          price: item.variants?.[0]?.price || "€0.00",
          defaultVariantId: item.variants?.[0]?.id ? String(item.variants[0].id) : "",
          selectedVariantId: item.variants?.[0]?.id ? String(item.variants[0].id) : "",
            selectionMode: "product" as const,
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

      if (mappedProducts.length === 0) {
        message.warning(
          "Selected bundle items overlap with the trigger product, so nothing was added.",
        );
        return;
      }

      if (mappedProducts.length !== selectedList.length) {
        message.warning(
          "Some selected items match the trigger product and were skipped from the bundle.",
        );
      }

      const bundleItemCount = mappedProducts.length;
      const currentMin = Math.max(1, Math.trunc(Number(targetBar.minQuantity) || 1));
      const currentMax = Math.max(
        currentMin,
        Math.trunc(Number(targetBar.maxQuantity) || Number(targetBar.quantity) || 1),
      );
      const nextMin = Math.min(currentMin, bundleItemCount);
      const nextMax = Math.min(Math.max(nextMin, currentMax), bundleItemCount);

      updateCompleteBundleBar(barId, {
        minQuantity: nextMin,
        maxQuantity: nextMax,
        quantity: nextMax,
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
            selectionMode: prev?.selectionMode === "variant" ? "variant" : "product",
            selectedOptions: p.selectedOptions,
            variants: p.variants,
            pricing: prev?.pricing ?? p.pricing ?? { mode: "full_price" as const, value: 0 },
          };
        }),
      });
    } catch (error) {
      console.error("Failed to select complete bundle items", error);
      message.error("Unable to add bundle items right now. Please try again.");
    }
  };

  const [discountRules, setDiscountRulesState] = useState<DiscountRule[]>(
    () => initialEditorState.discountRules,
  );
  const [bxgyDiscountRules, setBxgyDiscountRulesState] = useState<BxgyDiscountRule[]>(
    () => initialEditorState.bxgyDiscountRules,
  );
  const [freeGiftRules, setFreeGiftRulesState] = useState<FreeGiftRule[]>(
    () => initialEditorState.freeGiftRules,
  );
  const [freeGiftSharedGiftProductIds, setFreeGiftSharedGiftProductIds] = useState<string[]>(
    () => initialEditorState.freeGiftSharedGiftProductIds,
  );
  const [differentProductsDiscountRules, setDifferentProductsDiscountRulesState] =
    useState<DifferentProductsDiscountRule[]>(
      () => initialEditorState.differentProductsDiscountRules,
    );
  const [buyProducts, setBuyProducts] = useState<string[]>(() => initialEditorState.buyProducts);
  const aggregatedFreeGiftRewardProductIds = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...freeGiftSharedGiftProductIds,
            ...freeGiftRules.flatMap((rule) =>
              Array.isArray(rule.giftProductIds) ? rule.giftProductIds : [],
            ),
          ],
        ),
      ),
    [freeGiftSharedGiftProductIds, freeGiftRules],
  );
  useEffect(() => {
    if (freeGiftRules.length === 0) return;
    if (freeGiftSharedGiftProductIds.length > 0) return;
    if (aggregatedFreeGiftRewardProductIds.length === 0) return;
    setFreeGiftSharedGiftProductIds(aggregatedFreeGiftRewardProductIds);
  }, [
    freeGiftRules.length,
    freeGiftSharedGiftProductIds,
    aggregatedFreeGiftRewardProductIds,
  ]);
  const freeGiftSharedGiftProductsData = useMemo(
    () => mapProductIdsToDraftProducts(freeGiftSharedGiftProductIds),
    [freeGiftSharedGiftProductIds, storeProducts],
  );
  const giftProductsData = useMemo(
    () => mapProductIdsToDraftProducts(aggregatedFreeGiftRewardProductIds),
    [aggregatedFreeGiftRewardProductIds, storeProducts],
  );
  const [freeGiftTriggerProducts, setFreeGiftTriggerProducts] = useState<string[]>(
    () => initialEditorState.freeGiftTriggerProducts,
  );
  const setDiscountRules: React.Dispatch<React.SetStateAction<DiscountRule[]>> = (value) => {
    setDiscountRulesState((prev) =>
      normalizeDiscountRules(typeof value === "function" ? value(prev) : value),
    );
  };
  const setBxgyDiscountRules: React.Dispatch<React.SetStateAction<BxgyDiscountRule[]>> = (
    value,
  ) => {
    setBxgyDiscountRulesState((prev) =>
      normalizeBxgyRules(typeof value === "function" ? value(prev) : value),
    );
  };
  const setFreeGiftRules: React.Dispatch<React.SetStateAction<FreeGiftRule[]>> = (value) => {
    setFreeGiftRulesState((prev) =>
      normalizeFreeGiftRules(typeof value === "function" ? value(prev) : value),
    );
  };
  const setDifferentProductsDiscountRules: React.Dispatch<
    React.SetStateAction<DifferentProductsDiscountRule[]>
  > = (value) => {
    setDifferentProductsDiscountRulesState((prev) =>
      normalizeDifferentProductsDiscountRules(
        typeof value === "function" ? value(prev) : value,
      ),
    );
  };
  const [completeBundleBars, setCompleteBundleBars] = useState<CompleteBundleBar[]>(
    () => {
      if (initialCompleteBundleConfig.bars.length > 0) {
        return normalizeCompleteBundleBars(initialCompleteBundleConfig.bars);
      }
      if (initialBuilderOfferType === "complete-bundle") {
        return starterTemplateDefaults?.completeBundleBars?.length
          ? normalizeCompleteBundleBars(starterTemplateDefaults.completeBundleBars)
          : createInitialCompleteBundleBars();
      }
      return [];
    },
  );
  const [activeBundleBarId, setActiveBundleBarId] = useState<string>(
    () => {
      if (initialCompleteBundleConfig.bars.length > 0) {
        return getPreferredActiveCompleteBundleBarId(
          normalizeCompleteBundleBars(initialCompleteBundleConfig.bars),
        );
      }
      if (initialBuilderOfferType === "complete-bundle") {
        return getPreferredActiveCompleteBundleBarId(
          starterTemplateDefaults?.completeBundleBars?.length
            ? normalizeCompleteBundleBars(starterTemplateDefaults.completeBundleBars)
            : createInitialCompleteBundleBars(),
        );
      }
      return "";
    },
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
  const [couponEnabled, setCouponEnabled] = useState(offerSettings.couponEnabled);
  const [couponCode, setCouponCode] = useState(offerSettings.couponCode);
  const [compositionBarOrder, setCompositionBarOrder] = useState<string[]>([]);
  useEffect(() => {
    if (selectedProductsData.length > 0) return;
    const completeBundleTriggerProductIds = Array.isArray(
      initialCompleteBundleConfig.triggerProductIds,
    )
      ? initialCompleteBundleConfig.triggerProductIds
      : [];
    const fallbackIds: string[] =
      buyProducts.length > 0
        ? buyProducts
        : freeGiftTriggerProducts.length > 0
          ? freeGiftTriggerProducts
          : completeBundleTriggerProductIds.length > 0
            ? completeBundleTriggerProductIds
          : [];
    if (!fallbackIds.length) return;
    setSelectedProductsData(mapProductIdsToDraftProducts(fallbackIds));
  }, [
    selectedProductsData.length,
    buyProducts,
    freeGiftTriggerProducts,
    initialCompleteBundleConfig.triggerProductIds,
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
    const effectiveEligibleIds =
      differentProductsSharedPoolProductsData.length > 0
        ? differentProductsSharedPoolProductsData.map((product) => String(product.id))
        : selectedProductsData.map((product) => String(product.id));
    if (!effectiveEligibleIds.length) return;
    setDifferentProductsDiscountRules((prev) => {
      let changed = false;
      const next = prev.map((rule) => {
        const normalizedRule = normalizeDifferentProductsRuleToSharedPool(
          rule,
          effectiveEligibleIds,
        );
        if (
          areStringArraysEqual(rule.buyProductIds || [], normalizedRule.buyProductIds) &&
          areStringArraysEqual(rule.getProductIds || [], normalizedRule.getProductIds)
        ) {
          return rule;
        }
        changed = true;
        return normalizedRule;
      });
      return changed ? next : prev;
    });
  }, [
    selectedProductsData,
    differentProductsSharedPoolProductsData,
    areStringArraysEqual,
    normalizeDifferentProductsRuleToSharedPool,
  ]);
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
        (storeProducts || []).flatMap((p) =>
          getShopifyProductLookupKeys(String(p.id || "")).map((key) => [key, p] as const),
        ),
      ),
    [storeProducts],
  );

  // 兼容历史轻量数据：若 selectedProductsJson 里没有变体明细，则用 storeProducts 按 productId 动态补全
  useEffect(() => {
    if (behaviorOfferType !== "complete-bundle") return;
    if (!storeProductMap.size) return;
    setCompleteBundleBars((prev) => {
      let changed = false;
      const next = prev.map((bar) => ({
        ...bar,
        products: (bar.products || []).map((product) => {
          const noVariants = !Array.isArray(product.variants) || product.variants.length === 0;
          const missingDisplayData = !product.title || !product.image || !product.price;
          if (!noVariants && !missingDisplayData) return product;
          const hit = getShopifyProductLookupKeys(String(product.productId || ""))
            .map((key) => storeProductMap.get(key))
            .find(Boolean);
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

  const updateBundleBarProductSelectionMode = (
    barId: string,
    productId: string,
    selectionMode: "product" | "variant",
  ) => {
    setCompleteBundleBars((prev) =>
      prev.map((bar) => {
        if (bar.id !== barId) return bar;
        return {
          ...bar,
          products: bar.products.map((product) =>
            product.productId === productId
              ? {
                  ...product,
                  selectionMode,
                }
              : product,
          ),
        };
      }),
    );
  };

  /**
   * complete-bundle 使用共享 offer scope；bar 商品由 scope 自动同步。
   */
  const appendProductsToBundleBar = async (barId: string) => {
    await handleSelectProductsForBundleBar(barId);
  };

  /**
   * complete-bundle 商品卡现在只是共享 scope 的变体预览，不再允许按 bar 删除商品。
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
    const selectionMode = product.selectionMode === "variant" ? "variant" : "product";
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
    const productLabel = `Bundle item ${productIdx + 1}`;
    const variantSelectValue =
      selectionMode === "product"
        ? "__product__"
        : product.selectedVariantId || selectedVariant?.id || "__product__";

    return (
      <div
        key={product.productId}
        className="create-offer-bundle-product-card"
      >
        <div className="mb-3 flex items-start gap-3 justify-between">
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
              <div className="text-[12px] text-[#1c1f23] truncate">
                {product.title || product.productId}
              </div>
              <div className="mt-1 text-[11px] text-[#5c6166] truncate">
                {selectionMode === "product"
                  ? "Customer chooses variant"
                  : selectedVariant?.title || "Locked variant"}
              </div>
            </div>
          </div>
        </div>
        <div>
          <div className="mb-1 text-[12px] font-medium text-[#1c1f23]">Variant</div>
          <Select
            size="middle"
            className="w-full"
            value={variantSelectValue}
            onChange={(value) => {
              const nextValue = String(value);
              if (nextValue === "__product__") {
                updateBundleBarProductSelectionMode(bar.id, product.productId, "product");
                return;
              }
              updateBundleBarProductSelectionMode(bar.id, product.productId, "variant");
              updateBundleBarProductVariant(bar.id, product.productId, nextValue);
            }}
            options={[
              { label: "Customer chooses on storefront", value: "__product__" },
              ...(product.variants || []).map((variant) => ({
                label:
                  variant.title ||
                  (Array.isArray(variant.selectedOptions)
                    ? variant.selectedOptions
                        .map((opt) => String(opt.value || "").trim())
                        .filter(Boolean)
                        .join(" / ")
                    : "") ||
                  "Default variant",
                value: variant.id,
              })),
            ]}
          />
          {selectionMode === "variant" && optionNames.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#5c6166]">
              {Object.entries(selectedOptionsMap).map(([name, value]) => (
                <span
                  key={`${product.productId}-${name}-${value}`}
                  className="rounded-full bg-[#f6f8f9] px-2 py-1"
                >
                  {name}: {value}
                </span>
              ))}
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
  }, [buyProducts, behaviorOfferType]);
  useEffect(() => {
    if (behaviorOfferType !== "complete-bundle") return;
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
    setSubscriptionPreviewSnapshot(
      result.previewPlans?.length
        ? {
            plans: result.previewPlans,
            productId: result.id,
          }
        : null,
    );
  }, [subscriptionStatusFetcher.state, subscriptionStatusFetcher.data]);

  useEffect(() => {
    const previewProduct =
      selectedProductsData.find((product) => product.hasSubscription) ??
      selectedProductsData[0] ??
      null;
    const previewProductId = String(previewProduct?.id || "");
    const shouldResolveSubscriptionPreview =
      effectiveSubscriptionEnabled && previewProduct != null;
    if (!shouldResolveSubscriptionPreview) {
      if (subscriptionPreviewSnapshot !== null) {
        setSubscriptionPreviewSnapshot(null);
      }
      return;
    }
    if (!previewProductId) {
      if (subscriptionPreviewSnapshot !== null) {
        setSubscriptionPreviewSnapshot(null);
      }
      return;
    }
    if (
      subscriptionStatusFetcher.state !== "idle" ||
      subscriptionPreviewSnapshot?.productId === previewProductId
    ) {
      return;
    }
    subscriptionStatusFetcher.submit(
      {
        intent: "get-product-subscription-status",
        productId: previewProductId,
      },
      { method: "post" },
    );
  }, [
    effectiveSubscriptionEnabled,
    selectedProductsData,
    subscriptionPreviewSnapshot,
    subscriptionStatusFetcher,
  ]);

  const previewBarOptions = useMemo(() => {
    if (behaviorOfferType === "bxgy") {
      return bxgyDiscountRules.map((r, i) => ({
        value: i + 1,
        label: `Bar #${i + 1} (${resolveBuilderBxgyDisplay(r).summary})`,
      }));
    }
    if (behaviorOfferType === "quantity-breaks-different") {
      return differentProductsDiscountRules.map((r, i) => ({
        value: i + 1,
        label: `Tier #${i + 1} (${
          r.tierType === "bxgy"
            ? `Buy ${r.buyQuantity}, get ${r.buyQuantity + r.getQuantity}`
            : `Any ${r.count} items`
        })`,
      }));
    }
    if (behaviorOfferType === "free-gift") {
      return freeGiftRules.map((r, i) => ({
        value: i + 1,
        label: `Gift tier #${i + 1} (count ≥ ${r.count})`,
      }));
    }
    return [
      { value: 1, label: "Bar #1 (Single, qty 1)" },
      ...discountRules.map((r, i) => ({
        value: i + 2,
        label:
          r.logicType === "bxgy"
            ? `Bar #${i + 2} (BXGY, ${resolveBuilderBxgyDisplay({
                buyQuantity: r.buyQuantity || 2,
                getQuantity: r.getQuantity || 1,
              }).summary})`
            : r.conditionType === "cart_amount"
              ? `Bar #${i + 2} (spend ${r.amountThreshold || 0})`
              : `Bar #${i + 2} (qty ${r.count})`,
      })),
    ];
  }, [
    behaviorOfferType,
    bxgyDiscountRules,
    differentProductsDiscountRules,
    discountRules,
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

    const selectedScopeProductIds = selectedProductsData.map((product) => String(product.id));
    const differentProductsSharedPoolProductIds =
      differentProductsSharedPoolProductsData.length > 0
        ? differentProductsSharedPoolProductsData.map((product) => String(product.id))
        : selectedScopeProductIds;
    const moduleDescriptors = buildCampaignModuleDescriptors({
      behaviorOfferType,
      selectedScopeProductIds,
      differentProductsSharedPoolProductIds,
      discountRules,
      differentProductsDiscountRules,
      bxgyDiscountRules,
      buyProducts,
      freeGiftRules,
      freeGiftTriggerProducts,
      freeGiftSharedGiftProductIds,
      aggregatedFreeGiftRewardProductIds,
      completeBundleBars,
      subscriptionEnabled: effectiveSubscriptionEnabled,
      subscriptionTitle,
      subscriptionSubtitle,
    });

    const primaryModule = moduleDescriptors[behaviorOfferType];
    if (!primaryModule) {
      return null;
    }

    const logicBlockId = primaryModule.logicBlockId;
    const scopeProductIds = Array.from(new Set(primaryModule.scopeIds));
    const logicBlocks: CampaignConfig["logicBlocks"] = [primaryModule.logicBlock];

    (Object.entries(moduleDescriptors) as Array<
      [OfferTypeId, (typeof moduleDescriptors)[OfferTypeId]]
    >).forEach(([type, descriptor]) => {
      if (type === behaviorOfferType || !descriptor.includeAsAdditional) {
        return;
      }
      logicBlocks.push(descriptor.logicBlock);
    });

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
        couponEnabled,
        couponCode: sanitizeSingleLineText(couponCode, 64, ""),
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
    differentProductsSharedPoolProductsData,
    endTime,
    freeGiftRules,
    freeGiftTriggerProducts,
    aggregatedFreeGiftRewardProductIds,
    compositionBarOrder,
    labelColor,
    layoutFormat,
    normalizedIpCountryCodes,
    normalizedMarkets,
    discountRules,
    scheduleTimezone,
    selectedProductsData,
    showCountdownBlock,
    showCustomButton,
    startTime,
    status,
    effectiveSubscriptionEnabled,
    subscriptionSubtitle,
    subscriptionTitle,
    stickyAddToCartEnabled,
    stickyAddToCartTitle,
    stickyAddToCartSubtitle,
    stickyAddToCartButtonText,
    couponEnabled,
    couponCode,
    titleColor,
    titleFontSize,
    titleFontWeight,
    totalBudget,
    usageLimitPerCustomer,
    widgetTitle,
    behaviorOfferType,
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
  const shouldShowSubscriptionPreview = effectiveSubscriptionEnabled;
  const subscriptionPreviewStyle = "solid";
  const shouldShowSubscriptionExplanation = false;
  const subscriptionExplanationTitle = "";
  const subscriptionExplanationBody = "";
  const previewSubscriptionProduct =
    selectedProductsData.find((product) => product.hasSubscription) ??
    selectedProductsData[0] ??
    null;
  const previewOneTimePrice =
    parsePreviewMoney(previewSubscriptionProduct?.price) ?? baseUnitPrice;
  const previewSubscriptionSnapshot =
    subscriptionPreviewSnapshot &&
    String(subscriptionPreviewSnapshot.productId || "") ===
      String(previewSubscriptionProduct?.id || "")
      ? subscriptionPreviewSnapshot
      : null;
  const previewSubscriptionPlans = previewSubscriptionSnapshot?.plans ?? [];
  const previewPrimarySubscriptionPlan = previewSubscriptionPlans[0] ?? null;
  const previewSubscriptionSourceLabel = previewSubscriptionProduct?.title || null;
  const previewSubscriptionLoading =
    effectiveSubscriptionEnabled &&
    !!previewSubscriptionProduct &&
    subscriptionStatusFetcher.state !== "idle";
  const previewSubscriptionErrorText =
    subscriptionStatusFetcher.state === "idle" &&
    subscriptionStatusFetcher.data &&
    !subscriptionStatusFetcher.data.ok
      ? subscriptionStatusFetcher.data.error || "Failed to load selling plans."
      : !previewSubscriptionLoading &&
          !!previewSubscriptionProduct &&
          previewSubscriptionProduct.hasSubscription &&
          previewSubscriptionPlans.length === 0
        ? "The selected product has selling plans, but the preview request returned no readable plan data."
        : null;
  const previewOneTimeTitle = "One-time purchase";
  const previewOneTimeSubtitle = FIXED_ONE_TIME_SUBTITLE;
  const previewSubscriptionTitle = subscriptionTitle || "Subscribe & Save";
  const previewSubscriptionSubtitle =
    previewPrimarySubscriptionPlan?.billingLabel ||
    subscriptionSubtitle ||
    "Billing cycle is pulled from the selected selling plan";
  const previewOneTimePriceText = formatPreviewPrice(previewOneTimePrice);
  const previewSubscriptionPriceText = previewPrimarySubscriptionPlan
    ? formatPreviewPrice(previewPrimarySubscriptionPlan.subscriptionPrice)
    : null;
  const previewSubscriptionCompareAtPriceText =
    previewPrimarySubscriptionPlan
      ? formatPreviewPrice(previewPrimarySubscriptionPlan.compareAtPrice)
      : null;
  const previewSubscriptionSavingsText =
    previewPrimarySubscriptionPlan
      ? previewPrimarySubscriptionPlan.savingsAmount > 0
        ? `Save ${formatPreviewPrice(previewPrimarySubscriptionPlan.savingsAmount)}`
        : null
      : null;
  const previewSubscriptionPricingNoteText =
    previewPrimarySubscriptionPlan
      ? previewPrimarySubscriptionPlan.savingsAmount > 0
        ? null
        : "No discount on this cycle"
      : null;
  const subscriptionPlanPreviewItems = useMemo(
    () =>
      previewSubscriptionPlans.map((plan) => ({
        title: plan.sellingPlanName,
        subtitle: plan.billingLabel,
        priceText: formatPreviewPrice(plan.subscriptionPrice),
        savingsText:
          plan.savingsAmount > 0
            ? `Save ${formatPreviewPrice(plan.savingsAmount)}`
            : null,
        noteText: plan.savingsAmount > 0 ? null : "No discount on this cycle",
      })),
    [previewSubscriptionPlans],
  );
  const checkboxUpsellPreview = useMemo(
    () => ({
      enabled: checkboxUpsellsEnabled,
      title: checkboxUpsellsTitle.trim(),
      subtitle: checkboxUpsellsSubtitle.trim(),
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
      title: stickyAddToCartTitle.trim(),
      subtitle: stickyAddToCartSubtitle.trim(),
      buttonText: stickyAddToCartButtonText.trim(),
    }),
    [
      stickyAddToCartEnabled,
      stickyAddToCartTitle,
      stickyAddToCartSubtitle,
      stickyAddToCartButtonText,
    ],
  );
  const unifiedRulesSnapshot = useMemo(() => {
    const selectedScopeProductIds = selectedProductsData.map((product) => String(product.id));
    const differentProductsSharedPoolProductIds =
      differentProductsSharedPoolProductsData.length > 0
        ? differentProductsSharedPoolProductsData.map((product) => String(product.id))
        : selectedScopeProductIds;
    const moduleDescriptors = buildCampaignModuleDescriptors({
      behaviorOfferType,
      selectedScopeProductIds,
      differentProductsSharedPoolProductIds,
      discountRules,
      differentProductsDiscountRules,
      bxgyDiscountRules,
      buyProducts,
      freeGiftRules,
      freeGiftTriggerProducts,
      freeGiftSharedGiftProductIds,
      aggregatedFreeGiftRewardProductIds,
      completeBundleBars,
      subscriptionEnabled: effectiveSubscriptionEnabled,
      subscriptionTitle,
      subscriptionSubtitle,
    });

    const primaryModule = moduleDescriptors[behaviorOfferType];
    if (!primaryModule) return [];

    const nextRules = [...primaryModule.rules];

    (Object.entries(moduleDescriptors) as Array<
      [OfferTypeId, (typeof moduleDescriptors)[OfferTypeId]]
    >).forEach(([type, descriptor]) => {
      if (type === behaviorOfferType || !descriptor.includeAsAdditional) return;

      nextRules.push(...descriptor.rules);
    });

    return nextRules;
  }, [
    behaviorOfferType,
    selectedProductsData,
    differentProductsSharedPoolProductsData,
    discountRules,
    differentProductsDiscountRules,
    bxgyDiscountRules,
    buyProducts,
    freeGiftRules,
    freeGiftTriggerProducts,
    freeGiftSharedGiftProductIds,
    aggregatedFreeGiftRewardProductIds,
    completeBundleBars,
    effectiveSubscriptionEnabled,
    subscriptionTitle,
    subscriptionSubtitle,
  ]);
  const campaignDraft = useMemo<CampaignDraft>(
    () => ({
      offerType: behaviorOfferType,
      selectedProductsData,
      differentProductsSharedPoolProductsData,
      discountRules,
      buyProducts,
      getProducts: buyProducts,
      activeBundleBarId,
      completeBundleBars,
      subscriptionTitle,
      subscriptionSubtitle,
      oneTimeTitle: FIXED_ONE_TIME_TITLE,
      oneTimeSubtitle: FIXED_ONE_TIME_SUBTITLE,
      subscriptionPosition: FIXED_SUBSCRIPTION_POSITION,
      subscriptionDefaultSelected: FIXED_SUBSCRIPTION_DEFAULT_SELECTED,
      shouldShowSubscriptionPreview,
      allSelectedProductsHaveSubscription,
      shouldShowSubscriptionExplanation,
      subscriptionExplanationTitle,
      subscriptionExplanationBody,
      previewOneTimePriceText,
      previewSubscriptionPriceText: previewSubscriptionPriceText,
      previewSubscriptionCompareAtPriceText: previewSubscriptionCompareAtPriceText,
      previewSubscriptionSavingsText: previewSubscriptionSavingsText,
      previewSubscriptionPricingNoteText,
      previewSubscriptionSourceLabel,
      previewSubscriptionLoading,
      previewSubscriptionErrorText,
      previewSubscriptionPlans,
      freeGiftTriggerProducts,
      freeGiftSharedGiftProductIds,
      freeGiftSharedGiftProductsData,
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
      bxgyDiscountRules,
      differentProductsDiscountRules,
      freeGiftRules,
      subscriptionEnabled: effectiveSubscriptionEnabled,
      unifiedRulesSnapshot,
    }),
    [
      behaviorOfferType,
      selectedProductsData,
      differentProductsSharedPoolProductsData,
      discountRules,
      buyProducts,
      activeBundleBarId,
      completeBundleBars,
      subscriptionTitle,
      subscriptionSubtitle,
      shouldShowSubscriptionPreview,
      allSelectedProductsHaveSubscription,
      shouldShowSubscriptionExplanation,
      subscriptionExplanationTitle,
      subscriptionExplanationBody,
      freeGiftTriggerProducts,
      freeGiftSharedGiftProductIds,
      freeGiftSharedGiftProductsData,
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
      bxgyDiscountRules,
      differentProductsDiscountRules,
      freeGiftRules,
      effectiveSubscriptionEnabled,
      unifiedRulesSnapshot,
      previewOneTimePriceText,
      previewSubscriptionPriceText,
      previewSubscriptionCompareAtPriceText,
      previewSubscriptionSavingsText,
      previewSubscriptionPricingNoteText,
      previewSubscriptionSourceLabel,
      previewSubscriptionLoading,
      previewSubscriptionErrorText,
      previewSubscriptionPlans,
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
  const activeDisplayRules = useMemo(() => {
    if (behaviorOfferType === "complete-bundle") {
      return orderedCompositionRulesSnapshot.filter(
        (rule) => rule.sourceOfferType === "complete-bundle",
      );
    }
    const primarySingleRule = orderedCompositionRulesSnapshot.find(
      (rule) =>
        rule.type === "single_purchase" &&
        rule.sourceOfferType === behaviorOfferType,
    );
    return [
      ...(primarySingleRule ? [primarySingleRule] : []),
      ...orderedCompositionRulesSnapshot.filter(
        (rule) => rule.type !== "single_purchase" && rule.type !== "subscription",
      ),
    ];
  }, [behaviorOfferType, orderedCompositionRulesSnapshot]);
  const stepTwoAuditIssues = useMemo(
    () =>
      hasMixedCompositionSources
        ? getUnifiedRuleAuditIssuesForRules(campaignDraft, compositionRulesSnapshot)
        : getUnifiedRuleAuditIssues(campaignDraft),
    [campaignDraft, compositionRulesSnapshot, hasMixedCompositionSources],
  );
  const stepTwoPoolWarnings = useMemo(
    () =>
      stepTwoAuditIssues.filter(
        (issue) =>
          issue.severity === "warning" &&
          (issue.code === "different_products_pool_capacity" ||
            issue.code === "different_products_pool_variants"),
      ),
    [stepTwoAuditIssues],
  );
  const getModuleBlockingMessage = () => {
    if (effectiveSubscriptionEnabled) {
      if (selectedProductsData.length === 0) {
        return "Subscription module requires at least one product in the product pool.";
      }
      if (selectedProductsData.some((product) => !product.hasSubscription)) {
        return "All products in the subscription pool must already have Shopify selling plans.";
      }
    }
    if (
      completeBundleBars.some((bar) => !isCompleteBundleSingleBar(bar)) &&
      completeBundleBars
        .filter((bar) => !isCompleteBundleSingleBar(bar))
        .every((bar) => bar.products.length === 0)
    ) {
      return "Complete bundle module requires at least one configured bundle item.";
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
    setCompleteBundleBars((prev) =>
      normalizeCompleteBundleBars(prev.map((bar) => ({ ...bar, isDefault: false }))),
    );
  };
  const updateUnifiedRulePresentation = (
    id: string,
    patch: RulePresentationPatch,
  ) => {
    if (behaviorOfferType === "subscription") {
      if (id === "subscription-option") {
        if (typeof patch.title === "string") setSubscriptionTitle(patch.title);
        if (typeof patch.subtitle === "string") setSubscriptionSubtitle(patch.subtitle);
        return;
      }
    }

    const compositionRule = orderedCompositionRulesSnapshot.find((rule) => rule.id === id);
    if (compositionRule) {
      if (patch.isDefault === true) {
        clearAllCompositionBarDefaults();
      }
      switch (compositionRule.sourceOfferType) {
        case "quantity-breaks-same": {
          setDiscountRules((prev) => updateDiscountRulePresentation(prev, id, patch));
          return;
        }
        case "shipping-discount": {
          setDiscountRules((prev) => updateDiscountRulePresentation(prev, id, patch));
          return;
        }
        case "order-discount": {
          setDiscountRules((prev) => updateDiscountRulePresentation(prev, id, patch));
          return;
        }
        case "coupon": {
          setDiscountRules((prev) => updateDiscountRulePresentation(prev, id, patch));
          return;
        }
        case "bxgy": {
          setBxgyDiscountRules((prev) => updateBxgyRulePresentation(prev, id, patch));
          return;
        }
        case "free-gift": {
          setFreeGiftRules((prev) => updateFreeGiftRulePresentation(prev, id, patch));
          return;
        }
        case "quantity-breaks-different": {
          setDifferentProductsDiscountRules((prev) =>
            updateDifferentProductsRulePresentation(prev, id, patch),
          );
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

    return;
  };
  const updateUnifiedRuleValues = (
    id: string,
    patch: UnifiedRuleValuePatch,
  ) => {
    const compositionRule = compositionRulesSnapshot.find((rule) => rule.id === id);
    if (compositionRule) {
      switch (compositionRule.sourceOfferType) {
        case "quantity-breaks-same":
        case "shipping-discount":
        case "order-discount":
        case "coupon":
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

    return;
  };
  const campaignDraftActions: CampaignDraftActions = {
    setOfferType,
    setSelectedProductsData,
    setDifferentProductsSharedPoolProductsData,
    handleSelectProducts,
    handleSelectDifferentProductsSharedPoolProducts,
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
  const previewItems: PreviewItem[] = useMemo(() => {
    const differentProductsSharedPoolProductIds = differentProductsSharedPoolProductsData.map(
      (product) => String(product.id),
    );
    if (behaviorOfferType === "complete-bundle") {
      return buildUnifiedPreviewItems({
        offerType: behaviorOfferType,
        rules: activeDisplayRules.filter(
          (rule) => rule.sourceOfferType === "complete-bundle",
        ),
        selectedProducts: Array.from(
          new Map(
            [...selectedProductsData, ...differentProductsSharedPoolProductsData].map(
              (product) => [
                String(product.id),
                {
                  id: product.id,
                  title: product.title,
                  image: product.image,
                },
              ],
            ),
          ).values(),
        ),
        differentProductsSharedPoolProductIds,
        completeBundleBars,
        baseUnitPrice,
        formatPrice: formatPreviewPrice,
      });
    }

    const previewSelectedProducts = Array.from(
      new Map(
        [...selectedProductsData, ...differentProductsSharedPoolProductsData].map(
          (product) => [
            String(product.id),
            {
              id: product.id,
              title: product.title,
              image: product.image,
            },
          ],
        ),
      ).values(),
    );

    const hasMixedCompositionSources = new Set(
      activeDisplayRules.map((rule) => rule.sourceOfferType),
    ).size > 1;

    const computedItems = hasMixedCompositionSources
      ? buildCompositionPreviewItems({
          rules: activeDisplayRules,
          selectedProducts: previewSelectedProducts,
          differentProductsSharedPoolProductIds,
          completeBundleBars,
          baseUnitPrice,
          formatPrice: formatPreviewPrice,
        })
      : buildUnifiedPreviewItems({
          offerType: behaviorOfferType,
          rules: activeDisplayRules,
          selectedProducts: previewSelectedProducts,
          differentProductsSharedPoolProductIds,
          completeBundleBars,
          baseUnitPrice,
          formatPrice: formatPreviewPrice,
        });
    return computedItems;
  }, [
    behaviorOfferType,
    activeDisplayRules,
    completeBundleBars,
    selectedProductsData,
    differentProductsSharedPoolProductsData,
    baseUnitPrice,
    formatPreviewPrice,
  ]);

  const steps = [
    "Campaign",
    "Scope & Logic",
    "Display",
    "Targeting",
  ];

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
  const progressiveGiftDisplaySections =
    isProgressiveGiftsTemplate && behaviorOfferType !== "complete-bundle"
      ? [
          {
            id: "progressive-gifts",
            title: "Progressive rewards",
            content: (
              <ProgressiveGiftsSection
                offerType={behaviorOfferType}
                unifiedRulesSnapshot={unifiedRulesSnapshot}
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
    if (isProgressiveGiftsTemplate) {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Milestone components"
          extraSections={progressiveGiftDisplaySections}
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (
      behaviorOfferType === "quantity-breaks-same" ||
      behaviorOfferType === "shipping-discount" ||
      behaviorOfferType === "order-discount" ||
      behaviorOfferType === "coupon"
    ) {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle={
            behaviorOfferType === "shipping-discount"
              ? "Shipping Components"
              : behaviorOfferType === "order-discount"
                ? "Order Discount Components"
                : behaviorOfferType === "coupon"
                  ? "Coupon Components"
              : "Tier Components"
          }
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (behaviorOfferType === "bxgy") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="BXGY Components"
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (behaviorOfferType === "free-gift") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Free Gift Components"
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (behaviorOfferType === "quantity-breaks-different") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Cross-product Components"
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (behaviorOfferType === "complete-bundle") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Bundle Components"
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    if (behaviorOfferType === "subscription") {
      return (
        <OfferComponentsDisplayCustomizer
          itemGroupTitle="Bar Components"
          items={unifiedDisplayItems}
          onUpdateItem={campaignDraftActions.updateUnifiedRulePresentation}
          {...displayCustomizerCommonProps}
        />
      );
    }

    return null;
  };

  const displayComponentCount =
    behaviorOfferType === "subscription"
      ? unifiedDisplayItems.length
      : unifiedDisplayItems.length;
  const displayStepMeta = [
    `${displayComponentCount} components`,
    showCountdownBlock ? "Countdown enabled" : null,
    isProgressiveGiftsTemplate ? "Progressive rewards" : null,
    progressiveGifts.enabled &&
    !isProgressiveGiftsTemplate &&
    behaviorOfferType !== "complete-bundle"
      ? "Legacy progressive gifts"
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
    behaviorOfferType === "complete-bundle"
      ? "Bundle preview"
      : isProgressiveGiftsTemplate
        ? "Progressive rewards preview"
        : "Storefront preview";
  const progressiveGiftPreviewControls =
    isProgressiveGiftsTemplate && behaviorOfferType !== "complete-bundle" ? (
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
          discountRules.some((r) => r.discountPercent >= 90) ||
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
        confirmLoading={pendingCollectionMatchLoading}
      >
        <div className="space-y-3">
          <div className="text-[13px] text-[#5c6166]">
            Choose one or more collections first. The next step opens Shopify&apos;s native
            product picker with those collection products preselected so you can confirm the final
            discount scope.
          </div>
          {pendingCollectionIds.length > 0 ? (
            <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
              {pendingCollectionMatchLoading ? (
                <>
                  Counting products in {pendingCollectionIds.length} collection
                  {pendingCollectionIds.length === 1 ? "" : "s"}…
                </>
              ) : (
                <>
                  {pendingCollectionIds.length} collection
                  {pendingCollectionIds.length === 1 ? "" : "s"} currently match{" "}
                  {pendingCollectionMatchedProductCount} product
                  {pendingCollectionMatchedProductCount === 1 ? "" : "s"} before refinement.
                </>
              )}
            </div>
          ) : null}
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
      <input type="hidden" name="offerType" value={behaviorOfferType} />
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
        value={effectiveSubscriptionEnabled ? "true" : "false"}
      />
      <input type="hidden" name="subscriptionTitle" value={subscriptionTitle} />
      <input
        type="hidden"
        name="subscriptionSubtitle"
        value={subscriptionSubtitle}
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
      <input
        type="hidden"
        name="couponEnabled"
        value={couponEnabled ? "true" : "false"}
      />
      <input type="hidden" name="couponCode" value={couponCode} />
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
            (rules) => rules,
          ),
        )}
      />
      <input
        type="hidden"
        name="progressiveGiftsJson"
        value={JSON.stringify(progressiveGiftsConfigToStorableJson(progressiveGifts))}
      />
      <input type="hidden" name="campaignConfigJson" value={campaignConfigJson} />

      <div className="mb-[100px] rounded-[12px] border border-[#dfe3e8] bg-[#ffffff] p-[16px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-[20px]">
        <div className="mb-[12px] rounded-[10px] border border-[#e9edf1] bg-[#fcfcfd] p-[8px] sm:p-[10px]">
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
                className={`rounded-[8px] border px-[10px] py-[8px] text-left transition-all ${
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
                            setOfferName(e.target.value.replace(/\s+/g, " "));
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
                          placeholder="e.g., 组合优惠"
                          value={cartTitle}
                          onChange={(e) => {
                            setCartTitle(e.target.value.replace(/\s+/g, " "));
                            if (cartTitleError && e.target.value.trim()) {
                              setCartTitleError("");
                            }
                          }}
                          status={cartTitleError ? "error" : ""}
                          maxLength={OFFER_TEXT_LIMITS.cartTitle}
                          showCount
                        />
                      </label>
                      <div className="text-[12px] text-[#6d7175] mt-1">
                        Shown to customers in cart and checkout.
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
                    subscriptionTitle={previewSubscriptionTitle}
                    subscriptionSubtitle={previewSubscriptionSubtitle}
                    oneTimeTitle={previewOneTimeTitle}
                    oneTimeSubtitle={previewOneTimeSubtitle}
                    oneTimePriceText={previewOneTimePriceText}
                    subscriptionPriceText={previewSubscriptionPriceText}
                    subscriptionCompareAtPriceText={previewSubscriptionCompareAtPriceText}
                    subscriptionSavingsText={previewSubscriptionSavingsText}
                    subscriptionPricingNoteText={previewSubscriptionPricingNoteText}
                    subscriptionPlanPreviewItems={subscriptionPlanPreviewItems}
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
                templateOfferType={offerType}
                actions={campaignDraftActions}
                totalStoreProductsCount={totalStoreProductCount}
                activeTriggerSelectionMode={triggerSelection?.mode ?? null}
                activeTriggerSelectionSummary={triggerSelectionSummary}
                activeTriggerSelectionDetails={triggerSelectionDetails}
                onSelectAllTriggerProducts={handleSelectAllTriggerProducts}
                onSelectTriggerProductsByCollection={handleSelectTriggerProductsByCollection}
                onExcludeTriggerProducts={() => void handleExcludeTriggerProducts()}
                onInvertTriggerProducts={handleInvertTriggerProducts}
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
                auditWarnings={stepTwoPoolWarnings}
                renderCompleteBundleProductPricingCard={
                  renderCompleteBundleProductPricingCard
                }
                preview={
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
                      subscriptionTitle={previewSubscriptionTitle}
                      subscriptionSubtitle={previewSubscriptionSubtitle}
                      oneTimeTitle={previewOneTimeTitle}
                      oneTimeSubtitle={previewOneTimeSubtitle}
                      oneTimePriceText={previewOneTimePriceText}
                      subscriptionPriceText={previewSubscriptionPriceText}
                      subscriptionCompareAtPriceText={previewSubscriptionCompareAtPriceText}
                      subscriptionSavingsText={previewSubscriptionSavingsText}
                      subscriptionPricingNoteText={previewSubscriptionPricingNoteText}
                      subscriptionPlanPreviewItems={subscriptionPlanPreviewItems}
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
                    subscriptionTitle={previewSubscriptionTitle}
                    subscriptionSubtitle={previewSubscriptionSubtitle}
                    oneTimeTitle={previewOneTimeTitle}
                    oneTimeSubtitle={previewOneTimeSubtitle}
                    oneTimePriceText={previewOneTimePriceText}
                    subscriptionPriceText={previewSubscriptionPriceText}
                    subscriptionCompareAtPriceText={previewSubscriptionCompareAtPriceText}
                    subscriptionSavingsText={previewSubscriptionSavingsText}
                    subscriptionPricingNoteText={previewSubscriptionPricingNoteText}
                    subscriptionPlanPreviewItems={subscriptionPlanPreviewItems}
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

              {behaviorOfferType === "coupon" ? (
                <div className="mb-8 flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="m-0 text-[14px] font-medium text-[#1c1f23]">
                      Coupon Access
                    </h3>
                    <div className="text-[12px] text-[#5c6166]">
                      Shared code required
                    </div>
                  </div>
                  <div className="rounded-[12px] border border-[#e3e8ed] bg-white p-4">
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      Shared coupon code
                    </div>
                    <div className="mt-1 text-[12px] text-[#5c6166]">
                      Customers must enter this code before the coupon offer can apply.
                    </div>
                    <Input
                      size="large"
                      className="mt-3"
                      placeholder="SAVE15"
                      value={couponCode}
                      onChange={(e) => {
                        setCouponEnabled(true);
                        setCouponCode(e.target.value.toUpperCase());
                      }}
                    />
                  </div>
                </div>
              ) : null}

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

      <div className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#dfe3e8] bg-[rgba(255,255,255,0.96)] px-[16px] py-[12px] backdrop-blur-sm shadow-[0_-8px_24px_rgba(15,23,42,0.08)] sm:px-[24px]">
        <div
          className={`mx-auto flex w-full max-w-[1280px] items-center gap-[12px] ${
            step > 1 ? "justify-between" : "justify-end"
          }`}
        >
          {step > 1 ? (
            <Button
              size="large"
              disabled={isSubmittingOffer}
              onClick={(e) => {
                setStep(step - 1);
                e.preventDefault();
              }}
            >
              Previous
            </Button>
          ) : null}
          <Button
            size="large"
            style={{ backgroundColor: "#008060", borderColor: "#008060", color: "#fff" }}
            disabled={isSubmittingOffer}
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
            {isSubmittingOffer
              ? "Saving…"
              : step === 4
                ? initialOffer
                  ? "Update Offer"
                  : "Create Offer"
                : "Next"}
          </Button>
        </div>
      </div>
    </fetcher.Form>
  );
}
