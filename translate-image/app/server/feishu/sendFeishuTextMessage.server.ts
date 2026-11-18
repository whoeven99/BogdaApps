import {
  isFeishuEnabled,
  prefixFeishuText,
  resolveFeishuEnv,
  resolveSupportFeishuWebhookUrl,
} from "./feishuConfig.server";

const LOG = "[Feishu]";

export type SendFeishuResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; reason: string };

export async function sendFeishuTextMessage(message: string): Promise<SendFeishuResult> {
  try {
    if (!isFeishuEnabled()) {
      return { ok: false, skipped: true, reason: "disabled" };
    }
    const env = resolveFeishuEnv();
    if (!env) {
      return { ok: false, skipped: true, reason: "bad_feishu_env" };
    }
    const webhookUrl = resolveSupportFeishuWebhookUrl();
    if (!webhookUrl) {
      return { ok: false, skipped: true, reason: "no_webhook_url" };
    }

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text: prefixFeishuText(message, env) },
      }),
    });
    const text = await res.text();
    let body: { code?: number };
    try {
      body = JSON.parse(text) as { code?: number };
    } catch {
      body = {};
    }
    if (!res.ok || (body.code !== undefined && body.code !== 0)) {
      console.error(`${LOG} failed httpStatus=${res.status}`);
      return { ok: false, reason: "webhook_error" };
    }
    return { ok: true };
  } catch (error) {
    console.error(`${LOG} failed`, error);
    return { ok: false, reason: "exception" };
  }
}
