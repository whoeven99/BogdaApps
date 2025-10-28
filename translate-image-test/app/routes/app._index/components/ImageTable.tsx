import { useEffect, useRef, useState } from "react";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import {
  Page,
  Layout,
  InlineStack,
  Pagination,
  Icon,
  Select,
  Spinner,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import {
  ArrowLeftIcon,
  NoteIcon,
  SortIcon,
  ImageIcon,
} from "@shopify/polaris-icons";
import { UploadOutlined, SearchOutlined } from "@ant-design/icons";
import { authenticate } from "~/shopify.server";
import {
  Table,
  Checkbox,
  Image,
  Affix,
  Typography,
  Skeleton,
  Button,
  Tabs,
  Tag,
  Space,
  Modal,
  Row,
  Col,
  Input,
  Upload,
  Flex,
  Card,
  Select as SelectAnt,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useTranslation } from "react-i18next";
import { useNavigate, useFetcher, useLoaderData } from "@remix-run/react";
import { globalStore } from "~/globalStore";
import {
  DeleteProductImageData,
  GetProductImageData,
  TranslateImage,
} from "~/api/JavaServer";
import SortPopover from "~/routes/app.management/conponents/SortPopover";
const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { Search } = Input;
interface ImageItem {
  id: string;
  src: string;
  section: string;
}

export default function Index() {
  //   const { searchTerm } = useLoaderData<typeof loader>();
  //   console.log("searchTerm: ", searchTerm);

  // const fetcher = useFetcher<typeof action>();
  const initStoreDataFetcher = useFetcher<any>();
  const loadFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [images, setImages] = useState<any>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [cursor, setCursor] = useState<{ start: any; end: any }>({
    start: "",
    end: "",
  });
  const [productsStartCursor, setProductsStartCursor] = useState("");
  const [productsEndCursor, setProductsEndCursor] = useState("");
  const [imageStartCursor, setImageStartCursor] = useState("");
  const [imageEndCursor, setImageEndCursor] = useState("");
  const [languageList, setLnguageList] = useState<any[]>([]);
  const [productImageData, setProductImageData] = useState<any>([]);

  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [selectedLocale, setSelectedLocale] = useState<any>("");
  const [tableDataLoading, setTableDataLoading] = useState(true);
  const [tableImageDataLoading, setTableImageDataLoading] = useState(true);
  const [menuData, setMenuData] = useState<any>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [dataResource, setDataResource] = useState<any>([]);
  const [productsHasNextPage, setProductsHasNextPage] = useState(false);
  const [productsHasPreviousPage, setProductsHasPreviousPage] = useState(false);
  const [imageHasNextPage, setImageHasNextPage] = useState(false);
  const [imageHasPreviousPage, setImageHasPreviousPage] = useState(false);
  const [currentTranslatingImage, serCurrentTranslatingImage] =
    useState<any>("");
  const translateImageFetcher = useFetcher<any>();
  const replaceTranslateImageFetcher = useFetcher<any>();
  const [translatrImageactive, setTranslatrImageactive] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState("ALL");
  const [searchText, setSearchText] = useState<string>("");
  const timeoutIdRef = useRef<any>(true);
  const sourceLanguages = [
    { label: "English", value: "en" },
    { label: "Chinese (Simplified)", value: "zh" },
    // 根据需要添加更多语言
  ];
  const [targetLanguages, setTargetLanguages] = useState<any[]>();
  const [sourceLanguage, setSourceLanguage] = useState("zh");
  const [targetLanguage, setTargetLanguage] = useState(selectedLanguage);
  const [sortKey, setSortKey] = useState("CREATED_AT");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
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
  const languageFullNames: { [key: string]: string } = {
    en: "English",
    zh: "Chinese (Simplified)",
    ru: "Russian",
    es: "Spanish",
    fr: "French",
    de: "German",
    it: "Italian",
    nl: "Dutch",
    pt: "Portuguese",
    vi: "Vietnamese",
    tr: "Turkish",
    ms: "Malay",
    "zh-tw": "Chinese (Traditional)",
    th: "Thai",
    pl: "Polish",
    id: "Indonesian",
    ja: "Japanese",
    ko: "Korean",
  };
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
  const panelColumns = [
    {
      // 不需要 dataIndex，用 render 直接取 item.node.title
      render: (_: any, record: any) => {
        const imageData = record.imageData.edges;
        return imageData.length > 0 ? (
          <Thumbnail
            source={imageData[0].node.url}
            size="small"
            alt={imageData[0].node.altText}
          />
        ) : (
          <Thumbnail source={ImageIcon} size="small" alt="Small document" />
        );
      },
    },
    {
      title: "产品",
      // 不需要 dataIndex，用 render 直接取 item.node.title
      maxWidth: 250, // ✅ 指定列宽（单位是像素）
      render: (_: any, record: any) => (
        <span
          style={{
            display: "inline-block",
            maxWidth: 320, // 给内部留点空隙
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          title={record?.label}
        >
          {record?.label || "未命名产品"}
        </span>
      ),
    },
    {
      title: "状态",
      render: (_: any, record: any) => {
        const status = record?.status;

        let color = "default";
        let label = "未知状态";

        switch (status) {
          case "ACTIVE":
            color = "green";
            label = "有效";
            break;
          case "DRAFT":
            color = "orange";
            label = "草稿";
            break;
          case "ARCHIVED":
            color = "gray";
            label = "已归档";
            break;
          default:
            color = "default";
            label = "未知";
            break;
        }

        return <Tag color={color}>{label}</Tag>;
      },
    },
    // {
    //   title: "图片翻译进度",
    //   render: (_: any, record: any) => {
    //     const total = record?.imageData?.edges?.length || 0;
    //     const translated = 0; // 这里可以用你的逻辑
    //     return `${translated} / ${total}`;
    //   },
    // },
    {
      title: "操作",
      render: (_: any, record: any) => (
        <Space>
          {/* <Button
            type="primary"
            onClick={() => {
              console.log(record);
              setSelectedKey(record.key || "");
              console.log(record.key);

              setCurrentProduct(record);
              setOpen(true);
              console.log("tableImageDataLoading: ", tableImageDataLoading);
            }}
          >
            翻译
          </Button> */}
          <Button onClick={() => handleView(record)}>查看</Button>
        </Space>
      ),
    },
  ];
  const columns = [
    {
      title: t("Default image"),
      key: "imageUrl",
      width: "40%",
      render: (_: any, record: any) => {
        return (
          <Flex vertical gap={20}>
            <Image
              src={record?.imageUrl}
              preview={false}
              width={"50%"}
              height={"auto"}
            />
            <Input value={record.altText} />
          </Flex>
        );
      },
    },
    {
      title: t("Translated image"),
      key: "targetImageUrl",
      width: "40%",
      render: (_: any, record: any) => {
        return record?.targetImageUrl ? (
          <Flex vertical gap={20}>
            <Image
              src={record?.targetImageUrl}
              preview={false}
              width={"50%"}
              height={"auto"}
            />
            <Input value={record.targetAltText} />
          </Flex>
        ) : (
          <>
            {record.imageId === currentTranslatingImage.imageId &&
            translateImageFetcher.state === "submitting" ? (
              <Spinner accessibilityLabel="Loading thumbnail" size="large" />
            ) : (
              <Thumbnail source={ImageIcon} size="large" alt="Small document" />
            )}
          </>
        );
      },
    },
    {
      title: t("Action"),
      key: "translate",
      width: "10%",
      render: (_: any, record: any) => {
        return (
          <Space direction="vertical">
            <Button
              loading={
                record.imageId === currentTranslatingImage.imageId &&
                translateImageFetcher.state === "submitting"
              }
              onClick={() => handleImageTranslate(record)}
            >
              {t("Translate")}
            </Button>
            <Upload
              disabled={translateImageFetcher.state === "submitting"}
              pastable={false}
              maxCount={1}
              accept="image/*"
              name="file"
              action={`${globalStore?.server}/picture/insertPictureToDbAndCloud`}
              beforeUpload={(file) => {
                const isImage = file.type.startsWith("image/");
                const isLt20M = file.size / 1024 / 1024 < 20;

                // 检查文件格式
                const supportedFormats = [
                  "image/jpeg",
                  "image/png",
                  "image/webp",
                  "image/heic",
                  "image/gif",
                ];
                const isSupportedFormat = supportedFormats.includes(file.type);

                if (!isImage) {
                  shopify.toast.show(t("Only images can be uploaded"));
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
                  shopify.toast.show(t("File must be less than 20MB"));
                  return false;
                }

                // 检查图片像素大小
                return new Promise((resolve) => {
                  const img = new window.Image();
                  img.onload = () => {
                    const pixelCount = img.width * img.height;
                    const maxPixels = 20000000; // 2000万像素

                    if (pixelCount > maxPixels) {
                      shopify.toast.show(
                        t("Image pixel size cannot exceed 20 million pixels"),
                      );
                      resolve(false);
                    } else {
                      resolve(true);
                    }
                  };
                  img.onerror = () => {
                    shopify.toast.show(t("Failed to read image dimensions"));
                    resolve(false);
                  };
                  img.src = URL.createObjectURL(file);
                });
              }}
              data={(file) => {
                return {
                  shopName: globalStore?.shop,
                  file: file,
                  userPicturesDoJson: JSON.stringify({
                    shopName: globalStore?.shop,
                    imageId: record?.productId,
                    imageBeforeUrl: record?.imageUrl,
                    altBeforeTranslation: "",
                    altAfterTranslation: "",
                    languageCode: selectedLanguage,
                  }),
                };
              }}
              onChange={(info) => {
                if (info.file.status !== "uploading") {
                }
                if (info.file.status === "done") {
                  setProductImageData(
                    productImageData.map((item: any) => {
                      if (
                        item.imageUrl ===
                        info.fileList[0].response.response?.imageBeforeUrl
                      ) {
                        return {
                          ...item,
                          targetImageUrl:
                            info.fileList[0].response.response.imageAfterUrl,
                        };
                      }
                      return item;
                    }),
                  );
                  if (info.fileList[0].response?.success) {
                    shopify.toast.show(
                      `${info.file.name} ${t("Upload Success")}`,
                    );
                  } else {
                    shopify.toast.show(
                      `${info.file.name} ${t("Upload Failed")}`,
                    );
                  }
                } else if (info.file.status === "error") {
                  shopify.toast.show(`${info.file.name} ${t("Upload Failed")}`);
                }
              }}
            >
              <Button icon={<UploadOutlined />}>{t("Click to Upload")}</Button>
            </Upload>
            <Button
              disabled={!record?.targetImageUrl}
              loading={isDeleteLoading}
              onClick={() => handleDelete(record?.productId, record?.imageUrl)}
            >
              {t("Delete")}
            </Button>
          </Space>
        );
      },
    },
  ];
  useEffect(() => {
    const mappedValues = languageMapping[sourceLanguage] || [];
    const filteredOptions = mappedValues.map((value: string) => ({
      label: languageFullNames[value] || value,
      value: value,
    }));
    // 自动切换 targetLanguage 为第一个可选项
    if (filteredOptions.length > 0) {
      // setTargetLanguage(filteredOptions[0].value);
    }
    // 重置目标语言选择
    setTargetLanguages(filteredOptions);
  }, [sourceLanguage]);
  useEffect(() => {
    // loadFetcher.submit(
    //   { loading: true, sortKey, reverse: sortOrder === "asc" ? false : true },
    //   { method: "POST", action: "/app/management" },
    // );
    const languageFormData = new FormData();
    languageFormData.append("languageLoading", JSON.stringify({}));
    languageFetcher.submit(languageFormData, {
      action: "/app/management",
      method: "POST",
    });
  }, []);
  useEffect(() => {
    if (loadFetcher.data) {
      setMenuData(loadFetcher.data.menuData);
      console.log(loadFetcher.data.menuData);
      console.log(loadFetcher.data.imageData);

      setDataResource(loadFetcher.data.imageData);
      setSelectedKey(loadFetcher.data.menuData[0]?.key || "");
      setProductsHasNextPage(loadFetcher.data.productHasNextPage);
      setProductsHasPreviousPage(loadFetcher.data.productHasPreviousPage);
      setProductsStartCursor(loadFetcher.data.productStartCursor);
      setProductsEndCursor(loadFetcher.data.productEndCursor);
      setTableDataLoading(false);
      setIsLoading(false);
    }
  }, [loadFetcher.data]);
  useEffect(() => {
    if (productsFetcher.data) {
      console.log(productsFetcher.data);

      setMenuData(productsFetcher.data.menuData);
      setDataResource(productsFetcher.data.imageData);
      setSelectedKey(productsFetcher.data.menuData[0]?.key || "");
      setProductsHasNextPage(productsFetcher.data.productHasNextPage);
      setProductsHasPreviousPage(productsFetcher.data.productHasPreviousPage);
      setProductsStartCursor(productsFetcher.data.productStartCursor);
      setProductsEndCursor(productsFetcher.data.productEndCursor);
      setTableDataLoading(false);
      setIsLoading(false);
    }
  }, [productsFetcher.data]);
  useEffect(() => {
    if (imageFetcher.data) {
      console.log("dsdqeqsa: ", imageFetcher.data);

      setProductImageData(imageFetcher.data.imageData);
    }
  }, [imageFetcher.data]);
  useEffect(() => {
    if (languageFetcher.data && languageFetcher.data.success) {
      setLnguageList(
        languageFetcher.data.response.map((lan: any) => {
          return { value: lan.locale, label: lan.name };
        }),
      );
      console.log(languageFetcher.data);
      // setSelectedLocale(languageFetcher.data.response[0].locale);

      //   if (!searchTerm) {
      //     setSelectedLanguage(languageFetcher.data.response[0].locale);
      //   }
    }
  }, [languageFetcher.data]);
  useEffect(() => {
    console.log("targetLanguage: ", targetLanguage);
  }, [targetLanguage]);
  useEffect(() => {
    if (selectedKey && dataResource.length > 0) {
      console.log("dataResource: ", dataResource);

      const data =
        dataResource.filter(
          (item: any) => item[0]?.productId === selectedKey,
        )[0] || [];

      const getTargetData = async () => {
        const targetData = await GetProductImageData({
          server: globalStore?.server || "",
          shopName: globalStore?.shop || "",
          productId: selectedKey,
          languageCode: selectedLanguage,
        });
        console.log("targetData: ", targetData);
        console.log("dataaqqqwewq: ", data);
        if (targetData?.success && targetData?.response?.length > 0) {
          setProductImageData(
            data.map((item: any) => {
              const index = targetData.response.findIndex(
                (image: any) => item.imageUrl === image?.imageBeforeUrl,
              );
              if (index !== -1) {
                return {
                  ...item,
                  targetImageUrl: targetData.response[index]?.imageAfterUrl,
                  targetAltText: targetData.response[index].altAfterTranslation,
                };
              }
              return item;
            }),
          );
          console.log("productImageData: ", productImageData);
        } else {
          setProductImageData(data);
        }
      };
      getTargetData();
      console.log("productImageData: ", productImageData);
      setIsLoading(false);
      setTableImageDataLoading(false);
    }
  }, [selectedKey, dataResource, selectedLanguage]);

  // 对产品进行排序
  useEffect(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    console.log("dasdasdsa发送请求");
    console.log(sortKey, sortOrder);

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            cursor: "",
            query: searchText,
            sortKey,
            reverse: sortOrder === "asc" ? false : true,
          }),
        },
        {
          method: "post",
          action: "/app/management",
        },
      );
    }, 500);
  }, [sortKey, sortOrder]);
  // useEffect(() => {
  //   if (selectedKey && dataResource.length > 0) {
  //     const data =
  //       dataResource.filter(
  //         (item: any) => item[0]?.productId === selectedKey,
  //       )[0] || [];
  //     async function getTargetData() {
  //       const targetData = await GetProductImageData({
  //         server: globalStore?.server || "",
  //         shopName: globalStore?.shop || "",
  //         productId: selectedKey,
  //         languageCode: selectedLanguage,
  //       });
  //       if (targetData?.success && targetData?.response?.length > 0) {
  //         setProductAltTextData(
  //           data.map((item: any) => {
  //             const index = targetData.response.findIndex(
  //               (image: any) => item.imageUrl === image.imageBeforeUrl,
  //             );
  //             if (index !== -1) {
  //               return {
  //                 ...item,
  //                 imageUrl:
  //                   targetData.response[index].imageAfterUrl || item.imageUrl,
  //                 targetAltText: targetData.response[index].altAfterTranslation,
  //               };
  //             }
  //             return item;
  //           }),
  //         );
  //       } else {
  //         setProductAltTextData(data);
  //       }
  //     }
  //     getTargetData();
  //     setIsLoading(false);
  //   }
  // }, [selectedKey, dataResource, selectedLanguage]);

  const handleChange = (value: string) => {
    setSelectedLocale(value);
    setSelectedLanguage(value);
    setTargetLanguage(value);
    console.log(`selected ${value}`);
    navigate(`/app/management?language=${value}`);
  };
  const onClose = () => {
    setTranslatrImageactive(false);
  };
  // 图片翻译
  const handleTranslate = async () => {
    translateImageFetcher.submit(
      {
        translateImage: JSON.stringify({
          sourceLanguage,
          targetLanguage,
          imageUrl: currentTranslatingImage.imageUrl,
          imageId: currentTranslatingImage?.productId,
        }),
      },
      { method: "post", action: "/app/management" },
    );
    setTranslatrImageactive(false);
  };
  useEffect(() => {
    if (translateImageFetcher.data) {
      console.log("sdasdada: ", translateImageFetcher.data);

      if (translateImageFetcher.data.success) {
        shopify.toast.show(t("Image translated successfully"));
        setProductImageData(
          productImageData.map((item: any) => {
            if (item.imageUrl === currentTranslatingImage.imageUrl) {
              return {
                ...item,
                targetImageUrl: translateImageFetcher.data.response,
              };
            }
            return item;
          }),
        );
        const replaceTranslateImage = {
          url: translateImageFetcher.data.response,
          userPicturesDoJson: {
            imageId: currentTranslatingImage?.productId,
            imageBeforeUrl: currentTranslatingImage?.imageUrl,
            altBeforeTranslation: "",
            altAfterTranslation: "",
            languageCode: selectedLanguage,
          },
        };
        const formData = new FormData();
        formData.append(
          "replaceTranslateImage",
          JSON.stringify(replaceTranslateImage),
        );
        replaceTranslateImageFetcher.submit(formData, {
          method: "post",
          action: "/app",
        });
      } else {
        shopify.toast.show(t("Image translation failed"));
      }
    }
  }, [translateImageFetcher.data]);
  const handlePreProductPage = () => {
    productsFetcher.submit(
      {
        productStartCursor: JSON.stringify({
          cursor: productsStartCursor,
          query: searchText,
          status: activeKey,
          sortKey,
          reverse: sortOrder === "asc" ? false : true,
        }),
      },
      {
        method: "post",
        action: "/app/management",
      },
    ); // 提交表单请求
  };
  const handleNextProductPage = () => {
    console.log("下一页产品");

    productsFetcher.submit(
      {
        productEndCursor: JSON.stringify({
          cursor: productsEndCursor,
          query: searchText,
          status: activeKey,
          sortKey,
          reverse: sortOrder === "asc" ? false : true,
        }),
      },
      {
        method: "post",
        action: "/app/management",
      },
    ); // 提交表单请求
  };
  const handleImagePrevious = () => {
    imageFetcher.submit(
      {
        imageStartCursor: JSON.stringify({
          imageStartCursor: productImageData[0]?.imageStartCursor,
          productId: selectedKey,
        }),
      },
      {
        method: "post",
        action: "/app/management",
      },
    );
  };

  const handleImageNext = () => {
    imageFetcher.submit(
      {
        imageEndCursor: JSON.stringify({
          imageEndCursor: productImageData[0]?.imageEndCursor,
          productId: selectedKey,
        }),
      },
      {
        method: "post",
        action: "/app/management",
      },
    );
  };
  const handleImageTranslate = (record: any) => {
    console.log(record);

    let mappedLanguage =
      selectedLanguage === "zh-CN"
        ? "zh"
        : selectedLanguage === "zh-TW"
          ? "zh-tw"
          : selectedLanguage;
    if (selectedLanguage === "pt-BR" || selectedLanguage === "pt-PT") {
      mappedLanguage = "pt";
    }
    if (
      !languageMapping["en"].includes(mappedLanguage) &&
      !languageMapping["zh"].includes(mappedLanguage)
    ) {
      shopify.toast.show(
        t("The current language does not support image translation"),
      );
      return;
    }
    setTranslatrImageactive(true);
    serCurrentTranslatingImage(record);
  };

  const handleDelete = async (productId: string, imageUrl: string) => {
    setIsDeleteLoading(true);
    const res = await DeleteProductImageData({
      server: globalStore?.server || "",
      shopName: globalStore?.shop || "",
      productId: productId,
      imageUrl: imageUrl,
      languageCode: selectedLanguage,
    });

    console.log("res", res);

    if (res.success) {
      setDataResource(
        dataResource.map((item: any) => {
          return item.map((image: any) => {
            if (image.imageId === productId) {
              image.targetImageUrl = "";
            }
            return image;
          });
        }),
      );
      shopify.toast.show(t("Delete Success"));
    } else {
      shopify.toast.show(t("Delete Failed"));
    }
    setIsDeleteLoading(false);
  };

  function handleView(record: any): void {
    console.log("Viewing record:", record);
    const productId = record.key.split('/').pop();
    console.log('productId:', productId);
    
    navigate(`/app/products/${productId}`);
  }

  const handleNavigate = () => {
    navigate("/app");
  };
  const handleSearch = (value: string) => {
    setSearchText(value);

    // 清除上一次的定时器
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            cursor: "",
            query: value,
            sortKey,
            reverse: sortOrder === "asc" ? false : true,
          }),
        },
        {
          method: "post",
          action: "/app/management",
        },
      );
    }, 500);
  };
  const handleChangeStatusTab = (key: string) => {
    setActiveKey(key);
    console.log(key);
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            cursor: "",
            query: "",
            status: key,
            sortKey,
            reverse: sortOrder === "asc" ? false : true,
          }),
        },
        {
          method: "post",
          action: "/app/management",
        },
      );
    }, 500);
  };
  return (
    <Layout>
      <Layout.Section>
        <div>
          {/* 顶部 Tabs */}
          <Card styles={{ body: { padding: "12px 24px" } }}>
            <Flex align="center" justify="space-between">
              <Tabs
                activeKey={activeKey}
                onChange={(key) => handleChangeStatusTab(key)}
                defaultActiveKey="all"
                type="line"
                style={{ width: "30%" }}
                items={[
                  { label: "All", key: "ALL" },
                  {
                    label: "Active",
                    key: "ACTIVE",
                  },
                  {
                    label: "Draft",
                    key: "DRAFT",
                  },
                  {
                    label: "Archived",
                    key: "ARCHIVED",
                  },
                ]}
              />

              <Flex align="center" justify="center" gap={20}>
                <Input
                  placeholder="搜索..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  prefix={<SearchOutlined />}
                />
                {/* <Button>
                    <Icon source={SortIcon} tone="base" />
                  </Button> */}
                <SortPopover
                  onChange={(key, order) => {
                    console.log(key, order);

                    setSortKey(key);
                    setSortOrder(order);
                  }}
                />
              </Flex>
            </Flex>
            {/* 搜索和排序行 */}
          </Card>

          {/* 产品表格 */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              // height: "calc(100vh)", // 根据页面结构调整
              background: "#fff",
            }}
          >
            {/* 表格主体区域（可滚动） */}
            <div style={{ flex: 1, overflow: "auto" }}>
              <Table
                dataSource={menuData}
                columns={panelColumns}
                pagination={false}
                rowKey={(record) => record.key} // ✅ 建议加上 key，避免警告
                loading={tableDataLoading}
              />
            </div>

            {/* 分页条固定在底部 */}
            <div
              style={{
                borderTop: "1px solid #f0f0f0",
                padding: "8px 0",
                background: "#fff",
                position: "sticky",
                bottom: 0,
                zIndex: 10,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pagination
                hasPrevious={productsHasPreviousPage}
                onPrevious={handlePreProductPage}
                hasNext={productsHasNextPage}
                onNext={handleNextProductPage}
              />
            </div>
          </div>
          {/* <Table
              dataSource={menuData}
              columns={panelColumns}
              pagination={false}
              rowSelection={{}}
            />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Pagination
                hasPrevious={productsHasPreviousPage}
                onPrevious={handlePreProductPage}
                hasNext={productsHasNextPage}
                onNext={handleNextProductPage}
              />
            </div> */}

          {/* 翻译弹窗 */}
          <Modal
            title={currentProduct?.title || "图片翻译"}
            open={open}
            onCancel={() => {
              setOpen(false);
              setSelectedKey("");
              setProductImageData([]);
              setTableImageDataLoading(false);
            }}
            footer={null}
            width={1000}
          >
            <Table
              columns={columns}
              dataSource={productImageData}
              pagination={false}
              rowKey={(record) => record.key} // ✅ 建议加上 key，避免警告
              loading={tableImageDataLoading}
            />
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Pagination
                hasPrevious={imageHasPreviousPage}
                onPrevious={handleImagePrevious}
                hasNext={imageHasNextPage}
                onNext={handleImageNext}
              />
            </div>
          </Modal>
        </div>
      </Layout.Section>
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
            <Button key="translate" type="primary" onClick={handleTranslate}>
              {t("Image Translation")}
            </Button>
            <span>{t("1000 credits")}</span>
          </Space>
        ]}
        centered
      >
        <div style={{ padding: "15px 0" }}>
          <p style={{ marginBottom: "10px" }}>{t("Source Language")}</p>
          <SelectAnt
            style={{ width: "100%", marginBottom: "20px" }}
            value={sourceLanguage}
            onChange={setSourceLanguage}
            options={sourceLanguages}
          />
          <span>{t("Target Language")}</span>
          <SelectAnt
            style={{ width: "100%", marginTop: "10px" }}
            value={targetLanguage}
            onChange={setTargetLanguage}
            options={targetLanguages}
          />
        </div>
      </Modal>
    </Layout>
  );
}
