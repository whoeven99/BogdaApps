import {
  useFetcher,
  useLoaderData,
  useNavigate,
  useParams,
} from "@remix-run/react";
import {
  Page,
  Icon,
  Pagination,
  Layout,
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
  Radio,
  Select,
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
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { globalStore } from "~/globalStore";
import {
  AltTranslate,
  DeleteProductImageData,
  DeleteSingleImage,
  getProductAllLanguageImagesData,
  storageTranslateImage,
  TranslateImage,
  UpdateProductImageAltData,
} from "~/api/JavaServer";
import ScrollNotice from "~/components/ScrollNotice";
import axios from "axios";
import "./style.css";
import { useDispatch, useSelector } from "react-redux";
import { AddCreaditsModal } from "../app._index/components/addCreditsModal";
import { setChars, setTotalChars } from "~/store/modules/userConfig";
import { CheckboxGroupProps } from "antd/es/checkbox";
const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  return json({ shop });
};
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
          const { alt, targetCode } = altTranslateFetcher;
          const response = await AltTranslate({
            shop: shop as string,
            accessToken: accessToken as string,
            alt,
            targetCode,
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
  const loader = useLoaderData<{ shop: string }>();
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
  const [imageFetcherLoading, setImageFetcherLoading] = useState(true);
  const [imageDatas, setImageDatas] = useState<any[]>([]);
  const [textareaLoading, setTextareaLoading] = useState<
    Record<string, boolean>
  >({});
  const [translateLoadingImages, setTranslateLoadingImages] = useState<
    Record<string, boolean>
  >({});
  const altTranslateFetcher = useFetcher<any>();
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    imgUrl: string;
    imgAlt: string;
  }>({ imgUrl: "", imgAlt: "" });
  const { chars, totalChars } = useSelector((state: any) => state.userConfig);

  const [open, setOpen] = useState<boolean>(false);
  const [notTranslateModal, setNotTranslateModal] = useState<boolean>(false);
  const [dataReady, setDataReady] = useState(false);
  const [openModal, setOpenModal] = useState<boolean>(false);
  const dispatch = useDispatch();
  const fetcher = useFetcher();
  const options: CheckboxGroupProps<string>["options"] = [
    { label: "标准版", value: "bassic" },
    { label: "pro大模型", value: "pro" },
  ];
  const baseInput = new Set([
    "zh",
    "zh-tw",
    "en",
    "fr",
    "it",
    "ja",
    "ko",
    "pt",
    "ru",
    "es",
    "th",
    "tr",
    "vi",
  ]);
  const baseOutput = new Set([
    "ar",
    "bn",
    "zh",
    "zh-tw",
    "cs",
    "da",
    "nl",
    "en",
    "fi",
    "fr",
    "de",
    "el",
    "he",
    "hu",
    "id",
    "it",
    "ja",
    "kk",
    "ko",
    "ms",
    "pl",
    "pt",
    "ru",
    "es",
    "sv",
    "th",
    "tl",
    "tr",
    "uk",
    "ur",
    "vi",
  ]);
  const allLanguageOptions = [
    { label: "Arabic", value: "ar" },
    { label: "Bengali", value: "bn" },
    { label: "Chinese (Simplified)", value: "zh" },
    { label: "Chinese (Traditional)", value: "zh-tw" },
    { label: "Czech", value: "cs" },
    { label: "Danish", value: "da" },
    { label: "Dutch", value: "nl" },
    { label: "English", value: "en" },
    { label: "Finnish", value: "fi" },
    { label: "French", value: "fr" },
    { label: "German", value: "de" },
    { label: "Greek", value: "el" },
    { label: "Hebrew", value: "he" },
    { label: "Hungarian", value: "hu" },
    { label: "Indonesian", value: "id" },
    { label: "Italian", value: "it" },
    { label: "Japanese", value: "ja" },
    { label: "Kazakh", value: "kk" },
    { label: "Korean", value: "ko" },
    { label: "Malay", value: "ms" },
    { label: "Polish", value: "pl" },
    { label: "Portuguese", value: "pt" },
    { label: "Russian", value: "ru" },
    { label: "Spanish", value: "es" },
    { label: "Swedish", value: "sv" },
    { label: "Thai", value: "th" },
    { label: "Tagalog (Filipino)", value: "tl" },
    { label: "Turkish", value: "tr" },
    { label: "Ukrainian", value: "uk" },
    { label: "Urdu", value: "ur" },
    { label: "Vietnamese", value: "vi" },
  ];

  const [sourceLanguage, setSourceLanguage] = useState<string>("zh");
  const [targetLanguage, setTargetLanguage] = useState<any>();
  const [sourceLanguages, setSourceLanguages] = useState<any[]>([]);
  const [targetLanguages, setTargetLanguages] = useState<any[]>();

  const specialSourceRules: Record<string, string[]> = {
    "zh-tw": ["zh", "en"], // 繁体中文
    el: ["en", "tr"], // 希腊语
    kk: ["zh"], // 哈萨克语
  };
  const canTranslate = (source: string, target: string): boolean => {
    const src = normalizeLocale(source);
    const tgt = normalizeLocale(target);
    // 目标语言必须在输出范围
    if (!baseOutput.has(tgt)) return false;
    // 源语言必须在输入范围
    if (!baseInput.has(src)) return false;
    // 检查是否有特殊规则
    if (specialSourceRules[tgt]) {
      return specialSourceRules[tgt].includes(src);
    }
    return true;
  };
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
    setPreviewImage({ imgUrl: "", imgAlt: "" });
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
      setImageFetcherLoading(false);
    }
  }, [imageFetcher.data]);
  useEffect(() => {
    if (!languageLoading && !imageFetcherLoading) {
      setDataReady(true);
    }
  }, [languageLoading, imageFetcherLoading]);
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
  // 语言转换函数
  const normalizeLocale = (locale: string): string => {
    if (!locale) return "";
    const lower = locale.toLowerCase();

    if (lower.startsWith("zh-cn")) return "zh";
    if (lower.startsWith("zh-tw")) return "zh-tw";
    if (lower.startsWith("en")) return "en";
    if (lower.startsWith("pt")) return "pt";

    // ✅ 处理其它常见格式（如 en-US / fr-CA）
    return lower;
  };
  useEffect(() => {
    // 初始化源语言下拉
    const sourceLangOptions = [...baseInput].map((lang) => {
      return {
        label: allLanguageOptions.find((o) => o.value === lang)?.label ?? lang,
        value: lang,
      };
    });
    setSourceLanguages(sourceLangOptions);
  }, []);
  useEffect(() => {
    const allowedTargets = [...baseOutput].filter((target) => {
      // 排除跟 source 相同的 code（避免自翻译）
      if (target === normalizeLocale(sourceLanguage)) return false;

      // 如果目标在特殊规则里，则仅当当前 source 在允许列表中才允许该目标
      if (specialSourceRules[target]) {
        return specialSourceRules[target]?.includes(
          normalizeLocale(sourceLanguage),
        );
      }
      // 否则默认允许
      return true;
    });

    const options = allowedTargets.map((v) => {
      const label = allLanguageOptions.find((o) => o.value === v)?.label ?? v;
      return { label: label, value: v };
    });
    setTargetLanguages(options);
    // 如果当前选的 targetLanguage 不在新候选里，重置为第一个（如果存在）
    // if (!allowedTargets.includes(targetLanguage)) {
    //   setTargetLanguage(options[0]?.value ?? "");
    // }
  }, [sourceLanguage]);
  const buildOptions = (langs: string[]) =>
    langs.map((v) => {
      const label = allLanguageOptions.find((o) => o.value === v)?.label ?? v;

      return { label, value: v };
    });
  useEffect(() => {
    if (targetLanguage && specialSourceRules[targetLanguage]) {
      const allowedSources = specialSourceRules[targetLanguage];
      setSourceLanguages(buildOptions(allowedSources)); // 🎯 转换成 {label, value} 格式
    } else {
      setSourceLanguages(buildOptions([...baseInput])); // 🎯 同样格式
    }
  }, [targetLanguage]);
  // 图片翻译
  const TriggerTranslate = async (record: any, languageCode: string) => {
    setCurrentTranslatingImage(record);
    setTranslatrImageactive(true);
    setSourceLanguage(normalizeLocale(defaultLanguageData.locale));

    setTargetLanguage(normalizeLocale(languageCode));
  };
  const onClose = () => {
    setTranslatrImageactive(false);
  };
  const handleTranslate = () => {
    if (translateImageFetcher.state !== "idle") {
      shopify.toast.show("Translation tasks are in progress.");
      return;
    }
    // setCurrentTranslatingImage(record);
    if (totalChars - chars < 2000) {
      setOpen(true);
      return;
    }
    if (!canTranslate(sourceLanguage, targetLanguage)) {
      setNotTranslateModal(true);
      return;
    }
    setTranslateLoadingImages((pre) => ({
      ...pre,
      [`${currentTranslatingImage.imageId}_${currentTranslatingImage.languageCode}`]: true,
    }));
    translateImageFetcher.submit(
      {
        translateImage: JSON.stringify({
          sourceLanguage: sourceLanguage,
          targetLanguage: targetLanguage,
          imageUrl: currentTranslatingImage?.imageBeforeUrl,
          imageId: currentTranslatingImage?.productId,
        }),
      },
      { method: "post" },
    );
    if (!currentTranslatingImage?.altBeforeTranslation) {
      return;
    }
    const formData = new FormData();
    formData.append(
      "altTranslateFetcher",
      JSON.stringify({
        alt: currentTranslatingImage.altBeforeTranslation,
        targetCode: targetLanguage,
      }),
    );
    altTranslateFetcher.submit(formData, { method: "post" });
    setTranslatrImageactive(false);

    setTextareaLoading((pre) => ({
      ...pre,
      [`${currentTranslatingImage.imageId}_${currentTranslatingImage.languageCode}`]: true,
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
        dispatch(setChars({ chars: chars + 1000 }));
        // dispatch(
        //   setTotalChars({
        //     totalChars: data?.response?.purchasePoints,
        //   }),
        // );
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
    } catch (error) {
      console.log("delete image error", error);
    }
  };
  const handleDeleteSingleImage = async (
    imageId: string,
    imageUrl: string,
    languageCode: string,
  ) => {
    try {
      const res = await DeleteSingleImage({
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
            }
            return item;
          }),
        );
        shopify.toast.show(t("Delete Success"));
      } else {
        shopify.toast.show(t("Delete Failed"));
      }
    } catch (error) {
      console.log("delete image error", error);
    }
  };
  useEffect(() => {
    if (altTranslateFetcher.data) {
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
        dispatch(setChars({ chars: chars + 1000 }));
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
      setFileLists((prev) => ({
        ...prev,
        [languageCode]: [], // ✅ 更新对应语言
      }));
      shopify.toast.show(`${info.file.name} ${t("Upload Failed")}`);
      fetcher.submit(
        {
          log: `${loader.shop} 上传图片失败`,
        },
        {
          method: "POST",
          action: "/app/log",
        },
      );
    }
  };
  const handleConfirm = async () => {
    const uploading = Object.values(fileLists).some((list: any[]) =>
      list.some((f) => f.status !== "done"),
    );
    if (uploading) {
      shopify.toast.show(t("Please wait until all images are uploaded"));
      return;
    }
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
          if (!matched) return item;
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
    setPreviewImage({
      imgUrl: img.imageAfterUrl,
      imgAlt: img.altAfterTranslation,
    });
    setPreviewVisible(true);
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
          fetcher.submit(
            {
              log: `${loader.shop} 当前在图像翻译页面，商店默认语言是 ${lan?.locale}`,
            },
            {
              method: "POST",
              action: "/app/log",
            },
          );
        }
      });
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
    fetcher.submit(
      {
        log: `${loader.shop} 触发了积分不足弹框`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
    setOpen(false);
    setOpenModal(true);
  };
  const onCancel = () => {
    setOpen(false);
  };
  const handleAddLanguage = () => {
    window.open(
      `https://admin.shopify.com/store/${loader.shop.split(".")[0]}/settings/languages`,
      "_blank",
    );
    fetcher.submit(
      {
        log: `${loader.shop} 前往添加语言页面`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  };
  const querySourceLanguage = (value: string) => {};
  const queryTargetLanguage = (value: string) => {};
  return (
    <Page>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
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
                          objectFit: "contain",
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
                      value={productImageData?.altText || ""}
                      autoSize={{ minRows: 5, maxRows: 10 }}
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
                      {img.published ? t("(Published)") : t("(Unpublished)")}
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
                        style={{
                          width: "100%",
                          padding: "10px",
                          height: "100%",
                        }} // ✅ 占满宽度
                      >
                        <div
                          style={{
                            width: "100%",
                            // height:"300px",
                            aspectRatio: "1/1",
                            borderRadius: "8px 8px 0 0",

                            display: "flex",
                            flexDirection: "column",
                            gap: "8x",
                            justifyContent: "center",
                            flex: "1",
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
                            onRemove={() => {
                              handleDeleteSingleImage(
                                img.imageId,
                                img.imageBeforeUrl,
                                img.languageCode,
                              );
                            }}
                            maxCount={0}
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
                                <div style={{ marginTop: 8 }}>
                                  {t("Upload")}
                                </div>
                              </div>
                            )}
                          </Upload>
                        </div>
                        <Flex
                          vertical
                          style={{ width: "100%" }}
                          align="stretch"
                        >
                          <Spin
                            spinning={
                              textareaLoading[
                                `${img.imageId}_${img.languageCode}`
                              ] || false
                            }
                            tip="加载中..."
                            style={{ width: "100%" }}
                          >
                            <TextArea
                              style={{ margin: "16px 0", width: "100%" }}
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
                          <Flex
                            gap={10}
                            align="center"
                            justify="center"
                            style={{
                              width: "fit-content",
                              marginBottom: "8px",
                            }}
                          >
                            <Button
                              block
                              loading={
                                translateLoadingImages[
                                  `${img.imageId}_${img.languageCode}`
                                ] || false
                              }
                              onClick={() =>
                                TriggerTranslate(img, img.languageCode)
                              }
                            >
                              {t("Translate")}
                            </Button>
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
                                  altBeforeTranslation:
                                    img.altBeforeTranslation,
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
                              showUploadList={false}
                            >
                              <Button type="default">{t("Upload")}</Button>
                            </Upload>
                            <Button
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
                              shape="circle"
                              icon={<DeleteOutlined />}
                            ></Button>
                          </Flex>
                        </Flex>
                      </Flex>
                    </div>
                  </Flex>
                ))
              ) : (
                <Flex
                  vertical
                  align="center"
                  justify="center"
                  style={{
                    gridColumn: "1 / -1",
                    width: "100%",
                    minHeight: "320px", // ✅ 提供一定视觉高度
                    // background: "#fff",
                    borderRadius: 12,
                    border: "1px solid #f0f0f0",
                    padding: "48px 16px",
                  }}
                >
                  <Empty
                    description={
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 15 }}
                      >
                        {t(
                          "The language you need for translation is not available in the store. Please add it via the store settings (Add Language).",
                        )}
                      </Typography.Text>
                    }
                  />

                  <Button
                    type="primary"
                    style={{ marginTop: 24 }}
                    onClick={handleAddLanguage}
                  >
                    {t("Add Language")}
                  </Button>
                </Flex>
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
              alt={previewImage.imgAlt || "preview image"}
              style={{
                width: "100%",
                borderRadius: 8,
                objectFit: "contain",
                maxHeight: "90vh",
              }}
              src={previewImage.imgUrl}
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
            <Space direction="vertical" size="middle" style={{ width: "100%" }}>
              <Typography.Title level={4} style={{ marginBottom: 0 }}>
                {t("Translation limit reached")}
              </Typography.Title>

              <Paragraph type="secondary" style={{ margin: 0 }}>
                {t(
                  "You’ve used all your available image translations. Add more to continue translating instantly.",
                )}
              </Paragraph>

              <Space
                style={{
                  marginTop: 24,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <Button type="primary" onClick={onBuy}>
                  {t("Add more")}
                </Button>
              </Space>
            </Space>
          </Modal>
          <AddCreaditsModal
            openModal={openModal}
            onClose={() => setOpenModal(false)}
            action="images"
            productId={productId}
            imageId={imageId}
          />
          <Modal
            title={t("Image Translation Not Supported")}
            open={notTranslateModal}
            onCancel={() => setNotTranslateModal(false)}
            onOk={() => setNotTranslateModal(false)}
            centered
            okText={t("Got it")}
            cancelButtonProps={{ style: { display: "none" } }}
          >
            <Typography>
              <Paragraph>
                {t(
                  "If you need to add a new supported language, please contact the team support.",
                )}
              </Paragraph>
            </Typography>
          </Modal>
          <Modal
            title={t("Image Translation")}
            open={translatrImageactive}
            onCancel={onClose}
            footer={[
              <Space
                key="manage-translation-product-image-footer"
                direction="vertical"
                style={{ textAlign: "center" }}
              >
                <Button
                  key="translate"
                  type="primary"
                  onClick={handleTranslate}
                >
                  {t("Image Translation")}
                </Button>
                {/* <span>{t("1000 credits")}</span> */}
              </Space>,
            ]}
            centered
          >
            <div style={{ padding: "15px 0" }}>
              <Radio.Group
                block
                options={options}
                defaultValue="bassic"
                style={{ marginBottom: "10px" }}
              />
              <p style={{ marginBottom: "10px" }}>{t("Source Language")}</p>
              <Select
                style={{ width: "100%", marginBottom: "20px" }}
                value={sourceLanguage}
                onChange={setSourceLanguage}
                options={sourceLanguages}
              />
              <span>{t("Target Language")}</span>
              <Select
                style={{ width: "100%", marginTop: "10px" }}
                value={targetLanguage}
                onChange={setTargetLanguage}
                options={targetLanguages}
              />
            </div>
          </Modal>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default ImageAltTextPage;
