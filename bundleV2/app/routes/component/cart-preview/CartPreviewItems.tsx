import type { PreviewCartItem, PreviewMarketContext } from "../../../types/cartPreview";
import { formatMoney } from "../../../utils/moneyFormat";

function formatOptions(options: PreviewCartItem["optionsWithValues"]) {
  if (!options.length) return "";
  return options.map((opt) => `${opt.name}: ${opt.value}`).join(" / ");
}

export function CartPreviewItems({
  items,
  market,
  onQuantityChange,
  onRemove,
}: {
  items: PreviewCartItem[];
  market: PreviewMarketContext;
  onQuantityChange: (id: string, nextQty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="px-[16px] py-[14px] space-y-[16px]">
      {items.map((item) => (
        <div key={item.id} className="flex gap-[12px]">
          <div
            className="w-[64px] h-[64px] rounded-[10px] bg-[#f3f4f6] flex-shrink-0 overflow-hidden"
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.productTitle}
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-[#111827] leading-snug">
              {item.productTitle}
            </div>
            {item.variantTitle ? (
              <div className="mt-[2px] text-[12px] text-[#6b7280]">
                {item.variantTitle}
              </div>
            ) : null}
            {item.optionsWithValues.length ? (
              <div className="mt-[2px] text-[12px] text-[#6b7280]">
                {formatOptions(item.optionsWithValues)}
              </div>
            ) : null}
            <div className="mt-[6px] text-[13px] font-semibold text-[#111827]">
              {formatMoney(item.priceMinor, market)}
              {item.compareAtMinor != null ? (
                <span className="ml-[6px] text-[12px] text-[#9ca3af] line-through font-normal">
                  {formatMoney(item.compareAtMinor, market)}
                </span>
              ) : null}
            </div>
            <div className="mt-[10px] flex items-center gap-[8px]">
              <div className="inline-flex items-center rounded-[10px] border border-[#e5e7eb] overflow-hidden">
                <button
                  type="button"
                  className="w-[34px] h-[32px] text-[#111827] hover:bg-black/5"
                  onClick={() =>
                    onQuantityChange(item.id, Math.max(1, item.quantity - 1))
                  }
                >
                  −
                </button>
                <div className="w-[36px] h-[32px] flex items-center justify-center text-[13px]">
                  {item.quantity}
                </div>
                <button
                  type="button"
                  className="w-[34px] h-[32px] text-[#111827] hover:bg-black/5"
                  onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="text-[#6b7280] hover:text-[#111827] text-[13px]"
                onClick={() => onRemove(item.id)}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
