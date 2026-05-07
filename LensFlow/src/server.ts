/// <reference types="node" />
import "dotenv/config";

import { createServer } from "node:http";

import {
  createOrUpdateLensRule,
  diagnoseLensVisibility,
  getProductLensOptions,
  getProductHealth,
  listLensRules,
  previewLensRules,
} from "./api/lensApi.js";
import { InMemoryLensRepository } from "./repositories/inMemoryLensRepository.js";

const repository = new InMemoryLensRepository();

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

function sendJson(
  response: import("node:http").ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function parseBody(request: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}

function getHeader(
  request: import("node:http").IncomingMessage,
  headerName: string,
): string | undefined {
  const value = request.headers[headerName.toLowerCase()];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

function isMethod(request: import("node:http").IncomingMessage, method: HttpMethod): boolean {
  return (request.method ?? "").toUpperCase() === method;
}

function tryExtractTawkUserMessage(payload: unknown): {
  text: string;
  from?: string;
  chatId?: string;
  raw?: unknown;
} | null {
  if (!payload || typeof payload !== "object") return null;

  const p = payload as Record<string, unknown>;

  // 兼容多种可能的字段命名（Tawk 实际 payload 可能随 webhook 类型变化）
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

  return { text, from, chatId, raw: payload };
}

async function forwardToFeishuBot(args: {
  feishuWebhookUrl: string;
  title: string;
  textLines: string[];
  rawPayload?: unknown;
}): Promise<{ ok: true } | { ok: false; status?: number; error: string }> {
  const { feishuWebhookUrl, title, textLines, rawPayload } = args;

  // 飞书群机器人：最通用的是 text 消息（无需额外权限）
  const contentLines = [
    `【${title}】`,
    ...textLines.filter(Boolean),
    rawPayload ? `\n原始 payload（JSON）：\n${JSON.stringify(rawPayload, null, 2)}` : "",
  ].filter(Boolean);

  try {
    const res = await fetch(feishuWebhookUrl, {
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

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost:3000");

  // 处理 CORS（给 monitor 前端调试用；生产如无需可收紧）
  if (isMethod(request, "OPTIONS") && url.pathname.startsWith("/api/")) {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Webhook-Token",
    });
    response.end();
    return;
  }

  // Tawk Webhook -> 飞书群机器人
  if (isMethod(request, "POST") && url.pathname === "/api/webhooks/tawk") {
    const configuredToken = process.env.TAWK_WEBHOOK_TOKEN?.trim();
    if (configuredToken) {
      const providedToken =
        getHeader(request, "x-webhook-token") ?? getHeader(request, "authorization")?.replace(/^Bearer\s+/i, "");
      if (!providedToken || providedToken !== configuredToken) {
        sendJson(response, 401, { error: "未授权：Webhook token 不匹配" });
        return;
      }
    }

    const feishuWebhookUrl = process.env.FEISHU_BOT_WEBHOOK_URL?.trim();
    if (!feishuWebhookUrl) {
      sendJson(response, 500, { error: "服务未配置：缺少 FEISHU_BOT_WEBHOOK_URL" });
      return;
    }

    let payload: unknown;
    try {
      payload = await parseBody(request);
    } catch {
      sendJson(response, 400, { error: "请求体不是合法 JSON" });
      return;
    }

    const extracted = tryExtractTawkUserMessage(payload);
    if (!extracted) {
      sendJson(response, 202, { ok: true, ignored: true, reason: "未识别到用户消息字段（已忽略）" });
      return;
    }

    const result = await forwardToFeishuBot({
      feishuWebhookUrl,
      title: "Tawk 新用户消息",
      textLines: [
        extracted.from ? `访客：${extracted.from}` : "",
        extracted.chatId ? `会话：${extracted.chatId}` : "",
        `消息：${extracted.text}`,
      ],
      rawPayload: payload,
    });

    if (!result.ok) {
      sendJson(response, 502, { error: result.error, status: result.status });
      return;
    }

    sendJson(response, 200, { ok: true });
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/admin/lens-rules") {
    const productId = url.searchParams.get("productId") ?? undefined;
    const result = listLensRules(repository, productId);
    sendJson(response, result.status, result.body);
    return;
  }

  if (
    request.method === "GET" &&
    url.pathname.startsWith("/api/products/") &&
    url.pathname.endsWith("/lens-options")
  ) {
    const parts = url.pathname.split("/");
    const productId = parts[3] ?? "";
    const prescriptionType = url.searchParams.get("prescriptionType") ?? undefined;
    const tags = url.searchParams.getAll("tag");
    const result = getProductLensOptions(repository, {
      productId,
      prescriptionType:
        prescriptionType === null
          ? undefined
          : (prescriptionType as Parameters<typeof getProductLensOptions>[1]["prescriptionType"]),
      tags: tags.length > 0 ? tags : undefined,
    });
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/lens-rules") {
    const body = (await parseBody(request)) as {
      productId: string;
      rule: Parameters<typeof createOrUpdateLensRule>[1]["rule"];
    };

    const result = createOrUpdateLensRule(repository, body);
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/admin/lens-rules/preview") {
    const body = (await parseBody(request)) as Parameters<typeof previewLensRules>[1];
    const result = previewLensRules(repository, body);
    sendJson(response, result.status, result.body);
    return;
  }

  if (
    request.method === "POST" &&
    url.pathname === "/api/admin/diagnostics/lens-visibility"
  ) {
    const body = (await parseBody(request)) as Parameters<
      typeof diagnoseLensVisibility
    >[1];
    const result = diagnoseLensVisibility(repository, body);
    sendJson(response, result.status, result.body);
    return;
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/admin/health/products/")) {
    const productId = url.pathname.split("/").pop() ?? "";
    const result = getProductHealth(repository, productId);
    sendJson(response, result.status, result.body);
    return;
  }

  sendJson(response, 404, {
    error: "未匹配到路由",
  });
});

const port = Number(process.env.PORT ?? "3000");

server.listen(port, () => {
  console.log(`Lens API server listening on http://localhost:${port}`);
});
