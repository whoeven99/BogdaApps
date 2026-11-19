import prisma from "~/db.server";
import { IMAGE_TRANSLATE_SCOPE_MISSING } from "~/lib/imageTranslate";
import { invalidateStorefrontCache } from "~/server/storefront/cache.server";
import {
  deleteShopifyFiles,
  imageTranslateErrorCode,
  pictureUrlKey,
  summarizeError,
  translatedImageFilename,
  uploadImageToShopifyFiles,
  type ShopifyFilesGraphql,
} from "./imageTranslate";
import { isContentImageId, pickLatestContentPictureRow } from "~/lib/contentPicture";
import { canonicalHttpsImageUrl, normalizeUrlKeys } from "./imageUrlKey";
import { pickPicturesByLanguage, productImageLookupIds } from "./productMedia";

export { URL_KEY_LOOKUP_MAX, normalizeUrlKeys } from "./imageUrlKey";

export type UserPicturePayload = {
  id: number;
  shopName: string;
  imageId: string;
  imageBeforeUrl: string;
  imageAfterUrl: string | null;
  altBeforeTranslation: string | null;
  altAfterTranslation: string | null;
  languageCode: string;
  isDelete: boolean;
  urlKey: string | null;
  imageAfterFileId: string | null;
};

export type UserPictureWriteInput = {
  shop: string;
  imageId: string;
  imageBeforeUrl: string;
  languageCode: string;
  imageAfterUrl?: string | null;
  imageAfterFileId?: string | null;
  altBeforeTranslation?: string | null;
  altAfterTranslation?: string | null;
};

type UserPictureKey = {
  shop: string;
  imageId: string;
  imageBeforeUrl: string;
  languageCode: string;
};

function ok<T>(response: T) {
  return { success: true as const, errorCode: 0, errorMsg: "", response };
}

function fail<T>(response: T, errorMsg = "SERVER_ERROR", errorCode = 10001) {
  return { success: false as const, errorCode, errorMsg, response };
}

function altOrUndefined(value: string | null | undefined): string | undefined {
  return value ? value : undefined;
}

function toPayload(row: {
  id: number;
  shop: string;
  imageId: string;
  imageBeforeUrl: string;
  imageAfterUrl: string | null;
  altBeforeTranslation: string | null;
  altAfterTranslation: string | null;
  languageCode: string;
  isDelete: boolean;
  urlKey: string | null;
  imageAfterFileId: string | null;
}): UserPicturePayload {
  return {
    id: row.id,
    shopName: row.shop,
    imageId: row.imageId,
    imageBeforeUrl: row.imageBeforeUrl,
    imageAfterUrl: row.imageAfterUrl,
    altBeforeTranslation: row.altBeforeTranslation,
    altAfterTranslation: row.altAfterTranslation,
    languageCode: row.languageCode,
    isDelete: row.isDelete,
    urlKey: row.urlKey,
    imageAfterFileId: row.imageAfterFileId,
  };
}

function findUserPicture(key: UserPictureKey) {
  return prisma.userPicture.findUnique({
    where: {
      shop_imageId_imageBeforeUrl_languageCode: {
        shop: key.shop,
        imageId: key.imageId,
        imageBeforeUrl: key.imageBeforeUrl,
        languageCode: key.languageCode,
      },
    },
  });
}

async function findExistingPictureRow(key: UserPictureKey) {
  if (isContentImageId(key.imageId)) {
    const rows = await prisma.userPicture.findMany({
      where: {
        shop: key.shop,
        imageId: key.imageId,
        languageCode: key.languageCode,
        isDelete: false,
      },
      orderBy: { id: "desc" },
      take: 8,
    });
    const latest = pickLatestContentPictureRow(rows);
    if (latest) return latest;
    return findUserPicture({
      ...key,
      imageBeforeUrl: canonicalHttpsImageUrl(key.imageBeforeUrl) || key.imageBeforeUrl,
    });
  }
  return findUserPicture(key);
}

export async function listPicturesByImageId(shop: string, imageId: string): Promise<UserPicturePayload[]> {
  const rows = await prisma.userPicture.findMany({
    where: { shop, imageId, isDelete: false },
  });
  return rows.map(toPayload);
}

/** 商品图详情：按 MediaImage / ImageSource / 旧 ProductImage / urlKey 读未删除译图。 */
export async function listPicturesForProductMedia(args: {
  shop: string;
  imageId?: string | null;
  imageSourceId?: string | null;
  imageBeforeUrl?: string | null;
}): Promise<UserPicturePayload[]> {
  const imageIds = productImageLookupIds({
    mediaId: args.imageId,
    imageSourceId: args.imageSourceId,
  });
  const urlKey = pictureUrlKey(args.imageBeforeUrl);
  if (imageIds.length === 0 && !urlKey) return [];
  const rows = await prisma.userPicture.findMany({
    where: {
      shop: args.shop,
      isDelete: false,
      OR: [
        ...(imageIds.length > 0 ? [{ imageId: { in: imageIds } }] : []),
        ...(urlKey ? [{ urlKey }] : []),
      ],
    },
    orderBy: { id: "desc" },
  });
  return pickPicturesByLanguage(rows.map(toPayload), imageIds[0]);
}

export async function listPicturesByShopLanguage(
  shop: string,
  languageCode: string,
): Promise<UserPicturePayload[]> {
  const rows = await prisma.userPicture.findMany({
    where: { shop, languageCode, isDelete: false },
  });
  return rows.map(toPayload);
}

export async function listPicturesByProductLanguage(
  shop: string,
  imageId: string,
  languageCode: string,
): Promise<UserPicturePayload[]> {
  const rows = await prisma.userPicture.findMany({
    where: { shop, imageId, languageCode, isDelete: false },
  });
  return rows.map(toPayload);
}

export type StorefrontUrlKeyPicture = {
  urlKey: string;
  imageAfterUrl: string | null;
  altAfterTranslation: string | null;
};

function toStorefrontUrlKeyItem(row: UserPicturePayload): StorefrontUrlKeyPicture | null {
  if (!row.urlKey) return null;
  const imageAfterUrl = row.imageAfterUrl ?? null;
  const altAfterTranslation = (row.altAfterTranslation ?? "").trim() || null;
  if (!imageAfterUrl && !altAfterTranslation) return null;
  return { urlKey: row.urlKey, imageAfterUrl, altAfterTranslation };
}

export async function listPicturesByUrlKeys(args: {
  shop: string;
  languageCode: string;
  urlKeys: string[];
}): Promise<UserPicturePayload[]> {
  const keys = normalizeUrlKeys(args.urlKeys);
  const languageCode = String(args.languageCode ?? "").trim();
  if (!languageCode || keys.length === 0) return [];
  const rows = await prisma.userPicture.findMany({
    where: {
      shop: args.shop,
      languageCode,
      urlKey: { in: keys },
      isDelete: false,
    },
    orderBy: { id: "desc" },
  });
  const latest = new Map<string, UserPicturePayload>();
  for (const row of rows) {
    const payload = toPayload(row);
    if (payload.urlKey && !latest.has(payload.urlKey)) latest.set(payload.urlKey, payload);
  }
  return [...latest.values()];
}

/** 按 urlKey 查译图 / alt；同 key 取 id 最新一行。 */
export async function getPicturesByUrlKeys(args: {
  shop: string;
  languageCode: string;
  urlKeys: string[];
}): Promise<StorefrontUrlKeyPicture[]> {
  return (await listPicturesByUrlKeys(args)).flatMap((row) => {
    const item = toStorefrontUrlKeyItem(row);
    return item ? [item] : [];
  });
}

export async function persistImageAfterFileId(input: {
  shop: string;
  imageId: string;
  imageBeforeUrl: string;
  languageCode: string;
  imageAfterFileId: string | null;
}) {
  const existing = await findExistingPictureRow({
    shop: input.shop,
    imageId: input.imageId,
    imageBeforeUrl: input.imageBeforeUrl,
    languageCode: input.languageCode,
  });
  if (!existing) {
    return upsertUserPicture({
      shop: input.shop,
      imageId: input.imageId,
      imageBeforeUrl: input.imageBeforeUrl,
      languageCode: input.languageCode,
      imageAfterFileId: input.imageAfterFileId,
    });
  }
  try {
    const row = await prisma.userPicture.update({
      where: { id: existing.id },
      data: { imageAfterFileId: input.imageAfterFileId },
    });
    await invalidateStorefrontCache("picture", input.shop);
    return ok(toPayload(row));
  } catch (err) {
    console.error(`[picture] persist file id failed shop=${input.shop} ${summarizeError(err)}`);
    return fail(null, "SAVE_FAILED");
  }
}

function storefrontPictureKey(row: Partial<UserPicturePayload>): string {
  const lang = String(row.languageCode || "");
  const urlKey = row.urlKey || pictureUrlKey(String(row.imageBeforeUrl || ""));
  return `${lang}::${urlKey || row.imageBeforeUrl || row.imageId || ""}`;
}

export function mergeStorefrontPictures(
  javaList: Array<Partial<UserPicturePayload>>,
  localList: UserPicturePayload[],
): Array<Partial<UserPicturePayload>> {
  const byKey = new Map<string, Partial<UserPicturePayload>>();
  for (const row of javaList) {
    if (row && (row as { isDelete?: boolean }).isDelete) continue;
    byKey.set(storefrontPictureKey(row), row);
  }
  for (const row of localList) byKey.set(storefrontPictureKey(row), row);
  return [...byKey.values()].filter(
    (row) => Boolean(row.imageAfterUrl) || Boolean(row.altAfterTranslation),
  );
}

export async function upsertUserPicture(
  input: UserPictureWriteInput,
): Promise<{ success: boolean; errorCode: number; errorMsg: string; response: UserPicturePayload | null }> {
  try {
    const urlKey = pictureUrlKey(input.imageBeforeUrl);
    const imageBeforeUrl =
      isContentImageId(input.imageId)
        ? canonicalHttpsImageUrl(input.imageBeforeUrl) || input.imageBeforeUrl
        : input.imageBeforeUrl;
    const data = {
      imageAfterUrl: input.imageAfterUrl,
      imageAfterFileId: input.imageAfterFileId,
      altBeforeTranslation: altOrUndefined(input.altBeforeTranslation),
      altAfterTranslation: altOrUndefined(input.altAfterTranslation),
      urlKey,
      isDelete: false,
    };
    if (isContentImageId(input.imageId)) {
      const existing = await prisma.userPicture.findMany({
        where: {
          shop: input.shop,
          imageId: input.imageId,
          languageCode: input.languageCode,
          isDelete: false,
        },
        orderBy: { id: "desc" },
        take: 8,
      });
      const latest = pickLatestContentPictureRow(existing);
      if (latest) {
        const row = await prisma.userPicture.update({
          where: { id: latest.id },
          data: { ...data, imageBeforeUrl },
        });
        await invalidateStorefrontCache("picture", input.shop);
        return ok(toPayload(row));
      }
    }
    const row = await prisma.userPicture.upsert({
      where: {
        shop_imageId_imageBeforeUrl_languageCode: {
          shop: input.shop,
          imageId: input.imageId,
          imageBeforeUrl,
          languageCode: input.languageCode,
        },
      },
      create: {
        shop: input.shop,
        imageId: input.imageId,
        imageBeforeUrl,
        languageCode: input.languageCode,
        ...data,
      },
      update: data,
    });
    await invalidateStorefrontCache("picture", input.shop);
    return ok(toPayload(row));
  } catch (err) {
    console.error(`[picture] upsert failed shop=${input.shop} ${summarizeError(err)}`);
    return fail(null, "SAVE_FAILED");
  }
}

async function deleteOwnFileQuietly(
  graphql: ShopifyFilesGraphql,
  shop: string,
  fileId: string | null | undefined,
): Promise<boolean> {
  if (!fileId) return true;
  try {
    await deleteShopifyFiles(graphql, [fileId]);
    return true;
  } catch (err) {
    console.warn(`[picture] fileDelete failed shop=${shop} ${summarizeError(err)}`);
    return false;
  }
}

export async function upsertUserPictureFile(args: {
  graphql: ShopifyFilesGraphql;
  input: UserPictureWriteInput & { imageAfterUrl: string; imageAfterFileId: string };
}) {
  const previous = await findExistingPictureRow(args.input).catch(() => null);
  const res = await upsertUserPicture(args.input);
  const oldFileId = previous?.imageAfterFileId;
  if (res.success && oldFileId && oldFileId !== args.input.imageAfterFileId) {
    await deleteOwnFileQuietly(args.graphql, args.input.shop, oldFileId);
  }
  return res;
}

export async function clearUserPicture(
  args: UserPictureKey & { graphql: ShopifyFilesGraphql },
) {
  const { graphql, ...key } = args;
  try {
    const existing = await findExistingPictureRow(key);
    if (!existing) return fail(null, "NOT_FOUND");
    const deleted = await deleteOwnFileQuietly(graphql, key.shop, existing.imageAfterFileId);
    const updated = await prisma.userPicture.update({
      where: { id: existing.id },
      data: { isDelete: true, ...(deleted ? { imageAfterFileId: null } : {}) },
    });
    await invalidateStorefrontCache("picture", key.shop);
    return ok(toPayload(updated));
  } catch (err) {
    console.error(`[picture] delete failed shop=${key.shop} ${summarizeError(err)}`);
    return fail(null);
  }
}

export async function uploadAndUpsertUserPicture(
  args: UserPictureKey & {
    graphql: ShopifyFilesGraphql;
    file: { buffer: Buffer; contentType: string };
    altBeforeTranslation?: string | null;
    altAfterTranslation?: string | null;
  },
) {
  try {
    const uploaded = await uploadImageToShopifyFiles({
      graphql: args.graphql,
      bytes: args.file.buffer,
      mimeType: args.file.contentType,
      filename: translatedImageFilename(
        args.imageBeforeUrl,
        args.languageCode,
        args.file.contentType,
      ),
    });
    return upsertUserPictureFile({
      graphql: args.graphql,
      input: {
        shop: args.shop,
        imageId: args.imageId,
        imageBeforeUrl: args.imageBeforeUrl,
        languageCode: args.languageCode,
        imageAfterUrl: uploaded.url,
        imageAfterFileId: uploaded.fileId,
        altBeforeTranslation: altOrUndefined(args.altBeforeTranslation),
        altAfterTranslation: altOrUndefined(args.altAfterTranslation),
      },
    });
  } catch (err) {
    console.error(`[picture] uploadAndUpsert failed shop=${args.shop} ${summarizeError(err)}`);
    return fail(
      null,
      imageTranslateErrorCode(err) === "SHOPIFY_SCOPE_MISSING"
        ? IMAGE_TRANSLATE_SCOPE_MISSING
        : "UPLOAD_FAILED",
    );
  }
}
