import axios from "axios";
import { authenticate } from "~/shopify.server";
// import { queryShop, queryShopLanguages } from "./admin";
// import { ShopLocalesType } from "~/routes/app.language/route";
import pLimit from "p-limit";
import { queryShop } from "./admin";
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
    console.log("server: ", server);
    console.log("languageCode: ", languageCode);

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
}: {
  shop: string;
  imageUrl: string;
  sourceCode: string;
  targetCode: string;
  accessToken: string;
}) => {
  try {
    console.log("dqws: ", shop, imageUrl, sourceCode, targetCode, accessToken);

    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUserPic/translatePic?shopName=${shop}`,
      method: "POST",
      data: {
        imageUrl,
        sourceCode,
        targetCode,
        accessToken,
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
  replaceTranslateImage,
}: {
  shop: string;
  replaceTranslateImage: any;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUserPic/updateUserPic?shopName=${shop}`,
      method: "post",
      data: {
        imageId: replaceTranslateImage.imageId,
        imageBeforeUrl: replaceTranslateImage.imageBeforeUrl,
        imageAfterUrl: replaceTranslateImage.imageAfterUrl,
        languageCode: replaceTranslateImage.language,
      },
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
    console.log(
      "delete img: ",
      server,
      shopName,
      productId,
      imageUrl,
      languageCode,
    );

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

export const GetLatestActiveSubscribeId = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/orders/getLatestActiveSubscribeId?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} GetLatestActiveSubscribeId: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} GetLatestActiveSubscribeId error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: "",
    };
  }
};

export const IsShowFreePlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/userTrials/isShowFreePlan?shopName=${shop}`,
      method: "POST",
    });

    console.log(`${shop} IsShowFreePlan: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} IsShowFreePlan error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: "",
    };
  }
};

//获取用户计划
export const GetUserSubscriptionPlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/shopify/getUserSubscriptionPlan?shopName=${shop}`,
      method: "GET",
    });

    console.log("GetUserSubscriptionPlan: ", response.data);

    return response.data;
  } catch (error) {
    console.error("Error GetUserSubscriptionPlan:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

//获取用户的额度字符数 和 已使用的字符
export const GetUserWords = async ({
  shop,
  server,
}: {
  shop: string;
  server?: string;
}) => {
  try {
    const response = await axios({
      url: `${server || process.env.SERVER_URL}/pcUsers/getPurchasePoints?shopName=${shop}`,
      method: "POST",
    });
    console.log("GetUserWords: ", response.data);
    return response.data;
  } catch (error) {
    console.error("Error GetUserWords:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

// 获取商店配置语言的图片的翻译信息
export const getProductAllLanguageImagesData = async ({
  shop,
  imageId,
}: {
  shop: string;
  imageId: string;
}) => {
  try {
    console.log("data22: ", shop, imageId);

    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUserPic/getPicsByImageIdAndShopName?shopName=${shop}`,
      method: "POST",
      data: {
        imageId,
      },
    });

    console.log("getProductAllLanguageImagesData: ", response.data);
    return response.data;
    // return {
    //   success: true,
    //   errorCode: 0,
    //   errorMsg: "OK",
    //   response: [
    // {
    // id: 103,
    // shopName: "ciwishop.myshopify.com",
    // productId: "gid://shopify/Product/7434315202583",
    // imageId: "gid://shopify/ProductImage/34565775065111",
    // imageBeforeUrl:
    //   "https://cdn.shopify.com/s/files/1/0728/0948/0215/files/Snipaste_2025-05-26_15-46-37.png?v=1750991411",
    // imageAfterUrl:
    //   "https://ciwi-us-1327177217.cos.na-ashburn.myqcloud.com/image-Translation/ciwishop.myshopify.com/gid://shopify/Product/7434315202583/16264210.png",
    // altBeforeTranslation:
    //   "'Casual Pink Mountain Landscape Printed White Pullover With Round Neckline And Long Sleeves' - ciwishop",
    // altAfterTranslation:
    //   "'بلوفر أبيض كاجوال بطبعة مناظر طبيعية جبلية وردية، بياقة دائرية وأكمام طويلة' - ciwishop",
    // languageCode: "ar",
    // language: "Arabic",
    // isDelete: false,
    // },
    //     {
    //       id: 13,
    //       shopName: "ciwishop.myshopify.com",
    //       productId: "gid://shopify/Product/7434315202583",
    //       imageId: "gid://shopify/ProductImage/34565775065111",
    //       imageBeforeUrl:
    //         "https://cdn.shopify.com/s/files/1/0728/0948/0215/files/Snipaste_2025-05-26_15-46-37.png?v=1750991411",
    //       imageAfterUrl:
    //         "https://cdn.translate.alibaba.com/r/9342e75e0c6143e1a05e5055f030e81f.jpg",
    //       altBeforeTranslation:
    //         "'Casual Pink Mountain Landscape Printed White Pullover With Round Neckline And Long Sleeves' - ciwishop",
    //       altAfterTranslation:
    //         "「カジュアルなピンクの山の風景プリントの白いプルオーバー（ラウンドネックと長袖）」 - ciwishop",
    //       languageCode: "ja",
    //       language: "Japanese",
    //       isDelete: false,
    //     },
    //     {
    //       id: 173,
    //       shopName: "ciwishop.myshopify.com",
    //       imageId: "gid://shopify/ProductImage/34565775065111",
    //       imageBeforeUrl:
    //         "https://cdn.shopify.com/s/files/1/0728/0948/0215/files/Snipaste_2025-05-26_15-46-37.png?v=1750991411",
    //       imageAfterUrl: "",
    //       altBeforeTranslation:
    //         "'Casual Pink Mountain Landscape Printed White Pullover With Round Neckline And Long Sleeves' - ciwishop",
    //       altAfterTranslation:
    //         "'Иаабац ашьхатә ландшафт ԥшьаала икьыԥхьу апуловер шкәакәа, абӷьы круглый, анапы еиҵыхқәа' - ciwishop",
    //       languageCode: "ko",
    //       language: "Korean",
    //       isDelete: false,
    //     },
    //     {
    //       id: 183,
    //       shopName: "ciwishop.myshopify.com",
    //       productId: "gid://shopify/Product/7434315202583",
    //       imageId: "gid://shopify/ProductImage/34565775065111",
    //       imageBeforeUrl:
    //         "https://cdn.shopify.com/s/files/1/0728/0948/0215/files/Snipaste_2025-05-26_15-46-37.png?v=1750991411",
    //       imageAfterUrl:
    //         "	https://cdn.shopify.com/s/files/1/0728/0948/0215/files/71isjALguFL._AC_SY695.jpg?v=1757055470",
    //       altBeforeTranslation:
    //         "'Casual Pink Mountain Landscape Printed White Pullover With Round Neckline And Long Sleeves' - ciwishop",
    //       altAfterTranslation: "",
    //       languageCode: "zh-CN",
    //       language: "Chinese (Simplified)",
    //       isDelete: false,
    //     },
    //     {
    //       id: 193,
    //       shopName: "ciwishop.myshopify.com",
    //       productId: "gid://shopify/Product/7434315202583",
    //       imageId: "gid://shopify/ProductImage/34565775065111",
    //       imageBeforeUrl:
    //         "https://cdn.shopify.com/s/files/1/0728/0948/0215/files/20250904-175349.png?v=1756979649",
    //       imageAfterUrl: "",
    //       altBeforeTranslation:
    //         "'Casual Pink Mountain Landscape Printed White Pullover With Round Neckline And Long Sleeves' - ciwishop",
    //       altAfterTranslation: "",
    //       languageCode: "zh-TW",
    //       language: "Chinese (Traditional)",
    //       isDelete: false,
    //     },
    //   ],
    // };
  } catch (error) {
    console.error("Error getProductAllLanguageImagesData:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

//用户数据初始化
//添加用户
export const UserAdd = async ({
  shop,
  accessToken,
}: {
  shop: string;
  accessToken: string;
}) => {
  try {
    const shopData = await queryShop({ shop, accessToken });
    const shopOwnerName = shopData?.shopOwnerName;
    const lastSpaceIndex = shopOwnerName.lastIndexOf(" ");
    const firstName = shopOwnerName.substring(0, lastSpaceIndex);
    const lastName = shopOwnerName.substring(lastSpaceIndex + 1);
    const addUserInfoResponse = await axios({
      url: `${process.env.SERVER_URL}/pcUsers/initUser?shopName=${shop}`,
      method: "POST",
      data: {
        accessToken: accessToken,
        email: shopData.email || "",
        phone: "",
        realAddress: "",
        ipAddress: "",
        firstName: firstName || "",
        lastName: lastName || "",
        userTag: shopOwnerName || "",
      },
    });
    console.log("addUserInfoResponse: ", addUserInfoResponse.data);
  } catch (error) {
    console.error("Error UserAdd:", error);
  }
};

//更新订单数据
export const InsertOrUpdateOrder = async ({
  shop,
  id,
  amount,
  name,
  createdAt,
  status,
  confirmationUrl,
}: {
  shop?: string;
  id: string;
  amount?: number;
  name?: string;
  createdAt?: string;
  status: string;
  confirmationUrl?: URL;
}) => {
  try {
    await axios({
      url: `${process.env.SERVER_URL}/orders/insertOrUpdateOrder?shopName=${shop}`,
      method: "POST",
      data: {
        shopName: shop,
        id: id,
        amount: amount,
        name: name,
        createdAt: createdAt,
        status: status,
        confirmationUrl: confirmationUrl,
      },
    });
  } catch (error) {
    console.error("Error InsertOrUpdateOrder:", error);
  }
};

//增加用户字符数
export const AddCharsByShopName = async ({
  shop,
  amount,
  gid,
  accessToken,
}: {
  shop: string;
  amount: number;
  gid: string;
  accessToken: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUsers/addPurchasePoints?shopName=${shop}`,
      method: "PUT",
      data: {
        chars: amount,
        gid: gid,
        accessToken,
      },
    });
    console.log(`${shop} AddCharsByShopName:`, response.data);

    return response.data;
  } catch (error) {
    console.error("Error AddCharsByShopName:", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};

export const AltTranslate = async ({
  shop,
  accessToken,
  img,
}: {
  shop: string;
  accessToken: string;
  img: any;
}) => {
  try {
    console.log("alt ",process.env.server,shop);
    
    const response = await axios({
      url: `${process.env.server}/pcUserPic/altTranslate?shopName=${shop}`,
      method: "Post",
      data: {
        alt: img.altBeforeTranslation,
        targetCode: img.languageCode,
        accessToken: accessToken,
      },
    });
    return response;
  } catch (error) {
    console.log("alt translate error", error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};
