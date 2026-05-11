import type { CartSettingsStyles } from "../../app/types/cartSettings";
import type { CartUpsellItem } from "../types";
import { useCartDerived, useCartState } from "../react";
import type { CartSettingsRulesLike } from "../react";
import { CartFooter } from "./CartFooter";
import { CartHeader } from "./CartHeader";
import { CartItems } from "./CartItems";
import { CartPromotions } from "./CartPromotions";
import { CartTimer } from "./CartTimer";
import { CartUpsell } from "./CartUpsell";
import "./styles.css";

type Props = {
  rules: CartSettingsRulesLike;
  styles: CartSettingsStyles;
  onQuantityChange: (id: string, nextQty: number) => void;
  onRemove: (id: string) => void;
  onUpsellAdd?: (item: CartUpsellItem) => void;
  onClose?: () => void;
  onCheckout?: () => void;
  onContinueShopping?: () => void;
  trustBadges?: React.ReactNode;
};

export function CartRenderer({
  rules,
  styles,
  onQuantityChange,
  onRemove,
  onUpsellAdd,
  onClose,
  onCheckout,
  onContinueShopping,
  trustBadges,
}: Props) {
  const state = useCartState();
  const derived = useCartDerived(rules, state);
  const itemCount = derived.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
  const upsell = state.overrides.upsellOverrides;
  const upsellItems = upsell?.items ?? [];
  const upsellEnabled = upsell?.enabled ?? false;

  const orderedModules = [
    { id: "topBar", order: rules.modules.topBar.order },
    { id: "timer", order: rules.modules.timer.order },
    { id: "promotions", order: rules.modules.promotions.order },
    { id: "items", order: 50 },
    { id: "upsell", order: 80 },
    { id: "trustBadges", order: rules.modules.trustBadges.order },
    { id: "footer", order: rules.modules.footer.order },
  ].sort((a, b) => a.order - b.order);

  const renderModule = (id: string) => {
    switch (id) {
      case "topBar":
        return <CartHeader itemCount={itemCount} onClose={onClose} />;
      case "timer":
        return rules.modules.timer.enabled ? (
          <CartTimer
            text={derived.timerText}
            textColor={styles.ui.timerTextColor}
            backgroundColor={styles.ui.timerBackgroundColor}
          />
        ) : null;
      case "promotions":
        return derived.promotionsEnabled ? (
          <CartPromotions
            text={derived.promotionsText}
            progressPct={derived.promotionsProgressPct}
            progressColor={styles.ui.promotionsProgressColor}
            backgroundColor={styles.ui.promotionsBackgroundColor}
            radiusPx={styles.ui.promotionsRadiusPx}
          />
        ) : null;
      case "items":
        return (
          <CartItems
            items={derived.items}
            market={state.market}
            onQuantityChange={onQuantityChange}
            onRemove={onRemove}
          />
        );
      case "upsell":
        return (
          <CartUpsell
            enabled={upsellEnabled}
            title={upsell?.title || "You may also like"}
            items={upsellItems}
            market={state.market}
            onAdd={onUpsellAdd}
          />
        );
      case "trustBadges":
        return rules.modules.trustBadges.enabled ? (
          <div className="ciwi-cart__trustBadges">{trustBadges}</div>
        ) : null;
      case "footer":
        return rules.modules.footer.enabled ? (
          <CartFooter
            subtotalMinor={derived.subtotalMinor}
            market={state.market}
            accentColor={styles.ui.accentColor}
            onCheckout={onCheckout}
            onContinueShopping={onContinueShopping}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div
      className="ciwi-cart"
      style={{
        ["--ciwi-accent" as any]: String(styles.ui.accentColor || "#7d5ce6"),
        ["--ciwi-surface" as any]: String(styles.ui.surfaceColor || "#ffffff"),
        ["--ciwi-border" as any]: String(styles.ui.borderColor || "#e5e7eb"),
        ["--ciwi-radius" as any]: `${Number(styles.ui.radiusPx || 16)}px`,
      }}
    >
      {orderedModules.map((module) => (
        <div key={module.id}>{renderModule(module.id)}</div>
      ))}
    </div>
  );
}
