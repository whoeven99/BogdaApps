import prisma from "~/db.server";
import type { ShopGraphqlClient } from "~/server/shop/appOnlyAdmin";
import {
  collectGrantedAnnualCreditCycleIndexes,
  decideAnnualCreditGrant,
  getAnnualCreditWindow,
} from "./annualCreditCycle";
import { settlePoolsAtRenewal } from "./accountBalance";
import { appendBillingLog } from "./billingLog.server";
import { isRealShopifySubscriptionGid } from "./billingState";
import {
  catalogIntervalFromShopify,
  findSubscriptionPlan,
} from "./plans/planCatalog.server";
import { scheduleAnnualCreditFeishu } from "./lifecycleFeishuNotify.server";
import { applyActiveSubscription, cancelSubscription } from "./subscription.server";
import { BILLING_INTERVAL, BILLING_LOG_EVENT } from "./types.server";

const RECONCILE_QUERY = `#graphql
  query BillingReconcile {
    currentAppInstallation {
      activeSubscriptions {
        id
        name
        status
        createdAt
        currentPeriodEnd
        trialDays
        lineItems {
          plan {
            pricingDetails {
              __typename
              ... on AppRecurringPricing {
                interval
              }
            }
          }
        }
      }
    }
  }
`;

type RecurringInterval = "ANNUAL" | "EVERY_30_DAYS";

type ActiveSubscriptionNode = {
  id?: string;
  name?: string;
  status?: string;
  createdAt?: string;
  currentPeriodEnd?: string | null;
  trialDays?: number | null;
  lineItems?: Array<{
    plan?: {
      pricingDetails?: {
        interval?: RecurringInterval;
      };
    };
  }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isYearly(node: ActiveSubscriptionNode): boolean {
  const interval = node.lineItems?.[0]?.plan?.pricingDetails?.interval;
  return interval === "ANNUAL";
}

export async function fetchActiveSubscriptions(
  admin: ShopGraphqlClient,
): Promise<ActiveSubscriptionNode[]> {
  const response = await admin.graphql(RECONCILE_QUERY);
  const json = await response.json();
  const nodes = json?.data?.currentAppInstallation?.activeSubscriptions;
  return Array.isArray(nodes) ? nodes : [];
}

async function maybeGrantAnnualCycle(shop: string): Promise<void> {
  const local = await prisma.appSubscription.findUnique({ where: { shop } });
  if (!local || local.billingInterval !== BILLING_INTERVAL.ANNUAL) return;
  if (!local.currentPeriodEnd) return;

  const logs = await prisma.billingLog.findMany({
    where: {
      shop,
      referenceId: local.shopifySubscriptionId,
      eventType: {
        in: [
          BILLING_LOG_EVENT.SUBSCRIPTION_ACTIVATED,
          BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
        ],
      },
    },
    select: { eventType: true, metadata: true },
  });
  const granted = collectGrantedAnnualCreditCycleIndexes(logs, local.currentPeriodEnd);
  const decision = decideAnnualCreditGrant({
    now: new Date(),
    currentPeriodEnd: local.currentPeriodEnd,
    grantedCycleIndexes: granted,
  });

  if (decision.action === "skip" && decision.reason === "migration_assumed_granted") {
    if (granted.includes(decision.currentCycleIndex)) return;
    const window = getAnnualCreditWindow(local.currentPeriodEnd, decision.currentCycleIndex);
    await appendBillingLog({
      shop,
      eventType: BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
      planKey: local.planKey,
      referenceId: local.shopifySubscriptionId,
      creditsDelta: 0,
      metadata: {
        grantKind: "migration_assumed",
        creditCycleIndex: decision.currentCycleIndex,
        billingPeriodEnd: local.currentPeriodEnd.toISOString(),
        creditWindowStart: window.start.toISOString(),
        creditWindowEnd: window.end.toISOString(),
        source: "reconcile",
      },
    });
    return;
  }

  if (decision.action !== "grant") return;

  const account = await prisma.account.findUniqueOrThrow({ where: { shop } });
  const settled = settlePoolsAtRenewal(account);
  const window = getAnnualCreditWindow(local.currentPeriodEnd, decision.creditCycleIndex);
  const grantedLog = await appendBillingLog({
    shop,
    eventType: BILLING_LOG_EVENT.SUBSCRIPTION_RENEWED,
    planKey: local.planKey,
    referenceId: local.shopifySubscriptionId,
    creditsDelta: local.creditsPerPeriod,
    usedCredits: account.usedCredits,
    metadata: {
      grantKind: "annual_credit_cycle",
      creditCycleIndex: decision.creditCycleIndex,
      billingPeriodEnd: local.currentPeriodEnd.toISOString(),
      previousPeriodEnd: local.currentPeriodEnd.toISOString(),
      nextPeriodEnd: local.currentPeriodEnd.toISOString(),
      creditWindowStart: window.start.toISOString(),
      creditWindowEnd: window.end.toISOString(),
      source: "reconcile",
    },
  });
  await prisma.account.update({
    where: { shop },
    data: {
      usedCredits: 0,
      usedPoints: 0,
      subscriptionCredits: local.creditsPerPeriod,
      purchasedCredits: settled.purchasedCredits,
      trialCredits: settled.trialCredits,
      purchasePoints:
        local.creditsPerPeriod + settled.purchasedCredits + settled.trialCredits,
    },
  });
  if (local.creditsPerPeriod > 0) {
    scheduleAnnualCreditFeishu({
      shop,
      billingLogId: grantedLog.id,
      creditCycleIndex: decision.creditCycleIndex,
    });
  }
}

export async function reconcileShopBilling(
  shop: string,
  admin: ShopGraphqlClient,
): Promise<void> {
  try {
    const nodes = await fetchActiveSubscriptions(admin);
    const active = nodes.filter((node) => String(node.status || "").toUpperCase() === "ACTIVE");
    if (active.length === 0) {
      const account = await prisma.account.findUnique({ where: { shop } });
      const local = await prisma.appSubscription.findUnique({ where: { shop } });
      const gid = local?.shopifySubscriptionId || account?.subscriptionGid || "";
      if (gid && isRealShopifySubscriptionGid(gid)) {
        await cancelSubscription({
          shop,
          shopifySubscriptionId: gid,
          status: "CANCELLED",
        });
      }
      return;
    }

    for (const node of active) {
      const gid = String(node.id || "");
      const name = String(node.name || "");
      if (!gid || !name) continue;
      const billingInterval = catalogIntervalFromShopify(
        isYearly(node) ? "ANNUAL" : "EVERY_30_DAYS",
      );
      const plan = await findSubscriptionPlan({
        shopifyPlanName: name,
        billingInterval,
      });
      if (!plan) continue;
      const currentPeriodEnd = node.currentPeriodEnd
        ? new Date(node.currentPeriodEnd)
        : null;
      const spanDays = billingInterval === BILLING_INTERVAL.ANNUAL ? 365 : 30;
      const currentPeriodStart = currentPeriodEnd
        ? new Date(currentPeriodEnd.getTime() - spanDays * DAY_MS)
        : null;
      const existingSubscription = await prisma.appSubscription.findUnique({
        where: { shop },
      });
      await applyActiveSubscription({
        shop,
        shopifySubscriptionId: gid,
        planKey: plan.planKey,
        shopifyPlanName: plan.shopifyPlanName || name,
        billingInterval,
        creditsPerPeriod: plan.credits,
        trialEndsAt: null,
        period: { currentPeriodStart, currentPeriodEnd },
        existingSubscription,
      });
      await maybeGrantAnnualCycle(shop);
    }
  } catch (err) {
    console.warn(`[billing] reconcile skipped shop=${shop}`, err);
  }
}
