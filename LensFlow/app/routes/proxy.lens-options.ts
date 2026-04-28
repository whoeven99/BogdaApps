import type { LoaderFunctionArgs } from "react-router";

import { buildStorefrontLensWidgetData } from "../lib/storefront-lens.server";
import { authenticate } from "../shopify.server";
import { fetchShopifyProduct } from "../services/shopify-products.server";

function parsePrescriptionType(value: string | null) {
  if (
    value === "non_prescription" ||
    value === "single_vision" ||
    value === "progressive" ||
    value === "reading"
  ) {
    return value;
  }

  return undefined;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.public.appProxy(request);
  if (!admin) {
    return Response.json(
      { error: "当前店铺未建立可用的 app proxy session" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const productId = url.searchParams.get("productId") ?? "";
  const variantId = url.searchParams.get("variantId") ?? undefined;
  const prescriptionType = parsePrescriptionType(
    url.searchParams.get("prescriptionType"),
  );

  if (!productId) {
    return Response.json(
      { error: "缺少 productId 参数" },
      { status: 400 },
    );
  }

  const product = await fetchShopifyProduct(admin, productId);
  if (!product) {
    return Response.json(
      { error: "未找到对应商品" },
      { status: 404 },
    );
  }

  const data = await buildStorefrontLensWidgetData(product, {
    selectedVariantId: variantId,
    prescriptionType,
  });

  return Response.json(data);
};
