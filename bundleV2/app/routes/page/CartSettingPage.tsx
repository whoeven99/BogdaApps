import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { AlertCircle, X } from "lucide-react";
import { Button, Form, Input, InputNumber, Select, Switch, message } from "antd";
import "../../styles/tailwind.css";

type TimerExpireAction = "hide" | "restart" | "clearCart";

type PromotionTier = {
  thresholdMinor: number;
  label: string;
};

type TimerRules = {
  enabled: boolean;
  durationSeconds: number;
  expireAction: TimerExpireAction;
  resetOnAdd: boolean;
  textTemplate: string;
};

type PromotionsRules = {
  enabled: boolean;
  freeShippingThresholdMinor: number;
  successMessage: string;
  progressMessage: string;
  tiers?: PromotionTier[];
};

type CartSettingsRules = {
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

type CartSettingsStyles = {
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

type CartSettingsFormValues = CartSettingsRules & CartSettingsStyles;

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

function renderTemplate(template: string, variables: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => variables[key] ?? "");
}

function formatSecondsAsMMSS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function formatMinorMoney(minor: number, currency: string) {
  const amount = (Number(minor) || 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function CartSettingPage({
  shop,
  apiKey,
  themeExtensionEnabled,
}: {
  shop: string;
  apiKey: string;
  themeExtensionEnabled: boolean;
}) {
  const loadFetcher = useFetcher<{
    ok: boolean;
    rulesJson?: string;
    stylesJson?: string;
    error?: string;
  }>();
  const saveFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [form] = Form.useForm<CartSettingsFormValues>();
  const [draftValues, setDraftValues] = useState<CartSettingsFormValues>(
    buildFormValues(DEFAULT_RULES, DEFAULT_STYLES),
  );
  const debouncedDraft = useDebouncedValue(draftValues, 120);
  const previewValues = useMemo(() => normalizeFormValues(debouncedDraft), [debouncedDraft]);
  const [previewTimerLeft, setPreviewTimerLeft] = useState(
    DEFAULT_RULES.modules.timer.durationSeconds,
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
    if (saveFetcher.state !== "idle") return;
    if (!saveFetcher.data) return;
    if (saveFetcher.data.ok) {
      void message.success("已保存 Cart Settings（Theme App Extension 会自动读取）");
    } else {
      void message.error(saveFetcher.data.error || "保存失败");
    }
  }, [saveFetcher.state, saveFetcher.data]);

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
    saveFetcher.submit(
      {
        intent: "save-cart-settings",
        rulesJson: JSON.stringify(rules),
        stylesJson: JSON.stringify(styles.ui),
      },
      { method: "post" },
    );
  };

  useEffect(() => {
    if (!previewValues.modules.timer.enabled) {
      setPreviewTimerLeft(0);
      return;
    }
    const duration = previewValues.modules.timer.durationSeconds;
    setPreviewTimerLeft(duration);
    const startAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startAt) / 1000);
      const left = Math.max(0, duration - elapsed);
      setPreviewTimerLeft(left);
      if (left <= 0) {
        window.clearInterval(interval);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [previewValues.modules.timer.enabled, previewValues.modules.timer.durationSeconds]);

  const previewCurrency = "EUR";
  const previewCartTotalMinor = 18999;
  const timerLabel = formatSecondsAsMMSS(previewTimerLeft);
  const timerText = renderTemplate(previewValues.modules.timer.textTemplate, { timer: timerLabel });
  const thresholdMinor = previewValues.modules.promotions.freeShippingThresholdMinor;
  const progressPct =
    thresholdMinor > 0 ? Math.min(1, previewCartTotalMinor / thresholdMinor) : 0;
  const remainingMinor = Math.max(0, thresholdMinor - previewCartTotalMinor);
  const progressText =
    previewCartTotalMinor >= thresholdMinor
      ? previewValues.modules.promotions.successMessage
      : renderTemplate(previewValues.modules.promotions.progressMessage, {
          remaining: formatMinorMoney(remainingMinor, previewCurrency),
          threshold: formatMinorMoney(thresholdMinor, previewCurrency),
          total: formatMinorMoney(previewCartTotalMinor, previewCurrency),
        });

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
          <div
            className="rounded-[16px] border border-[#e5e7eb] overflow-hidden bg-white"
            style={{
              ["--accent" as any]: String(previewValues.ui.accentColor || "#7d5ce6"),
            }}
          >
            <div className="bg-white px-[16px] py-[12px] border-b border-[#eef0f2] flex items-center justify-between">
              <div className="font-sans font-semibold text-[16px] text-[#111827]">
                购物车 <span className="text-[#6b7280] font-normal">• 2</span>
              </div>
              <button
                type="button"
                className="w-[32px] h-[32px] rounded-full flex items-center justify-center hover:bg-black/5"
                aria-label="Close"
              >
                <X size={18} className="text-[#111827]" />
              </button>
            </div>

            {previewValues.modules.timer.enabled ? (
              <div
                className="px-[16px] py-[10px] text-center text-[13px]"
                style={{
                  background: previewValues.ui.timerBackgroundColor,
                  color: previewValues.ui.timerTextColor,
                }}
              >
                <span className="font-semibold">{timerText}</span>
              </div>
            ) : null}

            {previewValues.modules.promotions.enabled ? (
              <div className="px-[16px] pt-[12px]">
                <div className="text-center text-[13px] font-semibold text-[#111827]">
                  {progressText}
                </div>
                <div
                  className="mt-[10px] h-[10px] overflow-hidden"
                  style={{
                    background: previewValues.ui.promotionsBackgroundColor,
                    borderRadius: `${previewValues.ui.promotionsRadiusPx}px`,
                  }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${Math.round(progressPct * 100)}%`,
                      background: previewValues.ui.promotionsProgressColor,
                      borderRadius: `${previewValues.ui.promotionsRadiusPx}px`,
                      transition: "width 180ms ease",
                    }}
                  />
                </div>
              </div>
            ) : null}

            <div className="px-[16px] py-[14px] space-y-[16px]">
              {[
                {
                  title: "Casual Pink Mountain Landscape Printed White Pullover",
                  priceMinor: 18000,
                  currency: "EUR",
                },
                { title: "Bosch Siemens Cleaning Tablets", priceMinor: 999, currency: "EUR" },
              ].map((item) => (
                <div key={item.title} className="flex gap-[12px]">
                  <div className="w-[64px] h-[64px] rounded-[10px] bg-[#f3f4f6] flex-shrink-0" />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-[#111827] leading-snug">
                      {item.title}
                    </div>
                    <div className="mt-[6px] text-[13px] font-semibold text-[#111827]">
                      {formatMinorMoney(item.priceMinor, item.currency)}
                    </div>
                    <div className="mt-[10px] flex items-center gap-[8px]">
                      <div className="inline-flex items-center rounded-[10px] border border-[#e5e7eb] overflow-hidden">
                        <button type="button" className="w-[34px] h-[32px] text-[#111827] hover:bg-black/5">
                          −
                        </button>
                        <div className="w-[36px] h-[32px] flex items-center justify-center text-[13px]">
                          1
                        </div>
                        <button type="button" className="w-[34px] h-[32px] text-[#111827] hover:bg-black/5">
                          +
                        </button>
                      </div>
                      <button type="button" className="text-[#6b7280] hover:text-[#111827] text-[13px]">
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[#eef0f2] px-[16px] py-[14px]">
              <div className="flex items-center justify-between text-[13px] text-[#111827]">
                <span className="text-[#6b7280]">Subtotal</span>
                <span className="font-semibold">{formatMinorMoney(18999, "EUR")}</span>
              </div>
              <button
                type="button"
                className="mt-[12px] w-full h-[44px] rounded-[12px] text-white font-semibold text-[14px]"
                style={{
                  background: previewValues.ui.accentColor,
                }}
              >
                Checkout • {formatMinorMoney(18999, "EUR")}
              </button>
              <div className="mt-[10px] text-center text-[13px] text-[#111827] underline">
                or continue shopping
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

