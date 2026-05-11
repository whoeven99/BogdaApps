import type {
  CartAction,
  CartSettingsOverrides,
  CartState,
  CartTimerOverrides,
  CartPromotionsOverrides,
  CartUpsellOverrides,
} from "./types";

export type CartStore = {
  getState: () => CartState;
  dispatch: (action: CartAction) => void;
  subscribe: (listener: () => void) => () => void;
};

function applyTimerOverrides(
  current: CartSettingsOverrides,
  payload: CartTimerOverrides,
): CartSettingsOverrides {
  return {
    ...current,
    timerOverrides: { ...current.timerOverrides, ...payload },
  };
}

function applyPromotionsOverrides(
  current: CartSettingsOverrides,
  payload: CartPromotionsOverrides,
): CartSettingsOverrides {
  return {
    ...current,
    promotionsOverrides: { ...current.promotionsOverrides, ...payload },
  };
}

function applyUpsellOverrides(
  current: CartSettingsOverrides,
  payload: CartUpsellOverrides,
): CartSettingsOverrides {
  return {
    ...current,
    upsellOverrides: { ...current.upsellOverrides, ...payload },
  };
}

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "market/replace":
      return { ...state, market: action.payload };
    case "items/set":
      return { ...state, items: action.payload };
    case "items/update":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? action.payload.item : item,
        ),
      };
    case "items/remove":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
      };
    case "overrides/update-timer":
      return { ...state, overrides: applyTimerOverrides(state.overrides, action.payload) };
    case "overrides/update-promotions":
      return {
        ...state,
        overrides: applyPromotionsOverrides(state.overrides, action.payload),
      };
    case "overrides/update-upsell":
      return { ...state, overrides: applyUpsellOverrides(state.overrides, action.payload) };
    default:
      return state;
  }
}

export function createCartStore(initialState: CartState): CartStore {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    dispatch: (action: CartAction) => {
      state = cartReducer(state, action);
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
