export type FeishuEnv = "test" | "prod";

const SUPPORT_WEBHOOK_ENV = "FEISHU_WEBHOOK_URL_SUPPORT";

export function resolveFeishuEnv(): FeishuEnv | null {
  const raw = String(process.env.FEISHU_ENV ?? "")
    .trim()
    .toLowerCase();
  if (raw === "test" || raw === "prod") return raw;
  return null;
}

export function prefixFeishuText(message: string, env: FeishuEnv): string {
  if (env === "prod") return message;
  const prefix = "[测试] ";
  if (message.startsWith(prefix)) return message;
  return `${prefix}${message}`;
}

export function resolveSupportFeishuWebhookUrl(): string | null {
  const url = String(process.env[SUPPORT_WEBHOOK_ENV] ?? "").trim();
  return url || null;
}

export function isSupportFeishuReady(): boolean {
  return resolveFeishuEnv() !== null && resolveSupportFeishuWebhookUrl() !== null;
}
