export type FeishuBotSendResult =
  | { ok: true }
  | { ok: false; status?: number; error: string };

export function getFeishuBotConfig() {
  const webhookUrl = process.env.FEISHU_BOT_WEBHOOK_URL?.trim() ?? "";
  const enabled = Boolean(webhookUrl);

  return {
    webhookUrl,
    enabled,
  };
}

export async function sendFeishuBotText(input: {
  title: string;
  lines: string[];
  rawPayload?: unknown;
}): Promise<FeishuBotSendResult> {
  const config = getFeishuBotConfig();
  if (!config.enabled) {
    return {
      ok: false,
      error: "服务未配置：缺少 FEISHU_BOT_WEBHOOK_URL",
    };
  }

  const contentLines = [
    `【${input.title}】`,
    ...input.lines.filter(Boolean),
    input.rawPayload
      ? `\n原始 payload（JSON）：\n${JSON.stringify(input.rawPayload, null, 2)}`
      : "",
  ].filter(Boolean);

  try {
    const res = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        msg_type: "text",
        content: { text: contentLines.join("\n") },
      }),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        error: `飞书机器人返回非 2xx：${res.status} ${res.statusText}${bodyText ? `，body=${bodyText}` : ""}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
