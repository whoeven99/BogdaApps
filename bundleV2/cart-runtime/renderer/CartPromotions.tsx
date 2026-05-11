export function CartPromotions({
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
    <div className="ciwi-cart__promotions">
      <div className="ciwi-cart__promotionsText">{text}</div>
      <div
        className="ciwi-cart__promotionsBar"
        style={{
          background: backgroundColor,
          borderRadius: `${radiusPx}px`,
        }}
      >
        <div
          className="ciwi-cart__promotionsFill"
          style={{
            width: `${Math.round(progressPct * 100)}%`,
            background: progressColor,
            borderRadius: `${radiusPx}px`,
          }}
        />
      </div>
    </div>
  );
}
