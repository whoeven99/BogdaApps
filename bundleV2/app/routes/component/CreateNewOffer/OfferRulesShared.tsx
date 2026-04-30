import { Button } from "antd";
import { Trash2 } from "lucide-react";
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
    <div className="space-y-4">
      <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[12px] text-[#5c6166]">
        {description}
      </div>
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
              type="text"
              danger
              size="small"
              className="flex items-center justify-center"
              icon={<Trash2 size={14} aria-hidden />}
              aria-label={`Remove rule ${index + 1}`}
              title="Remove"
              onClick={onRemove}
              disabled={disableRemove}
            />
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
    <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3">
      <div className="text-[12px] font-medium text-[#5c6166]">
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

type OfferRuleFormGridProps = {
  columns?: 2 | 3 | 4;
  children: ReactNode;
};

export function OfferRuleFormGrid({
  columns = 3,
  children,
}: OfferRuleFormGridProps) {
  const columnsClassName =
    columns === 4
      ? "xl:grid-cols-4"
      : columns === 2
        ? "xl:grid-cols-2"
        : "xl:grid-cols-3";

  return (
    <div className={`mt-3 grid grid-cols-1 gap-3 ${columnsClassName}`}>
      {children}
    </div>
  );
}

type OfferRuleFooterRowProps = {
  children: ReactNode;
};

export function OfferRuleFooterRow({ children }: OfferRuleFooterRowProps) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
      {children}
    </div>
  );
}

type OfferRuleNoticeProps = {
  children: ReactNode;
};

export function OfferRuleNotice({ children }: OfferRuleNoticeProps) {
  return (
    <div className="rounded-[10px] bg-[#f6f8f9] px-4 py-3 text-[13px] text-[#5c6166]">
      {children}
    </div>
  );
}

type OfferRuleAddPanelProps = {
  title?: string;
  description?: string;
  children: ReactNode;
};

export function OfferRuleAddPanel({
  title = "Add another rule",
  description = "Choose the next rule type to extend this offer setup.",
  children,
}: OfferRuleAddPanelProps) {
  return (
    <div className="mt-4 rounded-[12px] bg-[#f6f8f9] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[14px] font-medium text-[#1c1f23]">{title}</div>
          <div className="mt-1 text-[13px] text-[#5c6166]">{description}</div>
        </div>
        {children}
      </div>
    </div>
  );
}
