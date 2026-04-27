import type { LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";

import { listPurchaseRecords } from "../models/purchase-records.server";
import { authenticate } from "../shopify.server";
import {
  listSubscriptionContracts,
  summarizeSubscriptionContracts,
  type SubscriptionContractStatus,
  type SubscriptionContractView,
} from "../services/subscription-contracts.server";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function getStatusTone(status: string) {
  if (status === "FAILED" || status === "CANCELLED" || status === "EXPIRED") {
    return "critical";
  }

  if (status === "PAUSED") {
    return "warning";
  }

  return "success";
}

function findRelatedPurchaseNotes(
  contract: SubscriptionContractView,
  localRecords: Awaited<ReturnType<typeof listPurchaseRecords>>,
) {
  return localRecords.filter((record) =>
    contract.lines.some((line) => line.productId && line.productId === record.shopifyProductId),
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "ALL") as SubscriptionContractStatus;

  const contracts = await listSubscriptionContracts(admin, {
    status,
    limit: 20,
  });
  const localSubscriptionRecords = await listPurchaseRecords({
    purchaseMode: "subscription",
    limit: 100,
  });

  return {
    status,
    contracts,
    summary: summarizeSubscriptionContracts(contracts),
    localSubscriptionRecords,
  };
};

export default function SubscriptionContractsPage() {
  const { status, contracts, summary, localSubscriptionRecords } =
    useLoaderData<typeof loader>();

  return (
    <s-page heading="订阅合同">
      <s-section heading="筛选条件">
        <Form method="get">
          <s-stack direction="inline" gap="base" align-items="end">
            <s-select name="status" label="合同状态" value={status}>
              <s-option value="ALL">全部</s-option>
              <s-option value="ACTIVE">ACTIVE</s-option>
              <s-option value="PAUSED">PAUSED</s-option>
              <s-option value="FAILED">FAILED</s-option>
              <s-option value="CANCELLED">CANCELLED</s-option>
              <s-option value="EXPIRED">EXPIRED</s-option>
            </s-select>
            <s-button type="submit" variant="primary">
              应用筛选
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="概览">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>合同总数</s-heading>
            <s-paragraph>{summary.total}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>ACTIVE</s-heading>
            <s-paragraph>{summary.ACTIVE}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>PAUSED</s-heading>
            <s-paragraph>{summary.PAUSED}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>FAILED</s-heading>
            <s-paragraph>{summary.FAILED}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>账单尝试</s-heading>
            <s-paragraph>{summary.billingAttemptCount}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>失败账单</s-heading>
            <s-paragraph>{summary.failedBillingAttemptCount}</s-paragraph>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="合同列表">
        {contracts.length === 0 ? (
          <s-paragraph>
            当前没有读取到订阅合同。请确认应用 scope 已包含 `read_own_subscription_contracts`
            或 `write_own_subscription_contracts`，且店铺内已有订阅订单转成合同。
          </s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {contracts.map((contract) => {
              const relatedRecords = findRelatedPurchaseNotes(
                contract,
                localSubscriptionRecords,
              );

              return (
                <s-box key={contract.id} padding="base" border="base" border-radius="base">
                  <s-stack direction="block" gap="base">
                    <s-heading>{contract.id}</s-heading>
                    <s-paragraph>
                      状态：
                      <s-badge tone={getStatusTone(contract.status)}>
                        {contract.status}
                      </s-badge>
                    </s-paragraph>
                    <s-paragraph>
                      客户：
                      <s-text>
                        {contract.customer?.displayName ?? contract.customer?.id ?? "未返回"}
                      </s-text>
                    </s-paragraph>
                    <s-paragraph>
                      创建时间：<s-text>{formatDateTime(contract.createdAt)}</s-text>
                    </s-paragraph>
                    <s-paragraph>
                      更新时间：<s-text>{formatDateTime(contract.updatedAt)}</s-text>
                    </s-paragraph>
                    <s-box padding="base" background="subdued" border-radius="base">
                      <s-heading>合同商品</s-heading>
                      <s-unordered-list>
                        {contract.lines.map((line) => (
                          <s-list-item key={line.id}>
                            {line.title} x {line.quantity}
                            {line.productId ? ` / ${line.productId}` : ""}
                          </s-list-item>
                        ))}
                      </s-unordered-list>
                    </s-box>
                    <s-box padding="base" background="subdued" border-radius="base">
                      <s-heading>账单尝试</s-heading>
                      {contract.billingAttempts.length === 0 ? (
                        <s-paragraph>当前合同还没有账单尝试记录。</s-paragraph>
                      ) : (
                        <s-unordered-list>
                          {contract.billingAttempts.map((attempt) => (
                            <s-list-item key={attempt.id}>
                              {attempt.id}
                              {attempt.orderId ? ` / 订单 ${attempt.orderId}` : ""}
                              {attempt.errorCode || attempt.errorMessage
                                ? ` / 失败：${attempt.errorCode ?? ""} ${attempt.errorMessage ?? ""}`
                                : attempt.ready
                                  ? " / 已就绪"
                                  : " / 处理中"}
                            </s-list-item>
                          ))}
                        </s-unordered-list>
                      )}
                    </s-box>
                    <s-box padding="base" background="subdued" border-radius="base">
                      <s-heading>本地订阅线索</s-heading>
                      {relatedRecords.length === 0 ? (
                        <s-paragraph>当前没有匹配到本地下单记录。</s-paragraph>
                      ) : (
                        <s-unordered-list>
                          {relatedRecords.slice(0, 5).map((record) => (
                            <s-list-item key={record.id}>
                              {record.createdAt} / {record.subscriptionPlanName ?? "未记录方案"} /{" "}
                              {record.variantTitle ?? record.shopifyVariantId}
                            </s-list-item>
                          ))}
                        </s-unordered-list>
                      )}
                    </s-box>
                  </s-stack>
                </s-box>
              );
            })}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
