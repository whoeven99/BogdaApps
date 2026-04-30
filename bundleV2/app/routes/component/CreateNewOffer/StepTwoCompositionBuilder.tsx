import { Button, Checkbox, Dropdown, Input, Switch } from "antd";
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
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[#e3e8ed] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">{title}</h3>
          {description ? (
            <p className="m-0 mt-2 text-[13px] text-[#5c6166]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>;
}

function getBarTypeLabel(type: CampaignBarItem["type"]) {
  switch (type) {
    case "quantity_break":
      return "Quantity break";
    case "bxgy":
      return "Buy X, get Y";
    case "free_gift":
      return "Free gift";
    default:
      return type;
  }
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
    <div className="rounded-[10px] border border-[#e3e8ed] bg-[#fafbfb] px-4 py-4">
      <div className="mb-4">
        <div className="text-[13px] font-semibold text-[#1c1f23]">{title}</div>
        {description ? (
          <div className="mt-1 text-[12px] text-[#5c6166]">{description}</div>
        ) : null}
      </div>
      {children}
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
    <div className="rounded-[12px] border border-[#dfe3e8] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="border-b border-[#e3e8ed] px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="m-0 text-[15px] font-semibold text-[#1c1f23]">{bar.title}</h3>
              <span className="rounded-full bg-[#f4f6f8] px-2 py-0.5 text-[11px] font-medium text-[#5c6166]">
                {getBarTypeLabel(bar.type)}
              </span>
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
            <p className="m-0 mt-2 text-[13px] text-[#5c6166]">{bar.summary}</p>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      </div>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </div>
  );
}

function CommonPresentationFields({
  title,
  subtitle,
  badge,
  isDefault,
  onPatch,
}: {
  title?: string;
  subtitle?: string;
  badge?: string;
  isDefault?: boolean;
  onPatch: (patch: {
    title?: string;
    subtitle?: string;
    badge?: string;
    isDefault?: boolean;
  }) => void;
}) {
  return (
    <>
      <FieldGrid>
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Title
          <Input
            size="large"
            className="mt-1"
            value={title || ""}
            onChange={(e) => onPatch({ title: e.target.value })}
          />
        </label>
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Subtitle
          <Input
            size="large"
            className="mt-1"
            value={subtitle || ""}
            onChange={(e) => onPatch({ subtitle: e.target.value })}
          />
        </label>
      </FieldGrid>

      <div className="mt-4">
        <label className="block text-[13px] font-medium text-[#1c1f23]">
          Badge
          <Input
            size="large"
            className="mt-1"
            value={badge || ""}
            onChange={(e) => onPatch({ badge: e.target.value })}
          />
        </label>
      </div>

      <div className="mt-4">
        <Checkbox
          checked={!!isDefault}
          onChange={(e) => onPatch({ isDefault: e.target.checked })}
        >
          Set as default selected
        </Checkbox>
      </div>
    </>
  );
}

function DiscountRuleBarDetail({
  bar,
  draft,
  rule,
  actions,
  onChange,
}: {
  bar: CampaignBarItem;
  draft: CampaignDraft;
  rule: DraftDiscountRule;
  actions?: ReactNode;
  onChange: (patch: Partial<DraftDiscountRule>) => void;
}) {
  return (
    <BuilderBarCard bar={bar} actions={actions}>
      <BuilderSection
        title="Trigger"
      >
        <div className="rounded-[8px] border border-dashed border-[#dfe3e8] bg-white px-3 py-3 text-[13px] text-[#5c6166]">
          {draft.selectedProductsData.length} products in the global trigger pool
        </div>
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
            </>
          ) : null}
        </FieldGrid>
      </BuilderSection>

      <BuilderSection
        title="Presentation"
      >
        <CommonPresentationFields
          title={rule.title}
          subtitle={rule.subtitle}
          badge={rule.badge}
          isDefault={rule.isDefault}
          onPatch={onChange}
        />
      </BuilderSection>
    </BuilderBarCard>
  );
}

function BxgyRuleBarDetail({
  bar,
  rule,
  draft,
  actions,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: DraftBxgyDiscountRule;
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  headerActions?: ReactNode;
  onChange: (patch: Partial<DraftBxgyDiscountRule>) => void;
}) {
  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection
        title="Trigger"
      >
        <div className="rounded-[8px] border border-dashed border-[#dfe3e8] bg-white px-3 py-3 text-[13px] text-[#5c6166]">
          {draft.buyProducts.length} products in the global trigger pool
        </div>
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
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
          <div className="text-[13px] font-medium text-[#1c1f23]">
            Reward products (Y)
          </div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {rule.getProductIds.length} selected for this bar
          </div>
          <Button
            className="mt-3"
            onClick={() =>
              void actions.selectBxgyRewardProducts(bar.sourceRef.index)
            }
          >
            Edit reward products
          </Button>
        </div>
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

      <BuilderSection
        title="Presentation"
      >
        <CommonPresentationFields
          title={rule.title}
          subtitle={rule.subtitle}
          badge={rule.badge}
          isDefault={rule.isDefault}
          onPatch={onChange}
        />
      </BuilderSection>
    </BuilderBarCard>
  );
}

function FreeGiftRuleBarDetail({
  bar,
  rule,
  draft,
  actions,
  headerActions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: CampaignDraft["freeGiftRules"][number];
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  headerActions?: ReactNode;
  onChange: (patch: Partial<CampaignDraft["freeGiftRules"][number]>) => void;
}) {
  return (
    <BuilderBarCard bar={bar} actions={headerActions}>
      <BuilderSection
        title="Trigger"
      >
        <div className="rounded-[8px] border border-dashed border-[#dfe3e8] bg-white px-3 py-3 text-[13px] text-[#5c6166]">
          {draft.freeGiftTriggerProducts.length} products in the global trigger pool
        </div>
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
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
          <div className="text-[13px] font-medium text-[#1c1f23]">Gift products</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {(rule.giftProductIds || []).length} selected for this bar
          </div>
          <Button
            className="mt-3"
            onClick={() =>
              void actions.selectFreeGiftRewardProducts(bar.sourceRef.index)
            }
          >
            Edit gift products
          </Button>
        </div>
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

      <BuilderSection
        title="Presentation"
      >
        <CommonPresentationFields
          title={rule.title}
          subtitle={rule.subtitle}
          badge={rule.badge}
          isDefault={rule.isDefault}
          onPatch={onChange}
        />
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
      <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-4 text-[13px] text-[#5c6166]">
        This component is available in Step 2.
      </div>
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
      <div className="mb-5 rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
        <div className="text-[13px] font-medium text-[#1c1f23]">Bundle products</div>
        <div className="mt-1 text-[12px] text-[#5c6166]">
          {draft.productBundleProductsData.length} selected for this module
        </div>
        <Button
          className="mt-3"
          onClick={() => void actions.handleSelectProducts("product_bundle")}
        >
          {draft.productBundleProductsData.length ? "Edit bundle products" : "Select bundle products"}
        </Button>
      </div>

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
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-4">
          <Button className="mt-4" onClick={() => actions.addCompleteBundleBar("quantity-break-same")}>
            Enable complete bundle module
          </Button>
        </div>
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
    if (activeModuleId && modules.some((module) => module.id === activeModuleId)) {
      return;
    }
    if (modules.length > 0) {
      const firstEnabledModule = modules.find((module) => module.enabled);
      setActiveModuleId((firstEnabledModule || modules[0]).id);
      return;
    }
    setActiveModuleId(null);
  }, [activeModuleId, modules]);

  const activeModule = useMemo(
    () =>
      modules.find((module) => module.id === activeModuleId) ||
      modules.find((module) => module.enabled) ||
      modules[0],
    [activeModuleId, modules],
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

  const renderPoolCard = ({
    title,
    count,
    buttonLabel,
    onClick,
  }: {
    title: string;
    count: number;
    buttonLabel: string;
    onClick: () => void;
  }) => (
    <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
      <div className="text-[13px] font-medium text-[#1c1f23]">{title}</div>
      <div className="mt-2 text-[12px] text-[#1c1f23]">
        {count} selected
      </div>
      <Button className="mt-3" onClick={onClick}>
        {buttonLabel}
      </Button>
    </div>
  );

  const renderBarActions = (bar: CampaignBarItem, index: number) => (
    <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
      <Button
        size="small"
        disabled={index === 0}
        onClick={() => onMoveBarUp(bar.id)}
      >
        Up
      </Button>
      <Button
        size="small"
        disabled={index === bars.length - 1}
        onClick={() => onMoveBarDown(bar.id)}
      >
        Down
      </Button>
      <Button
        danger
        size="small"
        onClick={() => removeCampaignCompositionBar(bar, actions)}
      >
        Remove
      </Button>
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
          actions={renderBarActions(bar, index)}
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
          draft={draft}
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
          draft={draft}
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
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-4 text-[13px] text-[#5c6166]">
          No components available for this template yet.
        </div>
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
            <div className="flex items-center justify-between rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
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
            <div className="flex items-center justify-between rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
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
            <div className="flex items-center justify-between rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <DetailSection title="Product pool">
            <div className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
              {showGlobalProductPool
                ? renderPoolCard({
                    title: "Trigger products",
                    count: globalTriggerCount,
                    buttonLabel: globalTriggerCount
                      ? "Edit trigger products"
                      : "Select trigger products",
                    onClick: () => void actions.handleSelectProducts("normal"),
                  })
                : null}
              {!showGlobalProductPool ? (
                <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-4 text-[13px] text-[#5c6166] xl:col-span-2">
                  Product pool controls will appear here as soon as the template includes
                  bars that need shared product selection.
                </div>
              ) : null}
            </div>
          </DetailSection>

          <DetailSection
            title="Bars"
            actions={
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
            }
          >
            <div className="space-y-4">
              {bars.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-4 text-[13px] text-[#5c6166]">
                  No bars yet. Add one here to start defining the campaign logic.
                </div>
              ) : (
                bars.map((bar, index) => renderBarDetail(bar, index))
              )}
            </div>
          </DetailSection>

          <DetailSection title="Components">
            <div className="flex flex-col gap-2">
              {modules.map((module) => (
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
