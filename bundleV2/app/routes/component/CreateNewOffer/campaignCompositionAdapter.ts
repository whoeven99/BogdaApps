import type {
  FreeGiftRule,
} from "../../../utils/offerParsing";
import type {
  CampaignDraft,
  CampaignDraftActions,
  DraftBxgyDiscountRule,
  DraftDiscountRule,
} from "./campaignDraft";
import {
  adaptBxgyRules,
  adaptCompleteBundleBars,
  adaptDiscountRules,
  adaptDifferentProductsRules,
  adaptFreeGiftRules,
} from "./unifiedRulesAdapters";
import type { UnifiedRuleNode } from "./unifiedRulesSchema";

export type CampaignBarType =
  | "quantity_break"
  | "bxgy"
  | "free_gift";

export type CampaignBarItem = {
  id: string;
  type: CampaignBarType;
  title: string;
  summary: string;
  enabled: boolean;
  isDefault: boolean;
  sourceRef: {
    collection: "discountRules" | "bxgyDiscountRules" | "freeGiftRules";
    index: number;
  };
  supportState?: "supported" | "draft_only" | "unsupported";
};

export type StepTwoModuleId =
  | "product_bundle"
  | "complete_bundle"
  | "subscription"
  | "countdown"
  | "checkbox_upsells"
  | "progressive_gifts"
  | "sticky_add_to_cart";

export type CampaignModuleItem = {
  id: StepTwoModuleId;
  label: string;
  description: string;
  enabled: boolean;
  toggleable: boolean;
};

function getDraftDiscountRuleType(rule: DraftDiscountRule): CampaignBarType {
  if (rule.logicType === "bxgy") return "bxgy";
  if (rule.rewardType === "gift_product") return "free_gift";
  return "quantity_break";
}

function buildQuantityBreakSummary(rule: DraftDiscountRule) {
  if (rule.logicType === "bxgy") {
    return `Buy ${rule.buyQuantity || 2}, get ${rule.getQuantity || 1}`;
  }
  if (rule.rewardType === "gift_product") {
    return `Unlock ${rule.giftQuantity || 1} free gift${(rule.giftQuantity || 1) > 1 ? "s" : ""}`;
  }
  return `${Math.max(1, Number(rule.count) || 1)} items • ${Math.max(0, Number(rule.discountPercent) || 0)}% off`;
}

function buildBxgySummary(rule: DraftBxgyDiscountRule) {
  return `Buy ${rule.buyQuantity || 2}, get ${rule.getQuantity || 1} • ${Math.max(0, Number(rule.discountPercent) || 0)}% off`;
}

function buildFreeGiftSummary(rule: FreeGiftRule) {
  return `Trigger at ${Math.max(1, Number(rule.count) || 1)} • ${Math.max(1, Number(rule.giftQuantity) || 1)} free gift${(rule.giftQuantity || 1) > 1 ? "s" : ""}`;
}

export function getCampaignCompositionBars(
  draft: CampaignDraft,
): CampaignBarItem[] {
  const draftRuleBars = draft.discountRules.map((rule, index) => {
    const type = getDraftDiscountRuleType(rule);
    return {
      id: rule.id || `discount-rule-${index + 1}`,
      type,
      title:
        rule.title ||
        (type === "bxgy"
          ? `Bar #${index + 1} - Buy X, Get Y`
          : type === "free_gift"
            ? `Bar #${index + 1} - Free gift`
            : `Bar #${index + 1} - Quantity break`),
      summary: rule.subtitle || buildQuantityBreakSummary(rule),
      enabled: true,
      isDefault: !!rule.isDefault,
      sourceRef: {
        collection: "discountRules" as const,
        index,
      },
      supportState: "supported" as const,
    };
  });

  const bxgyBars = draft.bxgyDiscountRules.map((rule, index) => ({
    id: `bxgy-rule-${index + 1}`,
    type: "bxgy" as const,
    title: rule.title || `Bar #${index + 1} - Buy X, Get Y`,
    summary: rule.subtitle || buildBxgySummary(rule),
    enabled: true,
    isDefault: !!rule.isDefault,
    sourceRef: {
      collection: "bxgyDiscountRules" as const,
      index,
    },
    supportState: "supported" as const,
  }));

  const freeGiftBars = draft.freeGiftRules.map((rule, index) => ({
    id: `free-gift-rule-${index + 1}`,
    type: "free_gift" as const,
    title: rule.title || `Bar #${index + 1} - Free gift`,
    summary: rule.subtitle || buildFreeGiftSummary(rule),
    enabled: true,
    isDefault: !!rule.isDefault,
    sourceRef: {
      collection: "freeGiftRules" as const,
      index,
    },
    supportState: "supported" as const,
  }));

  return [...draftRuleBars, ...bxgyBars, ...freeGiftBars];
}

export function getCampaignCompositionModules(
  draft: CampaignDraft,
  options: { showCountdownBlock: boolean },
): CampaignModuleItem[] {
  return [
    {
      id: "product_bundle",
      label: "Product bundle",
      description: "Bundle-specific conditions and grouped product selection.",
      enabled: draft.productBundleEnabled,
      toggleable: true,
    },
    {
      id: "complete_bundle",
      label: "Complete bundle",
      description: "Optional component for adding and editing bundled products.",
      enabled:
        draft.offerType === "complete-bundle" || draft.completeBundleBars.length > 0,
      toggleable: draft.offerType !== "complete-bundle",
    },
    {
      id: "subscription",
      label: "Subscriptions",
      description: "Subscription option and purchase mode messaging.",
      enabled: draft.subscriptionEnabled,
      toggleable: true,
    },
    {
      id: "countdown",
      label: "Countdown timer",
      description: "Condition-facing countdown messaging inside the offer.",
      enabled: options.showCountdownBlock,
      toggleable: true,
    },
    {
      id: "checkbox_upsells",
      label: "Checkbox upsells",
      description: "Additional upsell toggles linked to the offer.",
      enabled: draft.checkboxUpsellsEnabled,
      toggleable: true,
    },
    {
      id: "progressive_gifts",
      label: "Progressive gifts",
      description: "Reward unlocks that extend beyond the main bars.",
      enabled: draft.progressiveGifts.enabled,
      toggleable: true,
    },
    {
      id: "sticky_add_to_cart",
      label: "Sticky add to cart",
      description: "Persistent cart CTA companion module.",
      enabled: draft.stickyAddToCartEnabled,
      toggleable: true,
    },
  ];
}

export function getCampaignCompositionRulesSnapshot(
  draft: CampaignDraft,
): UnifiedRuleNode[] {
  const rules: UnifiedRuleNode[] = [];

  if (draft.discountRules.length > 0) {
    rules.push(...adaptDiscountRules("quantity-breaks-same", draft.discountRules));
  }

  if (draft.bxgyDiscountRules.length > 0) {
    rules.push(
      ...adaptBxgyRules(
        draft.bxgyDiscountRules,
        draft.buyProducts,
        draft.getProducts,
      ),
    );
  }

  if (draft.freeGiftRules.length > 0) {
    rules.push(
      ...adaptFreeGiftRules(
        draft.freeGiftRules,
        draft.freeGiftTriggerProducts,
        draft.giftProductsData.map((product) => String(product.id)),
      ),
    );
  }

  if (draft.differentProductsDiscountRules.length > 0) {
    rules.push(...adaptDifferentProductsRules(draft.differentProductsDiscountRules));
  }

  if (draft.completeBundleBars.length > 0) {
    rules.push(...adaptCompleteBundleBars(draft.completeBundleBars));
  }

  return rules;
}

export function orderCampaignCompositionBars(
  bars: CampaignBarItem[],
  orderedIds: string[],
): CampaignBarItem[] {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  return [...bars].sort((a, b) => {
    const left = orderMap.get(a.id);
    const right = orderMap.get(b.id);
    if (left === undefined && right === undefined) return 0;
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    return left - right;
  });
}

export function orderCampaignCompositionRules(
  rules: UnifiedRuleNode[],
  orderedIds: string[],
): UnifiedRuleNode[] {
  const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
  return [...rules].sort((a, b) => {
    const left = orderMap.get(a.id);
    const right = orderMap.get(b.id);
    if (left === undefined && right === undefined) return 0;
    if (left === undefined) return 1;
    if (right === undefined) return -1;
    return left - right;
  });
}

function buildDefaultDiscountRule(type: CampaignBarType): DraftDiscountRule {
  if (type === "bxgy") {
    return {
      count: 2,
      discountPercent: 100,
      title: "",
      subtitle: "",
      badge: "",
      isDefault: false,
      logicType: "bxgy",
      buyQuantity: 2,
      getQuantity: 1,
      maxUsesPerOrder: 1,
      rewardType: "percentage_off",
      rewardProductIds: [],
      discountClass: "product",
    };
  }

  if (type === "free_gift") {
    return {
      count: 2,
      discountPercent: 0,
      title: "",
      subtitle: "",
      badge: "",
      isDefault: false,
      rewardType: "gift_product",
      rewardProductIds: [],
      giftQuantity: 1,
      discountClass: "product",
    };
  }

  return {
    count: 2,
    discountPercent: 10,
    title: "",
    subtitle: "",
    badge: "",
    isDefault: false,
    rewardType: "percentage_off",
    discountClass: "product",
  };
}

export function appendCampaignCompositionBar(
  type: CampaignBarType,
  draft: CampaignDraft,
  actions: CampaignDraftActions,
) {
  if (draft.offerType === "quantity-breaks-same") {
    actions.setDiscountRules((prev) => [...prev, buildDefaultDiscountRule(type)]);
    return;
  }

  if (type === "bxgy") {
    actions.setBxgyDiscountRules((prev) => [
      ...prev,
      {
        count: 2,
        buyQuantity: 2,
        getQuantity: 1,
        buyProductIds: [],
        getProductIds: [],
        discountPercent: 100,
        maxUsesPerOrder: 1,
        title: "",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
    ]);
    return;
  }

  if (type === "free_gift") {
    actions.setFreeGiftRules((prev) => [
      ...prev,
      {
        count: 2,
        giftQuantity: 1,
        title: "",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
    ]);
    return;
  }

  actions.setDiscountRules((prev) => [...prev, buildDefaultDiscountRule("quantity_break")]);
}

export function removeCampaignCompositionBar(
  bar: CampaignBarItem,
  actions: CampaignDraftActions,
) {
  switch (bar.sourceRef.collection) {
    case "discountRules":
      actions.setDiscountRules((prev) =>
        prev.filter((_, index) => index !== bar.sourceRef.index),
      );
      return;
    case "bxgyDiscountRules":
      actions.setBxgyDiscountRules((prev) =>
        prev.filter((_, index) => index !== bar.sourceRef.index),
      );
      return;
    case "freeGiftRules":
      actions.setFreeGiftRules((prev) =>
        prev.filter((_, index) => index !== bar.sourceRef.index),
      );
      return;
  }
}
