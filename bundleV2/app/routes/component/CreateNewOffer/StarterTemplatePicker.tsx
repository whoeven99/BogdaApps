import { OFFER_TYPE_OPTIONS, type OfferTypeId } from "./offerTypeOptions";

function PreviewRow({
  title,
  price,
  subtitle,
  selected = false,
  badge,
}: {
  title: string;
  price: string;
  subtitle?: string;
  selected?: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-[10px] border bg-white px-[12px] py-[10px] transition-colors ${
        selected
          ? "border-[#008060] shadow-[inset_0_0_0_1px_rgba(0,128,96,0.08)]"
          : "border-[#dfe3e8]"
      }`}
    >
      <div className="flex items-start gap-[10px]">
        <span
          className={`mt-[3px] flex h-[14px] w-[14px] items-center justify-center rounded-full border ${
            selected ? "border-[#008060]" : "border-[#c9ccd0]"
          }`}
        >
          <span
            className={`h-[6px] w-[6px] rounded-full ${
              selected ? "bg-[#008060]" : "bg-transparent"
            }`}
          />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-[8px]">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold leading-[18px] text-[#1c1f23]">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-[2px] text-[12px] leading-[16px] text-[#6d7175]">
                  {subtitle}
                </div>
              ) : null}
            </div>
            <div className="shrink-0 text-[14px] font-semibold leading-[18px] text-[#1c1f23]">
              {price}
            </div>
          </div>
          {badge ? (
            <div className="mt-[6px] inline-flex rounded-full bg-[#f6f6f7] px-[8px] py-[2px] text-[11px] font-semibold uppercase tracking-[0.04em] text-[#5c6166]">
              {badge}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TemplateAction({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`mt-auto rounded-[10px] px-[14px] py-[10px] text-center text-[13px] font-semibold transition-colors ${
        active
          ? "bg-[#e9f9f1] text-[#008060]"
          : "bg-[#008060] text-white group-hover:bg-[#006e52]"
      }`}
    >
      {label}
    </div>
  );
}

function QuantityBreakPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[16px] border border-[#dfe3e8] bg-[#f6f6f7] p-[14px]">
      <div className="space-y-[8px]">
        <PreviewRow title="Single" subtitle="Standard price" price="EUR65.00" />
        <div className="relative">
          <div className="absolute right-[10px] top-[-10px] rounded-full bg-[#f0f9f6] px-[10px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#108043]">
            Recommended
          </div>
          <PreviewRow
            title="Duo"
            subtitle="You save 15%"
            price="EUR110.50"
            badge="Save EUR19.50"
            selected
          />
        </div>
      </div>
    </div>
  );
}

function BxgyPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[16px] border border-[#dfe3e8] bg-[#f6f6f7] p-[14px]">
      <div className="space-y-[8px]">
        <PreviewRow
          title="Buy 1, get 1 free"
          price="EUR65.00"
          badge="Save 50%"
          selected
        />
        <PreviewRow title="Buy 2, get 3 free" price="EUR130.00" badge="Save 60%" />
        <PreviewRow title="Buy 3, get 6 free" price="EUR195.00" badge="Save 67%" />
        <div className="rounded-[10px] bg-[#f6f6f7] px-[12px] py-[8px] text-[12px] font-semibold text-[#1c1f23]">
          + Free special gift!
        </div>
      </div>
    </div>
  );
}

function CompleteBundlePreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[16px] border border-[#dfe3e8] bg-[#f6f6f7] p-[14px]">
      <div className="space-y-[8px]">
        <PreviewRow
          title="Camera with 2K microphone"
          subtitle="Standard price"
          price="EUR65.00"
        />
        <div className="rounded-[10px] border border-[#d1d5db] bg-[#f1f2f4] p-[12px] opacity-70">
          <div className="flex items-start gap-[10px]">
            <span className="mt-[3px] h-[14px] w-[14px] rounded-full border border-[#c9ccd0]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-[8px]">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold leading-[18px] text-[#5c6166]">
                    Complete the bundle
                  </div>
                  <div className="mt-[2px] text-[12px] leading-[16px] text-[#8c9196]">
                    Save EUR14.99
                  </div>
                </div>
                <div className="text-[14px] font-semibold leading-[18px] text-[#8c9196]">
                  EUR50.00
                </div>
              </div>
              <div className="mt-[10px] grid grid-cols-2 gap-[8px]">
                <div className="rounded-[8px] bg-white px-[8px] py-[10px] text-[11px] text-[#6d7175]">
                  Wireless Dog Fence
                </div>
                <div className="rounded-[8px] bg-white px-[8px] py-[10px] text-[11px] text-[#6d7175]">
                  Siemens Tablets
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[16px] border border-[#dfe3e8] bg-[#f6f6f7] p-[14px]">
      <div className="space-y-[8px]">
        <PreviewRow
          title="Buy 1, get 1 free"
          price="EUR52.00"
          badge="Save 60%"
          selected
        />
        <PreviewRow title="Buy 2, get 3 free" price="EUR104.00" badge="Save 68%" />
        <PreviewRow title="Buy 3, get 6 free" price="EUR156.00" badge="Save 73%" />
        <div className="rounded-[10px] border border-dashed border-[#008060] bg-white px-[12px] py-[9px]">
          <div className="text-[13px] font-semibold text-[#1c1f23]">
            Subscribe & Save 20%
          </div>
          <div className="mt-[2px] text-[12px] text-[#6d7175]">Delivered weekly</div>
        </div>
      </div>
    </div>
  );
}

function FreeGiftPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[16px] border border-[#dfe3e8] bg-[#f6f6f7] p-[14px]">
      <div className="space-y-[8px]">
        <PreviewRow
          title="Buy 2 items"
          subtitle="Unlock 1 free mini gift"
          price="1 FREE"
          badge="Gift included"
          selected
        />
        <PreviewRow
          title="Buy 3 items"
          subtitle="Unlock 2 free gifts"
          price="2 FREE"
        />
        <div className="rounded-[10px] border border-dashed border-[#d1d5db] bg-white px-[12px] py-[9px] text-[12px] text-[#5c6166]">
          Gift products are chosen separately from the trigger products.
        </div>
      </div>
    </div>
  );
}

function OfferTypePreview({ offerType }: { offerType: OfferTypeId }) {
  if (offerType === "bxgy") return <BxgyPreview />;
  if (offerType === "complete-bundle") return <CompleteBundlePreview />;
  if (offerType === "subscription") return <SubscriptionPreview />;
  if (offerType === "free-gift") return <FreeGiftPreview />;
  return <QuantityBreakPreview />;
}

type Props = {
  selectedOfferType: OfferTypeId;
  onSelect: (offerType: OfferTypeId) => void;
  actionLabel?: string;
  disabled?: boolean;
  compact?: boolean;
};

export default function StarterTemplatePicker({
  selectedOfferType,
  onSelect,
  actionLabel = "Use Template",
  disabled = false,
  compact = false,
}: Props) {
  return (
    <div
      className={`grid grid-cols-1 gap-[16px] ${
        compact ? "md:grid-cols-2 xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
      }`}
    >
      {OFFER_TYPE_OPTIONS.map((option) => {
        const isSelected = option.id === selectedOfferType;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              if (!disabled) onSelect(option.id);
            }}
            disabled={disabled}
            className={`group flex h-full flex-col rounded-[12px] border bg-white p-[12px] text-left transition-all ${
              isSelected
                ? "border-[#008060] shadow-[0_0_0_1px_rgba(0,128,96,0.08)]"
                : "border-[#dfe3e8]"
            } ${
              disabled
                ? "cursor-not-allowed opacity-70"
                : "hover:border-[#bfd7cd] hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
            }`}
          >
            <OfferTypePreview offerType={option.id} />
            <div className="flex flex-1 flex-col px-[4px] pt-[14px]">
              <div className="mb-[8px] flex flex-wrap gap-[6px]">
                <span className="rounded-full bg-[#f0f9f6] px-[8px] py-[3px] text-[11px] font-semibold text-[#108043]">
                  {option.primaryDiscountScope}
                </span>
                <span className="rounded-full bg-[#f6f6f7] px-[8px] py-[3px] text-[11px] font-semibold text-[#5c6166]">
                  {option.primaryRuleType}
                </span>
              </div>
              <h2 className="m-0 text-[16px] font-semibold leading-[24px] text-[#1c1f23]">
                {option.name}
              </h2>
              <p className="mt-[6px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
                {option.description}
              </p>
              <div className="mt-auto pt-[14px]">
                <TemplateAction
                  label={isSelected ? "Selected Template" : actionLabel}
                  active={isSelected}
                />
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
