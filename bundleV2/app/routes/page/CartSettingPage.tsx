import { useEffect, useMemo, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { AlertCircle } from "lucide-react";
import { Button, Form, Input, InputNumber, Select, Switch, message } from "antd";
import "../../styles/tailwind.css";
import type { CartSettingsFormValues, CartSettingsRules, CartSettingsStyles } from "../../types/cartSettings";
import type {
  PreviewCartItem,
  PreviewMarketContext,
  PreviewMarketContextMap,
  PreviewSettings,
  PreviewUpsellItem,
} from "../../types/cartPreview";
import type { MarketItem } from "../../types/market";
import { buildFallbackMarket } from "../../utils/moneyFormat";
import { CartRenderer } from "../../../cart-runtime/renderer/CartRenderer";
import { CartStoreProvider, useCartActions, useCartState } from "../../../cart-runtime/react";
import { createCartStore } from "../../../cart-runtime/store";
import type { CartState } from "../../../cart-runtime/types";

const DEFAULT_RULES: CartSettingsRules = {
  version: 2,
  enabled: true,
  modules: {
    topBar: { enabled: true, order: 10 },
    timer: {
      enabled: true,
      order: 20,
      durationSeconds: 10 * 60,
      expireAction: "hide",
      resetOnAdd: true,
      textTemplate: "Your cart will expire in {timer}",
    },
    promotions: {
      enabled: true,
      order: 30,
      freeShippingThresholdMinor: 10000,
      successMessage: "Free shipping unlocked!",
      progressMessage: "Spend {remaining} more to unlock free shipping",
      tiers: [{ thresholdMinor: 10000, label: "Free Shipping" }],
    },
    trustBadges: { enabled: false, order: 80 },
    footer: { enabled: true, order: 90 },
  },
  ajax: {
    optimisticUpdate: true,
    sectionRender: true,
    debounceMs: 120,
  },
  storage: {
    timerKey: "ciwi_cart_timer_v1",
  },
};

const DEFAULT_STYLES: CartSettingsStyles = {
  ui: {
    accentColor: "#7d5ce6",
    surfaceColor: "#ffffff",
    borderColor: "#dfe3e8",
    radiusPx: 10,
    timerTextColor: "#7d5ce6",
    timerBackgroundColor: "#f3efff",
    promotionsProgressColor: "#7d5ce6",
    promotionsBackgroundColor: "#e5e7eb",
    promotionsRadiusPx: 999,
  },
};

function safeParseJson(value: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true as const, data: JSON.parse(value) as unknown };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Invalid JSON" };
  }
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> | null {
  if (!value) return null;
  const parsed = safeParseJson(value);
  if (!parsed.ok || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
    return null;
  }
  return parsed.data as Record<string, unknown>;
}

function normalizeRules(values: Partial<CartSettingsRules> = {}): CartSettingsRules {
  const merged: CartSettingsRules = {
    ...DEFAULT_RULES,
    ...values,
    modules: {
      ...DEFAULT_RULES.modules,
      ...values.modules,
      timer: {
        ...DEFAULT_RULES.modules.timer,
        ...values.modules?.timer,
      },
      promotions: {
        ...DEFAULT_RULES.modules.promotions,
        ...values.modules?.promotions,
      },
    },
    ajax: {
      ...DEFAULT_RULES.ajax,
      ...values.ajax,
    },
    storage: {
      ...DEFAULT_RULES.storage,
      ...values.storage,
    },
  };

  const tiers = Array.isArray(merged.modules.promotions.tiers)
    ? merged.modules.promotions.tiers
    : [];
  if (!merged.modules.promotions.freeShippingThresholdMinor && tiers.length > 0) {
    const lastTier = tiers[tiers.length - 1];
    merged.modules.promotions.freeShippingThresholdMinor = lastTier.thresholdMinor;
  }
  if (!merged.modules.promotions.freeShippingThresholdMinor) {
    merged.modules.promotions.freeShippingThresholdMinor =
      DEFAULT_RULES.modules.promotions.freeShippingThresholdMinor;
  }
  if (tiers.length <= 1) {
    merged.modules.promotions.tiers = [
      {
        thresholdMinor: merged.modules.promotions.freeShippingThresholdMinor,
        label: merged.modules.promotions.successMessage || "Free Shipping",
      },
    ];
  }

  return merged;
}

function normalizeStyles(values: Partial<CartSettingsStyles> = {}): CartSettingsStyles {
  return {
    ui: {
      ...DEFAULT_STYLES.ui,
      ...values.ui,
    },
  };
}

function buildFormValues(
  rules: CartSettingsRules,
  styles: CartSettingsStyles,
): CartSettingsFormValues {
  return {
    ...rules,
    ui: { ...styles.ui },
  };
}

function normalizeFormValues(values: Partial<CartSettingsFormValues>): CartSettingsFormValues {
  const { ui, ...rest } = values;
  const rules = normalizeRules(rest as Partial<CartSettingsRules>);
  const styles = normalizeStyles({ ui });
  return buildFormValues(rules, styles);
}

function splitFormValues(values: CartSettingsFormValues): {
  rules: CartSettingsRules;
  styles: CartSettingsStyles;
} {
  const { ui, ...rest } = values;
  return {
    rules: normalizeRules(rest),
    styles: normalizeStyles({ ui }),
  };
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

const DEFAULT_PREVIEW_ITEMS: PreviewCartItem[] = [
  {
    id: "preview-1",
    productTitle: "Casual Pink Mountain Landscape Printed White Pullover",
    variantTitle: "Rose / M",
    optionsWithValues: [
      { name: "Color", value: "Rose" },
      { name: "Size", value: "M" },
      { name: "Material", value: "Cotton" },
    ],
    quantity: 1,
    priceMinor: 18000,
    compareAtMinor: 22000,
    image: "https://via.placeholder.com/64",
    vendor: "Ciwi Studio",
  },
  {
    id: "preview-2",
    productTitle: "Bosch Siemens Cleaning Tablets",
    variantTitle: "Default",
    optionsWithValues: [{ name: "Style", value: "Standard" }],
    quantity: 2,
    priceMinor: 999,
    compareAtMinor: null,
    image: "https://via.placeholder.com/64",
    vendor: "Ciwi Essentials",
  },
];

const DEFAULT_UPSELL_ITEMS: PreviewUpsellItem[] = [
  {
    id: "upsell-1",
    title: "Premium Wash Bag",
    subtitle: "Add protection to your order",
    image: "https://via.placeholder.com/44",
    priceMinor: 1200,
    compareAtMinor: 1800,
    ctaLabel: "Add",
  },
];

function parseJsonArray(value: string | null | undefined): unknown[] | null {
  if (!value) return null;
  const parsed = safeParseJson(value);
  if (!parsed.ok || !Array.isArray(parsed.data)) return null;
  return parsed.data;
}

function normalizePreviewMarketContext(
  raw: unknown,
  fallback: PreviewMarketContext,
): PreviewMarketContext {
  if (!raw || typeof raw !== "object") return fallback;
  const obj = raw as Record<string, unknown>;
  return {
    marketId: typeof obj.marketId === "string" ? obj.marketId : fallback.marketId,
    marketName: typeof obj.marketName === "string" ? obj.marketName : fallback.marketName,
    currencyCode: typeof obj.currencyCode === "string" ? obj.currencyCode : fallback.currencyCode,
    currencySymbol:
      typeof obj.currencySymbol === "string" ? obj.currencySymbol : fallback.currencySymbol,
    moneyFormat:
      typeof obj.moneyFormat === "string"
        ? (obj.moneyFormat as PreviewMarketContext["moneyFormat"])
        : fallback.moneyFormat,
    locale: typeof obj.locale === "string" ? obj.locale : fallback.locale,
    taxDisplay:
      typeof obj.taxDisplay === "string"
        ? (obj.taxDisplay as PreviewMarketContext["taxDisplay"])
        : fallback.taxDisplay,
    exchangeRate:
      typeof obj.exchangeRate === "number" ? obj.exchangeRate : fallback.exchangeRate,
  };
}

function buildDefaultMarketContext(market: MarketItem | null): PreviewMarketContext {
  const fallback = buildFallbackMarket();
  if (!market) return fallback;
  return {
    ...fallback,
    marketId: market.id,
    marketName: market.name,
    currencyCode: market.currencyCode || fallback.currencyCode,
    currencySymbol: market.currencySymbol || fallback.currencySymbol,
    moneyFormat: (market.moneyFormat as PreviewMarketContext["moneyFormat"]) || fallback.moneyFormat,
    locale: market.locale || fallback.locale,
    taxDisplay: (market.taxDisplay as PreviewMarketContext["taxDisplay"]) || fallback.taxDisplay,
  };
}

function buildMarketContextMap(markets: MarketItem[]): PreviewMarketContextMap {
  const primaryMarket = markets[0] ?? null;
  const base = buildDefaultMarketContext(primaryMarket);
  const contexts: Record<string, PreviewMarketContext> = {};
  for (const market of markets) {
    contexts[market.id] = buildDefaultMarketContext(market);
  }
  if (!primaryMarket) {
    contexts[base.marketId] = base;
  }
  return {
    currentMarketId: base.marketId,
    contexts,
  };
}

function normalizePreviewItems(raw: unknown, fallbackItems: PreviewCartItem[]) {
  if (!Array.isArray(raw)) return fallbackItems;
  const items: PreviewCartItem[] = raw
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const obj = entry as Record<string, unknown>;
      const id = typeof obj.id === "string" ? obj.id : `preview-${index + 1}`;
      const productTitle =
        typeof obj.productTitle === "string" ? obj.productTitle : "Sample product";
      const variantTitle =
        typeof obj.variantTitle === "string" ? obj.variantTitle : "Default";
      const options =
        Array.isArray(obj.optionsWithValues)
          ? obj.optionsWithValues
              .map((opt) => {
                if (!opt || typeof opt !== "object") return null;
                const optionObj = opt as Record<string, unknown>;
                if (typeof optionObj.name !== "string" || typeof optionObj.value !== "string") {
                  return null;
                }
                return { name: optionObj.name, value: optionObj.value };
              })
              .filter((opt): opt is { name: string; value: string } => !!opt)
          : [];
      const quantity = Number(obj.quantity);
      const priceMinor = Number(obj.priceMinor);
      const compareAtNumber =
        obj.compareAtMinor == null ? null : Number(obj.compareAtMinor);
      const item: PreviewCartItem = {
        id,
        productTitle,
        variantTitle,
        optionsWithValues: options,
        quantity: Number.isFinite(quantity) && quantity > 0 ? Math.trunc(quantity) : 1,
        priceMinor: Number.isFinite(priceMinor) ? Math.trunc(priceMinor) : 0,
        compareAtMinor:
          compareAtNumber != null && Number.isFinite(compareAtNumber)
            ? Math.trunc(compareAtNumber)
            : null,
        image: typeof obj.image === "string" ? obj.image : "",
        vendor: typeof obj.vendor === "string" ? obj.vendor : undefined,
        properties: Array.isArray(obj.properties)
          ? obj.properties
              .map((prop) => {
                if (!prop || typeof prop !== "object") return null;
                const propObj = prop as Record<string, unknown>;
                if (typeof propObj.name !== "string" || typeof propObj.value !== "string") {
                  return null;
                }
                return { name: propObj.name, value: propObj.value };
              })
              .filter((prop): prop is { name: string; value: string } => !!prop)
          : undefined,
      };
      return item;
    })
    .filter((item): item is PreviewCartItem => !!item);
  return items.length ? items : fallbackItems;
}

function buildPreviewSettings(marketId: string, items: PreviewCartItem[]): PreviewSettings {
  return {
    marketId,
    items,
    timerOverrides: {},
    promotionsOverrides: {},
    upsellOverrides: {
      enabled: true,
      title: "You may also like",
      items: DEFAULT_UPSELL_ITEMS,
    },
  };
}

function mergePreviewSettings(
  base: PreviewSettings,
  raw: Record<string, unknown> | null,
): PreviewSettings {
  if (!raw) return base;
  const overrides = raw as Partial<PreviewSettings>;
  const upsellBase = base.upsellOverrides ?? {};
  const upsellOverride = overrides.upsellOverrides ?? {};
  return {
    ...base,
    ...overrides,
    marketId: base.marketId,
    items: base.items,
    timerOverrides: {
      ...base.timerOverrides,
      ...overrides.timerOverrides,
    },
    promotionsOverrides: {
      ...base.promotionsOverrides,
      ...overrides.promotionsOverrides,
    },
    upsellOverrides: {
      ...upsellBase,
      ...upsellOverride,
      items: upsellOverride.items ?? upsellBase.items,
    },
  };
}

function CartSettingContent({
  shop,
  apiKey,
  themeExtensionEnabled,
  markets,
}: {
  shop: string;
  apiKey: string;
  themeExtensionEnabled: boolean;
  markets: MarketItem[];
}) {
  const previewState = useCartState();
  const previewActions = useCartActions();
  const loadFetcher = useFetcher<{
    ok: boolean;
    rulesJson?: string;
    stylesJson?: string;
    error?: string;
  }>();
  const saveFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const previewLoadFetcher = useFetcher<{
    ok: boolean;
    previewSettingsJson?: string;
    previewCartItemsJson?: string;
    previewMarketContextJson?: string;
    error?: string;
  }>();
  const previewSaveFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [form] = Form.useForm<CartSettingsFormValues>();
  const [draftValues, setDraftValues] = useState<CartSettingsFormValues>(
    buildFormValues(DEFAULT_RULES, DEFAULT_STYLES),
  );
  const previewInitOnceRef = useRef(false);
  const debouncedDraft = useDebouncedValue(draftValues, 120);
  const previewValues = useMemo(() => normalizeFormValues(debouncedDraft), [debouncedDraft]);
  const [previewMarketMap, setPreviewMarketMap] = useState<PreviewMarketContextMap>(
    buildMarketContextMap(markets),
  );

  const openThemeEditorEmbed = () => {
    const storeHandle = shop.replace(".myshopify.com", "");
    const appEmbed = `${apiKey}/cart_drawer_enhancer`;
    const editorUrl = `https://admin.shopify.com/store/${storeHandle}/themes/current/editor?context=apps&appEmbed=${encodeURIComponent(appEmbed)}`;
    window.open(editorUrl, "_top");
  };

  useEffect(() => {
    if (loadFetcher.state !== "idle") return;
    if (loadFetcher.data) return;
    loadFetcher.submit({ intent: "load-cart-settings" }, { method: "post" });
  }, [loadFetcher]);

  useEffect(() => {
    if (previewLoadFetcher.state !== "idle") return;
    if (previewLoadFetcher.data) return;
    previewLoadFetcher.submit({ intent: "load-preview-settings" }, { method: "post" });
  }, [previewLoadFetcher]);

  useEffect(() => {
    if (!loadFetcher.data) return;
    if (!loadFetcher.data.ok) {
      void message.error(loadFetcher.data.error || "加载 Cart Settings 失败");
      const fallback = buildFormValues(DEFAULT_RULES, DEFAULT_STYLES);
      form.setFieldsValue(fallback);
      setDraftValues(fallback);
      return;
    }
    const rulesObj = parseJsonObject(loadFetcher.data.rulesJson);
    const stylesObj = parseJsonObject(loadFetcher.data.stylesJson);
    const normalizedRules = normalizeRules((rulesObj ?? {}) as Partial<CartSettingsRules>);
    const normalizedStyles = normalizeStyles(
      stylesObj && typeof stylesObj.ui === "object" && !Array.isArray(stylesObj.ui)
        ? { ui: stylesObj.ui as CartSettingsStyles["ui"] }
        : { ui: (stylesObj ?? {}) as CartSettingsStyles["ui"] },
    );
    const nextValues = buildFormValues(normalizedRules, normalizedStyles);
    form.setFieldsValue(nextValues);
    setDraftValues(nextValues);
  }, [loadFetcher.data, form]);

  useEffect(() => {
    if (!previewLoadFetcher.data) return;
    const previewSettingsJson = previewLoadFetcher.data.previewSettingsJson ?? "";
    const previewCartItemsJson = previewLoadFetcher.data.previewCartItemsJson ?? "";
    const previewMarketContextJson = previewLoadFetcher.data.previewMarketContextJson ?? "";
    const emptyPayload =
      !previewSettingsJson && !previewCartItemsJson && !previewMarketContextJson;
    const marketMap = buildMarketContextMap(markets);
    const fallbackMarket =
      marketMap.contexts[marketMap.currentMarketId] ?? buildFallbackMarket();
    const applyPreviewState = (
      market: PreviewMarketContext,
      items: PreviewCartItem[],
      settings: PreviewSettings,
      shouldPersistDefaults: boolean,
    ) => {
      setPreviewMarketMap((prev) => ({
        currentMarketId: market.marketId,
        contexts: { ...prev.contexts, [market.marketId]: market },
      }));
      previewActions.setMarket(market);
      previewActions.setItems(items);
      previewActions.updateTimerOverrides(settings.timerOverrides ?? {});
      previewActions.updatePromotionsOverrides(settings.promotionsOverrides ?? {});
      previewActions.updateUpsellOverrides(settings.upsellOverrides ?? {});
      if (
        shouldPersistDefaults &&
        !previewInitOnceRef.current &&
        previewSaveFetcher.state === "idle"
      ) {
        previewInitOnceRef.current = true;
        const previewSettings: PreviewSettings = {
          marketId: market.marketId,
          items,
          timerOverrides: settings.timerOverrides ?? {},
          promotionsOverrides: settings.promotionsOverrides ?? {},
          upsellOverrides: settings.upsellOverrides ?? {},
        };
        previewSaveFetcher.submit(
          {
            intent: "save-preview-settings",
            previewSettingsJson: JSON.stringify(previewSettings),
            previewCartItemsJson: JSON.stringify(items),
            previewMarketContextJson: JSON.stringify(market),
          },
          { method: "post" },
        );
      }
    };

    if (!previewLoadFetcher.data.ok) {
      // eslint-disable-next-line no-console
      console.error("[preview-settings] load failed", {
        error: previewLoadFetcher.data.error,
        previewSettingsJson,
        previewCartItemsJson,
        previewMarketContextJson,
      });
      const fallbackItems = DEFAULT_PREVIEW_ITEMS;
      const fallbackSettings = buildPreviewSettings(fallbackMarket.marketId, fallbackItems);
      applyPreviewState(fallbackMarket, fallbackItems, fallbackSettings, true);
      void message.warning("Preview Settings 加载失败，已使用默认值");
      return;
    }

    const marketRaw = parseJsonObject(previewMarketContextJson);
    if (!marketRaw && previewMarketContextJson) {
      // eslint-disable-next-line no-console
      console.warn("[preview-settings] invalid market context", previewMarketContextJson);
    }
    const market =
      marketRaw && typeof marketRaw === "object"
        ? normalizePreviewMarketContext(marketRaw, fallbackMarket)
        : fallbackMarket;
    const itemsRaw = parseJsonArray(previewCartItemsJson);
    if (!itemsRaw && previewCartItemsJson) {
      // eslint-disable-next-line no-console
      console.warn("[preview-settings] invalid cart items", previewCartItemsJson);
    }
    const items = normalizePreviewItems(itemsRaw, DEFAULT_PREVIEW_ITEMS);
    const settingsRaw = parseJsonObject(previewSettingsJson);
    if (!settingsRaw && previewSettingsJson) {
      // eslint-disable-next-line no-console
      console.warn("[preview-settings] invalid settings", previewSettingsJson);
    }
    const marketId =
      settingsRaw && typeof settingsRaw.marketId === "string"
        ? String(settingsRaw.marketId)
        : market.marketId;
    const baseSettings = buildPreviewSettings(marketId, items);
    const nextSettings = mergePreviewSettings(baseSettings, settingsRaw);
    applyPreviewState(market, items, nextSettings, emptyPayload);
  }, [previewLoadFetcher.data, markets, previewActions, previewSaveFetcher.state]);

  useEffect(() => {
    if (saveFetcher.state !== "idle") return;
    if (!saveFetcher.data) return;
    if (saveFetcher.data.ok) {
      void message.success("已保存 Cart Settings（Theme App Extension 会自动读取）");
    } else {
      void message.error(saveFetcher.data.error || "保存失败");
    }
  }, [saveFetcher.state, saveFetcher.data]);

  useEffect(() => {
    if (previewSaveFetcher.state !== "idle") return;
    if (!previewSaveFetcher.data) return;
    if (previewSaveFetcher.data.ok) {
      void message.success("已保存 Preview Settings");
    } else {
      void message.error(previewSaveFetcher.data.error || "Preview 保存失败");
    }
  }, [previewSaveFetcher.state, previewSaveFetcher.data]);

  const handleValuesChange = () => {
    const values = form.getFieldsValue(true) as CartSettingsFormValues;
    setDraftValues(values);
  };

  const handleReset = () => {
    const defaults = buildFormValues(DEFAULT_RULES, DEFAULT_STYLES);
    form.setFieldsValue(defaults);
    setDraftValues(defaults);
  };

  const onSave = () => {
    const values = normalizeFormValues(form.getFieldsValue(true) as CartSettingsFormValues);
    const { rules, styles } = splitFormValues(values);
    const previewSettings: PreviewSettings = {
      marketId: previewMarketMap.currentMarketId,
      items: previewState.items,
      timerOverrides: previewState.overrides.timerOverrides,
      promotionsOverrides: previewState.overrides.promotionsOverrides,
      upsellOverrides: previewState.overrides.upsellOverrides,
    };
    saveFetcher.submit(
      {
        intent: "save-cart-settings",
        rulesJson: JSON.stringify(rules),
        stylesJson: JSON.stringify(styles.ui),
      },
      { method: "post" },
    );
    previewSaveFetcher.submit(
      {
        intent: "save-preview-settings",
        previewSettingsJson: JSON.stringify(previewSettings),
        previewCartItemsJson: JSON.stringify(previewState.items),
        previewMarketContextJson: JSON.stringify(
          previewMarketMap.contexts[previewMarketMap.currentMarketId],
        ),
      },
      { method: "post" },
    );
  };
  const selectedMarketContext =
    previewMarketMap.contexts[previewMarketMap.currentMarketId] ?? buildFallbackMarket();
  const selectedMarketId = previewMarketMap.currentMarketId;
  const marketOptions =
    markets.length > 0
      ? markets.map((market) => ({ value: market.id, label: market.name }))
      : [{ value: selectedMarketId, label: selectedMarketContext.marketName }];

  const updatePreviewItem = (id: string, patch: Partial<PreviewCartItem>) => {
    const target = previewState.items.find((item) => item.id === id);
    if (!target) return;
    previewActions.updateItem(id, { ...target, ...patch });
  };

  const addPreviewItem = () => {
    const nextItem: PreviewCartItem = {
      id: `preview-${Date.now()}`,
      productTitle: "New product",
      variantTitle: "Default",
      optionsWithValues: [],
      quantity: 1,
      priceMinor: 0,
      compareAtMinor: null,
      image: "",
    };
    previewActions.setItems([...previewState.items, nextItem]);
  };

  const removePreviewItem = (id: string) => {
    previewActions.removeItem(id);
  };

  const handleQuantityChange = (id: string, nextQty: number) => {
    updatePreviewItem(id, { quantity: Math.max(1, Math.trunc(nextQty)) });
  };

  type ResourcePickerOption = { name?: string; value?: string };
  type ResourcePickerVariant = {
    id?: string;
    title?: string;
    price?: string;
    compareAtPrice?: string;
    selectedOptions?: ResourcePickerOption[];
  };
  type ResourcePickerImage = { originalSrc?: string };
  type ResourcePickerProduct = {
    id?: string;
    title?: string;
    vendor?: string;
    images?: ResourcePickerImage[];
    variants?: ResourcePickerVariant[];
  };

  const handleSelectProducts = async () => {
    const picker = (window as { shopify?: { resourcePicker?: Function } }).shopify?.resourcePicker;
    if (!picker) {
      void message.warning("当前环境不支持资源选择器");
      return;
    }
    const selected = (await picker({
      type: "product",
      action: "select",
      multiple: true,
    })) as ResourcePickerProduct[] | undefined;
    if (!selected || !Array.isArray(selected)) return;
    const nextItems = selected.map((item, index) => {
      const variant = item?.variants?.[0];
      const optionsWithValues = Array.isArray(variant?.selectedOptions)
        ? variant.selectedOptions
            .map((opt) => {
              if (!opt?.name || !opt?.value) return null;
              return { name: String(opt.name), value: String(opt.value) };
            })
            .filter((opt): opt is { name: string; value: string } => !!opt)
        : [];
      const priceMinor = Number(variant?.price) * 100;
      const compareAtMinor =
        variant?.compareAtPrice != null ? Number(variant.compareAtPrice) * 100 : null;
      return {
        id: `preview-picker-${Date.now()}-${index}`,
        productId: item?.id ? String(item.id) : undefined,
        variantId: variant?.id ? String(variant.id) : undefined,
        productTitle: String(item?.title || "Sample product"),
        variantTitle: String(variant?.title || "Default"),
        optionsWithValues,
        quantity: 1,
        priceMinor: Number.isFinite(priceMinor) ? Math.trunc(priceMinor) : 0,
        compareAtMinor:
          compareAtMinor != null && Number.isFinite(compareAtMinor)
            ? Math.trunc(compareAtMinor)
            : null,
        image: item?.images?.[0]?.originalSrc
          ? String(item.images[0].originalSrc)
          : "",
        vendor: item?.vendor ? String(item.vendor) : undefined,
      } satisfies PreviewCartItem;
    });
    previewActions.setItems(nextItems);
  };

  return (
    <div className="max-w-[1280px] mx-auto px-[16px] sm:px-[24px] pt-[16px] sm:pt-[24px]">
      {!themeExtensionEnabled ? (
        <div className="bg-[#fff4f4] border border-[#ffc9c9] rounded-[8px] p-[16px] mb-[16px] flex items-start justify-between">
          <div className="flex gap-[12px]">
            <div className="text-[#d72c0d] mt-[2px]">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="font-sans font-semibold text-[14px] leading-[20px] text-[#1c1f23] mb-[4px]">
                需要先启用 Theme App Extension
              </div>
              <div className="font-sans text-[13px] leading-[20px] text-[#5c6166]">
                Cart Drawer 增强脚本依赖 Theme App Extension 注入。点击下面按钮打开 Theme Editor 后启用 App
                Embed 并保存。
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openThemeEditorEmbed}
            className="bg-transparent text-[#1c1f23] px-[12px] py-[6px] rounded-[6px] font-normal text-[14px] border border-[#1c1f23] hover:bg-black/5 transition-all cursor-pointer"
          >
            打开 Theme Editor
          </button>
        </div>
      ) : (
        <div className="bg-[#f0faf6] border border-[#bfe9d7] rounded-[8px] p-[12px] mb-[16px] flex items-center justify-between">
          <div className="text-[13px] text-[#1c1f23]">
            Theme App Extension：<span className="font-semibold text-[#108043]">Active</span>
          </div>
          <button
            type="button"
            onClick={openThemeEditorEmbed}
            className="bg-transparent text-[#1c1f23] px-[12px] py-[6px] rounded-[6px] font-normal text-[14px] border border-[#dfe3e8] hover:bg-black/5 transition-all cursor-pointer"
          >
            管理 App Embed
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-[16px]">
        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[16px]">
          <div className="font-sans font-semibold text-[16px] text-[#1c1f23] mb-[12px]">
            Cart Setting（可视化配置）
          </div>

          <Form<CartSettingsFormValues>
            form={form}
            layout="vertical"
            initialValues={buildFormValues(DEFAULT_RULES, DEFAULT_STYLES)}
            onValuesChange={handleValuesChange}
          >
            <Form.Item name={["enabled"]} valuePropName="checked" label="总开关">
              <Switch />
            </Form.Item>

            <div className="mt-[12px] rounded-[12px] border border-[#e5e7eb] p-[12px]">
              <div className="font-sans font-semibold text-[14px] text-[#1c1f23]">
                Timer（倒计时）
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mt-[10px]">
                <Form.Item name={["modules", "timer", "enabled"]} valuePropName="checked" label="启用">
                  <Switch />
                </Form.Item>
                <Form.Item name={["modules", "timer", "durationSeconds"]} label="时长（秒）">
                  <InputNumber min={10} max={24 * 60 * 60} className="w-full" />
                </Form.Item>
                <Form.Item name={["modules", "timer", "expireAction"]} label="结束动作">
                  <Select
                    options={[
                      { value: "hide", label: "隐藏" },
                      { value: "restart", label: "重新开始" },
                      { value: "clearCart", label: "清空购物车" },
                    ]}
                  />
                </Form.Item>
                <Form.Item name={["storage", "timerKey"]} label="LocalStorage Key">
                  <Input />
                </Form.Item>
              </div>
              <Form.Item
                name={["modules", "timer", "textTemplate"]}
                label="文案内容（支持 {timer}）"
              >
                <Input />
              </Form.Item>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                <Form.Item name={["modules", "timer", "resetOnAdd"]} valuePropName="checked" label="加入购物车重置">
                  <Switch />
                </Form.Item>
                <div className="hidden sm:block" />
                <Form.Item name={["ui", "timerTextColor"]} label="文字颜色">
                  <Input type="color" className="h-[40px] px-[4px]" />
                </Form.Item>
                <Form.Item name={["ui", "timerBackgroundColor"]} label="背景颜色">
                  <Input type="color" className="h-[40px] px-[4px]" />
                </Form.Item>
              </div>
            </div>

            <div className="mt-[12px] rounded-[12px] border border-[#e5e7eb] p-[12px]">
              <div className="font-sans font-semibold text-[14px] text-[#1c1f23]">
                Promotions Progress Bar（促销进度条）
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mt-[10px]">
                <Form.Item
                  name={["modules", "promotions", "enabled"]}
                  valuePropName="checked"
                  label="启用"
                >
                  <Switch />
                </Form.Item>
                <Form.Item name={["ajax", "debounceMs"]} label="防抖（ms）">
                  <InputNumber min={0} max={2000} className="w-full" />
                </Form.Item>
                <Form.Item
                  name={["ajax", "optimisticUpdate"]}
                  valuePropName="checked"
                  label="Optimistic Update（乐观更新）"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name={["ajax", "sectionRender"]}
                  valuePropName="checked"
                  label="Section Render（分段刷新）"
                >
                  <Switch />
                </Form.Item>
                <Form.Item
                  name={["modules", "promotions", "freeShippingThresholdMinor"]}
                  label="Free Shipping Threshold（最小单位）"
                >
                  <InputNumber min={0} max={10_000_000_00} className="w-full" />
                </Form.Item>
                <Form.Item name={["ui", "promotionsRadiusPx"]} label="Border Radius（px）">
                  <InputNumber min={0} max={999} className="w-full" />
                </Form.Item>
                <Form.Item name={["ui", "promotionsProgressColor"]} label="Progress Bar Color">
                  <Input type="color" className="h-[40px] px-[4px]" />
                </Form.Item>
                <Form.Item name={["ui", "promotionsBackgroundColor"]} label="Background Color">
                  <Input type="color" className="h-[40px] px-[4px]" />
                </Form.Item>
              </div>
              <Form.Item name={["modules", "promotions", "successMessage"]} label="Success Message">
                <Input />
              </Form.Item>
              <Form.Item name={["modules", "promotions", "progressMessage"]} label="Progress Message">
                <Input />
              </Form.Item>
            </div>

            <div className="mt-[12px] rounded-[12px] border border-[#e5e7eb] p-[12px]">
              <div className="font-sans font-semibold text-[14px] text-[#1c1f23]">
                Preview Settings（预览配置）
              </div>
              <div className="mt-[10px] grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
                <div>
                  <div className="text-[12px] text-[#6b7280] mb-[6px]">Previewing Market</div>
                  <Select
                    value={selectedMarketId}
                    onChange={(value) => {
                      const marketId = String(value);
                      const fallbackContext = buildDefaultMarketContext(
                        markets.find((item) => item.id === marketId) ?? null,
                      );
                      const nextContext = fallbackContext;
                      setPreviewMarketMap((prev) => ({
                        currentMarketId: marketId,
                        contexts: { ...prev.contexts, [marketId]: nextContext },
                      }));
                      previewActions.setMarket(nextContext);
                    }}
                    options={marketOptions}
                  />
                </div>
                <div className="flex items-end">
                  <div className="w-full text-[12px] text-[#6b7280]">
                    将自动读取该市场的货币与格式配置。
                  </div>
                </div>
              </div>

              <div className="mt-[16px] flex items-center justify-between">
                <div className="font-sans font-semibold text-[13px] text-[#1c1f23]">
                  Previewing Items
                </div>
                <div className="flex gap-[8px]">
                  <Button size="small" onClick={addPreviewItem}>
                    添加商品
                  </Button>
                  <Button size="small" onClick={handleSelectProducts}>
                    选择商品
                  </Button>
                </div>
              </div>
              <div className="mt-[12px] space-y-[8px]">
                {previewState.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[10px] border border-[#e5e7eb] px-[10px] py-[8px] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-[8px]">
                      <div className="w-[32px] h-[32px] rounded-[6px] bg-[#f3f4f6] overflow-hidden">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="text-[12px] text-[#111827]">
                        {item.productTitle}
                      </div>
                    </div>
                    <div className="text-[12px] text-[#6b7280]">
                      数量：{item.quantity}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-[8px] mt-[12px]">
              <Button onClick={handleReset}>恢复默认</Button>
              <Button type="primary" loading={saveFetcher.state !== "idle"} onClick={onSave}>
                保存
              </Button>
            </div>
          </Form>
        </div>

        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[16px]">
          <div className="flex items-center justify-between gap-[8px] mb-[8px]">
            <div className="font-sans font-semibold text-[16px] text-[#1c1f23]">
              Cart Review
            </div>
          </div>
          <CartRenderer
            rules={previewValues}
            styles={previewValues}
            onQuantityChange={handleQuantityChange}
            onRemove={removePreviewItem}
            onUpsellAdd={(item) => {
              const nextItem: PreviewCartItem = {
                id: `preview-upsell-${Date.now()}`,
                productTitle: item.title,
                variantTitle: item.subtitle || "Upsell",
                optionsWithValues: [],
                quantity: 1,
                priceMinor: item.priceMinor,
                compareAtMinor: item.compareAtMinor ?? null,
                image: item.image,
              };
              previewActions.setItems([...previewState.items, nextItem]);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export function CartSettingPage({
  shop,
  apiKey,
  themeExtensionEnabled,
  markets,
}: {
  shop: string;
  apiKey: string;
  themeExtensionEnabled: boolean;
  markets: MarketItem[];
}) {
  const initialMarketMap = useMemo(() => buildMarketContextMap(markets), [markets]);
  const initialPreviewState: CartState = useMemo(
    () => ({
      market:
        initialMarketMap.contexts[initialMarketMap.currentMarketId] ?? buildFallbackMarket(),
      items: DEFAULT_PREVIEW_ITEMS,
      overrides: buildPreviewSettings(initialMarketMap.currentMarketId, DEFAULT_PREVIEW_ITEMS),
    }),
    [initialMarketMap],
  );
  const previewStore = useMemo(() => createCartStore(initialPreviewState), [initialPreviewState]);

  return (
    <CartStoreProvider store={previewStore}>
      <CartSettingContent
        shop={shop}
        apiKey={apiKey}
        themeExtensionEnabled={themeExtensionEnabled}
        markets={markets}
      />
    </CartStoreProvider>
  );
}

