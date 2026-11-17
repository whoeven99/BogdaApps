import { GetUserSubscriptionPlan, GetUserWords } from "~/api/JavaServer";
import prisma from "~/db.server";

export type AccountQuota = {
  shop: string;
  plan: number;
  planType: string;
  feeType: number;
  purchasePoints: number;
  usedPoints: number;
  remaining: number;
  currentPeriodEnd: Date | null;
};

const JAVA_SNAPSHOT_GID = (shop: string) => `java-snapshot:${shop}`;

export async function ensureAccount(shop: string) {
  const row = await prisma.account.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
  await snapshotJavaQuotaIfNeeded(shop);
  return prisma.account.findUniqueOrThrow({ where: { shop: row.shop } });
}

async function snapshotJavaQuotaIfNeeded(shop: string): Promise<void> {
  try {
    const marked = await prisma.creditGrant.findUnique({
      where: { gid_periodKey: { gid: JAVA_SNAPSHOT_GID(shop), periodKey: "once" } },
    });
    if (marked) return;
    const words = await GetUserWords({ shop });
    if (!words?.success) return;
    const plan = await GetUserSubscriptionPlan({ shop, server: process.env.SERVER_URL || "" });
    const purchasePoints = Number(words?.response?.purchasePoints ?? 0);
    const usedPoints = Number(words?.response?.usedPoints ?? 0);
    const planId = Number(plan?.response?.userSubscriptionPlan ?? 1);
    const planType = String(plan?.response?.planType ?? "Free");
    const feeType = Number(plan?.response?.feeType ?? 0);
    const periodEnd = plan?.response?.currentPeriodEnd
      ? new Date(plan.response.currentPeriodEnd)
      : null;
    await prisma.$transaction([
      prisma.creditGrant.create({
        data: {
          shop,
          gid: JAVA_SNAPSHOT_GID(shop),
          periodKey: "once",
          kind: "java-snapshot",
          credits: 0,
        },
      }),
      prisma.account.update({
        where: { shop },
        data: {
          purchasePoints,
          usedPoints,
          plan: Number.isFinite(planId) ? planId : 1,
          planType,
          feeType: Number.isFinite(feeType) ? feeType : 0,
          subscriptionGid: planId > 1 ? "java-snapshot" : null,
          currentPeriodEnd: periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null,
        },
      }),
    ]);
  } catch (err) {
    if ((err as { code?: string } | null)?.code === "P2002") return;
    console.warn(`[quota] java snapshot skipped shop=${shop}`, err);
  }
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
