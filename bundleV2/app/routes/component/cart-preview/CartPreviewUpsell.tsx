import type { PreviewMarketContext, PreviewUpsellItem } from "../../../types/cartPreview";
import { formatMoney } from "../../../utils/moneyFormat";

export function CartPreviewUpsell({
  enabled,
  title,
  items,
  market,
}: {
  enabled: boolean;
  title: string;
  items: PreviewUpsellItem[];
  market: PreviewMarketContext;
}) {
  if (!enabled || !items.length) return null;
  return (
    <div className="px-[16px] pt-[12px]">
      <div className="text-[13px] font-semibold text-[#111827] mb-[8px]">
        {title}
      </div>
      <div className="space-y-[12px]">
        {items.map((item) => (
          <div key={item.id} className="flex gap-[10px] items-center">
            <div className="w-[44px] h-[44px] rounded-[8px] bg-[#f3f4f6] overflow-hidden">
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1">
              <div className="text-[13px] text-[#111827] font-medium">{item.title}</div>
              {item.subtitle ? (
                <div className="text-[12px] text-[#6b7280]">{item.subtitle}</div>
              ) : null}
              <div className="text-[12px] text-[#111827] font-semibold">
                {formatMoney(item.priceMinor, market)}
                {item.compareAtMinor != null ? (
                  <span className="ml-[6px] text-[11px] text-[#9ca3af] line-through font-normal">
                    {formatMoney(item.compareAtMinor, market)}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="px-[10px] h-[30px] rounded-[8px] border border-[#e5e7eb] text-[12px] font-medium text-[#111827] hover:bg-black/5"
            >
              {item.ctaLabel || "Add"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
