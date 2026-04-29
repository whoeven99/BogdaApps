import { Button, Dropdown } from "antd";
import { type ReactNode } from "react";
import type {
  CompleteBundleProduct,
} from "../../../utils/offerParsing";
import type {
  CampaignDraft,
  CampaignDraftActions,
} from "./campaignDraft";
import BxgyLogicEditor from "./BxgyLogicEditor";
import CompleteBundleEditor from "./CompleteBundleEditor";
import DifferentProductsLogicEditor from "./DifferentProductsLogicEditor";
import FreeGiftLogicEditor from "./FreeGiftLogicEditor";
import { ProgressiveGiftsSection } from "./ProgressiveGiftsSection";
import QuantityBreaksLogicEditor from "./QuantityBreaksLogicEditor";
import ScopeEditor from "./ScopeEditor";
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
        title: "Buy Products",
        description:
          "Choose which products count toward the X side of the BXGY condition.",
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
        title: "Reward Products",
        description:
          "Choose which products can be discounted or given away on the Y side.",
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
        title: "Offer Rules",
        description:
          "Define the BXGY unlock logic, reward quantities, discount values, and labels for each rule.",
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
            differentProductsDiscountRules={
              props.draft.differentProductsDiscountRules
            }
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
        title: "Trigger Products",
        description:
          "Select which products count toward unlocking the free gift rules.",
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
        title: "Offer Rules",
        description:
          "Select reward products and define the trigger and gift quantity for each rule.",
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
            differentProductsDiscountRules={
              props.draft.differentProductsDiscountRules
            }
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
        title: "Bundle Structure",
        description:
          "Define the bundle bars, their titles, quantities, and the structure of the bundle flow.",
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
        title: "Bundle Products",
        description:
          "Manage products inside the active bar, then configure pricing and variant preview details.",
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
        title: "Template Products",
        description:
          "Select the products that should display the subscription decision block.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "subscription-offer",
        title: "Subscription Option",
        description:
          "Configure the subscription message and preview how it appears beside the main offer.",
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
        title: "One-time Option",
        description:
          "Define the one-time purchase copy, placement, and default selected behavior.",
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
            differentProductsDiscountRules={
              props.draft.differentProductsDiscountRules
            }
            value={props.draft.progressiveGifts}
            onChange={props.actions.setProgressiveGifts}
            showToggle={false}
          />
        ),
      },
    ],
  },
  "quantity-breaks-different": {
    components: (props) => [
      {
        id: "scope",
        title: "Template Products",
        description:
          "Select the shared product pool that participates in these cross-product rules.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "different-products-rules",
        title: "Offer Rules",
        description:
          "Mix quantity-break and BXGY rules across the shared pool of selected products.",
        required: true,
        active: true,
        render: () => (
          <DifferentProductsLogicEditor
            selectedProductsData={props.draft.selectedProductsData}
            differentProductsDiscountRules={
              props.draft.differentProductsDiscountRules
            }
            setDifferentProductsDiscountRules={
              props.actions.setDifferentProductsDiscountRules
            }
          />
        ),
      },
      {
        id: "progressive-gifts",
        title: "Progressive Gifts",
        description:
          "Add a progressive free shipping reward block that unlocks alongside cross-product tiers.",
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
            differentProductsDiscountRules={
              props.draft.differentProductsDiscountRules
            }
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
        title: "Template Products",
        description:
          "Select the products included in this quantity break campaign.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "quantity-breaks-rules",
        title: "Offer Rules",
        description:
          "Define the discount type, trigger condition, and reward details for each rule entry.",
        required: true,
        active: true,
        render: () => (
          <QuantityBreaksLogicEditor
            discountRules={props.draft.discountRules}
            setDiscountRules={props.actions.setDiscountRules}
            selectedProductsData={props.draft.selectedProductsData}
            offerType={props.draft.offerType}
            section="tiers"
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
            differentProductsDiscountRules={
              props.draft.differentProductsDiscountRules
            }
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
  const addComponentMenuItems = inactiveOptionalComponents.map((component) => ({
    key: component.id,
    label: component.addLabel || `Add ${component.title}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      {inactiveOptionalComponents.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Dropdown
            trigger={["click"]}
            menu={{
              items: addComponentMenuItems,
              onClick: ({ key }) => {
                const component = inactiveOptionalComponents.find(
                  (entry) => entry.id === key,
                );
                component?.onAdd?.();
              },
            }}
          >
            <Button size="small">Add component</Button>
          </Dropdown>
        </div>
      ) : null}

      {activeComponents.map((component) => (
        <div
          key={component.id}
          className="rounded-[12px] border border-[#e3e8ed] bg-white p-4"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">
                {component.title}
              </h3>
              <p className="m-0 mt-2 text-[13px] text-[#5c6166]">
                {component.description}
              </p>
            </div>
            {!component.required && component.onRemove ? (
              <div className="flex flex-wrap gap-2">
                <Button size="small" onClick={component.onRemove}>
                  Remove
                </Button>
              </div>
            ) : null}
          </div>
          <div className="mt-4">{component.render()}</div>
        </div>
      ))}
    </div>
  );
}
