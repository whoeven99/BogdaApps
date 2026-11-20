import {
  isSupportFeishuReady,
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
    const env = resolveFeishuEnv();
    const webhookUrl = resolveSupportFeishuWebhookUrl();
    if (!isSupportFeishuReady() || !env || !webhookUrl) {
      return { ok: false, skipped: true, reason: "not_ready" };
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
    let body: { code?: number } = {};
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
