import { sessionCanWriteFiles } from "~/server/picture/shopifyFilesAdmin.server";
import {
  IMAGE_RESOURCE_BULK_SELECT_MAX,
  isResourceImagesBatchTruncated,
} from "~/lib/imageResourcePaths";
import { CONTENT_IMAGE_JOB_MAX_ITEMS } from "./contentImageJobs.server";
import { dedupeByImageRowKey } from "./imageTranslateJobItems";
import {
  listImageResources,
  listResourceImages,
  parseImageResourceType,
  type AdminGraphqlClient,
  type ResourceImageSourceRow,
} from "./resourceImages.server";
import { attachTranslationsToFlatResourceRows } from "./flatResourceTranslations.server";
import { attachProductTranslationCounts } from "./resourceTranslationStats.server";
import { attachImageTranslations } from "./resourceImageTranslations.server";
import {
  listSwitcherImagesBatch,
  listSwitcherPages,
  loadAdminShopLocales,
} from "./switcherImages.server";

export { attachImageTranslations } from "./resourceImageTranslations.server";

export async function handleImageListRequest(args: {
  shop: string;
  session: { scope?: string | null };
  admin: AdminGraphqlClient;
  body: Record<string, unknown>;
  defaultType?: string;
}) {
  const canWriteFiles = sessionCanWriteFiles(args.session);
  if (args.body.intent === "switcherPages") {
    const languageCode = typeof args.body.languageCode === "string" ? args.body.languageCode.trim() : "";
    const q = typeof args.body.q === "string" ? args.body.q : "";
    const after = typeof args.body.after === "string" ? args.body.after : null;
    const locales = await loadAdminShopLocales(args.admin).catch(() => []);
    const page = await listSwitcherPages({
      shop: args.shop,
      languageCode,
      q,
      after,
      locales: locales.map((row) => row.locale),
      primaryLocale: locales.find((row) => row.primary)?.locale,
    });
    return {
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: {
        rows: page.rows.map((row) => ({
          id: row.pagePath,
          title: row.displayPath || row.pagePath,
          imageUrl: row.coverUrl,
          translated: row.translated,
          total: row.total,
        })),
        hasNextPage: page.hasNextPage,
        endCursor: page.endCursor,
        canWriteFiles,
      },
    };
  }

  if (args.body.intent === "switcher") {
    const languageCode = typeof args.body.languageCode === "string" ? args.body.languageCode.trim() : "";
    const q = typeof args.body.q === "string" ? args.body.q : "";
    const pagePath = typeof args.body.pagePath === "string" ? args.body.pagePath : "";
    const pagePaths = Array.isArray(args.body.pagePaths)
      ? args.body.pagePaths.filter((path): path is string => typeof path === "string")
      : undefined;
    const many = Boolean(pagePaths?.length);
    const result = await listSwitcherImagesBatch({
      shop: args.shop,
      languageCode,
      q,
      pagePath,
      pagePaths,
      capItems: many,
    });
    return {
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: {
        rows: result.rows,
        truncated: result.truncated,
        canWriteFiles,
      },
    };
  }

  const type = parseImageResourceType(args.body.type ?? args.defaultType);
  const intent = args.body.intent === "images" ? "images" : "resources";
  const uiLocale = typeof args.body.uiLocale === "string" ? args.body.uiLocale.trim() : "";

  if (intent === "images") {
    const languageCode = typeof args.body.languageCode === "string" ? args.body.languageCode.trim() : "";
    const manyIds = Array.isArray(args.body.resourceIds)
      ? args.body.resourceIds
          .filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
          .map((id) => id.trim())
      : null;
    if (manyIds) {
      const ids = manyIds.slice(0, IMAGE_RESOURCE_BULK_SELECT_MAX);
      const collected: ResourceImageSourceRow[] = [];
      let hitItemCap = false;
      for (const resourceId of ids) {
        const page = await listResourceImages({
          admin: args.admin,
          shop: args.shop,
          uiLocale,
          type,
          resourceId,
        });
        collected.push(...page.rows);
        if (collected.length >= CONTENT_IMAGE_JOB_MAX_ITEMS) {
          hitItemCap = true;
          break;
        }
      }
      return {
        success: true,
        errorCode: 0,
        errorMsg: "",
        response: {
          rows: await attachImageTranslations({
            shop: args.shop,
            languageCode,
            rows: dedupeByImageRowKey(collected).slice(0, CONTENT_IMAGE_JOB_MAX_ITEMS),
          }),
          truncated: isResourceImagesBatchTruncated(manyIds.length, hitItemCap),
          canWriteFiles,
        },
      };
    }
    const resourceId = typeof args.body.resourceId === "string" ? args.body.resourceId.trim() : "";
    if (!resourceId) {
      return { success: false, errorCode: 10001, errorMsg: "resourceId required", response: null };
    }
    const page = await listResourceImages({
      admin: args.admin,
      shop: args.shop,
      uiLocale,
      type,
      resourceId,
    });
    if (!page.resource) {
      return { success: false, errorCode: 10001, errorMsg: "NOT_FOUND", response: null };
    }
    return {
      success: true,
      errorCode: 0,
      errorMsg: "",
      response: {
        resource: page.resource,
        rows: await attachImageTranslations({ shop: args.shop, languageCode, rows: page.rows }),
        canWriteFiles,
      },
    };
  }

  const languageCode =
    typeof args.body.languageCode === "string" ? args.body.languageCode.trim() : "";
  const page = await listImageResources({
    admin: args.admin,
    shop: args.shop,
    uiLocale,
    type,
    after: typeof args.body.after === "string" ? args.body.after : null,
    q: typeof args.body.q === "string" ? args.body.q : null,
    status: typeof args.body.status === "string" ? args.body.status : null,
  });
  let rows = page.rows;
  if (languageCode) {
    rows = await attachTranslationsToFlatResourceRows({
      shop: args.shop,
      languageCode,
      type,
      rows,
    });
    if (type === "product") {
      rows = await attachProductTranslationCounts({
        shop: args.shop,
        languageCode,
        rows,
      });
    }
  }
  return {
    success: true,
    errorCode: 0,
    errorMsg: "",
    response: { ...page, rows, canWriteFiles },
  };
}
