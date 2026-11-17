export type CurrencyRateRow = {
  currencyCode?: unknown;
  rate?: unknown;
  expiresAt?: unknown;
};

function expiresAtMs(value: unknown): number | null {
  if (value == null) return null;
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1_000_000_000_000 ? value * 1000 : value;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

/** TSF `CurrencyRate` rows → 旧 Redis hash 形状（币种码 → 数字字符串）。 */
export function rowsToRateMap(
  rows: readonly CurrencyRateRow[],
  nowMs: number = Date.now(),
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const row of rows) {
    const code = String(row.currencyCode ?? "")
      .trim()
      .toUpperCase();
    const rate = Number(row.rate);
    if (!code || !Number.isFinite(rate)) continue;
    const expires = expiresAtMs(row.expiresAt);
    if (expires != null && expires <= nowMs) continue;
    out[code] = String(rate);
  }
  return out;
}
