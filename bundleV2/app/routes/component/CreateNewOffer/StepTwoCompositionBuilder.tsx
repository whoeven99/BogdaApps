import { Button, Checkbox, Dropdown, Input, Modal, Select, Switch } from "antd";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CompleteBundleProduct } from "../../../utils/offerParsing";
import {
  getConditionTypeOptionsForRule,
  getDiscountTypeFromRule,
} from "./unifiedRuleModel";
import type {
  CampaignDraft,
  CampaignDraftActions,
  DraftBxgyDiscountRule,
  DraftDiscountRule,
} from "./campaignDraft";
import {
  appendCampaignCompositionBar,
  removeCampaignCompositionBar,
  type CampaignBarItem,
  type CampaignBarType,
  type CampaignModuleItem,
  type StepTwoModuleId,
} from "./campaignCompositionAdapter";
import CompleteBundleEditor from "./CompleteBundleEditor";
import { OfferRuleStatusPill } from "./OfferRulesShared";
import { ProgressiveGiftsSection } from "./ProgressiveGiftsSection";
import SubscriptionSettingsEditor from "./SubscriptionSettingsEditor";

type Props = {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  totalStoreProductsCount: number;
  activeTriggerSelectionMode: "all" | "collection" | "exclude" | "custom" | "inverse" | null;
  activeTriggerSelectionSummary: string;
  activeTriggerSelectionDetails: string[];
  onSelectAllTriggerProducts: () => void;
  onSelectTriggerProductsByCollection: () => void;
  onExcludeTriggerProducts: () => void;
  onInvertTriggerProducts: () => void;
  onCustomFilterTriggerProducts: () => void;
  bars: CampaignBarItem[];
  modules: CampaignModuleItem[];
  showCountdownBlock: boolean;
  setShowCountdownBlock: (value: boolean) => void;
  countdownLabel: string;
  setCountdownLabel: (value: string) => void;
  onMoveBarUp: (barId: string) => void;
  onMoveBarDown: (barId: string) => void;
  renderCompleteBundleProductPricingCard: (
    bar: CampaignDraft["completeBundleBars"][number],
    product: CompleteBundleProduct,
    productIdx: number,
    isFirstBar: boolean,
  ) => ReactNode;
  preview: ReactNode;
};

type ActiveModuleId = StepTwoModuleId | null;

const ADD_BAR_MENU_ITEMS: Array<{ key: CampaignBarType; label: string }> = [
  { key: "quantity_break", label: "Add Quantity break bar" },
  { key: "bxgy", label: "Add Buy X, get Y bar" },
  { key: "free_gift", label: "Add Free gift bar" },
];

const HIDDEN_BAR_TYPES: CampaignBarType[] = ["free_gift"];

function parsePositiveInt(value: string, fallback = 1) {
  const parsed = Math.trunc(Number(value) || fallback);
  return Math.max(1, parsed);
}

function parsePercent(value: string, fallback = 0) {
  const parsed = Number(value);
  return Math.max(0, Math.min(100, Number.isFinite(parsed) ? parsed : fallback));
}

function DetailSection({
  title,
  meta,
  actions,
  children,
}: {
  title: string;
  meta?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">{title}</h3>
            {meta ? (
              <span className="rounded-full bg-[#f4f6f8] px-2 py-[2px] text-[11px] font-medium text-[#5c6166]">
                {meta}
              </span>
            ) : null}
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div>{children}</div>
    </section>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>;
}

function BuilderSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-[#eef1f3] pt-4 first:border-t-0 first:pt-0">
      <div>
        <div className="text-[13px] font-semibold text-[#1c1f23]">{title}</div>
        {description ? (
          <div className="mt-1 text-[12px] text-[#5c6166]">{description}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function CompactActionRow({
  title,
  meta,
  actionLabel,
  onAction,
}: {
  title: string;
  meta: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[10px] bg-[#f6f8f9] px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-[#1c1f23]">{title}</div>
        <div className="mt-1 text-[12px] text-[#5c6166]">{meta}</div>
      </div>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}

function QuietEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-4 text-[13px] text-[#5c6166]">
      {children}
    </div>
  );
}

function matchesBarRuleId(
  value: { id?: string },
  index: number,
  fallbackPrefix: string,
  ruleId: string,
) {
  return (value.id || `${fallbackPrefix}-${index + 1}`) === ruleId;
}

function findDiscountRuleIndex(
  rules: CampaignDraft["discountRules"],
  ruleId: string,
) {
  return rules.findIndex((entry, index) =>
    matchesBarRuleId(entry, index, "discount-rule", ruleId),
  );
}

function findBxgyRuleIndex(
  rules: CampaignDraft["bxgyDiscountRules"],
  ruleId: string,
) {
  return rules.findIndex((entry, index) =>
    matchesBarRuleId(entry, index, "bxgy-rule", ruleId),
  );
}

function findFreeGiftRuleIndex(
  rules: CampaignDraft["freeGiftRules"],
  ruleId: string,
) {
  return rules.findIndex((entry, index) =>
    matchesBarRuleId(entry, index, "free-gift-rule", ruleId),
  );
}

function findDifferentProductsRuleIndex(
  rules: CampaignDraft["differentProductsDiscountRules"],
  ruleId: string,
) {
  return rules.findIndex((entry, index) =>
    matchesBarRuleId(entry, index, "different-products-rule", ruleId),
  );
}

function ProductPoolManager({
  selectedProducts,
  totalStoreProductsCount,
  activeSelectionMode,
  activeSelectionSummary,
  activeSelectionDetails,
  onSelectAll,
  onSelectByCollection,
  onExclude,
  onInvert,
  onCustomFilter,
  allowBulkSelection,
}: {
  selectedProducts: CampaignDraft["selectedProductsData"];
  totalStoreProductsCount: number;
  activeSelectionMode: "all" | "collection" | "exclude" | "custom" | "inverse" | null;
  activeSelectionSummary: string;
  activeSelectionDetails: string[];
  onSelectAll: () => void;
  onSelectByCollection: () => void;
  onExclude: () => void;
  onInvert: () => void;
  onCustomFilter: () => void;
  allowBulkSelection: boolean;
}) {
  const renderModeButton = (
    mode: "all" | "collection" | "exclude" | "custom" | "inverse",
    label: string,
    onClick: () => void,
  ) => (
    <Button
      block
      type={activeSelectionMode === mode ? "primary" : "default"}
      onClick={onClick}
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-3 rounded-[10px] border border-[#e3e8ed] bg-white p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[#1c1f23]">Trigger products</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {selectedProducts.length} selected
            {totalStoreProductsCount > 0 ? ` of ${totalStoreProductsCount} products` : ""} in the
            shared pool
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onCustomFilter}>
            {selectedProducts.length ? "Refine current pool" : "Open product picker"}
          </Button>
        </div>
      </div>

      {allowBulkSelection ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {renderModeButton("all", "Select all", onSelectAll)}
          {renderModeButton("collection", "Select by collection", onSelectByCollection)}
          {renderModeButton("exclude", "Exclude products", onExclude)}
          {renderModeButton("inverse", "Invert selection", onInvert)}
          {renderModeButton("custom", "Custom filter", onCustomFilter)}
        </div>
      ) : null}

      <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
        {allowBulkSelection
          ? "Choose a selection shortcut above, then confirm the final set in Shopify's native product picker when needed."
          : "Use Shopify's native product picker to choose the product for this step."}
        {allowBulkSelection && activeSelectionSummary ? (
          <>
            <div className="mt-2 text-[12px] font-medium text-[#1c1f23]">
              Current selection mode: {activeSelectionSummary}
            </div>
            {activeSelectionDetails.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {activeSelectionDetails.map((detail) => (
                  <OfferRuleStatusPill key={detail}>{detail}</OfferRuleStatusPill>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}

function getModuleStatusTone(module: CampaignModuleItem, isActive: boolean) {
  if (module.enabled && isActive) {
    return {
      container: "border-[#008060] bg-[#f5fff9]",
      badge: "bg-[#f0faf6] text-[#006e52]",
      label: "Configuring",
    };
  }
  if (module.enabled) {
    return {
      container: "border-[#b7e1d3] bg-white",
      badge: "bg-[#f0faf6] text-[#006e52]",
      label: "Enabled",
    };
  }
  return {
    container: isActive
      ? "border-[#c9ccd0] bg-[#f6f6f7]"
      : "border-[#e3e8ed] bg-white hover:border-[#c9ccd0]",
    badge: "bg-[#f4f6f8] text-[#5c6166]",
    label: "Optional",
  };
}

function BuilderBarCard({
  bar,
  actions,
  children,
}: {
  bar: CampaignBarItem;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-[#e6eaee] bg-white">
      <div className="border-b border-[#eef1f3] px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 text-[15px] font-semibold text-[#1c1f23]">{bar.title}</h3>
              {bar.isDefault ? (
                <OfferRuleStatusPill intent="success">
                  Default
                </OfferRuleStatusPill>
              ) : null}
              {bar.supportState === "draft_only" ? (
                <OfferRuleStatusPill intent="warning">
                  Draft only
                </OfferRuleStatusPill>
              ) : null}
            </div>
            <div className="mt-2 text-[12px] text-[#5c6166]">{bar.summary}</div>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className="space-y-5 px-4 py-4">{children}</div>
    </div>
  );
}

function SinglePurchaseBarDetail({
  bar,
  rule,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: {
    title?: string;
    subtitle?: string;
    badge?: string;
    isDefault?: boolean;
  };
  headerActions?: ReactNode;
  onChange: (patch: {
    title?: string;
    subtitle?: string;
    badge?: string;
    isDefault?: boolean;
  }) => void;
}) {
  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection
        title="Single purchase option"
        description="Keeps the standalone one-item purchase path when the storefront selector is replaced."
      >
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Title
            <Input
              size="large"
              className="mt-1"
              value={rule.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Single"
            />
          </label>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Subtitle
            <Input
              size="large"
              className="mt-1"
              value={rule.subtitle || ""}
              onChange={(e) => onChange({ subtitle: e.target.value })}
              placeholder="Standard price"
            />
          </label>
          <label className="block text-[13px] font-medium text-[#1c1f23] xl:col-span-2">
            Badge
            <Input
              size="large"
              className="mt-1"
              value={rule.badge || ""}
              onChange={(e) => onChange({ badge: e.target.value })}
              placeholder="Optional label"
            />
          </label>
        </FieldGrid>
        <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
          This bar is display-only. It keeps the standard single-item purchase option visible and
          never applies any discount logic.
        </div>
        <label className="flex items-center justify-between gap-3 rounded-[10px] border border-[#e3e8ed] bg-white px-4 py-3">
          <span className="text-[13px] font-medium text-[#1c1f23]">Default selected</span>
          <Switch
            checked={!!rule.isDefault}
            onChange={(checked) => onChange({ isDefault: checked })}
          />
        </label>
      </BuilderSection>
    </BuilderBarCard>
  );
}

function DiscountRuleBarDetail({
  bar,
  draft,
  rule,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  draft: CampaignDraft;
  rule: DraftDiscountRule;
  headerActions?: ReactNode;
  onChange: (patch: Partial<DraftDiscountRule>) => void;
}) {
  const rewardProductIds = Array.isArray(rule.rewardProductIds) ? rule.rewardProductIds : [];
  const productOptions = draft.selectedProductsData.map((product) => ({
    label: product.title,
    value: String(product.id),
  }));
  const supportsRewardScope = bar.type === "bxgy" || bar.type === "free_gift";
  const discountType = getDiscountTypeFromRule(rule);
  const conditionTypeOptions = getConditionTypeOptionsForRule(rule);
  const currentConditionType = conditionTypeOptions.some(
    (option) => option.value === (rule.conditionType || "item_quantity"),
  )
    ? (rule.conditionType || "item_quantity")
    : "item_quantity";
  const usesCartAmount = currentConditionType === "cart_amount";
  const usesShippingReward = rule.rewardType === "free_shipping";
  const usesGiftReward = rule.rewardType === "gift_product";
  const usesPercentageReward = rule.rewardType === "percentage_off";
  const isBxgy = discountType === "bxgy";

  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Trigger">
        <FieldGrid>
          {!isBxgy ? (
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              Condition type
              <Select
                size="large"
                className="mt-1"
                value={currentConditionType}
                options={conditionTypeOptions}
                disabled={conditionTypeOptions.length === 1}
                onChange={(value) =>
                  onChange({
                    conditionType: value as "item_quantity" | "cart_amount",
                  })
                }
              />
            </label>
          ) : null}
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            {usesCartAmount ? "Spend threshold" : "Trigger quantity"}
            <Input
              size="large"
              type="number"
              min={usesCartAmount ? 0.01 : 1}
              step={usesCartAmount ? 0.01 : 1}
              className="mt-1"
              value={usesCartAmount ? rule.amountThreshold || 0 : rule.count}
              onChange={(e) =>
                usesCartAmount
                  ? onChange({
                      amountThreshold: Math.max(0, Number(e.target.value) || 0),
                    })
                  : onChange({ count: parsePositiveInt(e.target.value, rule.count) })
              }
            />
          </label>
        </FieldGrid>
        {!isBxgy && conditionTypeOptions.length === 1 ? (
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
            Cart amount is currently available only for order discount, free gift, and free shipping rules in this builder path.
          </div>
        ) : null}
      </BuilderSection>

      <BuilderSection title="Reward">
        <FieldGrid>
          {usesPercentageReward && !isBxgy ? (
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              {rule.discountClass === "order" ? "Order discount (%)" : "Discount (%)"}
              <Input
                size="large"
                type="number"
                min={0}
                max={100}
                className="mt-1"
                value={rule.discountPercent}
                onChange={(e) =>
                  onChange({ discountPercent: parsePercent(e.target.value, rule.discountPercent) })
                }
              />
            </label>
          ) : null}

          {usesGiftReward ? (
            <>
              <label className="block text-[13px] font-medium text-[#1c1f23]">
                Gift quantity
                <Input
                  size="large"
                  type="number"
                  min={1}
                  className="mt-1"
                  value={rule.giftQuantity || 1}
                  onChange={(e) =>
                    onChange({
                      giftQuantity: parsePositiveInt(e.target.value, rule.giftQuantity || 1),
                    })
                  }
                />
              </label>
              <label className="block text-[13px] font-medium text-[#1c1f23] xl:col-span-2">
                Gift products
                <Select
                  mode="multiple"
                  size="large"
                  className="mt-1 w-full"
                  value={rewardProductIds}
                  options={productOptions}
                  onChange={(values) => onChange({ rewardProductIds: values })}
                  placeholder="Select gift products from the shared pool"
                  allowClear
                />
              </label>
            </>
          ) : null}

          {isBxgy ? (
            <>
              <label className="block text-[13px] font-medium text-[#1c1f23]">
                Buy quantity (X)
                <Input
                  size="large"
                  type="number"
                  min={1}
                  className="mt-1"
                  value={rule.buyQuantity || 2}
                  onChange={(e) =>
                    onChange({
                      buyQuantity: parsePositiveInt(e.target.value, rule.buyQuantity || 2),
                    })
                  }
                />
              </label>
              <label className="block text-[13px] font-medium text-[#1c1f23]">
                Get quantity (Y)
                <Input
                  size="large"
                  type="number"
                  min={1}
                  className="mt-1"
                  value={rule.getQuantity || 1}
                  onChange={(e) =>
                    onChange({
                      getQuantity: parsePositiveInt(e.target.value, rule.getQuantity || 1),
                    })
                  }
                />
              </label>
              <label className="block text-[13px] font-medium text-[#1c1f23]">
                Reward discount (%)
                <Input
                  size="large"
                  type="number"
                  min={0}
                  max={100}
                  className="mt-1"
                  value={rule.discountPercent}
                  onChange={(e) =>
                    onChange({ discountPercent: parsePercent(e.target.value, rule.discountPercent) })
                  }
                />
              </label>
              <label className="block text-[13px] font-medium text-[#1c1f23]">
                Max uses per order
                <Input
                  size="large"
                  type="number"
                  min={1}
                  className="mt-1"
                  value={rule.maxUsesPerOrder || 1}
                  onChange={(e) =>
                    onChange({
                      maxUsesPerOrder: parsePositiveInt(
                        e.target.value,
                        rule.maxUsesPerOrder || 1,
                      ),
                    })
                  }
                />
              </label>
              <label className="block text-[13px] font-medium text-[#1c1f23] xl:col-span-2">
                Reward products (Y)
                <Select
                  mode="multiple"
                  size="large"
                  className="mt-1 w-full"
                  value={rewardProductIds}
                  options={productOptions}
                  onChange={(values) => onChange({ rewardProductIds: values })}
                  placeholder="Leave empty to reuse the shared trigger pool"
                  allowClear
                />
              </label>
            </>
          ) : null}
        </FieldGrid>
        {supportsRewardScope || usesShippingReward ? (
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
            {usesShippingReward
              ? "Free shipping rules use the delivery discount function target and can unlock from item quantity or cart amount."
              : draft.selectedProductsData.length > 0
              ? "Reward selection is scoped to the shared product pool in this builder path."
              : "Add products to the shared product pool first, then choose the reward products for this bar."}
          </div>
        ) : null}
      </BuilderSection>
    </BuilderBarCard>
  );
}

function BxgyRuleBarDetail({
  bar,
  rule,
  actions,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: DraftBxgyDiscountRule;
  actions: CampaignDraftActions;
  headerActions?: ReactNode;
  onChange: (patch: Partial<DraftBxgyDiscountRule>) => void;
}) {
  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Trigger">
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Buy quantity (X)
            <Input
              size="large"
              type="number"
              min={1}
              className="mt-1"
              value={rule.buyQuantity}
              onChange={(e) => {
                const buyQuantity = parsePositiveInt(e.target.value, rule.buyQuantity);
                onChange({ buyQuantity, count: buyQuantity });
              }}
            />
          </label>
        </FieldGrid>
      </BuilderSection>

      <BuilderSection
        title="Reward"
      >
        <div className="rounded-[10px] bg-[#f6f8f9] px-3 py-2 text-[12px] text-[#5c6166]">
          Free items come from the same product and discount the cheapest
          eligible variant once per order.
        </div>
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Get quantity (Y)
            <Input
              size="large"
              type="number"
              min={1}
              className="mt-1"
              value={rule.getQuantity}
              onChange={(e) =>
                onChange({ getQuantity: parsePositiveInt(e.target.value, rule.getQuantity) })
              }
            />
          </label>
        </FieldGrid>
      </BuilderSection>
    </BuilderBarCard>
  );
}

function FreeGiftRuleBarDetail({
  bar,
  rule,
  actions,
  ruleIndex,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: CampaignDraft["freeGiftRules"][number];
  actions: CampaignDraftActions;
  ruleIndex: number;
  headerActions?: ReactNode;
  onChange: (patch: Partial<CampaignDraft["freeGiftRules"][number]>) => void;
}) {
  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Mix-and-match trigger">
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Any-item quantity
            <Input
              size="large"
              type="number"
              min={1}
              className="mt-1"
              value={rule.count}
              onChange={(e) => onChange({ count: parsePositiveInt(e.target.value, rule.count) })}
            />
          </label>
        </FieldGrid>
      </BuilderSection>

      <BuilderSection
        title="Reward"
      >
        <CompactActionRow
          title="Gift products"
          meta={`${(rule.giftProductIds || []).length} selected for this bar`}
          actionLabel="Edit gift products"
          onAction={() => void actions.selectFreeGiftRewardProducts(ruleIndex)}
        />
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Gift quantity
          <Input
            size="large"
            type="number"
            min={1}
            className="mt-1"
            value={rule.giftQuantity}
            onChange={(e) =>
              onChange({ giftQuantity: parsePositiveInt(e.target.value, rule.giftQuantity) })
            }
          />
        </label>
      </BuilderSection>
    </BuilderBarCard>
  );
}

function DifferentProductsRuleBarDetail({
  bar,
  draft,
  actions,
  rule,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  rule: CampaignDraft["differentProductsDiscountRules"][number];
  headerActions?: ReactNode;
  onChange: (patch: Partial<CampaignDraft["differentProductsDiscountRules"][number]>) => void;
}) {
  const baseEligibleProducts =
    draft.differentProductsEligibleProductsData.length > 0
      ? draft.differentProductsEligibleProductsData
      : draft.selectedProductsData;
  const eligibleProductIds = baseEligibleProducts.map((product) => String(product.id));
  const eligibleProductIdSet = new Set(eligibleProductIds);
  const effectiveScopedIds = (rule.buyProductIds || []).filter((id) =>
    eligibleProductIdSet.has(String(id)),
  );
  const scopedCount = effectiveScopedIds.length;
  const totalEligibleCount = eligibleProductIds.length;
  const [isEligiblePoolModalOpen, setIsEligiblePoolModalOpen] = useState(false);
  const [draftScopedIds, setDraftScopedIds] = useState<string[]>(effectiveScopedIds);

  const openEligiblePoolModal = () => {
    setDraftScopedIds(effectiveScopedIds);
    setIsEligiblePoolModalOpen(true);
  };

  const applyEligiblePoolChanges = () => {
    onChange({
      buyProductIds: draftScopedIds.length > 0 ? draftScopedIds : eligibleProductIds,
    });
    setIsEligiblePoolModalOpen(false);
  };

  const sharedChooserSection = (
    <BuilderSection title="Shared chooser pool">
      <CompactActionRow
        title="Storefront chooser products"
        meta={
          totalEligibleCount > 0
            ? `${totalEligibleCount} products available across all mix-and-match bars.`
            : "Choose the products customers can pick from in this offer."
        }
        actionLabel={totalEligibleCount > 0 ? "Edit eligible products" : "Select eligible products"}
        onAction={() => void actions.handleSelectDifferentProductsEligibleProducts()}
      />
      <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
        This shared pool powers the storefront "Choose" list. Each bar below can narrow it to a
        smaller subset without changing the shared chooser.
      </div>
    </BuilderSection>
  );

  const barPoolSection = (
    <BuilderSection title="Bar product pool">
      <CompactActionRow
        title="Products counted in this bar"
        meta={
          totalEligibleCount > 0
            ? `${scopedCount} of ${totalEligibleCount} shared products are included in this threshold.`
            : "Add shared eligible products first, then narrow this bar if needed."
        }
        actionLabel={totalEligibleCount > 0 ? "Edit bar pool" : "No eligible products"}
        onAction={openEligiblePoolModal}
      />
      <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
        {totalEligibleCount > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>
              Customers can mix any products in this bar pool to reach the quantity threshold.{" "}
              {scopedCount === totalEligibleCount
                ? "This bar currently uses the full shared pool."
                : `This bar currently uses ${scopedCount} of ${totalEligibleCount} shared products.`}
            </span>
            {scopedCount !== totalEligibleCount ? (
              <Button
                type="link"
                size="small"
                className="px-0"
                onClick={() => onChange({ buyProductIds: eligibleProductIds })}
              >
                Use full shared pool
              </Button>
            ) : null}
          </div>
        ) : (
          "Add shared eligible products first. Then narrow this bar without changing the other bars."
        )}
      </div>
      <Modal
        title="Edit bar product pool"
        open={isEligiblePoolModalOpen}
        onCancel={() => setIsEligiblePoolModalOpen(false)}
        onOk={applyEligiblePoolChanges}
        okText="Apply"
        cancelText="Cancel"
        okButtonProps={{ disabled: totalEligibleCount === 0 }}
      >
        <div className="space-y-4">
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
            This bar inherits from the shared chooser pool. Remove products here to narrow this
            threshold without changing the storefront chooser.
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[12px] text-[#5c6166]">
              {draftScopedIds.length} of {totalEligibleCount} eligible products selected
            </div>
            <Button
              type="link"
              size="small"
              className="px-0"
              onClick={() => setDraftScopedIds(eligibleProductIds)}
              disabled={totalEligibleCount === 0}
            >
              Use full shared pool
            </Button>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
            {baseEligibleProducts.map((product) => {
              const productId = String(product.id);
              const checked = draftScopedIds.includes(productId);
              return (
                <label
                  key={productId}
                  className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#e3e8ed] bg-white px-3 py-3"
                >
                  <Checkbox
                    checked={checked}
                    onChange={(e) => {
                      setDraftScopedIds((prev) =>
                        e.target.checked
                          ? [...prev, productId]
                          : prev.filter((id) => id !== productId),
                      );
                    }}
                  />
                  <img
                    src={product.image}
                    alt={product.title}
                    className="h-10 w-10 rounded-[8px] border border-[#edf1f4] object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium text-[#1c1f23]">
                      {product.title}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </Modal>
    </BuilderSection>
  );

  if (rule.tierType === "bxgy") {
    return (
      <BuilderBarCard bar={bar} actions={headerActions}>
        <BuilderSection title="Trigger">
          <FieldGrid>
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              Buy quantity (X)
              <Input
                size="large"
                type="number"
                min={1}
                className="mt-1"
                value={rule.buyQuantity}
                onChange={(e) => {
                  const buyQuantity = parsePositiveInt(e.target.value, rule.buyQuantity || rule.count);
                  onChange({
                    count: buyQuantity,
                    buyQuantity,
                  });
                }}
              />
            </label>
            <label className="block text-[13px] font-medium text-[#1c1f23]">
              Get quantity (Y)
              <Input
                size="large"
                type="number"
                min={1}
                className="mt-1"
                value={rule.getQuantity || 1}
                onChange={(e) =>
                  onChange({
                    getQuantity: parsePositiveInt(e.target.value, rule.getQuantity || 1),
                  })
                }
              />
            </label>
          </FieldGrid>
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
            Shoppers unlock this reward when they buy {Math.max(1, Number(rule.buyQuantity) || 1)}{" "}
            item{Math.max(1, Number(rule.buyQuantity) || 1) === 1 ? "" : "s"} from this bar pool.
          </div>
        </BuilderSection>

        {sharedChooserSection}
        {barPoolSection}
      </BuilderBarCard>
    );
  }

  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Mix-and-match trigger">
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Any-item quantity
            <Input
              size="large"
              type="number"
              min={1}
              className="mt-1"
              value={rule.count}
              onChange={(e) => {
                const count = parsePositiveInt(e.target.value, rule.count);
                onChange({
                  count,
                  buyQuantity: count,
                });
              }}
            />
          </label>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Discount (%)
            <Input
              size="large"
              type="number"
              min={0}
              max={100}
              className="mt-1"
              value={rule.discountPercent}
              onChange={(e) =>
                onChange({ discountPercent: parsePercent(e.target.value, rule.discountPercent) })
              }
            />
          </label>
        </FieldGrid>
        <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
          Shoppers unlock this bar when they add any {Math.max(1, Number(rule.count) || 1)} product
          {Math.max(1, Number(rule.count) || 1) === 1 ? "" : "s"} from this bar pool.
        </div>
      </BuilderSection>

      {sharedChooserSection}
      {barPoolSection}
    </BuilderBarCard>
  );
}

function PlaceholderModuleDetail({
  title,
}: {
  title: string;
}) {
  return (
    <DetailSection title={title}>
      <QuietEmptyState>
        This component is available in Step 2.
      </QuietEmptyState>
    </DetailSection>
  );
}

function CompleteBundleModuleDetail({
  draft,
  actions,
  totalStoreProductsCount,
  onEditTriggerProducts,
  renderCompleteBundleProductPricingCard,
}: {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  totalStoreProductsCount: number;
  onEditTriggerProducts: () => void;
  renderCompleteBundleProductPricingCard: Props["renderCompleteBundleProductPricingCard"];
}) {
  const isPrimaryTemplate = draft.offerType === "complete-bundle";

  if (!draft.completeBundleBars.length && !isPrimaryTemplate) {
    return (
      <DetailSection title="Complete bundle">
        <QuietEmptyState>
          <div className="space-y-3">
            <div>
              Add the complete bundle component without changing the main offer logic.
            </div>
            <Button onClick={() => actions.addCompleteBundleBar("quantity-break-same")}>
              Add bundle configuration
            </Button>
          </div>
        </QuietEmptyState>
      </DetailSection>
    );
  }

  if (!draft.completeBundleBars.length) {
    return (
      <DetailSection title="Complete bundle">
        <QuietEmptyState>
          <div className="space-y-3">
            <div>
              Add the bundle items customers can choose alongside the current trigger product.
            </div>
            <Button onClick={() => actions.addCompleteBundleBar("quantity-break-same")}>
              Add bundle configuration
            </Button>
          </div>
        </QuietEmptyState>
      </DetailSection>
    );
  }

  return (
    <DetailSection title="Complete bundle">
      {!isPrimaryTemplate ? (
        <div className="mt-1 flex justify-end">
          <Button
            danger
            onClick={actions.clearCompleteBundleBars}
          >
            Disable module
          </Button>
        </div>
      ) : null}

      <div className="mt-4">
        {isPrimaryTemplate ? (
          <div className="mb-4 space-y-3">
            <CompactActionRow
              title="Applies to products"
              meta={
                draft.selectedProductsData.length > 0
                  ? `${draft.selectedProductsData.length} selected${totalStoreProductsCount > 0 ? ` of ${totalStoreProductsCount} products` : ""}`
                  : "Choose which products should show this bundle offer."
              }
              actionLabel={
                draft.selectedProductsData.length > 0 ? "Edit products" : "Select products"
              }
              onAction={onEditTriggerProducts}
            />
            <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
              Select the products where this bundle should appear, then configure the bundle
              items and whole-bundle discount below.
            </div>
          </div>
        ) : null}
        <CompleteBundleEditor
          completeBundleBars={draft.completeBundleBars}
          activeBundleBarId={draft.activeBundleBarId}
          setActiveBundleBarId={actions.setActiveBundleBarId}
          addCompleteBundleBar={actions.addCompleteBundleBar}
          removeCompleteBundleBar={actions.removeCompleteBundleBar}
          updateCompleteBundleBar={actions.updateCompleteBundleBar}
          handleSelectProductsForBundleBar={actions.handleSelectProductsForBundleBar}
          appendProductsToBundleBar={actions.appendProductsToBundleBar}
          renderCompleteBundleProductPricingCard={renderCompleteBundleProductPricingCard}
          updateRuleValues={actions.updateUnifiedRuleValues}
          updateRulePresentation={actions.updateUnifiedRulePresentation}
          section="products"
          simpleMode
          simpleModeContext={isPrimaryTemplate ? "primary" : "component"}
        />
      </div>
    </DetailSection>
  );
}

export default function StepTwoCompositionBuilder({
  draft,
  actions,
  totalStoreProductsCount,
  activeTriggerSelectionMode,
  activeTriggerSelectionSummary,
  activeTriggerSelectionDetails,
  onSelectAllTriggerProducts,
  onSelectTriggerProductsByCollection,
  onExcludeTriggerProducts,
  onInvertTriggerProducts,
  onCustomFilterTriggerProducts,
  bars,
  modules,
  showCountdownBlock,
  setShowCountdownBlock,
  countdownLabel,
  setCountdownLabel,
  onMoveBarUp,
  onMoveBarDown,
  renderCompleteBundleProductPricingCard,
  preview,
}: Props) {
  const [activeModuleId, setActiveModuleId] = useState<ActiveModuleId>(null);
  const visibleModules = useMemo(() => modules, [modules]);
  const visibleAddBarMenuItems = useMemo(
    () => ADD_BAR_MENU_ITEMS.filter((item) => !HIDDEN_BAR_TYPES.includes(item.key)),
    [],
  );

  const clearBarDefaults = () => {
    actions.setDiscountRules((prev) =>
      prev.map((rule) => ({ ...rule, isDefault: false })),
    );
    actions.setDifferentProductsDiscountRules((prev) =>
      prev.map((rule) => ({ ...rule, isDefault: false })),
    );
    actions.setBxgyDiscountRules((prev) =>
      prev.map((rule) => ({ ...rule, isDefault: false })),
    );
    actions.setFreeGiftRules((prev) =>
      prev.map((rule) => ({ ...rule, isDefault: false })),
    );
  };

  useEffect(() => {
    if (
      activeModuleId &&
      visibleModules.some(
        (module) =>
          module.id === activeModuleId &&
          (!module.toggleable || module.enabled),
      )
    ) {
      return;
    }
    const firstOpenModule = visibleModules.find(
      (module) => !module.toggleable || module.enabled,
    );
    if (firstOpenModule) {
      setActiveModuleId(firstOpenModule.id);
      return;
    }
    setActiveModuleId(null);
  }, [activeModuleId, visibleModules]);
  useEffect(() => {
    // #region debug-point B:bars-snapshot
    fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"step2-add-bar",runId:"pre-fix",hypothesisId:"B",location:"StepTwoCompositionBuilder.tsx:1093",msg:"[DEBUG] StepTwo bars/snapshot changed",data:{offerType:draft.offerType,barsCount:bars.length,barIds:bars.map((bar)=>bar.id),snapshotCount:draft.unifiedRulesSnapshot.length,snapshotIds:draft.unifiedRulesSnapshot.map((rule)=>rule.id),discountRules:draft.discountRules.length,differentProductsRules:draft.differentProductsDiscountRules.length,bxgyRules:draft.bxgyDiscountRules.length,freeGiftRules:draft.freeGiftRules.length},ts:Date.now()})}).catch(()=>{});
    // #endregion
  }, [
    bars,
    draft.offerType,
    draft.unifiedRulesSnapshot,
    draft.discountRules.length,
    draft.differentProductsDiscountRules.length,
    draft.bxgyDiscountRules.length,
    draft.freeGiftRules.length,
  ]);

  const showGlobalProductPool =
    bars.some(
      (bar) =>
        bar.type === "quantity_break" ||
        bar.type === "bxgy" ||
        bar.type === "free_gift",
    ) ||
    draft.selectedProductsData.length > 0 ||
    draft.buyProducts.length > 0 ||
    draft.freeGiftTriggerProducts.length > 0;
  const globalTriggerCount =
    draft.selectedProductsData.length ||
    draft.buyProducts.length ||
    draft.freeGiftTriggerProducts.length;
  const isPrimaryCompleteBundle = draft.offerType === "complete-bundle";
  const enabledModuleCount = visibleModules.filter((module) => module.enabled).length;

  const renderBarActions = (bar: CampaignBarItem, index: number) => (
    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
      <Button
        type="text"
        size="small"
        className="flex items-center justify-center"
        disabled={
          bar.type === "single_purchase" ||
          index === 0 ||
          (bars[0]?.type === "single_purchase" && index === 1)
        }
        icon={<ChevronUp size={14} aria-hidden />}
        aria-label={`Move ${bar.title} up`}
        title="Move up"
        onClick={() => onMoveBarUp(bar.id)}
      />
      <Button
        type="text"
        size="small"
        className="flex items-center justify-center"
        disabled={bar.type === "single_purchase" || index === bars.length - 1}
        icon={<ChevronDown size={14} aria-hidden />}
        aria-label={`Move ${bar.title} down`}
        title="Move down"
        onClick={() => onMoveBarDown(bar.id)}
      />
      <Button
        type="text"
        danger
        size="small"
        className="flex items-center justify-center"
        disabled={bar.type === "single_purchase"}
        icon={<Trash2 size={14} aria-hidden />}
        aria-label={`Remove ${bar.title}`}
        title="Remove"
        onClick={() => removeCampaignCompositionBar(bar, actions)}
      />
    </div>
  );

  const renderBarDetail = (bar: CampaignBarItem, index: number) => {
    const unifiedRule = draft.unifiedRulesSnapshot.find((rule) => rule.id === bar.id);
    if (!unifiedRule) {
      // #region debug-point C:missing-unified-rule
      fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"step2-add-bar",runId:"pre-fix",hypothesisId:"C",location:"StepTwoCompositionBuilder.tsx:1147",msg:"[DEBUG] renderBarDetail missing unifiedRule",data:{barId:bar.id,barType:bar.type,barSourceCollection:bar.sourceRef.collection,snapshotIds:draft.unifiedRulesSnapshot.map((rule)=>rule.id)},ts:Date.now()})}).catch(()=>{});
      // #endregion
      return null;
    }

    if (unifiedRule.sourceOfferType === "quantity-breaks-different") {
      const targetRuleIndex = findDifferentProductsRuleIndex(
        draft.differentProductsDiscountRules,
        unifiedRule.id,
      );
      const rule =
        targetRuleIndex >= 0
          ? draft.differentProductsDiscountRules[targetRuleIndex]
          : null;
      if (!rule) return null;
      if (unifiedRule.type === "single_purchase") {
        return (
          <SinglePurchaseBarDetail
            key={bar.id}
            bar={bar}
            rule={rule}
            headerActions={renderBarActions(bar, index)}
            onChange={(patch) =>
              (() => {
                if (patch.isDefault === true) {
                  clearBarDefaults();
                }
                actions.setDifferentProductsDiscountRules((prev) =>
                  prev.map((entry, ruleIndex) =>
                    ruleIndex === targetRuleIndex ? { ...entry, ...patch } : entry,
                  ),
                );
              })()
            }
          />
        );
      }
      return (
        <DifferentProductsRuleBarDetail
          key={bar.id}
          bar={bar}
          draft={draft}
          actions={actions}
          rule={rule}
          headerActions={renderBarActions(bar, index)}
          onChange={(patch) =>
            (() => {
              if (patch.isDefault === true) {
                clearBarDefaults();
              }
              actions.setDifferentProductsDiscountRules((prev) =>
                prev.map((entry, ruleIndex) =>
                  ruleIndex === targetRuleIndex
                    ? (() => {
                        const nextTierType =
                          patch.tierType === "bxgy" || entry.tierType === "bxgy"
                            ? "bxgy"
                            : "simple";
                        if (nextTierType === "bxgy") {
                          const buyQuantity =
                            typeof patch.buyQuantity === "number"
                              ? patch.buyQuantity
                              : typeof patch.count === "number"
                                ? patch.count
                                : entry.buyQuantity;
                          return {
                            ...entry,
                            ...patch,
                            count: buyQuantity,
                            buyQuantity,
                            getQuantity:
                              typeof patch.getQuantity === "number"
                                ? patch.getQuantity
                                : entry.getQuantity,
                            getProductIds:
                              patch.getProductIds ??
                              (entry.getProductIds.length > 0
                                ? entry.getProductIds
                                : patch.buyProductIds ?? entry.buyProductIds),
                            discountPercent: 100,
                            maxUsesPerOrder: 1,
                            tierType: "bxgy" as const,
                          };
                        }
                        const count =
                          typeof patch.count === "number" ? patch.count : entry.count;
                        return {
                          ...entry,
                          ...patch,
                          count,
                          buyQuantity:
                            typeof patch.buyQuantity === "number"
                              ? patch.buyQuantity
                              : typeof patch.count === "number"
                                ? patch.count
                                : entry.buyQuantity,
                          getQuantity: 0,
                          getProductIds: [],
                          maxUsesPerOrder: 1,
                          tierType: "simple" as const,
                        };
                      })()
                    : entry,
                ),
              );
            })()
          }
        />
      );
    }

    if (
      unifiedRule.sourceOfferType === "quantity-breaks-same" ||
      unifiedRule.sourceOfferType === "shipping-discount" ||
      unifiedRule.sourceOfferType === "order-discount" ||
      unifiedRule.sourceOfferType === "coupon"
    ) {
      const targetRuleIndex = findDiscountRuleIndex(
        draft.discountRules,
        unifiedRule.id,
      );
      const rule = targetRuleIndex >= 0 ? draft.discountRules[targetRuleIndex] : null;
      if (!rule) {
        // #region debug-point D:missing-discount-rule
        fetch("http://127.0.0.1:7777/event",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:"step2-add-bar",runId:"pre-fix",hypothesisId:"D",location:"StepTwoCompositionBuilder.tsx:1207",msg:"[DEBUG] unifiedRule resolved but draft.discountRules lookup failed",data:{ruleId:unifiedRule.id,sourceOfferType:unifiedRule.sourceOfferType,discountRuleIds:draft.discountRules.map((entry,index)=>entry.id||`discount-rule-${index + 1}`)},ts:Date.now()})}).catch(()=>{});
        // #endregion
        return null;
      }
      if (unifiedRule.type === "single_purchase") {
        return (
          <SinglePurchaseBarDetail
            key={bar.id}
            bar={bar}
            rule={rule}
            headerActions={renderBarActions(bar, index)}
            onChange={(patch) =>
              (() => {
                if (patch.isDefault === true) {
                  clearBarDefaults();
                }
                actions.setDiscountRules((prev) =>
                  prev.map((entry, ruleIndex) =>
                    ruleIndex === targetRuleIndex ? { ...entry, ...patch } : entry,
                  ),
                );
              })()
            }
          />
        );
      }
      return (
        <DiscountRuleBarDetail
          key={bar.id}
          bar={bar}
          draft={draft}
          rule={rule}
          headerActions={renderBarActions(bar, index)}
          onChange={(patch) =>
            (() => {
              if (patch.isDefault === true) {
                clearBarDefaults();
              }
              actions.setDiscountRules((prev) =>
                prev.map((entry, ruleIndex) =>
                  ruleIndex === targetRuleIndex ? { ...entry, ...patch } : entry,
                ),
              );
            })()
          }
        />
      );
    }

    if (unifiedRule.sourceOfferType === "bxgy") {
      const targetRuleIndex = findBxgyRuleIndex(draft.bxgyDiscountRules, unifiedRule.id);
      const rule =
        targetRuleIndex >= 0 ? draft.bxgyDiscountRules[targetRuleIndex] : null;
      if (!rule) return null;
      if (unifiedRule.type === "single_purchase") {
        return (
          <SinglePurchaseBarDetail
            key={bar.id}
            bar={bar}
            rule={rule}
            headerActions={renderBarActions(bar, index)}
            onChange={(patch) =>
              (() => {
                if (patch.isDefault === true) {
                  clearBarDefaults();
                }
                actions.setBxgyDiscountRules((prev) =>
                  prev.map((entry, ruleIndex) =>
                    ruleIndex === targetRuleIndex ? { ...entry, ...patch } : entry,
                  ),
                );
              })()
            }
          />
        );
      }
      return (
        <BxgyRuleBarDetail
          key={bar.id}
          bar={bar}
          rule={rule}
          actions={actions}
          headerActions={renderBarActions(bar, index)}
          onChange={(patch) =>
            (() => {
              if (patch.isDefault === true) {
                clearBarDefaults();
              }
              actions.setBxgyDiscountRules((prev) =>
                prev.map((entry, ruleIndex) =>
                  ruleIndex === targetRuleIndex ? { ...entry, ...patch } : entry,
                ),
              );
            })()
          }
        />
      );
    }

    if (unifiedRule.sourceOfferType === "free-gift") {
      const targetRuleIndex = findFreeGiftRuleIndex(
        draft.freeGiftRules,
        unifiedRule.id,
      );
      const rule =
        targetRuleIndex >= 0 ? draft.freeGiftRules[targetRuleIndex] : null;
      if (!rule) return null;
      if (unifiedRule.type === "single_purchase") {
        return (
          <SinglePurchaseBarDetail
            key={bar.id}
            bar={bar}
            rule={rule}
            headerActions={renderBarActions(bar, index)}
            onChange={(patch) =>
              (() => {
                if (patch.isDefault === true) {
                  clearBarDefaults();
                }
                actions.setFreeGiftRules((prev) =>
                  prev.map((entry, ruleIndex) =>
                    ruleIndex === targetRuleIndex ? { ...entry, ...patch } : entry,
                  ),
                );
              })()
            }
          />
        );
      }
      return (
        <FreeGiftRuleBarDetail
          key={bar.id}
          bar={bar}
          rule={rule}
          actions={actions}
          ruleIndex={targetRuleIndex}
          headerActions={renderBarActions(bar, index)}
          onChange={(patch) =>
            (() => {
              if (patch.isDefault === true) {
                clearBarDefaults();
              }
              actions.setFreeGiftRules((prev) =>
                prev.map((entry, ruleIndex) =>
                  ruleIndex === targetRuleIndex ? { ...entry, ...patch } : entry,
                ),
              );
            })()
          }
        />
      );
    }

    return null;
  };

  const renderModuleDetail = (module: CampaignModuleItem | undefined) => {
    if (!module) {
      return (
        <QuietEmptyState>
          No components available for this template yet.
        </QuietEmptyState>
      );
    }

    switch (module.id) {
      case "subscription":
        return (
          <DetailSection title="Subscriptions">
            <SubscriptionSettingsEditor
              subscriptionEnabled={draft.subscriptionEnabled}
              setSubscriptionEnabled={actions.setSubscriptionEnabled}
              subscriptionTitle={draft.subscriptionTitle}
              setSubscriptionTitle={actions.setSubscriptionTitle}
              subscriptionSubtitle={draft.subscriptionSubtitle}
              setSubscriptionSubtitle={actions.setSubscriptionSubtitle}
              oneTimeTitle={draft.oneTimeTitle}
              setOneTimeTitle={actions.setOneTimeTitle}
              oneTimeSubtitle={draft.oneTimeSubtitle}
              setOneTimeSubtitle={actions.setOneTimeSubtitle}
              subscriptionPosition={draft.subscriptionPosition}
              setSubscriptionPosition={actions.setSubscriptionPosition}
              subscriptionDefaultSelected={draft.subscriptionDefaultSelected}
              setSubscriptionDefaultSelected={actions.setSubscriptionDefaultSelected}
              shouldShowSubscriptionPreview={draft.shouldShowSubscriptionPreview}
              allSelectedProductsHaveSubscription={draft.allSelectedProductsHaveSubscription}
              shouldShowSubscriptionExplanation={draft.shouldShowSubscriptionExplanation}
              subscriptionExplanationTitle={draft.subscriptionExplanationTitle}
              subscriptionExplanationBody={draft.subscriptionExplanationBody}
            />
          </DetailSection>
        );
      case "progressive_gifts":
        return (
          <DetailSection title="Progressive gifts">
            <ProgressiveGiftsSection
              offerType={draft.offerType}
              unifiedRulesSnapshot={draft.unifiedRulesSnapshot}
              value={draft.progressiveGifts}
              onChange={actions.setProgressiveGifts}
              showToggle={false}
            />
          </DetailSection>
        );
      case "countdown":
        return (
          <DetailSection title="Countdown timer">
            <div className="flex items-center justify-between rounded-[10px] bg-[#f6f8f9] px-4 py-3">
              <div>
                <div className="text-[14px] font-medium text-[#1c1f23]">
                  Enable countdown block
                </div>
                <div className="mt-1 text-[12px] text-[#5c6166]">
                  Show a countdown message tied to this campaign schedule.
                </div>
              </div>
              <Switch checked={showCountdownBlock} onChange={setShowCountdownBlock} />
            </div>
            <div className="mt-4">
              <label className="block text-[13px] font-medium text-[#1c1f23]">
                Countdown label
                <Input
                  size="large"
                  className="mt-1"
                  value={countdownLabel}
                  onChange={(e) => setCountdownLabel(e.target.value)}
                />
              </label>
            </div>
          </DetailSection>
        );
      case "complete_bundle":
        return (
          <CompleteBundleModuleDetail
            draft={draft}
            actions={actions}
            totalStoreProductsCount={totalStoreProductsCount}
            onEditTriggerProducts={onCustomFilterTriggerProducts}
            renderCompleteBundleProductPricingCard={renderCompleteBundleProductPricingCard}
          />
        );
      case "checkbox_upsells":
        return (
          <DetailSection title="Checkbox upsells">
            <div className="flex items-center justify-between rounded-[10px] bg-[#f6f8f9] px-4 py-3">
              <div>
                <div className="text-[14px] font-medium text-[#1c1f23]">
                  Enable checkbox upsell
                </div>
                <div className="mt-1 text-[12px] text-[#5c6166]">
                  Show a customer-facing opt-in control before the offer is added.
                </div>
              </div>
              <Switch
                checked={draft.checkboxUpsellsEnabled}
                onChange={actions.setCheckboxUpsellsEnabled}
              />
            </div>
            <div className="mt-4">
              <FieldGrid>
                <label className="block text-[13px] font-medium text-[#1c1f23]">
                  Checkbox title
                  <Input
                    size="large"
                    className="mt-1"
                    value={draft.checkboxUpsellsTitle}
                    onChange={(e) => actions.setCheckboxUpsellsTitle(e.target.value)}
                  />
                </label>
                <label className="block text-[13px] font-medium text-[#1c1f23]">
                  Checkbox subtitle
                  <Input
                    size="large"
                    className="mt-1"
                    value={draft.checkboxUpsellsSubtitle}
                    onChange={(e) => actions.setCheckboxUpsellsSubtitle(e.target.value)}
                  />
                </label>
              </FieldGrid>
              <div className="mt-4">
                <Checkbox
                  checked={draft.checkboxUpsellsDefaultChecked}
                  onChange={(e) =>
                    actions.setCheckboxUpsellsDefaultChecked(e.target.checked)
                  }
                >
                  Start checked by default
                </Checkbox>
              </div>
            </div>
          </DetailSection>
        );
      default:
        return (
          <PlaceholderModuleDetail
            title={module.label}
          />
        );
    }
  };

  const handleModuleToggle = (module: CampaignModuleItem, checked: boolean) => {
    if (module.id === "subscription") {
      actions.setSubscriptionEnabled(Boolean(checked));
    }
    if (module.id === "progressive_gifts") {
      actions.setProgressiveGifts({
        ...draft.progressiveGifts,
        enabled: Boolean(checked),
      });
    }
    if (module.id === "countdown") {
      setShowCountdownBlock(Boolean(checked));
    }
    if (module.id === "complete_bundle" && !checked) {
      actions.clearCompleteBundleBars();
    }
    if (
      module.id === "complete_bundle" &&
      checked &&
      draft.completeBundleBars.length === 0
    ) {
      actions.addCompleteBundleBar("quantity-break-same");
    }
    if (module.id === "checkbox_upsells") {
      actions.setCheckboxUpsellsEnabled(Boolean(checked));
    }

    if (checked) {
      setActiveModuleId(module.id);
      return;
    }

    if (activeModuleId === module.id) {
      const fallbackModule = visibleModules.find(
        (entry) => entry.id !== module.id && (!entry.toggleable || entry.enabled),
      );
      setActiveModuleId(fallbackModule?.id ?? null);
    }
  };

  const primaryBarsCount = bars.length;

  const renderBarsSection = () => (
    <div className="space-y-4">
      {bars.length === 0 ? (
        <QuietEmptyState>
          No bars yet. Add one to start defining the campaign logic.
        </QuietEmptyState>
      ) : (
        bars.map((bar, index) => renderBarDetail(bar, index))
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          {!isPrimaryCompleteBundle ? (
            <DetailSection
              title="Product pool"
              meta={showGlobalProductPool ? `${globalTriggerCount} selected` : "Optional"}
            >
              <div className="space-y-3">
                {showGlobalProductPool
                  ? (
                    <ProductPoolManager
                      selectedProducts={draft.selectedProductsData}
                      totalStoreProductsCount={totalStoreProductsCount}
                      activeSelectionMode={activeTriggerSelectionMode}
                      activeSelectionSummary={activeTriggerSelectionSummary}
                      activeSelectionDetails={activeTriggerSelectionDetails}
                      onSelectAll={onSelectAllTriggerProducts}
                      onSelectByCollection={onSelectTriggerProductsByCollection}
                      onExclude={onExcludeTriggerProducts}
                      onInvert={onInvertTriggerProducts}
                      onCustomFilter={onCustomFilterTriggerProducts}
                      allowBulkSelection={draft.offerType !== "subscription"}
                    />
                  )
                  : null}
                {!showGlobalProductPool ? (
                  <QuietEmptyState>
                    Shared trigger product selection appears here when the campaign needs it.
                  </QuietEmptyState>
                ) : null}
              </div>
            </DetailSection>
          ) : null}

          {!isPrimaryCompleteBundle ? (
            <DetailSection
              title="Bars"
              meta={`${primaryBarsCount} configured`}
              actions={
                <Dropdown
                  trigger={["click"]}
                  menu={{
                    items: visibleAddBarMenuItems,
                    onClick: ({ key }) =>
                      appendCampaignCompositionBar(
                        key as CampaignBarType,
                        draft,
                        actions,
                      ),
                  }}
                >
                  <Button type="dashed">+ Add bar</Button>
                </Dropdown>
              }
            >
              {renderBarsSection()}
            </DetailSection>
          ) : null}

          <DetailSection
            title="Components"
            meta={`${enabledModuleCount} enabled`}
          >
            <div className="flex flex-col gap-2">
              {visibleModules.map((module) => (
                (() => {
                  const isExpanded =
                    activeModuleId === module.id &&
                    (!module.toggleable || module.enabled);
                  const tone = getModuleStatusTone(module, isExpanded);
                  return (
                    <div
                      key={module.id}
                      className={`rounded-[10px] border px-3 py-3 transition ${tone.container}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            if (!module.toggleable || module.enabled) {
                              setActiveModuleId(module.id);
                            }
                          }}
                          className="min-w-0 flex-1 bg-transparent p-0 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-[13px] font-medium text-[#1c1f23]">
                              {module.label}
                            </div>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}
                            >
                              {tone.label}
                            </span>
                            {!module.toggleable ? (
                              <span className="rounded-full bg-[#f4f6f8] px-2 py-0.5 text-[11px] font-medium text-[#5c6166]">
                                Required
                              </span>
                            ) : null}
                          </div>
                        </button>
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronUp size={16} aria-hidden className="text-[#5c6166]" />
                          ) : (
                            <ChevronDown size={16} aria-hidden className="text-[#5c6166]" />
                          )}
                          {module.toggleable ? (
                            <Switch
                              checked={module.enabled}
                              onClick={(checked, event) => {
                                event?.stopPropagation();
                                handleModuleToggle(module, Boolean(checked));
                              }}
                            />
                          ) : null}
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 border-t border-[#e8ebee] pt-4">
                          {renderModuleDetail(module)}
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ))}
            </div>
          </DetailSection>
        </div>

        <div className="create-offer-sticky-preview 2xl:w-[360px]">{preview}</div>
      </div>
    </div>
  );
}
