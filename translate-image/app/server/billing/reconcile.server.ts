import prisma from "~/db.server";
import type { ShopGraphqlClient } from "~/server/shop/appOnlyAdmin";
import { computeTrialEndsAt } from "./billingState";
import { grantCreditsOnce, markPlanCancelled, planGrantForName } from "./grants.server";
import { ensureAccount } from "./quota.server";

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

function isYearly(node: ActiveSubscriptionNode): boolean {
  const interval = node.lineItems?.[0]?.plan?.pricingDetails?.interval;
  return interval === "ANNUAL";
}

function subscriptionPeriodKey(node: ActiveSubscriptionNode, yearly: boolean): string {
  const stamp = new Date(node.createdAt || Date.now());
  if (Number.isNaN(stamp.getTime())) return "active";
  return yearly ? `y-${stamp.getUTCFullYear()}` : `m-${stamp.toISOString().slice(0, 7)}`;
}

export async function fetchActiveSubscriptions(
  admin: ShopGraphqlClient,
): Promise<ActiveSubscriptionNode[]> {
  const response = await admin.graphql(RECONCILE_QUERY);
  const json = await response.json();
  const nodes = json?.data?.currentAppInstallation?.activeSubscriptions;
  return Array.isArray(nodes) ? nodes : [];
}

export async function reconcileShopBilling(
  shop: string,
  admin: ShopGraphqlClient,
): Promise<void> {
  try {
    await ensureAccount(shop);
    const nodes = await fetchActiveSubscriptions(admin);
    const active = nodes.filter((node) => String(node.status || "").toUpperCase() === "ACTIVE");
    if (active.length === 0) {
      const account = await prisma.account.findUnique({ where: { shop } });
      if (account && account.plan > 1) {
        await markPlanCancelled(shop, account.feeType);
      }
      return;
    }
    for (const node of active) {
      const gid = String(node.id || "");
      const name = String(node.name || "");
      if (!gid || !name) continue;
      const yearly = isYearly(node);
      const plan = planGrantForName(name, yearly);
      if (!plan) continue;
      const trialEndsAtIso = computeTrialEndsAt(node.createdAt, node.trialDays);
      await grantCreditsOnce({
        shop,
        gid,
        periodKey: subscriptionPeriodKey(node, yearly),
        kind: "subscription",
        credits: plan.credits,
        plan: {
          plan: plan.plan,
          planType: plan.planType,
          feeType: yearly ? 1 : 0,
          subscriptionGid: gid,
          currentPeriodEnd: node.currentPeriodEnd ? new Date(node.currentPeriodEnd) : null,
          hasUsedTrial: true,
          trialEndsAt: trialEndsAtIso ? new Date(trialEndsAtIso) : null,
        },
      });
    }
  } catch (err) {
    console.warn(`[billing] reconcile skipped shop=${shop}`, err);
  }
}
