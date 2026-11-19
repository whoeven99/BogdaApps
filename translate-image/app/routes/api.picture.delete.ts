import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { clearUserPicture, type UserPicturePayload } from "~/server/picture/picture.server";
import { adminFilesGraphql } from "~/server/picture/shopifyFilesAdmin.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const shopName =
    typeof body.shopName === "string" && body.shopName.trim() ? body.shopName.trim() : session.shop;
  const imageId = typeof body.imageId === "string" ? body.imageId : "";
  const imageBeforeUrl = typeof body.imageBeforeUrl === "string" ? body.imageBeforeUrl : "";
  const languageCode = typeof body.languageCode === "string" ? body.languageCode : "";

  if (shopName !== session.shop) {
    return json({
      success: false,
      errorCode: 403,
      errorMsg: "forbidden",
      response: null as UserPicturePayload | null,
    });
  }
  if (!imageId || !imageBeforeUrl || !languageCode) {
    return json({
      success: false,
      errorCode: 400,
      errorMsg: "imageId, imageBeforeUrl, languageCode required",
      response: null as UserPicturePayload | null,
    });
  }

  const cleared = await clearUserPicture({
    graphql: adminFilesGraphql(admin),
    shop: shopName,
    imageId,
    imageBeforeUrl,
    languageCode,
  });
  if (!cleared.success && cleared.errorMsg === "NOT_FOUND") {
    return json({ success: true, errorCode: 0, errorMsg: "", response: null });
  }
  return json(cleared);
};
