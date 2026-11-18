import type { Prisma } from "@prisma/client";
import prisma from "~/db.server";
import { BILLING_LOG_EVENT, type BillingLogEvent } from "./types.server";

function asMeta(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

export type AppendBillingLogParams = {
  shop: string;
  eventType: BillingLogEvent;
  planKey?: string | null;
  referenceId?: string | null;
  creditsDelta?: number | null;
  usedCredits?: number | null;
  metadata?: Record<string, unknown> | null;
};

export async function appendBillingLog(
  params: AppendBillingLogParams,
): Promise<{ id: string }> {
  const row = await prisma.billingLog.create({
    data: {
      shop: params.shop,
      eventType: params.eventType,
      planKey: params.planKey ?? null,
      referenceId: params.referenceId ?? null,
      creditsDelta: params.creditsDelta ?? null,
      usedCredits: params.usedCredits ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  return row;
}

export async function claimBillingLogFlag(
  id: string,
  flag: string,
): Promise<boolean> {
  const row = await prisma.billingLog.findUnique({
    where: { id },
    select: { metadata: true },
  });
  if (!row) return false;
  const meta = asMeta(row.metadata);
  if (meta[flag] === true) return false;
  await prisma.billingLog.update({
    where: { id },
    data: { metadata: { ...meta, [flag]: true } as Prisma.InputJsonValue },
  });
  return true;
}

export async function claimStaffFeishuSent(
  shop: string,
  referenceId: string,
): Promise<boolean> {
  const row = await prisma.billingLog.findFirst({
    where: {
      shop,
      referenceId,
      eventType: {
        in: [
          BILLING_LOG_EVENT.SUBSCRIPTION_ACTIVATED,
          BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
          BILLING_LOG_EVENT.TOKEN_PACK_PURCHASED,
        ],
      },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!row) return false;
  return claimBillingLogFlag(row.id, "staffFeishuSent");
}

export async function hasBillingLog(
  shop: string,
  eventType: BillingLogEvent,
  referenceId: string,
): Promise<boolean> {
  const row = await prisma.billingLog.findFirst({
    where: { shop, eventType, referenceId },
    select: { id: true },
  });
  return Boolean(row);
}
