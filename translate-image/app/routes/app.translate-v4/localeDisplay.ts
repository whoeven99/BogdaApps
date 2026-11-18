export function stripTrailingLocaleCode(label: string): string {
  return String(label ?? "").replace(/\s*\([a-z]{2}(?:[-_][A-Za-z0-9]+)*\)\s*$/i, "").trim() || label;
}
