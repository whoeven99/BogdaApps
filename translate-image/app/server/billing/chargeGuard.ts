export type BillingGuardEnv = "test" | "prod";

export type ChargeGuardReason =
  | "ok"
  | "staff_allowlist"
  | "fields_missing"
  | "test_charge"
  | "amount_mismatch";

export type ChargeGuardDecision = {
  action: "grant" | "deny";
  reason: ChargeGuardReason;
};

export type ChargeGuardInput = {
  env: BillingGuardEnv;
  allowlisted: boolean;
  test: boolean | null;
  amountCents: number | null;
  currencyCode?: string | null;
  allowedCents?: number[] | null;
};

export function dollarsToCents(amount: number | string): number | null {
  const n = typeof amount === "number" ? amount : Number.parseFloat(amount);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

export function decideChargeGrant(input: ChargeGuardInput): ChargeGuardDecision {
  if (input.env === "prod" && input.allowlisted) {
    return { action: "grant", reason: "staff_allowlist" };
  }
  if (input.env === "prod" && input.test === true) {
    return { action: "deny", reason: "test_charge" };
  }
  if (input.amountCents == null || input.test == null) {
    return { action: "grant", reason: "fields_missing" };
  }
  if (input.currencyCode && input.currencyCode !== "USD") {
    return { action: "deny", reason: "amount_mismatch" };
  }
  if (!input.allowedCents?.includes(input.amountCents)) {
    return { action: "deny", reason: "amount_mismatch" };
  }
  return { action: "grant", reason: "ok" };
}
