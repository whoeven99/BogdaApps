import type { Account, AppSubscription, Prisma } from "@prisma/client";
import prisma from "~/db.server";
import { settlePoolsAtRenewal, clearSubscriptionOnCancel } from "./accountBalance";
import { getAnnualCreditCycleIndex } from "./annualCreditCycle";
import { appendBillingLog, claimBillingLogFlag } from "./billingLog.server";
import {
  scheduleRenewalEmail,
  scheduleSubscribeEmail,
} from "./email/billingEmail.server";
import { shouldSendRenewalEmail } from "~/server/email/emailFormat";
import { JAVA_SNAPSHOT_SUBSCRIPTION_GID } from "./billingState";
import {
  grantBasicFirstPayBonusIfEligible,
  revokeBasicFirstPayBonusIfLeftBasic,
  revokeBasicFirstPayBonusNow,
} from "./grant/grantBasicFirstPayBonus.server";
import { expireInstallTrialCreditsIfDue } from "./grant/grantInstallCredits.server";
import {
  scheduleCancelFeishu,
  scheduleRenewalFeishu,
  scheduleSubscribeFeishu,
} from "./lifecycleFeishuNotify.server";
import { snapshotShopBilling } from "./snapshotShopBilling.server";
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

function isBasicPlanName(shopifyPlanName: string, planKey: string): boolean {
  return (
    shopifyPlanName.trim().toLowerCase() === "basic" ||
    planKey.trim().toLowerCase().startsWith("basic")
  );
}

async function maybeGrantBasicFirstPayBonus(
  shop: string,
  planKey: string,
  trialEndsAt: Date | null | undefined,
): Promise<void> {
  await revokeBasicFirstPayBonusIfLeftBasic(shop, planKey);
  const bonus = await grantBasicFirstPayBonusIfEligible({
    shop,
    planKey,
    trialEndsAt: trialEndsAt ?? null,
  });
  if (bonus.granted) {
    console.info(
      `[billing] basic first-pay bonus granted shop=${shop} planKey=${planKey}`,
    );
  }
}

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
  await expireInstallTrialCreditsIfDue(
    shop,
    new Date(),
    isBasicPlanName(next.shopifyPlanName, next.planKey) ? undefined : { forceLots: ["bonus"] },
  );
  const account = await prisma.account.findUniqueOrThrow({ where: { shop } });
  const settled = settlePoolsAtRenewal(account);
  const usedCredits = 0;
  const subscriptionCredits = next.creditsPerPeriod;

  const renewedLog = await appendBillingLog({
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
  await maybeGrantBasicFirstPayBonus(shop, next.planKey, subscription.trialEndsAt);
  scheduleRenewalFeishu({ shop, billingLogId: renewedLog.id });
  const renewalCountAfter = await prisma.billingLog.count({
    where: {
      shop,
      eventType: BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
      referenceId: subscription.shopifySubscriptionId,
    },
  });
  const priorRenewalCount = Math.max(0, renewalCountAfter - 1);
  const hadTrial = subscription.trialEndsAt != null;
  if (shouldSendRenewalEmail({ hadTrial, priorRenewalCount })) {
    if (await claimBillingLogFlag(renewedLog.id, "renewalEmailSent")) {
      scheduleRenewalEmail({
        shop,
        shopifyPlanName: next.shopifyPlanName,
        billingInterval: next.billingInterval,
        creditsPerPeriod: next.creditsPerPeriod,
      });
    }
  } else {
    console.info(
      `[imgEmail] renewal skipped shop=${shop} hadTrial=${hadTrial} prior=${priorRenewalCount}`,
    );
  }
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
    if (!skipAdd) {
      await maybeGrantBasicFirstPayBonus(shop, planKey, trialEndsAt);
    }
    const activatedCount = await prisma.billingLog.count({
      where: { shop, eventType: BILLING_LOG_EVENT.SUBSCRIPTION_ACTIVATED },
    });
    scheduleSubscribeFeishu({
      shop,
      inTrial: Boolean(trialEndsAt && trialEndsAt.getTime() > Date.now()),
      first: activatedCount <= 1,
    });
    if (!skipAdd) {
      scheduleSubscribeEmail({
        shop,
        shopifyPlanName,
        billingInterval,
        creditsPerPeriod,
        periodStart: period.currentPeriodStart,
        periodEnd: period.currentPeriodEnd,
      });
    }
    return { outcome: "activated" };
  }

  if (!skipAdd) {
    await maybeGrantBasicFirstPayBonus(shop, planKey, trialEndsAt);
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

  const snap = await snapshotShopBilling(params.shop);
  await revokeBasicFirstPayBonusNow(params.shop);

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

  scheduleCancelFeishu(snap);
  return { cancelled: true };
}
