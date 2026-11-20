import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const productId = formData.get("productId");
  const pageType = String(formData.get("pageType") || "product");
  try {
    if (pageType === "collection") {
      const response = await admin.graphql(
        `#graphql
          query collection($id: ID!) {
            collection(id: $id) {
              id
              title
              descriptionHtml
            }
          }`,
        { variables: { id: productId } },
      );
      const responseJson = await response.json();
      const collection = responseJson?.data?.collection;
      if (!collection) {
        return {
          success: false,
          errorCode: "NOT_FOUND",
          errorMessage: "Collection not found",
          response: null,
        };
      }
      return {
        success: true,
        errorCode: null,
        errorMessage: null,
        response: collection,
      };
    }

    const response = await admin.graphql(
      `#graphql
          query product($id: ID!) {
            product(id: $id) {
                id
                title
                status
                descriptionHtml
                media(first: 1) {
                  edges {
                      node {
                        preview {
                            image {
                            id
                            url
                            }
                        }
                      }
                  }
                }
            }
          }`,
      {
        variables: {
          id: productId,
        },
      },
    );
    const responseJson = await response.json();
    const product = responseJson?.data?.product;
    if (!product) {
      return {
        success: false,
        errorCode: "NOT_FOUND",
        errorMessage: "Product not found",
        response: null,
      };
    }
    return {
      success: true,
      errorCode: null,
      errorMessage: null,
      response: product,
    };
  } catch (error: unknown) {
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
