import type { Prisma } from "@prisma/client";
import prisma from "~/db.server";
import type { BillingLogEvent } from "./types.server";

export type AppendBillingLogParams = {
  shop: string;
  eventType: BillingLogEvent;
  planKey?: string | null;
  referenceId?: string | null;
  creditsDelta?: number | null;
  usedCredits?: number | null;
  metadata?: Record<string, unknown> | null;
};

export async function appendBillingLog(params: AppendBillingLogParams): Promise<void> {
  await prisma.billingLog.create({
    data: {
      shop: params.shop,
      eventType: params.eventType,
      planKey: params.planKey ?? null,
      referenceId: params.referenceId ?? null,
      creditsDelta: params.creditsDelta ?? null,
      usedCredits: params.usedCredits ?? null,
      metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue,
    },
  });
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
