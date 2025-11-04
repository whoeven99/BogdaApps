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
  Col,
  Modal,
  Spin,
} from "antd";
import { TitleBar, useAppBridge, SaveBar } from "@shopify/app-bridge-react";
import {
  UploadOutlined,
  SearchOutlined,
  PlusOutlined,
  LoadingOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
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
import "./style.css";
import { useSelector } from "react-redux";
const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
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
          const imageId = `gid://shopify/ProductImage/${imagesFetcher.imageId}`;
          const response = await getProductAllLanguageImagesData({
            shop,
            imageId,
          });
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
          const response = (await TranslateImage({
            shop,
            imageUrl,
            sourceCode: sourceLanguage,
            targetCode: targetLanguage,
            accessToken: accessToken as string,
          })) as any;
          return response.data;
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
          const { record } = altTranslateFetcher;
          const response = await AltTranslate({
            shop: shop as string,
            accessToken: accessToken as string,
            record,
          });
          return json({ response });
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
  const [languageList, setLanguageList] = useState<any[]>([]);
  const [languageLoading, setLanguageLoading] = useState<boolean>(true);
  const [productImageData, setProductImageData] = useState<any>([]);
  const [defaultLanguageData, setDefaultLanguageData] = useState<any>();
  const languageFetcher = useFetcher<any>();
  const [currentTranslatingImage, setCurrentTranslatingImage] =
    useState<any>("");
  const translateImageFetcher = useFetcher<any>();
  const replaceTranslateImageFetcher = useFetcher<any>();
  const imageLoadingFetcher = useFetcher<any>();
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [confirmData, setConfirmData] = useState<any>([]);
  const [fileLists, setFileLists] = useState<Record<string, any[]>>({});
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [translatrImageactive, setTranslatrImageactive] = useState(false);
  const imageFetcher = useFetcher<any>();
  const [imageDatas, setImageDatas] = useState<any[]>([]);
  const [textareaLoading, setTextareaLoading] = useState<
    Record<string, boolean>
  >({});
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
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const { chars, totalChars } = useSelector((state: any) => state.userConfig);
  const [open, setOpen] = useState<boolean>(false);
  const [dataReady, setDataReady] = useState(false);
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
  const handleNavigate = () => {
    if (confirmData.length > 0) {
      shopify.saveBar.leaveConfirmation();
    } else {
      shopify.saveBar.hide("save-bar");
      navigate(`/app/products/${productId}`);
    }
  };
  // 关闭弹窗
  const handleCancel = () => {
    setPreviewVisible(false);
    setPreviewImage("");
  };
  useEffect(() => {
    imageFetcher.submit(
      { imagesFetcher: JSON.stringify({ imageId }) },
      { method: "POST" },
    );
  }, []);
  useEffect(() => {
    if (imageFetcher.data) {
      // 后端返回的数据数组
      const fetchedList = imageFetcher.data.response || [];
      const mergedList = languageList?.map((lang) => {
        // 看后端有没有返回
        const existing = fetchedList.find(
          (item: any) => item.languageCode === lang.value,
        );

        if (existing) {
          return {
            ...existing,
            language: lang.label,
            published: lang.published,
          };
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
            published: lang.published,
          };
        }
      });
      setImageDatas(mergedList);
    }
  }, [imageFetcher.data]);
  useEffect(() => {
    if (!languageLoading && imageFetcher.state !== "submitting") {
      setDataReady(true);
    }
  }, [languageLoading, languageList, imageDatas]);
  useEffect(() => {
    if (imageDatas?.length > 0) {
      const initLists = imageDatas.reduce(
        (acc: any, img: any) => {
          acc[img.languageCode] = img.imageAfterUrl
            ? [
                {
                  uid: String(img.id),
                  name: `${img.language}.png`,
                  status: "done",
                  url: img.imageAfterUrl,
                },
              ]
            : [];
          return acc;
        },
        {} as Record<string, any[]>,
      );
      setFileLists(initLists);
    }
  }, [imageDatas]);
  // 图片翻译
  const handleTranslate = async (record: any, languageCode: string) => {
    setCurrentTranslatingImage(record);
    if (!languageMapping[languageCode]?.includes(languageCode)) {
      shopify.toast.show(
        t("Image translation is not supported in the current language."),
      );
    } else {
      setTranslateLoadingImages((pre) => ({
        ...pre,
        [`${record.imageId}_${record.languageCode}`]: true,
      }));
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
    }

    const formData = new FormData();
    formData.append("altTranslateFetcher", JSON.stringify({ record }));
    altTranslateFetcher.submit(formData, { method: "post" });
    setTranslatrImageactive(false);
    setTextareaLoading((pre) => ({
      ...pre,
      [`${record.imageId}_${record.languageCode}`]: true,
    }));
  };
  useEffect(() => {
    if (translateImageFetcher.data) {
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
        const replaceTranslateImage = {
          productId: `gid://shopify/Product/${productId}`,
          imageAfterUrl: translateImageFetcher.data.response,
          imageId: currentTranslatingImage?.imageId,
          imageBeforeUrl: currentTranslatingImage.imageBeforeUrl,
          languageCode: currentTranslatingImage.languageCode,
        };
        const formData = new FormData();
        formData.append(
          "replaceTranslateImage",
          JSON.stringify(replaceTranslateImage),
        );
        replaceTranslateImageFetcher.submit(formData, {
          method: "post",
        });
      } else if (
        !translateImageFetcher.data.success &&
        translateImageFetcher.data.errorMsg === "额度不够"
      ) {
        shopify.toast.show(t("Image translation failed"));
        setOpen(true);
      }
    }
  }, [translateImageFetcher.data]);
  const handleDelete = async (
    imageId: string,
    imageUrl: string,
    languageCode: string,
  ) => {
    try {
      setDeleteLoadingImages((pre) => ({
        ...pre,
        [`${imageId}_${languageCode}`]: true,
      }));
      const res = await DeleteProductImageData({
        server: globalStore?.server || "",
        shopName: globalStore?.shop || "",
        imageId: imageId,
        imageUrl: imageUrl,
        languageCode: languageCode,
      });

      if (res.success) {
        setImageDatas(
          imageDatas.map((item: any) => {
            if (item.languageCode === languageCode) {
              item.imageAfterUrl = "";
              item.altAfterTranslation = "";
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
  useEffect(() => {
    if (altTranslateFetcher.data) {
      setAltTranslateLoadingImages((pre) => ({
        ...pre,
        [`${currentTranslatingImage.imageId}_${currentTranslatingImage.languageCode}`]: false,
      }));
      if (altTranslateFetcher.data.response.success) {
        setConfirmData((prev: any) => {
          const exists = prev.find(
            (i: any) => i.languageCode === currentTranslatingImage.languageCode,
          );
          if (exists) {
            // 更新现有项
            return prev.map((i: any) =>
              i.languageCode === currentTranslatingImage.languageCode
                ? { ...i, value: altTranslateFetcher.data.response.response }
                : i,
            );
          } else {
            // 添加新的
            return [
              ...prev,
              {
                key: currentTranslatingImage.imageId,
                imageId: currentTranslatingImage.imageId,
                languageCode: currentTranslatingImage.languageCode,
                value: altTranslateFetcher.data.response.response,
                imageUrl: currentTranslatingImage.imageBeforeUrl,
                altText: currentTranslatingImage.altBeforeTranslation,
              },
            ];
          }
        });
      } else if (
        !altTranslateFetcher.data.response.success &&
        altTranslateFetcher.data.response.errorMsg === "额度不够"
      ) {
        setOpen(true);
      }
      setTextareaLoading((pre) => ({
        ...pre,
        [`${currentTranslatingImage.imageId}_${currentTranslatingImage.languageCode}`]: false,
      }));
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
    setFileLists((prev) => ({
      ...prev,
      [languageCode]: info.fileList, // ✅ 更新对应语言
    }));
    if (info.file.status === "done") {
      const response = info.file.response; // 后端返回的数据
      const newUrl =
        typeof response?.response?.imageAfterUrl === "string"
          ? response.response?.imageAfterUrl
          : "";
      if (response?.success) {
        setImageDatas((prev: any[]) => {
          return prev.map((item) =>
            item.languageCode === languageCode
              ? {
                  ...item,
                  imageAfterUrl:
                    typeof newUrl === "string" ? newUrl : item.imageAfterUrl,
                }
              : item,
          );
        });
        shopify.toast.show(`${info.file.name} ${t("Upload Success")}`);
      } else {
        shopify.toast.show(`${info.file.name} ${t("Upload Failed")}`);
      }
    } else if (info.file.status === "error") {
      shopify.toast.show(`${info.file.name} ${t("Upload Failed")}`);
    }
  };
  const handleConfirm = async () => {
    setSaveLoading(true);
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
      shopify.saveBar.hide("save-bar");
      shopify.toast.show(t("Some items saved failed"));
    } finally {
      setImageDatas((prev: any[]) =>
        prev.map((item: any) => {
          const matched = confirmData.find(
            (confirmItem: any) =>
              item.languageCode === confirmItem.languageCode,
          );
          return {
            ...item,
            altAfterTranslation: matched
              ? matched.value
              : item.altAfterTranslation,
          };
        }),
      );

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
    if (confirmData.length > 0) {
      shopify.saveBar.show("save-bar");
    } else {
      shopify.saveBar.hide("save-bar");
    }
  }, [confirmData]);
  // 图片预览
  const handlePreview = async (img: any) => {
    setPreviewImage(img.imageAfterUrl);
    setPreviewVisible(true);
  };
  // 删除图片
  const handleRemove = async (info: any, img: any) => {
    setFileLists((prev) => ({
      ...prev,
      [img.languageCode]: [],
    }));
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
      setProductImageData(imageLoadingFetcher.data.imageData);
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
      languageFetcher.data.response.forEach((lan: any) => {
        if (lan.primary) {
          setDefaultLanguageData(lan);
        }
      });
      // console.log("商店查询语言数据：", languageFetcher.data);

      setLanguageList(
        languageFetcher.data.response
          .map((lan: any) => {
            if (!lan.primary) {
              return {
                value: lan.locale,
                label: lan.name,
                published: lan.published,
              };
            }
          })
          .filter(Boolean),
      );
      setLanguageLoading(false);
    }
  }, [languageFetcher.data]);
  const onBuy = () => {
    navigate("/app");
  };
  const onCancel = () => {
    setOpen(false);
  };
  return (
    <Page>
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
                level={2}
                style={{
                  margin: "0",
                  fontSize: "20px",
                  fontWeight: 700,
                }}
              >
                {t("Manage image translations")}
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
          <Space>
            {pageLoading ? (
              <Skeleton></Skeleton>
            ) : (
              <Flex vertical gap={8}>
                <Title level={4} style={{ fontSize: "16px" }}>
                  {`${defaultLanguageData?.name}(${t("Default")})`}
                </Title>
                <div
                  style={{
                    width: "300px",
                    textAlign: "center",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    border: "1px solid #f0f0f0",
                    borderRadius: "8px",
                    padding: "10px",
                    backgroundColor: "#fff",
                  }}
                >
                  <Flex justify="space-between" align="center" vertical gap={8}>
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: "8px 8px 0 0",
                        overflow: "hidden",
                        marginBottom: "30px",
                        padding: 0,
                      }}
                    >
                      <img
                        src={productImageData?.imageUrl}
                        alt={productImageData?.altText}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </div>
                    <TextArea
                      placeholder=""
                      style={{
                        margin: "0 0 24px 0",
                        resize: "none", // ✅ 禁止手动拖拽
                        backgroundColor: "#fff",
                        color: "#000",
                      }}
                      disabled
                      value={productImageData?.altText || "—"}
                      autoSize={{ minRows: 2, maxRows: 10 }}
                    />
                  </Flex>
                </div>
              </Flex>
            )}
          </Space>
        </Layout.Section>

        <Layout.Section>
          <Space direction="vertical" size="large" style={{ width: "100%" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: 24,
              }}
            >
              {!dataReady ? (
                <Skeleton active></Skeleton>
              ) : imageDatas?.length > 0 ? (
                imageDatas.map((img: any) => (
                  <Flex
                    key={img.languageCode}
                    justify="space-between"
                    vertical
                    gap={8}
                  >
                    <Text style={{ fontSize: "14px" }}>
                      {img.language}
                      {img.published ? t("(Published)") : t("(Not released)")}
                    </Text>
                    <div
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                        flex: "1",
                        // borderRadius: "8px",
                        padding: 0,
                        backgroundColor: "#fff",
                      }}
                    >
                      {/* 表头 */}
                      <Flex
                        justify="space-between"
                        align="center"
                        vertical
                        gap={10}
                        style={{ width: "100%", padding: "10px" }} // ✅ 占满宽度
                      >
                        <div
                          style={{
                            width: "100%",
                            aspectRatio: "1/1",
                            borderRadius: "8px 8px 0 0",

                            display: "flex",
                            flexDirection: "column",
                            gap: "8x",
                            justifyContent: "center",
                          }}
                        >
                          <Upload
                            name="file"
                            accept="image/*"
                            style={{ margin: "auto" }}
                            action={`${globalStore?.server}/pcUserPic/insertPicToDbAndCloud`}
                            listType="picture-card"
                            // className="custom-upload"
                            className={`upload-box ${
                              fileLists[img.languageCode]?.some(
                                (f) => f.status === "done",
                              )
                                ? "custom-upload"
                                : ""
                            }`}
                            fileList={fileLists[img.languageCode] || []}
                            onChange={(info) => {
                              handleChangeImage(info, img.languageCode);
                            }}
                            onPreview={() => handlePreview(img)}
                            onRemove={(info) => handleRemove(info, img)}
                            maxCount={1}
                            beforeUpload={(file) => {
                              const isImage = file.type.startsWith("image/");
                              if (!isImage) {
                                shopify.toast.show(
                                  "Only images can be uploaded",
                                );
                              }
                              return isImage;
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
                            showUploadList={{
                              showPreviewIcon: true,
                              showRemoveIcon: true,
                            }}
                            // style={{
                            //   width: "100%",
                            // }}
                          >
                            {!img.imageAfterUrl && (
                              <div>
                                <PlusOutlined />
                                <div style={{ marginTop: 8 }}>Upload</div>
                              </div>
                            )}
                          </Upload>
                          <Spin
                            spinning={
                              textareaLoading[
                                `${img.imageId}_${img.languageCode}`
                              ] || false
                            }
                            tip="加载中..."
                          >
                            <TextArea
                              style={{ margin: "16px 0" }}
                              value={
                                confirmData.find(
                                  (i: any) =>
                                    i.languageCode === img.languageCode,
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
                              placeholder={t(
                                "Enter the image to be modified (Alt)",
                              )}
                              autoSize={{ minRows: 5, maxRows: 5 }}
                            />
                          </Spin>
                        </div>
                        <Flex
                          gap={10}
                          align="flex-start"
                          style={{
                            width: "fit-content",
                            marginBottom: "8px",
                          }}
                        >
                          <Flex align="center" gap={10}>
                            <DeleteOutlined
                              style={{
                                display: `${img.imageAfterUrl || img.altAfterTranslation ? "block" : "none"}`,
                              }}
                              className="deleteIcon"
                              onClick={() =>
                                handleDelete(
                                  img.imageId,
                                  img.imageBeforeUrl,
                                  img.languageCode,
                                )
                              }
                            />
                            <Button
                              block
                              loading={
                                translateLoadingImages[
                                  `${img.imageId}_${img.languageCode}`
                                ] || false
                              }
                              onClick={() =>
                                handleTranslate(img, img.languageCode)
                              }
                            >
                              {t("Translate")}
                            </Button>
                          </Flex>

                          <Upload
                            style={{ flex: "1" }}
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
                              setFileLists((prev) => ({
                                ...prev,
                                [img.languageCode]: info.fileList, // ✅ 更新对应语言
                              }));
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
                            <Button type="default">
                              {t("Click to Upload")}
                            </Button>
                          </Upload>

                          {/* <Button
                            block
                            style={{
                              display: `${img.imageAfterUrl ? "block" : "none"}`,
                            }}
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
                          </Button> */}
                        </Flex>
                      </Flex>
                    </div>
                  </Flex>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1", // ✅ 让它跨越整个 grid
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "40px 0",
                  }}
                >
                  <Empty
                    description={t(
                      "Data loading error, please refresh the page.",
                    )}
                  />
                </div>
              )}
            </div>
          </Space>
          <Modal
            open={previewVisible}
            title={t("Image Preview")}
            footer={null}
            onCancel={handleCancel}
            centered
          >
            <img
              alt="Preview"
              style={{
                width: "100%",
                borderRadius: 8,
                objectFit: "contain",
                // maxHeight: "70vh",
              }}
              src={previewImage}
            />
          </Modal>
          <Modal
            open={open}
            title={null}
            footer={null}
            onCancel={onCancel}
            centered
            // bodyStyle={{ textAlign: "center", padding: "32px 24px" }}
          >
            <Space
              direction="vertical"
              size="middle"
              style={{ width: "100%", textAlign: "center" }}
            >
              <ExclamationCircleOutlined
                style={{ fontSize: 48, color: "#faad14" }}
              />

              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {t("Insufficient translation quota")}
              </Typography.Title>

              <Paragraph type="secondary" style={{ margin: 0 }}>
                {t(
                  "Your current translation quota has been used up. Please purchase more quota to continue using the translation function.",
                )}
              </Paragraph>

              <Space
                style={{
                  marginTop: 24,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Button onClick={onCancel}>{t("Cancel")}</Button>
                <Button type="primary" onClick={onBuy}>
                  {t("Purchase quota")}
                </Button>
              </Space>
            </Space>
          </Modal>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default ImageAltTextPage;
