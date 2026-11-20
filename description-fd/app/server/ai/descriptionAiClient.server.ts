import {
  isDeepSeekV4Model,
  parseDeepSeekApiKeys,
  resolveDeepSeekChatUrl,
  resolveDescriptionAiModel,
} from "../../lib/descriptionAiModels";
import { parseGeneratedDescriptionJson, type GeneratedDescriptionJson } from "../../lib/generatedDescriptionJson.server";

type ChatMessage = { role: "system" | "user"; content: string };

export type GeneratedDescriptionResult = GeneratedDescriptionJson & {
  promptTokens: number;
  completionTokens: number;
};

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

export function resolveDescriptionModel(uiLabel: string): string {
  return resolveDescriptionAiModel(uiLabel, env("DEEPSEEK_MODEL"));
}

function fallbackTokens(content: string): { promptTokens: number; completionTokens: number } {
  return { promptTokens: 0, completionTokens: Math.max(1, Math.ceil(content.length / 4)) };
}

async function callDeepSeek(
  model: string,
  messages: ChatMessage[],
): Promise<{ content: string; promptTokens: number; completionTokens: number }> {
  const apiKey = parseDeepSeekApiKeys(env("DEEPSEEK_API_KEYS"))[0];
  if (!apiKey) throw new Error("DEEPSEEK_API_KEYS is not set");
  const chatUrl = resolveDeepSeekChatUrl(env("DEEPSEEK_BASE_URL"));
  const body: Record<string, unknown> = {
    model,
    temperature: 0.4,
    messages,
    response_format: { type: "json_object" },
  };
  if (isDeepSeekV4Model(model)) {
    body.thinking = { type: "disabled" };
  }
  const response = await fetch(chatUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`LLM HTTP ${response.status}${text ? `: ${text.slice(0, 200)}` : ""}`);
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

export async function generateDescriptionJson(
  uiLabel: string,
  messages: ChatMessage[],
): Promise<GeneratedDescriptionResult> {
  const model = resolveDescriptionModel(uiLabel);
  const raw = await callDeepSeek(model, messages);
  const parsed = parseGeneratedDescriptionJson(raw.content);
  if (!parsed) {
    throw new Error("LLM did not return JSON {title, description}");
  }
  return {
    ...parsed,
    promptTokens: raw.promptTokens,
    completionTokens: raw.completionTokens,
  };
}
