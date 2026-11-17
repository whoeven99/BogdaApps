import {
  IMAGE_TRANSLATE_INSUFFICIENT_CREDITS,
  IMAGE_TRANSLATE_SCOPE_MISSING,
} from "~/lib/imageTranslate";
import { deductCredits, precheckCredits } from "~/server/billing/quota.server";
import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  formatImageTranslateErrorLog,
  imageTranslateCredits,
  imageTranslateErrorCode,
  imageTranslateFailMessage,
  pictureUrlKey,
  translateImageToShopifyFiles,
} from "./imageTranslate";
import { upsertUserPictureFile } from "./picture.server";
import { adminFilesGraphql, sessionCanWriteFiles } from "./shopifyFilesAdmin.server";

type AdminGraphqlClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

export type MerchantImageModel = "standard" | "advance";

function resolveMerchantModel(raw: unknown): MerchantImageModel {
  return raw === "advance" ? "advance" : "standard";
}

function fail(errorMsg: string, errorCode = 10001) {
  return { success: false, errorCode, errorMsg, response: null as string | null };
}

export async function translateImageToFiles(args: {
  shop: string;
  admin: AdminGraphqlClient;
  session: { scope?: string | null };
  imageId: string;
  imageUrl: string;
  targetLanguage: string;
  model?: unknown;
  alt?: string;
}) {
  const imageUrl = String(args.imageUrl ?? "").trim();
  const targetLanguage = String(args.targetLanguage ?? "").trim();
  const imageId = String(args.imageId ?? "").trim();
  if (!imageUrl || !targetLanguage || !imageId) {
    return fail("imageUrl, imageId and targetLanguage required", 400);
  }
  if (!pictureUrlKey(imageUrl)) return fail("INVALID_IMAGE_URL", 400);
  if (!sessionCanWriteFiles(args.session)) return fail(IMAGE_TRANSLATE_SCOPE_MISSING, 403);

  const merchantModel = resolveMerchantModel(args.model);
  const model =
    merchantModel === "advance" ? IMAGE_TRANSLATE_ADVANCE_MODEL : DEFAULT_IMAGE_TRANSLATE_MODEL;
  const credits = imageTranslateCredits(model);
  const quota = await precheckCredits(args.shop, credits);
  if (!quota) return fail(IMAGE_TRANSLATE_INSUFFICIENT_CREDITS, 403);

  const graphql = adminFilesGraphql(args.admin);
  try {
    const uploaded = await translateImageToShopifyFiles({
      graphql,
      imageUrl,
      targetLanguage,
      model,
      alt: args.alt,
    });
    const saved = await upsertUserPictureFile({
      graphql,
      input: {
        shop: args.shop,
        imageId,
        imageBeforeUrl: imageUrl,
        languageCode: targetLanguage,
        imageAfterUrl: uploaded.url,
        imageAfterFileId: uploaded.fileId,
        altBeforeTranslation: args.alt,
      },
    });
    if (!saved.success) return fail(saved.errorMsg || "SAVE_FAILED");
    try {
      await deductCredits(args.shop, credits, {
        source: "image",
        model,
        languageCode: targetLanguage,
      });
    } catch (err) {
      console.error(
        `[picture.deduct] shop=${args.shop} failed after Files save ${formatImageTranslateErrorLog(err)}`,
      );
    }
    return { success: true, errorCode: 0, errorMsg: "", response: uploaded.url };
  } catch (err) {
    console.error(`[picture.translate] shop=${args.shop} ${formatImageTranslateErrorLog(err)}`);
    if (imageTranslateErrorCode(err) === "SHOPIFY_SCOPE_MISSING") {
      return fail(IMAGE_TRANSLATE_SCOPE_MISSING, 403);
    }
    return fail(imageTranslateFailMessage(err));
  }
}
