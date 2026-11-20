import assert from "node:assert/strict";
import test from "node:test";
import {
  emailFreqCooldownKey,
  emailInvalidTemplateCooldownKey,
  isSesFrequencyLimitError,
  isSesInvalidTemplateError,
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

test("isSesInvalidTemplateError matches Tencent InvalidTemplateID", () => {
  const error = new Error("模板ID无效或不存在");
  error.name = "TencentCloudSDKHttpException";
  error.code = "FailedOperation.InvalidTemplateID";
  assert.equal(isSesInvalidTemplateError(error), true);
  assert.equal(
    isSesInvalidTemplateError({
      code: "FailedOperation.InvalidTemplateID",
      message: "template not found",
    }),
    true,
  );
});

test("isSesInvalidTemplateError ignores frequency and other SES errors", () => {
  assert.equal(isSesInvalidTemplateError({ code: "FailedOperation.FrequencyLimitExceeded" }), false);
  assert.equal(isSesInvalidTemplateError(new Error("InvalidEmailAddress")), false);
  assert.equal(isSesInvalidTemplateError(null), false);
});

test("emailInvalidTemplateCooldownKey is per template id", () => {
  assert.equal(emailInvalidTemplateCooldownKey(236766), "img:email:invalid-template:236766");
  assert.equal(emailInvalidTemplateCooldownKey(0), null);
  assert.equal(emailInvalidTemplateCooldownKey(-1), null);
  assert.equal(emailInvalidTemplateCooldownKey(1.5), null);
});
