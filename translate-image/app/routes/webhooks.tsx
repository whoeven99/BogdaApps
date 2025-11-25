import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  AddCharsByShopName,
  AddCharsByShopNameAfterSubscribe,
  AddSubscriptionQuotaRecord,
  InsertOrUpdateOrder,
  SendSubscribeSuccessEmail,
  StartFreePlan,
  Uninstall,
  UpdateStatus,
  UpdateUserPlan,
} from "~/api/JavaServer";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, admin, shop, session, payload } =
    await authenticate.webhook(request);
  console.log("webhook topic: ", topic);

  if (!admin && topic !== "SHOP_REDACT") {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    // The SHOP_REDACT webhook will be fired up to 48 hours after a shop uninstalls the app.
    // Because of this, no admin context is available.
    throw new Response();
  }
  try {
    // 验证 webhook 签名
    console.log("✅ Webhook received:", topic, shop);

    switch (topic) {
      case "APP_UNINSTALLED":
        try {
          await Uninstall({ shop });
          console.log("webhook session", session);

          if (session) {
            const res = await db.session.deleteMany({ where: { shop } });
            console.log("delete session", res);
          }
          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("Error APP_UNINSTALLED:", error);
          return new Response(null, { status: 200 });
        }
      case "APP_PURCHASES_ONE_TIME_UPDATE": {
        console.log("购买积分：", payload);

        if (payload?.app_purchase_one_time) {
          const purchase = payload.app_purchase_one_time;
          const name = purchase.name;
          const status = purchase.status;

          // 匹配积分套餐
          const priceMap: Record<string, { credits: number; price: number }> = {
            "50 extra times": { credits: 100000, price: 3.99 },
            "100 extra times": { credits: 200000, price: 7.99 },
            "200 extra times": { credits: 400000, price: 15.99 },
            "300 extra times": { credits: 600000, price: 23.99 },
            "500 extra times": { credits: 1000000, price: 39.99 },
            "1000 extra times": { credits: 2000000, price: 79.99 },
            "2000 extra times": { credits: 4000000, price: 159.99 },
            "3000 extra times": { credits: 6000000, price: 239.99 },
          };

          const plan = priceMap[name];
          if (plan && status === "ACTIVE") {
            const addChars = await AddCharsByShopName({
              shop,
              amount: plan.credits,
              gid: purchase.admin_graphql_api_id,
            });

            if (addChars?.success) {
              console.log(`✅ ${shop} 成功购买积分 ${plan.credits}`);
            } else {
              console.log(`❌ ${shop} 购买积分失败`);
            }
          }
        }

        // ✅ 一定要返回 200，否则 Shopify 会重试或标记 410
        return new Response("OK", { status: 200 });
      }
      case "APP_SUBSCRIPTIONS_UPDATE":
        try {
          const purchase = payload.app_subscription;
          const name = purchase.name;
          const status = purchase.status;
          let plan = 0;
          console.log("payload:", payload);

          switch (payload?.app_subscription.name) {
            case "Basic":
              plan = 2;
              break;
            case "Pro":
              plan = 3;
              break;
            case "Premium":
              plan = 4;
              break;
          }
          InsertOrUpdateOrder({
            shop: shop,
            id: payload?.app_subscription.admin_graphql_api_id,
            status: payload?.app_subscription.status,
          });
          if (status === "ACTIVE") {
            const addChars = await AddCharsByShopNameAfterSubscribe({
              shop,
              appSubscription: payload?.app_subscription.admin_graphql_api_id,
              feeType:
                payload?.app_subscription?.interval == "every_30_days" ? 0 : 1,
            });
            if (addChars?.success) {
              StartFreePlan({ shop });
              AddSubscriptionQuotaRecord({
                subscriptionId: payload?.app_subscription.admin_graphql_api_id,
              });
              UpdateUserPlan({
                shop,
                plan,
                feeType:
                  payload?.app_subscription?.interval == "every_30_days"
                    ? 0
                    : 1,
              });
              // UpdateStatus({ shop });
              // SendSubscribeSuccessEmail({
              //   id: payload?.app_subscription.admin_graphql_api_id,
              //   shopName: shop,
              //   feeType:
              //     payload?.app_subscription?.interval == "every_30_days"
              //       ? 1
              //       : 2,
              // });
            }
          }
          if (status === "CANCELLED") {
            UpdateUserPlan({
              shop,
              plan: 1,
              feeType:
                payload?.app_subscription?.interval == "every_30_days" ? 0 : 1,
            });
          }
          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("Error APP_SUBSCRIPTIONS_UPDATE:", error);
          return new Response(null, { status: 200 });
        }
      case "SHOP_REDACT":
        try {
          await Uninstall({ shop });
          if (session) {
            await db.session.deleteMany({ where: { shop } });
          }
          return new Response("OK", { status: 200 });
        } catch (error) {
          console.error("Error SHOP_REDACT:", error);
          return new Response(null, { status: 200 });
        }

      default:
        console.warn(" 未处理的 webhook topic:", topic);
        return new Response("Unhandled webhook topic", { status: 401 });
    }
  } catch (error: any) {
    console.error("❌ Webhook 处理失败:", error);
    return new Response();
  }
};
