import type { Account, AppSubscription, Prisma } from "@prisma/client";
import prisma from "~/db.server";
import { settlePoolsAtRenewal, clearSubscriptionOnCancel } from "./accountBalance";
import { getAnnualCreditCycleIndex } from "./annualCreditCycle";
import { appendBillingLog } from "./billingLog.server";
import { JAVA_SNAPSHOT_SUBSCRIPTION_GID } from "./billingState";
import {
  feeTypeForCatalogInterval,
  planNumberForName,
} from "./plans/planCatalog.server";
import { ensureAccount } from "./quota.server";
import { APP_SUBSCRIPTION_STATUS, BILLING_INTERVAL, BILLING_LOG_EVENT } from "./types.server";

export type SubscriptionPeriodSnapshot = {
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
};

export type ApplyActiveSubscriptionParams = {
  shop: string;
  shopifySubscriptionId: string;
  planKey: string;
  shopifyPlanName: string;
  billingInterval: string;
  creditsPerPeriod: number;
  trialEndsAt?: Date | null;
  period: SubscriptionPeriodSnapshot;
  rawPayload?: Record<string, unknown>;
  existingSubscription?: AppSubscription | null;
};

export type ApplyActiveSubscriptionResult = {
  outcome: "renewed" | "activated" | "updated";
};

const RENEWAL_SKEW_MS = 2000;

export function isSubscriptionRenewal(
  previous: AppSubscription | null,
  nextPeriodEnd: Date | null,
): boolean {
  if (!previous?.currentPeriodEnd || !nextPeriodEnd) return false;
  if (previous.status !== APP_SUBSCRIPTION_STATUS.ACTIVE) return false;
  return nextPeriodEnd.getTime() - previous.currentPeriodEnd.getTime() > RENEWAL_SKEW_MS;
}

function aliasTotals(pools: {
  subscriptionCredits: number;
  purchasedCredits: number;
  trialCredits: number;
  usedCredits: number;
}) {
  return {
    purchasePoints:
      pools.subscriptionCredits + pools.purchasedCredits + pools.trialCredits,
    usedPoints: pools.usedCredits,
  };
}

export async function archivePeriodAndRenew(params: {
  shop: string;
  subscription: AppSubscription;
  account: Account;
  next: SubscriptionPeriodSnapshot & {
    planKey: string;
    shopifyPlanName: string;
    billingInterval: string;
    creditsPerPeriod: number;
  };
}): Promise<void> {
  const { shop, subscription, next } = params;
  const account = await prisma.account.findUniqueOrThrow({ where: { shop } });
  const settled = settlePoolsAtRenewal(account);
  const usedCredits = 0;
  const subscriptionCredits = next.creditsPerPeriod;

  await appendBillingLog({
    shop,
    eventType: BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
    planKey: next.planKey,
    referenceId: subscription.shopifySubscriptionId,
    creditsDelta: subscriptionCredits,
    usedCredits: account.usedCredits,
    metadata: {
      grantKind: "shopify_period",
      billingInterval: next.billingInterval,
      billingPeriodEnd: next.currentPeriodEnd?.toISOString() ?? null,
      previousPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      nextPeriodEnd: next.currentPeriodEnd?.toISOString() ?? null,
      creditCycleIndex:
        next.billingInterval === BILLING_INTERVAL.ANNUAL ? 0 : undefined,
    },
  });

  await prisma.$transaction([
    prisma.appSubscription.update({
      where: { shop },
      data: {
        planKey: next.planKey,
        billingInterval: next.billingInterval,
        creditsPerPeriod: next.creditsPerPeriod,
        currentPeriodStart: next.currentPeriodStart,
        currentPeriodEnd: next.currentPeriodEnd,
        status: APP_SUBSCRIPTION_STATUS.ACTIVE,
        cancelledAt: null,
      },
    }),
    prisma.account.update({
      where: { shop },
      data: {
        plan: planNumberForName(next.shopifyPlanName),
        planType: next.shopifyPlanName,
        feeType: feeTypeForCatalogInterval(next.billingInterval),
        currentPeriodEnd: next.currentPeriodEnd,
        usedCredits,
        subscriptionCredits,
        purchasedCredits: settled.purchasedCredits,
        trialCredits: settled.trialCredits,
        ...aliasTotals({
          subscriptionCredits,
          purchasedCredits: settled.purchasedCredits,
          trialCredits: settled.trialCredits,
          usedCredits,
        }),
      },
    }),
  ]);
}

export async function applyActiveSubscription(
  params: ApplyActiveSubscriptionParams,
): Promise<ApplyActiveSubscriptionResult> {
  const {
    shop,
    shopifySubscriptionId,
    planKey,
    shopifyPlanName,
    billingInterval,
    creditsPerPeriod,
    trialEndsAt,
    period,
    rawPayload,
  } = params;

  const account = await ensureAccount(shop);
  const existing =
    params.existingSubscription !== undefined
      ? params.existingSubscription
      : await prisma.appSubscription.findUnique({ where: { shop } });

  if (
    existing &&
    existing.shopifySubscriptionId === shopifySubscriptionId &&
    isSubscriptionRenewal(existing, period.currentPeriodEnd)
  ) {
    await archivePeriodAndRenew({
      shop,
      subscription: existing,
      account,
      next: {
        ...period,
        planKey,
        shopifyPlanName,
        billingInterval,
        creditsPerPeriod,
      },
    });
    return { outcome: "renewed" };
  }

  const wasPending =
    !existing ||
    existing.status === APP_SUBSCRIPTION_STATUS.PENDING ||
    existing.shopifySubscriptionId !== shopifySubscriptionId;

  const skipAdd = account.subscriptionGid === JAVA_SNAPSHOT_SUBSCRIPTION_GID;
  const creditsDelta = skipAdd || !wasPending ? 0 : creditsPerPeriod;
  const annual = billingInterval === BILLING_INTERVAL.ANNUAL;
  const creditCycleIndex = annual
    ? skipAdd && period.currentPeriodEnd
      ? getAnnualCreditCycleIndex(new Date(), period.currentPeriodEnd)
      : 0
    : undefined;

  await prisma.appSubscription.upsert({
    where: { shop },
    create: {
      shop,
      planKey,
      shopifySubscriptionId,
      billingInterval,
      status: APP_SUBSCRIPTION_STATUS.ACTIVE,
      creditsPerPeriod,
      trialEndsAt: trialEndsAt ?? null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      rawPayload: rawPayload as Prisma.InputJsonValue,
    },
    update: {
      planKey,
      shopifySubscriptionId,
      billingInterval,
      status: APP_SUBSCRIPTION_STATUS.ACTIVE,
      creditsPerPeriod,
      trialEndsAt: trialEndsAt ?? null,
      currentPeriodStart: period.currentPeriodStart,
      currentPeriodEnd: period.currentPeriodEnd,
      cancelledAt: null,
      rawPayload: rawPayload as Prisma.InputJsonValue,
    },
  });

  const subscriptionCredits =
    skipAdd || !wasPending ? account.subscriptionCredits : creditsPerPeriod;
  await prisma.account.update({
    where: { shop },
    data: {
      plan: planNumberForName(shopifyPlanName),
      planType: shopifyPlanName,
      feeType: feeTypeForCatalogInterval(billingInterval),
      subscriptionGid: shopifySubscriptionId,
      currentPeriodEnd: period.currentPeriodEnd,
      hasUsedTrial: true,
      trialEndsAt: trialEndsAt ?? account.trialEndsAt,
      subscriptionCredits,
      ...aliasTotals({
        subscriptionCredits,
        purchasedCredits: account.purchasedCredits,
        trialCredits: account.trialCredits,
        usedCredits: account.usedCredits,
      }),
    },
  });

  if (wasPending) {
    await appendBillingLog({
      shop,
      eventType: BILLING_LOG_EVENT.SUBSCRIPTION_ACTIVATED,
      planKey,
      referenceId: shopifySubscriptionId,
      creditsDelta,
      metadata: {
        billingInterval,
        billingPeriodEnd: period.currentPeriodEnd?.toISOString() ?? null,
        grantKind: skipAdd ? "migration_assumed" : "shopify_period",
        creditCycleIndex,
      },
    });
    return { outcome: "activated" };
  }

  return { outcome: "updated" };
}

export async function cancelSubscription(params: {
  shop: string;
  shopifySubscriptionId: string;
  status: string;
}): Promise<{ cancelled: boolean }> {
  const sub = await prisma.appSubscription.findUnique({
    where: { shop: params.shop },
  });
  if (!sub || sub.shopifySubscriptionId !== params.shopifySubscriptionId) {
    return { cancelled: false };
  }

  const isTerminal =
    params.status === APP_SUBSCRIPTION_STATUS.CANCELLED ||
    params.status === APP_SUBSCRIPTION_STATUS.EXPIRED;
  if (!isTerminal) {
    await prisma.appSubscription.update({
      where: { shop: params.shop },
      data: { status: params.status },
    });
    return { cancelled: false };
  }

  await prisma.$transaction(async (tx) => {
    const account = await tx.account.findUnique({ where: { shop: params.shop } });
    const cleared = clearSubscriptionOnCancel({
      subscriptionCredits: account?.subscriptionCredits ?? 0,
      purchasedCredits: account?.purchasedCredits ?? 0,
      creditsPerPeriod: sub.creditsPerPeriod,
    });
    const previous = Math.max(0, account?.subscriptionCredits ?? 0);
    const removed = previous - cleared.subscriptionCredits;

    await tx.billingLog.create({
      data: {
        shop: params.shop,
        eventType: BILLING_LOG_EVENT.SUBSCRIPTION_CANCELLED,
        planKey: sub.planKey,
        referenceId: sub.shopifySubscriptionId,
        creditsDelta: -removed,
        metadata: {
          status: params.status,
          previousSubscriptionCredits: previous,
          cancelledAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    if (account) {
      await tx.account.update({
        where: { shop: params.shop },
        data: {
          plan: 1,
          planType: "Free",
          feeType: account.feeType,
          subscriptionGid: null,
          subscriptionCredits: cleared.subscriptionCredits,
          purchasedCredits: cleared.purchasedCredits,
          ...aliasTotals({
            subscriptionCredits: cleared.subscriptionCredits,
            purchasedCredits: cleared.purchasedCredits,
            trialCredits: account.trialCredits,
            usedCredits: account.usedCredits,
          }),
        },
      });
    }

    await tx.appSubscription.delete({ where: { shop: params.shop } });
  });

  return { cancelled: true };
}
