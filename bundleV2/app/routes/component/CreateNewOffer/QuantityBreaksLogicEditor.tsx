import { Checkbox, Input } from "antd";
import type { DiscountRule } from "../../../utils/offerParsing";
import type {
  RulePresentationPatch,
} from "./unifiedRulePresentation";
import type { UnifiedRuleValuePatch } from "./unifiedRuleValues";
import { getUnifiedDiscountRuleId } from "./unifiedRuleValues";
import UnifiedRulesEditor from "./UnifiedRulesEditor";

type Props = {
  discountRules: DiscountRule[];
  setDiscountRules: React.Dispatch<React.SetStateAction<DiscountRule[]>>;
  selectedProductsData?: Array<{
    id: string;
    title: string;
    image: string;
    price: string;
    variantsCount: number;
    hasSubscription: boolean;
  }>;
  offerType?: string;
  section?: "tiers" | "presentation" | "all";
  updateRuleValues?: (id: string, patch: UnifiedRuleValuePatch) => void;
  updateRulePresentation?: (id: string, patch: RulePresentationPatch) => void;
};

export default function QuantityBreaksLogicEditor({
  discountRules,
  setDiscountRules,
  selectedProductsData = [],
  offerType,
  section = "all",
  updateRuleValues,
  updateRulePresentation,
}: Props) {
  const showTiers = section === "all" || section === "tiers";
  const showPresentation = section === "all" || section === "presentation";

  return (
    <div>
      {showTiers ? (
        <UnifiedRulesEditor
          rules={discountRules}
          setRules={setDiscountRules}
          updateRuleValues={updateRuleValues}
          selectedProductsData={selectedProductsData}
          offerType={offerType}
        />
      ) : null}
      {showPresentation ? (
        <>
          <h3 className="text-[14px] font-medium text-[#1c1f23] mb-3">
            Logic Block: Card Content
          </h3>
          <p className="text-[13px] text-[#5c6166] mb-4 font-normal">
            Titles, subtitles, badges, and default selection control how each tier
            is presented inside the offer card.
          </p>
        </>
      ) : null}
      {showPresentation
        ? discountRules.map((rule, index) => (
            <div className="create-offer-discount-card" key={`${rule.id || rule.count}-${index}`}>
              <div className="create-offer-discount-body">
                <div
                  className="create-offer-discount-form-row"
                  style={{
                    marginTop: "12px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Title
                    <Input
                      size="large"
                      className="mt-1"
                      value={rule.title || ""}
                      placeholder="e.g. Duo, Trio"
                      onChange={(e) => {
                        const value = e.target.value;
                        const ruleId = getUnifiedDiscountRuleId(rule, index);
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { title: value });
                          return;
                        }
                        setDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === index
                              ? { ...currentRule, title: value }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                  </label>
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Subtitle
                    <Input
                      size="large"
                      className="mt-1"
                      value={rule.subtitle || ""}
                      placeholder="e.g. You save 20%"
                      onChange={(e) => {
                        const value = e.target.value;
                        const ruleId = getUnifiedDiscountRuleId(rule, index);
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { subtitle: value });
                          return;
                        }
                        setDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === index
                              ? { ...currentRule, subtitle: value }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                  </label>
                  <label className="block text-[14px] font-medium text-[#1c1f23] mb-1">
                    Badge
                    <Input
                      size="large"
                      className="mt-1"
                      value={rule.badge || ""}
                      placeholder="e.g. Most Popular"
                      onChange={(e) => {
                        const value = e.target.value;
                        const ruleId = getUnifiedDiscountRuleId(rule, index);
                        if (updateRulePresentation) {
                          updateRulePresentation(ruleId, { badge: value });
                          return;
                        }
                        setDiscountRules((prev) =>
                          prev.map((currentRule, currentIndex) =>
                            currentIndex === index
                              ? { ...currentRule, badge: value }
                              : currentRule,
                          ),
                        );
                      }}
                    />
                  </label>
                </div>

                <div
                  className="create-offer-discount-form-row"
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Checkbox
                    checked={!!rule.isDefault}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const ruleId = getUnifiedDiscountRuleId(rule, index);
                      if (updateRulePresentation) {
                        updateRulePresentation(ruleId, { isDefault: checked });
                        return;
                      }
                      setDiscountRules((prev) =>
                        prev.map((currentRule, currentIndex) => ({
                          ...currentRule,
                          isDefault: checked ? currentIndex === index : false,
                        })),
                      );
                    }}
                  >
                    Set as Default Selected
                  </Checkbox>
                </div>
              </div>
            </div>
          ))
        : null}
    </div>
  );
}
