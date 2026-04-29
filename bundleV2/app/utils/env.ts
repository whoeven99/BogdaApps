export function sanitizeEnvLikeValue(
  raw: string | null | undefined,
): string {
  let value = String(raw ?? "").trim();

  while (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    const hasMatchingWrapper =
      (first === '"' && last === '"') ||
      (first === "'" && last === "'") ||
      (first === "`" && last === "`");

    if (!hasMatchingWrapper) break;
    value = value.slice(1, -1).trim();
  }

  return value;
}

export function sanitizeUrlLikeEnvValue(
  raw: string | null | undefined,
): string {
  return sanitizeEnvLikeValue(raw).replace(/\/+$/, "");
}
