import type { LoaderFunctionArgs } from "react-router";

import { recommendProductsForEyeExam } from "../../src/services/prescriptionRecommendations.js";
import type { EyeExamInput } from "../../src/types/prescription.js";
import { authenticate } from "../shopify.server";
import {
  fetchShopifyProducts,
  toRecommendableProduct,
} from "../services/shopify-products.server";

function parseNumber(value: string | null): number | undefined {
  if (value === null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseExamInput(url: URL): EyeExamInput {
  const prescriptionType = url.searchParams.get("prescriptionType");

  return {
    prescriptionType:
      prescriptionType === "non_prescription" ||
      prescriptionType === "single_vision" ||
      prescriptionType === "progressive" ||
      prescriptionType === "reading"
        ? prescriptionType
        : undefined,
    leftEye: {
      sphere: parseNumber(url.searchParams.get("leftSphere")),
      cylinder: parseNumber(url.searchParams.get("leftCylinder")),
      axis: parseNumber(url.searchParams.get("leftAxis")),
    },
    rightEye: {
      sphere: parseNumber(url.searchParams.get("rightSphere")),
      cylinder: parseNumber(url.searchParams.get("rightCylinder")),
      axis: parseNumber(url.searchParams.get("rightAxis")),
    },
    addPower: parseNumber(url.searchParams.get("addPower")),
    pd: parseNumber(url.searchParams.get("pd")),
  };
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
  const examInput = parseExamInput(url);
  const products = await fetchShopifyProducts(admin, 50);
  const result = recommendProductsForEyeExam(
    products.map(toRecommendableProduct),
    examInput,
  );

  return Response.json(result);
};
