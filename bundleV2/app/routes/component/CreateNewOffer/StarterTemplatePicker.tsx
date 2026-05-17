import {
  getVisibleOfferTypeOptions,
  type OfferTypeId,
} from "./offerTypeOptions";

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
      className={`rounded-[8px] border bg-white px-[12px] py-[10px] transition-colors ${
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
      className={`mt-auto rounded-[8px] px-[14px] py-[10px] text-center text-[13px] font-semibold transition-colors ${
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
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
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

function DifferentProductsPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
      <div className="space-y-[8px]">
        <PreviewRow title="Single" subtitle="Standard price" price="EUR65.00" />
        <div className="relative">
          <div className="absolute right-[10px] top-[-10px] rounded-full bg-[#f0f9f6] px-[10px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.05em] text-[#108043]">
            Recommended
          </div>
          <PreviewRow
            title="Any 2 items"
            subtitle="Choose from the eligible product pool"
            price="EUR110.50"
            badge="Save EUR19.50"
            selected
          />
        </div>
        <PreviewRow
          title="Any 3 items"
          subtitle="A second tier can target another product group"
          price="EUR156.00"
          badge="Save EUR39.00"
        />
      </div>
    </div>
  );
}

function ShippingDiscountPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
      <div className="space-y-[8px]">
        <PreviewRow
          title="Buy 2 items"
          subtitle="Unlock free shipping"
          price="FREE SHIPPING"
          badge="Shipping perk"
          selected
        />
        <PreviewRow
          title="Spend EUR120"
          subtitle="Cart threshold unlock"
          price="FREE SHIPPING"
          badge="Cart amount"
        />
        <div className="rounded-[10px] bg-white px-[12px] py-[9px] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.06)]">
          <div className="text-[13px] font-semibold text-[#1c1f23]">
            Delivery discount function
          </div>
          <div className="mt-[2px] text-[12px] text-[#6d7175]">
            Applies on checkout shipping options
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDiscountPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
      <div className="space-y-[8px]">
        <PreviewRow title="Single" subtitle="Standard price" price="EUR65.00" />
        <PreviewRow
          title="Buy 2 items"
          subtitle="Unlock 10% off your order"
          price="10% OFF"
          badge="Order-wide"
          selected
        />
        <PreviewRow
          title="Spend EUR120"
          subtitle="Unlock 15% off your order"
          price="15% OFF"
          badge="Cart amount"
        />
        <div className="rounded-[10px] bg-white px-[12px] py-[9px] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.06)]">
          <div className="text-[13px] font-semibold text-[#1c1f23]">
            Order subtotal discount
          </div>
          <div className="mt-[2px] text-[12px] text-[#6d7175]">
            Applies after scoped products unlock the tier
          </div>
        </div>
      </div>
    </div>
  );
}

function CouponPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
      <div className="space-y-[8px]">
        <div className="rounded-[10px] bg-white px-[12px] py-[9px] shadow-[inset_0_0_0_1px_rgba(17,24,39,0.06)]">
          <div className="text-[13px] font-semibold text-[#1c1f23]">
            Coupon code: SAVE15
          </div>
          <div className="mt-[2px] text-[12px] text-[#6d7175]">
            Customers must enter the shared code first
          </div>
        </div>
        <PreviewRow
          title="Buy 2 items"
          subtitle="Unlock 15% off your order"
          price="15% OFF"
          badge="Coupon code"
          selected
        />
      </div>
    </div>
  );
}

function BxgyPreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
      <div className="space-y-[8px]">
        <PreviewRow
          title="Buy 1, get 1 free"
          price="Get 1 Free"
          badge="Save 50%"
          selected
        />
        <PreviewRow title="Buy 2, get 3 total" price="Pay for 2" badge="Save 60%" />
        <PreviewRow title="Buy 3, get 6 total" price="Pay for 3" badge="Save 67%" />
        <div className="rounded-[10px] bg-[#f6f6f7] px-[12px] py-[8px] text-[12px] font-semibold text-[#1c1f23]">
          + Free special gift!
        </div>
      </div>
    </div>
  );
}

function CompleteBundlePreview() {
  return (
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
      <div className="space-y-[8px]">
        <div className="rounded-[10px] border border-[#bfc4c9] bg-[#f3f3f3] px-[12px] py-[10px]">
          <div className="flex items-start gap-[10px]">
            <span className="mt-[3px] h-[14px] w-[14px] rounded-full border border-[#a6aaae]" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-[8px]">
                <div className="min-w-0 text-[14px] font-semibold leading-[18px] text-[#1c1f23]">
                  FetchLink C10 GPS Wireless Dog Fence with 2K Camera - ciwi
                </div>
                <div className="shrink-0 text-[14px] font-semibold leading-[18px] text-[#1c1f23]">
                  EUR65.00
                </div>
              </div>
              <div className="mt-[4px] text-[12px] text-[#6d7175]">Standard price</div>
            </div>
          </div>
        </div>
        <div className="rounded-[10px] border border-[#cfd3d7] bg-[#f7f7f7] px-[12px] py-[10px] opacity-80">
          <div className="flex items-start gap-[10px]">
            <span className="mt-[3px] flex h-[14px] w-[14px] items-center justify-center rounded-full border border-[#a6aaae]">
              <span className="h-[7px] w-[7px] rounded-full bg-[#a6aaae]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-[8px]">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold leading-[18px] text-[#8c9196]">
                    Complete the bundle
                  </div>
                  <div className="mt-[2px] text-[12px] leading-[16px] text-[#a8adb2]">
                    Save EUR49.00!
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[14px] font-semibold leading-[18px] text-[#8c9196]">
                    EUR196.00
                  </div>
                  <div className="mt-[2px] text-[12px] text-[#b6bbc0] line-through">
                    EUR245.00
                  </div>
                </div>
              </div>
              <div className="relative mt-[10px] grid grid-cols-2 overflow-hidden rounded-[10px] border border-[#d9dddf] bg-[#fbfbfb]">
                <div className="min-h-[132px] px-[10px] py-[12px] text-center">
                  <div className="mx-auto h-[48px] w-[48px] rounded-[6px] bg-white shadow-[inset_0_0_0_1px_rgba(17,24,39,0.06)]" />
                  <div className="mt-[8px] text-[11px] font-semibold leading-[16px] text-[#9aa0a6]">
                    FetchLink C10 GPS Wireless Dog Fence with 2K Camera - ciwi
                  </div>
                  <div className="mt-[6px] text-[11px] font-semibold text-[#9aa0a6]">
                    EUR52.00
                    <span className="ml-[4px] font-normal text-[#b7bcc1] line-through">
                      EUR65.00
                    </span>
                  </div>
                </div>
                <div className="border-l border-[#d9dddf] min-h-[132px] px-[10px] py-[12px] text-center">
                  <div className="mx-auto h-[48px] w-[48px] rounded-[6px] bg-white shadow-[inset_0_0_0_1px_rgba(17,24,39,0.06)]" />
                  <div className="mt-[8px] text-[11px] font-semibold leading-[16px] text-[#9aa0a6]">
                    Casual Pink Mountain Landscape Printed White Pullover
                  </div>
                  <div className="mt-[6px] text-[11px] font-semibold text-[#9aa0a6]">
                    EUR144.00
                    <span className="ml-[4px] font-normal text-[#b7bcc1] line-through">
                      EUR180.00
                    </span>
                  </div>
                </div>
                <div className="absolute left-1/2 top-1/2 flex h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#e2e4e7] text-[16px] font-semibold leading-none text-white">
                  +
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
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
      <div className="space-y-[8px]">
        <PreviewRow
          title="Buy 1, get 1 free"
          price="EUR52.00"
          badge="Save 60%"
          selected
        />
        <PreviewRow title="Buy 2, get 3 free" price="EUR104.00" badge="Save 68%" />
        <PreviewRow title="Buy 3, get 6 free" price="EUR156.00" badge="Save 73%" />
        <div className="rounded-[10px] bg-white px-[12px] py-[9px] shadow-[inset_0_0_0_1px_rgba(0,128,96,0.12)]">
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
    <div className="flex min-h-[260px] flex-col rounded-[12px] border border-[#dfe3e8] bg-[#f6f6f7] p-[12px]">
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
      </div>
    </div>
  );
}

function OfferTypePreview({ offerType }: { offerType: OfferTypeId }) {
  if (offerType === "bxgy") return <BxgyPreview />;
  if (offerType === "shipping-discount") return <ShippingDiscountPreview />;
  if (offerType === "order-discount") return <OrderDiscountPreview />;
  if (offerType === "coupon") return <CouponPreview />;
  if (offerType === "quantity-breaks-different") return <DifferentProductsPreview />;
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
  const visibleOfferTypeOptions = getVisibleOfferTypeOptions(selectedOfferType);

  return (
    <div
      className={`grid grid-cols-1 gap-[16px] ${
        compact ? "md:grid-cols-2 xl:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-4"
      }`}
    >
      {visibleOfferTypeOptions.map((option) => {
        const isSelected = option.id === selectedOfferType;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              if (!disabled) onSelect(option.id);
            }}
            disabled={disabled}
            aria-label={`${option.name}. ${option.description}`}
            className={`group flex h-full flex-col rounded-[12px] border bg-white p-[10px] text-left transition-colors ${
              isSelected
                ? "border-[#008060] shadow-[0_0_0_1px_rgba(0,128,96,0.08)]"
                : "border-[#dfe3e8]"
            } ${
              disabled
                ? "cursor-not-allowed opacity-70"
                : "hover:border-[#bfd7cd]"
            }`}
          >
            <OfferTypePreview offerType={option.id} />
            <div className="flex flex-1 flex-col px-[4px] pt-[12px]">
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
              <div className="mt-auto pt-[12px]">
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
