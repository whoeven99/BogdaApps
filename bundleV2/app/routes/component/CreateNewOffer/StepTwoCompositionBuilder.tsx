import { Button, Checkbox, Dropdown, Input, Select, Switch } from "antd";
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
import DifferentProductsLogicEditor from "./DifferentProductsLogicEditor";
import { ProgressiveGiftsSection } from "./ProgressiveGiftsSection";
import SubscriptionSettingsEditor from "./SubscriptionSettingsEditor";

type Props = {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  availableProducts: Array<CampaignDraft["selectedProductsData"][number]>;
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
  availableProducts,
  onOpenPicker,
  onChange,
}: {
  selectedProducts: CampaignDraft["selectedProductsData"];
  availableProducts: Array<CampaignDraft["selectedProductsData"][number]>;
  onOpenPicker: () => void;
  onChange: React.Dispatch<
    React.SetStateAction<CampaignDraft["selectedProductsData"]>
  >;
}) {
  const [query, setQuery] = useState("");
  const [checkedIds, setCheckedIds] = useState<string[]>([]);

  const selectedIdSet = useMemo(
    () => new Set(selectedProducts.map((product) => String(product.id))),
    [selectedProducts],
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const source = availableProducts.filter((product) => String(product.id).trim());
    if (!normalizedQuery) return source.slice(0, 60);
    return source
      .filter((product) => product.title.toLowerCase().includes(normalizedQuery))
      .slice(0, 60);
  }, [availableProducts, query]);

  useEffect(() => {
    const visibleIds = new Set(filteredProducts.map((product) => String(product.id)));
    setCheckedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [filteredProducts]);

  const filteredIds = filteredProducts.map((product) => String(product.id));
  const checkedIdSet = new Set(checkedIds);
  const selectedCountInFilter = filteredProducts.filter((product) =>
    selectedIdSet.has(String(product.id)),
  ).length;

  const toggleChecked = (productId: string, checked: boolean) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(productId);
      else next.delete(productId);
      return Array.from(next);
    });
  };

  const selectAllFiltered = () => setCheckedIds(filteredIds);
  const invertFiltered = () =>
    setCheckedIds(filteredIds.filter((id) => !checkedIdSet.has(id)));

  const addCheckedToPool = () => {
    if (!checkedIds.length) return;
    const availableMap = new Map(
      availableProducts.map((product) => [String(product.id), product]),
    );
    onChange((prev) => {
      const existingIds = new Set(prev.map((product) => String(product.id)));
      const additions = checkedIds
        .map((id) => availableMap.get(String(id)))
        .filter(
          (
            product,
          ): product is CampaignDraft["selectedProductsData"][number] => Boolean(product),
        )
        .filter((product) => !existingIds.has(String(product.id)));
      return additions.length > 0 ? [...prev, ...additions] : prev;
    });
  };

  const removeCheckedFromPool = () => {
    if (!checkedIds.length) return;
    const idsToRemove = new Set(checkedIds);
    onChange((prev) =>
      prev.filter((product) => !idsToRemove.has(String(product.id))),
    );
  };

  return (
    <div className="space-y-3 rounded-[10px] border border-[#e3e8ed] bg-white p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-[#1c1f23]">Trigger products</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {selectedProducts.length} selected in the shared pool
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onOpenPicker}>
            {selectedProducts.length ? "Edit in Shopify picker" : "Select in Shopify picker"}
          </Button>
          <Button
            danger={selectedProducts.length > 0}
            disabled={selectedProducts.length === 0}
            onClick={() => onChange([])}
          >
            Clear pool
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Search products
          <Input
            size="large"
            className="mt-1"
            value={query}
            placeholder="Search by product title"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={selectAllFiltered} disabled={filteredProducts.length === 0}>
            Select all
          </Button>
          <Button onClick={invertFiltered} disabled={filteredProducts.length === 0}>
            Invert
          </Button>
          <Button type="primary" onClick={addCheckedToPool} disabled={checkedIds.length === 0}>
            Add checked
          </Button>
          <Button onClick={removeCheckedFromPool} disabled={checkedIds.length === 0}>
            Remove checked
          </Button>
        </div>
      </div>

      <div className="rounded-[10px] bg-[#f6f8f9] px-3 py-2 text-[12px] text-[#5c6166]">
        {filteredProducts.length} visible
        {query.trim() ? ` for "${query.trim()}"` : ""} • {selectedCountInFilter} already in pool •{" "}
        {checkedIds.length} checked
      </div>

      {filteredProducts.length === 0 ? (
        <QuietEmptyState>
          No products match the current filter. Try another keyword or use the Shopify picker.
        </QuietEmptyState>
      ) : (
        <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
          {filteredProducts.map((product) => {
            const productId = String(product.id);
            const isChecked = checkedIdSet.has(productId);
            const isSelected = selectedIdSet.has(productId);
            return (
              <label
                key={productId}
                className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-3 py-3 transition ${
                  isSelected
                    ? "border-[#b7e1d3] bg-[#f5fff9]"
                    : "border-[#e3e8ed] bg-white hover:border-[#c9ccd0]"
                }`}
              >
                <Checkbox
                  checked={isChecked}
                  onChange={(e) => toggleChecked(productId, e.target.checked)}
                />
                <img
                  src={product.image}
                  alt={product.title}
                  className="h-10 w-10 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-[#1c1f23]">
                    {product.title}
                  </div>
                  <div className="mt-1 text-[12px] text-[#5c6166]">
                    {product.price} • {product.variantsCount} variant
                    {product.variantsCount > 1 ? "s" : ""}
                    {product.hasSubscription ? " • Subscription" : ""}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    isSelected
                      ? "bg-[#f0faf6] text-[#006e52]"
                      : "bg-[#f4f6f8] text-[#5c6166]"
                  }`}
                >
                  {isSelected ? "In pool" : "Available"}
                </span>
              </label>
            );
          })}
        </div>
      )}
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
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Buy quantity (X)
            <Input
              size="large"
              type="number"
              min={1}
              className="mt-1"
              value={rule.buyQuantity}
              onChange={(e) =>
                onChange({ buyQuantity: parsePositiveInt(e.target.value, rule.buyQuantity) })
              }
            />
          </label>
        </FieldGrid>
      </BuilderSection>

      <BuilderSection
        title="Reward"
      >
        <CompactActionRow
          title="Reward products (Y)"
          meta={`${rule.getProductIds.length} selected for this bar`}
          actionLabel="Edit reward products"
          onAction={() => void actions.selectBxgyRewardProducts(bar.sourceRef.index)}
        />
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
          <label className="block text-[13px] font-medium text-[#1c1f23]">
            Max uses per order
            <Input
              size="large"
              type="number"
              min={1}
              className="mt-1"
              value={rule.maxUsesPerOrder}
              onChange={(e) =>
                onChange({
                  maxUsesPerOrder: parsePositiveInt(e.target.value, rule.maxUsesPerOrder),
                })
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

function ProductBundleModuleDetail({
  draft,
  actions,
}: {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
}) {
  return (
    <DetailSection title="Product bundle">
      <CompactActionRow
        title="Bundle products"
        meta={`${draft.productBundleProductsData.length} selected for this module`}
        actionLabel={
          draft.productBundleProductsData.length ? "Edit bundle products" : "Select bundle products"
        }
        onAction={() => void actions.handleSelectProducts("product_bundle")}
      />

      <FieldGrid>
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Module title
          <Input
            size="large"
            className="mt-1"
            value={draft.productBundleTitle}
            onChange={(e) => actions.setProductBundleTitle(e.target.value)}
          />
        </label>
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Minimum bundle quantity
          <Input
            size="large"
            type="number"
            min={1}
            className="mt-1"
            value={draft.productBundleMinQuantity}
            onChange={(e) =>
              actions.setProductBundleMinQuantity(parsePositiveInt(e.target.value, 2))
            }
          />
        </label>
      </FieldGrid>

      <div className="mt-4">
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Module subtitle
          <Input
            size="large"
            className="mt-1"
            value={draft.productBundleSubtitle}
            onChange={(e) => actions.setProductBundleSubtitle(e.target.value)}
          />
        </label>
      </div>

    </DetailSection>
  );
}

function CompleteBundleModuleDetail({
  draft,
  actions,
  renderCompleteBundleProductPricingCard,
}: {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  renderCompleteBundleProductPricingCard: Props["renderCompleteBundleProductPricingCard"];
}) {
  const isPrimaryTemplate = draft.offerType === "complete-bundle";

  if (!draft.completeBundleBars.length && !isPrimaryTemplate) {
    return (
      <DetailSection title="Complete bundle">
        <QuietEmptyState>
          <Button className="mt-4" onClick={() => actions.addCompleteBundleBar("quantity-break-same")}>
            Enable complete bundle module
          </Button>
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
          simpleMode={!isPrimaryTemplate}
        />
      </div>
    </DetailSection>
  );
}

export default function StepTwoCompositionBuilder({
  draft,
  actions,
  availableProducts,
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
  const visibleModules = useMemo(
    () =>
      modules.filter(
        (module) =>
          !(draft.offerType === "complete-bundle" && module.id === "complete_bundle"),
      ),
    [draft.offerType, modules],
  );

  const clearBarDefaults = () => {
    actions.setDiscountRules((prev) =>
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
            renderCompleteBundleProductPricingCard={renderCompleteBundleProductPricingCard}
          />
        );
      case "product_bundle":
        return <ProductBundleModuleDetail draft={draft} actions={actions} />;
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
      case "sticky_add_to_cart":
        return (
          <DetailSection title="Sticky add to cart">
            <div className="flex items-center justify-between rounded-[10px] bg-[#f6f8f9] px-4 py-3">
              <div>
                <div className="text-[14px] font-medium text-[#1c1f23]">
                  Enable sticky add to cart
                </div>
                <div className="mt-1 text-[12px] text-[#5c6166]">
                  Keep a bundle CTA visible as a secondary conversion companion.
                </div>
              </div>
              <Switch
                checked={draft.stickyAddToCartEnabled}
                onChange={actions.setStickyAddToCartEnabled}
              />
            </div>
            <div className="mt-4">
              <FieldGrid>
                <label className="block text-[13px] font-medium text-[#1c1f23]">
                  Sticky title
                  <Input
                    size="large"
                    className="mt-1"
                    value={draft.stickyAddToCartTitle}
                    onChange={(e) => actions.setStickyAddToCartTitle(e.target.value)}
                  />
                </label>
                <label className="block text-[13px] font-medium text-[#1c1f23]">
                  Button text
                  <Input
                    size="large"
                    className="mt-1"
                    value={draft.stickyAddToCartButtonText}
                    onChange={(e) => actions.setStickyAddToCartButtonText(e.target.value)}
                  />
                </label>
              </FieldGrid>
              <div className="mt-4">
                <label className="block text-[13px] font-medium text-[#1c1f23]">
                  Sticky subtitle
                  <Input
                    size="large"
                    className="mt-1"
                    value={draft.stickyAddToCartSubtitle}
                    onChange={(e) => actions.setStickyAddToCartSubtitle(e.target.value)}
                  />
                </label>
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

  const primaryBarsCount =
    draft.offerType === "complete-bundle"
      ? draft.completeBundleBars.length
      : draft.offerType === "quantity-breaks-different"
        ? draft.differentProductsDiscountRules.length
        : bars.length;

  const renderBarsSection = () => {
    if (draft.offerType === "quantity-breaks-different") {
      return (
        <DifferentProductsLogicEditor
          selectedProductsData={draft.selectedProductsData}
          differentProductsDiscountRules={draft.differentProductsDiscountRules}
          setDifferentProductsDiscountRules={actions.setDifferentProductsDiscountRules}
          updateRuleValues={actions.updateUnifiedRuleValues}
          updateRulePresentation={actions.updateUnifiedRulePresentation}
        />
      );
    }

    if (draft.offerType === "complete-bundle") {
      return (
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
          section="all"
        />
      );
    }

    return (
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
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <DetailSection
            title="Product pool"
            meta={showGlobalProductPool ? `${globalTriggerCount} selected` : "Optional"}
          >
            <div className="space-y-3">
              {showGlobalProductPool
                ? (
                  <ProductPoolManager
                    selectedProducts={draft.selectedProductsData}
                    availableProducts={availableProducts}
                    onOpenPicker={() => void actions.handleSelectProducts("normal")}
                    onChange={actions.setSelectedProductsData}
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

          <DetailSection
            title="Bars"
            meta={`${primaryBarsCount} configured`}
            actions={
              draft.offerType === "quantity-breaks-different" ||
              draft.offerType === "complete-bundle"
                ? undefined
                : (
              <Dropdown
                trigger={["click"]}
                menu={{
                  items: ADD_BAR_MENU_ITEMS,
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
                )
            }
          >
            {renderBarsSection()}
          </DetailSection>

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
                              if (module.id === "product_bundle") {
                                actions.setProductBundleEnabled(Boolean(checked));
                                if (
                                  checked &&
                                  draft.productBundleProductIds.length === 0 &&
                                  draft.selectedProductsData.length > 0
                                ) {
                                  void actions.handleSelectProducts("product_bundle");
                                }
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
                              if (module.id === "sticky_add_to_cart") {
                                actions.setStickyAddToCartEnabled(Boolean(checked));
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
