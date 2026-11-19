import {
  IMAGE_TRANSLATE_INSUFFICIENT_CREDITS,
  IMAGE_TRANSLATE_SCOPE_MISSING,
} from "~/lib/imageTranslate";
import { deductCredits, precheckCredits } from "~/server/billing/quota.server";
import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  IMAGE_TRANSLATE_MSG_SAVE_FAILED,
  formatImageTranslateErrorLog,
  imageTranslateCredits,
  imageTranslateErrorCode,
  imageTranslateFailMessage,
  pictureUrlKey,
  resolveImageTranslateModel,
  translateImageToShopifyFiles,
  type ShopifyFilesGraphql,
} from "./imageTranslate";
import { upsertUserPictureFile } from "./picture.server";
import { adminFilesGraphql, sessionCanWriteFiles } from "./shopifyFilesAdmin.server";

type AdminGraphqlClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

export type MerchantImageModel = "standard" | "advance";

export class ImageTranslateQuotaError extends Error {
  constructor() {
    super(IMAGE_TRANSLATE_INSUFFICIENT_CREDITS);
    this.name = "ImageTranslateQuotaError";
  }
}

function resolveRunModel(raw: unknown): string {
  if (raw === "advance") return IMAGE_TRANSLATE_ADVANCE_MODEL;
  if (raw === "standard") return DEFAULT_IMAGE_TRANSLATE_MODEL;
  return resolveImageTranslateModel(raw);
}

function fail(errorMsg: string, errorCode = 10001) {
  return { success: false, errorCode, errorMsg, response: null as string | null };
}

/** 单张与批量共用：预检额度 → Gemini → Files → UserPicture → 扣费。失败抛错。 */
export async function runTranslateImageItem(args: {
  shop: string;
  graphql: ShopifyFilesGraphql;
  imageId: string;
  imageUrl: string;
  targetLanguage: string;
  model: string;
  alt?: string;
}): Promise<{ url: string; fileId: string }> {
  const credits = imageTranslateCredits(args.model);
  const quota = await precheckCredits(args.shop, credits);
  if (!quota) throw new ImageTranslateQuotaError();

  const uploaded = await translateImageToShopifyFiles({
    graphql: args.graphql,
    imageUrl: args.imageUrl,
    targetLanguage: args.targetLanguage,
    model: args.model,
    alt: args.alt,
  });
  const saved = await upsertUserPictureFile({
    graphql: args.graphql,
    input: {
      shop: args.shop,
      imageId: args.imageId,
      imageBeforeUrl: args.imageUrl,
      languageCode: args.targetLanguage,
      imageAfterUrl: uploaded.url,
      imageAfterFileId: uploaded.fileId,
      altBeforeTranslation: args.alt,
    },
  });
  if (!saved.success) {
    throw new Error(saved.errorMsg || IMAGE_TRANSLATE_MSG_SAVE_FAILED);
  }
  try {
    await deductCredits(args.shop, credits, {
      source: "image",
      model: args.model,
      languageCode: args.targetLanguage,
    });
  } catch (err) {
    console.error(
      `[picture.deduct] shop=${args.shop} failed after Files save ${formatImageTranslateErrorLog(err)}`,
    );
  }
  return { url: uploaded.url, fileId: uploaded.fileId };
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

  const model = resolveRunModel(args.model);
  const graphql = adminFilesGraphql(args.admin);
  try {
    const uploaded = await runTranslateImageItem({
      shop: args.shop,
      graphql,
      imageId,
      imageUrl,
      targetLanguage,
      model,
      alt: args.alt,
    });
    return {
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: uploaded.url,
      imageAfterFileId: uploaded.fileId,
    };
  } catch (err) {
    console.error(`[picture.translate] shop=${args.shop} ${formatImageTranslateErrorLog(err)}`);
    if (err instanceof ImageTranslateQuotaError) {
      return fail(IMAGE_TRANSLATE_INSUFFICIENT_CREDITS, 403);
    }
    if (imageTranslateErrorCode(err) === "SHOPIFY_SCOPE_MISSING") {
      return fail(IMAGE_TRANSLATE_SCOPE_MISSING, 403);
    }
    return fail(imageTranslateFailMessage(err));
  }
}
