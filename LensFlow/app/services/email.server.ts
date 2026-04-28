import nodemailer from "nodemailer";

import { createNotificationLog } from "../models/notification-logs.server";

export type EmailSendResult = {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
};

export function getEmailProviderConfig() {
  return {
    provider: "tencent-cloud-smtp",
    host: process.env.TENCENT_SES_SMTP_HOST || "sg-smtp.qcloudmail.com",
    port: Number(process.env.TENCENT_SES_SMTP_PORT || "465"),
    secure: String(process.env.TENCENT_SES_SMTP_SECURE || "true") !== "false",
    user: process.env.TENCENT_SES_SMTP_USER || "",
    pass: process.env.TENCENT_SES_SMTP_PASS || "",
    from: process.env.TENCENT_SES_FROM_EMAIL || "",
    merchantTo: process.env.MERCHANT_ALERT_EMAIL || "",
    enabled: Boolean(
      process.env.TENCENT_SES_SMTP_USER &&
        process.env.TENCENT_SES_SMTP_PASS &&
        process.env.TENCENT_SES_FROM_EMAIL,
    ),
  };
}

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  category: string;
  payload?: Record<string, unknown>;
}) {
  const config = getEmailProviderConfig();

  if (!config.enabled) {
    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input.category,
      recipient: input.to,
      subject: input.subject,
      status: "skipped",
      error: "腾讯云 SMTP 未配置完成",
      payload: input.payload,
    });

    return {
      ok: false,
      skipped: true,
      error: "腾讯云 SMTP 未配置完成",
    } satisfies EmailSendResult;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
    });

    const info = await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });

    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input.category,
      recipient: input.to,
      subject: input.subject,
      status: "sent",
      payload: {
        ...input.payload,
        messageId: info.messageId,
      },
    });

    return {
      ok: true,
      messageId: info.messageId,
    } satisfies EmailSendResult;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "邮件发送失败";

    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input.category,
      recipient: input.to,
      subject: input.subject,
      status: "failed",
      error: message,
      payload: input.payload,
    });

    return {
      ok: false,
      error: message,
    } satisfies EmailSendResult;
  }
}

export async function sendMerchantAlertEmail(input: {
  subject: string;
  html: string;
  text: string;
  category: string;
  payload?: Record<string, unknown>;
}) {
  const config = getEmailProviderConfig();
  if (!config.merchantTo) {
    await createNotificationLog({
      channel: "email",
      provider: config.provider,
      category: input.category,
      recipient: "MERCHANT_ALERT_EMAIL",
      subject: input.subject,
      status: "skipped",
      error: "未配置商家提醒邮箱",
      payload: input.payload,
    });

    return {
      ok: false,
      skipped: true,
      error: "未配置商家提醒邮箱",
    } satisfies EmailSendResult;
  }

  return sendEmail({
    to: config.merchantTo,
    subject: input.subject,
    html: input.html,
    text: input.text,
    category: input.category,
    payload: input.payload,
  });
}

export async function sendTestEmail(to: string) {
  return sendEmail({
    to,
    subject: "Shopify 眼镜应用邮件通道测试",
    text: "这是一封测试邮件，用于验证腾讯云 SMTP 配置是否可用。",
    html: "<p>这是一封测试邮件，用于验证腾讯云 SMTP 配置是否可用。</p>",
    category: "test_email",
    payload: {
      kind: "manual_test",
    },
  });
}
