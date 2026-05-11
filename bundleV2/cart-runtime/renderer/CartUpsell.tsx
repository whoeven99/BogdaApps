import type { CartMarketContext, CartUpsellItem } from "../types";
import { formatMoney } from "../money";

export function CartUpsell({
  enabled,
  title,
  items,
  market,
  onAdd,
}: {
  enabled: boolean;
  title: string;
  items: CartUpsellItem[];
  market: CartMarketContext;
  onAdd?: (item: CartUpsellItem) => void;
}) {
  if (!enabled || !items.length) return null;
  return (
    <div className="ciwi-cart__upsell">
      <div className="ciwi-cart__upsellTitle">{title}</div>
      <div className="ciwi-cart__upsellList">
        {items.map((item) => (
          <div key={item.id} className="ciwi-cart__upsellItem">
            <div className="ciwi-cart__upsellImage">
              {item.image ? (
                <img src={item.image} alt={item.title} className="ciwi-cart__upsellImg" />
              ) : null}
            </div>
            <div className="ciwi-cart__upsellBody">
              <div className="ciwi-cart__upsellName">{item.title}</div>
              {item.subtitle ? (
                <div className="ciwi-cart__upsellMeta">{item.subtitle}</div>
              ) : null}
              <div className="ciwi-cart__upsellPrice">
                {formatMoney(item.priceMinor, market)}
                {item.compareAtMinor != null ? (
                  <span className="ciwi-cart__upsellCompare">
                    {formatMoney(item.compareAtMinor, market)}
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              className="ciwi-cart__upsellBtn"
              onClick={() => onAdd?.(item)}
            >
              {item.ctaLabel || "Add"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
