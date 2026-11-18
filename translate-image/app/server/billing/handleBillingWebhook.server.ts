import prisma from "~/db.server";
import { resolveAmountUsd } from "./billingFeishuFormat";
import { computeTrialEndsAt } from "./billingState";
import { claimStaffFeishuSent } from "./billingLog.server";
import {
  billingGuardEnv,
  evaluateChargeGuard,
  fetchPurchaseChargeDetail,
  fetchShopEmailForChargeGuard,
  fetchSubscriptionChargeDetail,
} from "./chargeGuardApply.server";
import { applyTokenPackPurchase } from "./grants.server";
import { scheduleChargeGuardStaffFeishu } from "./lifecycleFeishuNotify.server";
import {
  catalogIntervalFromShopify,
  findPackPlanByName,
  findSubscriptionPlan,
} from "./plans/planCatalog.server";
import {
  applyActiveSubscription,
  cancelSubscription,
  isSubscriptionRenewal,
} from "./subscription.server";
import { APP_SUBSCRIPTION_STATUS, BILLING_INTERVAL } from "./types.server";

const DAY_MS = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS: Record<string, number> = {
  [BILLING_INTERVAL.MONTHLY]: 30,
  [BILLING_INTERVAL.ANNUAL]: 365,
};

type SubscriptionPayload = {
  admin_graphql_api_id?: string;
  name?: string;
  status?: string;
  interval?: string;
  updated_at?: string;
  created_at?: string;
};

type PurchasePayload = {
  admin_graphql_api_id?: string;
  name?: string;
  status?: string;
};

async function notifyStaffIfAllowlisted(params: {
  shop: string;
  gid: string;
  reason: string;
  shopEmail?: string | null;
  test: boolean | null;
  amountCents: number | null;
  currencyCode: string | null;
  shopifyPlanName: string;
}): Promise<void> {
  if (params.reason !== "staff_allowlist") return;
  if (!(await claimStaffFeishuSent(params.shop, params.gid))) return;
  scheduleChargeGuardStaffFeishu({
    env: billingGuardEnv(),
    shop: params.shop,
    shopEmail: params.shopEmail,
    test: params.test,
    shopifyPlanName: params.shopifyPlanName,
    amountCents: params.amountCents,
    currencyCode: params.currencyCode,
    gid: params.gid,
    reason: params.reason,
  });
}

export async function handleSubscriptionWebhook(params: {
  shop: string;
  payload: { app_subscription?: SubscriptionPayload } | null;
}): Promise<void> {
  const sub = params.payload?.app_subscription;
  const gid = sub?.admin_graphql_api_id;
  const status = String(sub?.status || "").toUpperCase();
  if (!gid || !status) return;

  if (status === APP_SUBSCRIPTION_STATUS.CANCELLED || status === APP_SUBSCRIPTION_STATUS.EXPIRED) {
    await cancelSubscription({
      shop: params.shop,
      shopifySubscriptionId: gid,
      status,
    });
    return;
  }

  if (status !== APP_SUBSCRIPTION_STATUS.ACTIVE) return;

  const [detail, existingSub, shopEmail] = await Promise.all([
    fetchSubscriptionChargeDetail(params.shop, gid),
    prisma.appSubscription.findUnique({ where: { shop: params.shop } }),
    fetchShopEmailForChargeGuard(params.shop),
  ]);

  const billingInterval = catalogIntervalFromShopify(
    detail?.interval ?? sub?.interval,
  );
  const plan = await findSubscriptionPlan({
    shopifyPlanName: sub?.name ?? "",
    billingInterval,
  });
  if (!plan) {
    console.warn(
      `[billing webhook] no subscription plan match shop=${params.shop} name=${sub?.name} interval=${billingInterval}`,
    );
    return;
  }

  const shopifyPlanName = plan.shopifyPlanName || sub?.name || plan.displayName;
  const renewal =
    Boolean(existingSub) &&
    existingSub?.shopifySubscriptionId === gid &&
    isSubscriptionRenewal(existingSub, detail?.currentPeriodEnd ?? null);
  const guard = await evaluateChargeGuard({
    shop: params.shop,
    shopEmail,
    test: detail?.test ?? null,
    amountCents: detail?.amountCents ?? null,
    currencyCode: detail?.currencyCode ?? null,
    gid,
    planKey: plan.planKey,
    shopifyPlanName,
    stage: renewal ? "renewal" : "subscribe",
  });
  if (!guard.allow) return;

  const currentPeriodEnd =
    detail?.currentPeriodEnd ??
    existingSub?.currentPeriodEnd ??
    new Date(Date.now() + (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS);
  const currentPeriodStart = new Date(
    currentPeriodEnd.getTime() - (INTERVAL_DAYS[billingInterval] ?? 30) * DAY_MS,
  );
  const trialEndsAtIso = computeTrialEndsAt(detail?.createdAt, detail?.trialDays);
  const trialEndsAt = trialEndsAtIso
    ? new Date(trialEndsAtIso)
    : detail && detail.trialDays > 0 && detail.createdAt
      ? new Date(detail.createdAt.getTime() + detail.trialDays * DAY_MS)
      : null;

  const applied = await applyActiveSubscription({
    shop: params.shop,
    shopifySubscriptionId: gid,
    planKey: plan.planKey,
    shopifyPlanName,
    billingInterval,
    creditsPerPeriod: plan.credits,
    trialEndsAt,
    period: { currentPeriodStart, currentPeriodEnd },
    rawPayload: (params.payload ?? undefined) as Record<string, unknown> | undefined,
    existingSubscription: existingSub,
  });
  if (applied.outcome === "activated" || applied.outcome === "renewed") {
    await notifyStaffIfAllowlisted({
      shop: params.shop,
      gid,
      reason: guard.reason,
      shopEmail,
      test: detail?.test ?? null,
      amountCents: detail?.amountCents ?? null,
      currencyCode: detail?.currencyCode ?? null,
      shopifyPlanName,
    });
  }
}

export async function handlePurchaseWebhook(params: {
  shop: string;
  payload: { app_purchase_one_time?: PurchasePayload } | null;
}): Promise<void> {
  const purchase = params.payload?.app_purchase_one_time;
  const gid = purchase?.admin_graphql_api_id;
  if (!gid || String(purchase?.status || "").toUpperCase() !== "ACTIVE") return;

  const plan = await findPackPlanByName(purchase?.name ?? "");
  if (!plan) {
    console.warn(
      `[billing webhook] no pack plan match shop=${params.shop} name=${purchase?.name}`,
    );
    return;
  }

  const [purchaseDetail, shopEmail] = await Promise.all([
    fetchPurchaseChargeDetail(params.shop, gid),
    fetchShopEmailForChargeGuard(params.shop),
  ]);
  const shopifyPlanName = plan.shopifyPlanName || purchase?.name || plan.displayName;
  const guard = await evaluateChargeGuard({
    shop: params.shop,
    shopEmail,
    test: purchaseDetail?.test ?? null,
    amountCents: purchaseDetail?.amountCents ?? null,
    currencyCode: purchaseDetail?.currencyCode ?? null,
    gid,
    planKey: plan.planKey,
    shopifyPlanName,
    stage: "purchase",
  });
  if (!guard.allow) return;

  const granted = await applyTokenPackPurchase({
    shop: params.shop,
    plan,
    shopifyPurchaseId: gid,
    amountUsd: resolveAmountUsd(purchaseDetail?.amountCents, plan.priceAmount),
  });
  if (granted) {
    await notifyStaffIfAllowlisted({
      shop: params.shop,
      gid,
      reason: guard.reason,
      shopEmail,
      test: purchaseDetail?.test ?? null,
      amountCents: purchaseDetail?.amountCents ?? null,
      currencyCode: purchaseDetail?.currencyCode ?? null,
      shopifyPlanName,
    });
  }
}
