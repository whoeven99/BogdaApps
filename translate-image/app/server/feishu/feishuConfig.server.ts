import { normalizeEnvValue } from "~/config/runtimeEnv.server";

const SUPPORT_WEBHOOK_ENV = "FEISHU_WEBHOOK_URL_SUPPORT";

export type FeishuEnv = "test" | "prod";

export function resolveFeishuEnv(): FeishuEnv | null {
  const raw = normalizeEnvValue(process.env.FEISHU_ENV).toLowerCase();
  if (raw === "test" || raw === "prod") return raw;
  return null;
}

export function prefixFeishuText(message: string, env: FeishuEnv): string {
  if (env === "prod") return message;
  const prefix = "[测试] ";
  if (message.startsWith(prefix)) return message;
  return `${prefix}${message}`;
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return defaultValue;
}

export function isFeishuEnabled(): boolean {
  return parseBoolean(process.env.FEISHU_ENABLED, true);
}

export function resolveSupportFeishuWebhookUrl(): string | null {
  const url = process.env[SUPPORT_WEBHOOK_ENV]?.trim();
  return url && url.length > 0 ? url : null;
}

export function isSupportFeishuReady(): boolean {
  return (
    isFeishuEnabled() &&
    resolveFeishuEnv() !== null &&
    resolveSupportFeishuWebhookUrl() !== null
  );
}
