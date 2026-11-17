import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  InsertOrUpdateOrder,
  SendOneTimeBuySuccessEmail,
  SendSubscribeSuccessEmail,
  Uninstall,
} from "~/api/JavaServer";
import { grantCreditsOnce, markPlanCancelled, packCreditsForName, planGrantForName } from "~/server/billing/grants.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, admin, shop, session, payload } = await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    throw new Response();
  }

  console.log(`${shop} ${topic} webhooks: ${payload}`);

  switch (topic) {
    case "APP_UNINSTALLED":
      try {
        await Uninstall({ shop });
        if (session) await db.session.deleteMany({ where: { shop } });
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error APP_UNINSTALLED:", error);
        return new Response(null, { status: 200 });
      }
    case "APP_PURCHASES_ONE_TIME_UPDATE": {
      try {
        const purchase = payload?.app_purchase_one_time;
        if (purchase) {
          InsertOrUpdateOrder({
            shop,
            id: purchase.admin_graphql_api_id,
            status: purchase.status,
          });
          const credits = packCreditsForName(purchase.name);
          if (credits && purchase.status === "ACTIVE") {
            const granted = await grantCreditsOnce({
              shop,
              gid: purchase.admin_graphql_api_id,
              periodKey: "once",
              kind: "pack",
              credits,
            });
            if (granted) {
              SendOneTimeBuySuccessEmail({ shop, JSONData: JSON.stringify(payload) });
            }
          }
        }
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error APP_PURCHASES_ONE_TIME_UPDATE:", error);
        return new Response(null, { status: 200 });
      }
    }
    case "APP_SUBSCRIPTIONS_UPDATE":
      try {
        const purchase = payload.app_subscription;
        const status = purchase.status;
        const yearly = purchase.interval !== "every_30_days";
        InsertOrUpdateOrder({
          shop,
          id: purchase.admin_graphql_api_id,
          status: purchase.status,
        });
        if (status === "ACTIVE") {
          const plan = planGrantForName(purchase.name, yearly);
          if (plan) {
            const stamp = new Date(purchase.updated_at || purchase.created_at || Date.now());
            const periodKey = Number.isNaN(stamp.getTime())
              ? "active"
              : yearly
                ? `y-${stamp.getUTCFullYear()}`
                : `m-${stamp.toISOString().slice(0, 7)}`;
            const granted = await grantCreditsOnce({
              shop,
              gid: purchase.admin_graphql_api_id,
              periodKey,
              kind: "subscription",
              credits: plan.credits,
              plan: {
                plan: plan.plan,
                planType: plan.planType,
                feeType: yearly ? 1 : 0,
                subscriptionGid: purchase.admin_graphql_api_id,
              },
            });
            if (granted) {
              SendSubscribeSuccessEmail({ shop, JSONData: JSON.stringify(payload) });
            }
          }
        }
        if (status === "CANCELLED") {
          await markPlanCancelled(shop, yearly ? 1 : 0);
        }
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error APP_SUBSCRIPTIONS_UPDATE:", error);
        return new Response(null, { status: 200 });
      }
    case "SHOP_REDACT":
      try {
        await Uninstall({ shop });
        if (session) await db.session.deleteMany({ where: { shop } });
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error SHOP_REDACT:", error);
        return new Response(null, { status: 200 });
      }
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }
};
