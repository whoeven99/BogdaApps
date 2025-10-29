import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { AddCharsByShopName } from "~/api/JavaServer";
export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { accessToken } = adminAuthResult.session;
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  if (!admin && topic !== "SHOP_REDACT") {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    // The SHOP_REDACT webhook will be fired up to 48 hours after a shop uninstalls the app.
    // Because of this, no admin context is available.
    throw new Response();
  }

  console.log(`${shop} ${topic} webhooks: ${payload}`);

  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  switch (topic) {
    case "app_purchases_one_time/update":
      try {
        console.log('购买积分：',payload);
        
        if (payload) {
          new Response(null, { status: 200 });
          let credits = 0;
          let price = 0;
          switch (payload?.app_purchase_one_time.name) {
            case "500K Credits":
              credits = 500000;
              price = 3.99;
              break;
            case "1M Credits":
              credits = 1000000;
              price = 7.99;
              break;
            case "2M Credits":
              credits = 2000000;
              price = 15.99;
              break;
            case "3M Credits":
              credits = 3000000;
              price = 23.99;
              break;
            case "5M Credits":
              credits = 5000000;
              price = 39.99;
              break;
            case "10M Credits":
              credits = 10000000;
              price = 79.99;
              break;
            case "20M Credits":
              credits = 20000000;
              price = 159.99;
              break;
            case "30M Credits":
              credits = 30000000;
              price = 239.99;
              break;
          }
          //   InsertOrUpdateOrder({
          //     shop: shop,
          //     id: payload?.app_purchase_one_time.admin_graphql_api_id,
          //     status: payload?.app_purchase_one_time.status,
          //   });
          if (payload?.app_purchase_one_time.status === "ACTIVE") {
            const addChars = await AddCharsByShopName({
              shop,
              amount: credits,
              gid: payload?.app_purchase_one_time.admin_graphql_api_id,
              accessToken: accessToken as string,
            });
            console.log("addChars: ", addChars);
            if (addChars?.success) {
              console.log("成功购买积分");
            } else {
              console.log("购买积分失败");
            }
            // if (addChars?.success) {
            //   UpdateStatus({ shop });
            //   SendPurchaseSuccessEmail({
            //     shop,
            //     credit: credits,
            //     price: price,
            //   });
            // } else {
            //   console.error("addChars error! ! ! ");
            // }
          }
        }
        break;
      } catch (error) {
        console.error("Error processing purchase:", error);
        return new Response(null, { status: 200 });
      }
    default:
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
