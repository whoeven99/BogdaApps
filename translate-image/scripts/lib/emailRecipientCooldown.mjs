export function emailFreqCooldownKey(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized || !normalized.includes("@")) return null;
  return `img:email:freq-cooldown:${normalized}`;
}

function errorHaystack(error) {
  const message =
    error instanceof Error ? `${error.name} ${error.message}` : String(error ?? "");
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String(error.code ?? "")
      : "";
  return `${code} ${message}`;
}

export function isSesFrequencyLimitError(error) {
  const haystack = errorHaystack(error);
  return /触发频率控制/.test(haystack) || /FrequencyLimit/i.test(haystack);
}
