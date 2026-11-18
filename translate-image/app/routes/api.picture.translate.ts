import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { translateImageToFiles } from "~/server/picture/translateImage.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const result = await translateImageToFiles({
    shop: session.shop,
    admin,
    session,
    imageId: typeof body.imageId === "string" ? body.imageId : "",
    imageUrl: typeof body.imageUrl === "string" ? body.imageUrl : "",
    targetLanguage: typeof body.languageCode === "string" ? body.languageCode : "",
    model: body.model,
  });
  return json(result, { status: result.success ? 200 : result.errorCode === 403 ? 403 : 200 });
};
