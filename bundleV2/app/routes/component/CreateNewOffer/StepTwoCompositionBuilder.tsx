import { Button, Checkbox, Dropdown, Input, Select, Switch } from "antd";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  isCompleteBundleSingleBar,
  type CompleteBundleProduct,
} from "../../../utils/offerParsing";
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
import {
  OfferRuleNotice,
  OfferRuleStatusPill,
} from "./OfferRulesShared";
import { ProgressiveGiftsSection } from "./ProgressiveGiftsSection";
import SubscriptionSettingsEditor from "./SubscriptionSettingsEditor";
import type { OfferTypeId } from "./offerTypeOptions";
import type { UnifiedRuleAuditIssue } from "./unifiedRulesValidation";

type Props = {
  draft: CampaignDraft;
  templateOfferType: OfferTypeId;
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
  auditWarnings: UnifiedRuleAuditIssue[];
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
  { key: "free_gift", label: "Add reward rule" },
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
  return rules.findIndex((entry) => entry.id === ruleId);
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
  const supportsRewardScope = bar.type === "free_gift";
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
            {isBxgy
              ? "Buy quantity (X)"
              : usesCartAmount
                ? "Spend threshold"
                : "Trigger quantity"}
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
                  : isBxgy
                    ? (() => {
                        const buyQuantity = parsePositiveInt(
                          e.target.value,
                          rule.buyQuantity || rule.count,
                        );
                        onChange({ count: buyQuantity, buyQuantity });
                      })()
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
        {isBxgy ? (
          <div className="rounded-[10px] bg-[#f6f8f9] px-3 py-2 text-[12px] text-[#5c6166]">
            Free items come from the same product and discount the cheapest eligible variant once
            per order.
          </div>
        ) : null}
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
            </>
          ) : null}
        </FieldGrid>
        {supportsRewardScope || usesShippingReward || isBxgy ? (
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
            {isBxgy
              ? "BXGY uses the shared trigger product pool and always grants free items from the same product."
              : usesShippingReward
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
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: DraftBxgyDiscountRule;
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
  draft,
  rule,
  actions,
  ruleIndex,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  draft: CampaignDraft;
  rule: CampaignDraft["freeGiftRules"][number];
  actions: CampaignDraftActions;
  ruleIndex: number;
  headerActions?: ReactNode;
  onChange: (patch: Partial<CampaignDraft["freeGiftRules"][number]>) => void;
}) {
  const effectiveGiftProductIds =
    Array.isArray(rule.giftProductIds) && rule.giftProductIds.length > 0
      ? rule.giftProductIds
      : draft.freeGiftSharedGiftProductIds;
  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Reward trigger">
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
          title="Reward products"
          meta={`${effectiveGiftProductIds.length} selected for this reward`}
          actionLabel="Edit reward products"
          onAction={() => void actions.selectFreeGiftRewardProducts(ruleIndex)}
        />
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Reward quantity
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
  rule,
  showSharedChooserSection = false,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  draft: CampaignDraft;
  rule: CampaignDraft["differentProductsDiscountRules"][number];
  showSharedChooserSection?: boolean;
  headerActions?: ReactNode;
  onChange: (patch: Partial<CampaignDraft["differentProductsDiscountRules"][number]>) => void;
}) {
  const baseEligibleProducts =
    draft.differentProductsSharedPoolProductsData.length > 0
      ? draft.differentProductsSharedPoolProductsData
      : draft.selectedProductsData;
  const eligibleProductIds = baseEligibleProducts.map((product) => String(product.id));
  const totalEligibleCount = eligibleProductIds.length;

  const sharedChooserSection = (
    <BuilderSection title="Offer product pool">
      <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
        {totalEligibleCount > 0
          ? `${totalEligibleCount} campaign products are included in this offer pool. All bars inherit the same pool.`
          : "Select campaign products in Step 1 to define the offer pool used by every bar."}
      </div>
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
            item{Math.max(1, Number(rule.buyQuantity) || 1) === 1 ? "" : "s"} from the offer
            product pool.
          </div>
        </BuilderSection>

        {showSharedChooserSection ? sharedChooserSection : null}
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
          {Math.max(1, Number(rule.count) || 1) === 1 ? "" : "s"} from the offer product pool.
        </div>
      </BuilderSection>

      {showSharedChooserSection ? sharedChooserSection : null}
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
  embedded = false,
}: {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  totalStoreProductsCount: number;
  onEditTriggerProducts: () => void;
  renderCompleteBundleProductPricingCard: Props["renderCompleteBundleProductPricingCard"];
  embedded?: boolean;
}) {
  const isPrimaryTemplate = draft.offerType === "complete-bundle";
  const wrap = (content: React.ReactNode) =>
    embedded ? <>{content}</> : <DetailSection title="Complete bundle">{content}</DetailSection>;

  useEffect(() => {
    if (draft.completeBundleBars.length > 0) {
      return;
    }
    actions.addCompleteBundleBar("quantity-break-same");
  }, [actions, draft.completeBundleBars.length]);

  if (!draft.completeBundleBars.length && !isPrimaryTemplate) {
    return wrap(
      <>
        <QuietEmptyState>
          Preparing the complete bundle configuration...
        </QuietEmptyState>
      </>,
    );
  }

  if (!draft.completeBundleBars.length) {
    return wrap(
      <>
        <QuietEmptyState>
          Preparing the complete bundle configuration...
        </QuietEmptyState>
      </>,
    );
  }

  return wrap(
    <>
      {!isPrimaryTemplate ? (
        <div className="mt-1 flex justify-end">
          <Button
            danger
            onClick={actions.clearCompleteBundleBars}
          >
            Disable option
          </Button>
        </div>
      ) : null}

      <div className="mt-4">
        {isPrimaryTemplate ? (
          <div className="mb-4">
            <CompactActionRow
              title="Trigger products"
              meta={
                draft.selectedProductsData.length > 0
                  ? `${draft.selectedProductsData.length} selected${totalStoreProductsCount > 0 ? ` of ${totalStoreProductsCount} products` : ""}`
                  : "Choose which main products should show this bundle offer."
              }
              actionLabel={
                draft.selectedProductsData.length > 0 ? "Edit products" : "Select products"
              }
              onAction={onEditTriggerProducts}
            />
          </div>
        ) : null}
        <CompleteBundleEditor
          completeBundleBars={draft.completeBundleBars}
          activeBundleBarId={draft.activeBundleBarId}
          setActiveBundleBarId={actions.setActiveBundleBarId}
          addCompleteBundleBar={actions.addCompleteBundleBar}
          removeCompleteBundleBar={actions.removeCompleteBundleBar}
          updateCompleteBundleBar={actions.updateCompleteBundleBar}
          selectBundleProductsForBar={actions.handleSelectProductsForBundleBar}
          renderCompleteBundleProductPricingCard={renderCompleteBundleProductPricingCard}
          updateRuleValues={actions.updateUnifiedRuleValues}
          updateRulePresentation={actions.updateUnifiedRulePresentation}
          section="products"
          simpleMode
          simpleModeContext={isPrimaryTemplate ? "primary" : "component"}
        />
      </div>
    </>,
  );
}

export default function StepTwoCompositionBuilder({
  draft,
  templateOfferType,
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
  auditWarnings,
  renderCompleteBundleProductPricingCard,
  preview,
}: Props) {
  const [activeModuleId, setActiveModuleId] = useState<ActiveModuleId>(null);
  const isProgressiveGiftsTemplate = templateOfferType === "progressive-gifts";
  const isPrimarySubscriptionTemplate = templateOfferType === "subscription";
  const primaryOfferOptionId =
    isPrimarySubscriptionTemplate
      ? "subscription"
      : templateOfferType === "complete-bundle"
        ? "complete_bundle"
        : null;
  const [activeOfferOptionId, setActiveOfferOptionId] = useState<string | null>(
    primaryOfferOptionId,
  );
  const visibleModules = useMemo(() => modules, [modules]);
  const visibleAddBarMenuItems = useMemo(
    () =>
      ADD_BAR_MENU_ITEMS.filter((item) =>
        templateOfferType === "free-gift"
          ? item.key === "free_gift"
          : isProgressiveGiftsTemplate
            ? item.key === "quantity_break"
          : !HIDDEN_BAR_TYPES.includes(item.key),
      ).map((item) =>
        templateOfferType === "free-gift" && item.key === "free_gift"
          ? { ...item, label: "Add reward rule" }
          : isProgressiveGiftsTemplate && item.key === "quantity_break"
            ? { ...item, label: "Add milestone" }
          : item,
      ),
    [isProgressiveGiftsTemplate, templateOfferType],
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
  const showGlobalProductPool =
    bars.some(
      (bar) =>
        bar.type === "quantity_break" ||
        bar.type === "bxgy" ||
        bar.type === "free_gift",
    ) ||
    draft.offerType === "subscription" ||
    draft.subscriptionEnabled ||
    draft.selectedProductsData.length > 0 ||
    draft.buyProducts.length > 0 ||
    draft.freeGiftTriggerProducts.length > 0;
  const globalTriggerCount =
    draft.selectedProductsData.length ||
    draft.buyProducts.length ||
    draft.freeGiftTriggerProducts.length;
  const isPrimaryCompleteBundle = draft.offerType === "complete-bundle";
  const enabledModuleCount = visibleModules.filter((module) => module.enabled).length;

  useEffect(() => {
    const completeBundleOptionEnabled =
      draft.offerType === "complete-bundle" ||
      draft.completeBundleBars.some((bar) => !isCompleteBundleSingleBar(bar));
    const activeOfferOptionStillValid =
      activeOfferOptionId === "subscription"
        ? draft.subscriptionEnabled || primaryOfferOptionId === "subscription"
        : activeOfferOptionId === "complete_bundle"
          ? completeBundleOptionEnabled || primaryOfferOptionId === "complete_bundle"
          : activeOfferOptionId == null;

    if (activeOfferOptionStillValid) {
      return;
    }

    setActiveOfferOptionId(primaryOfferOptionId);
  }, [
    activeOfferOptionId,
    draft.completeBundleBars,
    draft.offerType,
    draft.subscriptionEnabled,
    primaryOfferOptionId,
  ]);

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
      return null;
    }

    if (unifiedRule.sourceOfferType === "quantity-breaks-different") {
      const differentProductsSharedProductIds =
        draft.differentProductsSharedPoolProductsData.length > 0
          ? draft.differentProductsSharedPoolProductsData.map((product) => String(product.id))
          : draft.selectedProductsData.map((product) => String(product.id));
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
          rule={rule}
          showSharedChooserSection={targetRuleIndex === 0}
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
                            buyProductIds: differentProductsSharedProductIds,
                            getProductIds: differentProductsSharedProductIds,
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
                          buyProductIds: differentProductsSharedProductIds,
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
          draft={draft}
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
              selectedProductCount={draft.selectedProductsData.length}
              subscriptionTitle={draft.subscriptionTitle}
              setSubscriptionTitle={actions.setSubscriptionTitle}
              subscriptionSubtitle={draft.subscriptionSubtitle}
              setSubscriptionSubtitle={actions.setSubscriptionSubtitle}
              previewOneTimePriceText={draft.previewOneTimePriceText}
              previewSubscriptionPriceText={draft.previewSubscriptionPriceText}
              previewSubscriptionCompareAtPriceText={
                draft.previewSubscriptionCompareAtPriceText
              }
              previewSubscriptionSavingsText={draft.previewSubscriptionSavingsText}
              previewSubscriptionPricingNoteText={
                draft.previewSubscriptionPricingNoteText
              }
              previewSubscriptionSourceLabel={draft.previewSubscriptionSourceLabel}
              previewSubscriptionLoading={draft.previewSubscriptionLoading}
              previewSubscriptionErrorText={draft.previewSubscriptionErrorText}
              previewSubscriptionPlans={draft.previewSubscriptionPlans}
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
  const completeBundleOptionEnabled =
    draft.offerType === "complete-bundle" ||
    draft.completeBundleBars.some((bar) => !isCompleteBundleSingleBar(bar));
  const offerOptionsEnabledCount =
    Number(draft.subscriptionEnabled) + Number(completeBundleOptionEnabled);

  const renderBarsSection = () => (
    <div className="space-y-4">
      {bars.length === 0 ? (
        <QuietEmptyState>
          {templateOfferType === "free-gift"
            ? "No reward rules yet. Add one to start defining the trigger and reward."
            : isProgressiveGiftsTemplate
              ? "No milestones yet. Add one to define the unlock thresholds that drive the reward track."
            : "No bars yet. Add one to start defining the campaign logic."}
        </QuietEmptyState>
      ) : (
        bars.map((bar, index) => renderBarDetail(bar, index))
      )}
    </div>
  );

  const renderOfferOptionsSection = () => (
    <div className="space-y-4">
      <div className="rounded-[10px] border border-[#e3e8ed] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
        Configure purchase-path options that sit beside the main offer bars. Subscription is
        treated here as an offer option instead of a separate component.
      </div>
      {[
        {
          id: "subscription" as const,
          title: "Subscription option",
          description: "Add a recurring purchase choice alongside the one-time path.",
          enabled: draft.subscriptionEnabled,
          toggleable: !isPrimarySubscriptionTemplate,
          detail: (
            <SubscriptionSettingsEditor
              subscriptionEnabled={draft.subscriptionEnabled}
              selectedProductCount={draft.selectedProductsData.length}
              subscriptionTitle={draft.subscriptionTitle}
              setSubscriptionTitle={actions.setSubscriptionTitle}
              subscriptionSubtitle={draft.subscriptionSubtitle}
              setSubscriptionSubtitle={actions.setSubscriptionSubtitle}
              previewOneTimePriceText={draft.previewOneTimePriceText}
              previewSubscriptionPriceText={draft.previewSubscriptionPriceText}
              previewSubscriptionCompareAtPriceText={
                draft.previewSubscriptionCompareAtPriceText
              }
              previewSubscriptionSavingsText={draft.previewSubscriptionSavingsText}
              previewSubscriptionPricingNoteText={
                draft.previewSubscriptionPricingNoteText
              }
              previewSubscriptionSourceLabel={draft.previewSubscriptionSourceLabel}
              previewSubscriptionLoading={draft.previewSubscriptionLoading}
              previewSubscriptionErrorText={draft.previewSubscriptionErrorText}
              previewSubscriptionPlans={draft.previewSubscriptionPlans}
            />
          ),
        },
        {
          id: "complete_bundle" as const,
          title: "Complete bundle option",
          description: "Add a scoped bundle path alongside the base purchase option.",
          enabled: completeBundleOptionEnabled,
          toggleable: !isPrimaryCompleteBundle,
          detail: (
            <CompleteBundleModuleDetail
              draft={draft}
              actions={actions}
              totalStoreProductsCount={totalStoreProductsCount}
              onEditTriggerProducts={onCustomFilterTriggerProducts}
              renderCompleteBundleProductPricingCard={renderCompleteBundleProductPricingCard}
              embedded
            />
          ),
        },
      ].map((option) => {
        const isExpanded = activeOfferOptionId === option.id;
        return (
          <div key={option.id} className="rounded-[12px] border border-[#e3e8ed] bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setActiveOfferOptionId((prev) =>
                    prev === option.id && option.id !== primaryOfferOptionId ? null : option.id,
                  )
                }
                className="min-w-0 flex-1 bg-transparent p-0 text-left"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[14px] font-medium text-[#1c1f23]">{option.title}</div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      option.enabled
                        ? "bg-[#e8f7ef] text-[#0f8a4b]"
                        : "bg-[#f4f6f8] text-[#5c6166]"
                    }`}
                  >
                    {option.enabled ? "Enabled" : "Optional"}
                  </span>
                  {!option.toggleable ? (
                    <span className="rounded-full bg-[#f4f6f8] px-2 py-0.5 text-[11px] font-medium text-[#5c6166]">
                      Active template
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-[12px] text-[#5c6166]">{option.description}</div>
              </button>
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronUp size={16} aria-hidden className="text-[#5c6166]" />
                ) : (
                  <ChevronDown size={16} aria-hidden className="text-[#5c6166]" />
                )}
                {option.toggleable ? (
                  <Switch
                    checked={option.enabled}
                    onClick={(checked, event) => {
                      event?.stopPropagation();
                      if (option.id === "subscription") {
                        actions.setSubscriptionEnabled(Boolean(checked));
                      }
                      if (option.id === "complete_bundle") {
                        if (checked && draft.completeBundleBars.length === 0) {
                          actions.addCompleteBundleBar("quantity-break-same");
                        }
                        if (!checked) {
                          actions.clearCompleteBundleBars();
                        }
                      }
                      if (checked) {
                        setActiveOfferOptionId(option.id);
                      } else if (activeOfferOptionId === option.id) {
                        setActiveOfferOptionId(primaryOfferOptionId);
                      }
                    }}
                  />
                ) : null}
              </div>
            </div>

            {isExpanded ? (
              <div className="mt-4 border-t border-[#e8ebee] pt-4">{option.detail}</div>
            ) : null}
          </div>
        );
      })}
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
                      allowBulkSelection
                    />
                  )
                  : null}
                {auditWarnings.length > 0 ? (
                  <div className="space-y-3">
                    {auditWarnings.map((issue, index) => (
                      <OfferRuleNotice
                        key={`${issue.code || "warning"}-${index}`}
                        intent="warning"
                        title="Shared Pool Reachability"
                      >
                        {issue.message}
                      </OfferRuleNotice>
                    ))}
                  </div>
                ) : null}
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
              title={
                templateOfferType === "free-gift"
                  ? "Reward rules"
                  : isProgressiveGiftsTemplate
                    ? "Milestones"
                    : "Bars"
              }
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
                  <Button type="dashed">
                    {templateOfferType === "free-gift"
                      ? "+ Add reward rule"
                      : isProgressiveGiftsTemplate
                        ? "+ Add milestone"
                        : "+ Add bar"}
                  </Button>
                </Dropdown>
              }
            >
              {templateOfferType === "free-gift" ? (
                <div className="mb-4 rounded-[10px] border border-[#e3e8ed] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
                  Free gift is configured here as a reward mechanism. Each rule defines the trigger
                  condition and the gift products granted as the reward.
                </div>
              ) : isProgressiveGiftsTemplate ? (
                <div className="mb-4 rounded-[10px] border border-[#e3e8ed] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
                  Configure milestone pricing here first. Progressive rewards unlock against these
                  milestones in the separate reward track below.
                </div>
              ) : null}
              {renderBarsSection()}
            </DetailSection>
          ) : null}

          {isProgressiveGiftsTemplate ? (
            <DetailSection
              title="Progressive rewards"
              meta={
                draft.progressiveGifts.gifts.length > 0
                  ? `${draft.progressiveGifts.gifts.length} configured`
                  : "Set up reward track"
              }
            >
              <ProgressiveGiftsSection
                offerType={draft.offerType}
                unifiedRulesSnapshot={draft.unifiedRulesSnapshot}
                value={draft.progressiveGifts}
                onChange={actions.setProgressiveGifts}
                showToggle={false}
              />
            </DetailSection>
          ) : null}

          <DetailSection
            title="Offer options"
            meta={
              offerOptionsEnabledCount > 0
                ? `${offerOptionsEnabledCount} enabled`
                : "Optional"
            }
          >
            {renderOfferOptionsSection()}
          </DetailSection>

          {visibleModules.length > 0 ? (
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
          ) : null}
        </div>

        <div className="create-offer-sticky-preview 2xl:w-[360px]">{preview}</div>
      </div>
    </div>
  );
}
