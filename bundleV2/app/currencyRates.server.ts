import { createClient, type Client } from "@libsql/client";

import { ensureRuntimeEnv } from "./config/runtimeEnv.server";
import { rowsToRateMap } from "./utils/currencyRateMap";

ensureRuntimeEnv();

type RateMap = Record<string, string>;

let bogdaRateCache: RateMap | null = null;
let ratesClient: Client | null | undefined;

const globalForTsfRates = globalThis as typeof globalThis & {
  __tsfTursoRates?: Client;
};

function tsfTursoConfig(): { url: string; authToken: string } | null {
  const url = process.env.TSF_TURSO_DATABASE_URL?.trim() || "";
  const authToken = process.env.TSF_TURSO_AUTH_TOKEN?.trim() || "";
  if (!url.startsWith("libsql://") || !authToken) return null;
  return { url, authToken };
}

function getTsfRatesClient(): Client | null {
  if (ratesClient !== undefined) return ratesClient;
  const cfg = tsfTursoConfig();
  if (!cfg) {
    ratesClient = null;
    return null;
  }
  const isProd =
    process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "test";
  if (!isProd && globalForTsfRates.__tsfTursoRates) {
    ratesClient = globalForTsfRates.__tsfTursoRates;
    return ratesClient;
  }
  const created = createClient({ url: cfg.url, authToken: cfg.authToken });
  if (!isProd) globalForTsfRates.__tsfTursoRates = created;
  ratesClient = created;
  return ratesClient;
}

async function updateBogdaRate() {
  const db = getTsfRatesClient();
  if (!db) {
    console.info("[rates] TSF_TURSO_* missing; skip CurrencyRate load");
    return;
  }

  try {
    const result = await db.execute(
      "SELECT currencyCode, rate, expiresAt FROM CurrencyRate",
    );
    const map = rowsToRateMap(
      result.rows.map((row) => ({
        currencyCode: row.currencyCode,
        rate: row.rate,
        expiresAt: row.expiresAt,
      })),
    );
    if (Object.keys(map).length > 0) {
      bogdaRateCache = map;
      console.info(
        `[rates] CurrencyRate cache updated (${Object.keys(map).length} currencies)`,
      );
      return;
    }
    console.info("[rates] CurrencyRate empty or expired; cache not updated");
  } catch (error) {
    console.error("[rates] Failed to load CurrencyRate:", error);
  }
}

function scheduleDailyUpdate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 5, 0, 0);
  const delayMs = tomorrow.getTime() - now.getTime();

  console.info(
    `[rates] Next CurrencyRate refresh in ${(delayMs / (1000 * 60 * 60)).toFixed(1)} hours`,
  );

  setTimeout(() => {
    void updateBogdaRate();
    setInterval(() => {
      void updateBogdaRate();
    }, 24 * 60 * 60 * 1000);
  }, delayMs);
}

void updateBogdaRate();
scheduleDailyUpdate();

export function getBogdaRate() {
  return bogdaRateCache;
}
