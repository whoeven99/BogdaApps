export function CartTimer({
  text,
  textColor,
  backgroundColor,
}: {
  text: string;
  textColor: string;
  backgroundColor: string;
}) {
  return (
    <div className="ciwi-cart__timer" style={{ background: backgroundColor, color: textColor }}>
      <span className="ciwi-cart__timerText">{text}</span>
    </div>
  );
}
