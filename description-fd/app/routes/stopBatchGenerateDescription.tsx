import type { ActionFunctionArgs } from "@remix-run/node";
import { requestStop } from "app/server/generateJob/job.server";
import { authenticate } from "app/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = (await authenticate.admin(request)).session;
  const { shop } = adminAuthResult;
  const ok = await requestStop(shop as string);
  return { success: ok };
};
