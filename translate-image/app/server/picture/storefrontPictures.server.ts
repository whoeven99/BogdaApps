import {
  getPicturesByUrlKeys,
  listPicturesByProductLanguage,
  listPicturesByShopLanguage,
  mergeStorefrontPictures,
  normalizeUrlKeys,
  type StorefrontUrlKeyPicture,
  type UserPicturePayload,
} from "./picture.server";
import { resolvePictureReadLanguage } from "./storefrontPictureLanguage";
import { loadCachedShopLocales } from "~/server/storefront/shopLocalesCache.server";
import { ok, fail, type BaseResponse } from "~/server/storefront/response.server";

async function languageForPictureRead(shop: string, languageCode: string): Promise<string> {
  const trimmed = String(languageCode ?? "").trim();
  if (!trimmed) return trimmed;
  try {
    const { locales } = await loadCachedShopLocales(shop);
    return resolvePictureReadLanguage(trimmed, locales);
  } catch {
    return trimmed;
  }
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
    const local = await listPicturesByProductLanguage(args.shop, productId, languageCode);
    return ok(mergeStorefrontPictures([], local));
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
    const local = await listPicturesByShopLanguage(args.shop, languageCode);
    return ok(mergeStorefrontPictures([], local));
  } catch (err) {
    console.error(`[storefront.picture] shop read failed shop=${args.shop}`, err);
    return fail(10001, "SERVER_ERROR");
  }
}

export async function getStorefrontPicturesByUrlKeys(args: {
  shop: string;
  languageCode: string;
  urlKeys: unknown;
}): Promise<BaseResponse<StorefrontUrlKeyPicture[]>> {
  const languageCode = await languageForPictureRead(
    args.shop,
    String(args.languageCode ?? "").trim(),
  );
  const urlKeys = normalizeUrlKeys(args.urlKeys);
  if (!languageCode) return fail(400, "languageCode required");
  try {
    return ok(await getPicturesByUrlKeys({ shop: args.shop, languageCode, urlKeys }));
  } catch (err) {
    console.error(`[storefront.picture] urlKey read failed shop=${args.shop}`, err);
    return fail(10001, "SERVER_ERROR");
  }
}
