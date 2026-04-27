import type { ActionFunctionArgs } from "react-router";

import { createPurchaseRecord, type PurchaseMode, type PurchaseRecordStatus } from "../models/purchase-records.server";
import { sendMerchantAlertEmail } from "../services/email.server";
import { authenticate } from "../shopify.server";

function isPurchaseMode(value: unknown): value is PurchaseMode {
  return value === "one_time" || value === "subscription";
}

function isPurchaseRecordStatus(value: unknown): value is PurchaseRecordStatus {
  return (
    value === "cart_added" ||
    value === "checkout_started" ||
    value === "cart_add_failed"
  );
}

function isParameterInputValue(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function isParameterValuesRecord(
  value: unknown,
): value is Record<string, string | number | boolean | string[] | null | undefined> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => isParameterInputValue(item))
  );
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) {
    return Response.json(
      { error: "当前店铺未建立可用的 app proxy session" },
      { status: 401 },
    );
  }

  const payload = (await request.json().catch(() => null)) as
    | Record<string, unknown>
    | null;
  if (!payload) {
    return Response.json({ error: "请求体必须是合法 JSON" }, { status: 400 });
  }

  const shopifyProductId = String(payload.productId ?? "").trim();
  const shopifyVariantId = String(payload.variantId ?? "").trim();
  const purchaseMode = payload.purchaseMode;
  const status = payload.status;
  const parameterValues = payload.submittedValues;

  if (!shopifyProductId || !shopifyVariantId) {
    return Response.json({ error: "缺少商品或变体 ID" }, { status: 400 });
  }

  if (!isPurchaseMode(purchaseMode)) {
    return Response.json({ error: "购买方式无效" }, { status: 400 });
  }

  if (!isPurchaseRecordStatus(status)) {
    return Response.json({ error: "记录状态无效" }, { status: 400 });
  }

  if (!isParameterValuesRecord(parameterValues)) {
    return Response.json({ error: "参数快照格式无效" }, { status: 400 });
  }

  await createPurchaseRecord({
    source: "theme_widget",
    status,
    purchaseMode,
    shopifyProductId,
    productTitle: String(payload.productTitle ?? "").trim() || undefined,
    shopifyVariantId,
    variantTitle: String(payload.variantTitle ?? "").trim() || undefined,
    parameterTemplateName:
      String(payload.templateName ?? "").trim() || undefined,
    signature: String(payload.signature ?? "").trim() || undefined,
    parameterValues,
    subscriptionPlanId:
      String(payload.subscriptionPlanId ?? "").trim() || undefined,
    subscriptionPlanName:
      String(payload.subscriptionPlanName ?? "").trim() || undefined,
    sellingPlanId: String(payload.sellingPlanId ?? "").trim() || undefined,
    priceAdjustment:
      typeof payload.priceAdjustment === "number"
        ? payload.priceAdjustment
        : undefined,
    notes: String(payload.notes ?? "").trim() || undefined,
  });

  if (status === "cart_add_failed") {
    await sendMerchantAlertEmail({
      category: "cart_add_failed",
      subject: `参数化商品加购失败：${String(payload.productTitle ?? shopifyProductId)}`,
      text: [
        "参数化商品加购失败。",
        `商品：${String(payload.productTitle ?? shopifyProductId)}`,
        `变体：${String(payload.variantTitle ?? shopifyVariantId)}`,
        `购买方式：${purchaseMode === "subscription" ? "订阅购买" : "一次性购买"}`,
        `备注：${String(payload.notes ?? "无")}`,
      ].join("\n"),
      html: `
        <p>参数化商品加购失败。</p>
        <p>商品：${String(payload.productTitle ?? shopifyProductId)}</p>
        <p>变体：${String(payload.variantTitle ?? shopifyVariantId)}</p>
        <p>购买方式：${purchaseMode === "subscription" ? "订阅购买" : "一次性购买"}</p>
        <p>备注：${String(payload.notes ?? "无")}</p>
      `,
      payload,
    });
  }

  if (status === "checkout_started" && purchaseMode === "subscription") {
    await sendMerchantAlertEmail({
      category: "subscription_checkout_started",
      subject: `订阅购买已发起：${String(payload.productTitle ?? shopifyProductId)}`,
      text: [
        "消费者已发起订阅购买。",
        `商品：${String(payload.productTitle ?? shopifyProductId)}`,
        `变体：${String(payload.variantTitle ?? shopifyVariantId)}`,
        `订阅方案：${String(payload.subscriptionPlanName ?? "未记录")}`,
        `Selling Plan：${String(payload.sellingPlanId ?? "未记录")}`,
      ].join("\n"),
      html: `
        <p>消费者已发起订阅购买。</p>
        <p>商品：${String(payload.productTitle ?? shopifyProductId)}</p>
        <p>变体：${String(payload.variantTitle ?? shopifyVariantId)}</p>
        <p>订阅方案：${String(payload.subscriptionPlanName ?? "未记录")}</p>
        <p>Selling Plan：${String(payload.sellingPlanId ?? "未记录")}</p>
      `,
      payload,
    });
  }

  return Response.json({ ok: true });
};
