import axios from "axios";
import { authenticate } from "~/shopify.server";
// import { queryShop, queryShopLanguages } from "./admin";
// import { ShopLocalesType } from "~/routes/app.language/route";
import pLimit from "p-limit";
import { queryShop } from "./admin";
import { Progress } from "antd";
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
  imageId,
  imageUrl,
  altText,
  targetAltText,
  languageCode,
}: {
  server: string;
  shopName: string;
  productId: string;
  imageId: string;
  imageUrl: string;
  altText: string;
  targetAltText: string;
  languageCode: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/pcUserPic/updateUserPic?shopName=${shopName}`,
      method: "POST",
      data: {
        productId: productId,
        imageId: imageId,
        imageBeforeUrl: imageUrl,
        altBeforeTranslation: altText,
        altAfterTranslation: targetAltText,
        languageCode: languageCode,
      },
    });

    console.log(`${shopName} UpdateProductImageAltData: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shopName} 保存alt文本失败:`, error);
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
  modelType,
}: {
  shop: string;
  imageUrl: string;
  sourceCode: string;
  targetCode: string;
  accessToken: string;
  modelType: number;
}) => {
  try {
    console.log(
      "dqws: ",
      shop,
      imageUrl,
      sourceCode,
      targetCode,
      accessToken,
      modelType,
    );

    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUserPic/translatePic?shopName=${shop}`,
      method: "POST",
      data: {
        imageUrl,
        sourceCode,
        targetCode,
        accessToken,
        modelType,
      },
    });
    // console.log();

    console.log(`${shop} imageTranslate Response`, response.data);
    return response;
  } catch (error) {
    console.log(`${shop}  图片翻译失败`, error);
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
    console.log("repalce image", process.env.SERVER_URL, replaceTranslateImage);

    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUserPic/updateUserPic?shopName=${shop}`,
      method: "POST",
      data: {
        productId: replaceTranslateImage.productId,
        imageId: replaceTranslateImage.imageId,
        imageBeforeUrl: replaceTranslateImage.imageBeforeUrl,
        imageAfterUrl: replaceTranslateImage.imageAfterUrl,
        languageCode: replaceTranslateImage.languageCode,
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
    console.log(`${shop} 翻译图片保存失败`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};
// 存储主题图片创建文件的mediaID
export const storageMediaId = async ({
  shop,
  saveMediaId,
}: {
  shop: string;
  saveMediaId: any;
}) => {
  try {
    console.log("eweqweqweq", process.env.SERVER_URL, saveMediaId);

    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUserPic/updateUserPic?shopName=${shop}`,
      method: "POST",
      data: {
        productId: saveMediaId.productId,
        imageId: saveMediaId.imageId,
        languageCode: saveMediaId.languageCode,
        mediaId: saveMediaId.mediaId,
      },
    });
    console.log("storageMediaId response", response.data);
    return response.data;
  } catch (error) {
    console.log(`${shop} 主题图片文件id保存失败`, error);
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
  imageId,
  imageUrl,
  languageCode,
}: {
  server: string;
  shopName: string;
  imageId: string;
  imageUrl: string;
  languageCode: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/pcUserPic/deletePicByShopNameAndPCUserPictures?shopName=${shopName}`,
      method: "POST",
      data: {
        imageId: imageId,
        imageBeforeUrl: imageUrl,
        languageCode: languageCode,
      },
    });

    // console.log("DeleteProductImageData: ", response.data);

    return response.data;
  } catch (error) {
    console.error(`${shopName} 删除图片失败`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: undefined,
    };
  }
};
// 删除单张图片数据
export const DeleteSingleImage = async ({
  server,
  shopName,
  imageId,
  imageUrl,
  languageCode,
}: {
  server: string;
  shopName: string;
  imageId: string;
  imageUrl: string;
  languageCode: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/pcUserPic/deleteTranslateUrl?shopName=${shopName}`,
      method: "POST",
      data: {
        imageId: imageId,
        imageBeforeUrl: imageUrl,
        languageCode: languageCode,
      },
    });
    // console.log("DeleteProductImageData: ", response.data);
    return response.data;
  } catch (error) {
    console.error(`${shopName}删除单张图片失败:`, error);
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
      url: `${server}/pc/orders/getLatestActiveSubscribeId?shopName=${shop}`,
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
      url: `${server}/pc/userTrials/isShowFreePlan?shopName=${shop}`,
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
      url: `${server}/pc/userSubscription/getUserSubscriptionPlan?shopName=${shop}`,
      method: "GET",
    });

    // console.log("GetUserSubscriptionPlan: ", response.data);

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
    // console.log("GetUserWords: ", response.data);
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
    console.log(`${shop} addUserInfoResponse: `, addUserInfoResponse.data);
  } catch (error) {
    console.error(`${shop} Error UserAdd:`, error);
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
  shop: string;
  id: string;
  amount?: number;
  name?: string;
  createdAt?: string;
  status: string;
  confirmationUrl?: URL;
}) => {
  try {
    await axios({
      url: `${process.env.SERVER_URL}/pc/orders/insertOrUpdateOrder?shopName=${shop}`,
      method: "POST",
      data: {
        orderId: id,
        amount: amount,
        name: name,
        createdAt: createdAt,
        status: status,
        confirmationUrl: confirmationUrl,
      },
    });
    console.log("更新订单数据");
  } catch (error) {
    console.error("Error InsertOrUpdateOrder:", error);
  }
};

//增加用户字符数
export const AddCharsByShopName = async ({
  shop,
  amount,
  gid,
}: {
  shop: string;
  amount: number;
  gid: string;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUsers/addPurchasePoints?shopName=${shop}`,
      method: "PUT",
      data: {
        chars: amount,
        gid: gid,
      },
    });
    console.log(`${shop} AddCharsByShopName ${amount} ${gid}:`, response.data);

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
  alt,
  targetCode,
}: {
  shop: string;
  accessToken: string;
  alt: string;
  targetCode: string;
}) => {
  try {
    console.log("alt aaaa", process.env.server, shop);

    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUserPic/altTranslate?shopName=${shop}`,
      method: "POST",
      data: {
        alt,
        targetCode,
        accessToken: accessToken,
      },
    });
    return response.data;
  } catch (error) {
    console.log(`${shop}alt 翻译失败`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: [],
    };
  }
};

//用户卸载
export const Uninstall = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUsers/uninstall?shopName=${shop}`,
      method: "POST",
    });

    const res = response.data.response;

    console.log(`${shop} has been uninstalled`);

    return res;
  } catch (error) {
    console.error("Error Uninstall:", error);
  }
};

export const AddCharsByShopNameAfterSubscribe = async ({
  shop,
  appSubscription,
  feeType,
}: {
  shop: string;
  appSubscription: string;
  feeType: number;
}) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/pcUsers/addCharsByShopNameAfterSubscribe?shopName=${shop}`,
      method: "POST",
      data: {
        subGid: appSubscription, //订阅计划的id
        feeType: feeType, //0月度 1年度
      },
    });

    console.log(`${shop} AddCharsByShopNameAfterSubscribe: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} AddCharsByShopNameAfterSubscribe error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: false,
    };
  }
};

//在购买订阅之后,给用户添加对应的订阅信息
export const AddSubscriptionQuotaRecord = async ({
  subscriptionId,
}: {
  subscriptionId: string;
}) => {
  try {
    await axios({
      url: `${process.env.SERVER_URL}/subscriptionQuotaRecord/addSubscriptionQuotaRecord`,
      method: "PUT",
      data: {
        subscriptionId: subscriptionId,
      },
    });
  } catch (error) {
    console.error("Error AddSubscriptionQuotaRecord:", error);
  }
};

//修改用户计划
export const UpdateUserPlan = async ({
  shop,
  plan,
  feeType,
}: {
  shop: string;
  plan: number;
  feeType: number;
}) => {
  try {
    console.log("djasid:", plan);

    const response = await axios({
      url: `${process.env.SERVER_URL}/pc/userSubscription/checkUserPlan?shopName=${shop}&planId=${plan}&feeType=${feeType}`,
      method: "POST",
    });

    console.log(`${shop} ${plan} ${feeType} UpdateUserPlan: `, response.data);

    return response.data;
  } catch (error) {
    console.error("Error UpdateUserPlan:", error);
  }
};

export const StartFreePlan = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/pc/userTrials/startFreePlan?shopName=${shop}`,
      method: "POST",
    });
    console.log(`${shop} StartFreePlan: `, response.data);
  } catch (error) {
    console.error("Error StartFreePlan:", error);
  }
};
export const InsertOrUpdateFreePlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/pc/userTrials/insertOrUpdateFreePlan?shopName=${shop}`,
      method: "POST",
    });
    console.log(`${shop} InsertOrUpdateFreePlan: `, response.data);
  } catch (error) {
    console.error("Error InsertOrUpdateFreePlan:", error);
  }
};

//付费后更新状态
export const UpdateStatus = async ({ shop }: { shop: string }) => {
  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/translate/updateStatus`,
      method: "POST",
      data: {
        shopName: shop,
      },
    });

    console.log(`${shop} UpdateStatus: `, response.data);
  } catch (error) {
    console.error("Error UpdateStatus:", error);
  }
};

export const SendSubscribeSuccessEmail = async ({
  id,
  shopName,
  feeType,
}: {
  id: string;
  shopName: string;
  feeType: number;
}) => {
  console.log(`${shopName} SendSubscribeSuccessEmail Input: `, {
    id,
    shopName,
    feeType,
  });

  try {
    const response = await axios({
      url: `${process.env.SERVER_URL}/orders/sendSubscribeSuccessEmail?shopName=${shopName}`,
      method: "POST",
      data: {
        subGid: id,
        shopName: shopName,
        feeType: feeType,
      },
    });
    console.log(`${shopName} SendSubscribeSuccessEmail: `, response.data);
  } catch (error) {
    console.error("Error SendSubscribeSuccessEmail:", error);
  }
};

export const IsInFreePlanTime = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/pc/userTrials/isInFreePlanTime?shopName=${shop}`,
      method: "POST",
    });

    // console.log(`${shop} IsInFreePlanTime: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} IsInFreePlanTime error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: null,
    };
  }
};

export const IsOpenFreePlan = async ({
  shop,
  server,
}: {
  shop: string;
  server: string;
}) => {
  try {
    const response = await axios({
      url: `${server}/pc/userTrials/isOpenFreePlan?shopName=${shop}`,
      method: "POST",
    });

    // console.log(`${shop} IsOpenFreePlan: `, response.data);

    return response.data;
  } catch (error) {
    console.error(`${shop} IsOpenFreePlan error:`, error);
    return {
      success: false,
      errorCode: 10001,
      errorMsg: "SERVER_ERROR",
      response: false,
    };
  }
};

// 获取谷歌分析
export const GoogleAnalyticClickReport = async (params: any, name: string) => {
  try {
    const response = await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${process.env.MEASURE_ID}&api_secret=${process.env.GTM_API_KEY}`,
      {
        method: "POST",
        body: JSON.stringify({
          client_id: `${params.shopName}`, // 用shop作为用户的唯一标识
          events: [
            {
              name: `${name}`,
              params: params,
            },
          ],
        }),
      },
    );
    console.log(`${name} ${params.eventType}`, response.status === 204);
    return response.status === 204;
  } catch (error) {
    console.log("google analytic error:", error);
    return false;
  }
};
// function replaceImageUrl(html: string, url: string, translateUrl: string) {
//   return html.split(url).join(translateUrl);
// }
function replaceImageUrl(
  html: string,
  oldSrc: string,
  newSrc?: string | null,
  newAlt?: string | null,
) {
  const imgRegex = /<img\b[^>]*>/gi;

  return html.replace(imgRegex, (imgTag) => {
    // 是否匹配到 oldSrc
    if (!imgTag.includes(oldSrc)) return imgTag;

    let updatedTag = imgTag;

    // --- 1. 替换 src ---
    if (newSrc) {
      updatedTag = updatedTag.replace(/src=["'][^"']*["']/, `src="${newSrc}"`);
    }

    // --- 2. 替换 / 添加 alt ---
    if (newAlt !== undefined && newAlt !== null) {
      if (/alt=["'][^"']*["']/.test(updatedTag)) {
        updatedTag = updatedTag.replace(
          /alt=["'][^"']*["']/,
          `alt="${newAlt}"`,
        );
      } else {
        // 在标签里末尾加入 alt
        updatedTag = updatedTag.replace(/>$/, ` alt="${newAlt}">`);
      }
    }

    return updatedTag;
  });
}

// 用于转义正则特殊字符
function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
async function waitForFileReady(admin: any, fileId: string, maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await admin.graphql(`
      query {
        node(id: "${fileId}") {
          ... on MediaImage {
            id
            fileStatus
            image {
              url
            }
          }
        }
      }
    `);

    const parsed = await response.json();
    const node = parsed.data.node;
    console.log("ewcdsad", node);

    if (node.fileStatus === "READY" && node.image) {
      return node.image.url;
    }

    if (node.fileStatus === "FAILED") {
      throw new Error("File processing failed");
    }

    // 等待后重试
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("File processing timeout");
}
function replaceRichTextImageUrl(
  richTextJsonStr: string,
  fromUrl: string,
  toUrl?: string | null,
  newAlt?: string | null,
): string {
  if (!richTextJsonStr) return richTextJsonStr;

  let data;
  try {
    data = JSON.parse(richTextJsonStr);
  } catch (err) {
    console.error("⚠ rich_text JSON 解析失败：", err);
    return richTextJsonStr;
  }

  function walk(node: any) {
    if (!node || typeof node !== "object") return;

    // ================ 1. image 节点 ================
    if (node.type === "image") {
      // -------- 1.1 替换 src（仅当 toUrl 有值时） --------
      if (toUrl && node.src === fromUrl) {
        node.src = toUrl;
      }

      // -------- 1.2 替换 alt（始终可替换） --------
      if (newAlt !== undefined && newAlt !== null) {
        node.alt = newAlt;
      }
    }

    // ================ 2. link 节点（rich_text 中 link.url 也可能是图片） ================
    if (node.type === "link") {
      // link.url 是图片 URL
      if (toUrl && node.url === fromUrl) {
        node.url = toUrl;
      }
    }

    // ================ 3. 遍历 children ================
    if (Array.isArray(node.children)) {
      node.children.forEach(walk);
    }
  }

  walk(data);

  return JSON.stringify(data);
}

function extractImageKey(url: string) {
  try {
    // 1. 获取最后一个路径片段 files/xxx.jpg?v=123
    const lastPart = url.split("/").pop();
    if (!lastPart) return null;

    // 2. 去掉 query 参数 ?v=xxxx
    const fileName = lastPart.split("?")[0];

    return fileName;
  } catch (e) {
    return null;
  }
}

// 删除存储在shopify的文件
export const updateManageTranslation = async ({
  shop,
  accessToken,
  updateData,
  admin,
}: {
  shop: string;
  accessToken: string;
  updateData: any;
  admin: any;
}) => {
  try {
    console.log("updateData ===>", updateData);

    // 1. 查询原翻译内容
    const queryTranslations = await admin.graphql(
      `#graphql
      query {
        translatableResource(resourceId: "${updateData.resourceId}") {
          resourceId
          translations(locale: "${updateData.languageCode}") {
            key
            value
          }
        }
      }`,
    );

    const translation = await queryTranslations.json();
    const translations = translation.data.translatableResource.translations;

    // 寻找对应 key 的翻译
    const findMatchedTranslation = () => {
      if (!translations || translations.length === 0) return null;
      return translations.find((item: any) => item?.key === updateData.key);
    };

    const matchedItem = findMatchedTranslation();
    console.log("asdqqsd", matchedItem);

    // 2. 初始化最终 value
    let transferValue = "";
    // TODO 根据传值的filedID，判断创建文件或者更新文件信息
    let finalImageUrl; // 默认先使用原图
    let parse: any = null;
    let imageId: string = "";
    if (updateData?.mediaId) {
      if (["LIST_FILE_REFERENCE", "FILE_REFERENCE"].includes(updateData.type)) {
        const response = await admin.graphql(
          `#graphql
          mutation fileUpdate($files: [FileUpdateInput!]!) {
            fileUpdate(files: $files) {
              files {
                id
                alt
                fileStatus
              }
              userErrors {
                field
                message
                code
              }
            }
          }`,
          {
            variables: {
              files: [
                {
                  id: updateData?.mediaId,
                  alt: updateData.altText,
                  originalSource: updateData.imageAfterUrl || updateData.value,
                },
              ],
            },
          },
        );
        const json = await response.json();
        console.log("adwdasd", json);
      } else {
        finalImageUrl =
          updateData?.imageAfterUrl === ""
            ? await waitForFileReady(admin, updateData?.mediaId)
            : updateData?.imageAfterUrl;
      }
    } else {
      if (updateData.imageAfterUrl) {
        const createFileRes = await admin.graphql(
          `#graphql
            mutation fileCreate($files: [FileCreateInput!]!) {
              fileCreate(files: $files) {
                files {
                  id
                  fileStatus
                  preview {
                    image {
                      url
                    }
                  }
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
          {
            variables: {
              files: [
                {
                  alt: updateData.altText,
                  contentType: "IMAGE",
                  originalSource: updateData.imageAfterUrl,
                },
              ],
            },
          },
        );
        parse = await createFileRes.json();
        imageId = parse.data.fileCreate.files[0].id;
        console.log("fsafasfa", imageId);

        // 等待文件 ready
        finalImageUrl = await waitForFileReady(admin, imageId);
      }
    }
    // 如果 imageAfterUrl 存在，才创建文件
    // ============================
    // 3. 类型处理
    // ============================

    switch (updateData.type) {
      case "HTML": {
        const html = matchedItem ? matchedItem.value : updateData.originValue;

        // 1. 解析出所有图片
        const list = extractShopifyImages(html);
        console.log("dasdqw", list);

        // 2. 根据 index 找到对应老 src
        const target = list[updateData.index];
        console.log("faddsad", target);

        if (!target) {
          console.warn("找不到对应 index 的 img：", updateData.index);
          transferValue = html;
          break;
        }

        const oldSrc = target.src;
        console.log("oldsdasdqw", oldSrc);

        transferValue = replaceImageUrl(
          html,
          oldSrc, // old src
          updateData.imageAfterUrl === "" ? target.src : finalImageUrl, // new src (若 imageAfterUrl 为空则保持不变)
          updateData.altText || target.alt, // 新 alt
        );
        break;
      }

      case "FILE_REFERENCE": {
        console.log("fajdsajid", parse.data.fileCreate.files[0].id);

        if (updateData.resourceId.includes("Metafield")) {
          transferValue =
            parse.data.fileCreate.files[0].id || updateData?.mediaId;
        } else {
          console.log(
            "sdasdwqdads",
            parse.data.fileCreate.files[0].id,
            updateData?.mediaId,
          );

          const image = await findImageSrc(
            admin,
            parse.data.fileCreate.files[0].id || updateData?.mediaId,
          );
          console.log("imagesdjias", image);

          transferValue = `shopify://shop_images/${extractImageKey(image.src)}`;
        }
        break;
      }

      case "LIST_FILE_REFERENCE": {
        if (!updateData.imageAfterUrl) {
          transferValue = updateData.originValue;
          break;
        }

        const ids = JSON.parse(updateData.originValue);
        ids[updateData.index] =
          parse.data.fileCreate.files[0].id || updateData?.mediaId;
        transferValue = JSON.stringify(ids);
        break;
      }

      case "RICH_TEXT_FIELD": {
        const originalRich = matchedItem
          ? matchedItem.value
          : updateData.originValue;

        transferValue = replaceRichTextImageUrl(
          originalRich,
          updateData.value,
          finalImageUrl,
          updateData.altText,
        );
        break;
      }
    }

    console.log("transferValue ===>", transferValue);

    // 4. 调用你的服务器，更新 Shopify 数据
    const response = await axios({
      url: `${process.env.SERVER_URL}/shopify/updateShopifyDataByTranslateTextRequest`,
      method: "POST",
      timeout: 10000,
      data: {
        shopName: shop,
        accessToken,
        locale: updateData.locale,
        key: updateData.key,
        value: transferValue,
        translatableContentDigest: updateData.digest,
        resourceId: updateData.resourceId,
        target: updateData.languageCode,
      },
    });
    console.log("adsadas", imageId, updateData.mediaId);

    console.log(`${shop} update translations: `, response.data);
    return {
      res: response.data,
      ...updateData,
      mediaId: imageId || updateData?.mediaId,
    };
  } catch (error) {
    console.error(`${shop} Error updateManageTranslation:`, error);
  }
};

export const deleteSaveInShopify = async ({
  shop,
  accessToken,
  item,
}: {
  shop: string;
  accessToken: string;
  item: any;
}) => {
  try {
    const response = await axios({
      url: `https://${shop}/admin/api/2024-10/graphql.json`,
      method: "POST",
      timeout: 10000, // 添加超时设置
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      data: {
        query: `mutation translationsRemove($resourceId: ID!, $translationKeys: [String!]!, $locales: [String!]!) {
        translationsRemove(resourceId: $resourceId, translationKeys: $translationKeys, locales: $locales) {
          userErrors {
            message
            field
          }
          translations {
            key
            value
          }
        }
      }`,
        variables: {
          resourceId: item.resourceId,
          locales: [item?.languageCode],
          translationKeys: [item?.key],
        },
      },
    });
    console.log(`${shop}delete image file in shopify`, response.data);
    return response;
  } catch (error) {
    console.log(`${shop}delete image file error`, error);
  }
};
const IMAGE_TYPES = new Set([
  "FILE_REFERENCE",
  "LIST_FILE_REFERENCE",
  "HTML",
  "RICH_TEXT_FIELD",
]);

// 从富文本递归提取图片
const extractFromRichText = (
  nodes: any[],
): { src: string; alt: string | null }[] => {
  const result: { src: string; alt: string | null }[] = [];
  if (!Array.isArray(nodes)) return result;

  for (const node of nodes) {
    let possibleUrl: string | undefined;
    let altText: string | null = null;

    // 1. image 节点
    if (node.type === "image" && node.src) {
      possibleUrl = node.src;

      // Shopify 富文本 alt 可能在 node.alt 或 node.data.alt 或 node.attrs.alt
      altText = node.alt ?? node?.data?.alt ?? node?.attrs?.alt ?? null;
    }

    // 2. link 节点
    if (node.type === "link" && node.url) {
      possibleUrl = node.url;
      // link 节点不携带 alt
      altText = null;
    }

    // === 只提取 CDN 图片 ===
    if (possibleUrl && possibleUrl.includes("cdn.shopify.com")) {
      result.push({ src: possibleUrl, alt: altText });
    }

    // 递归 children
    if (node.children) {
      result.push(...extractFromRichText(node.children));
    }
  }

  return result;
};

// 从 HTML 提取 <img src="">
// const extractFromHtml = (html: string): string[] => {
//   const result: string[] = [];
//   const regex = /<img[^>]+src=["']([^"']+)["']/g;

//   let match;
//   while ((match = regex.exec(html)) !== null) {
//     result.push(match[1]);
//   }

//   return result;
// };
const extractFromHtml = (
  html: string,
): { src: string; alt: string | null }[] => {
  const result: { src: string; alt: string | null }[] = [];

  // 提取所有 <img>
  const regex =
    /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>|<img[^>]*alt=["']([^"']*)["'][^>]*src=["']([^"']+)["'][^>]*|<img[^>]*src=["']([^"']+)["'][^>]*>/g;

  let match;
  while ((match = regex.exec(html)) !== null) {
    let src = "";
    let alt = null;

    if (match[1] && match[2]) {
      src = match[1];
      alt = match[2];
    } else if (match[4] && match[3]) {
      src = match[4];
      alt = match[3];
    } else if (match[5]) {
      src = match[5];
    }

    // ============================
    // 🚫 各种过滤规则
    // ============================

    // 1) 非 http(s)
    if (!/^https?:\/\//.test(src)) continue;

    // 2) 不是 Shopify CDN
    if (!src.includes("cdn.shopify.com")) continue;

    // 3) 排除 svg、ico 等图标类型（一般是不可翻译的 icon）
    if (/\.(svg|ico)$/i.test(src)) continue;

    // 4) 排除过短 filename（一般是 icon）
    const filename = src.split("/").pop() || "";
    if (filename.length < 10) continue;

    // 通过所有过滤条件后才加入结果
    result.push({ src, alt });
  }

  return result;
};
export function extractShopifyImages(html: string) {
  // 全局匹配所有 <img ...> 标签（跨行也能匹配）
  const imgTagRegex = /<img[^>]*>/gi;

  // 匹配 src 与 alt（顺序不固定）
  const srcRegex = /src=["'](https:\/\/cdn\.shopify\.com\/[^"']+)["']/i;
  const altRegex = /alt=["']([^"']*)["']/i;

  const images: { src: string; alt: string }[] = [];

  // 获取所有 <img> 标签
  const tags = html.match(imgTagRegex);
  if (!tags) return images;

  for (const tag of tags) {
    const srcMatch = tag.match(srcRegex);
    if (!srcMatch) continue; // ✨ 非 Shopify CDN 直接跳过

    const altMatch = tag.match(altRegex);

    images.push({
      src: srcMatch[1],
      alt: altMatch ? altMatch[1] : "",
    });
  }

  return images;
}

const fetchFileReferences = async (admin: any, nodes: any[]) => {
  const results: any[] = [];

  for (const node of nodes) {
    for (const contentItem of node.translatableContent || []) {
      const type = contentItem.type;
      if (!IMAGE_TYPES.has(type)) continue;

      // === 1) FILE_REFERENCE ===
      if (type === "FILE_REFERENCE") {
        const img = await findImageSrc(admin, contentItem.value);
        console.log("ewasdas", img);

        if (!img.src) continue;

        results.push({
          resourceId: node.resourceId,
          key: contentItem.key,
          type,
          value: [{ src: img.src, alt: img.alt }], // ❗单图也用数组统一格式
          digest: contentItem.digest,
          originValue: contentItem.value,
        });
      }

      // === 2) LIST_FILE_REFERENCE ===
      if (type === "LIST_FILE_REFERENCE") {
        let ids = contentItem.value;

        // 如果是 JSON_STRING，先转成数组
        if (typeof ids === "string") {
          try {
            ids = JSON.parse(ids);
          } catch (err) {
            console.error(
              "无法解析 list.file_reference JSON:",
              contentItem.value,
            );
            continue;
          }
        }

        if (!Array.isArray(ids)) {
          console.error("list.file_reference 的 value 不是数组:", ids);
          continue;
        }

        const urls = (
          await Promise.all(
            ids.map(async (metaImageId: string) => {
              return await findImageSrc(admin, metaImageId);
            }),
          )
        ).filter(Boolean);

        if (urls.length === 0) continue;

        results.push({
          resourceId: node.resourceId,
          key: contentItem.key,
          type,
          value: urls.map((item) => ({ src: item.src, alt: item.alt })), // ⭐统一结构
          digest: contentItem.digest,
          originValue: contentItem.value,
        });
      }

      // === 3) HTML ===
      if (type === "HTML") {
        const extracted = extractShopifyImages(contentItem.value || "");
        console.log("dsadadwq", extracted);

        // if (urls.length === 0) continue;
        if (extracted.length === 0) continue;
        results.push({
          resourceId: node.resourceId,
          key: contentItem.key,
          type,
          // value: urls, // ❗html 多图放一起
          // value: extracted.map((i) => i.src), // ⭐只存 src，UI 不会报错
          // altList: extracted.map((i) => i.alt), // 另存 alt
          value: extracted,
          digest: contentItem.digest,
          originValue: contentItem.value,
        });
      }

      // === 4) RICH_TEXT_FIELD ===
      if (type === "RICH_TEXT_FIELD") {
        let richValue = contentItem.value;

        // 1. 解析 JSON_STRING → 对象
        if (typeof richValue === "string") {
          try {
            richValue = JSON.parse(richValue);
          } catch (e) {
            console.error("富文本解析失败:", richValue);
            continue;
          }
        }

        // 2. 富文本正确结构是 richValue.children
        const urls = extractFromRichText(richValue.children || []);

        if (urls.length === 0) continue;

        results.push({
          resourceId: node.resourceId,
          key: contentItem.key,
          type,
          value: urls,
          digest: contentItem.digest,
          originValue: contentItem.value,
        });
      }
    }
  }

  return results;
};

const findImageSrc = async (admin: any, value: string) => {
  if (value.includes("shop_images")) {
    const fileName = value?.split("/").pop() ?? "";
    const response = await admin.graphql(
      `query GetFile($query: String!) {
        files(query: $query, first: 1) {
          edges {
            node {
              preview {
                image {
                  src
                  id
                  altText
                }
              }
            }
          }
        }
      }`,
      { variables: { query: fileName } },
    );
    const parsed = await response.json();
    console.log(
      "sdaedqw",
      parsed?.data?.files?.edges?.[0]?.node?.preview?.image,
    );

    return {
      src: parsed?.data?.files?.edges?.[0]?.node?.preview?.image?.src ?? null,
      alt: parsed?.data?.files?.edges?.[0]?.node?.preview?.image?.altText,
    };
  } else {
    const response = await admin.graphql(
      `query {
          node(id: "${value}") {
            ... on MediaImage {
              id
              alt
              image {
                url
                altText
                id
              }
            }
          }
        }`,
    );
    const parsed = await response.json();
    console.log("dadasda", parsed);

    return {
      src: parsed?.data?.node?.image?.url ?? null,
      alt: parsed?.data?.node?.image?.altText ?? null,
    };
  }
};
// 查询shopify数据
export const queryShopifyThemeData = async ({
  admin,
  nodes,
}: {
  admin: any;
  nodes: any;
}) => {
  try {
    // ⭐ 关键改动：等所有 FILE_REFERENCE 图片解析完
    const fileReferences = await fetchFileReferences(admin, nodes);
    return fileReferences;
  } catch (error) {
    console.error("Error manage theme loading:", error);
  }
};
