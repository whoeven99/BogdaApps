import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import db from "../db.server";

/** Shopify `app_subscriptions/update` 的 JSON 体（节选） */
type AppSubscriptionsUpdatePayload = {
  app_subscription?: {
    admin_graphql_api_id?: string;
    name?: string;
    status?: string;
    admin_graphql_api_shop_id?: string;
    created_at?: string;
    updated_at?: string;
    currency?: string;
    price?: string;
    interval?: string;
    plan_handle?: string;
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { payload, topic, shop } = await authenticate.webhook(request);
  const body = payload as AppSubscriptionsUpdatePayload;
  const sub = body.app_subscription;
  const gid = sub?.admin_graphql_api_id?.trim();

  console.log(
    `[billing webhook] ${topic} shop=${shop} status=${sub?.status ?? "?"} id=${gid ?? "?"} name=${sub?.name ?? "?"}`,
  );

  if (!sub || !gid) {
    return new Response();
  }

  const status = sub.status?.trim() || "unknown";
  const now = new Date();

  const result = await db.billingInitLog.updateMany({
    where: {
      shopName: shop,
      shopifySubscriptionId: gid,
    },
    data: {
      subscriptionStatus: status,
      subscriptionStatusUpdatedAt: now,
    },
  });

  if (result.count === 0) {
    console.warn(
      `[billing webhook] no BillingInitLog matched shop=${shop} shopifySubscriptionId=${gid}`,
    );
  }

  return new Response();
};
