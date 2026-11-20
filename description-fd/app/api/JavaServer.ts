import axios from "axios";

export const GetProductsByListId = async ({
  server,
  shop,
  listId,
}: {
  server: string;
  shop: string;
  listId: string[];
}) => {
  try {
    const response = await axios.post(
      `${server}/apg/product/getProductsByListId?shopName=${shop}`,
      listId,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error getProductsByListId",
    };
  }
};

export const SaveOrUpdateProduct = async ({
  server,
  shop,
  productId,
}: {
  server: string;
  shop: string;
  productId: string;
}) => {
  try {
    const response = await axios.post(
      `${server}/apg/product/saveOrUpdateProduct?shopName=${shop}`,
      {
        productId: productId,
      },
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error saveOrUpdateProduct",
    };
  }
};

export const GenerateDescription = async ({
  server,
  shop,
  pageType,
  contentType,
  productId,
  languageStyle,
  brandStyle,
  templateId,
  templateType,
  model,
  language,
  seoKeywords,
  brandWord,
  brandSlogan,
}: {
  server: string;
  shop: string;
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
    const response = await axios.post(
      `${server}/apg/descriptionGeneration/generateDescription?shopName=${shop}`,
      {
        pageType: pageType,
        contentType: contentType,
        productId: productId,
        textTone: languageStyle,
        brandTone: brandStyle,
        templateId: templateId,
        templateType: templateType,
        model: model,
        language: language,
        seoKeywords: seoKeywords,
        brandWord: brandWord,
        brandSlogan: brandSlogan,
      },
    );
    if (response.data?.success) {
      return {
        ...response.data,
        response: {
          wordCount: response.data.response.wordCount,
          wordGap: response.data.response.wordGap || 25,
          keywordStrong: response.data.response.keywordStrong,
          keywordPercent: response.data.response.keywordPercent,
          keywordCompare: response.data.response.keywordCompare,
          textPercent: response.data.response.textPercent,
          ctrIncrease: response.data.response.ctrIncrease,
          description: response.data.response.generateText.replace(
            /\n/g,
            "<br/>",
          ),
          pageType: pageType,
          contentType: contentType,
        },
      };
    }
    // return{
    //   success: true,
    //   error: null,
    //   errorMsg: null,
    //   response: {
    //     description: "test",
    //     pageType: pageType,
    //     contentType: contentType,
    //   },
    // };
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error GenerateDescription",
    };
  }
};

export const BatchGenerateDescription = async ({
  // server,
  shop,
  productIds,
  pageType,
  contentType,
  languageStyle,
  brandStyle,
  templateId,
  templateType,
  model,
  language,
  seoKeywords,
  brandWord,
  brandSlogan,
}: {
  // server: string;
  shop: string;
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
    const response = await axios.put(
      `${process.env.SERVER_URL}/apg/userGeneratedTask/batchGenerateDescription?shopName=${shop}`,
      {
        productIds: productIds,
        textTone: languageStyle,
        brandTone: brandStyle,
        templateId: templateId,
        templateType: templateType,
        model: model,
        language: language,
        seoKeywords: seoKeywords,
        brandWord: brandWord,
        brandSlogan: brandSlogan,
        pageType: pageType,
        contentType: contentType,
      },
    );
    if (response.data?.success) {
      return {
        success: true,
        error: null,
        errorMsg: null,
        response: {
          allCount: productIds.length,
          unfinishedCount: productIds.length,
          taskModel: `${pageType} ${contentType}`,
          taskStatus: 2,
        },
      };
    } else {
      return {
        success: false,
        error: null,
        errorMsg: null,
        response: {
          allCount: productIds.length,
          unfinishedCount: productIds.length,
          taskModel: `${pageType} ${contentType}`,
          taskStatus: 4,
        },
      };
    }
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      error: null,
      errorMsg: null,
      response: {
        allCount: productIds.length,
        unfinishedCount: productIds.length,
        taskModel: `${pageType} ${contentType}`,
        taskStatus: 4,
      },
    };
  }
};

export const GetTemplateByShopName = async ({
  server,
  shop,
  pageType,
  contentType,
}: {
  server: string;
  shop: string;
  pageType: string | null;
  contentType: string;
}) => {
  try {
    let response: any = [];
    const res = await axios.post(
      `${server}/apg/template/getTemplateByShopName?shopName=${shop}`,
      // {
      //   templateModel: pageType,
      //   templateSubtype: contentType,
      // },
    );

    if (res.data.success) {
      const rows = Array.isArray(res.data.response) ? res.data.response : [];
      if (pageType === null && contentType === "description") {
        response = rows.filter(
          (item: any) => item.templateSubtype === "description",
        );
      } else if (pageType === null && contentType === "seo") {
        response = rows.filter(
          (item: any) => item.templateSubtype === "seo",
        );
      } else if (pageType === "product" && contentType === "description") {
        response = rows.filter(
          (item: any) =>
            item.templateModel === "product" &&
            item.templateSubtype === "description",
        );
      } else if (pageType === "collection" && contentType === "description") {
        response = rows.filter(
          (item: any) =>
            item.templateModel === "collection" &&
            item.templateSubtype === "description",
        );
      } else if (pageType === "product" && contentType === "seo") {
        response = rows.filter(
          (item: any) =>
            item.templateModel === "product" && item.templateSubtype === "seo",
        );
      } else if (pageType === "collection" && contentType === "seo") {
        response = rows.filter(
          (item: any) =>
            item.templateModel === "collection" &&
            item.templateSubtype === "seo",
        );
      }
    }
    return Array.isArray(response) ? response : [];
  } catch (error) {
    console.log(error);
    return [];
  }
};

export const GetAllTemplateData = async ({
  server,
  shop,
  pageType,
  contentType,
  templateType,
  templateClass,
}: {
  server: string;
  shop: string;
  pageType: string | null;
  contentType: string;
  templateType: string | null;
  templateClass: boolean;
}) => {
  try {
    const response = await axios.post(
      `${server}/apg/template/getAllTemplateData?shopName=${shop}`,
      {
        templateModel: pageType,
        templateSubtype: contentType,
        templateType: templateType,
        templateClass: templateClass,
      },
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error GenerateDescription",
    };
  }
};

export const AddOfficialOrUserTemplate = async ({
  server,
  shop,
  templateId,
  templateType,
}: {
  server: string;
  shop: string;
  templateId: number;
  templateType: boolean;
}) => {
  try {
    const response = await axios.post(
      `${server}/apg/template/addOfficialOrUserTemplate?shopName=${shop}`,
      {
        templateId: templateId,
        templateType: templateType,
      },
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error AddOfficialTemplate",
    };
  }
};

export const DeleteUserTemplate = async ({
  server,
  shop,
  id,
  templateClass,
}: {
  server: string;
  shop: string;
  id: number;
  templateClass: boolean;
}) => {
  try {
    const response = await axios.post(
      `${server}/apg/template/deleteUserTemplate?shopName=${shop}`,
      {
        id: id,
        templateClass: templateClass,
      },
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error DeleteUserTemplate",
    };
  }
};

export const GetUserData = async ({
  server,
  shop,
}: {
  server: string;
  shop: string;
}) => {
  try {
    const response = await axios.get(
      `${server}/apg/userGeneratedTask/getUserData?shopName=${shop}`,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error GetUserData",
    };
  }
};

export const StopBatchGenerateDescription = async ({
  shop,
}: {
  shop: string;
}) => {
  try {
    const response = await axios.put(
      `${process.env.SERVER_URL}/apg/userGeneratedTask/stopBatchGenerateDescription?shopName=${shop}`,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error StopBatchGenerateDescription",
    };
  }
};

export const CreateUserTemplate = async ({
  server,
  shop,
  templateData,
  templateDescription,
  templateTitle,
  templateType = "",
  templateModel,
  templateSubtype,
}: {
  server: string;
  shop: string;
  templateData: string;
  templateDescription: string;
  templateTitle: string;
  templateType: string;
  templateModel: string;
  templateSubtype: string;
}) => {
  try {
    const response = await axios.post(
      `${server}/apg/template/createUserTemplate?shopName=${shop}`,
      {
        templateData: templateData,
        templateDescription: templateDescription,
        templateTitle: templateTitle,
        templateType: templateType,
        templateModel: templateModel,
        templateSubtype: templateSubtype,
      },
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error CreateUserTemplate",
    };
  }
};

export const PreviewExampleDataByTemplateId = async ({
  server,
  shop,
  templateId,
}: {
  server: string;
  shop: string;
  templateId: number;
}) => {
  try {
    const response = await axios.get(
      `${server}/apg/template/previewExampleDataByTemplateId?shopName=${shop}&templateId=${templateId}`,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error PreviewExampleDataByTemplateId",
    };
  }
};

export const GetUserCounter = async ({
  server,
  shop,
}: {
  server: string;
  shop: string;
}) => {
  try {
    const response = await axios.post(
      `${server}/apg/userCounter/getUserCounter?shopName=${shop}`,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error GetUserCounter",
    };
  }
};

export const InsertOrUpdateOrder = async ({
  id,
  shop,
  amount,
  name,
  createdAt,
  status,
  confirmationUrl,
}: {
  id: string;
  shop: string;
  amount: number;
  name: string;
  createdAt: string;
  status: string;
  confirmationUrl: string;
}) => {
  try {
    const response = await axios.post(
      `${process.env.SERVER_URL}/apg/orders/insertOrUpdateOrder?shopName=${shop}`,
      {
        id,
        amount: amount,
        name: name,
        createdAt: createdAt,
        status: status,
        confirmationUrl: confirmationUrl,
      },
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error GetUserCounter",
    };
  }
};

export const UpdateUserToken = async ({
  shop,
  token,
}: {
  shop: string;
  token: number;
}) => {
  try {
    const response = await axios.put(
      `${process.env.SERVER_URL}/apg/userCounter/updateUserToken?shopName=${shop}&token=${token}`,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error UpdateUserToken",
    };
  }
};

export const SendAPGPurchaseEmail = async ({
  shop,
  token,
  amount,
}: {
  shop: string;
  token: number;
  amount: number;
}) => {
  try {
    const response = await axios.post(
      `${process.env.SERVER_URL}/apg/userCounter/sendAPGPurchaseEmail?shopName=${shop}&token=${token}&amount=${amount}`,
    );
    return response.data;
  } catch (error) {
    console.log(error);
    return {
      success: false,
      message: "Error SendAPGPurchaseEmail",
    };
  }
};
