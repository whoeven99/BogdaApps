import axios from "axios";
import { authenticate } from "~/shopify.server";
// import { queryShop, queryShopLanguages } from "./admin";
// import { ShopLocalesType } from "~/routes/app.language/route";
import pLimit from "p-limit";
// import { withRetry } from "~/utils/retry";

// 查询未翻译的字符数
export const GetUnTranslatedWords = async ({
  shop,
  module,
  accessToken,
  source,
}: {
  shop: string;
  module: string;
  accessToken: string;
  source: string;
}) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/shopify/getUnTranslatedToken?shopName=${shop}&source=${source}&modelType=${module}`,
      data: {
        accessToken,
      },
    });
    console.log("unTranslated words data", response.data);
    return response.data;
  } catch (error) {
    console.log("get unTranslated words failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取web pixel事件获得的用户的数据
export const GetConversionData = async ({
  shop,
  storeLanguage,
  dayData,
}: {
  shop: string;
  storeLanguage: string[];
  dayData: number;
}) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/getUserDataReport?shopName=${shop}`,
      data: {
        storeLanguage,
        dayData,
        timestamp: new Date().toISOString(),
      },
    });
    console.log("coversion rate data", response.data);
    return response.data;
  } catch (error) {
    console.log("get conversion data failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取用户商店翻译的语言
export const GetStoreLanguage = async ({
  shop,
  source,
}: {
  shop: string;
  source: string;
}) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getTranslationStatus?shopName=${shop}&source=${source}`,
    });
    console.log("user stroe language data", response.data);
    return response.data;
  } catch (error) {
    console.log("get conversion data failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取实时翻译指标数据值（四个开关）
export const GetRealTimeQuotaData = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getDBConfiguration?shopName=${shop}`,
    });
    console.log("user stroe language data", response.data);
    return response.data;
  } catch (error) {
    console.log("get conversion data failed:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取翻译报告分数以及详细报告指标
export const GetTranslationQualityScore = async ({
  shop,
  source,
}: {
  shop: string;
  source: string;
}) => {
  try {
    const response = await axios({
      method: "POST",
      url: `${process.env.SERVER_URL}/rating/getRatingInfo?shopName=${shop}&source=${source}`,
    });
    return response.data;
  } catch (error) {
    console.log("get translationQuality score error:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const GetProductImageData = async ({
  server,
  shopName,
  productId,
  languageCode,
}: {
  server: string;
  shopName: string;
  productId: string;
  languageCode: string;
}) => {
  try {
    console.log("edwqeq: ", server, shopName, productId, languageCode);
    console.log('server: ',server);
      console.log('languageCode: ',languageCode);
      
    const response = await axios({
      url: `${server}/picture/getPictureDataByShopNameAndResourceIdAndPictureId?shopName=${shopName}`,
      method: "POST",
      data: {
        shopName: shopName,
        imageId: productId,
        languageCode: languageCode,
      },
    });

    console.log("GetProductImageData: ", response.data);

    return response.data;
  } catch (error) {
    console.error("Error GetProductImageData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [] as any[],
    };
  }
};

export const UpdateProductImageAltData = async ({
  server,
  shopName,
  productId,
  imageUrl,
  altText,
  targetAltText,
  languageCode,
}: {
  server: string;
  shopName: string;
  productId: string;
  imageUrl: string;
  altText: string;
  targetAltText: string;
  languageCode: string;
}) => {
  try {
    console.log(`${shopName} UpdateProductImageAltData: `, {
      shopName,
      productId,
      imageUrl,
      altText,
      targetAltText,
      languageCode,
    });

    const response = await axios({
      url: `${server}/picture/insertPictureToDbAndCloud`,
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      data: {
        file: new File([], "file.png"),
        shopName,
        userPicturesDoJson: JSON.stringify({
          shopName,
          imageId: productId,
          imageBeforeUrl: imageUrl,
          altBeforeTranslation: altText,
          altAfterTranslation: targetAltText,
          languageCode: languageCode,
        }),
      },
    });

    console.log(`${shopName} UpdateProductImageAltData: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error UpdateProductImageAltData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取图片翻译结果
export const TranslateImage = async ({
  shop,
  imageUrl,
  sourceCode,
  targetCode,
  accessToken,
  imageId,
}: {
  shop: string;
  imageUrl: string;
  sourceCode: string;
  targetCode: string;
  accessToken: string;
  imageId: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/imageTranslate?shopName=${shop}`,
      method: "PUT",
      data: {
        imageUrl,
        sourceCode,
        targetCode,
        accessToken,
        imageId,
      },
    });
    // console.log();
    
    console.log("imageTranslate Response", response.data);
    if (response.data.success) {
      return response.data;
    } else {
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: [],
      };
    }
  } catch (error) {
    console.log("Error GetImageTranslate", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};

// 存储翻译的图片文件
export const storageTranslateImage = async ({
  shop,
  imageUrl,
  userPicturesDoJson,
}: {
  shop: string;
  imageUrl: string;
  userPicturesDoJson: any;
}) => {
  try {
    const formData = new FormData();
    formData.append("pic", imageUrl); // 添加图片 URL
    formData.append("shopName", shop); // 添加店铺名称
    formData.append("userPicturesDoJson", JSON.stringify(userPicturesDoJson));
    const response = await axios({
      url: `${process.env.SERVER_URL}/picture/saveImageToCloud`,
      method: "post",
      data: formData,
    });
    console.log("storageImage response", response.data);
    if (response.data.success) {
      return response.data;
    } else {
      return {
        success: false,
        errorCode: 10001,
        errorMsg: "SERVER_ERROR",
        response: null,
      };
    }
  } catch (error) {
    console.log("replace image filed", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

// 删除翻译或者替换图片
export const DeleteProductImageData = async ({
  server,
  shopName,
  productId,
  imageUrl,
  languageCode,
}: {
  server: string;
  shopName: string;
  productId: string;
  imageUrl: string;
  languageCode: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/picture/deletePictureData?shopName=${shopName}`,
      method: "POST",
      data: {
        shopName: shopName,
        imageId: productId,
        imageBeforeUrl: imageUrl,
        languageCode: languageCode,
      },
    });

    console.log("DeleteProductImageData: ", response.data);

    return response.data;
  } catch (error) {
    console.error("Error DeleteProductImageData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};