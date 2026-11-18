import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  handlePurchaseWebhook,
  handleSubscriptionWebhook,
} from "~/server/billing/handleBillingWebhook.server";
import { handleAppUninstalled, handleShopRedact } from "~/server/billing/uninstall.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, admin, shop, payload } = await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT" && topic !== "APP_SCOPES_UPDATE") {
    throw new Response();
  }

  console.log(`${shop} ${topic} webhooks: ${payload}`);

  switch (topic) {
    case "APP_SCOPES_UPDATE":
      try {
        const current = String(
          (payload as { current?: unknown } | null)?.current ?? "",
        );
        if (current) {
          await db.session.updateMany({
            where: { shop },
            data: { scope: current },
          });
        }
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error APP_SCOPES_UPDATE:", error);
        return new Response(null, { status: 200 });
      }
    case "APP_UNINSTALLED":
      try {
        await handleAppUninstalled(shop);
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error APP_UNINSTALLED:", error);
        return new Response(null, { status: 200 });
      }
    case "APP_PURCHASES_ONE_TIME_UPDATE": {
      void handlePurchaseWebhook({ shop, payload }).catch((error) => {
        console.error("Error APP_PURCHASES_ONE_TIME_UPDATE:", error);
      });
      return new Response("OK", { status: 200 });
    }
    case "APP_SUBSCRIPTIONS_UPDATE": {
      void handleSubscriptionWebhook({ shop, payload }).catch((error) => {
        console.error("Error APP_SUBSCRIPTIONS_UPDATE:", error);
      });
      return new Response("OK", { status: 200 });
    }
    case "SHOP_REDACT":
      try {
        await handleShopRedact(shop);
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error SHOP_REDACT:", error);
        return new Response(null, { status: 200 });
      }
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }
};
