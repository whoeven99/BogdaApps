import type { CartMarketContext } from "../types";
import { formatMoney } from "../money";

export function CartFooter({
  subtotalMinor,
  market,
  accentColor,
  onCheckout,
  onContinueShopping,
}: {
  subtotalMinor: number;
  market: CartMarketContext;
  accentColor: string;
  onCheckout?: () => void;
  onContinueShopping?: () => void;
}) {
  return (
    <div className="ciwi-cart__footer">
      <div className="ciwi-cart__subtotalRow">
        <span className="ciwi-cart__subtotalLabel">Subtotal</span>
        <span className="ciwi-cart__subtotalValue">{formatMoney(subtotalMinor, market)}</span>
      </div>
      <button
        type="button"
        className="ciwi-cart__checkoutBtn"
        style={{ background: accentColor }}
        onClick={onCheckout}
      >
        Checkout • {formatMoney(subtotalMinor, market)}
      </button>
      <button type="button" className="ciwi-cart__continueBtn" onClick={onContinueShopping}>
        or continue shopping
      </button>
    </div>
  );
}
