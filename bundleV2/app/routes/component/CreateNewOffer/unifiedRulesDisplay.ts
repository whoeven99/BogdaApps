import type { DisplayCustomizerItem } from "./OfferComponentsDisplayCustomizer";
import {
  describeUnifiedRuleCondition,
  describeUnifiedRuleReward,
  getUnifiedRuleTypeLabel,
  type UnifiedRuleNode,
} from "./unifiedRulesSchema";
import { resolveBuilderBxgyDisplay } from "./bxgyDisplayResolver";

function buildPlaceholders(rule: UnifiedRuleNode): DisplayCustomizerItem["placeholders"] {
  switch (rule.type) {
    case "single_purchase":
      return {
        title: "e.g. Single",
        subtitle: "e.g. Standard price",
        badge: "e.g. Base option",
      };
    case "bxgy":
      return {
        title: "e.g. Buy 2, Get 3",
        subtitle: "",
        badge: "e.g. Best reward",
      };
    case "free_gift":
      return {
        title: "e.g. Free sample",
        subtitle: "e.g. Buy more and unlock a gift",
        badge: "e.g. Gift included",
      };
    case "complete_bundle":
      return {
        title: "e.g. Complete the bundle",
      };
    case "free_shipping":
      return {
        title: "e.g. Free shipping unlocked",
        subtitle: "e.g. Reach this tier for free shipping",
        badge: "e.g. Shipping perk",
      };
    case "order_discount":
      return {
        title: "e.g. Order discount",
        subtitle: "e.g. Save more on the full order",
        badge: "e.g. Cart saver",
      };
    case "subscription":
      return {
        title: "e.g. Subscribe & save",
        subtitle: "e.g. Recurring purchase option",
        badge: "e.g. Subscription",
      };
    case "quantity_break":
    default:
      return {
        title: "e.g. Bundle & save",
        subtitle: "e.g. Buy more and save more",
        badge: "e.g. Most popular",
      };
  }
}

function buildEditableFields(rule: UnifiedRuleNode): DisplayCustomizerItem["fields"] {
  if (rule.sourceOfferType === "complete-bundle") {
    return {
      title: true,
      subtitle: false,
      badge: false,
      isDefault: false,
    };
  }

  return {
    title: true,
    subtitle: true,
    badge: true,
    isDefault: true,
  };
}

function buildDisplayTitle(rule: UnifiedRuleNode, index: number): string {
  if (rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y") {
    return resolveBuilderBxgyDisplay(rule.condition, rule.presentation).title;
  }
  return (
    rule.presentation.title ||
    `${getUnifiedRuleTypeLabel(rule.type)} Rule ${index + 1}`
  );
}

export function buildUnifiedDisplayCustomizerItems(
  rules: UnifiedRuleNode[],
): DisplayCustomizerItem[] {
  return rules.map((rule, index) => ({
    id: rule.id,
    title:
      rule.type === "bxgy" && rule.condition.kind === "buy_x_get_y"
        ? resolveBuilderBxgyDisplay(rule.condition, rule.presentation).title
        : rule.presentation.title || "",
    displayTitle: buildDisplayTitle(rule, index),
    description: `${describeUnifiedRuleCondition(rule.condition)} • ${describeUnifiedRuleReward(rule.reward)}`,
    subtitle: rule.presentation.subtitle || "",
    badge: rule.presentation.badge || "",
    isDefault: !!rule.presentation.isDefault,
    fields: buildEditableFields(rule),
    placeholders: buildPlaceholders(rule),
  }));
}

export function buildSubscriptionDisplayCustomizerItems(input: {
  subscriptionTitle: string;
  subscriptionSubtitle: string;
  subscriptionDefaultSelected: boolean;
  oneTimeTitle: string;
  oneTimeSubtitle: string;
}): DisplayCustomizerItem[] {
  return [
    {
      id: "subscription-option",
      title: input.subscriptionTitle || "",
      displayTitle: input.subscriptionTitle || "Subscription Option",
      description: "Primary recurring purchase option shown beside the main offer.",
      subtitle: input.subscriptionSubtitle || "",
      isDefault: input.subscriptionDefaultSelected,
      fields: { title: true, subtitle: true, badge: false, isDefault: true },
      placeholders: {
        title: "e.g. Subscribe & Save 20%",
        subtitle: "e.g. Delivered weekly",
      },
    },
    {
      id: "one-time-option",
      title: input.oneTimeTitle || "",
      displayTitle: input.oneTimeTitle || "One-time Option",
      description: "Fallback one-time purchase option shown in the decision switcher.",
      subtitle: input.oneTimeSubtitle || "",
      fields: { title: true, subtitle: true, badge: false, isDefault: false },
      placeholders: {
        title: "e.g. One-time purchase",
        subtitle: "e.g. No subscription commitment",
      },
    },
  ];
}
