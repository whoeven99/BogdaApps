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

export type JavaQuotaSnapshot = {
  purchasePoints: number;
  usedPoints: number;
  plan: number;
  planType: string;
  feeType: number;
  currentPeriodEnd: Date | null;
};

export const JAVA_SNAPSHOT_PERIOD_KEY = "once";
export const JAVA_SNAPSHOT_KIND = "java-snapshot";
export const JAVA_SNAPSHOT_SUBSCRIPTION_GID = "java-snapshot";

export function javaSnapshotGrantGid(shop: string): string {
  return `java-snapshot:${shop}`;
}

export async function ensureAccount(shop: string) {
  const row = await prisma.account.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
  await snapshotJavaQuotaIfNeeded(shop);
  return prisma.account.findUniqueOrThrow({ where: { shop: row.shop } });
}

export async function fetchJavaQuotaSnapshot(shop: string): Promise<JavaQuotaSnapshot | null> {
  const words = await GetUserWords({ shop });
  if (!words?.success) return null;
  const plan = await GetUserSubscriptionPlan({ shop, server: process.env.SERVER_URL || "" });
  const periodEnd = plan?.response?.currentPeriodEnd
    ? new Date(plan.response.currentPeriodEnd)
    : null;
  const planId = Number(plan?.response?.userSubscriptionPlan ?? 1);
  const feeType = Number(plan?.response?.feeType ?? 0);
  return {
    purchasePoints: Number(words?.response?.purchasePoints ?? 0) || 0,
    usedPoints: Number(words?.response?.usedPoints ?? 0) || 0,
    plan: Number.isFinite(planId) ? planId : 1,
    planType: String(plan?.response?.planType ?? "Free"),
    feeType: Number.isFinite(feeType) ? feeType : 0,
    currentPeriodEnd: periodEnd && !Number.isNaN(periodEnd.getTime()) ? periodEnd : null,
  };
}

export async function applyJavaQuotaSnapshot(
  shop: string,
  snapshot: JavaQuotaSnapshot,
  opts: { force?: boolean } = {},
): Promise<"applied" | "exists" | "blocked-by-usage"> {
  await prisma.account.upsert({
    where: { shop },
    create: { shop },
    update: {},
  });
  const gid = javaSnapshotGrantGid(shop);
  const existing = await prisma.creditGrant.findUnique({
    where: { gid_periodKey: { gid, periodKey: JAVA_SNAPSHOT_PERIOD_KEY } },
  });
  if (existing && !opts.force) return "exists";
  if (opts.force) {
    const usage = await prisma.creditUsage.findFirst({ where: { shop } });
    if (usage) return "blocked-by-usage";
  }
  if (!existing) {
    try {
      await prisma.creditGrant.create({
        data: {
          shop,
          gid,
          periodKey: JAVA_SNAPSHOT_PERIOD_KEY,
          kind: JAVA_SNAPSHOT_KIND,
          credits: 0,
        },
      });
    } catch (err) {
      if ((err as { code?: string } | null)?.code === "P2002") return "exists";
      throw err;
    }
  }
  await prisma.account.update({
    where: { shop },
    data: {
      purchasePoints: snapshot.purchasePoints,
      usedPoints: snapshot.usedPoints,
      plan: snapshot.plan,
      planType: snapshot.planType,
      feeType: snapshot.feeType,
      subscriptionGid: snapshot.plan > 1 ? JAVA_SNAPSHOT_SUBSCRIPTION_GID : null,
      currentPeriodEnd: snapshot.currentPeriodEnd,
    },
  });
  return "applied";
}

async function snapshotJavaQuotaIfNeeded(shop: string): Promise<void> {
  try {
    const marked = await prisma.creditGrant.findUnique({
      where: {
        gid_periodKey: {
          gid: javaSnapshotGrantGid(shop),
          periodKey: JAVA_SNAPSHOT_PERIOD_KEY,
        },
      },
    });
    if (marked) return;
    const snapshot = await fetchJavaQuotaSnapshot(shop);
    if (!snapshot) return;
    await applyJavaQuotaSnapshot(shop, snapshot);
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
