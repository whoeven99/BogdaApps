import { useFetcher, useNavigate, useParams } from "@remix-run/react";
import {
  Page,
  Icon,
  Pagination,
  Layout,
  Select,
  Thumbnail,
  Spinner,
} from "@shopify/polaris";
import {
  Typography,
  Affix,
  Flex,
  Button,
  Table,
  Card,
  Skeleton,
  Empty,
  Image,
  Input,
  Space,
  Upload,
} from "antd";
import { TitleBar, useAppBridge, SaveBar } from "@shopify/app-bridge-react";
import {
  UploadOutlined,
  SearchOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon, ImageIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { globalStore } from "~/globalStore";
import {
  AltTranslate,
  DeleteProductImageData,
  getProductAllLanguageImagesData,
  storageTranslateImage,
  TranslateImage,
  UpdateProductImageAltData,
} from "~/api/JavaServer";
import ScrollNotice from "~/components/ScrollNotice";
import axios from "axios";
const { Text, Title } = Typography;
export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const imageLoading = JSON.parse(formData.get("imageLoading") as string);
  const imagesFetcher = JSON.parse(formData.get("imagesFetcher") as string);
  const translateImage = JSON.parse(formData.get("translateImage") as string);
  const replaceTranslateImage = JSON.parse(
    formData.get("replaceTranslateImage") as string,
  );
  const altTranslateFetcher = JSON.parse(
    formData.get("altTranslateFetcher") as string,
  );
  try {
    switch (true) {
      case !!imageLoading:
        try {
          console.log("sddwew: ", imageLoading.imageId);
          const loadData = await admin.graphql(
            `query {
              product(id: "${imageLoading?.productId}") { 
                id
                title
                images(first: 20) {
                  edges {
                    node {
                      id
                      url
                      altText
                    }
                  }
                  pageInfo {
                    hasNextPage
                    hasPreviousPage
                    startCursor
                    endCursor
                  }
                }
              }
            }`,
          );
          const response = await loadData.json();
          console.log(
            "productLoading: ",
            response?.data?.product?.images?.edges,
          );
          let imageData = {};
          if (response?.data?.product?.images?.edges.length > 0) {
            response?.data?.product?.images?.edges.forEach((item: any) => {
              if (item.node.id === imageLoading.imageId) {
                imageData = {
                  title: response?.data?.product?.title,
                  altText: item?.node?.altText,
                  key: item?.node?.id,
                  productId: item?.node?.id,
                  productTitle: item?.node?.title,
                  imageId: item?.node?.id,
                  imageUrl: item?.node?.url,
                  targetImageUrl: "",
                };
              }
            });
            return json({
              imageData,
            });
          } else {
            return json({
              imageData: [],
            });
          }
        } catch (error) {
          console.error("Error action imageStartCursor productImage:", error);
          return json({
            imageData: [],
          });
        }
      case !!imagesFetcher:
        try {
          console.log("imagesFetcher: ", imagesFetcher);
          const imageId = `gid://shopify/ProductImage/${imagesFetcher.imageId}`;
          const response = await getProductAllLanguageImagesData({
            shop,
            imageId,
          });
          console.log("productImage11: ", response);
          return response;
        } catch (error) {
          console.error("Error action imagesFetcher productImage:", error);
          return json({
            imageData: [],
          });
        }
      case !!translateImage:
        try {
          const { sourceLanguage, targetLanguage, imageUrl, imageId } =
            translateImage;
          console.log("translateImage: ", translateImage);
          console.log("accessToken: ", accessToken);

          const response = await TranslateImage({
            shop,
            imageUrl,
            sourceCode: sourceLanguage,
            targetCode: targetLanguage,
            accessToken: accessToken as string,
          });
          return response;
        } catch (error) {
          console.log("Error getImageTranslate", error);
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: [],
          };
        }

      case !!replaceTranslateImage: {
        try {
          const response = await storageTranslateImage({
            shop,
            replaceTranslateImage,
          });
          return response;
        } catch (error) {
          console.log("error storageImage", error);
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: [],
          };
        }
      }
      case !!altTranslateFetcher:
        try {
          const { img } = altTranslateFetcher;
          const response = await AltTranslate({
            shop: shop as string,
            accessToken: accessToken as string,
            img,
          });
          return json({ success: true, response });
        } catch (error) {
          console.log("alt translate error action", error);
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: [],
          };
        }
    }

    return {
      success: false,
      message: "Invalid data",
    };
  } catch (error) {
    console.log("Error management action: ", error);
    return { error: "Error management action", status: 500, errorMsg: error };
  }
};
const ImageAltTextPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { productId, imageId } = useParams();
  const [selectedLocale, setSelectedLocale] = useState<any>("");
  const [languageList, setLanguageList] = useState<any[]>([]);
  const [productImageData, setProductImageData] = useState<any>([]);
  const [defaultLanguageData, setDefaultLanguageData] = useState<any>();
  const languageFetcher = useFetcher<any>();
  const [currentTranslatingImage, setCurrentTranslatingImage] =
    useState<any>("");
  const translateImageFetcher = useFetcher<any>();
  const replaceTranslateImageFetcher = useFetcher<any>();
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [dataResource, setDataResource] = useState<any[]>([]);
  const [translateImageactive, setTranslateImageactive] = useState(false);
  const imageLoadingFetcher = useFetcher<any>();
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [confirmData, setConfirmData] = useState<any>([]);
  const [fileList, setFileList] = useState<any[]>([]);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [translatrImageactive, setTranslatrImageactive] = useState(false);
  const imageFetcher = useFetcher<any>();
  const [imageDatas, setImageDatas] = useState<any>();
  const [translateImageStatus, setTranslateImageStatus] =
    useState<boolean>(false);
  const [translateLoadingImages, setTranslateLoadingImages] = useState<
    Record<string, boolean>
  >({});
  const [deleteLoadingImages, setDeleteLoadingImages] = useState<
    Record<string, boolean>
  >({});
  const [altTranslateLoadingImages, setAltTranslateLoadingImages] = useState<
    Record<string, boolean>
  >({});
  const altTranslateFetcher = useFetcher<any>();
  const [currentAltImage, setCurrentAltImage] = useState<any>();
  const [productAltTextData, setProductAltTextData] = useState<
    {
      key: string;
      productTitle: string;
      imageUrl: string;
      altText: string;
      targetAltText: string;
      imageHasNextPage: boolean;
      imageHasPreviousPage: boolean;
      imageStartCursor: string;
      imageEndCursor: string;
    }[]
  >([
    {
      key: "",
      productTitle: "",
      imageUrl: "",
      altText: "",
      targetAltText: "",
      imageHasNextPage: false,
      imageHasPreviousPage: false,
      imageStartCursor: "",
      imageEndCursor: "",
    },
  ]);
  const languageMapping = {
    zh: [
      "en",
      "ru",
      "es",
      "fr",
      "de",
      "it",
      "nl",
      "pt",
      "vi",
      "tr",
      "ms",
      "zh-tw",
      "th",
      "pl",
      "id",
      "ja",
      "ko",
    ],
    en: [
      "zh",
      "ru",
      "es",
      "fr",
      "de",
      "it",
      "pt",
      "vi",
      "tr",
      "ms",
      "th",
      "pl",
      "id",
      "ja",
      "ko",
    ],
  } as any;
  // console.log(productId, imageId);

  const handleNavigate = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      navigate(`/app/products/${productId}`);
    }
  };
  const handleChange = (value: string) => {
    setSelectedLocale(value);
    console.log(`selected ${value}`);
    // navigate(`/app/management?language=${value}`);
  };
  useEffect(() => {
    imageFetcher.submit(
      { imagesFetcher: JSON.stringify({ imageId }) },
      { method: "POST" },
    );
  }, []);
  useEffect(() => {
    if (imageFetcher.data) {
      console.log("imageFetcher.data: ", imageFetcher.data);
      console.log(
        "languageList: ",
        languageList,
        "productImageData: ",
        productImageData,
      );
      // 后端返回的数据数组
      const fetchedList = imageFetcher.data.response || [];
      const mergedList = languageList.map((lang) => {
        // 看后端有没有返回
        const existing = fetchedList.find(
          (item: any) => item.languageCode === lang.value,
        );

        if (existing) {
          console.log("existing: ", existing);

          return { ...existing, language: lang.label };
        } else {
          return {
            imageId: productImageData.imageId,
            imageBeforeUrl: productImageData.imageUrl,
            imageAfterUrl: "",
            altBeforeTranslation: productImageData.altText,
            altAfterTranslation: "",
            languageCode: lang.value,
            language: lang.label, // 使用语言名
            isDelete: false,
          };
        }
      });
      console.log("mergedList: ", mergedList);

      setImageDatas(mergedList);
    }
  }, [imageFetcher.data]);
  // const handleImageTranslate = (record: any) => {
  //   console.log(record);

  //   let mappedLanguage =
  //     selectedLanguage === "zh-CN"
  //       ? "zh"
  //       : selectedLanguage === "zh-TW"
  //         ? "zh-tw"
  //         : selectedLanguage;
  //   if (selectedLanguage === "pt-BR" || selectedLanguage === "pt-PT") {
  //     mappedLanguage = "pt";
  //   }
  //   if (
  //     !languageMapping["en"].includes(mappedLanguage) &&
  //     !languageMapping["zh"].includes(mappedLanguage)
  //   ) {
  //     shopify.toast.show(
  //       t("The current language does not support image translation"),
  //     );
  //     return;
  //   }
  //   setTranslateImageactive(true);
  //   setCurrentTranslatingImage(record);
  // };
  // 图片翻译
  const handleTranslate = async (record: any, languageCode: string) => {
    console.log(record);
    setCurrentTranslatingImage(record);
    setTranslateLoadingImages((pre) => ({
      ...pre,
      [`${record.imageId}_${record.languageCode}`]: true,
    }));
    console.log(defaultLanguageData?.locale, languageCode);

    translateImageFetcher.submit(
      {
        translateImage: JSON.stringify({
          sourceLanguage: defaultLanguageData?.locale,
          targetLanguage: languageCode,
          imageUrl: record?.imageBeforeUrl,
          imageId: record?.productId,
        }),
      },
      { method: "post" },
    );
    setTranslatrImageactive(false);
  };
  useEffect(() => {
    if (translateImageFetcher.data) {
      console.log("sdasdada: ", translateImageFetcher.data);
      console.log(currentTranslatingImage);

      setTranslateLoadingImages((pre) => ({
        ...pre,
        [`${currentTranslatingImage.imageId}_${currentTranslatingImage.languageCode}`]: false,
      }));
      if (translateImageFetcher.data.success) {
        shopify.toast.show(t("Image translated successfully"));
        setImageDatas(
          imageDatas.map((item: any) => {
            if (item.languageCode === currentTranslatingImage.languageCode) {
              return {
                ...item,
                imageAfterUrl: translateImageFetcher.data.response,
              };
            }
            return item;
          }),
        );
        // setProductImageData(
        //   productImageData.map((item: any) => {
        //     if (item.imageUrl === currentTranslatingImage.imageUrl) {
        //       return {
        //         ...item,
        //         targetImageUrl: translateImageFetcher.data.response,
        //       };
        //     }
        //     return item;
        //   }),
        // );
        const replaceTranslateImage = {
          productId: `gid://shopify/Product/${productId}`,
          imageAfterUrl: translateImageFetcher.data.response,
          imageId: currentTranslatingImage?.imageId,
          imageBeforeUrl: currentTranslatingImage.imageBeforeUrl,
          languageCode: currentTranslatingImage.languageCode,
        };
        console.log("替换图片参数：", replaceTranslateImage);

        const formData = new FormData();
        formData.append(
          "replaceTranslateImage",
          JSON.stringify(replaceTranslateImage),
        );
        replaceTranslateImageFetcher.submit(formData, {
          method: "post",
        });
      } else {
        shopify.toast.show(t("Image translation failed"));
      }
    }
  }, [translateImageFetcher.data]);
  useEffect(() => {
    if (replaceTranslateImageFetcher.data) {
      console.log(replaceTranslateImageFetcher.data);
    }
  }, [replaceTranslateImageFetcher.data]);
  const handleDelete = async (
    imageId: string,
    imageUrl: string,
    languageCode: string,
  ) => {
    try {
      console.log(productId, imageUrl, languageCode);
      setDeleteLoadingImages((pre) => ({
        ...pre,
        [`${imageId}_${languageCode}`]: true,
      }));

      // setIsDeleteLoading(true);
      const res = await DeleteProductImageData({
        server: globalStore?.server || "",
        shopName: globalStore?.shop || "",
        imageId: imageId,
        imageUrl: imageUrl,
        languageCode: languageCode,
      });

      console.log("res", res);

      if (res.success) {
        // setDataResource(
        //   dataResource.map((item: any) => {
        //     return item.map((image: any) => {
        //       if (image.imageId === productId) {
        //         image.targetImageUrl = "";
        //       }
        //       return image;
        //     });
        //   }),
        // );
        console.log(imageDatas);
        console.log(currentTranslatingImage);

        setImageDatas(
          imageDatas.map((item: any) => {
            if (item.languageCode === languageCode) {
              item.imageAfterUrl = "";
            }
            return item;
          }),
        );
        shopify.toast.show(t("Delete Success"));
      } else {
        shopify.toast.show(t("Delete Failed"));
      }
      setDeleteLoadingImages((pre) => ({
        ...pre,
        [`${imageId}_${languageCode}`]: false,
      }));
    } catch (error) {
      console.log("delete image error", error);
    }
  };
  const handleTranslateAlt = async (img: any) => {
    setCurrentAltImage(img);
    console.log(img);

    console.log(
      `从当前语言${defaultLanguageData.locale}翻译成${img.languageCode}`,
    );
    setAltTranslateLoadingImages((pre) => ({
      ...pre,
      [`${img.imageId}_${img.languageCode}`]: true,
    }));
    console.log(img);
    const formData = new FormData();
    formData.append("altTranslateFetcher", JSON.stringify({ img }));
    altTranslateFetcher.submit(formData, { method: "post" });
  };
  useEffect(() => {
    if (altTranslateFetcher.data) {
      console.log(altTranslateFetcher.data);
      setAltTranslateLoadingImages((pre) => ({
        ...pre,
        [`${currentAltImage.imageId}_${currentAltImage.languageCode}`]: false,
      }));
      if (altTranslateFetcher.data.success) {
        setConfirmData((prev: any) => {
          const exists = prev.find(
            (i: any) => i.languageCode === currentAltImage.languageCode,
          );
          if (exists) {
            // 更新现有项
            return prev.map((i: any) =>
              i.languageCode === currentAltImage.languageCode
                ? { ...i, value: altTranslateFetcher.data.response.response }
                : i,
            );
          } else {
            // 添加新的
            return [
              ...prev,
              {
                key: currentAltImage.imageId,
                imageId: currentAltImage.imageId,
                languageCode: currentAltImage.languageCode,
                value: altTranslateFetcher.data.response.response,
                imageUrl: currentAltImage.imageBeforeUrl,
                altText: currentAltImage.altBeforeTranslation,
              },
            ];
          }
        });
      }
    }
  }, [altTranslateFetcher.data]);
  const handleInputChange = (
    key: string,
    imageId: string,
    imageUrl: string,
    altText: string,
    languageCode: string,
    value: string,
  ) => {
    setConfirmData((prevData: any) => {
      const existingItemIndex = prevData.findIndex(
        (item: any) => item.languageCode === languageCode,
      );
      if (existingItemIndex !== -1) {
        const updatedConfirmData = [...prevData];
        updatedConfirmData[existingItemIndex] = {
          ...updatedConfirmData[existingItemIndex],
          value: value,
        };
        return updatedConfirmData;
      } else {
        return [
          ...prevData,
          { key, imageId, imageUrl, altText, languageCode, value },
        ];
      }
    });
  };
  // 上传或删除图片时更新 fileList
  const handleChangeImage = (info: any, languageCode: string) => {
    // 只关心上传成功的情况
    if (info.file.status === "done") {
      const response = info.file.response; // 后端返回的数据
      const newUrl = response?.url || response; // 根据后端结构调整

      setImageDatas((prev: any[]) =>
        prev.map((item) =>
          item.languageCode === languageCode
            ? { ...item, imageAfterUrl: newUrl }
            : item,
        ),
      );

      shopify.toast.show("Upload success!");
    }
  };
  const handleConfirm = async () => {
    setSaveLoading(true);
    console.log(confirmData);

    const promises = confirmData.map((item: any) =>
      UpdateProductImageAltData({
        server: globalStore?.server || "",
        shopName: globalStore?.shop || "",
        productId: `gid://shopify/Product/${productId}`,
        imageId: item.imageId,
        imageUrl: item.imageUrl,
        altText: item.altText,
        targetAltText: item.value,
        languageCode: item.languageCode,
      }),
    );

    // 并发执行所有请求
    try {
      let successCount = 0;
      const results = await Promise.all(promises);
      // 这里可以根据 results 做成功/失败的提示
      results.forEach((result) => {
        console.log(result);

        if (result.success) {
          successCount++;
        }
      });
      if (successCount === confirmData.length) {
        shopify.toast.show(t("Saved successfully"));
      } else {
        shopify.toast.show(t("Some items saved failed"));
      }
    } catch (error) {
      console.log(error);

      shopify.saveBar.hide("save-bar");
      shopify.toast.show(t("Some items saved failed"));
    } finally {
      console.log("执行alt替换逻辑");
      console.log(imageDatas);

      setImageDatas(
        imageDatas.map((item: any) => {
          console.log(item.languageCode, confirmData);

          return {
            ...item,
            altAfterTranslation:
              confirmData.find(
                (confirmItem: any) =>
                  item.languageCode === confirmItem.languageCode,
              )?.value || item.altAfterTranslation,
          };
        }),
      );
      // setProductAltTextData(
      //   productAltTextData.map((item: any) => {
      //     return {
      //       ...item,
      //       targetAltText:
      //         confirmData.find(
      //           (confirmItem: any) => item.key === confirmItem.key,
      //         )?.value || item.targetAltText,
      //     };
      //   }),
      // );
      setConfirmData([]);
      shopify.saveBar.hide("save-bar");
      setSaveLoading(false);
    }
  };
  const handleDiscard = () => {
    setConfirmData([]);
    shopify.saveBar.hide("save-bar");
  };
  useEffect(() => {
    console.log("confirmData: ", confirmData);

    if (confirmData.length > 0) {
      shopify.saveBar.show("save-bar");
    } else {
      shopify.saveBar.hide("save-bar");
    }
  }, [confirmData]);
  // 图片预览
  const handlePreview = async (file: any) => {
    window.open(file.url || file.thumbUrl, "_blank");
  };
  // 删除图片
  const handleRemove = async (info: any, img: any) => {
    console.log(img);
    if (!img.imageAfterUrl) {
      shopify.toast.show("错误操作");
      return;
    }
    // console.log(file);
    handleDelete(img.imageId, img.imageBeforeUrl, img.languageCode);
  };
  useEffect(() => {
    imageLoadingFetcher.submit(
      {
        imageLoading: JSON.stringify({
          productId: `gid://shopify/Product/${productId}`,
          imageId: `gid://shopify/ProductImage/${imageId}`,
        }),
      },
      {
        method: "POST",
      },
    );
  }, []);
  useEffect(() => {
    if (imageLoadingFetcher.data) {
      console.log("imageLoadingFetcher.data: ", imageLoadingFetcher.data);
      setProductImageData(imageLoadingFetcher.data.imageData);
      setFileList([
        {
          uid: "-1", // 唯一 id
          name: "image.png",
          status: "done", // 已上传状态
          url: imageLoadingFetcher.data.imageData.imageUrl, // 直接展示已有图片
        },
      ]);
      setPageLoading(false);
    }
  }, [imageLoadingFetcher.data]);
  useEffect(() => {
    const languageFormData = new FormData();
    languageFormData.append("languageLoading", JSON.stringify({}));
    languageFetcher.submit(languageFormData, {
      action: "/app/management",
      method: "POST",
    });
  }, []);
  useEffect(() => {
    if (languageFetcher.data) {
      console.log(languageFetcher.data);
      languageFetcher.data.response.forEach((lan: any) => {
        if (lan.primary) {
          console.log("lan: ", lan);

          setDefaultLanguageData(lan);
        }
      });
      setLanguageList(
        languageFetcher.data.response
          .map((lan: any) => {
            if (!lan.primary) {
              return { value: lan.locale, label: lan.name };
            }
          })
          .filter(Boolean),
      );
      console.log("312", languageList);
    }
  }, [languageFetcher.data]);
  return (
    <Page>
      {/* <TitleBar title="Image & Alt Text Translation" /> */}
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at, and we will respond as soon as possible.",
        )}
      />
      <SaveBar id="save-bar">
        <button
          variant="primary"
          onClick={handleConfirm}
          loading={saveLoading ? "true" : undefined}
        >
          {t("Save")}
        </button>
        <button onClick={handleDiscard}>{t("Cancel")}</button>
      </SaveBar>
      <Affix offsetTop={0}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
            backgroundColor: "rgb(241, 241, 241)",
            padding: "16px 0",
          }}
        >
          <Flex
            align="center"
            justify="space-between"
            style={{ width: "100%" }}
          >
            <Flex align="center" gap={8}>
              <Button
                type="text"
                variant="outlined"
                onClick={handleNavigate}
                style={{ padding: "4px" }}
              >
                <Icon source={ArrowLeftIcon} tone="base" />
              </Button>
              <Title
                style={{
                  margin: "0",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                }}
              >
                {t("Image & Alt Translation")}
              </Title>
            </Flex>
            {/* <div style={{ maxWidth: "200px" }}>
              <Select
                label={""}
                value={selectedLocale}
                // style={{ width: 120 }}
                onChange={handleChange}
                options={languageList}
              />
            </div> */}
          </Flex>
        </div>
      </Affix>
      <Layout>
        <Layout.Section>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            {pageLoading ? (
              <Skeleton></Skeleton>
            ) : (
              <Flex vertical gap={8}>
                <Title level={4}>
                  {`${defaultLanguageData?.name}(${t("Default")})`}
                </Title>
                <Card
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                  }}
                >
                  <Flex justify="space-between" align="center">
                    <Flex
                      align="center"
                      vertical
                      justify="space-between"
                      gap={20}
                    >
                      <Text>Image</Text>
                      <Image
                        src={productImageData?.imageUrl}
                        preview={false}
                        width={100}
                        height={100}
                        style={{
                          borderRadius: 8,
                          objectFit: "cover",
                          background: "#fafafa",
                        }}
                      />
                    </Flex>

                    <Flex
                      align="center"
                      vertical
                      justify="space-between"
                      gap={20}
                      style={{ height: "100%" }}
                    >
                      <Text>Alt text</Text>
                      {/* <Upload
                    action={`${globalStore?.server}/picture/insertPictureToDbAndCloud`} // 上传接口
                    listType="picture-card"
                    fileList={fileList}
                    onChange={handleChangeImage}
                    onPreview={handlePreview}
                    // onRemove={handleRemove}
                    maxCount={1} // 限制只显示一个图片
                    beforeUpload={(file) => {
                      const isImage = file.type.startsWith("image/");
                      if (!isImage) {
                        shopify.toast.show("Only images can be uploaded");
                      }
                      return isImage;
                    }}
                    data={(file) => ({
                      shopName: globalStore?.shop,
                      file,
                      userPicturesDoJson: JSON.stringify({
                        shopName: globalStore?.shop,
                        imageId: productImageData?.imageId,
                        imageBeforeUrl: productImageData?.imageUrl,
                        altBeforeTranslation: "",
                        altAfterTranslation: "",
                        languageCode: selectedLanguage,
                      }),
                    })}
                  >
                    {fileList.length < 1 && (
                      <div>
                        <PlusOutlined />
                        <div style={{ marginTop: 8 }}>Upload</div>
                      </div>
                    )}
                  </Upload> */}

                      <Input
                        style={{ width: "400px" }}
                        disabled
                        value={productImageData?.altText || "—"}
                      />
                    </Flex>
                  </Flex>
                </Card>
              </Flex>
            )}

            {imageDatas?.length > 0 &&
              imageDatas.map((img: any) => (
                <Flex key={img.languageCode} vertical gap={8}>
                  <Title level={4}>{img.language}</Title>
                  <Card
                    style={{
                      width: "100%",
                      borderRadius: 12,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* 表头 */}
                    <Flex justify="space-between" align="stretch">
                      <Flex
                        vertical
                        align="center"
                        justify="space-between"
                        style={
                          {
                            // flex: 1,
                            // height:"100%",
                            // paddingBottom: 12,
                            // marginBottom: 12,
                          }
                        }
                      >
                        <Text>Image</Text>
                        <Upload
                          action={`${globalStore?.server}/picture/insertPictureToDbAndCloud`}
                          listType="picture-card"
                          fileList={
                            img.imageAfterUrl
                              ? [
                                  {
                                    uid: String(img.id),
                                    name: `${img.language}.png`,
                                    status: "done",
                                    url: img.imageAfterUrl,
                                  },
                                ]
                              : img.imageBeforeUrl
                                ? [
                                    {
                                      uid: String(img.id),
                                      name: `${img.language}-original.png`,
                                      status: "done",
                                      url: img.imageBeforeUrl,
                                    },
                                  ]
                                : []
                          }
                          onChange={(info) =>
                            handleChangeImage(info, img.languageCode)
                          }
                          onPreview={handlePreview}
                          onRemove={(info) => handleRemove(info, img)}
                          maxCount={1}
                          beforeUpload={(file) => {
                            const isImage = file.type.startsWith("image/");
                            if (!isImage) {
                              shopify.toast.show("Only images can be uploaded");
                            }
                            return isImage;
                          }}
                          data={(file) => ({
                            shopName: globalStore?.shop,
                            file,
                            userPicturesDoJson: JSON.stringify({
                              shopName: globalStore?.shop,
                              imageId: img.imageId,
                              imageBeforeUrl: img.imageBeforeUrl,
                              altBeforeTranslation: img.altBeforeTranslation,
                              altAfterTranslation: img.altAfterTranslation,
                              languageCode: img.languageCode,
                            }),
                          })}
                        >
                          {!img.imageAfterUrl && !img.imageBeforeUrl && (
                            <div>
                              <PlusOutlined />
                              <div style={{ marginTop: 8 }}>Upload</div>
                            </div>
                          )}
                        </Upload>
                      </Flex>
                      <Flex
                        vertical
                        align="stretch"
                        justify="space-between"
                        style={{
                          // flex: 1,
                          // paddingBottom: 12,
                          // marginBottom: 12,
                          width: "400px",
                          textAlign: "center",
                        }}
                      >
                        <Text>Alt Text</Text>
                        <Flex vertical align="stretch" justify="stretch" gap={40}>
                          <Input
                            disabled
                            value={img.altBeforeTranslation || "—"}
                            style={{ width: "100%" }}
                          />

                          {/* 译文 alt（优先显示 altAfterTranslation） */}
                          <Input
                            value={
                              confirmData.find(
                                (i: any) => i.languageCode === img.languageCode,
                              )?.value ?? img.altAfterTranslation
                            }
                            onChange={(e) =>
                              handleInputChange(
                                img.imageId,
                                img.imageId,
                                img.imageBeforeUrl,
                                img.altBeforeTranslation,
                                img.languageCode,
                                e.target.value,
                              )
                            }
                          />
                        </Flex>
                      </Flex>
                      <Flex
                        vertical
                        align="center"
                        justify="space-between"
                        style={
                          {
                            // flex: 1,
                            // paddingBottom: 12,
                            // marginBottom: 12,
                          }
                        }
                      >
                        <Text>Action</Text>
                        <Flex vertical gap={8}>
                          <Button
                            loading={
                              translateLoadingImages[
                                `${img.imageId}_${img.languageCode}`
                              ] || false
                            }
                            onClick={() =>
                              handleTranslate(img, img.languageCode)
                            }
                          >
                            {t("Image Translate")}
                          </Button>

                          <Upload
                            disabled={
                              translateImageFetcher.state === "submitting"
                            }
                            pastable={false}
                            maxCount={1}
                            accept="image/*"
                            name="file"
                            action={`${globalStore?.server}/pcUserPic/insertPicToDbAndCloud`}
                            beforeUpload={(file) => {
                              const isImage = file.type.startsWith("image/");
                              const isLt20M = file.size / 1024 / 1024 < 20;
                              const supportedFormats = [
                                "image/jpeg",
                                "image/png",
                                "image/webp",
                                "image/heic",
                                "image/gif",
                              ];
                              const isSupportedFormat =
                                supportedFormats.includes(file.type);
                              if (!isImage) {
                                shopify.toast.show(
                                  t("Only images can be uploaded"),
                                );
                                return false;
                              }
                              if (!isSupportedFormat) {
                                shopify.toast.show(
                                  t(
                                    "Only JPEG, PNG, WEBP, HEIC and GIF formats are supported",
                                  ),
                                );
                                return false;
                              }
                              if (!isLt20M) {
                                shopify.toast.show(
                                  t("File must be less than 20MB"),
                                );
                                return false;
                              }
                              return true;
                            }}
                            data={(file) => ({
                              shopName: globalStore?.shop,
                              file,
                              userPicturesDoJson: JSON.stringify({
                                shopName: globalStore?.shop,
                                imageId: img.imageId,
                                productId: `gid://shopify/Product/${productId}`,
                                imageBeforeUrl: img.imageBeforeUrl,
                                altBeforeTranslation: img.altBeforeTranslation,
                                altAfterTranslation: img.altAfterTranslation,
                                languageCode: img.languageCode,
                              }),
                            })}
                            onChange={(info) => {
                              console.log("info", info);

                              if (info.file.status === "done") {
                                const response = info.file.response; // 后端返回的数据
                                const newUrl =
                                  typeof response?.response?.imageAfterUrl ===
                                  "string"
                                    ? response.response?.imageAfterUrl
                                    : "";
                                if (response?.success) {
                                  setImageDatas((prev: any[]) => {
                                    return prev.map((item) =>
                                      item.languageCode === img.languageCode
                                        ? {
                                            ...item,
                                            imageAfterUrl:
                                              typeof newUrl === "string"
                                                ? newUrl
                                                : item.imageAfterUrl,
                                          }
                                        : item,
                                    );
                                  });
                                  console.log(imageDatas);

                                  shopify.toast.show(
                                    `${info.file.name} ${t("Upload Success")}`,
                                  );
                                } else {
                                  shopify.toast.show(
                                    `${info.file.name} ${t("Upload Failed")}`,
                                  );
                                }
                              } else if (info.file.status === "error") {
                                shopify.toast.show(
                                  `${info.file.name} ${t("Upload Failed")}`,
                                );
                              }
                            }}
                          >
                            <Button icon={<UploadOutlined />}>
                              {t("Click to Upload")}
                            </Button>
                          </Upload>

                          <Button
                            disabled={!img.imageAfterUrl}
                            loading={
                              deleteLoadingImages[
                                `${img.imageId}_${img.languageCode}`
                              ]
                            }
                            onClick={() =>
                              handleDelete(
                                img.imageId,
                                img.imageBeforeUrl,
                                img.languageCode,
                              )
                            }
                          >
                            {t("Delete")}
                          </Button>
                          <Button
                            loading={
                              altTranslateLoadingImages[
                                `${img.imageId}_${img.languageCode}`
                              ]
                            }
                            onClick={() => handleTranslateAlt(img)}
                          >
                            翻译ALt文本
                          </Button>
                        </Flex>
                      </Flex>
                    </Flex>
                  </Card>
                </Flex>
              ))}
          </Space>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default ImageAltTextPage;
