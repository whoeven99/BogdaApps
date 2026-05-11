import { Button, Checkbox, Dropdown, Input, Modal, Select, Switch } from "antd";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CompleteBundleProduct } from "../../../utils/offerParsing";
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
import { ProgressiveGiftsSection } from "./ProgressiveGiftsSection";
import SubscriptionSettingsEditor from "./SubscriptionSettingsEditor";

type Props = {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  totalStoreProductsCount: number;
  activeTriggerSelectionMode: "all" | "collection" | "exclude" | "custom" | null;
  activeTriggerSelectionSummary: string;
  onSelectAllTriggerProducts: () => void;
  onSelectTriggerProductsByCollection: () => void;
  onExcludeTriggerProducts: () => void;
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

function ProductPoolManager({
  selectedProducts,
  totalStoreProductsCount,
  activeSelectionMode,
  activeSelectionSummary,
  onSelectAll,
  onSelectByCollection,
  onExclude,
  onCustomFilter,
  allowBulkSelection,
}: {
  selectedProducts: CampaignDraft["selectedProductsData"];
  totalStoreProductsCount: number;
  activeSelectionMode: "all" | "collection" | "exclude" | "custom" | null;
  activeSelectionSummary: string;
  onSelectAll: () => void;
  onSelectByCollection: () => void;
  onExclude: () => void;
  onCustomFilter: () => void;
  allowBulkSelection: boolean;
}) {
  const renderModeButton = (
    mode: "all" | "collection" | "exclude" | "custom",
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
            {selectedProducts.length ? "Edit in product picker" : "Open product picker"}
          </Button>
        </div>
      </div>

      {allowBulkSelection ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {renderModeButton("all", "Select all", onSelectAll)}
          {renderModeButton("collection", "Select by collection", onSelectByCollection)}
          {renderModeButton("exclude", "Exclude products", onExclude)}
          {renderModeButton("custom", "Custom filter", onCustomFilter)}
        </div>
      ) : null}

      <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
        {allowBulkSelection
          ? "Choose a selection shortcut above, then confirm the final set in Shopify's native product picker when needed."
          : "Use Shopify's native product picker to choose the product for this step."}
        {allowBulkSelection && activeSelectionSummary ? (
          <div className="mt-2 text-[12px] font-medium text-[#1c1f23]">
            Current selection mode: {activeSelectionSummary}
          </div>
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
                <span className="rounded-full bg-[#f0faf6] px-2 py-0.5 text-[11px] font-medium text-[#006e52]">
                  Default
                </span>
              ) : null}
              {bar.supportState === "draft_only" ? (
                <span className="rounded-full bg-[#fff8e1] px-2 py-0.5 text-[11px] font-medium text-[#8a6116]">
                  Draft only
                </span>
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

  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Trigger">
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Trigger quantity
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

      <BuilderSection title="Reward">
        <FieldGrid>
          {bar.type === "quantity_break" ? (
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
          ) : null}

          {bar.type === "free_gift" ? (
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

          {bar.type === "bxgy" ? (
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
        {supportsRewardScope ? (
          <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
            {draft.selectedProductsData.length > 0
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
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: CampaignDraft["freeGiftRules"][number];
  actions: CampaignDraftActions;
  headerActions?: ReactNode;
  onChange: (patch: Partial<CampaignDraft["freeGiftRules"][number]>) => void;
}) {
  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Trigger">
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Trigger quantity
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
          onAction={() => void actions.selectFreeGiftRewardProducts(bar.sourceRef.index)}
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
  rule,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  draft: CampaignDraft;
  rule: CampaignDraft["differentProductsDiscountRules"][number];
  headerActions?: ReactNode;
  onChange: (patch: Partial<CampaignDraft["differentProductsDiscountRules"][number]>) => void;
}) {
  const triggerProductIds = draft.selectedProductsData.map((product) => String(product.id));
  const triggerProductIdSet = new Set(triggerProductIds);
  const effectiveScopedIds = (rule.buyProductIds || []).filter((id) =>
    triggerProductIdSet.has(String(id)),
  );
  const scopedCount = effectiveScopedIds.length;
  const totalTriggerCount = triggerProductIds.length;
  const [isEligiblePoolModalOpen, setIsEligiblePoolModalOpen] = useState(false);
  const [draftScopedIds, setDraftScopedIds] = useState<string[]>(effectiveScopedIds);

  const openEligiblePoolModal = () => {
    setDraftScopedIds(effectiveScopedIds);
    setIsEligiblePoolModalOpen(true);
  };

  const applyEligiblePoolChanges = () => {
    onChange({
      buyProductIds: draftScopedIds.length > 0 ? draftScopedIds : triggerProductIds,
    });
    setIsEligiblePoolModalOpen(false);
  };

  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection title="Trigger">
        <FieldGrid>
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Trigger quantity
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
      </BuilderSection>

      <BuilderSection title="Eligible product pool">
        <CompactActionRow
          title="Reduce from Trigger products"
          meta={
            totalTriggerCount > 0
              ? `${scopedCount} of ${totalTriggerCount} trigger products are included in this bar.`
              : "Add Trigger products first. Eligible product pool inherits from that selection."
          }
          actionLabel={totalTriggerCount > 0 ? "Edit eligible products" : "No trigger products"}
          onAction={openEligiblePoolModal}
        />
        <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
          {totalTriggerCount > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Eligible product pool is a subset of Trigger products.
                {" "}
                {scopedCount} of {totalTriggerCount} trigger products are currently included in this bar.
              </span>
              {scopedCount !== totalTriggerCount ? (
                <Button
                  type="link"
                  size="small"
                  className="px-0"
                  onClick={() => onChange({ buyProductIds: triggerProductIds })}
                >
                  Use all trigger products
                </Button>
              ) : null}
            </div>
          ) : (
            "Add Trigger products first. Eligible product pool inherits from that selection and can then be narrowed for this bar."
          )}
        </div>
        <Modal
          title="Edit eligible product pool"
          open={isEligiblePoolModalOpen}
          onCancel={() => setIsEligiblePoolModalOpen(false)}
          onOk={applyEligiblePoolChanges}
          okText="Apply"
          cancelText="Cancel"
          okButtonProps={{ disabled: totalTriggerCount === 0 }}
        >
          <div className="space-y-4">
            <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
              Eligible product pool inherits from Trigger products. Remove products here to narrow this bar without changing the shared trigger pool.
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[12px] text-[#5c6166]">
                {draftScopedIds.length} of {totalTriggerCount} trigger products selected
              </div>
              <Button
                type="link"
                size="small"
                className="px-0"
                onClick={() => setDraftScopedIds(triggerProductIds)}
                disabled={totalTriggerCount === 0}
              >
                Use all trigger products
              </Button>
            </div>
            <div className="max-h-[320px] space-y-2 overflow-auto pr-1">
              {draft.selectedProductsData.map((product) => {
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
              Add bundle products
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
              Add the bundle products customers can choose alongside the current trigger product.
            </div>
            <Button onClick={() => actions.addCompleteBundleBar("quantity-break-same")}>
              Add bundle products
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
              products and discounts below.
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
  onSelectAllTriggerProducts,
  onSelectTriggerProductsByCollection,
  onExcludeTriggerProducts,
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
      visibleModules.some((module) => module.id === activeModuleId)
    ) {
      return;
    }
    if (visibleModules.length > 0) {
      const firstEnabledModule = visibleModules.find((module) => module.enabled);
      setActiveModuleId((firstEnabledModule || visibleModules[0]).id);
      return;
    }
    setActiveModuleId(null);
  }, [activeModuleId, visibleModules]);

  const activeModule = useMemo(
    () =>
      visibleModules.find((module) => module.id === activeModuleId) ||
      visibleModules.find((module) => module.enabled) ||
      visibleModules[0],
    [activeModuleId, visibleModules],
  );

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
        disabled={index === 0}
        icon={<ChevronUp size={14} aria-hidden />}
        aria-label={`Move ${bar.title} up`}
        title="Move up"
        onClick={() => onMoveBarUp(bar.id)}
      />
      <Button
        type="text"
        size="small"
        className="flex items-center justify-center"
        disabled={index === bars.length - 1}
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
        icon={<Trash2 size={14} aria-hidden />}
        aria-label={`Remove ${bar.title}`}
        title="Remove"
        onClick={() => removeCampaignCompositionBar(bar, actions)}
      />
    </div>
  );

  const renderBarDetail = (bar: CampaignBarItem, index: number) => {
    if (bar.sourceRef.collection === "differentProductsDiscountRules") {
      const rule = draft.differentProductsDiscountRules[bar.sourceRef.index];
      if (!rule) return null;
      return (
        <DifferentProductsRuleBarDetail
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
              actions.setDifferentProductsDiscountRules((prev) =>
                prev.map((entry, ruleIndex) =>
                  ruleIndex === bar.sourceRef.index
                    ? {
                        ...entry,
                        ...patch,
                        count:
                          typeof patch.count === "number" ? patch.count : entry.count,
                        buyQuantity:
                          typeof patch.buyQuantity === "number"
                            ? patch.buyQuantity
                            : typeof patch.count === "number"
                              ? patch.count
                              : entry.buyQuantity,
                        getQuantity: 0,
                        getProductIds: [],
                        maxUsesPerOrder: 1,
                        tierType: "simple",
                      }
                    : entry,
                ),
              );
            })()
          }
        />
      );
    }

    if (bar.sourceRef.collection === "discountRules") {
      const rule = draft.discountRules[bar.sourceRef.index];
      if (!rule) return null;
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
                  ruleIndex === bar.sourceRef.index ? { ...entry, ...patch } : entry,
                ),
              );
            })()
          }
        />
      );
    }

    if (bar.sourceRef.collection === "bxgyDiscountRules") {
      const rule = draft.bxgyDiscountRules[bar.sourceRef.index];
      if (!rule) return null;
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
                  ruleIndex === bar.sourceRef.index ? { ...entry, ...patch } : entry,
                ),
              );
            })()
          }
        />
      );
    }

    if (bar.sourceRef.collection === "freeGiftRules") {
      const rule = draft.freeGiftRules[bar.sourceRef.index];
      if (!rule) return null;
      return (
        <FreeGiftRuleBarDetail
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
              actions.setFreeGiftRules((prev) =>
                prev.map((entry, ruleIndex) =>
                  ruleIndex === bar.sourceRef.index ? { ...entry, ...patch } : entry,
                ),
              );
            })()
          }
        />
      );
    }

    return null;
  };

  const renderModuleDetail = () => {
    if (!activeModule) {
      return (
        <QuietEmptyState>
          No components available for this template yet.
        </QuietEmptyState>
      );
    }

    switch (activeModule.id) {
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
              normalizedDiscountRules={draft.normalizedDiscountRules}
              bxgyDiscountRules={draft.bxgyDiscountRules}
              differentProductsDiscountRules={draft.differentProductsDiscountRules}
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
            title={activeModule.label}
          />
        );
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
                      onSelectAll={onSelectAllTriggerProducts}
                      onSelectByCollection={onSelectTriggerProductsByCollection}
                      onExclude={onExcludeTriggerProducts}
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
                  const isActive = activeModule?.id === module.id;
                  const tone = getModuleStatusTone(module, isActive);
                  return (
                    <button
                      key={module.id}
                      type="button"
                      onClick={() => setActiveModuleId(module.id)}
                      className={`w-full rounded-[10px] border px-3 py-3 text-left transition ${tone.container}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
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
                        </div>
                        {module.toggleable ? (
                          <Switch
                            checked={module.enabled}
                            onClick={(checked, event) => {
                              event?.stopPropagation();
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
                            }}
                          />
                        ) : null}
                      </div>
                    </button>
                  );
                })()
              ))}
            </div>
            <div className="mt-4">{renderModuleDetail()}</div>
          </DetailSection>
        </div>

        <div className="create-offer-sticky-preview 2xl:w-[360px]">{preview}</div>
      </div>
    </div>
  );
}
