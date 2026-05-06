import type {
  CompleteBundleBar,
  DifferentProductsDiscountRule,
  FreeGiftRule,
  ProgressiveGiftsConfig,
} from "../../../utils/offerParsing";
import type { OfferTypeId } from "./offerTypeOptions";
import type { RulePresentationPatch } from "./unifiedRulePresentation";
import type { UnifiedRuleValuePatch } from "./unifiedRuleValues";
import type { UnifiedRuleNode } from "./unifiedRulesSchema";

export type DraftDiscountRule = {
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

export type DraftBxgyDiscountRule = {
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

export type DraftSelectedProduct = {
  id: string;
  title: string;
  image: string;
  price: string;
  variantsCount: number;
  hasSubscription: boolean;
};

export type CampaignDraft = {
  offerType: OfferTypeId;
  selectedProductsData: DraftSelectedProduct[];
  discountRules: DraftDiscountRule[];
  normalizedDiscountRules: DraftDiscountRule[];
  bxgyDiscountRules: DraftBxgyDiscountRule[];
  differentProductsDiscountRules: DifferentProductsDiscountRule[];
  buyProducts: string[];
  getProducts: string[];
  completeBundleBars: CompleteBundleBar[];
  activeBundleBarId: string;
  productBundleEnabled: boolean;
  productBundleTitle: string;
  productBundleSubtitle: string;
  productBundleMinQuantity: number;
  productBundleProductIds: string[];
  productBundleProductsData: DraftSelectedProduct[];
  subscriptionEnabled: boolean;
  subscriptionTitle: string;
  subscriptionSubtitle: string;
  oneTimeTitle: string;
  oneTimeSubtitle: string;
  subscriptionPosition: "below-bundle-bars";
  subscriptionDefaultSelected: boolean;
  shouldShowSubscriptionPreview: boolean;
  allSelectedProductsHaveSubscription: boolean;
  shouldShowSubscriptionExplanation: boolean;
  subscriptionExplanationTitle: string;
  subscriptionExplanationBody: string;
  freeGiftTriggerProducts: string[];
  giftProductsData: DraftSelectedProduct[];
  freeGiftRules: FreeGiftRule[];
  progressiveGifts: ProgressiveGiftsConfig;
  checkboxUpsellsEnabled: boolean;
  checkboxUpsellsTitle: string;
  checkboxUpsellsSubtitle: string;
  checkboxUpsellsDefaultChecked: boolean;
  stickyAddToCartEnabled: boolean;
  stickyAddToCartTitle: string;
  stickyAddToCartSubtitle: string;
  stickyAddToCartButtonText: string;
  unifiedRulesSnapshot: UnifiedRuleNode[];
};

export type CampaignDraftActions = {
  setOfferType: (value: OfferTypeId) => void;
  setSelectedProductsData: React.Dispatch<
    React.SetStateAction<DraftSelectedProduct[]>
  >;
  handleSelectProducts: (
    type?: "buy" | "get" | "gift" | "normal" | "product_bundle",
  ) => void | Promise<void>;
  setDiscountRules: React.Dispatch<React.SetStateAction<DraftDiscountRule[]>>;
  setBxgyDiscountRules: React.Dispatch<
    React.SetStateAction<DraftBxgyDiscountRule[]>
  >;
  setDifferentProductsDiscountRules: React.Dispatch<
    React.SetStateAction<DifferentProductsDiscountRule[]>
  >;
  setActiveBundleBarId: (barId: string) => void;
  addCompleteBundleBar: (type: "quantity-break-same" | "bxgy") => void;
  removeCompleteBundleBar: (barId: string) => void;
  clearCompleteBundleBars: () => void;
  updateCompleteBundleBar: (
    barId: string,
    patch: Partial<CompleteBundleBar>,
  ) => void;
  handleSelectProductsForBundleBar: (barId: string) => void | Promise<void>;
  appendProductsToBundleBar: (barId: string) => void | Promise<void>;
  setProductBundleEnabled: (value: boolean) => void;
  setProductBundleTitle: (value: string) => void;
  setProductBundleSubtitle: (value: string) => void;
  setProductBundleMinQuantity: (value: number) => void;
  setCheckboxUpsellsEnabled: (value: boolean) => void;
  setCheckboxUpsellsTitle: (value: string) => void;
  setCheckboxUpsellsSubtitle: (value: string) => void;
  setCheckboxUpsellsDefaultChecked: (value: boolean) => void;
  setStickyAddToCartEnabled: (value: boolean) => void;
  setStickyAddToCartTitle: (value: string) => void;
  setStickyAddToCartSubtitle: (value: string) => void;
  setStickyAddToCartButtonText: (value: string) => void;
  setSubscriptionEnabled: (value: boolean) => void;
  setSubscriptionTitle: (value: string) => void;
  setSubscriptionSubtitle: (value: string) => void;
  setOneTimeTitle: (value: string) => void;
  setOneTimeSubtitle: (value: string) => void;
  setSubscriptionPosition: (value: "below-bundle-bars") => void;
  setSubscriptionDefaultSelected: (value: boolean) => void;
  setFreeGiftTriggerProducts: React.Dispatch<
    React.SetStateAction<string[]>
  >;
  setFreeGiftRules: React.Dispatch<React.SetStateAction<FreeGiftRule[]>>;
  selectBxgyRewardProducts: (ruleIndex: number) => void | Promise<void>;
  selectFreeGiftRewardProducts: (ruleIndex: number) => void | Promise<void>;
  setProgressiveGifts: (value: ProgressiveGiftsConfig) => void;
  updateUnifiedRulePresentation: (
    id: string,
    patch: RulePresentationPatch,
  ) => void;
  updateUnifiedRuleValues: (
    id: string,
    patch: UnifiedRuleValuePatch,
  ) => void;
};
