import {
  buildDraftRuleId,
  getBxgyDisplayMeta,
  isCompleteBundleSingleBar,
} from "../../../utils/offerParsing";
import { resolvePresentationTextWithSource } from "./builderStandardDisplayResolver";
import { resolveBuilderBxgyDisplay } from "./bxgyDisplayResolver";
import type {
  CampaignDraft,
  CampaignDraftActions,
  DraftDiscountRule,
} from "./campaignDraft";
import {
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";

export type CampaignBarType =
  | "single_purchase"
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
    collection:
      | "discountRules"
      | "differentProductsDiscountRules"
      | "bxgyDiscountRules"
      | "freeGiftRules";
    ruleId: string;
  };
  supportState?: "supported" | "draft_only" | "unsupported";
};

export type StepTwoModuleId =
  | "complete_bundle"
  | "subscription"
  | "countdown"
  | "checkbox_upsells"
  | "progressive_gifts";

export type CampaignModuleItem = {
  id: StepTwoModuleId;
  label: string;
  description: string;
  enabled: boolean;
  toggleable: boolean;
};

function hasConfiguredDiscountRules(rules: DraftDiscountRule[]): boolean {
  return rules.length > 0;
}

function hasConfiguredCompleteBundleBars(bars: CampaignDraft["completeBundleBars"]): boolean {
  return bars.some((bar) => !isCompleteBundleSingleBar(bar));
}

function getCampaignBarTypeFromUnifiedRule(rule: UnifiedRuleNode): CampaignBarType {
  if (rule.type === "single_purchase") return "single_purchase";
  if (rule.type === "bxgy") return "bxgy";
  if (rule.type === "free_gift") return "free_gift";
  return "quantity_break";
}

function getSourceCollectionForUnifiedRule(
  rule: UnifiedRuleNode,
): CampaignBarItem["sourceRef"]["collection"] {
  switch (rule.sourceOfferType) {
    case "quantity-breaks-different":
      return "differentProductsDiscountRules";
    case "bxgy":
      return "bxgyDiscountRules";
    case "free-gift":
      return "freeGiftRules";
    default:
      return "discountRules";
  }
}

function getThresholdSummary(rule: UnifiedRuleNode): string {
  switch (rule.condition.kind) {
    case "cart_amount":
      return `Spend ${Math.max(0, Number(rule.condition.amountThreshold) || 0)}`;
    case "buy_x_get_y":
      return getBxgyDisplayMeta(rule.condition).summary;
    case "item_quantity":
      return `${Math.max(1, Number(rule.condition.count) || 1)} item${Math.max(1, Number(rule.condition.count) || 1) === 1 ? "" : "s"}`;
    default:
      return "Offer rule";
  }
}

function buildUnifiedBarSummary(rule: UnifiedRuleNode): string {
  if (rule.type === "single_purchase") {
    return "Standalone purchase • Standard price";
  }
  const thresholdLabel = getThresholdSummary(rule);

  switch (rule.reward.kind) {
    case "gift_product":
      return `${thresholdLabel} • ${Math.max(1, Number(rule.reward.giftQuantity) || 1)} gift reward${(rule.reward.giftQuantity || 1) > 1 ? "s" : ""}`;
    case "free_shipping":
      return `${thresholdLabel} • Free shipping`;
    case "percentage_off":
      return `${thresholdLabel} • ${Math.max(0, Number(rule.reward.discountPercent) || 0)}% off${rule.reward.discountClass === "order" ? " order" : ""}`;
    default:
      return thresholdLabel;
  }
}

function getDifferentProductsSharedPoolIds(draft: CampaignDraft): string[] {
  const sharedPool =
    draft.differentProductsEligibleProductsData.length > 0
      ? draft.differentProductsEligibleProductsData
      : draft.selectedProductsData;
  return sharedPool.map((product) => String(product.id));
}

function getNextDifferentProductsCount(
  rules: CampaignDraft["differentProductsDiscountRules"],
  tierType: "simple" | "bxgy",
): number {
  const relevantRules = rules.filter((rule) => rule.tierType === tierType);
  const maxCount = relevantRules.reduce(
    (highest, rule) => Math.max(highest, Math.max(1, Math.trunc(Number(rule.count) || 1))),
    1,
  );
  return Math.max(2, maxCount + 1);
}

function buildUnifiedBarTitle(
  rule: UnifiedRuleNode,
  indexWithinCollection: number,
): string {
  const displayIndex = indexWithinCollection + 1;
  switch (rule.type) {
    case "single_purchase":
      return `Bar #${displayIndex} - Single`;
    case "bxgy":
      return `Bar #${displayIndex} - Buy X, Get Y`;
    case "free_gift":
      return `Reward #${displayIndex} - Gift reward`;
    case "order_discount":
      return `Bar #${displayIndex} - Order discount`;
    case "free_shipping":
      return `Bar #${displayIndex} - Shipping discount`;
    case "quantity_break":
      return rule.sourceOfferType === "quantity-breaks-different"
        ? `Bar #${displayIndex} - Mix & match`
        : `Bar #${displayIndex} - Quantity break`;
    default:
      return `Bar #${displayIndex} - Offer rule`;
  }
}

function isPrimarySingleRuleSource(
  offerType: CampaignDraft["offerType"],
  sourceOfferType: UnifiedRuleNode["sourceOfferType"],
): boolean {
  if (offerType === "subscription") {
    return sourceOfferType === "quantity-breaks-same";
  }
  return sourceOfferType === offerType;
}

function isBarRule(rule: UnifiedRuleNode, draft: CampaignDraft): boolean {
  if (rule.type === "complete_bundle" || rule.type === "subscription") {
    return false;
  }
  if (rule.type === "single_purchase") {
    return draft.offerType !== "complete-bundle" &&
      isPrimarySingleRuleSource(draft.offerType, rule.sourceOfferType);
  }
  return true;
}

function buildCampaignCompositionBarCounters(rules: UnifiedRuleNode[]) {
  const counters = new Map<CampaignBarItem["sourceRef"]["collection"], number>();

  return rules.map((rule) => {
    const collection = getSourceCollectionForUnifiedRule(rule);
    const nextCount = counters.get(collection) ?? 0;
    counters.set(collection, nextCount + 1);
    return {
      rule,
      collection,
      indexWithinCollection: nextCount,
    };
  });
}

export function getCampaignCompositionBars(
  draft: CampaignDraft,
): CampaignBarItem[] {
  return buildCampaignCompositionBarCounters(
    draft.unifiedRulesSnapshot.filter((rule) => isBarRule(rule, draft)),
  ).map(({ rule, collection, indexWithinCollection }) => ({
    id: rule.id,
    type: getCampaignBarTypeFromUnifiedRule(rule),
    title:
      rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y"
        ? resolveBuilderBxgyDisplay(rule.condition, rule.presentation).title
        : resolvePresentationTextWithSource(
            rule.presentation.title,
            rule.presentation.titleSource,
            buildUnifiedBarTitle(rule, indexWithinCollection),
          ),
    summary:
      rule.type === "bxgy"
        ? resolveBuilderBxgyDisplay(rule.condition, rule.presentation).subtitle ||
          buildUnifiedBarSummary(rule)
        : resolvePresentationTextWithSource(
            rule.presentation.subtitle,
            rule.presentation.subtitleSource,
            buildUnifiedBarSummary(rule),
          ),
    enabled: true,
    isDefault: !!rule.presentation.isDefault,
    sourceRef: {
      collection,
      ruleId: rule.id,
    },
    supportState: rule.publishSupport,
  }));
}

export function getCampaignCompositionModules(
  draft: CampaignDraft,
  options: { showCountdownBlock: boolean },
): CampaignModuleItem[] {
  const modules: CampaignModuleItem[] = [
    {
      id: "complete_bundle",
      label: "Complete bundle",
      description: "Optional component for adding and editing bundled products.",
      enabled:
        draft.offerType === "complete-bundle" ||
        hasConfiguredCompleteBundleBars(draft.completeBundleBars),
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
  ];

  return modules.filter(
    (module) =>
      module.id !== "subscription" &&
      module.id !== "complete_bundle" &&
      module.id !== "progressive_gifts" &&
      module.id !== "countdown" &&
      module.id !== "checkbox_upsells",
  );
}

export function getCampaignCompositionRulesSnapshot(
  draft: CampaignDraft,
): UnifiedRuleNode[] {
  return draft.unifiedRulesSnapshot;
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

function buildDefaultDiscountRule(
  type: CampaignBarType,
  offerType?: CampaignDraft["offerType"],
): DraftDiscountRule {
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
      discountClass: "order",
    };
  }

  if (offerType === "shipping-discount") {
    return {
      count: 2,
      discountPercent: 0,
      title: "",
      subtitle: "",
      badge: "",
      isDefault: false,
      rewardType: "free_shipping",
      offerKind: "free_shipping",
      discountClass: "shipping",
      conditionType: "item_quantity",
    };
  }

  if (offerType === "order-discount") {
    return {
      count: 2,
      discountPercent: 10,
      title: "",
      subtitle: "",
      badge: "",
      isDefault: false,
      rewardType: "percentage_off",
      offerKind: "percentage_discount",
      discountClass: "order",
      conditionType: "item_quantity",
    };
  }

  if (offerType === "coupon") {
    return {
      count: 2,
      discountPercent: 15,
      title: "",
      subtitle: "",
      badge: "",
      isDefault: false,
      rewardType: "percentage_off",
      offerKind: "percentage_discount",
      discountClass: "order",
      conditionType: "item_quantity",
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
  // #region debug-point A:append-bar
  fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"step2-add-bar",runId:"pre-fix",hypothesisId:"A",location:"campaignCompositionAdapter.ts:356",msg:"[DEBUG] appendCampaignCompositionBar invoked",data:{offerType:draft.offerType,barType:type,discountRules:draft.discountRules.length,differentProductsRules:draft.differentProductsDiscountRules.length,bxgyRules:draft.bxgyDiscountRules.length,freeGiftRules:draft.freeGiftRules.length,completeBundleBars:draft.completeBundleBars.length},ts:Date.now()})}).catch(()=>{});
  // #endregion
  if (draft.offerType === "quantity-breaks-different" && type === "quantity_break") {
    const nextCount = getNextDifferentProductsCount(
      draft.differentProductsDiscountRules,
      "simple",
    );
    const sharedProductIds = getDifferentProductsSharedPoolIds(draft);
    actions.setDifferentProductsDiscountRules((prev) => [
      ...prev,
      {
        id: buildDraftRuleId("different_products_rule"),
        count: nextCount,
        discountPercent: 10,
        buyQuantity: nextCount,
        getQuantity: 0,
        buyProductIds: sharedProductIds,
        getProductIds: [],
        maxUsesPerOrder: 1,
        tierType: "simple",
        title: "",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
    ]);
    return;
  }

  if (draft.offerType === "quantity-breaks-different" && type === "bxgy") {
    const nextCount = getNextDifferentProductsCount(
      draft.differentProductsDiscountRules,
      "bxgy",
    );
    const sharedProductIds = getDifferentProductsSharedPoolIds(draft);
    actions.setDifferentProductsDiscountRules((prev) => [
      ...prev,
      {
        id: buildDraftRuleId("different_products_rule"),
        count: nextCount,
        discountPercent: 100,
        buyQuantity: nextCount,
        getQuantity: 1,
        buyProductIds: sharedProductIds,
        getProductIds: sharedProductIds,
        maxUsesPerOrder: 1,
        tierType: "bxgy",
        title: "",
        subtitle: "",
        badge: "",
        isDefault: false,
      },
    ]);
    return;
  }

  if (draft.offerType === "quantity-breaks-same") {
    actions.setDiscountRules((prev) => [...prev, buildDefaultDiscountRule(type, draft.offerType)]);
    return;
  }

  if (draft.offerType === "shipping-discount") {
    actions.setDiscountRules((prev) => [...prev, buildDefaultDiscountRule(type, draft.offerType)]);
    return;
  }

  if (draft.offerType === "order-discount") {
    actions.setDiscountRules((prev) => [...prev, buildDefaultDiscountRule(type, draft.offerType)]);
    return;
  }

  if (draft.offerType === "coupon") {
    actions.setDiscountRules((prev) => [...prev, buildDefaultDiscountRule(type, draft.offerType)]);
    return;
  }

  if (type === "bxgy") {
    actions.setBxgyDiscountRules((prev) => [
      ...prev,
      {
          id: buildDraftRuleId("bxgy_rule"),
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
          id: buildDraftRuleId("free_gift_rule"),
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

  actions.setDiscountRules((prev) => [
    ...prev,
    buildDefaultDiscountRule("quantity_break", draft.offerType),
  ]);
}

export function removeCampaignCompositionBar(
  bar: CampaignBarItem,
  actions: CampaignDraftActions,
) {
  switch (bar.sourceRef.collection) {
    case "discountRules":
      actions.setDiscountRules((prev) =>
        prev.filter((rule, index) => (rule.id || `discount-rule-${index + 1}`) !== bar.sourceRef.ruleId),
      );
      return;
    case "differentProductsDiscountRules":
      actions.setDifferentProductsDiscountRules((prev) =>
        prev.filter(
          (rule, index) =>
            (rule.id || `different-products-rule-${index + 1}`) !== bar.sourceRef.ruleId,
        ),
      );
      return;
    case "bxgyDiscountRules":
      actions.setBxgyDiscountRules((prev) =>
        prev.filter((rule, index) => (rule.id || `bxgy-rule-${index + 1}`) !== bar.sourceRef.ruleId),
      );
      return;
    case "freeGiftRules":
      actions.setFreeGiftRules((prev) =>
        prev.filter(
          (rule, index) =>
            (rule.id || `free-gift-rule-${index + 1}`) !== bar.sourceRef.ruleId,
        ),
      );
      return;
  }
}
