import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { loadProductsByIds } from "app/server/shopify/productsByIds.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const productIds = formData.get("productIds");
  const productIdsArray = productIds
    ?.toString()
    ?.split(",")
    .map((id) => id.trim())
    .filter(Boolean) ?? [];
  try {
    const nodes = await loadProductsByIds(admin, productIdsArray);
    return {
      success: true,
      errorCode: null,
      errorMessage: null,
      response: nodes,
    };
  } catch (error: unknown) {
    console.error(`${shop} getProductInfoByIds error`);
    console.error("error: ", error);
    return {
      success: false,
      errorCode: "INTERNAL_SERVER_ERROR",
      errorMessage: "Internal server error",
      response: null,
    };
  }
};
