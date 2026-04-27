import { Button } from "antd";
import { OFFER_TYPE_OPTIONS, type OfferTypeId } from "./offerTypeOptions";

interface OfferTypeSelectionProps {
  onBack?: () => void;
  onSelect: (offerType: OfferTypeId) => void;
}

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
          ? "border-[#1c1f23] shadow-[inset_0_0_0_1px_rgba(28,31,35,0.06)]"
          : "border-[#dfe3e8]"
      }`}
    >
      <div className="flex items-start gap-[10px]">
        <span
          className={`mt-[3px] h-[14px] w-[14px] rounded-full border ${
            selected ? "border-[#1c1f23]" : "border-[#c9ccd0]"
          } flex items-center justify-center`}
        >
          <span
            className={`h-[6px] w-[6px] rounded-full ${
              selected ? "bg-[#1c1f23]" : "bg-transparent"
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

function PreviewAction() {
  return (
    <div className="mt-auto rounded-[10px] bg-[#1c1f23] px-[14px] py-[10px] text-center text-[13px] font-semibold text-white shadow-[inset_0_-2px_0_rgba(255,255,255,0.08)] transition-colors group-hover:bg-black">
      Choose
    </div>
  );
}

function QuantityBreakPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[16px] border border-[#dfe3e8] bg-[#f6f6f7] p-[14px]">
      <div className="space-y-[8px]">
        <PreviewRow title="Single" subtitle="Standard price" price="EUR65.00" />
        <div className="relative">
          <div className="absolute right-[10px] top-[-10px] rounded-full bg-[#111111] px-[10px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.05em] text-white">
            Most popular
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
      <div className="mt-auto pt-[18px]">
        <div className="mb-[10px] text-[12px] font-semibold leading-[16px] text-[#1c1f23]">
          Quantity breaks for the same product
        </div>
        <PreviewAction />
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
        <div className="rounded-[10px] bg-[#d1d1d1] px-[12px] py-[8px] text-[12px] font-semibold text-[#1c1f23]">
          + Free special gift!
        </div>
      </div>
      <div className="mt-auto pt-[18px]">
        <div className="mb-[10px] text-[12px] font-semibold leading-[16px] text-[#1c1f23]">
          Buy X, get Y deal
        </div>
        <PreviewAction />
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
      <div className="mt-auto pt-[18px]">
        <div className="mb-[10px] text-[12px] font-semibold leading-[16px] text-[#1c1f23]">
          Complete the bundle
        </div>
        <PreviewAction />
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
        <div className="rounded-[10px] border border-dashed border-[#1c1f23] bg-white px-[12px] py-[9px]">
          <div className="text-[13px] font-semibold text-[#1c1f23]">
            Subscribe & Save 20%
          </div>
          <div className="mt-[2px] text-[12px] text-[#6d7175]">Delivered weekly</div>
        </div>
      </div>
      <div className="mt-auto pt-[18px]">
        <div className="mb-[10px] text-[12px] font-semibold leading-[16px] text-[#1c1f23]">
          Subscription
        </div>
        <PreviewAction />
      </div>
    </div>
  );
}

function OfferTypePreview({ offerType }: { offerType: OfferTypeId }) {
  if (offerType === "bxgy") return <BxgyPreview />;
  if (offerType === "complete-bundle") return <CompleteBundlePreview />;
  if (offerType === "subscription") return <SubscriptionPreview />;
  return <QuantityBreakPreview />;
}

export function OfferTypeSelection({
  onBack,
  onSelect,
}: OfferTypeSelectionProps) {
  return (
    <div className="rounded-[12px] border border-[#dfe3e8] bg-white p-[20px] shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-[24px]">
      <div className="mb-[24px]">
        <Button
          type="text"
          className="px-0 text-gray-600 hover:text-gray-900"
          onClick={(e) => {
            onBack?.();
            e.preventDefault();
          }}
        >
          ← Back
        </Button>
        <div className="mt-[8px] inline-flex items-center rounded-full border border-[#dfe3e8] bg-[#f6f6f7] px-[10px] py-[4px] text-[12px] font-medium text-[#5c6166]">
          Offer Setup
        </div>
        <h1 className="mt-[10px] mb-0 text-[28px] font-semibold leading-[36px] tracking-[-0.02em] text-[#1c1f23] sm:text-[32px] sm:leading-[40px]">
          Choose offer type
        </h1>
        <p className="mt-[8px] mb-0 max-w-[720px] text-[14px] leading-[22px] text-[#5c6166] sm:text-[15px] sm:leading-[24px]">
          Start with the promotion structure that matches your campaign, then
          continue in the existing builder flow with the selected offer type.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-[16px] md:grid-cols-2 xl:grid-cols-4">
        {OFFER_TYPE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className="group h-full rounded-[16px] border border-[#dfe3e8] bg-white p-[12px] text-left transition-all hover:border-[#008060] hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
          >
            <OfferTypePreview offerType={option.id} />
            <div className="px-[4px] pt-[14px]">
              <h2 className="m-0 text-[16px] font-semibold leading-[24px] text-[#1c1f23]">
                {option.name}
              </h2>
              <p className="mt-[6px] mb-0 text-[13px] leading-[20px] text-[#5c6166]">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
