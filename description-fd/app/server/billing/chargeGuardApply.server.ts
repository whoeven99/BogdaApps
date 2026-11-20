import prisma from "../../db.server";
import { fetchShopContact } from "../shop/fetchShopContact.server";
import { shopAdminGraphqlJson } from "../shopify/shopAdminToken.server";
import {
  billingGuardEnv,
  decideChargeGrant,
  type ChargeGuardDecision,
} from "./chargeGuard";
import { isProdTestBillingShop } from "./testBillingShop";

export const CHARGE_GUARD_DENIED = "CHARGE_GUARD_DENIED";

const PURCHASE_TEST_QUERY = `#graphql
  query AppPurchaseOneTimeTest($id: ID!) {
    node(id: $id) {
      ... on AppPurchaseOneTime {
        id
        test
      }
    }
  }
`;

export async function fetchPurchaseTestFlag(
  shop: string,
  gid: string,
): Promise<boolean | null> {
  try {
    const json = await shopAdminGraphqlJson<{
      data?: { node?: { test?: boolean } | null };
    }>(shop, PURCHASE_TEST_QUERY, { id: gid });
    const test = json.data?.node?.test;
    return typeof test === "boolean" ? test : null;
  } catch (error) {
    console.error(`[billing charge-guard] purchase test failed shop=${shop}`, error);
    return null;
  }
}

export async function persistChargeGuardDenied(params: {
  shop: string;
  gid: string;
  reason: ChargeGuardDecision["reason"];
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const existing = await tx.billingLog.findUnique({
      where: { shop_uniqueKey: { shop: params.shop, uniqueKey: params.gid } },
      select: { id: true },
    });
    if (existing) return;
    await tx.account.upsert({
      where: { shop: params.shop },
      create: { shop: params.shop },
      update: {},
    });
    await tx.billingLog.create({
      data: {
        shop: params.shop,
        kind: CHARGE_GUARD_DENIED,
        amount: 0,
        uniqueKey: params.gid,
        metadata: JSON.stringify({ reason: params.reason }),
      },
    });
  });
}

export async function allowPurchasedCreditGrant(params: {
  shop: string;
  gid: string;
}): Promise<boolean> {
  const [test, contact] = await Promise.all([
    fetchPurchaseTestFlag(params.shop, params.gid),
    fetchShopContact(params.shop),
  ]);
  const decision = decideChargeGrant({
    env: billingGuardEnv(),
    allowlisted: isProdTestBillingShop(params.shop, [contact.email]),
    test,
  });
  if (decision.action !== "deny") return true;
  await persistChargeGuardDenied({
    shop: params.shop,
    gid: params.gid,
    reason: decision.reason,
  });
  console.error(
    `[billing charge-guard] deny shop=${params.shop} gid=${params.gid} reason=${decision.reason}`,
  );
  return false;
}
