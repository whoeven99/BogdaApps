import type { ActionFunctionArgs } from "react-router";

import { sendFeishuBotText } from "../services/feishu-bot.server";

function getHeader(request: Request, headerName: string): string | null {
  return request.headers.get(headerName);
}

function tryExtractTawkUserMessage(payload: unknown): {
  text: string;
  from?: string;
  chatId?: string;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const text =
    (typeof p.message === "string" && p.message) ||
    (typeof p.text === "string" && p.text) ||
    (typeof p.body === "string" && p.body) ||
    (typeof p.content === "string" && p.content) ||
    "";

  if (!text) return null;

  const from =
    (typeof p.from === "string" && p.from) ||
    (typeof p.sender === "string" && p.sender) ||
    (typeof p.visitorName === "string" && p.visitorName) ||
    undefined;

  const chatId =
    (typeof p.chatId === "string" && p.chatId) ||
    (typeof p.conversationId === "string" && p.conversationId) ||
    (typeof p.ticketId === "string" && p.ticketId) ||
    undefined;

  return { text, from, chatId };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const configuredToken = process.env.TAWK_WEBHOOK_TOKEN?.trim();
  if (configuredToken) {
    const xToken = getHeader(request, "x-webhook-token");
    const auth = getHeader(request, "authorization");
    const bearer = auth?.replace(/^Bearer\s+/i, "") ?? null;
    const provided = xToken ?? bearer;

    if (!provided || provided !== configuredToken) {
      return Response.json({ error: "未授权：Webhook token 不匹配" }, { status: 401 });
    }
  }

  const payload = (await request.json().catch(() => null)) as unknown;
  if (!payload) {
    return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }

  const extracted = tryExtractTawkUserMessage(payload);
  if (!extracted) {
    return Response.json(
      { ok: true, ignored: true, reason: "未识别到用户消息字段（已忽略）" },
      { status: 202 },
    );
  }

  const result = await sendFeishuBotText({
    title: "Tawk 新用户消息",
    lines: [
      extracted.from ? `访客：${extracted.from}` : "",
      extracted.chatId ? `会话：${extracted.chatId}` : "",
      `消息：${extracted.text}`,
    ],
    rawPayload: payload,
  });

  if (!result.ok) {
    return Response.json(
      { error: result.error, status: result.status },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
};

