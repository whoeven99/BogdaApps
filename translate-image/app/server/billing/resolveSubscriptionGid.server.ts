import prisma from "~/db.server";
import type { ShopGraphqlClient } from "~/server/shop/appOnlyAdmin";
import { isRealShopifySubscriptionGid } from "./billingState";
import { fetchActiveSubscriptions } from "./reconcile.server";

export async function resolveCancelSubscriptionGid(
  shop: string,
  admin: ShopGraphqlClient,
): Promise<string | null> {
  const account = await prisma.account.findUnique({ where: { shop } });
  if (isRealShopifySubscriptionGid(account?.subscriptionGid)) {
    return account!.subscriptionGid;
  }
  try {
    const nodes = await fetchActiveSubscriptions(admin);
    const active = nodes.find((node) => String(node.status || "").toUpperCase() === "ACTIVE");
    const gid = String(active?.id || "");
    return isRealShopifySubscriptionGid(gid) ? gid : null;
  } catch (err) {
    console.warn(`[billing] resolve cancel gid failed shop=${shop}`, err);
    return null;
  }
}
