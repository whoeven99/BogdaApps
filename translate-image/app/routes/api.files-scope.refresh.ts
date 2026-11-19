import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { dropOfflineSessionIfFilesGranted } from "~/server/picture/refreshFilesScope.server";
import { getAppOnlyTokenProvider } from "~/server/shop/offlineSessionToken.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const result = await dropOfflineSessionIfFilesGranted({
    shop: session.shop,
    graphql: (query) => admin.graphql(query),
    deleteOfflineSessions: async (shop) => {
      await prisma.session.deleteMany({ where: { shop, isOnline: false } });
      getAppOnlyTokenProvider().invalidate(shop);
    },
  });
  if (result === "unavailable") {
    return json({ ok: false, refreshed: false }, { status: 502 });
  }
  return json({ ok: true, refreshed: result === "refreshed" });
};
