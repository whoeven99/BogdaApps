import { DeductPictureCredits, GetUserWords } from "~/api/JavaServer";
import {
  DEFAULT_IMAGE_TRANSLATE_MODEL,
  IMAGE_TRANSLATE_ADVANCE_MODEL,
  formatImageTranslateErrorLog,
  imageTranslateFailMessage,
  translateImageToShopifyFiles,
} from "./imageTranslate";
import { adminFilesGraphql, sessionCanWriteFiles } from "./shopifyFilesAdmin.server";

export const IMAGE_TRANSLATE_INSUFFICIENT_CREDITS = "额度不够";
export const IMAGE_TRANSLATE_SCOPE_MISSING = "SCOPE_MISSING";

const JAVA_MODEL_TYPE = { standard: 1, advance: 3 } as const;
const MIN_CREDITS = 2000;

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
  imageUrl: string;
  targetLanguage: string;
  model?: unknown;
  alt?: string;
}) {
  const imageUrl = String(args.imageUrl ?? "").trim();
  const targetLanguage = String(args.targetLanguage ?? "").trim();
  if (!imageUrl || !targetLanguage) {
    return fail("imageUrl and targetLanguage required", 400);
  }
  if (!sessionCanWriteFiles(args.session)) {
    return fail(IMAGE_TRANSLATE_SCOPE_MISSING, 403);
  }

  const quota = await GetUserWords({ shop: args.shop });
  const used = Number(quota?.response?.usedPoints ?? 0);
  const total = Number(quota?.response?.purchasePoints ?? 0);
  if (!quota?.success || total - used < MIN_CREDITS) {
    return fail(IMAGE_TRANSLATE_INSUFFICIENT_CREDITS, 403);
  }

  const merchantModel = resolveMerchantModel(args.model);
  const model =
    merchantModel === "advance" ? IMAGE_TRANSLATE_ADVANCE_MODEL : DEFAULT_IMAGE_TRANSLATE_MODEL;

  try {
    const uploaded = await translateImageToShopifyFiles({
      graphql: adminFilesGraphql(args.admin),
      imageUrl,
      targetLanguage,
      model,
      alt: args.alt,
    });
    const deduct = await DeductPictureCredits({
      shop: args.shop,
      modelType: JAVA_MODEL_TYPE[merchantModel],
    });
    if (deduct?.errorMsg === IMAGE_TRANSLATE_INSUFFICIENT_CREDITS) {
      return fail(IMAGE_TRANSLATE_INSUFFICIENT_CREDITS, 403);
    }
    if (deduct && deduct.success === false) {
      console.error(
        `[picture.deduct] shop=${args.shop} failed after Files upload errorMsg=${deduct.errorMsg ?? "unknown"}`,
      );
    }
    return { success: true, errorCode: 0, errorMsg: "", response: uploaded.url };
  } catch (err) {
    console.error(`[picture.translate] shop=${args.shop} ${formatImageTranslateErrorLog(err)}`);
    return fail(imageTranslateFailMessage(err));
  }
}
