import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { Form, useActionData, useLoaderData } from "react-router";

import {
  listNotificationLogs,
  type NotificationLogStatus,
} from "../models/notification-logs.server";
import { authenticate } from "../shopify.server";
import {
  getEmailProviderConfig,
  sendTestEmail,
} from "../services/email.server";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function getStatusTone(status: NotificationLogStatus) {
  if (status === "failed") {
    return "critical";
  }

  if (status === "skipped") {
    return "warning";
  }

  return "success";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "all") as
    | NotificationLogStatus
    | "all";

  return {
    status,
    emailConfig: getEmailProviderConfig(),
    logs: await listNotificationLogs({
      status,
      limit: 50,
    }),
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "send_test");

  if (intent === "send_test") {
    const to = String(formData.get("to") ?? "").trim();
    if (!to) {
      return { ok: false, error: "请输入测试收件邮箱" };
    }

    const result = await sendTestEmail(to);
    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? "测试邮件发送失败",
      };
    }

    return {
      ok: true,
      message: `测试邮件已发送，messageId: ${result.messageId ?? "unknown"}`,
    };
  }

  return { ok: false, error: "不支持的操作" };
};

export default function NotificationsPage() {
  const { status, emailConfig, logs } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <s-page heading="提醒中心">
      <s-section heading="邮件通道配置">
        {actionData?.ok && (
          <s-banner tone="success" heading="发送成功">
            {actionData.message}
          </s-banner>
        )}
        {actionData?.error && (
          <s-banner tone="critical" heading="发送失败">
            {actionData.error}
          </s-banner>
        )}
        <s-paragraph>
          通道：
          <s-badge tone={emailConfig.enabled ? "success" : "warning"}>
            {emailConfig.provider}
          </s-badge>
        </s-paragraph>
        <s-paragraph>
          SMTP Host：<s-text>{emailConfig.host}</s-text>
        </s-paragraph>
        <s-paragraph>
          发信地址：<s-text>{emailConfig.from || "未配置"}</s-text>
        </s-paragraph>
        <s-paragraph>
          商家提醒邮箱：<s-text>{emailConfig.merchantTo || "未配置"}</s-text>
        </s-paragraph>
        <Form method="post">
          <s-stack direction="inline" gap="base" align-items="end">
            <input type="hidden" name="intent" value="send_test" />
            <s-text-field name="to" label="测试收件邮箱" value="" />
            <s-button type="submit" variant="primary">
              发送测试邮件
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="发送日志">
        <Form method="get">
          <s-stack direction="inline" gap="base" align-items="end">
            <s-select name="status" label="日志状态" value={status}>
              <s-option value="all">全部</s-option>
              <s-option value="sent">sent</s-option>
              <s-option value="failed">failed</s-option>
              <s-option value="skipped">skipped</s-option>
            </s-select>
            <s-button type="submit" variant="secondary">
              筛选
            </s-button>
          </s-stack>
        </Form>
        {logs.length === 0 ? (
          <s-paragraph>当前还没有提醒日志。</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {logs.map((log) => (
              <s-box key={log.id} padding="base" border="base" border-radius="base">
                <s-paragraph>
                  状态：
                  <s-badge tone={getStatusTone(log.status)}>{log.status}</s-badge>
                </s-paragraph>
                <s-paragraph>
                  分类：<s-text>{log.category}</s-text>
                </s-paragraph>
                <s-paragraph>
                  收件人：<s-text>{log.recipient}</s-text>
                </s-paragraph>
                <s-paragraph>
                  标题：<s-text>{log.subject}</s-text>
                </s-paragraph>
                <s-paragraph>
                  时间：<s-text>{formatDateTime(log.createdAt)}</s-text>
                </s-paragraph>
                {log.error && (
                  <s-paragraph>
                    错误：<s-text>{log.error}</s-text>
                  </s-paragraph>
                )}
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
