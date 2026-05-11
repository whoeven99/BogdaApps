export function CartHeader({
  itemCount,
  onClose,
}: {
  itemCount: number;
  onClose?: () => void;
}) {
  return (
    <div className="ciwi-cart__header">
      <div className="ciwi-cart__title">
        购物车 <span className="ciwi-cart__titleCount">• {itemCount}</span>
      </div>
      <button
        type="button"
        className="ciwi-cart__iconButton"
        aria-label="Close"
        onClick={onClose}
      >
        <span className="ciwi-cart__icon" aria-hidden>
          ×
        </span>
      </button>
    </div>
  );
}
