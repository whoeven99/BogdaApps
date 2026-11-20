import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { ensureAccount } from "../server/billing/ensureAccount.server";
import { toCounterDto } from "../server/billing/quota.server";
import {
  addPick,
  createUserTemplate,
  listCatalog,
  listPickedTemplates,
  previewOfficial,
  removeUserTemplate,
  type TemplateSource,
} from "../server/template/template.server";
import {
  enqueueBatchJob,
  getUserData,
  requestStop,
} from "../server/generateJob/job.server";
import { generateDescriptionCopy } from "../server/ai/generateDescription.server";
import { QuotaError } from "../server/billing/quota.server";
import { loadProductsByIds } from "../server/shopify/productsByIds.server";
import { DEFAULT_DESCRIPTION_AI_MODEL } from "../lib/descriptionAiModels";

function asSource(value: unknown): TemplateSource {
  if (value === true || value === "true" || value === "user") return "user";
  return "official";
}

function ok(response: unknown) {
  return { success: true, error: null, errorMsg: null, message: null, response };
}

function fail(message: string, response: unknown = null) {
  return { success: false, error: null, errorMsg: message, message, response };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const intent = url.searchParams.get("intent") || "counter";
  const shop = session.shop;
  await ensureAccount(shop);
  if (intent === "counter") {
    const account = await ensureAccount(shop);
    return ok(toCounterDto(account));
  }
  if (intent === "progress") {
    return ok(await getUserData(shop));
  }
  return fail("Unknown intent");
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  await ensureAccount(shop);
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "");

  if (intent === "listPicked") {
    const pageType = (formData.get("pageType") as string) || null;
    const contentType = (formData.get("contentType") as string) || "description";
    return await listPickedTemplates(shop, pageType === "null" ? null : pageType, contentType);
  }

  if (intent === "listCatalog") {
    const rows = await listCatalog(shop, {
      pageType: (formData.get("pageType") as string) || null,
      contentType: String(formData.get("contentType") || "description"),
      templateType: (formData.get("templateType") as string) || null,
      templateClass: String(formData.get("templateClass") || "") === "true",
    });
    return ok(rows);
  }

  if (intent === "addPick") {
    const added = await addPick(
      shop,
      Number(formData.get("templateId")),
      asSource(formData.get("templateType")),
    );
    return added ? ok(true) : fail("Add failed");
  }

  if (intent === "deleteTemplate") {
    const removed = await removeUserTemplate(
      shop,
      Number(formData.get("id")),
      String(formData.get("templateClass") || "") === "true",
    );
    return removed ? ok(true) : fail("Delete failed");
  }

  if (intent === "createTemplate") {
    await createUserTemplate(shop, {
      templateData: String(formData.get("templateData") || ""),
      templateTitle: String(formData.get("templateTitle") || ""),
      templateDescription: String(formData.get("templateDescription") || ""),
      templateType: String(formData.get("templateType") || ""),
      templateModel: String(formData.get("templateModel") || "product"),
      templateSubtype: String(formData.get("templateSubtype") || "description"),
    });
    return ok(true);
  }

  if (intent === "preview") {
    return ok(await previewOfficial(Number(formData.get("templateId"))));
  }

  if (intent === "progress") {
    return ok(await getUserData(shop));
  }

  if (intent === "enqueue") {
    const productIds = JSON.parse(String(formData.get("productIds") || "[]")) as string[];
    const result = await enqueueBatchJob({
      shop,
      productIds,
      pageType: String(formData.get("pageType") || "product"),
      contentType: String(formData.get("contentType") || "description"),
      languageStyle: String(formData.get("languageStyle") || ""),
      brandStyle: String(formData.get("brandStyle") || ""),
      templateId: Number(formData.get("templateId") || 0),
      templateSource: asSource(formData.get("templateType")),
      model: String(formData.get("model") || DEFAULT_DESCRIPTION_AI_MODEL),
      language: String(formData.get("language") || "English"),
      seoKeywords: String(formData.get("seoKeywords") || ""),
      brandWord: String(formData.get("brandWord") || ""),
      brandSlogan: String(formData.get("brandSlogan") || ""),
    });
    if (!result.ok) {
      return {
        success: false,
        error: null,
        errorMsg: null,
        response: {
          allCount: productIds.length,
          unfinishedCount: productIds.length,
          taskModel: `${formData.get("pageType") || "product"} ${formData.get("contentType") || "description"}`,
          taskStatus: 4,
        },
      };
    }
    return {
      success: true,
      error: null,
      errorMsg: null,
      response: {
        allCount: productIds.length,
        unfinishedCount: productIds.length,
        taskModel: `${formData.get("pageType") || "product"} ${formData.get("contentType") || "description"}`,
        taskStatus: 2,
      },
    };
  }

  if (intent === "stop") {
    await requestStop(shop);
    return ok(true);
  }

  if (intent === "productsByIds") {
    const raw = String(formData.get("productIds") || "");
    const ids = raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    return ok(await loadProductsByIds(admin, ids));
  }

  if (intent === "generate") {
    try {
      const response = await generateDescriptionCopy({
        shop,
        admin,
        resourceId: String(formData.get("productId") || formData.get("id") || ""),
        pageType: String(formData.get("pageType") || "product"),
        contentType: String(formData.get("contentType") || "description"),
        languageStyle: String(formData.get("languageStyle") || "formal"),
        brandStyle: String(formData.get("brandStyle") || ""),
        language: String(formData.get("language") || "English"),
        seoKeywords: String(formData.get("seoKeywords") || ""),
        brandWord: String(formData.get("brandWord") || ""),
        brandSlogan: String(formData.get("brandSlogan") || ""),
        additionalInformation: String(formData.get("additionalInformation") || ""),
        model: String(formData.get("model") || DEFAULT_DESCRIPTION_AI_MODEL),
        templateId: Number(formData.get("templateId") || 0) || undefined,
        templateSource: formData.get("templateType") != null ? asSource(formData.get("templateType")) : undefined,
      });
      return {
        success: true,
        error: null,
        errorMsg: null,
        response: {
          ...response,
          description: response.description,
          wordCount: 0,
          wordGap: 25,
        },
      };
    } catch (error) {
      if (error instanceof QuotaError) {
        return fail("Insufficient credits");
      }
      return fail(error instanceof Error ? error.message : "Failed to generate description");
    }
  }

  return fail("Unknown intent");
};
