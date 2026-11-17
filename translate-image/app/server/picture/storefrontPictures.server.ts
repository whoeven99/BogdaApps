import {
  javaSelectPicturesByLanguage,
  javaSelectPicturesByProduct,
} from "~/api/JavaServer";
import {
  listPicturesByShopLanguage,
  mergeStorefrontPictures,
  type UserPicturePayload,
} from "./picture.server";
import { ok, fail, type BaseResponse } from "~/server/storefront/response.server";

function asList(value: unknown): Array<Partial<UserPicturePayload>> {
  return Array.isArray(value) ? value : [];
}

export async function getStorefrontProductPictures(args: {
  shop: string;
  productId: string;
  languageCode: string;
}): Promise<BaseResponse<Array<Partial<UserPicturePayload>>>> {
  const languageCode = String(args.languageCode ?? "").trim();
  const productId = String(args.productId ?? "").trim();
  if (!languageCode || !productId) return fail(400, "productId and languageCode required");
  try {
    const [java, local] = await Promise.all([
      javaSelectPicturesByProduct({
        shop: args.shop,
        productId,
        languageCode,
      }).catch(() => ({ response: [] })),
      listPicturesByShopLanguage(args.shop, languageCode),
    ]);
    return ok(mergeStorefrontPictures(asList(java?.response), local));
  } catch (err) {
    console.error(`[storefront.picture] product read failed shop=${args.shop}`, err);
    return fail(10001, "SERVER_ERROR");
  }
}

export async function getStorefrontShopPictures(args: {
  shop: string;
  languageCode: string;
}): Promise<BaseResponse<Array<Partial<UserPicturePayload>>>> {
  const languageCode = String(args.languageCode ?? "").trim();
  if (!languageCode) return fail(400, "languageCode required");
  try {
    const [java, local] = await Promise.all([
      javaSelectPicturesByLanguage({ shop: args.shop, languageCode }).catch(() => ({
        response: [],
      })),
      listPicturesByShopLanguage(args.shop, languageCode),
    ]);
    return ok(mergeStorefrontPictures(asList(java?.response), local));
  } catch (err) {
    console.error(`[storefront.picture] shop read failed shop=${args.shop}`, err);
    return fail(10001, "SERVER_ERROR");
  }
}
