import type { CartItem, CartMarketContext } from "../types";
import { formatMoney } from "../money";

function formatOptions(options: CartItem["optionsWithValues"]) {
  if (!options.length) return "";
  return options.map((opt) => `${opt.name}: ${opt.value}`).join(" / ");
}

export function CartItems({
  items,
  market,
  onQuantityChange,
  onRemove,
}: {
  items: CartItem[];
  market: CartMarketContext;
  onQuantityChange: (id: string, nextQty: number) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="ciwi-cart__items">
      {items.map((item) => (
        <div key={item.id} className="ciwi-cart__item">
          <div className="ciwi-cart__itemImage">
            {item.image ? (
              <img src={item.image} alt={item.productTitle} className="ciwi-cart__itemImg" />
            ) : null}
          </div>
          <div className="ciwi-cart__itemBody">
            <div className="ciwi-cart__itemTitle">{item.productTitle}</div>
            {item.variantTitle ? (
              <div className="ciwi-cart__itemMeta">{item.variantTitle}</div>
            ) : null}
            {item.optionsWithValues.length ? (
              <div className="ciwi-cart__itemMeta">{formatOptions(item.optionsWithValues)}</div>
            ) : null}
            {item.subscription ? (
              <div className="ciwi-cart__itemMeta">
                订阅：{item.subscription.planName} • {item.subscription.interval}
              </div>
            ) : null}
            <div className="ciwi-cart__itemPrice">
              {formatMoney(item.priceMinor, market)}
              {item.compareAtMinor != null ? (
                <span className="ciwi-cart__itemCompare">
                  {formatMoney(item.compareAtMinor, market)}
                </span>
              ) : null}
            </div>
            <div className="ciwi-cart__itemActions">
              <div className="ciwi-cart__qty">
                <button
                  type="button"
                  className="ciwi-cart__qtyBtn"
                  onClick={() => onQuantityChange(item.id, Math.max(1, item.quantity - 1))}
                >
                  −
                </button>
                <div className="ciwi-cart__qtyValue">{item.quantity}</div>
                <button
                  type="button"
                  className="ciwi-cart__qtyBtn"
                  onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className="ciwi-cart__remove"
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
