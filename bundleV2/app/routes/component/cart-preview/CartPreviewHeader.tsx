import { X } from "lucide-react";

export function CartPreviewHeader({ itemCount }: { itemCount: number }) {
  return (
    <div className="bg-white px-[16px] py-[12px] border-b border-[#eef0f2] flex items-center justify-between">
      <div className="font-sans font-semibold text-[16px] text-[#111827]">
        购物车 <span className="text-[#6b7280] font-normal">• {itemCount}</span>
      </div>
      <button
        type="button"
        className="w-[32px] h-[32px] rounded-full flex items-center justify-center hover:bg-black/5"
        aria-label="Close"
      >
        <X size={18} className="text-[#111827]" />
      </button>
    </div>
  );
}
