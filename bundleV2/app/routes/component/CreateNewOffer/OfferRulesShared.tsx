import { Button } from "antd";
import type { ReactNode } from "react";

type OfferRulesSectionProps = {
  description: string;
  children: ReactNode;
};

export function OfferRulesSection({
  description,
  children,
}: OfferRulesSectionProps) {
  return (
    <div>
      <h3 className="mb-3 text-[14px] font-medium text-[#1c1f23]">
        Logic Block: Offer Rules
      </h3>
      <p className="mb-4 text-[13px] font-normal text-[#5c6166]">
        {description}
      </p>
      {children}
    </div>
  );
}

type OfferRuleCardProps = {
  index: number;
  disableRemove?: boolean;
  onRemove?: () => void;
  children: ReactNode;
};

export function OfferRuleCard({
  index,
  disableRemove = false,
  onRemove,
  children,
}: OfferRuleCardProps) {
  return (
    <div className="create-offer-discount-card">
      <div className="create-offer-discount-body">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-[14px] font-semibold text-[#1c1f23]">
            Rule {index + 1}
          </div>
          {onRemove ? (
            <Button
              danger
              size="small"
              onClick={onRemove}
              disabled={disableRemove}
            >
              Remove
            </Button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

type OfferRuleSummaryBoxProps = {
  label: string;
  value: string;
  description: string;
};

export function OfferRuleSummaryBox({
  label,
  value,
  description,
}: OfferRuleSummaryBoxProps) {
  return (
    <div className="rounded-[10px] border border-dashed border-[#dfe3e8] bg-[#fafbfb] px-3 py-3">
      <div className="text-[12px] font-medium uppercase tracking-[0.05em] text-[#5c6166]">
        {label}
      </div>
      <div className="mt-1 text-[14px] font-medium text-[#1c1f23]">
        {value}
      </div>
      <div className="mt-1 text-[12px] text-[#5c6166]">
        {description}
      </div>
    </div>
  );
}
