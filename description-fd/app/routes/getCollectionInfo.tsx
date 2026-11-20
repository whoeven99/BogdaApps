import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { mapCollectionList } from "../server/shopify/graphqlList.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const endCursor = formData.get("endCursor");
  const query = formData.get("query");
  try {
    const response = await admin.graphql(
      `#graphql
      query collections($first: Int!, $endCursor: String, $query: String) {
        collections(first: $first, after: $endCursor, query: $query) {
          edges {
            node {
              id
              title
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      {
        variables: {
          first: 50,
          endCursor,
          query: query || "",
        },
      },
    );
    const responseJson = await response.json();
    return {
      success: true,
      errorCode: null,
      errorMessage: null,
      response: mapCollectionList(responseJson),
    };
  } catch (error) {
    console.error("getCollectionInfo error", error);
    return {
      success: false,
      errorCode: "INTERNAL_SERVER_ERROR",
      errorMessage: "Internal server error",
      response: {
        data: [],
        hasNextPage: false,
        endCursor: null,
      },
    };
  }
};
