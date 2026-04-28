import type { LoaderFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";

import {
  listPurchaseRecords,
  summarizePurchaseRecords,
  type PurchaseMode,
  type PurchaseRecordStatus,
} from "../models/purchase-records.server";
import { authenticate } from "../shopify.server";
import {
  fetchShopifyProducts,
  type ShopifyProductNode,
} from "../services/shopify-products.server";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function formatParameterValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function getStatusTone(status: PurchaseRecordStatus) {
  if (status === "cart_add_failed") {
    return "critical";
  }

  if (status === "checkout_started") {
    return "success";
  }

  return "info";
}

function getStatusLabel(status: PurchaseRecordStatus) {
  if (status === "cart_add_failed") {
    return "加入购物车失败";
  }

  if (status === "checkout_started") {
    return "已跳转结账";
  }

  return "已加入购物车";
}

function getPurchaseModeLabel(mode: PurchaseMode) {
  return mode === "subscription" ? "订阅购买" : "一次性购买";
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const products = await fetchShopifyProducts(admin);
  const url = new URL(request.url);
  const selectedProductId = url.searchParams.get("productId") ?? "all";
  const purchaseMode = (url.searchParams.get("purchaseMode") ?? "all") as
    | PurchaseMode
    | "all";
  const status = (url.searchParams.get("status") ?? "all") as
    | PurchaseRecordStatus
    | "all";

  const records = await listPurchaseRecords({
    shopifyProductId: selectedProductId === "all" ? undefined : selectedProductId,
    purchaseMode,
    status,
  });

  return {
    products,
    selectedProductId,
    purchaseMode,
    status,
    records,
    summary: summarizePurchaseRecords(records),
  };
};

export default function OrdersPage() {
  const {
    products,
    selectedProductId,
    purchaseMode,
    status,
    records,
    summary,
  } = useLoaderData<typeof loader>();

  return (
    <s-page heading="下单记录">
      <s-section heading="筛选条件">
        <Form method="get">
          <s-stack direction="inline" gap="base" align-items="end">
            <s-select name="productId" label="商品" value={selectedProductId}>
              <s-option value="all">全部商品</s-option>
              {products.map((product: ShopifyProductNode) => (
                <s-option key={product.id} value={product.id}>
                  {product.title}
                </s-option>
              ))}
            </s-select>
            <s-select name="purchaseMode" label="购买方式" value={purchaseMode}>
              <s-option value="all">全部方式</s-option>
              <s-option value="one_time">一次性购买</s-option>
              <s-option value="subscription">订阅购买</s-option>
            </s-select>
            <s-select name="status" label="状态" value={status}>
              <s-option value="all">全部状态</s-option>
              <s-option value="cart_added">已加入购物车</s-option>
              <s-option value="checkout_started">已跳转结账</s-option>
              <s-option value="cart_add_failed">加入购物车失败</s-option>
            </s-select>
            <s-button type="submit" variant="primary">
              应用筛选
            </s-button>
          </s-stack>
        </Form>
      </s-section>

      <s-section heading="统计概览">
        <s-stack direction="inline" gap="base">
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>总记录</s-heading>
            <s-paragraph>{summary.total}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>一次性购买</s-heading>
            <s-paragraph>{summary.oneTimeCount}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>订阅购买</s-heading>
            <s-paragraph>{summary.subscriptionCount}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>加购成功</s-heading>
            <s-paragraph>{summary.cartAddedCount}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>已跳转结账</s-heading>
            <s-paragraph>{summary.checkoutStartedCount}</s-paragraph>
          </s-box>
          <s-box padding="base" border="base" border-radius="base">
            <s-heading>失败</s-heading>
            <s-paragraph>{summary.failedCount}</s-paragraph>
          </s-box>
        </s-stack>
      </s-section>

      <s-section heading="最近记录">
        {records.length === 0 ? (
          <s-paragraph>当前还没有记录。消费者通过主题插件加入购物车或结账后会出现在这里。</s-paragraph>
        ) : (
          <s-stack direction="block" gap="base">
            {records.map((record) => (
              <s-box key={record.id} padding="base" border="base" border-radius="base">
                <s-stack direction="block" gap="base">
                  <s-heading>{record.productTitle ?? record.shopifyProductId}</s-heading>
                  <s-paragraph>
                    状态：
                    <s-badge tone={getStatusTone(record.status)}>
                      {getStatusLabel(record.status)}
                    </s-badge>
                  </s-paragraph>
                  <s-paragraph>
                    购买方式：
                    <s-badge tone={record.purchaseMode === "subscription" ? "warning" : "info"}>
                      {getPurchaseModeLabel(record.purchaseMode)}
                    </s-badge>
                  </s-paragraph>
                  <s-paragraph>
                    时间：<s-text>{formatDateTime(record.createdAt)}</s-text>
                  </s-paragraph>
                  <s-paragraph>
                    变体：<s-text>{record.variantTitle ?? record.shopifyVariantId}</s-text>
                  </s-paragraph>
                  <s-paragraph>
                    参数模板：<s-text>{record.parameterTemplateName ?? "未记录"}</s-text>
                  </s-paragraph>
                  <s-paragraph>
                    参数签名：<s-text>{record.signature ?? "未记录"}</s-text>
                  </s-paragraph>
                  {typeof record.priceAdjustment === "number" && (
                    <s-paragraph>
                      价格附加：<s-text>{record.priceAdjustment}</s-text>
                    </s-paragraph>
                  )}
                  {record.subscriptionPlanName && (
                    <s-paragraph>
                      订阅方案：<s-text>{record.subscriptionPlanName}</s-text>
                    </s-paragraph>
                  )}
                  {record.sellingPlanId && (
                    <s-paragraph>
                      Selling Plan：<s-text>{record.sellingPlanId}</s-text>
                    </s-paragraph>
                  )}
                  {record.notes && (
                    <s-paragraph>
                      备注：<s-text>{record.notes}</s-text>
                    </s-paragraph>
                  )}
                  <s-box padding="base" background="subdued" border-radius="base">
                    <s-heading>参数快照</s-heading>
                    <s-unordered-list>
                      {Object.entries(record.parameterValues).map(([key, value]) => (
                        <s-list-item key={`${record.id}-${key}`}>
                          {key}: {formatParameterValue(value)}
                        </s-list-item>
                      ))}
                    </s-unordered-list>
                  </s-box>
                </s-stack>
              </s-box>
            ))}
          </s-stack>
        )}
      </s-section>
    </s-page>
  );
}
