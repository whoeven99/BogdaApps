/**
 * Remix 应用侧 Tencent SES 发信。
 * 凭证缺失或 SDK 失败时返回 false，不抛错（webhook / 任务循环不因邮件失败中断）。
 */

import { ses } from "tencentcloud-sdk-nodejs-ses";
import { maskEmail } from "./emailFormat";
import { isSesFrequencyLimitError } from "./emailRecipientCooldown";
import {
  isEmailRecipientInCooldown,
  setEmailRecipientCooldown,
} from "./emailRecipientCooldown.server";

const LOG = "[tencentSes]";

const DEFAULT_CC = ["feynman@ciwi.ai", "yewen@ciwi.ai"] as const;

const FROM_EMAIL =
  process.env.TENCENT_FROM_EMAIL?.trim() || "support@msg.ciwi.ai";

type SesClientInstance = InstanceType<typeof ses.v20201002.Client>;

let _client: SesClientInstance | null = null;

function logDetail(phase: string, payload: Record<string, unknown>): void {
  console.info(`${LOG} ${phase} ${JSON.stringify(payload)}`);
}

function getSesClient(): SesClientInstance | null {
  if (_client) return _client;
  const secretId = process.env.TENCENT_CLOUD_KEY_ID?.trim();
  const secretKey = process.env.TENCENT_CLOUD_KEY?.trim();
  if (!secretId || !secretKey) {
    logDetail("ses-client-missing", {
      hasSecretId: Boolean(secretId),
      hasSecretKey: Boolean(secretKey),
    });
    console.warn(`${LOG} missing Tencent SES credentials`);
    return null;
  }
  const region = process.env.TENCENT_SES_REGION?.trim() || "ap-hongkong";
  _client = new ses.v20201002.Client({
    credential: { secretId, secretKey },
    region,
  });
  logDetail("ses-client-initialized", { region, from: maskEmail(FROM_EMAIL) });
  return _client;
}

export async function sendTencentTemplateEmail(params: {
  templateId: number;
  subject: string;
  templateData: Record<string, string>;
  to: string;
  cc?: string[];
}): Promise<boolean> {
  const to = params.to.trim();
  if (!to) {
    logDetail("send-skipped", {
      reason: "empty_recipient",
      templateId: params.templateId,
    });
    return false;
  }

  const client = getSesClient();
  if (!client) {
    logDetail("send-skipped", {
      reason: "tencent_ses_credentials_missing",
      templateId: params.templateId,
      to: maskEmail(to),
    });
    return false;
  }

  if (await isEmailRecipientInCooldown(to)) {
    logDetail("send-skipped", {
      reason: "ses_frequency_cooldown",
      templateId: params.templateId,
      to: maskEmail(to),
    });
    return false;
  }

  const cc = params.cc ?? [...DEFAULT_CC];
  const templateDataJson = JSON.stringify(params.templateData);
  logDetail("before-sdk-call", {
    templateId: params.templateId,
    subject: params.subject,
    subjectLen: params.subject.length,
    to: maskEmail(to),
    cc: cc.map(maskEmail),
    from: maskEmail(FROM_EMAIL),
    templateDataKeyCount: Object.keys(params.templateData).length,
    templateDataKeys: Object.keys(params.templateData),
    templateDataLen: templateDataJson.length,
  });

  const startedAt = Date.now();
  try {
    const resp = await client.SendEmail({
      FromEmailAddress: FROM_EMAIL,
      Destination: [to],
      Cc: cc,
      Subject: params.subject,
      Template: {
        TemplateID: params.templateId,
        TemplateData: templateDataJson,
      },
    });
    const requestId =
      typeof resp === "object" && resp !== null && "RequestId" in resp
        ? String((resp as { RequestId?: string }).RequestId ?? "").trim()
        : "";
    const messageId =
      typeof resp === "object" &&
      resp !== null &&
      "MessageId" in resp &&
      typeof (resp as { MessageId?: string }).MessageId === "string"
        ? (resp as { MessageId: string }).MessageId
        : undefined;
    const ok = Boolean(requestId);
    logDetail("after-sdk-call", {
      sendSuccess: ok,
      templateId: params.templateId,
      to: maskEmail(to),
      requestId: requestId || null,
      messageId: messageId ?? null,
      elapsedMs: Date.now() - startedAt,
      responseKeys:
        typeof resp === "object" && resp !== null ? Object.keys(resp as object) : [],
    });
    if (!ok) {
      console.warn(
        `${LOG} send missing RequestId templateId=${params.templateId} to=${maskEmail(to)}`,
      );
    }
    return ok;
  } catch (e) {
    const tencentError =
      typeof e === "object" && e !== null
        ? {
            code: "code" in e ? String((e as { code?: unknown }).code) : undefined,
            requestId:
              "requestId" in e ? String((e as { requestId?: unknown }).requestId) : undefined,
          }
        : undefined;
    const frequencyLimited = isSesFrequencyLimitError(e);
    logDetail("after-sdk-call-failed", {
      sendSuccess: false,
      templateId: params.templateId,
      to: maskEmail(to),
      elapsedMs: Date.now() - startedAt,
      tencentError,
      frequencyLimited,
      errorMessage: e instanceof Error ? e.message : String(e),
    });
    if (frequencyLimited) {
      await setEmailRecipientCooldown(to);
    }
    console.error(
      `${LOG} send failed templateId=${params.templateId} to=${maskEmail(to)}`,
      e instanceof Error ? e.message : e,
    );
    return false;
  }
}

/** 仅测试用 */
export function resetTencentSesClientForTests(): void {
  _client = null;
}
