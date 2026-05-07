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
import UnifiedRulesAuditPanel from "./UnifiedRulesAuditPanel";
import type { UnifiedRuleAuditIssue } from "./unifiedRulesValidation";
import { type OfferTypeId } from "./offerTypeOptions";

type Props = {
  draft: CampaignDraft;
  actions: CampaignDraftActions;
  unifiedRulesCount?: number;
  unifiedRuleAuditIssues?: UnifiedRuleAuditIssue[];
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

type LogicEditorGroup = "scope" | "rules" | "optional";

type LogicEditorComponent = {
  id: string;
  group: LogicEditorGroup;
  title: string;
  description: string;
  required: boolean;
  active: boolean;
  addLabel?: string;
  onAdd?: () => void;
  onRemove?: () => void;
  render: () => ReactNode;
};

const GROUP_ORDER: LogicEditorGroup[] = ["scope", "rules", "optional"];

const GROUP_META: Record<
  LogicEditorGroup,
  { title: string; description: string }
> = {
  scope: {
    title: "Scope",
    description:
      "Select the products or entities that participate in this campaign.",
  },
  rules: {
    title: "Offer Rules",
    description:
      "Configure the business logic, thresholds, and reward behavior for this offer.",
  },
  optional: {
    title: "Optional Modules",
    description:
      "Add supporting modules that extend the core offer without changing its main logic.",
  },
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
        group: "scope",
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
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
            section="buy-products"
          />
        ),
      },
      {
        id: "bxgy-get-scope",
        group: "scope",
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
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
            section="get-products"
          />
        ),
      },
      {
        id: "bxgy-rules",
        group: "rules",
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
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
            section="rules"
          />
        ),
      },
      {
        id: "progressive-gifts",
        group: "optional",
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
        group: "scope",
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
        group: "rules",
        title: "Offer Rules",
        description:
          "Select reward products and define the trigger and gift quantity for each rule.",
        required: true,
        active: true,
        render: () => (
          <FreeGiftLogicEditor
            triggerProductsCount={props.draft.freeGiftTriggerProducts.length}
            giftProductsCount={props.draft.giftProductsData.length}
            giftProductsData={props.draft.giftProductsData}
            onSelectTriggerProducts={() => props.actions.handleSelectProducts("normal")}
            onSelectGiftProducts={() => props.actions.handleSelectProducts("gift")}
            onSelectRuleGiftProducts={props.actions.selectFreeGiftRewardProducts}
            freeGiftRules={props.draft.freeGiftRules}
            setFreeGiftRules={props.actions.setFreeGiftRules}
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
          />
        ),
      },
      {
        id: "progressive-gifts",
        group: "optional",
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
        group: "rules",
        title: "Bundle Rules",
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
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
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
        group: "scope",
        title: "Products & Pricing",
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
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
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
        group: "scope",
        title: "Campaign Products",
        description:
          "Select the products that should display the subscription decision block.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "subscription-offer",
        group: "rules",
        title: "Subscription Message",
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
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
            section="subscription-offer"
          />
        ),
      },
      {
        id: "subscription-one-time",
        group: "rules",
        title: "One-time Message",
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
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
            section="one-time-message"
          />
        ),
      },
      {
        id: "progressive-gifts",
        group: "optional",
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
        group: "scope",
        title: "Campaign Products",
        description:
          "Select the shared product pool that participates in these cross-product rules.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "different-products-rules",
        group: "rules",
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
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
          />
        ),
      },
      {
        id: "progressive-gifts",
        group: "optional",
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
        group: "scope",
        title: "Campaign Products",
        description:
          "Select the products that should participate in these quantity-based offer rules.",
        required: true,
        active: true,
        render: () => renderDefaultScopeEditor(props),
      },
      {
        id: "quantity-breaks-rules",
        group: "rules",
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
            updateRuleValues={props.actions.updateUnifiedRuleValues}
            updateRulePresentation={props.actions.updateUnifiedRulePresentation}
          />
        ),
      },
      {
        id: "progressive-gifts",
        group: "optional",
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
  unifiedRulesCount,
  unifiedRuleAuditIssues,
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

  const renderComponentCard = (component: LogicEditorComponent) => (
    <div
      key={component.id}
      className="rounded-[12px] border border-[#e3e8ed] bg-white p-4"
    >
      {component.title ||
      component.description ||
      (!component.required && component.onRemove) ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            {component.title ? (
              <h3 className="m-0 text-[16px] font-semibold text-[#1c1f23]">
                {component.title}
              </h3>
            ) : null}
            {component.description ? (
              <p className="m-0 mt-2 text-[13px] text-[#5c6166]">
                {component.description}
              </p>
            ) : null}
          </div>
          {!component.required && component.onRemove ? (
            <div className="flex flex-wrap gap-2">
              <Button size="small" onClick={component.onRemove}>
                Remove
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div
        className={
          component.title ||
          component.description ||
          (!component.required && component.onRemove)
            ? "mt-4"
            : ""
        }
      >
        {component.render()}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {GROUP_ORDER.map((group) => {
        const sectionComponents = activeComponents.filter(
          (component) => component.group === group,
        );
        const shouldRenderOptionalMenu =
          group === "optional" && inactiveOptionalComponents.length > 0;
        if (sectionComponents.length === 0 && !shouldRenderOptionalMenu) {
          return null;
        }

        const meta = GROUP_META[group];

        return (
          <div key={group} className="flex flex-col gap-3">
            <div className="px-1">
              <h2 className="m-0 text-[18px] font-semibold text-[#1c1f23]">
                {meta.title}
              </h2>
              <p className="m-0 mt-1 text-[13px] text-[#5c6166]">
                {meta.description}
              </p>
            </div>

            {sectionComponents.map(renderComponentCard)}

            {group === "rules" &&
            typeof unifiedRulesCount === "number" &&
            unifiedRuleAuditIssues ? (
              <UnifiedRulesAuditPanel
                rulesCount={unifiedRulesCount}
                issues={unifiedRuleAuditIssues}
              />
            ) : null}

            {shouldRenderOptionalMenu ? (
              <div className="rounded-[12px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-[14px] font-medium text-[#1c1f23]">
                      Add optional module
                    </div>
                    <div className="mt-1 text-[13px] text-[#5c6166]">
                      Extend the offer with supporting modules when the core setup is ready.
                    </div>
                  </div>
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
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
