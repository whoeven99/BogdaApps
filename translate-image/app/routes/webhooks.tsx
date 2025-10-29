import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { AddCharsByShopName } from "~/api/JavaServer";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // 验证 webhook 签名
    const { topic, shop, payload } = await authenticate.webhook(request);
    console.log("✅ Webhook received:", topic, shop);

    switch (topic) {
      case "app_purchases_one_time/update": {
        console.log("购买积分：", payload);

        if (payload?.app_purchase_one_time) {
          const purchase = payload.app_purchase_one_time;
          const name = purchase.name;
          const status = purchase.status;

          // 匹配积分套餐
          const priceMap: Record<string, { credits: number; price: number }> = {
            "500K Credits": { credits: 500000, price: 3.99 },
            "1M Credits": { credits: 1000000, price: 7.99 },
            "2M Credits": { credits: 2000000, price: 15.99 },
            "3M Credits": { credits: 3000000, price: 23.99 },
            "5M Credits": { credits: 5000000, price: 39.99 },
            "10M Credits": { credits: 10000000, price: 79.99 },
            "20M Credits": { credits: 20000000, price: 159.99 },
            "30M Credits": { credits: 30000000, price: 239.99 },
          };

          const plan = priceMap[name];
          if (plan && status === "ACTIVE") {
            const addChars = await AddCharsByShopName({
              shop,
              amount: plan.credits,
              gid: purchase.admin_graphql_api_id,
              accessToken: purchase.accessToken,
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

      default:
        console.warn("⚠️ 未处理的 webhook topic:", topic);
        return new Response("Unhandled webhook topic", { status: 200 });
    }
  } catch (error) {
    console.error("❌ Webhook 处理失败:", error);
    return new Response("Internal error", { status: 500 });
  }
};
