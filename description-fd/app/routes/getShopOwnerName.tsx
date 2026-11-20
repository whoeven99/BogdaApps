import { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;
  try {
    const response = await admin.graphql(
      `#graphql
            query {
                shop {
                    shopOwnerName
                }
            }`,
    );

    const data = await response.json();

    return {
      shopOwnerName: data.data.shop.shopOwnerName,
    };
  } catch (error) {
    console.error(error);
    return {
      shopOwnerName: "",
    };
  }
};
