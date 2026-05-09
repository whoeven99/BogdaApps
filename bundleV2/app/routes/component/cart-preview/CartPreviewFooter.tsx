import type { PreviewMarketContext } from "../../../types/cartPreview";
import { formatMoney } from "../../../utils/moneyFormat";

export function CartPreviewFooter({
  subtotalMinor,
  market,
  accentColor,
}: {
  subtotalMinor: number;
  market: PreviewMarketContext;
  accentColor: string;
}) {
  return (
    <div className="border-t border-[#eef0f2] px-[16px] py-[14px]">
      <div className="flex items-center justify-between text-[13px] text-[#111827]">
        <span className="text-[#6b7280]">Subtotal</span>
        <span className="font-semibold">{formatMoney(subtotalMinor, market)}</span>
      </div>
      <button
        type="button"
        className="mt-[12px] w-full h-[44px] rounded-[12px] text-white font-semibold text-[14px]"
        style={{
          background: accentColor,
        }}
      >
        Checkout • {formatMoney(subtotalMinor, market)}
      </button>
      <div className="mt-[10px] text-center text-[13px] text-[#111827] underline">
        or continue shopping
      </div>
    </div>
  );
}
