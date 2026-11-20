export function emailFreqCooldownKey(email: string): string | null {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  return `img:email:freq-cooldown:${normalized}`;
}

function errorHaystack(error: unknown): string {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return `${code} ${message}`;
}

/** 腾讯 SES：短时间对同一地址发送过多。 */
export function isSesFrequencyLimitError(error: unknown): boolean {
  const haystack = errorHaystack(error);
  return /触发频率控制/.test(haystack) || /FrequencyLimit/i.test(haystack);
}

export function emailInvalidTemplateCooldownKey(templateId: number): string | null {
  if (!Number.isInteger(templateId) || templateId <= 0) return null;
  return `img:email:invalid-template:${templateId}`;
}

export function isSesInvalidTemplateError(error: unknown): boolean {
  const haystack = errorHaystack(error);
  return /InvalidTemplateID/i.test(haystack) || /模板ID无效/.test(haystack);
}
