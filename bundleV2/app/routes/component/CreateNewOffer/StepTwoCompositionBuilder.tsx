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

type Selection =
  | { kind: "bar"; id: string }
  | { kind: "module"; id: StepTwoModuleId };

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
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-[#e3e8ed] bg-white p-5">
      <div>
        <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">{title}</h3>
        <p className="m-0 mt-2 text-[13px] text-[#5c6166]">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function FieldGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">{children}</div>;
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
  rule,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: DraftDiscountRule;
  onChange: (patch: Partial<DraftDiscountRule>) => void;
}) {
  return (
    <DetailSection
      title={bar.title}
      description="Edit the selected bar. This first phase keeps the configuration focused on the selected item while preserving the existing rule model underneath."
    >
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

      <div className="mt-5 rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3 text-[13px] text-[#5c6166]">
        {bar.type === "bxgy"
          ? "This BXGY bar currently reuses the shared selected product scope from the template path."
          : bar.type === "free_gift"
            ? "This free-gift bar currently uses the selected product scope from the main campaign path."
            : "This quantity-break bar uses the shared selected products from the campaign scope."}
      </div>

      <div className="mt-5">
        <CommonPresentationFields
          title={rule.title}
          subtitle={rule.subtitle}
          badge={rule.badge}
          isDefault={rule.isDefault}
          onPatch={onChange}
        />
      </div>
    </DetailSection>
  );
}

function BxgyRuleBarDetail({
  bar,
  rule,
  draft,
  actions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: DraftBxgyDiscountRule;
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  onChange: (patch: Partial<DraftBxgyDiscountRule>) => void;
}) {
  return (
    <DetailSection
      title={bar.title}
      description="Edit the selected BXGY bar. Product scopes remain shared for the BXGY rule family, while quantities and presentation are configured per bar."
    >
      <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
          <div className="text-[13px] font-medium text-[#1c1f23]">Buy products</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {draft.buyProducts.length} selected across BXGY bars
          </div>
          <Button className="mt-3" onClick={() => void actions.handleSelectProducts("buy")}>
            Edit buy products
          </Button>
        </div>
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
          <div className="text-[13px] font-medium text-[#1c1f23]">Reward products</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {draft.getProducts.length} selected across BXGY bars
          </div>
          <Button className="mt-3" onClick={() => void actions.handleSelectProducts("get")}>
            Edit reward products
          </Button>
        </div>
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

      <div className="mt-5">
        <CommonPresentationFields
          title={rule.title}
          subtitle={rule.subtitle}
          badge={rule.badge}
          isDefault={rule.isDefault}
          onPatch={onChange}
        />
      </div>
    </DetailSection>
  );
}

function FreeGiftRuleBarDetail({
  bar,
  rule,
  draft,
  actions,
  onChange,
}: {
  bar: CampaignBarItem;
  rule: CampaignDraft["freeGiftRules"][number];
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  onChange: (patch: Partial<CampaignDraft["freeGiftRules"][number]>) => void;
}) {
  return (
    <DetailSection
      title={bar.title}
      description="Edit the selected free-gift bar. Trigger and gift scopes remain shared while each bar controls its unlock quantity and gift amount."
    >
      <div className="mb-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
          <div className="text-[13px] font-medium text-[#1c1f23]">Trigger products</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {draft.freeGiftTriggerProducts.length} selected
          </div>
          <Button className="mt-3" onClick={() => void actions.handleSelectProducts("normal")}>
            Edit trigger products
          </Button>
        </div>
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3">
          <div className="text-[13px] font-medium text-[#1c1f23]">Gift products</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {draft.giftProductsData.length} selected
          </div>
          <Button className="mt-3" onClick={() => void actions.handleSelectProducts("gift")}>
            Edit gift products
          </Button>
        </div>
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
      </FieldGrid>

      <div className="mt-5">
        <CommonPresentationFields
          title={rule.title}
          subtitle={rule.subtitle}
          badge={rule.badge}
          isDefault={rule.isDefault}
          onPatch={onChange}
        />
      </div>
    </DetailSection>
  );
}

function PlaceholderModuleDetail({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <DetailSection title={title} description={description}>
      <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-4 text-[13px] text-[#5c6166]">
        This module shell is now available in Step 2. The next pass can wire its
        full conditional configuration into the new builder detail panel.
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
    <DetailSection
      title="Product bundle"
      description="Configure a bundle-specific module with its own product pool and threshold logic."
    >
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

      <div className="mt-5 rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-3 text-[12px] text-[#5c6166]">
        This module now persists through `campaignConfig.logicBlocks` and can coexist with mixed bars.
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
  const activeBar =
    draft.completeBundleBars.find((bar) => bar.id === draft.activeBundleBarId) ||
    draft.completeBundleBars[0];
  const totalBundleProducts = draft.completeBundleBars.reduce(
    (sum, bar) => sum + bar.products.length,
    0,
  );

  if (!draft.completeBundleBars.length && !isPrimaryTemplate) {
    return (
      <DetailSection
        title="Complete bundle"
        description="Enable this module when the campaign needs dedicated bundle bars, default products, and bundle pricing."
      >
        <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-4 py-4">
          <div className="text-[13px] text-[#5c6166]">
            The module is currently off. Enabling it creates the first bundle bar so you can configure bundle paths separately from the main bar list.
          </div>
          <Button className="mt-4" onClick={() => actions.addCompleteBundleBar("quantity-break-same")}>
            Enable complete bundle module
          </Button>
        </div>
      </DetailSection>
    );
  }

  return (
    <DetailSection
      title="Complete bundle"
      description="Manage bundle-specific paths as a dedicated module. Bars and bundle products are separated here so the Step 2 builder stays easier to scan."
    >
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
        <div className="rounded-[10px] border border-[#e3e8ed] bg-[#fafbfb] px-4 py-3">
          <div className="text-[12px] uppercase tracking-[0.04em] text-[#5c6166]">Bundle bars</div>
          <div className="mt-1 text-[18px] font-semibold text-[#1c1f23]">
            {draft.completeBundleBars.length}
          </div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            Separate bundle paths configured inside this module.
          </div>
        </div>
        <div className="rounded-[10px] border border-[#e3e8ed] bg-[#fafbfb] px-4 py-3">
          <div className="text-[12px] uppercase tracking-[0.04em] text-[#5c6166]">Bundle products</div>
          <div className="mt-1 text-[18px] font-semibold text-[#1c1f23]">
            {totalBundleProducts}
          </div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            Product cards and pricing entries attached across bundle bars.
          </div>
        </div>
        <div className="rounded-[10px] border border-[#e3e8ed] bg-[#fafbfb] px-4 py-3">
          <div className="text-[12px] uppercase tracking-[0.04em] text-[#5c6166]">Active bar</div>
          <div className="mt-1 text-[14px] font-semibold text-[#1c1f23]">
            {activeBar?.title || "None selected"}
          </div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            {activeBar
              ? `${activeBar.products.length} product${activeBar.products.length > 1 ? "s" : ""} attached`
              : "Select or create a bundle bar to continue."}
          </div>
        </div>
      </div>

      {!isPrimaryTemplate ? (
        <div className="mt-4 flex justify-end">
          <Button
            danger
            onClick={() => {
              draft.completeBundleBars.forEach((bar) => {
                actions.removeCompleteBundleBar(bar.id);
              });
            }}
          >
            Disable module
          </Button>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="mb-3">
          <div className="text-[14px] font-semibold text-[#1c1f23]">Bundle bars</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            Define each bundle path and its unlock quantity before attaching products.
          </div>
        </div>
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
          section="bars"
        />
      </div>

      <div className="mt-6">
        <div className="mb-3">
          <div className="text-[14px] font-semibold text-[#1c1f23]">Products & pricing</div>
          <div className="mt-1 text-[12px] text-[#5c6166]">
            Manage the product set and pricing for the currently active bundle bar.
          </div>
        </div>
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
  const [selection, setSelection] = useState<Selection | null>(null);

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
      selection?.kind === "bar" &&
      bars.some((bar) => bar.id === selection.id)
    ) {
      return;
    }
    if (
      selection?.kind === "module" &&
      modules.some((module) => module.id === selection.id)
    ) {
      return;
    }
    if (bars.length > 0) {
      setSelection({ kind: "bar", id: bars[0].id });
      return;
    }
    if (modules.length > 0) {
      setSelection({ kind: "module", id: modules[0].id });
    }
  }, [bars, modules, selection]);

  const selectedBar =
    selection?.kind === "bar"
      ? bars.find((bar) => bar.id === selection.id)
      : undefined;

  const selectedModule =
    selection?.kind === "module"
      ? modules.find((module) => module.id === selection.id)
      : undefined;

  const renderDetail = () => {
    if (selectedBar) {
      if (selectedBar.sourceRef.collection === "discountRules") {
        const rule = draft.discountRules[selectedBar.sourceRef.index];
        if (!rule) return null;
        return (
          <DiscountRuleBarDetail
            bar={selectedBar}
            rule={rule}
            onChange={(patch) =>
              (() => {
                if (patch.isDefault === true) {
                  clearBarDefaults();
                }
                actions.setDiscountRules((prev) =>
                  prev.map((entry, index) =>
                    index === selectedBar.sourceRef.index ? { ...entry, ...patch } : entry,
                  ),
                );
              })()
            }
          />
        );
      }

      if (selectedBar.sourceRef.collection === "bxgyDiscountRules") {
        const rule = draft.bxgyDiscountRules[selectedBar.sourceRef.index];
        if (!rule) return null;
        return (
          <BxgyRuleBarDetail
            bar={selectedBar}
            rule={rule}
            draft={draft}
            actions={actions}
            onChange={(patch) =>
              (() => {
                if (patch.isDefault === true) {
                  clearBarDefaults();
                }
                actions.setBxgyDiscountRules((prev) =>
                  prev.map((entry, index) =>
                    index === selectedBar.sourceRef.index ? { ...entry, ...patch } : entry,
                  ),
                );
              })()
            }
          />
        );
      }

      if (selectedBar.sourceRef.collection === "freeGiftRules") {
        const rule = draft.freeGiftRules[selectedBar.sourceRef.index];
        if (!rule) return null;
        return (
          <FreeGiftRuleBarDetail
            bar={selectedBar}
            rule={rule}
            draft={draft}
            actions={actions}
            onChange={(patch) =>
              (() => {
                if (patch.isDefault === true) {
                  clearBarDefaults();
                }
                actions.setFreeGiftRules((prev) =>
                  prev.map((entry, index) =>
                    index === selectedBar.sourceRef.index ? { ...entry, ...patch } : entry,
                  ),
                );
              })()
            }
          />
        );
      }
    }

    if (selectedModule) {
      switch (selectedModule.id) {
        case "subscription":
          return (
            <DetailSection
              title="Subscriptions"
              description="Manage the conditional subscription option inside Step 2. Pure visual styling remains in Step 3."
            >
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
            <DetailSection
              title="Progressive gifts"
              description="Configure progressive unlock behavior as a supporting Step 2 module."
            >
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
            <DetailSection
              title="Countdown timer"
              description="Keep countdown condition setup in Step 2 while leaving visual countdown styling in Step 3."
            >
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
            <DetailSection
              title="Checkbox upsells"
              description="Configure the opt-in checkbox copy and default selection behavior for this supporting module."
            >
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
            <DetailSection
              title="Sticky add to cart"
              description="Configure the companion sticky CTA that remains visible while customers scroll or compare bars."
            >
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
      }
    }

    return (
      <DetailSection
        title="Scope & Logic"
        description="Select a bar or component from the left to continue editing this template composition."
      >
        <div className="text-[13px] text-[#5c6166]">
          The new builder shell is active. Bars are now managed separately from
          Step 2 components so the template can evolve toward mixed bar
          compositions.
        </div>
      </DetailSection>
    );
  };

  return (
    <div className="create-offer-products-grid">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-[12px] border border-[#e3e8ed] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="m-0 text-[15px] font-semibold text-[#1c1f23]">Template bars</h3>
                <p className="m-0 mt-1 text-[12px] text-[#5c6166]">
                  Add and combine discount bars on top of the starter template.
                </p>
              </div>
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
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {bars.length === 0 ? (
                <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3 text-[12px] text-[#5c6166]">
                  No bars yet. Start from the template defaults or add a new bar type.
                </div>
              ) : (
                bars.map((bar, index) => (
                  <button
                    key={bar.id}
                    type="button"
                    onClick={() => setSelection({ kind: "bar", id: bar.id })}
                    className={`w-full rounded-[10px] border px-3 py-3 text-left transition ${
                      selection?.kind === "bar" && selection.id === bar.id
                        ? "border-[#008060] bg-[#f5fff9]"
                        : "border-[#e3e8ed] bg-white hover:border-[#c9ccd0]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-[#1c1f23]">
                          {bar.title}
                        </div>
                        <div className="mt-1 text-[12px] text-[#5c6166]">
                          {bar.summary}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#5c6166]">
                          <span className="rounded-full bg-[#f4f6f8] px-2 py-0.5 uppercase tracking-[0.04em]">
                            {bar.type.replace("_", " ")}
                          </span>
                          {bar.isDefault ? (
                            <span className="rounded-full bg-[#e8f7ef] px-2 py-0.5 text-[#006e52]">
                              Default
                            </span>
                          ) : null}
                          {bar.supportState === "draft_only" ? (
                            <span className="rounded-full bg-[#fff7e6] px-2 py-0.5 text-[#ad6800]">
                              Draft only
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button
                          size="small"
                          disabled={index === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveBarUp(bar.id);
                          }}
                        >
                          Up
                        </Button>
                        <Button
                          size="small"
                          disabled={index === bars.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMoveBarDown(bar.id);
                          }}
                        >
                          Down
                        </Button>
                        <Button
                          danger
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCampaignCompositionBar(bar, actions);
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[12px] border border-[#e3e8ed] bg-white p-4">
            <div>
              <h3 className="m-0 text-[15px] font-semibold text-[#1c1f23]">Components</h3>
              <p className="m-0 mt-1 text-[12px] text-[#5c6166]">
                Toggle condition-oriented modules here. Visual styling stays in Step 3.
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {modules.map((module) => (
                <button
                  key={module.id}
                  type="button"
                  onClick={() => setSelection({ kind: "module", id: module.id })}
                  className={`w-full rounded-[10px] border px-3 py-3 text-left transition ${
                    selection?.kind === "module" && selection.id === module.id
                      ? "border-[#008060] bg-[#f5fff9]"
                      : "border-[#e3e8ed] bg-white hover:border-[#c9ccd0]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[#1c1f23]">
                        {module.label}
                      </div>
                      <div className="mt-1 text-[12px] text-[#5c6166]">
                        {module.description}
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
                            draft.completeBundleBars.forEach((bar) => {
                              actions.removeCompleteBundleBar(bar.id);
                            });
                          }
                          if (module.id === "complete_bundle" && checked) {
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
              ))}
            </div>
          </div>
        </div>

        <div>{renderDetail()}</div>
      </div>

      <div className="create-offer-sticky-preview">{preview}</div>
    </div>
  );
}
