import prisma from "../db.server";
import type { ParameterInputValue } from "../../src/types/product-parameters.js";

const DEMO_SHOP = "demo-shop.myshopify.com";

export type PurchaseRecordStatus =
  | "cart_added"
  | "checkout_started"
  | "cart_add_failed";

export type PurchaseMode = "one_time" | "subscription";

export type PurchaseRecordView = {
  id: string;
  source: string;
  status: PurchaseRecordStatus;
  purchaseMode: PurchaseMode;
  shopifyProductId: string;
  productTitle?: string;
  shopifyVariantId: string;
  variantTitle?: string;
  parameterTemplateName?: string;
  signature?: string;
  parameterValues: Record<string, ParameterInputValue>;
  subscriptionPlanId?: string;
  subscriptionPlanName?: string;
  sellingPlanId?: string;
  priceAdjustment?: number;
  notes?: string;
  createdAt: string;
};

export type PurchaseRecordSummary = {
  total: number;
  oneTimeCount: number;
  subscriptionCount: number;
  cartAddedCount: number;
  checkoutStartedCount: number;
  failedCount: number;
};

function isParameterInputValue(value: unknown): value is ParameterInputValue {
  return (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

function isParameterValueRecord(
  value: unknown,
): value is Record<string, ParameterInputValue> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => isParameterInputValue(item))
  );
}

function parsePurchaseRecordValuesJson(
  text: string,
): Record<string, ParameterInputValue> {
  const parsed = JSON.parse(text) as unknown;
  if (!isParameterValueRecord(parsed)) {
    throw new Error("参数记录格式不正确");
  }

  return parsed;
}

function mapPurchaseRecord(record: {
  id: string;
  source: string;
  status: string;
  purchaseMode: string;
  shopifyProductId: string;
  productTitle: string | null;
  shopifyVariantId: string;
  variantTitle: string | null;
  parameterTemplateName: string | null;
  signature: string | null;
  parameterValuesJson: string;
  subscriptionPlanId: string | null;
  subscriptionPlanName: string | null;
  sellingPlanId: string | null;
  priceAdjustment: number | null;
  notes: string | null;
  createdAt: Date;
}): PurchaseRecordView {
  return {
    id: record.id,
    source: record.source,
    status: record.status as PurchaseRecordStatus,
    purchaseMode: record.purchaseMode as PurchaseMode,
    shopifyProductId: record.shopifyProductId,
    productTitle: record.productTitle ?? undefined,
    shopifyVariantId: record.shopifyVariantId,
    variantTitle: record.variantTitle ?? undefined,
    parameterTemplateName: record.parameterTemplateName ?? undefined,
    signature: record.signature ?? undefined,
    parameterValues: parsePurchaseRecordValuesJson(record.parameterValuesJson),
    subscriptionPlanId: record.subscriptionPlanId ?? undefined,
    subscriptionPlanName: record.subscriptionPlanName ?? undefined,
    sellingPlanId: record.sellingPlanId ?? undefined,
    priceAdjustment: record.priceAdjustment ?? undefined,
    notes: record.notes ?? undefined,
    createdAt: record.createdAt.toISOString(),
  };
}

export async function createPurchaseRecord(input: {
  source?: string;
  status: PurchaseRecordStatus;
  purchaseMode: PurchaseMode;
  shopifyProductId: string;
  productTitle?: string;
  shopifyVariantId: string;
  variantTitle?: string;
  parameterTemplateName?: string;
  signature?: string;
  parameterValues: Record<string, ParameterInputValue>;
  subscriptionPlanId?: string;
  subscriptionPlanName?: string;
  sellingPlanId?: string;
  priceAdjustment?: number;
  notes?: string;
  shop?: string;
}) {
  return prisma.purchaseRecord.create({
    data: {
      shop: input.shop ?? DEMO_SHOP,
      source: input.source ?? "theme_widget",
      status: input.status,
      purchaseMode: input.purchaseMode,
      shopifyProductId: input.shopifyProductId,
      productTitle: input.productTitle,
      shopifyVariantId: input.shopifyVariantId,
      variantTitle: input.variantTitle,
      parameterTemplateName: input.parameterTemplateName,
      signature: input.signature,
      parameterValuesJson: JSON.stringify(input.parameterValues),
      subscriptionPlanId: input.subscriptionPlanId,
      subscriptionPlanName: input.subscriptionPlanName,
      sellingPlanId: input.sellingPlanId,
      priceAdjustment: input.priceAdjustment,
      notes: input.notes,
    },
  });
}

export async function listPurchaseRecords(input?: {
  shop?: string;
  shopifyProductId?: string;
  purchaseMode?: PurchaseMode | "all";
  status?: PurchaseRecordStatus | "all";
  limit?: number;
}) {
  const records = await prisma.purchaseRecord.findMany({
    where: {
      shop: input?.shop ?? DEMO_SHOP,
      ...(input?.shopifyProductId
        ? { shopifyProductId: input.shopifyProductId }
        : {}),
      ...(input?.purchaseMode && input.purchaseMode !== "all"
        ? { purchaseMode: input.purchaseMode }
        : {}),
      ...(input?.status && input.status !== "all"
        ? { status: input.status }
        : {}),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: input?.limit ?? 50,
  });

  return records.map(mapPurchaseRecord);
}

export function summarizePurchaseRecords(
  records: PurchaseRecordView[],
): PurchaseRecordSummary {
  return records.reduce<PurchaseRecordSummary>(
    (summary, record) => {
      summary.total += 1;
      if (record.purchaseMode === "subscription") {
        summary.subscriptionCount += 1;
      } else {
        summary.oneTimeCount += 1;
      }

      if (record.status === "cart_added") {
        summary.cartAddedCount += 1;
      } else if (record.status === "checkout_started") {
        summary.checkoutStartedCount += 1;
      } else if (record.status === "cart_add_failed") {
        summary.failedCount += 1;
      }

      return summary;
    },
    {
      total: 0,
      oneTimeCount: 0,
      subscriptionCount: 0,
      cartAddedCount: 0,
      checkoutStartedCount: 0,
      failedCount: 0,
    },
  );
}
