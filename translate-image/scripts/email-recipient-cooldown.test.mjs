import assert from "node:assert/strict";
import test from "node:test";
import {
  emailFreqCooldownKey,
  isSesFrequencyLimitError,
} from "./lib/emailRecipientCooldown.mjs";

test("isSesFrequencyLimitError matches Tencent same-recipient message", () => {
  const error = new Error(
    "操作失败。 触发频率控制，短时间内对同一地址发送过多邮件。",
  );
  error.name = "TencentCloudSDKHttpException";
  assert.equal(isSesFrequencyLimitError(error), true);
});

test("isSesFrequencyLimitError matches FrequencyLimit SDK codes", () => {
  assert.equal(
    isSesFrequencyLimitError({
      code: "FailedOperation.FrequencyLimitExceeded",
      message: "request was rejected",
    }),
    true,
  );
});

test("isSesFrequencyLimitError ignores unrelated SES failures", () => {
  assert.equal(isSesFrequencyLimitError(new Error("InvalidEmailAddress")), false);
  assert.equal(isSesFrequencyLimitError(null), false);
  assert.equal(isSesFrequencyLimitError({ code: "AuthFailure" }), false);
});

test("emailFreqCooldownKey normalizes recipient", () => {
  assert.equal(
    emailFreqCooldownKey("  GW@Outlook.com "),
    "img:email:freq-cooldown:gw@outlook.com",
  );
});

test("emailFreqCooldownKey rejects invalid addresses", () => {
  assert.equal(emailFreqCooldownKey(""), null);
  assert.equal(emailFreqCooldownKey("   "), null);
  assert.equal(emailFreqCooldownKey("not-an-email"), null);
});
