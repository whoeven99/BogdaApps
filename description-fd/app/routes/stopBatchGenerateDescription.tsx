import { ActionFunctionArgs } from "@remix-run/node";
import { StopBatchGenerateDescription } from "app/api/JavaServer";
import { authenticate } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = (await authenticate.admin(request)).session;
  const { shop } = adminAuthResult;
  const response = await StopBatchGenerateDescription({
    shop: shop as string,
  });
  return response;
};
