import type { Account } from "@prisma/client";
import prisma from "~/db.server";
import { getRemainingCredits, hasMigratedPools } from "./accountBalance";
import {
  emptyShopBillingSnapshot,
  type ShopBillingFeishuSnapshot,
} from "./billingFeishuFormat";
import { APP_SUBSCRIPTION_STATUS, BILLING_INTERVAL } from "./types.server";

function intervalLabel(interval: string | null | undefined): string {
  if (interval === BILLING_INTERVAL.MONTHLY) return "月付";
  if (interval === BILLING_INTERVAL.ANNUAL) return "年付";
  return "—";
}

function quotaFromAccount(
  account: Account | null,
): Pick<
  ShopBillingFeishuSnapshot,
  | "remainingCredits"
  | "totalCredits"
  | "usedCredits"
  | "subscriptionCredits"
  | "purchasedCredits"
  | "trialCredits"
> {
  if (!account) {
    return {
      remainingCredits: null,
      totalCredits: null,
      usedCredits: null,
      subscriptionCredits: null,
      purchasedCredits: null,
      trialCredits: null,
    };
  }
  if (hasMigratedPools(account)) {
    const subscriptionCredits = Math.max(0, account.subscriptionCredits | 0);
    const purchasedCredits = Math.max(0, account.purchasedCredits | 0);
    const trialCredits = Math.max(0, account.trialCredits | 0);
    return {
      remainingCredits: getRemainingCredits(account),
      totalCredits: subscriptionCredits + purchasedCredits + trialCredits,
      usedCredits: Math.max(0, account.usedCredits | 0),
      subscriptionCredits,
      purchasedCredits,
      trialCredits,
    };
  }
  const totalCredits = Math.max(0, Number(account.purchasePoints ?? 0));
  const usedCredits = Math.max(0, Number(account.usedPoints ?? 0));
  return {
    remainingCredits: Math.max(0, totalCredits - usedCredits),
    totalCredits,
    usedCredits,
    subscriptionCredits: null,
    purchasedCredits: null,
    trialCredits: null,
  };
}

/**
 * 只读计费快照。不建 Account、不过期试用。
 */
export async function snapshotShopBilling(
  shop: string,
): Promise<ShopBillingFeishuSnapshot> {
  const empty = emptyShopBillingSnapshot(shop);
  try {
    const [sub, account] = await Promise.all([
      prisma.appSubscription.findUnique({ where: { shop } }).catch((err) => {
        console.warn(`[billing snapshot] AppSubscription failed shop=${shop}`, err);
        return null;
      }),
      prisma.account.findUnique({ where: { shop } }).catch((err) => {
        console.warn(`[billing snapshot] Account failed shop=${shop}`, err);
        return null;
      }),
    ]);

    let planName = account?.planType?.trim() || "Free";
    let subscribed = false;
    let status: string | null = null;
    let billingInterval: string | null = null;

    if (sub) {
      status = sub.status;
      billingInterval = sub.billingInterval;
      subscribed = sub.status === APP_SUBSCRIPTION_STATUS.ACTIVE;
      try {
        const catalog = await prisma.planCatalog.findUnique({
          where: { planKey: sub.planKey },
        });
        planName =
          catalog?.shopifyPlanName?.trim() ||
          catalog?.displayName?.trim() ||
          sub.planKey ||
          planName;
      } catch (err) {
        console.warn(`[billing snapshot] PlanCatalog failed shop=${shop}`, err);
        planName = sub.planKey || planName;
      }
      if (!subscribed) {
        planName = `${planName}（${sub.status}）`;
      }
    }

    return {
      shop,
      subscribed,
      planName,
      status,
      billingInterval,
      billingIntervalLabel: intervalLabel(billingInterval),
      ...quotaFromAccount(account),
    };
  } catch (err) {
    console.warn(`[billing snapshot] failed shop=${shop}`, err);
    return empty;
  }
}
