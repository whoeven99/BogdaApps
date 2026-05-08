import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";
import { AlertCircle } from "lucide-react";
import { Button, Form, Input, InputNumber, Select, Switch, message } from "antd";
import "../../styles/tailwind.css";

type TimerExpireAction = "hide" | "restart" | "clearCart";

type PromotionTier = {
  thresholdMinor: number;
  label: string;
};

export type CartSettings = {
  version: 1;
  enabled: boolean;
  ui: {
    accentColor: string;
    surfaceColor: string;
    borderColor: string;
    radiusPx: number;
  };
  modules: {
    topBar: { enabled: boolean; order: number };
    timer: {
      enabled: boolean;
      order: number;
      durationSeconds: number;
      expireAction: TimerExpireAction;
    };
    promotions: {
      enabled: boolean;
      order: number;
      tiers: PromotionTier[];
    };
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

const DEFAULT_SETTINGS: CartSettings = {
  version: 1,
  enabled: true,
  ui: {
    accentColor: "#008060",
    surfaceColor: "#ffffff",
    borderColor: "#dfe3e8",
    radiusPx: 10,
  },
  modules: {
    topBar: { enabled: true, order: 10 },
    timer: {
      enabled: true,
      order: 20,
      durationSeconds: 10 * 60,
      expireAction: "hide",
    },
    promotions: {
      enabled: true,
      order: 30,
      tiers: [
        { thresholdMinor: 5000, label: "Free Gift" },
        { thresholdMinor: 10000, label: "Free Shipping" },
        { thresholdMinor: 20000, label: "VIP Discount" },
      ],
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

function safeParseJson(value: string): { ok: true; data: unknown } | { ok: false; error: string } {
  try {
    return { ok: true as const, data: JSON.parse(value) as unknown };
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Invalid JSON" };
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
  const loadFetcher = useFetcher<{ ok: boolean; settingsJson?: string; error?: string }>();
  const saveFetcher = useFetcher<{ ok: boolean; error?: string }>();
  const [form] = Form.useForm<CartSettings>();
  const [rawJson, setRawJson] = useState<string>("");

  const parsedRawJson = useMemo(() => {
    if (!rawJson.trim()) return { ok: true as const, data: null as unknown };
    return safeParseJson(rawJson);
  }, [rawJson]);

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
      form.setFieldsValue(DEFAULT_SETTINGS);
      setRawJson(JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return;
    }
    const raw = String(loadFetcher.data.settingsJson || "").trim();
    if (!raw) {
      form.setFieldsValue(DEFAULT_SETTINGS);
      setRawJson(JSON.stringify(DEFAULT_SETTINGS, null, 2));
      return;
    }
    const parsed = safeParseJson(raw);
    if (!parsed.ok || !parsed.data || typeof parsed.data !== "object") {
      form.setFieldsValue(DEFAULT_SETTINGS);
      setRawJson(JSON.stringify(DEFAULT_SETTINGS, null, 2));
      void message.warning("已读取到历史配置，但 JSON 格式异常，已回退到默认配置");
      return;
    }
    form.setFieldsValue(parsed.data as CartSettings);
    setRawJson(JSON.stringify(parsed.data, null, 2));
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

  const onApplyFormToJson = async () => {
    const values = await form.validateFields();
    setRawJson(JSON.stringify(values, null, 2));
  };

  const onSave = () => {
    const next = rawJson.trim() ? rawJson : JSON.stringify(form.getFieldsValue(), null, 2);
    const parsed = safeParseJson(next);
    if (!parsed.ok) {
      void message.error(`JSON 校验失败：${parsed.error}`);
      return;
    }
    saveFetcher.submit({ intent: "save-cart-settings", settingsJson: next }, { method: "post" });
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

          <Form<CartSettings> form={form} layout="vertical" initialValues={DEFAULT_SETTINGS}>
            <Form.Item name={["enabled"]} valuePropName="checked" label="总开关">
              <Switch />
            </Form.Item>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px]">
              <Form.Item name={["ui", "accentColor"]} label="Accent Color">
                <Input />
              </Form.Item>
              <Form.Item name={["ui", "borderColor"]} label="Border Color">
                <Input />
              </Form.Item>
              <Form.Item name={["ui", "surfaceColor"]} label="Surface Color">
                <Input />
              </Form.Item>
              <Form.Item name={["ui", "radiusPx"]} label="Radius（px）">
                <InputNumber min={0} max={24} className="w-full" />
              </Form.Item>
            </div>

            <div className="mt-[8px] font-sans font-semibold text-[14px] text-[#1c1f23]">
              Timer（倒计时）
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mt-[8px]">
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

            <div className="mt-[8px] font-sans font-semibold text-[14px] text-[#1c1f23]">
              Promotions Progress Bar（促销进度条）
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[12px] mt-[8px]">
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
              <Form.Item name={["ajax", "optimisticUpdate"]} valuePropName="checked" label="Optimistic update（乐观更新）">
                <Switch />
              </Form.Item>
              <Form.Item name={["ajax", "sectionRender"]} valuePropName="checked" label="Section render（分段刷新）">
                <Switch />
              </Form.Item>
            </div>

            <div className="flex gap-[8px] mt-[12px]">
              <Button onClick={() => form.setFieldsValue(DEFAULT_SETTINGS)}>恢复默认</Button>
              <Button onClick={() => void onApplyFormToJson()}>同步到 JSON</Button>
              <Button type="primary" loading={saveFetcher.state !== "idle"} onClick={onSave}>
                保存
              </Button>
            </div>
          </Form>
        </div>

        <div className="bg-white rounded-[12px] border border-[#e3e8ed] shadow-sm p-[16px]">
          <div className="flex items-center justify-between gap-[8px] mb-[8px]">
            <div className="font-sans font-semibold text-[16px] text-[#1c1f23]">
              Cart Settings JSON（Theme 端读取）
            </div>
            <div className="text-[12px] text-[#6d7175]">
              保存后写入 shop metafield：<span className="font-mono">ciwi_bundle/ciwi-cart-settings</span>
            </div>
          </div>
          <div className="text-[12px] text-[#6d7175] mb-[8px]">
            这里是最终写入的配置。Theme App Extension 会在 storefront 端读取并注入到 Cart Drawer / Cart Page。
          </div>
          <textarea
            className="w-full min-h-[520px] font-mono text-[12px] border border-[#dfe3e8] rounded-[8px] p-[12px] outline-none focus:border-[#008060]"
            value={rawJson}
            onChange={(e) => setRawJson(e.target.value)}
          />
          {!parsedRawJson.ok ? (
            <div className="mt-[8px] text-[12px] text-[#d72c0d]">
              JSON 校验失败：{parsedRawJson.error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

