import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { handleImageListRequest } from "~/server/contentImage/imageList.server";

/**
 * POST /api/content-image/list
 * body:
 *   { intent: "resources", type: product|article|theme, after?, q?, status? }
 *   { intent: "images", type, resourceId, languageCode }
 *   { intent: "images", type, resourceIds, languageCode }
 *   { intent: "switcherPages", languageCode, q?, after? }
 *   { intent: "switcher", languageCode, pagePath? | pagePaths?, q? }
 */
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    return json(
      await handleImageListRequest({
        shop: session.shop,
        session,
        admin,
        body,
      }),
    );
  } catch (err) {
    console.error(`[content-image] list failed shop=${session.shop}:`, err);
    return json({ success: false, errorCode: 10001, errorMsg: "SERVER_ERROR", response: null });
  }
};
