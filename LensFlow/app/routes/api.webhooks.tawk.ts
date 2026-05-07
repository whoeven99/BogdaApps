import type { ActionFunctionArgs } from "react-router";

import { sendFeishuBotText } from "../services/feishu-bot.server";

function getHeader(request: Request, headerName: string): string | null {
  return request.headers.get(headerName);
}

function formatIsoTime(input: unknown): string | undefined {
  if (typeof input !== "string" || !input.trim()) return undefined;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return input;
  return `${date.toLocaleString("zh-CN", { hour12: false })}（UTC${String(
    -date.getTimezoneOffset() / 60,
  ).startsWith("-")
    ? ""
    : "+"}${-date.getTimezoneOffset() / 60}）`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function tryExtractTawkContext(payload: unknown): {
  chatId?: string;
  propertyId?: string;
  propertyName?: string;
  event?: string;
  time?: string;
  visitorName?: string;
  visitorCity?: string;
  visitorCountry?: string;
  senderType?: string;
  messageType?: string;
  messageText?: string;
} | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;

  const message = asRecord(p.message);
  const sender = message ? asRecord(message.sender) : null;
  const visitor = asRecord(p.visitor);
  const property = asRecord(p.property);

  const senderType = sender && typeof sender.type === "string" ? sender.type : undefined;
  const messageType = message && typeof message.type === "string" ? message.type : undefined;
  const messageText = message && typeof message.text === "string" ? message.text : undefined;

  return {
    chatId: typeof p.chatId === "string" ? p.chatId : undefined,
    propertyId: property && typeof property.id === "string" ? property.id : undefined,
    propertyName: property && typeof property.name === "string" ? property.name : undefined,
    event: typeof p.event === "string" ? p.event : undefined,
    time: formatIsoTime(p.time),
    visitorName: visitor && typeof visitor.name === "string" ? visitor.name : undefined,
    visitorCity: visitor && typeof visitor.city === "string" ? visitor.city : undefined,
    visitorCountry: visitor && typeof visitor.country === "string" ? visitor.country : undefined,
    senderType,
    messageType,
    messageText,
  };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const configuredToken = process.env.TAWK_WEBHOOK_TOKEN?.trim();
  const body = await request.json();
  console.log("body:", body);
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

  const ctx = tryExtractTawkContext(payload);
  if (!ctx) {
    return Response.json(
      { ok: true, ignored: true, reason: "未识别到用户消息字段（已忽略）" },
      { status: 202 },
    );
  }

  // 只转发访客消息（避免把系统事件/坐席消息刷屏到飞书）
  if (ctx.senderType && ctx.senderType !== "visitor") {
    return Response.json(
      { ok: true, ignored: true, reason: `忽略非访客消息：sender.type=${ctx.senderType}` },
      { status: 202 },
    );
  }

  if (!ctx.messageText) {
    return Response.json(
      { ok: true, ignored: true, reason: "无 message.text（已忽略）" },
      { status: 202 },
    );
  }

  const result = await sendFeishuBotText({
    title: "Tawk 新用户消息",
    lines: [
      ctx.propertyName || ctx.propertyId
        ? `站点：${[ctx.propertyName, ctx.propertyId ? `(${ctx.propertyId})` : ""].filter(Boolean).join("")}`
        : "",
      ctx.event ? `事件：${ctx.event}` : "",
      ctx.time ? `时间：${ctx.time}` : "",
      ctx.visitorName ? `访客：${ctx.visitorName}` : "",
      ctx.visitorCity || ctx.visitorCountry
        ? `地区：${[ctx.visitorCity, ctx.visitorCountry].filter(Boolean).join("，")}`
        : "",
      ctx.chatId ? `会话：${ctx.chatId}` : "",
      ctx.messageType ? `消息类型：${ctx.messageType}` : "",
      `消息：${ctx.messageText}`,
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

