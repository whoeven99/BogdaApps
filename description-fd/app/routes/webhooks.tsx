import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import {
  InsertOrUpdateOrder,
  SendAPGPurchaseEmail,
  StopBatchGenerateDescription,
  UpdateUserToken,
} from "app/api/JavaServer";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, session, admin, payload } =
    await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  if (!admin && topic !== "SHOP_REDACT") {
    // The admin context isn't returned if the webhook fired after a shop was uninstalled.
    // The SHOP_REDACT webhook will be fired up to 48 hours after a shop uninstalls the app.
    // Because of this, no admin context is available.
    return new Response();
  }

  // The topics handled here should be declared in the shopify.app.toml.
  // More info: https://shopify.dev/docs/apps/build/cli-for-apps/app-configuration
  switch (topic) {
    case "APP_UNINSTALLED":
      try {
        if (session) {
          await db.session.deleteMany({ where: { shop } });
        }
        await StopBatchGenerateDescription({ shop });
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error APP_UNINSTALLED:", error);
        return new Response(null, { status: 200 });
      }
    case "APP_PURCHASES_ONE_TIME_UPDATE":
      try {
        if (payload) {
          console.log("APP_PURCHASES_ONE_TIME_UPDATE", payload);
          let credits = 0;
          let price = 0;
          switch (payload?.app_purchase_one_time.name) {
            case "500,000 Credits":
              credits = 500000;
              price = 3.99;
              break;
            case "1,000,000 Credits":
              credits = 1000000;
              price = 7.99;
              break;
            case "2,000,000 Credits":
              credits = 2000000;
              price = 15.99;
              break;
            case "3,000,000 Credits":
              credits = 3000000;
              price = 23.99;
              break;
            case "5,000,000 Credits":
              credits = 5000000;
              price = 39.99;
              break;
            case "10,000,000 Credits":
              credits = 10000000;
              price = 79.99;
              break;
            case "20,000,000 Credits":
              credits = 20000000;
              price = 159.99;
              break;
            case "30,000,000 Credits":
              credits = 30000000;
              price = 239.99;
              break;
          }
          console.log(
            "payload?.app_purchase_one_time.created_at",
            payload?.app_purchase_one_time.created_at,
          );
          console.log(
            "payload?.app_purchase_one_time.created_at Data",
            new Date(payload?.app_purchase_one_time.created_at),
          );

          InsertOrUpdateOrder({
            shop,
            id: payload?.app_purchase_one_time.admin_graphql_api_id,
            amount: price,
            name: payload?.app_purchase_one_time.name,
            createdAt: new Date(payload?.app_purchase_one_time.created_at)
              .toISOString()
              .slice(0, 19),
            status: payload?.app_purchase_one_time.status,
            confirmationUrl: shop,
          });
          if (payload?.app_purchase_one_time.status === "ACTIVE") {
            await UpdateUserToken({
              shop,
              token: credits,
            });
            await SendAPGPurchaseEmail({
              shop,
              token: credits,
              amount: price,
            });
          }
        }
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error APP_PURCHASES_ONE_TIME_UPDATE", error);
        return new Response(null, { status: 200 });
      }
    case "CUSTOMERS_DATA_REQUEST":
      try {
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error CUSTOMERS_DATA_REQUEST:", error);
        return new Response(null, { status: 200 });
      }
    case "CUSTOMERS_REDACT":
      try {
        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error CUSTOMERS_REDACT:", error);
        return new Response(null, { status: 200 });
      }
    case "SHOP_REDACT":
      try {
        await StopBatchGenerateDescription({ shop });

        return new Response(null, { status: 200 });
      } catch (error) {
        console.error("Error SHOP_REDACT:", error);
        return new Response(null, { status: 200 });
      }
    default:
      return new Response("Unhandled webhook topic", { status: 404 });
  }
};
