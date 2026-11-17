import { describe, expect, it } from "vitest";

import { rowsToRateMap } from "./currencyRateMap";

const now = Date.parse("2026-11-17T00:00:00.000Z");

describe("rowsToRateMap", () => {
  it("maps unexpired codes to string rates", () => {
    const map = rowsToRateMap(
      [
        { currencyCode: "eur", rate: 1, expiresAt: "2026-11-19T00:00:00.000Z" },
        { currencyCode: "USD", rate: 1.08, expiresAt: "2026-11-19T00:00:00.000Z" },
      ],
      now,
    );
    expect(map).toEqual({ EUR: "1", USD: "1.08" });
  });

  it("skips expired and invalid rows", () => {
    const map = rowsToRateMap(
      [
        { currencyCode: "USD", rate: 1.1, expiresAt: "2026-11-16T00:00:00.000Z" },
        { currencyCode: "JPY", rate: "not-a-number", expiresAt: "2026-11-19T00:00:00.000Z" },
        { currencyCode: "  ", rate: 1, expiresAt: "2026-11-19T00:00:00.000Z" },
        { currencyCode: "CNY", rate: 7.8, expiresAt: "2026-11-19T00:00:00.000Z" },
      ],
      now,
    );
    expect(map).toEqual({ CNY: "7.8" });
  });
});
