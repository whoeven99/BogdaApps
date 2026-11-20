import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { cancelShopifySubscriptionsBestEffort } from "../server/billing/cancelShopifySubscriptions.server";
import { schedulePurchaseNotify } from "../server/billing/purchaseNotify.server";
import { applySubscriptionWebhook, clearLocalSubscription } from "../server/billing/subscription.server";
import { CREDIT_PACKS, grantPurchasedCredits } from "../server/billing/quota.server";
import { markShopJobsStopped } from "../server/generateJob/job.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (!admin && topic !== "SHOP_REDACT" && topic !== "APP_SUBSCRIPTIONS_UPDATE") {
    return new Response();
  }

  switch (topic) {
    case "APP_UNINSTALLED":
      try {
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        await markShopJobsStopped(shop);
        await clearLocalSubscription(shop);
        await db.account.updateMany({
          where: { shop },
          data: { deletedAt: new Date() },
        });
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error APP_UNINSTALLED:", error);
        return new Response(null, { status: 200 });
      }
    case "APP_PURCHASES_ONE_TIME_UPDATE":
      try {
        if (payload) {
          const purchase = payload.app_purchase_one_time as {
            name?: string;
            status?: string;
            admin_graphql_api_id?: string;
          };
          const pack = purchase?.name ? CREDIT_PACKS[purchase.name] : undefined;
          if (purchase?.status === "ACTIVE" && pack && purchase.admin_graphql_api_id) {
            const granted = await grantPurchasedCredits({
              shop,
              amount: pack.credits,
              uniqueKey: purchase.admin_graphql_api_id,
              metadata: JSON.stringify({ name: purchase.name, price: pack.price }),
            });
            if (granted) {
              schedulePurchaseNotify({
                shop,
                credits: pack.credits,
                amountUsd: pack.price,
              });
            }
          } else if (!pack) {
            console.error("Unknown credit pack name", purchase?.name);
          }
        }
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error APP_PURCHASES_ONE_TIME_UPDATE", error);
        return new Response(null, { status: 200 });
      }
    case "APP_SUBSCRIPTIONS_UPDATE":
      try {
        if (payload) {
          const sub = payload.app_subscription as {
            name?: string;
            status?: string;
            admin_graphql_api_id?: string;
          };
          await applySubscriptionWebhook({
            shop,
            name: sub?.name,
            status: sub?.status,
            subscriptionId: sub?.admin_graphql_api_id,
          });
        }
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error APP_SUBSCRIPTIONS_UPDATE", error);
        return new Response(null, { status: 200 });
      }
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
      return new Response(null, { status: 200 });
    case "SHOP_REDACT":
      try {
        await markShopJobsStopped(shop);
        await db.account.updateMany({
          where: { shop, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        await cancelShopifySubscriptionsBestEffort(shop);
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error SHOP_REDACT:", error);
        return new Response(null, { status: 200 });
      }
    default:
      return new Response("Unhandled webhook topic", { status: 404 });
  }
};
