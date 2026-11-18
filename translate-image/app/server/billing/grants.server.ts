import prisma from "~/db.server";
import { appendBillingLog, hasBillingLog } from "./billingLog.server";
import { JAVA_SNAPSHOT_SUBSCRIPTION_GID } from "./billingState";
import type { PlanRecord } from "./plans/planCatalog.server";
import { findPackPlanByName, findSubscriptionPlan } from "./plans/planCatalog.server";
import { ensureAccount } from "./quota.server";
import { BILLING_LOG_EVENT } from "./types.server";

export type GrantPlanFields = {
  plan: number;
  planType: string;
  feeType: number;
  subscriptionGid?: string;
  currentPeriodEnd?: Date | null;
  hasUsedTrial?: boolean;
  trialEndsAt?: Date | null;
};

function aliasAfterPurchased(account: {
  subscriptionCredits: number;
  purchasedCredits: number;
  trialCredits: number;
  usedCredits: number;
}) {
  return {
    purchasePoints:
      account.subscriptionCredits + account.purchasedCredits + account.trialCredits,
    usedPoints: account.usedCredits,
  };
}

export async function packCreditsForName(name: string): Promise<number | null> {
  const pack = await findPackPlanByName(name);
  return pack?.credits ?? null;
}

export async function planGrantForName(name: string, yearly: boolean) {
  const plan = await findSubscriptionPlan({
    shopifyPlanName: name,
    billingInterval: yearly ? "ANNUAL" : "MONTHLY",
  });
  if (!plan) return null;
  return {
    plan: name === "Premium" ? 4 : name === "Pro" ? 3 : 2,
    planType: name,
    monthlyCredits: plan.credits,
    credits: plan.credits,
    planKey: plan.planKey,
  };
}

export async function applyTokenPackPurchase(params: {
  shop: string;
  plan: PlanRecord;
  shopifyPurchaseId: string;
  metadata?: Record<string, unknown>;
}): Promise<boolean> {
  const { shop, plan, shopifyPurchaseId } = params;
  await ensureAccount(shop);
  if (await hasBillingLog(shop, BILLING_LOG_EVENT.TOKEN_PACK_PURCHASED, shopifyPurchaseId)) {
    return false;
  }
  const account = await prisma.account.findUniqueOrThrow({ where: { shop } });
  const purchasedCredits = account.purchasedCredits + plan.credits;
  await prisma.account.update({
    where: { shop },
    data: {
      purchasedCredits,
      ...aliasAfterPurchased({
        ...account,
        purchasedCredits,
      }),
    },
  });
  await appendBillingLog({
    shop,
    eventType: BILLING_LOG_EVENT.TOKEN_PACK_PURCHASED,
    planKey: plan.planKey,
    referenceId: shopifyPurchaseId,
    creditsDelta: plan.credits,
    metadata: params.metadata,
  });
  return true;
}

/** 兼容旧 CreditGrant 购包路径；订阅请走 applyActiveSubscription。 */
export async function grantCreditsOnce(args: {
  shop: string;
  gid: string;
  periodKey: string;
  kind: string;
  credits: number;
  plan?: GrantPlanFields;
}): Promise<boolean> {
  if (args.kind === "pack") {
    const pack = await findPackPlanByName(
      args.plan?.planType || "",
    );
    if (!pack && args.credits <= 0) return false;
    await ensureAccount(args.shop);
    try {
      await prisma.creditGrant.create({
        data: {
          shop: args.shop,
          gid: args.gid,
          periodKey: args.periodKey,
          kind: args.kind,
          credits: args.credits,
        },
      });
    } catch (err) {
      const code = (err as { code?: string } | null)?.code;
      if (code === "P2002") return false;
      throw err;
    }
    const account = await prisma.account.findUniqueOrThrow({ where: { shop: args.shop } });
    const purchasedCredits = account.purchasedCredits + args.credits;
    await prisma.account.update({
      where: { shop: args.shop },
      data: {
        purchasedCredits,
        ...aliasAfterPurchased({ ...account, purchasedCredits }),
      },
    });
    return true;
  }

  if (args.credits <= 0) return false;
  await ensureAccount(args.shop);
  const account = await prisma.account.findUnique({ where: { shop: args.shop } });
  const skipAdd =
    args.kind === "subscription" && account?.subscriptionGid === JAVA_SNAPSHOT_SUBSCRIPTION_GID;
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
    if (code === "P2002") {
      if (args.plan && args.kind === "subscription") {
        await prisma.account.update({
          where: { shop: args.shop },
          data: {
            plan: args.plan.plan,
            planType: args.plan.planType,
            feeType: args.plan.feeType,
            ...(args.plan.subscriptionGid !== undefined
              ? { subscriptionGid: args.plan.subscriptionGid }
              : {}),
            ...(args.plan.currentPeriodEnd !== undefined
              ? { currentPeriodEnd: args.plan.currentPeriodEnd }
              : {}),
            ...(args.plan.hasUsedTrial ? { hasUsedTrial: true } : {}),
            ...(args.plan.trialEndsAt !== undefined ? { trialEndsAt: args.plan.trialEndsAt } : {}),
          },
        });
      }
      return false;
    }
    throw err;
  }
  const nextSubscription = skipAdd ? account?.subscriptionCredits ?? 0 : args.credits;
  const purchasedCredits = account?.purchasedCredits ?? 0;
  const trialCredits = account?.trialCredits ?? 0;
  const usedCredits = account?.usedCredits ?? 0;
  await prisma.account.update({
    where: { shop: args.shop },
    data: {
      subscriptionCredits: nextSubscription,
      purchasePoints: nextSubscription + purchasedCredits + trialCredits,
      usedPoints: usedCredits,
      ...(args.plan
        ? {
            plan: args.plan.plan,
            planType: args.plan.planType,
            feeType: args.plan.feeType,
            ...(args.plan.subscriptionGid !== undefined
              ? { subscriptionGid: args.plan.subscriptionGid }
              : {}),
            ...(args.plan.currentPeriodEnd !== undefined
              ? { currentPeriodEnd: args.plan.currentPeriodEnd }
              : {}),
            ...(args.plan.hasUsedTrial ? { hasUsedTrial: true } : {}),
            ...(args.plan.trialEndsAt !== undefined ? { trialEndsAt: args.plan.trialEndsAt } : {}),
          }
        : {}),
    },
  });
  return !skipAdd;
}

export async function markPlanCancelled(shop: string, feeType: number): Promise<void> {
  await ensureAccount(shop);
  const account = await prisma.account.findUniqueOrThrow({ where: { shop } });
  await prisma.account.update({
    where: { shop },
    data: {
      plan: 1,
      planType: "Free",
      feeType,
      subscriptionGid: null,
      subscriptionCredits: 0,
      purchasePoints: account.purchasedCredits + account.trialCredits,
      usedPoints: account.usedCredits,
    },
  });
}
