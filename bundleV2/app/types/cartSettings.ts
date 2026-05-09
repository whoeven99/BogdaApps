export type TimerExpireAction = "hide" | "restart" | "clearCart";

export type PromotionTier = {
  thresholdMinor: number;
  label: string;
};

export type TimerRules = {
  enabled: boolean;
  durationSeconds: number;
  expireAction: TimerExpireAction;
  resetOnAdd: boolean;
  textTemplate: string;
};

export type PromotionsRules = {
  enabled: boolean;
  freeShippingThresholdMinor: number;
  successMessage: string;
  progressMessage: string;
  tiers?: PromotionTier[];
};

export type CartSettingsRules = {
  version: 2;
  enabled: boolean;
  modules: {
    topBar: { enabled: boolean; order: number };
    timer: TimerRules & { order: number };
    promotions: PromotionsRules & { order: number };
    trustBadges: { enabled: boolean; order: number };
    footer: { enabled: boolean; order: number };
  };
  ajax: {
    optimisticUpdate: boolean;
    sectionRender: boolean;
    debounceMs: number;
  };
  storage: {
    timerKey: string;
  };
};

export type CartSettingsStyles = {
  ui: {
    accentColor: string;
    surfaceColor: string;
    borderColor: string;
    radiusPx: number;
    timerTextColor: string;
    timerBackgroundColor: string;
    promotionsProgressColor: string;
    promotionsBackgroundColor: string;
    promotionsRadiusPx: number;
  };
};

export type CartSettingsFormValues = CartSettingsRules & CartSettingsStyles;
