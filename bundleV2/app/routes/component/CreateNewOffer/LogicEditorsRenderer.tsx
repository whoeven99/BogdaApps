import { Button } from "antd";
import type { ReactNode } from "react";
import type {
  CompleteBundleProduct,
} from "../../../utils/offerParsing";
import type {
  CampaignDraft,
  CampaignDraftActions,
} from "./campaignDraft";
import BxgyLogicEditor from "./BxgyLogicEditor";
import CompleteBundleEditor from "./CompleteBundleEditor";
import FreeGiftLogicEditor from "./FreeGiftLogicEditor";
import { ProgressiveGiftsSection } from "./ProgressiveGiftsSection";
import QuantityBreaksLogicEditor from "./QuantityBreaksLogicEditor";
import ScopeEditor from "./ScopeEditor";
import StarterTemplatePicker from "./StarterTemplatePicker";
import SubscriptionSettingsEditor from "./SubscriptionSettingsEditor";
import { type OfferTypeId } from "./offerTypeOptions";

type Props = {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  renderCompleteBundleProductPricingCard: (
    bar: CampaignDraft["completeBundleBars"][number],
    product: CompleteBundleProduct,
    productIdx: number,
    isFirstBar: boolean,
  ) => ReactNode;
};

type LogicEditorRegistryEntry = {
  components: (props: Props) => LogicEditorComponent[];
};

type LogicEditorComponent = {
  id: string;
  title: string;
  description: string;
  required: boolean;
  active: boolean;
  addLabel?: string;
  onAdd?: () => void;
  onRemove?: () => void;
  render: () => ReactNode;
};

const renderDefaultScopeEditor = (props: Props) => (
  <ScopeEditor
    selectedProductsData={props.draft.selectedProductsData}
    onSelectProducts={props.actions.handleSelectProducts}
    onRemoveProduct={(productId) =>
      props.actions.setSelectedProductsData((prev) =>
        prev.filter((product) => product.id !== productId),
      )
    }
  />
);

const LOGIC_EDITOR_REGISTRY: Record<OfferTypeId, LogicEditorRegistryEntry> = {
  bxgy: {
    components: (props) => [
      {
        id: "bxgy-buy-scope",
        title: "Buy Scope",
        description:
          "Choose which products count toward the buy condition in this BXGY campaign.",
        required: true,
        active: true,
        render: () => (
          <BxgyLogicEditor
            buyProductsCount={props.draft.buyProducts.length}
            getProductsCount={props.draft.getProducts.length}
            onSelectBuyProducts={() => props.actions.handleSelectProducts("buy")}
            onSelectGetProducts={() => props.actions.handleSelectProducts("get")}
            bxgyDiscountRules={props.draft.bxgyDiscountRules}
            setBxgyDiscountRules={props.actions.setBxgyDiscountRules}
            section="buy-products"
          />
        ),
      },
      {
        id: "bxgy-get-scope",
        title: "Reward Scope",
        description:
          "Choose which products can be discounted or given away as the Y reward.",
        required: true,
        active: true,
        render: () => (
          <BxgyLogicEditor
            buyProductsCount={props.draft.buyProducts.length}
            getProductsCount={props.draft.getProducts.length}
            onSelectBuyProducts={() => props.actions.handleSelectProducts("buy")}
            onSelectGetProducts={() => props.actions.handleSelectProducts("get")}
            bxgyDiscountRules={props.draft.bxgyDiscountRules}
            setBxgyDiscountRules={props.actions.setBxgyDiscountRules}
            section="get-products"
          />
        ),
      },
      {
        id: "bxgy-rules",
        title: "BXGY Rules",
        description:
          "Define the quantities, discount values, labels, and default choice for each BXGY tier.",
        required: true,
        active: true,
        render: () => (
          <BxgyLogicEditor
            buyProductsCount={props.draft.buyProducts.length}
            getProductsCount={props.draft.getProducts.length}
            onSelectBuyProducts={() => props.actions.handleSelectProducts("buy")}
            onSelectGetProducts={() => props.actions.handleSelectProducts("get")}
            bxgyDiscountRules={props.draft.bxgyDiscountRules}
            setBxgyDiscountRules={props.actions.setBxgyDiscountRules}
            section="rules"
          />
        ),
      },
      {
        id: "progressive-gifts",
        title: "Progressive Gifts",
        description:
          "Add a progressive free shipping reward block that unlocks on higher bars or quantities.",
        required: false,
        active: props.draft.progressiveGifts.enabled,
        addLabel: "Add Progressive Gifts",
        onAdd: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: true,
          }),
        onRemove: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: false,
          }),
        render: () => (
          <ProgressiveGiftsSection
            offerType={props.draft.offerType}
            normalizedDiscountRules={props.draft.normalizedDiscountRules}
            bxgyDiscountRules={props.draft.bxgyDiscountRules}
            value={props.draft.progressiveGifts}
            onChange={props.actions.setProgressiveGifts}
            showToggle={false}
          />
        ),
      },
    ],
  },
  "free-gift": {
    components: (props) => [
      {
        id: "scope",
        title: "Scope",
        description:
          "Select the trigger products that participate in this campaign.",
        required: true,
        active: true,
        render: () => (
          <ScopeEditor
            selectedProductsData={props.draft.selectedProductsData}
            onSelectProducts={props.actions.handleSelectProducts}
            onRemoveProduct={(productId) => {
              props.actions.setSelectedProductsData((prev) =>
                prev.filter((product) => product.id !== productId),
              );
              props.actions.setFreeGiftTriggerProducts((prev) =>
                prev.filter((id) => id !== productId),
              );
            }}
          />
        ),
      },
      {
        id: "free-gift-logic",
        title: "Free Gift Logic",
        description:
          "Select gift products and define the quantity tiers that unlock them.",
        required: true,
        active: true,
        render: () => (
          <FreeGiftLogicEditor
            triggerProductsCount={props.draft.freeGiftTriggerProducts.length}
            giftProductsCount={props.draft.giftProductsData.length}
            onSelectTriggerProducts={() => props.actions.handleSelectProducts("normal")}
            onSelectGiftProducts={() => props.actions.handleSelectProducts("gift")}
            freeGiftRules={props.draft.freeGiftRules}
            setFreeGiftRules={props.actions.setFreeGiftRules}
          />
        ),
      },
      {
        id: "progressive-gifts",
        title: "Progressive Gifts",
        description:
          "Add a progressive free shipping reward block alongside the free gift flow.",
        required: false,
        active: props.draft.progressiveGifts.enabled,
        addLabel: "Add Progressive Gifts",
        onAdd: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: true,
          }),
        onRemove: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: false,
          }),
        render: () => (
          <ProgressiveGiftsSection
            offerType={props.draft.offerType}
            normalizedDiscountRules={props.draft.normalizedDiscountRules}
            bxgyDiscountRules={props.draft.bxgyDiscountRules}
            value={props.draft.progressiveGifts}
            onChange={props.actions.setProgressiveGifts}
            showToggle={false}
          />
        ),
      },
    ],
  },
  "complete-bundle": {
    components: (props) => [
      {
        id: "complete-bundle-bars",
        title: "Bundle Bars",
        description:
          "Define the bundle bars, their titles, quantities, and the overall bundle structure.",
        required: true,
        active: true,
        render: () => (
          <CompleteBundleEditor
            completeBundleBars={props.draft.completeBundleBars}
            activeBundleBarId={props.draft.activeBundleBarId}
            setActiveBundleBarId={props.actions.setActiveBundleBarId}
            addCompleteBundleBar={props.actions.addCompleteBundleBar}
            removeCompleteBundleBar={props.actions.removeCompleteBundleBar}
            updateCompleteBundleBar={props.actions.updateCompleteBundleBar}
            handleSelectProductsForBundleBar={props.actions.handleSelectProductsForBundleBar}
            appendProductsToBundleBar={props.actions.appendProductsToBundleBar}
            renderCompleteBundleProductPricingCard={
              props.renderCompleteBundleProductPricingCard
            }
            section="bars"
          />
        ),
      },
      {
        id: "complete-bundle-products",
        title: "Products & Pricing",
        description:
          "Manage the products inside the active bar, then configure pricing and variant preview details.",
        required: true,
        active: true,
        render: () => (
          <CompleteBundleEditor
            completeBundleBars={props.draft.completeBundleBars}
            activeBundleBarId={props.draft.activeBundleBarId}
            setActiveBundleBarId={props.actions.setActiveBundleBarId}
            addCompleteBundleBar={props.actions.addCompleteBundleBar}
            removeCompleteBundleBar={props.actions.removeCompleteBundleBar}
            updateCompleteBundleBar={props.actions.updateCompleteBundleBar}
            handleSelectProductsForBundleBar={props.actions.handleSelectProductsForBundleBar}
            appendProductsToBundleBar={props.actions.appendProductsToBundleBar}
            renderCompleteBundleProductPricingCard={
              props.renderCompleteBundleProductPricingCard
            }
            section="products"
          />
        ),
      },
    ],
  },
  subscription: {
    components: (props) => [
      {
        id: "scope",
        title: "Scope",
        description:
          "Select the products that should show the subscription decision block.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "subscription-offer",
        title: "Subscription Offer",
        description:
          "Configure the subscription messaging block and preview how it appears beside the main offer.",
        required: false,
        active: props.draft.subscriptionEnabled,
        addLabel: "Add Subscription Settings",
        onAdd: () => props.actions.setSubscriptionEnabled(true),
        onRemove: () => props.actions.setSubscriptionEnabled(false),
        render: () => (
          <SubscriptionSettingsEditor
            subscriptionEnabled={props.draft.subscriptionEnabled}
            setSubscriptionEnabled={props.actions.setSubscriptionEnabled}
            subscriptionTitle={props.draft.subscriptionTitle}
            setSubscriptionTitle={props.actions.setSubscriptionTitle}
            subscriptionSubtitle={props.draft.subscriptionSubtitle}
            setSubscriptionSubtitle={props.actions.setSubscriptionSubtitle}
            oneTimeTitle={props.draft.oneTimeTitle}
            setOneTimeTitle={props.actions.setOneTimeTitle}
            oneTimeSubtitle={props.draft.oneTimeSubtitle}
            setOneTimeSubtitle={props.actions.setOneTimeSubtitle}
            subscriptionPosition={props.draft.subscriptionPosition}
            setSubscriptionPosition={props.actions.setSubscriptionPosition}
            subscriptionDefaultSelected={props.draft.subscriptionDefaultSelected}
            setSubscriptionDefaultSelected={props.actions.setSubscriptionDefaultSelected}
            shouldShowSubscriptionPreview={props.draft.shouldShowSubscriptionPreview}
            allSelectedProductsHaveSubscription={
              props.draft.allSelectedProductsHaveSubscription
            }
            shouldShowSubscriptionExplanation={
              props.draft.shouldShowSubscriptionExplanation
            }
            subscriptionExplanationTitle={props.draft.subscriptionExplanationTitle}
            subscriptionExplanationBody={props.draft.subscriptionExplanationBody}
            section="subscription-offer"
          />
        ),
      },
      {
        id: "subscription-one-time",
        title: "One-time Message",
        description:
          "Define the one-time purchase copy, placement, and default selected behavior for the purchase mode switcher.",
        required: true,
        active: props.draft.subscriptionEnabled,
        render: () => (
          <SubscriptionSettingsEditor
            subscriptionEnabled={props.draft.subscriptionEnabled}
            setSubscriptionEnabled={props.actions.setSubscriptionEnabled}
            subscriptionTitle={props.draft.subscriptionTitle}
            setSubscriptionTitle={props.actions.setSubscriptionTitle}
            subscriptionSubtitle={props.draft.subscriptionSubtitle}
            setSubscriptionSubtitle={props.actions.setSubscriptionSubtitle}
            oneTimeTitle={props.draft.oneTimeTitle}
            setOneTimeTitle={props.actions.setOneTimeTitle}
            oneTimeSubtitle={props.draft.oneTimeSubtitle}
            setOneTimeSubtitle={props.actions.setOneTimeSubtitle}
            subscriptionPosition={props.draft.subscriptionPosition}
            setSubscriptionPosition={props.actions.setSubscriptionPosition}
            subscriptionDefaultSelected={props.draft.subscriptionDefaultSelected}
            setSubscriptionDefaultSelected={props.actions.setSubscriptionDefaultSelected}
            shouldShowSubscriptionPreview={props.draft.shouldShowSubscriptionPreview}
            allSelectedProductsHaveSubscription={
              props.draft.allSelectedProductsHaveSubscription
            }
            shouldShowSubscriptionExplanation={
              props.draft.shouldShowSubscriptionExplanation
            }
            subscriptionExplanationTitle={props.draft.subscriptionExplanationTitle}
            subscriptionExplanationBody={props.draft.subscriptionExplanationBody}
            section="one-time-message"
          />
        ),
      },
      {
        id: "progressive-gifts",
        title: "Progressive Gifts",
        description:
          "Add a progressive free shipping reward block next to the subscription offer.",
        required: false,
        active: props.draft.progressiveGifts.enabled,
        addLabel: "Add Progressive Gifts",
        onAdd: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: true,
          }),
        onRemove: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: false,
          }),
        render: () => (
          <ProgressiveGiftsSection
            offerType={props.draft.offerType}
            normalizedDiscountRules={props.draft.normalizedDiscountRules}
            bxgyDiscountRules={props.draft.bxgyDiscountRules}
            value={props.draft.progressiveGifts}
            onChange={props.actions.setProgressiveGifts}
            showToggle={false}
          />
        ),
      },
    ],
  },
  "quantity-breaks-same": {
    components: (props) => [
      {
        id: "scope",
        title: "Scope",
        description:
          "Select the products included in this quantity break campaign.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "quantity-breaks-rules",
        title: "Quantity Rules",
        description:
          "Define the tier thresholds and discount values customers unlock as quantity increases.",
        required: true,
        active: true,
        render: () => (
          <QuantityBreaksLogicEditor
            discountRules={props.draft.discountRules}
            setDiscountRules={props.actions.setDiscountRules}
            section="tiers"
          />
        ),
      },
      {
        id: "quantity-breaks-content",
        title: "Card Content",
        description:
          "Control the title, subtitle, badge, and default selected state for each quantity tier card.",
        required: true,
        active: true,
        render: () => (
          <QuantityBreaksLogicEditor
            discountRules={props.draft.discountRules}
            setDiscountRules={props.actions.setDiscountRules}
            section="presentation"
          />
        ),
      },
      {
        id: "progressive-gifts",
        title: "Progressive Gifts",
        description:
          "Add a progressive free shipping reward block that customers can unlock as they add more items.",
        required: false,
        active: props.draft.progressiveGifts.enabled,
        addLabel: "Add Progressive Gifts",
        onAdd: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: true,
          }),
        onRemove: () =>
          props.actions.setProgressiveGifts({
            ...props.draft.progressiveGifts,
            enabled: false,
          }),
        render: () => (
          <ProgressiveGiftsSection
            offerType={props.draft.offerType}
            normalizedDiscountRules={props.draft.normalizedDiscountRules}
            bxgyDiscountRules={props.draft.bxgyDiscountRules}
            value={props.draft.progressiveGifts}
            onChange={props.actions.setProgressiveGifts}
            showToggle={false}
          />
        ),
      },
    ],
  },
};

export default function LogicEditorsRenderer({
  draft,
  actions,
  renderCompleteBundleProductPricingCard,
}: Props) {
  const props = { draft, actions, renderCompleteBundleProductPricingCard };
  const config = LOGIC_EDITOR_REGISTRY[draft.offerType];
  const allComponents = config.components(props);
  const activeComponents = allComponents.filter((component) => component.active);
  const inactiveOptionalComponents = allComponents.filter(
    (component) => !component.required && !component.active,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[12px] border border-[#e3e8ed] bg-[#fafbfb] p-4">
        <div className="flex flex-col gap-3">
          <div>
            <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#5c6166]">
              Builder Components
            </div>
            <h3 className="m-0 mt-1 text-[16px] font-semibold text-[#1c1f23]">
              Configure this campaign as a component stack
            </h3>
            <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[#5c6166]">
              Keep the required components in place, and add optional components when this offer needs more merchandising or rewards.
            </p>
          </div>
          <div>
            <div className="mb-3 text-[12px] font-medium uppercase tracking-[0.08em] text-[#5c6166]">
              Starter Template
            </div>
            <StarterTemplatePicker
              selectedOfferType={draft.offerType}
              onSelect={actions.setOfferType}
              actionLabel="Switch Template"
              compact
            />
            <p className="m-0 mt-2 text-[12px] leading-[1.5] text-[#5c6166]">
              Swap the main offer logic without leaving this flow. Existing display and targeting settings stay in place.
            </p>
          </div>
          {inactiveOptionalComponents.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {inactiveOptionalComponents.map((component) => (
                <Button
                  key={component.id}
                  size="small"
                  onClick={() => component.onAdd?.()}
                >
                  {component.addLabel || `Add ${component.title}`}
                </Button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {activeComponents.map((component) => (
            <div
              key={component.id}
              className="inline-flex items-center gap-2 rounded-full border border-[#dfe3e8] bg-white px-3 py-1 text-[12px] text-[#1c1f23]"
            >
              <span>{component.title}</span>
              <span className="text-[#8c9196]">
                {component.required ? "Required" : "Optional"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {activeComponents.map((component) => (
        <div
          key={component.id}
          className="rounded-[12px] border border-[#e3e8ed] bg-white p-4"
        >
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#5c6166]">
                {component.required ? "Required Component" : "Optional Component"}
              </div>
              <h3 className="m-0 mt-1 text-[16px] font-semibold text-[#1c1f23]">
                {component.title}
              </h3>
              <p className="m-0 mt-1 text-[13px] leading-[1.5] text-[#5c6166]">
                {component.description}
              </p>
            </div>
            {!component.required && component.onRemove ? (
              <Button size="small" onClick={component.onRemove}>
                Remove
              </Button>
            ) : null}
          </div>
          {component.render()}
        </div>
      ))}
    </div>
  );
}
