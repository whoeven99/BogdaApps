import prisma from "~/db.server";
import { ensureAccount } from "./quota.server";

const PACK_CREDITS: Record<string, number> = {
  "50 extra times": 100000,
  "100 extra times": 200000,
  "200 extra times": 400000,
  "300 extra times": 600000,
  "500 extra times": 1000000,
  "1000 extra times": 2000000,
  "2000 extra times": 4000000,
  "3000 extra times": 6000000,
};

const PLAN_BY_NAME: Record<string, { plan: number; planType: string; monthlyCredits: number }> = {
  Basic: { plan: 2, planType: "Basic", monthlyCredits: 200000 },
  Pro: { plan: 3, planType: "Pro", monthlyCredits: 600000 },
  Premium: { plan: 4, planType: "Premium", monthlyCredits: 1600000 },
};

export function packCreditsForName(name: string): number | null {
  return PACK_CREDITS[name] ?? null;
}

export function planGrantForName(name: string, yearly: boolean) {
  const hit = PLAN_BY_NAME[name];
  if (!hit) return null;
  return {
    ...hit,
    credits: yearly ? hit.monthlyCredits * 12 : hit.monthlyCredits,
  };
}

export async function grantCreditsOnce(args: {
  shop: string;
  gid: string;
  periodKey: string;
  kind: string;
  credits: number;
  plan?: { plan: number; planType: string; feeType: number; subscriptionGid?: string; currentPeriodEnd?: Date | null };
}): Promise<boolean> {
  if (args.credits <= 0) return false;
  await ensureAccount(args.shop);
  const account = await prisma.account.findUnique({ where: { shop: args.shop } });
  const skipAdd =
    args.kind === "subscription" && account?.subscriptionGid === "java-snapshot";
  try {
    await prisma.creditGrant.create({
      data: {
        shop: args.shop,
        gid: args.gid,
        periodKey: args.periodKey,
        kind: args.kind,
        credits: skipAdd ? 0 : args.credits,
      },
    });
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "P2002") return false;
    throw err;
  }
  await prisma.account.update({
    where: { shop: args.shop },
    data: {
      purchasePoints: { increment: skipAdd ? 0 : args.credits },
      ...(args.plan
        ? {
            plan: args.plan.plan,
            planType: args.plan.planType,
            feeType: args.plan.feeType,
            subscriptionGid: args.plan.subscriptionGid,
            currentPeriodEnd: args.plan.currentPeriodEnd,
          }
        : {}),
    },
  });
  return !skipAdd;
}

export async function markPlanCancelled(shop: string, feeType: number): Promise<void> {
  await ensureAccount(shop);
  await prisma.account.update({
    where: { shop },
    data: { plan: 1, planType: "Free", feeType, subscriptionGid: null },
  });
}
