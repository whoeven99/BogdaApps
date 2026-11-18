import assert from "node:assert/strict";
import test from "node:test";
import { decideChargeGrant } from "./lib/billingChargeGuard.mjs";

const basicMonthly = {
  env: "prod",
  allowlisted: false,
  test: false,
  amountCents: 999,
  currencyCode: "USD",
  allowedCents: [999, 9588],
};

test("放行店 test 单 grant staff_allowlist", () => {
  const d = decideChargeGrant({ ...basicMonthly, allowlisted: true, test: true });
  assert.equal(d.action, "grant");
  assert.equal(d.reason, "staff_allowlist");
});

test("非放行 test 单 deny", () => {
  const d = decideChargeGrant({ ...basicMonthly, test: true });
  assert.equal(d.action, "deny");
  assert.equal(d.reason, "test_charge");
});

test("金额不对 deny；缺字段 grant fields_missing", () => {
  assert.equal(
    decideChargeGrant({ ...basicMonthly, amountCents: 1 }).reason,
    "amount_mismatch",
  );
  assert.equal(
    decideChargeGrant({ ...basicMonthly, amountCents: null, test: null }).reason,
    "fields_missing",
  );
});
