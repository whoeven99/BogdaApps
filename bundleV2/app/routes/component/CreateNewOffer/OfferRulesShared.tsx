import { Button } from "antd";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";

type OfferRulesSectionProps = {
  description?: string;
  children: ReactNode;
};

export function OfferRulesSection({
  description,
  children,
}: OfferRulesSectionProps) {
  return (
    <div className="space-y-4">
      {description ? (
        <div className="text-[12px] leading-[18px] text-[#6d7175]">
          {description}
        </div>
      ) : null}
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
  title?: string;
  intent?: "info" | "warning" | "critical" | "success";
  children: ReactNode;
};

export function OfferRuleNotice({
  title,
  intent = "info",
  children,
}: OfferRuleNoticeProps) {
  const toneClasses =
    intent === "critical"
      ? "border-[#ffd6d2] bg-[#fff1f0] text-[#b42318]"
      : intent === "warning"
        ? "border-[#ffe7ba] bg-[#fff7e6] text-[#ad6800]"
        : intent === "success"
          ? "border-[#b7ebc6] bg-[#f6ffed] text-[#237804]"
          : "border-[#dfe3e8] bg-[#f6f8f9] text-[#5c6166]";

  return (
    <div className={`rounded-[10px] border px-4 py-3 text-[13px] ${toneClasses}`}>
      {title ? (
        <div className="mb-1 text-[13px] font-medium text-[#1c1f23]">{title}</div>
      ) : null}
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
  description,
  children,
}: OfferRuleAddPanelProps) {
  return (
    <div className="mt-4 rounded-[8px] border border-[#dfe3e8] bg-[#fcfcfd] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[14px] font-medium text-[#1c1f23]">{title}</div>
          {description ? (
            <div className="mt-1 text-[12px] leading-[18px] text-[#6d7175]">
              {description}
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
