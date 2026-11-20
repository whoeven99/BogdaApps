import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const productIds = formData.get("productIds");
  const productIdsArray = productIds?.toString()?.split(",");
  const query = productIdsArray
    ?.map((id) => `id:${id.split("gid://shopify/Product/")[1]}`)
    .join(" OR ");
  try {
    const response = await admin.graphql(
      `#graphql
          query products($query: String!) {
            products(query: $query, first: 20) {
                nodes {
                    id
                    title
                }
            }
          }`,
      {
        variables: {
          query: query,
        },
      },
    );
    const responseJson = await response.json();
    return {
      success: true,
      errorCode: null,
      errorMessage: null,
      response: Array.isArray(responseJson?.data?.products?.nodes)
        ? responseJson.data.products.nodes
        : [],
    };
  } catch (error: any) {
    console.error(`${shop} getProductInfoById error`);
    console.error("error: ", error);
    return {
      success: false,
      errorCode: "INTERNAL_SERVER_ERROR",
      errorMessage: "Internal server error",
      response: null,
    };
  }
};
