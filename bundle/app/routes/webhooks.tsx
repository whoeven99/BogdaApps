import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { Uninstall, UpdateUserDiscountStatus } from "app/api/javaServer";

export const action = async ({ request }: ActionFunctionArgs) => {
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
        case "APP_UNINSTALLED":
            try {
                if (session) {
                    await db.session.deleteMany({ where: { shop } });
                }
                Uninstall({ shopName: shop });
                return new Response(null, { status: 200 });
            } catch (error) {
                console.error("Error APP_UNINSTALLED:", error);
                return new Response(null, { status: 200 });
            }
        case "DISCOUNTS_UPDATE":
            try {
                UpdateUserDiscountStatus({
                    shopName: shop,
                    discountGid: payload.admin_graphql_api_id,
                    status: payload.status,
                });
                return new Response(null, { status: 200 });
            } catch (error) {
                console.error("Error DISCOUNT_UPDATE:", error);
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
                return new Response(null, { status: 200 });
            } catch (error) {
                console.error("Error SHOP_REDACT:", error);
                return new Response(null, { status: 200 });
            }
        default:
            throw new Response("Unhandled webhook topic", { status: 404 });
    }
};
