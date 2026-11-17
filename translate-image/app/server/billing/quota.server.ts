import prisma from "~/db.server";
import {
  JAVA_SNAPSHOT_KIND,
  JAVA_SNAPSHOT_PERIOD_KEY,
  JAVA_SNAPSHOT_SUBSCRIPTION_GID,
  inferHasUsedTrial,
  isInFreePlanTime,
  javaSnapshotGrantGid,
} from "./billingState";

export type AccountQuota = {
  shop: string;
  plan: number;
  planType: string;
  feeType: number;
  purchasePoints: number;
  usedPoints: number;
  remaining: number;
  currentPeriodEnd: Date | null;
  hasUsedTrial: boolean;
  trialEndsAt: Date | null;
  isInFreePlanTime: boolean;
};

export {
  JAVA_SNAPSHOT_KIND,
  JAVA_SNAPSHOT_PERIOD_KEY,
  JAVA_SNAPSHOT_SUBSCRIPTION_GID,
  javaSnapshotGrantGid,
};

export async function ensureAccount(shop: string) {
  await prisma.account.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
  const row = await prisma.account.findUniqueOrThrow({ where: { shop } });
  if (row.hasUsedTrial) return row;
  const grantCount = await prisma.creditGrant.count({ where: { shop } });
  if (!inferHasUsedTrial({ hasUsedTrial: row.hasUsedTrial, plan: row.plan, grantCount })) {
    return row;
  }
  return prisma.account.update({
    where: { shop },
    data: { hasUsedTrial: true },
  });
}

export function remainingOf(account: { purchasePoints: number; usedPoints: number }): number {
  return account.purchasePoints - account.usedPoints;
}

export async function getAccountQuota(shop: string): Promise<AccountQuota | null> {
  const row = await ensureAccount(shop);
  return {
    shop: row.shop,
    plan: row.plan,
    planType: row.planType,
    feeType: row.feeType,
    purchasePoints: row.purchasePoints,
    usedPoints: row.usedPoints,
    remaining: remainingOf(row),
    currentPeriodEnd: row.currentPeriodEnd,
    hasUsedTrial: row.hasUsedTrial,
    trialEndsAt: row.trialEndsAt,
    isInFreePlanTime: isInFreePlanTime(row.trialEndsAt),
  };
}

export async function precheckCredits(shop: string, credits: number): Promise<AccountQuota | null> {
  const quota = await getAccountQuota(shop);
  if (!quota || quota.remaining < credits) return null;
  return quota;
}

export async function deductCredits(
  shop: string,
  credits: number,
  meta: { source: string; model?: string; languageCode?: string },
): Promise<AccountQuota> {
  const amount = Math.max(0, Math.floor(credits));
  await ensureAccount(shop);
  if (amount > 0) {
    await prisma.account.update({
      where: { shop },
      data: { usedPoints: { increment: amount } },
    });
    await prisma.creditUsage.create({
      data: {
        shop,
        credits: amount,
        source: meta.source,
        model: meta.model,
        languageCode: meta.languageCode,
      },
    });
  }
  const quota = await getAccountQuota(shop);
  if (!quota) throw new Error(`quota missing after deduct shop=${shop}`);
  return quota;
}
