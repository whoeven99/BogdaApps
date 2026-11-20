async function sessionHeaders(): Promise<HeadersInit> {
  const shopify = (globalThis as { shopify?: { idToken?: () => Promise<string> } }).shopify;
  const token = await shopify?.idToken?.().catch(() => "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postApg(intent: string, fields: Record<string, string | number | boolean | null | undefined> = {}) {
  const form = new FormData();
  form.set("intent", intent);
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    form.set(key, String(value));
  }
  const response = await fetch("/api/apg", {
    method: "POST",
    body: form,
    credentials: "same-origin",
    headers: await sessionHeaders(),
  });
  return response.json();
}

async function getApg(intent: string) {
  const response = await fetch(`/api/apg?intent=${encodeURIComponent(intent)}`, {
    credentials: "same-origin",
    headers: await sessionHeaders(),
  });
  return response.json();
}

export const GetProductsByListId = async ({
  listId,
}: {
  server?: string;
  shop?: string;
  listId: string[];
}) => {
  try {
    return await postApg("productsByIds", { productIds: listId.join(",") });
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error getProductsByListId" };
  }
};

export const SaveOrUpdateProduct = async () => {
  return { success: true, response: null };
};

export const GenerateDescription = async (input: {
  server?: string;
  shop?: string;
  pageType: string;
  contentType: string;
  productId: string;
  languageStyle: string;
  brandStyle?: string;
  templateId: number;
  templateType: boolean;
  model: string;
  language: string;
  seoKeywords?: string;
  brandWord?: string;
  brandSlogan?: string;
}) => {
  try {
    return await postApg("generate", {
      pageType: input.pageType,
      contentType: input.contentType,
      productId: input.productId,
      languageStyle: input.languageStyle,
      brandStyle: input.brandStyle,
      templateId: input.templateId,
      templateType: input.templateType,
      model: input.model,
      language: input.language,
      seoKeywords: input.seoKeywords,
      brandWord: input.brandWord,
      brandSlogan: input.brandSlogan,
    });
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error GenerateDescription" };
  }
};

export const BatchGenerateDescription = async (input: {
  server?: string;
  shop?: string;
  productIds: string[];
  pageType: string;
  contentType: string;
  languageStyle: string;
  brandStyle?: string;
  templateId: number;
  templateType: boolean;
  model: string;
  language: string;
  seoKeywords?: string;
  brandWord?: string;
  brandSlogan?: string;
}) => {
  try {
    return await postApg("enqueue", {
      productIds: JSON.stringify(input.productIds),
      pageType: input.pageType,
      contentType: input.contentType,
      languageStyle: input.languageStyle,
      brandStyle: input.brandStyle,
      templateId: input.templateId,
      templateType: input.templateType,
      model: input.model,
      language: input.language,
      seoKeywords: input.seoKeywords,
      brandWord: input.brandWord,
      brandSlogan: input.brandSlogan,
    });
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: null,
      errorMsg: null,
      response: {
        allCount: input.productIds.length,
        unfinishedCount: input.productIds.length,
        taskModel: `${input.pageType} ${input.contentType}`,
        taskStatus: 4,
      },
    };
  }
};

export const GetTemplateByShopName = async ({
  pageType,
  contentType,
}: {
  server?: string;
  shop?: string;
  pageType: string | null;
  contentType: string;
}) => {
  try {
    const rows = await postApg("listPicked", {
      pageType,
      contentType,
    });
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const GetAllTemplateData = async ({
  pageType,
  contentType,
  templateType,
  templateClass,
}: {
  server?: string;
  shop?: string;
  pageType: string | null;
  contentType: string;
  templateType: string | null;
  templateClass: boolean;
}) => {
  try {
    return await postApg("listCatalog", {
      pageType,
      contentType,
      templateType,
      templateClass,
    });
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error GenerateDescription" };
  }
};

export const AddOfficialOrUserTemplate = async ({
  templateId,
  templateType,
}: {
  server?: string;
  shop?: string;
  templateId: number;
  templateType: boolean;
}) => {
  try {
    return await postApg("addPick", { templateId, templateType });
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error AddOfficialTemplate" };
  }
};

export const DeleteUserTemplate = async ({
  id,
  templateClass,
}: {
  server?: string;
  shop?: string;
  id: number;
  templateClass: boolean;
}) => {
  try {
    return await postApg("deleteTemplate", { id, templateClass });
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error DeleteUserTemplate" };
  }
};

export const GetUserData = async (_args?: { server?: string; shop?: string }) => {
  try {
    return await postApg("progress");
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error GetUserData" };
  }
};

export const StopBatchGenerateDescription = async (_args?: { shop?: string }) => {
  try {
    return await postApg("stop");
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error StopBatchGenerateDescription" };
  }
};

export const CreateUserTemplate = async (input: {
  server?: string;
  shop?: string;
  templateData: string;
  templateDescription: string;
  templateTitle: string;
  templateType: string;
  templateModel: string;
  templateSubtype: string;
}) => {
  try {
    return await postApg("createTemplate", {
      templateData: input.templateData,
      templateDescription: input.templateDescription,
      templateTitle: input.templateTitle,
      templateType: input.templateType,
      templateModel: input.templateModel,
      templateSubtype: input.templateSubtype,
    });
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error CreateUserTemplate" };
  }
};

export const PreviewExampleDataByTemplateId = async ({
  templateId,
}: {
  server?: string;
  shop?: string;
  templateId: number;
}) => {
  try {
    return await postApg("preview", { templateId });
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error PreviewExampleDataByTemplateId" };
  }
};

export const GetUserCounter = async (_args?: { server?: string; shop?: string }) => {
  try {
    return await getApg("counter");
  } catch (error) {
    console.log(error);
    return { success: false, message: "Error GetUserCounter" };
  }
};

export const InsertOrUpdateOrder = async () => ({ success: true });
export const UpdateUserToken = async () => ({ success: true });
export const SendAPGPurchaseEmail = async () => ({ success: true });
