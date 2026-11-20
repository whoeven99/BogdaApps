export const DEFAULT_DESCRIPTION_AI_MODEL = "deepseek-v4-flash";

export const DESCRIPTION_AI_MODEL_OPTIONS = [
  { label: "DeepSeek V4 Flash", value: "deepseek-v4-flash" },
  { label: "DeepSeek V4 Pro", value: "deepseek-v4-pro" },
];

const KNOWN_DEEPSEEK_MODELS = new Set([
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "deepseek-chat",
  "deepseek-reasoner",
]);

const LEGACY_UI_MODELS: Record<string, string> = {
  chatgpt: DEFAULT_DESCRIPTION_AI_MODEL,
  "chatgpt 4.1": DEFAULT_DESCRIPTION_AI_MODEL,
  "gpt-4.1 mini": DEFAULT_DESCRIPTION_AI_MODEL,
  "gpt-4o-mini": DEFAULT_DESCRIPTION_AI_MODEL,
  "deepseek r3": DEFAULT_DESCRIPTION_AI_MODEL,
};

export function isDeepSeekV4Model(model: string): boolean {
  const id = model.trim().toLowerCase();
  return id === "deepseek-v4-flash" || id === "deepseek-v4-pro";
}

export function parseDeepSeekApiKeys(raw?: string): string[] {
  return String(raw || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
}

export function resolveDeepSeekChatUrl(baseUrl?: string): string {
  const base =
    String(baseUrl || "https://api.deepseek.com").trim().replace(/\/+$/, "") ||
    "https://api.deepseek.com";
  if (base.endsWith("/chat/completions")) return base;
  return `${base}/chat/completions`;
}

export function resolveDescriptionAiModel(
  preferred?: string,
  envModel?: string,
): string {
  const requested = (preferred ?? "").trim();
  const requestedId = requested.toLowerCase();
  if (KNOWN_DEEPSEEK_MODELS.has(requestedId)) return requestedId;
  const mapped = LEGACY_UI_MODELS[requestedId];
  if (mapped) return mapped;
  const configured = (envModel ?? "").trim().toLowerCase();
  if (KNOWN_DEEPSEEK_MODELS.has(configured)) return configured;
  return DEFAULT_DESCRIPTION_AI_MODEL;
}
