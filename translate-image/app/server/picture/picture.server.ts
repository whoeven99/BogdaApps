import prisma from "~/db.server";
import { IMAGE_TRANSLATE_SCOPE_MISSING } from "~/lib/imageTranslate";
import {
  deleteShopifyFiles,
  imageTranslateErrorCode,
  pictureUrlKey,
  translatedImageFilename,
  uploadImageToShopifyFiles,
  type ShopifyFilesGraphql,
} from "./imageTranslate";

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

export async function listPicturesByImageId(shop: string, imageId: string): Promise<UserPicturePayload[]> {
  const rows = await prisma.userPicture.findMany({
    where: { shop, imageId, isDelete: false },
  });
  return rows.map(toPayload);
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

export function mergePictureLists(
  javaList: Array<Partial<UserPicturePayload> & { languageCode: string }>,
  localList: UserPicturePayload[],
): Array<Partial<UserPicturePayload> & { languageCode: string }> {
  const byLang = new Map<string, Partial<UserPicturePayload> & { languageCode: string }>();
  for (const row of javaList) byLang.set(row.languageCode, row);
  for (const row of localList) byLang.set(row.languageCode, row);
  return [...byLang.values()];
}

export async function upsertUserPicture(
  input: UserPictureWriteInput,
): Promise<{ success: boolean; errorCode: number; errorMsg: string; response: UserPicturePayload | null }> {
  try {
    const urlKey = pictureUrlKey(input.imageBeforeUrl);
    const data = {
      imageAfterUrl: input.imageAfterUrl,
      imageAfterFileId: input.imageAfterFileId,
      altBeforeTranslation: altOrUndefined(input.altBeforeTranslation),
      altAfterTranslation: altOrUndefined(input.altAfterTranslation),
      urlKey,
      isDelete: false,
    };
    const row = await prisma.userPicture.upsert({
      where: {
        shop_imageId_imageBeforeUrl_languageCode: {
          shop: input.shop,
          imageId: input.imageId,
          imageBeforeUrl: input.imageBeforeUrl,
          languageCode: input.languageCode,
        },
      },
      create: {
        shop: input.shop,
        imageId: input.imageId,
        imageBeforeUrl: input.imageBeforeUrl,
        languageCode: input.languageCode,
        ...data,
      },
      update: data,
    });
    return ok(toPayload(row));
  } catch (err) {
    console.error(`[picture] upsert failed shop=${input.shop}`, err);
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
    console.warn(`[picture] fileDelete failed shop=${shop}:`, err);
    return false;
  }
}

export async function upsertUserPictureFile(args: {
  graphql: ShopifyFilesGraphql;
  input: UserPictureWriteInput & { imageAfterUrl: string; imageAfterFileId: string };
}) {
  const previous = await findUserPicture(args.input).catch(() => null);
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
    const existing = await findUserPicture(key);
    if (!existing) return fail(null, "NOT_FOUND");
    const deleted = await deleteOwnFileQuietly(graphql, key.shop, existing.imageAfterFileId);
    const updated = await prisma.userPicture.update({
      where: { id: existing.id },
      data: { isDelete: true, ...(deleted ? { imageAfterFileId: null } : {}) },
    });
    return ok(toPayload(updated));
  } catch (err) {
    console.error(`[picture] delete failed shop=${key.shop}:`, err);
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
    console.error(`[picture] uploadAndUpsert failed shop=${args.shop}:`, err);
    return fail(
      null,
      imageTranslateErrorCode(err) === "SHOPIFY_SCOPE_MISSING"
        ? IMAGE_TRANSLATE_SCOPE_MISSING
        : "UPLOAD_FAILED",
    );
  }
}
