import { postShopGraphql } from "~/server/shop/shopAdminToken.server";
import { appendBillingLog, hasBillingLog } from "./billingLog.server";
import { decideChargeGrant, dollarsToCents, type ChargeGuardDecision } from "./chargeGuard";
import { loadAllowedChargeCents } from "./plans/planCatalog.server";
import { isProdTestBillingShop, shouldCreateTestCharge } from "./testBillingShop";
import { scheduleChargeGuardDeniedFeishu } from "./lifecycleFeishuNotify.server";
import { BILLING_LOG_EVENT } from "./types.server";

const DETAIL_TIMEOUT_MS = 2_500;

export type ShopifyMoney = {
  amount?: string | number | null;
  currencyCode?: string | null;
};

export type PurchaseChargeDetail = {
  test: boolean | null;
  amountCents: number | null;
  currencyCode: string | null;
};

export type SubscriptionChargeDetail = PurchaseChargeDetail & {
  interval: string | null;
  currentPeriodEnd: Date | null;
  createdAt: Date | null;
  trialDays: number;
};

function parseMoney(price: ShopifyMoney | null | undefined): {
  amountCents: number | null;
  currencyCode: string | null;
} {
  if (!price) return { amountCents: null, currencyCode: null };
  return {
    amountCents: dollarsToCents(price.amount ?? ""),
    currencyCode: price.currencyCode?.trim() || null,
  };
}

export function billingGuardEnv(): "test" | "prod" {
  const v = String(process.env.NODE_ENV || "").toLowerCase();
  return v === "prod" || v === "production" ? "prod" : "test";
}

export async function fetchShopEmailForChargeGuard(shop: string): Promise<string | null> {
  try {
    const body = await postShopGraphql({
      shop,
      path: "charge_guard",
      timeoutMs: DETAIL_TIMEOUT_MS,
      query: `query ShopEmailForChargeGuard { shop { email } }`,
    });
    const email = body?.data?.shop?.email;
    return typeof email === "string" && email.trim() ? email.trim() : null;
  } catch (err) {
    console.error(`[billing charge-guard] shop email failed shop=${shop}`, err);
    return null;
  }
}

export async function fetchPurchaseChargeDetail(
  shop: string,
  gid: string,
): Promise<PurchaseChargeDetail | null> {
  try {
    const body = await postShopGraphql({
      shop,
      path: "charge_guard",
      timeoutMs: DETAIL_TIMEOUT_MS,
      query: `query AppPurchaseOneTimeById($id: ID!) {
        node(id: $id) {
          ... on AppPurchaseOneTime {
            id name status test
            price { amount currencyCode }
          }
        }
      }`,
      variables: { id: gid },
    });
    const node = body?.data?.node;
    if (!node) return null;
    const money = parseMoney(node.price);
    return {
      test: typeof node.test === "boolean" ? node.test : null,
      amountCents: money.amountCents,
      currencyCode: money.currencyCode,
    };
  } catch (err) {
    console.error(`[billing charge-guard] purchase detail failed shop=${shop}`, err);
    return null;
  }
}

export function recurringPriceFromLineItems(
  lineItems:
    | Array<{
        plan?: { pricingDetails?: { interval?: string; price?: ShopifyMoney } };
      }>
    | null
    | undefined,
): { intervalRaw: string | null } & PurchaseChargeDetail {
  const priced = lineItems?.find((li) => li?.plan?.pricingDetails);
  const details = priced?.plan?.pricingDetails;
  const money = parseMoney(details?.price);
  return {
    intervalRaw: details?.interval ?? null,
    test: null,
    amountCents: money.amountCents,
    currencyCode: money.currencyCode,
  };
}

export async function fetchSubscriptionChargeDetail(
  shop: string,
  gid: string,
): Promise<SubscriptionChargeDetail | null> {
  try {
    const body = await postShopGraphql({
      shop,
      path: "charge_guard",
      timeoutMs: DETAIL_TIMEOUT_MS,
      query: `query AppSubscriptionById($id: ID!) {
        node(id: $id) {
          ... on AppSubscription {
            id status test currentPeriodEnd trialDays createdAt
            lineItems {
              plan {
                pricingDetails {
                  __typename
                  ... on AppRecurringPricing {
                    interval
                    price { amount currencyCode }
                  }
                }
              }
            }
          }
        }
      }`,
      variables: { id: gid },
    });
    const node = body?.data?.node;
    if (!node) return null;
    const priced = recurringPriceFromLineItems(node.lineItems);
    return {
      test: typeof node.test === "boolean" ? node.test : null,
      amountCents: priced.amountCents,
      currencyCode: priced.currencyCode,
      interval: priced.intervalRaw,
      currentPeriodEnd: node.currentPeriodEnd ? new Date(node.currentPeriodEnd) : null,
      createdAt: node.createdAt ? new Date(node.createdAt) : null,
      trialDays: Number(node.trialDays) || 0,
    };
  } catch (err) {
    console.error(`[billing charge-guard] subscription detail failed shop=${shop}`, err);
    return null;
  }
}

export async function persistChargeGuardDenied(params: {
  shop: string;
  gid: string;
  planKey?: string | null;
  reason: ChargeGuardDecision["reason"];
}): Promise<void> {
  if (
    await hasBillingLog(
      params.shop,
      BILLING_LOG_EVENT.CHARGE_GUARD_DENIED,
      params.gid,
    )
  ) {
    return;
  }
  await appendBillingLog({
    shop: params.shop,
    eventType: BILLING_LOG_EVENT.CHARGE_GUARD_DENIED,
    planKey: params.planKey ?? null,
    referenceId: params.gid,
    creditsDelta: 0,
    metadata: {
      chargeGuard: {
        reason: params.reason,
        notifiedAt: new Date().toISOString(),
      },
    },
  });
  scheduleChargeGuardDeniedFeishu({
    shop: params.shop,
    reason: params.reason,
    gid: params.gid,
  });
}

export async function evaluateChargeGuard(params: {
  shop: string;
  shopEmail?: string | null;
  test: boolean | null;
  amountCents: number | null;
  currencyCode: string | null;
  gid: string;
  planKey?: string | null;
}): Promise<{ allow: boolean; reason: ChargeGuardDecision["reason"] }> {
  const allowedCents = await loadAllowedChargeCents();
  const decision = decideChargeGrant({
    env: billingGuardEnv(),
    allowlisted: isProdTestBillingShop(params.shop, [params.shopEmail]),
    test: params.test,
    amountCents: params.amountCents,
    currencyCode: params.currencyCode,
    allowedCents,
  });
  if (decision.action === "deny") {
    await persistChargeGuardDenied({
      shop: params.shop,
      gid: params.gid,
      planKey: params.planKey,
      reason: decision.reason,
    });
    return { allow: false, reason: decision.reason };
  }
  return { allow: true, reason: decision.reason };
}

export async function resolveShouldCreateTestCharge(
  shop: string,
  sessionEmail?: string | null,
): Promise<boolean> {
  const shopEmail = await fetchShopEmailForChargeGuard(shop);
  return shouldCreateTestCharge(shop, [sessionEmail, shopEmail]);
}
