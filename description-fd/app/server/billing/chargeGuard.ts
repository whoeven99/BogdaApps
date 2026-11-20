import { isBillingTestMode, type BillingEnvLike } from "./testBillingShop";

export type BillingGuardEnv = "test" | "prod";

export type ChargeGuardReason =
  | "ok"
  | "staff_allowlist"
  | "fields_missing"
  | "test_charge";

export type ChargeGuardDecision = {
  action: "grant" | "deny";
  reason: ChargeGuardReason;
};

export type ChargeGuardInput = {
  env: BillingGuardEnv;
  allowlisted: boolean;
  test: boolean | null;
};

export function billingGuardEnv(env: BillingEnvLike = process.env): BillingGuardEnv {
  if (isBillingTestMode(env)) return "test";
  const nodeEnv = String(env?.NODE_ENV || "").toLowerCase();
  if (nodeEnv === "prod" || nodeEnv === "production") return "prod";
  return "test";
}

export function decideChargeGrant(input: ChargeGuardInput): ChargeGuardDecision {
  if (input.env === "prod" && input.allowlisted) {
    return { action: "grant", reason: "staff_allowlist" };
  }
  if (input.env === "prod" && input.test === true) {
    return { action: "deny", reason: "test_charge" };
  }
  if (input.test == null) {
    return { action: "grant", reason: "fields_missing" };
  }
  return { action: "grant", reason: "ok" };
}
