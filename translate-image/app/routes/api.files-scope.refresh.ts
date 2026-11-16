import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { refreshFilesScopeIfGranted } from "~/server/picture/refreshFilesScope.server";
import { invalidateAppOnlyTokenCache } from "~/server/shop/offlineSessionToken.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const result = await refreshFilesScopeIfGranted({
    shop: session.shop,
    graphql: (query) => admin.graphql(query),
    persistScope: async (shop, scope) => {
      await prisma.session.updateMany({
        where: { shop, isOnline: false },
        data: { scope },
      });
    },
    invalidateToken: invalidateAppOnlyTokenCache,
  });
  if (result === "unavailable") {
    return json({ ok: false, refreshed: false }, { status: 502 });
  }
  return json({ ok: true, refreshed: result === "refreshed" });
};
