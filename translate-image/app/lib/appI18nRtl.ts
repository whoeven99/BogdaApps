export function formatAppI18nNumber(value: number, locale?: string): string {
  try {
    return new Intl.NumberFormat(locale || "en-US", { maximumFractionDigits: 0 }).format(value);
  } catch {
    return String(value);
  }
}
