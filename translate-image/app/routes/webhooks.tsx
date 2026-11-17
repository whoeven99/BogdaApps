import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { grantCreditsOnce, markPlanCancelled, packCreditsForName, planGrantForName } from "~/server/billing/grants.server";
import { handleAppUninstalled, handleShopRedact } from "~/server/billing/uninstall.server";
import { loadSubscriptionTrial } from "~/server/billing/subscriptionNode.server";
import { getShopAdmin } from "~/server/shop/shopAdminToken.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, admin, shop, session, payload } = await authenticate.webhook(request);

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
      try {
        const purchase = payload?.app_purchase_one_time;
        if (purchase?.status === "ACTIVE") {
          const credits = packCreditsForName(purchase.name);
          if (credits) {
            await grantCreditsOnce({
              shop,
              gid: purchase.admin_graphql_api_id,
              periodKey: "once",
              kind: "pack",
              credits,
            });
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
        const gid = purchase.admin_graphql_api_id;
        if (status === "ACTIVE") {
          const plan = planGrantForName(purchase.name, yearly);
          if (plan) {
            const stamp = new Date(purchase.updated_at || purchase.created_at || Date.now());
            const periodKey = Number.isNaN(stamp.getTime())
              ? "active"
              : yearly
                ? `y-${stamp.getUTCFullYear()}`
                : `m-${stamp.toISOString().slice(0, 7)}`;
            let trialEndsAt: Date | null = null;
            let currentPeriodEnd: Date | null = null;
            try {
              const shopAdmin = getShopAdmin({ shop, path: "billing.subscriptionNode" });
              const trial = await loadSubscriptionTrial(shopAdmin, gid);
              trialEndsAt = trial.trialEndsAt;
              currentPeriodEnd = trial.currentPeriodEnd;
            } catch (error) {
              console.warn(`${shop} load subscription trial skipped`, error);
            }
            await grantCreditsOnce({
              shop,
              gid,
              periodKey,
              kind: "subscription",
              credits: plan.credits,
              plan: {
                plan: plan.plan,
                planType: plan.planType,
                feeType: yearly ? 1 : 0,
                subscriptionGid: gid,
                currentPeriodEnd,
                hasUsedTrial: true,
                trialEndsAt,
              },
            });
          }
        }
        if (status === "CANCELLED" || status === "EXPIRED") {
          await markPlanCancelled(shop, yearly ? 1 : 0);
        }
        return new Response("OK", { status: 200 });
      } catch (error) {
        console.error("Error APP_SUBSCRIPTIONS_UPDATE:", error);
        return new Response(null, { status: 200 });
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
