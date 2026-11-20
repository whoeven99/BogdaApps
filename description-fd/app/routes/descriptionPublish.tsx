import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { publishOk } from "../lib/publishResult.server";
import { publishGeneratedContent } from "../server/shopify/publishGenerated.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = String(formData.get("id") || "");
  const pageType = String(formData.get("pageType") || "");
  const contentType = String(formData.get("contentType") || "");
  const description = String(formData.get("description") || "");
  const title = String(formData.get("title") || "").trim();

  console.log("descriptionPublish: ", { id, pageType, contentType, writeTitle: Boolean(title) });

  const result = await publishGeneratedContent({
    graphql: admin.graphql,
    resourceId: id,
    pageType,
    contentType,
    description,
    title,
  });
  return publishOk(result.value, result.userErrors, result.value);
};
