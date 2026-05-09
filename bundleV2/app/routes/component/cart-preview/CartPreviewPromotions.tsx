export function CartPreviewPromotions({
  text,
  progressPct,
  progressColor,
  backgroundColor,
  radiusPx,
}: {
  text: string;
  progressPct: number;
  progressColor: string;
  backgroundColor: string;
  radiusPx: number;
}) {
  return (
    <div className="px-[16px] pt-[12px]">
      <div className="text-center text-[13px] font-semibold text-[#111827]">
        {text}
      </div>
      <div
        className="mt-[10px] h-[10px] overflow-hidden"
        style={{
          background: backgroundColor,
          borderRadius: `${radiusPx}px`,
        }}
      >
        <div
          className="h-full"
          style={{
            width: `${Math.round(progressPct * 100)}%`,
            background: progressColor,
            borderRadius: `${radiusPx}px`,
            transition: "width 180ms ease",
          }}
        />
      </div>
    </div>
  );
}
