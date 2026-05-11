import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSyncExternalStore } from "react";
import type { CartSettingsRules } from "../app/types/cartSettings";
import { formatMoney } from "./money";
import type {
  CartDerived,
  CartMarketContext,
  CartPromotionsOverrides,
  CartState,
  CartTimerOverrides,
  CartUpsellOverrides,
} from "./types";
import type { CartStore } from "./store";

export type CartSettingsRulesLike = Pick<CartSettingsRules, "modules">;

const CartStoreContext = createContext<CartStore | null>(null);

export function CartStoreProvider({
  store,
  children,
}: {
  store: CartStore;
  children: React.ReactNode;
}) {
  return <CartStoreContext.Provider value={store}>{children}</CartStoreContext.Provider>;
}

function useCartStore() {
  const store = useContext(CartStoreContext);
  if (!store) throw new Error("useCartStore must be used within CartStoreProvider");
  return store;
}

export function useCartState(): CartState {
  const store = useCartStore();
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useCartActions() {
  const store = useCartStore();
  return useMemo(
    () => ({
      setMarket: (market: CartMarketContext) =>
        store.dispatch({ type: "market/replace", payload: market }),
      setItems: (items: CartState["items"]) =>
        store.dispatch({ type: "items/set", payload: items }),
      updateItem: (id: string, item: CartState["items"][number]) =>
        store.dispatch({ type: "items/update", payload: { id, item } }),
      removeItem: (id: string) => store.dispatch({ type: "items/remove", payload: { id } }),
      updateTimerOverrides: (payload: CartTimerOverrides) =>
        store.dispatch({ type: "overrides/update-timer", payload }),
      updatePromotionsOverrides: (payload: CartPromotionsOverrides) =>
        store.dispatch({ type: "overrides/update-promotions", payload }),
      updateUpsellOverrides: (payload: CartUpsellOverrides) =>
        store.dispatch({ type: "overrides/update-upsell", payload }),
    }),
    [store],
  );
}

function renderTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => variables[key] ?? "");
}

function formatSecondsAsMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function useTimer(enabled: boolean, durationSeconds: number) {
  const [leftSeconds, setLeftSeconds] = useState(durationSeconds);
  useEffect(() => {
    if (!enabled) {
      setLeftSeconds(0);
      return;
    }
    const duration = Math.max(0, Number(durationSeconds) || 0);
    setLeftSeconds(duration);
    const startAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startAt) / 1000);
      const left = Math.max(0, duration - elapsed);
      setLeftSeconds(left);
      if (left <= 0) window.clearInterval(interval);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, durationSeconds]);
  return leftSeconds;
}

export function useCartDerived(
  rules: CartSettingsRulesLike,
  state: CartState,
): CartDerived {
  const timerRules = rules.modules.timer;
  const promotionsRules = rules.modules.promotions;
  const overrides = state.overrides;
  const timerOverrides = overrides.timerOverrides ?? {};
  const promotionsOverrides = overrides.promotionsOverrides ?? {};
  const timerEnabled = timerOverrides.enabled ?? timerRules.enabled;
  const timerDuration = timerOverrides.durationSeconds ?? timerRules.durationSeconds;
  const timerTemplate = timerOverrides.textTemplate ?? timerRules.textTemplate;

  const promotionsEnabled = promotionsOverrides.enabled ?? promotionsRules.enabled;
  const freeShippingThresholdMinor =
    promotionsOverrides.freeShippingThresholdMinor ?? promotionsRules.freeShippingThresholdMinor;
  const successMessage = promotionsOverrides.successMessage ?? promotionsRules.successMessage;
  const progressMessage = promotionsOverrides.progressMessage ?? promotionsRules.progressMessage;

  const timerLeftSeconds = useTimer(timerEnabled, timerDuration);
  const timerLabel = formatSecondsAsMMSS(timerLeftSeconds);
  const timerText = renderTemplate(timerTemplate, { timer: timerLabel });

  const items = state.items;
  const subtotalMinor = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + Math.max(0, item.priceMinor) * Math.max(1, item.quantity),
        0,
      ),
    [items],
  );
  const compareAtSubtotalMinor = useMemo(
    () =>
      items.reduce((sum, item) => {
        const compareAt = item.compareAtMinor;
        if (compareAt == null) return sum;
        return sum + Math.max(0, compareAt) * Math.max(1, item.quantity);
      }, 0),
    [items],
  );

  const promotionsProgressPct =
    freeShippingThresholdMinor > 0 ? Math.min(1, subtotalMinor / freeShippingThresholdMinor) : 0;
  const remainingMinor = Math.max(0, freeShippingThresholdMinor - subtotalMinor);
  const promotionsText =
    subtotalMinor >= freeShippingThresholdMinor
      ? successMessage
      : renderTemplate(progressMessage, {
          remaining: formatMoney(remainingMinor, state.market),
          threshold: formatMoney(freeShippingThresholdMinor, state.market),
          total: formatMoney(subtotalMinor, state.market),
        });

  return useMemo(
    () => ({
      items,
      subtotalMinor,
      compareAtSubtotalMinor,
      timerText,
      timerLeftSeconds,
      promotionsEnabled,
      promotionsProgressPct,
      promotionsText,
    }),
    [
      items,
      subtotalMinor,
      compareAtSubtotalMinor,
      timerText,
      timerLeftSeconds,
      promotionsEnabled,
      promotionsProgressPct,
      promotionsText,
    ],
  );
}
