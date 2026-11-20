import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { generateDescriptionCopy } from "../server/ai/generateDescription.server";
import { QuotaError } from "../server/billing/quota.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const resourceId = String(formData.get("productId") || formData.get("id") || "");
  const pageType = String(formData.get("pageType") || "product");
  const contentType = String(formData.get("contentType") || "description");

  if (!resourceId) {
    return {
      success: false,
      errorCode: "MISSING_RESOURCE",
      errorMessage: "Product or collection is required",
      response: null,
    };
  }

  try {
    const response = await generateDescriptionCopy({
      shop: session.shop,
      admin,
      resourceId,
      pageType,
      contentType,
      languageStyle: String(formData.get("languageStyle") || "formal"),
      brandStyle: String(formData.get("brandStyle") || ""),
      language: String(formData.get("language") || "English"),
      seoKeywords: String(formData.get("seoKeywords") || ""),
      brandWord: String(formData.get("brandWord") || ""),
      brandSlogan: String(formData.get("brandSlogan") || ""),
      additionalInformation: String(formData.get("additionalInformation") || ""),
      model: String(formData.get("model") || "ChatGPT"),
      templateId: Number(formData.get("templateId") || 0) || undefined,
      templateSource:
        formData.get("templateType") == null
          ? undefined
          : String(formData.get("templateType")) === "true" ||
              String(formData.get("templateType")) === "user"
            ? "user"
            : "official",
    });
    return {
      success: true,
      errorCode: null,
      errorMessage: null,
      response,
    };
  } catch (error) {
    console.error("aiGenerateDescription error", error);
    return {
      success: false,
      errorCode: error instanceof QuotaError ? error.code : "GENERATE_FAILED",
      errorMessage: error instanceof Error ? error.message : "Failed to generate description",
      response: null,
    };
  }
};
