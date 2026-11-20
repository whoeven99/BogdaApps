import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { emptyProductList, mapProductList } from "../server/shopify/graphqlList.server";

const PRODUCT_CONNECTION_FIELDS = `
  edges {
    node {
      id
      title
      status
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
  }
  pageInfo {
    hasPreviousPage
    startCursor
    hasNextPage
    endCursor
  }
`;

function fail(shop: string, label: string, error: unknown) {
  console.error(`${shop} getProductInfo ${label} error`);
  console.error("error: ", error);
  return {
    success: false,
    errorCode: "INTERNAL_SERVER_ERROR",
    errorMessage: "Internal server error",
    response: emptyProductList(),
  };
}

function ok(json: unknown) {
  return {
    success: true,
    errorCode: null,
    errorMessage: null,
    response: mapProductList(json),
  };
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const formData = await request.formData();
  const pageSize = formData.get("pageSize");
  const startCursor = formData.get("startCursor");
  const endCursor = formData.get("endCursor");
  const query = formData.get("query") || "";

  if (startCursor) {
    try {
      const response = await admin.graphql(
        `#graphql
          query products($last: Int!, $startCursor: String, $query: String) {
            products(last: $last, before: $startCursor, query: $query) {
              ${PRODUCT_CONNECTION_FIELDS}
            }
          }`,
        {
          variables: {
            last: Number(pageSize) || 50,
            startCursor,
            query,
          },
        },
      );
      return ok(await response.json());
    } catch (error: unknown) {
      return fail(shop, "firstCursor", error);
    }
  }

  if (endCursor) {
    try {
      const response = await admin.graphql(
        `#graphql
          query products($first: Int!, $endCursor: String, $query: String) {
            products(first: $first, after: $endCursor, query: $query) {
              ${PRODUCT_CONNECTION_FIELDS}
            }
          }`,
        {
          variables: {
            first: Number(pageSize) || 50,
            endCursor,
            query,
          },
        },
      );
      return ok(await response.json());
    } catch (error: unknown) {
      return fail(shop, "endCursor", error);
    }
  }

  try {
    const response = await admin.graphql(
      `#graphql
        query products($first: Int!, $endCursor: String, $query: String) {
          products(first: $first, after: $endCursor, query: $query) {
            ${PRODUCT_CONNECTION_FIELDS}
          }
        }`,
      {
        variables: {
          first: Number(pageSize) || 20,
          endCursor,
          query,
        },
      },
    );
    return ok(await response.json());
  } catch (error: unknown) {
    return fail(shop, "default", error);
  }
};
