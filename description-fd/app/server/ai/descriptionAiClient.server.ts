import { parseGeneratedDescriptionJson, type GeneratedDescriptionJson } from "../../lib/generatedDescriptionJson.server";

type ChatMessage = { role: "system" | "user"; content: string };

type ResolvedModel = {
  provider: "openai" | "deepseek";
  model: string;
};

export type GeneratedDescriptionResult = GeneratedDescriptionJson & {
  promptTokens: number;
  completionTokens: number;
};

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

export function resolveDescriptionModel(uiLabel: string): ResolvedModel {
  const value = uiLabel.toLowerCase();
  if (value.includes("deepseek")) {
    return { provider: "deepseek", model: env("DEEPSEEK_MODEL") || "deepseek-chat" };
  }
  return { provider: "openai", model: env("OPENAI_MODEL") || "gpt-4o-mini" };
}

function fallbackTokens(content: string): { promptTokens: number; completionTokens: number } {
  return { promptTokens: 0, completionTokens: Math.max(1, Math.ceil(content.length / 4)) };
}

async function chatCompletions(
  url: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages,
    }),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`LLM HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ""}`);
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = String(json.choices?.[0]?.message?.content ?? "");
  const promptTokens = Number(json.usage?.prompt_tokens);
  const completionTokens = Number(json.usage?.completion_tokens);
  if (Number.isFinite(promptTokens) && Number.isFinite(completionTokens) && promptTokens + completionTokens > 0) {
    return { content, promptTokens, completionTokens };
  }
  return { content, ...fallbackTokens(content) };
}

async function callOpenAi(model: string, messages: ChatMessage[]) {
  const apiKey = env("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  return chatCompletions("https://api.openai.com/v1/chat/completions", apiKey, model, messages);
}

async function callDeepSeek(model: string, messages: ChatMessage[]) {
  const apiKey = env("DEEPSEEK_API_KEY");
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY is not set");
  const base = env("DEEPSEEK_API_BASE") || "https://api.deepseek.com";
  return chatCompletions(`${base.replace(/\/$/, "")}/v1/chat/completions`, apiKey, model, messages);
}

export async function generateDescriptionJson(
  uiLabel: string,
  messages: ChatMessage[],
): Promise<GeneratedDescriptionResult> {
  const resolved = resolveDescriptionModel(uiLabel);
  const tryOrder: ResolvedModel[] =
    resolved.provider === "openai"
      ? [resolved, { provider: "deepseek", model: env("DEEPSEEK_MODEL") || "deepseek-chat" }]
      : [resolved];

  let lastError: unknown;
  for (const item of tryOrder) {
    const key = item.provider === "openai" ? env("OPENAI_API_KEY") : env("DEEPSEEK_API_KEY");
    if (!key) continue;
    try {
      const raw =
        item.provider === "openai"
          ? await callOpenAi(item.model, messages)
          : await callDeepSeek(item.model, messages);
      const parsed = parseGeneratedDescriptionJson(raw.content);
      if (parsed) {
        return {
          ...parsed,
          promptTokens: raw.promptTokens,
          completionTokens: raw.completionTokens,
        };
      }
      lastError = new Error("LLM did not return JSON {title, description}");
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("No LLM credentials configured");
}
