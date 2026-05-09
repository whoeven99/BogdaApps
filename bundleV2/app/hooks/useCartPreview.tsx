import { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type {
  PreviewAction,
  PreviewCartItem,
  PreviewMarketContext,
  PreviewPromotionsOverrides,
  PreviewSettings,
  PreviewState,
  PreviewTimerOverrides,
  PreviewUpsellOverrides,
} from "../types/cartPreview";
import type { CartSettingsRules } from "../types/cartSettings";
import { formatMoney } from "../utils/moneyFormat";

export type CartSettingsRulesLike = Pick<CartSettingsRules, "modules">;

export type PreviewDerived = {
  items: PreviewCartItem[];
  subtotalMinor: number;
  compareAtSubtotalMinor: number;
  timerText: string;
  timerLeftSeconds: number;
  promotionsEnabled: boolean;
  promotionsProgressPct: number;
  promotionsText: string;
};

type PreviewDispatch = React.Dispatch<PreviewAction>;

const PreviewStateContext = createContext<PreviewState | null>(null);
const PreviewDispatchContext = createContext<PreviewDispatch | null>(null);

function previewReducer(state: PreviewState, action: PreviewAction): PreviewState {
  switch (action.type) {
    case "market/replace":
      return { ...state, market: action.payload };
    case "settings/replace":
      return { ...state, settings: action.payload };
    case "settings/update-items":
      return { ...state, settings: { ...state.settings, items: action.payload } };
    case "settings/update-item":
      return {
        ...state,
        settings: {
          ...state.settings,
          items: state.settings.items.map((item) =>
            item.id === action.payload.id ? action.payload.item : item,
          ),
        },
      };
    case "settings/remove-item":
      return {
        ...state,
        settings: {
          ...state.settings,
          items: state.settings.items.filter((item) => item.id !== action.payload.id),
        },
      };
    case "settings/update-timer":
      return {
        ...state,
        settings: {
          ...state.settings,
          timerOverrides: { ...state.settings.timerOverrides, ...action.payload },
        },
      };
    case "settings/update-promotions":
      return {
        ...state,
        settings: {
          ...state.settings,
          promotionsOverrides: {
            ...state.settings.promotionsOverrides,
            ...action.payload,
          },
        },
      };
    case "settings/update-upsell":
      return {
        ...state,
        settings: {
          ...state.settings,
          upsellOverrides: { ...state.settings.upsellOverrides, ...action.payload },
        },
      };
    default:
      return state;
  }
}

export function PreviewProvider({
  initialState,
  children,
}: {
  initialState: PreviewState;
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(previewReducer, initialState);
  return (
    <PreviewStateContext.Provider value={state}>
      <PreviewDispatchContext.Provider value={dispatch}>
        {children}
      </PreviewDispatchContext.Provider>
    </PreviewStateContext.Provider>
  );
}

export function usePreviewState() {
  const ctx = useContext(PreviewStateContext);
  if (!ctx) throw new Error("usePreviewState must be used within PreviewProvider");
  return ctx;
}

export function usePreviewActions() {
  const dispatch = useContext(PreviewDispatchContext);
  if (!dispatch) throw new Error("usePreviewActions must be used within PreviewProvider");
  return {
    dispatch,
    setMarket: (market: PreviewMarketContext) =>
      dispatch({ type: "market/replace", payload: market }),
    setSettings: (settings: PreviewSettings) =>
      dispatch({ type: "settings/replace", payload: settings }),
    updateItems: (items: PreviewCartItem[]) =>
      dispatch({ type: "settings/update-items", payload: items }),
    updateItem: (id: string, item: PreviewCartItem) =>
      dispatch({ type: "settings/update-item", payload: { id, item } }),
    removeItem: (id: string) =>
      dispatch({ type: "settings/remove-item", payload: { id } }),
    updateTimerOverrides: (payload: PreviewTimerOverrides) =>
      dispatch({ type: "settings/update-timer", payload }),
    updatePromotionsOverrides: (payload: PreviewPromotionsOverrides) =>
      dispatch({ type: "settings/update-promotions", payload }),
    updateUpsellOverrides: (payload: PreviewUpsellOverrides) =>
      dispatch({ type: "settings/update-upsell", payload }),
  };
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

function usePreviewTimer(enabled: boolean, durationSeconds: number) {
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

export function usePreviewDerived(
  rules: CartSettingsRulesLike,
  state: PreviewState,
): PreviewDerived {
  const timerRules = rules.modules.timer;
  const promotionsRules = rules.modules.promotions;
  const timerOverrides = state.settings.timerOverrides ?? {};
  const promotionsOverrides = state.settings.promotionsOverrides ?? {};
  const timerEnabled = timerOverrides.enabled ?? timerRules.enabled;
  const timerDuration = timerOverrides.durationSeconds ?? timerRules.durationSeconds;
  const timerTemplate = timerOverrides.textTemplate ?? timerRules.textTemplate;

  const promotionsEnabled =
    promotionsOverrides.enabled ?? promotionsRules.enabled;
  const freeShippingThresholdMinor =
    promotionsOverrides.freeShippingThresholdMinor ??
    promotionsRules.freeShippingThresholdMinor;
  const successMessage = promotionsOverrides.successMessage ?? promotionsRules.successMessage;
  const progressMessage =
    promotionsOverrides.progressMessage ?? promotionsRules.progressMessage;

  const timerLeftSeconds = usePreviewTimer(timerEnabled, timerDuration);
  const timerLabel = formatSecondsAsMMSS(timerLeftSeconds);
  const timerText = renderTemplate(timerTemplate, { timer: timerLabel });

  const items = state.settings.items;
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
    freeShippingThresholdMinor > 0
      ? Math.min(1, subtotalMinor / freeShippingThresholdMinor)
      : 0;
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
