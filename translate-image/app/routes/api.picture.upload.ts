import { json, type ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { IMAGE_TRANSLATE_SCOPE_MISSING } from "~/lib/imageTranslate";
import {
  uploadAndUpsertUserPicture,
  upsertUserPicture,
  type UserPicturePayload,
} from "~/server/picture/picture.server";
import { adminFilesGraphql, sessionCanWriteFiles } from "~/server/picture/shopifyFilesAdmin.server";

type UserPicturesDoJson = {
  imageId?: string;
  imageBeforeUrl?: string;
  languageCode?: string;
  altBeforeTranslation?: string | null;
  altAfterTranslation?: string | null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const form = await request.formData();
  const shopNameRaw = form.get("shopName");
  const shopName =
    typeof shopNameRaw === "string" && shopNameRaw.trim() ? shopNameRaw.trim() : session.shop;
  const jsonRaw = form.get("userPicturesDoJson");
  const file = form.get("file");

  if (shopName !== session.shop) {
    return json({
      success: false,
      errorCode: 403,
      errorMsg: "forbidden",
      response: null as UserPicturePayload | null,
    });
  }

  let meta: UserPicturesDoJson = {};
  try {
    meta = typeof jsonRaw === "string" && jsonRaw ? (JSON.parse(jsonRaw) as UserPicturesDoJson) : {};
  } catch {
    return json({
      success: false,
      errorCode: 400,
      errorMsg: "invalid userPicturesDoJson",
      response: null as UserPicturePayload | null,
    });
  }

  const imageId = typeof meta.imageId === "string" ? meta.imageId : "";
  const imageBeforeUrl = typeof meta.imageBeforeUrl === "string" ? meta.imageBeforeUrl : "";
  const languageCode = typeof meta.languageCode === "string" ? meta.languageCode : "";
  if (!imageId || !imageBeforeUrl || !languageCode) {
    return json({
      success: false,
      errorCode: 400,
      errorMsg: "imageId, imageBeforeUrl, languageCode required",
      response: null as UserPicturePayload | null,
    });
  }

  const hasFile = file instanceof File && file.size > 0;
  if (!hasFile || !(file instanceof File)) {
    return json(
      await upsertUserPicture({
        shop: shopName,
        imageId,
        imageBeforeUrl,
        languageCode,
        altBeforeTranslation: meta.altBeforeTranslation ?? "",
        altAfterTranslation: meta.altAfterTranslation ?? "",
      }),
    );
  }
  if (!sessionCanWriteFiles(session)) {
    return json({
      success: false,
      errorCode: 403,
      errorMsg: IMAGE_TRANSLATE_SCOPE_MISSING,
      response: null as UserPicturePayload | null,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return json(
    await uploadAndUpsertUserPicture({
      shop: shopName,
      imageId,
      imageBeforeUrl,
      languageCode,
      graphql: adminFilesGraphql(admin),
      file: { buffer, contentType: file.type || "image/jpeg" },
      altBeforeTranslation: meta.altBeforeTranslation ?? "",
      altAfterTranslation: meta.altAfterTranslation ?? "",
    }),
  );
};
