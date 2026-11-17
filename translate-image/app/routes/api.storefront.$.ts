import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { verifyAppProxyHmac } from "~/server/storefront/auth.server";
import { fail } from "~/server/storefront/response.server";
import {
  getStorefrontPicturesByUrlKeys,
  getStorefrontProductPictures,
  getStorefrontShopPictures,
} from "~/server/picture/storefrontPictures.server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

function authenticate(request: Request): { ok: true; shop: string } | { ok: false } {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop") ?? "";
  if (!shop) return { ok: false };
  const timestampRaw = url.searchParams.get("timestamp");
  const timestamp = timestampRaw ? Number(timestampRaw) : Number.NaN;
  if (!Number.isFinite(timestamp)) return { ok: false };
  const MAX_SKEW_MS = 5 * 60 * 1000;
  if (Math.abs(Date.now() - timestamp * 1000) > MAX_SKEW_MS) return { ok: false };
  const apiSecret = process.env.SHOPIFY_API_SECRET ?? "";
  if (!apiSecret) {
    console.error("[storefront] SHOPIFY_API_SECRET not set");
    return { ok: false };
  }
  if (!verifyAppProxyHmac(url, apiSecret)) return { ok: false };
  return { ok: true, shop };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const auth = authenticate(request);
  if (!auth.ok) {
    return json(fail(401, "unauthorized"), { status: 401, headers: CORS_HEADERS });
  }
  return json(fail(404, "not found"), { status: 404, headers: CORS_HEADERS });
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method.toUpperCase() === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  const auth = authenticate(request);
  if (!auth.ok) {
    return json(fail(401, "unauthorized"), { status: 401, headers: CORS_HEADERS });
  }
  const path = (params["*"] ?? "").replace(/^\/+/, "");
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const shopName = typeof body.shopName === "string" && body.shopName.trim() ? body.shopName.trim() : auth.shop;
  if (shopName !== auth.shop) {
    return json(fail(403, "forbidden"), { status: 403, headers: CORS_HEADERS });
  }
  const languageCode = typeof body.languageCode === "string" ? body.languageCode : "";

  try {
    if (
      path === "picture/selectPictureDataByShopNameAndProductIdAndLanguageCode" ||
      path === "picture/getPictureDataByShopNameAndResourceIdAndPictureId"
    ) {
      const productId =
        typeof body.productId === "string"
          ? body.productId
          : typeof body.imageId === "string"
            ? body.imageId
            : "";
      const result = await getStorefrontProductPictures({
        shop: auth.shop,
        productId,
        languageCode,
      });
      return json(result, { headers: CORS_HEADERS });
    }
    if (
      path === "picture/selectPicturesByShopNameAndLanguageCode" ||
      path === "picture/getPictureDataByShopNameAndLanguageCode"
    ) {
      const result = await getStorefrontShopPictures({
        shop: auth.shop,
        languageCode,
      });
      return json(result, { headers: CORS_HEADERS });
    }
    if (path === "picture/getPictureDataByUrlKeys") {
      const result = await getStorefrontPicturesByUrlKeys({
        shop: auth.shop,
        languageCode,
        urlKeys: body.urlKeys,
      });
      return json(result, { headers: CORS_HEADERS });
    }
  } catch (err) {
    console.error(`[storefront] ${path} failed shop=${auth.shop}`, err);
    return json(fail(10001, "internal error"), { status: 500, headers: CORS_HEADERS });
  }

  return json(fail(404, "not found"), { status: 404, headers: CORS_HEADERS });
};
