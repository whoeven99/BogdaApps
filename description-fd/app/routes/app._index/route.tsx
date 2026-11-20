import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link, useFetcher, useLoaderData, useLocation } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  InlineStack,
  Grid,
  Select,
  Autocomplete,
  Icon,
  TextField,
  ButtonGroup,
  Box,
  IconProps,
  ThumbnailProps,
  AvatarProps,
  Thumbnail,
  SkeletonBodyText,
  Divider,
  Tag,
} from "@shopify/polaris";
import { SearchIcon, MagicIcon, DeleteIcon } from "@shopify/polaris-icons";
import styles from "../styles/styles.module.css";
import { authenticate } from "app/shopify.server";
import {
  DEFAULT_DESCRIPTION_AI_MODEL,
  DESCRIPTION_AI_MODEL_OPTIONS,
} from "app/lib/descriptionAiModels";
import { GetTemplateByShopName } from "app/api/JavaServer";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import Tiptap from "app/components/richTextInput/richTextInput";
import { useEditor } from "@tiptap/react";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableRow } from "@tiptap/extension-table-row";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { LocalImage } from "app/components/richTextInput/extensions/imageNode";
import { Table } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Video } from "app/components/richTextInput/extensions/VideoNode";
import Highlight from "@tiptap/extension-highlight";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { session, admin } = adminAuthResult;
  try {
    return {
      shop: session?.shop,
      server: "",
    };
  } catch (error) {
    console.error(error);
    return {
      shop: "",
      server: "",
    };
  }
};

const Index = () => {
  const { server, shop } = useLoaderData<typeof loader>();
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight,
      LocalImage,
      Table.configure({
        resizable: true, // 允许拖动调整列宽
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ["heading", "paragraph"], // 指定允许设置对齐的节点类型
      }),
      Video,
      // Underline
    ], // define your extension array
    content: "", // initial content
    immediatelyRender: false, // 🔹 SSR 环境下必须加这个
  });

  const location = useLocation();
  // const [userCost, setUserCost] = useState<any>({
  //   allCounter: 0,
  //   productCounter: 0,
  //   productSeoCounter: 0,
  //   collectionCounter: 0,
  //   collectionSeoCounter: 0,
  //   extraCounter: 0,
  // });

  const [shopOwnerName, setShopOwnerName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [pageType, setPageType] = useState<"product" | "collection">("product");
  const [contentType, setContentType] = useState<"description" | "seo">(
    "description",
  );
  const [textValue, setTextValue] = useState<string>("");
  const [brandStyle, setBrandStyle] = useState<string>("");
  const [languageStyle, setLanguageStyle] = useState<string>("formal");
  const [template, setTemplate] = useState<string>("");
  const [model, setModel] = useState<string>(DEFAULT_DESCRIPTION_AI_MODEL);
  const [focusSeoKeywordInput, setFocusSeoKeywordInput] =
    useState<boolean>(false);
  const [seoKeywords, setSeoKeywords] = useState<string>("");
  const [seoKeywordTags, setSeoKeywordTags] = useState<string[]>([]);
  const [brand, setBrand] = useState<string>("");
  const [brandSlogan, setBrandSlogan] = useState<string>("");
  const [additionalInformation, setAdditionalInformation] =
    useState<string>("");
  const [language, setLanguage] = useState<string>("English");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [selectedProductItem, setSelectedProductItem] = useState<
    React.ReactNode | any
  >(null);
  const [options, setOptions] = useState<
    {
      id: string;
      label: string;
      value: string;
      media?: React.ReactElement<IconProps | ThumbnailProps | AvatarProps>;
    }[]
  >([]);
  const [willLoadMoreResults, setWillLoadMoreResults] = useState(true);
  const [endCursor, setEndCursor] = useState(null);
  const [autoCompleteLoading, setAutoCompleteLoading] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modelPopoverActive, setModelPopoverActive] = useState(false);
  const [open, setOpen] = useState(false);
  const [seoKeywordError, setSeoKeywordError] = useState("");
  const [productError, setProductError] = useState("");
  const [originalDescription, setOriginalDescription] = useState<any>(null);
  const [originalData, setOriginalData] = useState<any>(null);
  const [editedData, setEditedData] = useState<any>(null);
  const [generatedTitle, setGeneratedTitle] = useState<string>("");
  const [templates, setTemplates] = useState<any>([]);
  const [currentTipIndex, setCurrentTipIndex] = useState<number>(0);

  const tipIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstLoad = useRef(true);

  // 当editedData更新时，同步更新editor内容
  // useEffect(() => {
  //   if (editor && editedData?.description) {
  //     editor.commands.setContent(editedData.description);
  //   }
  // }, [editor, editedData?.description]);

  // // 监听editor内容变化
  // useEffect(() => {
  //   if (editor) {
  //     editor.on('update', ({ editor }) => {
  //       const html = editor.getHTML();
  //       if (editedData) {
  //         setEditedData({
  //           ...editedData,
  //           description: html,
  //         });
  //       }
  //     });
  //   }
  // }, [editor, editedData]);

  // const filterTemplates = useMemo(() => {
  //   if (!templates) return [];
  //   const allTemplates = Object.values(templates).reduce(
  //     (acc: any[], curr: any) => {
  //       // 2. 获取当前 contentType 的模板
  //       const templatesByContentType = curr[contentType] || [];
  //       // 3. 筛选出 type 匹配 pageType 的模板
  //       const filteredTemplates = templatesByContentType.filter(
  //         (template: any) => template.type === pageType,
  //       );
  //       // 4. 合并到结果数组
  //       return [...acc, ...filteredTemplates];
  //     },
  //     [] as any[],
  //   );

  //   return allTemplates;
  // }, [pageType, contentType, templates]);

  const tipTexts = useMemo(
    () => [
      "Generated content will appear here",
      "Each product takes about 10-20 seconds to create...",
      "Syncing outline to AI model",
      "AI big models are returning content",
    ],
    [],
  );

  const brandStyleOptions = useMemo(
    () => [
      {
        label: "",
        value: "",
      },
      {
        label: "Apple – Minimal & premium",
        value: "apple",
      },
      {
        label: "Samsung – Innovative & versatile",
        value: "samsung",
      },
      {
        label: "Nike – Bold & empowering",
        value: "nike",
      },
      {
        label: "Adidas – Dynamic & inclusive",
        value: "adidas",
      },
      {
        label: "Patagonia – Ethical & adventurous",
        value: "patagonia",
      },
      {
        label: "Zara – Modern & chic",
        value: "zara",
      },
      {
        label: "H&M – Trendy & casual",
        value: "hm",
      },
      {
        label: "Dior – Feminine & luxurious",
        value: "dior",
      },
      {
        label: "Uniqlo – Simple & comfortable",
        value: "uniqlo_simple",
      },
      {
        label: "Uniqlo – Clean & functional",
        value: "uniqlo_functional",
      },
      {
        label: "Ralph Lauren – Timeless & masculine",
        value: "ralph_lauren",
      },
      {
        label: "Tommy Hilfiger – Classic & youthful",
        value: "tommy",
      },
      {
        label: "Tiffany – Elegant & romantic",
        value: "tiffany",
      },
      {
        label: "Cartier – Luxurious & timeless",
        value: "cartier",
      },
      {
        label: "Swarovski – Sparkling & accessible",
        value: "swarovski",
      },
      {
        label: "L'Oréal – Confident & universal",
        value: "loreal",
      },
      {
        label: "Estée Lauder – Elegant & premium",
        value: "estee_lauder",
      },
      {
        label: "Fenty Beauty – Bold & inclusive",
        value: "fenty",
      },
      {
        label: "Pampers – Caring & reassuring",
        value: "pampers",
      },
      {
        label: "Mustela – Gentle & safe",
        value: "mustela",
      },
      {
        label: "IKEA – Practical & family-friendly",
        value: "ikea",
      },
      {
        label: "Dyson – Innovative & sleek",
        value: "dyson",
      },
      {
        label: "Philips – Smart & reliable",
        value: "philips",
      },
      {
        label: "Royal Canin – Scientific & premium",
        value: "royal_canin",
      },
      {
        label: "Pedigree – Friendly & caring",
        value: "pedigree",
      },
      {
        label: "Unilever – Mass-market & trusted",
        value: "unilever",
      },
      {
        label: "P&G – Reliable & practical",
        value: "pg",
      },
      {
        label: "Starbucks – Warm & lifestyle-driven",
        value: "starbucks",
      },
      {
        label: "Red Bull – Energetic & bold",
        value: "red_bull",
      },
      {
        label: "Nestlé – Family-oriented & global",
        value: "nestle",
      },
      {
        label: "Centrum – Scientific & trustworthy",
        value: "centrum",
      },
    ],
    [],
  );

  const languageStyleOptions = useMemo(
    () => [
      {
        label: "Formal",
        value: "formal",
      },
      {
        label: "Neutral",
        value: "neutral",
      },
      {
        label: "Youthful",
        value: "youthful",
      },
      {
        label: "Luxury",
        value: "luxury",
      },
      {
        label: "Playful",
        value: "playful",
      },
      {
        label: "Inspirational",
        value: "inspirational",
      },
      {
        label: "Edgy",
        value: "edgy",
      },
      {
        label: "Minimalist",
        value: "minimalist",
      },
      {
        label: "Eco-conscious",
        value: "eco_conscious",
      },
      {
        label: "Premium-Tech",
        value: "premium_tech",
      },
    ],
    [],
  );

  const modelSelectionOptions = DESCRIPTION_AI_MODEL_OPTIONS;

  const seoKeywordTagsMarkup = useMemo(() => {
    return seoKeywordTags.length > 0 ? (
      <InlineStack gap="200">
        {seoKeywordTags.map((tag) => (
          <Tag
            key={tag}
            onRemove={() =>
              setSeoKeywordTags(seoKeywordTags.filter((t) => t !== tag))
            }
          >
            {tag}
          </Tag>
        ))}
      </InlineStack>
    ) : null;
  }, [seoKeywordTags]);

  const fetcher = useFetcher<any>();
  const productInfoFetcher = useFetcher<any>();
  const shopOwnerNameFetcher = useFetcher<any>();
  const publishFetcher = useFetcher<any>();
  const originalDescriptionFetcher = useFetcher<any>();
  const generateFetcher = useFetcher<any>();
  const templateOptions = (
    Array.isArray(templates) && templates.length > 0
      ? templates
      : [{ id: 0, templateTitle: "Default structure" }]
  ).map((item: any, index: number) => ({
    key: index.toString(),
    label: item.templateTitle,
    value: String(item.id),
  }));

  useEffect(() => {
    const shopOwnerName = localStorage.getItem("shopOwnerName");
    if (shopOwnerName) {
      setShopOwnerName(shopOwnerName);
    } else {
      shopOwnerNameFetcher.submit(
        {},
        { method: "POST", action: "/getShopOwnerName" },
      );
    }
    // setLoading(false);
  }, []);

  // 添加清理定时器的useEffect
  useEffect(() => {
    return () => {
      if (tipIntervalRef.current) {
        clearInterval(tipIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && seoKeywords && focusSeoKeywordInput) {
        if (seoKeywordTags.includes(seoKeywords)) {
          shopify.toast.show(`SEO Keyword ${seoKeywords} already exists`);
          return;
        }
        if (seoKeywordTags.length >= 3) {
          shopify.toast.show("You can only add up to 3 SEO keywords");
          return;
        }
        setSeoKeywordTags((prev) => [...prev, seoKeywords]);
        setSeoKeywords("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // 清除上一个监听
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [seoKeywords, focusSeoKeywordInput]);

  useEffect(() => {
    if (location.state?.productId) {
      setSelectedOptions([location.state?.productId]);
      productInfoFetcher.submit(
        { productId: location.state?.productId },
        { method: "POST", action: "/getProductInfoById" },
      );
    }
  }, [location.state]);

  useEffect(() => {
    if (pageType === "product") {
      setOptions([]);
      setAutoCompleteLoading(true);
      if (isFirstLoad.current) {
        fetcher.submit(
          { query: textValue, pageSize: 20 },
          { method: "POST", action: "/getProductInfo" },
        );
        isFirstLoad.current = false;
      }
    } else {
      setOptions([]);
      setAutoCompleteLoading(true);
      if (isFirstLoad.current) {
        fetcher.submit(
          { query: textValue, pageSize: 20 },
          { method: "POST", action: "/getCollectionInfo" },
        );
        isFirstLoad.current = false;
      }
    }
  }, [pageType, textValue]);

  useEffect(() => {
    setTemplate("");
    setTemplates([]);
    const fetchTemplates = async () => {
      const response = await GetTemplateByShopName({
        server: server as string,
        shop: shop as string,
        pageType: pageType,
        contentType: contentType,
      });
      const list = Array.isArray(response) ? response : [];
      setTemplates(list);
      setTemplate(list[0] ? String(list[0].id) : "0");
    };
    fetchTemplates();
  }, [pageType, contentType]);

  useEffect(() => {
    if (shopOwnerNameFetcher.data) {
      setShopOwnerName(shopOwnerNameFetcher.data.shopOwnerName);
      localStorage.setItem(
        "shopOwnerName",
        shopOwnerNameFetcher.data.shopOwnerName,
      );
    }
  }, [shopOwnerNameFetcher.data]);

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        setAutoCompleteLoading(false);
        setOptions((prev) => [
          ...prev,
          ...(fetcher.data!.response?.data ?? []).map((item: any) => ({
            id: item.id,
            label: item.title,
            value: item.id,
            media: (
              <Thumbnail
                source={item.image || "/img_default-min.webp"}
                alt={item.title}
                size="small"
              />
            ),
          })),
        ]);
        setWillLoadMoreResults(fetcher.data!.response.hasNextPage);
        setEndCursor(fetcher.data!.response.endCursor);
      }
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (productInfoFetcher.data) {
      if (productInfoFetcher.data.success) {
        const selectedProduct = {
          id: productInfoFetcher.data.response.id,
          label: productInfoFetcher.data.response.title,
          value: productInfoFetcher.data.response.id,
          media: (
            <Thumbnail
              source={
                productInfoFetcher.data.response.media.edges[0]?.node?.preview
                  ?.image?.url
              }
              alt={productInfoFetcher.data.response.title}
            />
          ),
        };
        setSelectedProductItem(
          <Box
            padding="400"
            background="bg-surface-secondary"
            borderRadius="200"
          >
            <InlineStack
              gap="400"
              align="space-between"
              blockAlign="center"
              direction="row"
              wrap={false}
            >
              <InlineStack
                gap="400"
                align="center"
                blockAlign="center"
                direction="row"
                wrap={false}
              >
                {/* <Icon source={SearchIcon} tone="base" /> */}
                {selectedProduct?.media}
                <Text as="p" variant="bodyMd">
                  {selectedProduct?.label}
                </Text>
              </InlineStack>
              <Button
                icon={DeleteIcon}
                variant="tertiary"
                onClick={() => {
                  setSelectedOptions([]);
                  setSelectedProductItem(null);
                }}
              />
            </InlineStack>
          </Box>,
        );
      } else {
        shopify.toast.show("Failed to get product info");
      }
    }
  }, [productInfoFetcher.data]);

  useEffect(() => {
    if (publishFetcher.data) {
      if (publishFetcher.data.success) {
        shopify.toast.show("Description published successfully");
      } else {
        shopify.toast.show(publishFetcher.data.errorMessage || "Failed to publish");
      }
    }
  }, [publishFetcher.data]);

  useEffect(() => {
    if (!generateFetcher.data) return;
    setIsGenerating(false);
    stopTipTimer();
    if (generateFetcher.data.success && generateFetcher.data.response) {
      const payload = generateFetcher.data.response;
      setEditedData(payload);
      setGeneratedTitle(payload.title || "");
      editor?.commands.setContent(payload.description || "");
      setOriginalData(payload);
    } else {
      shopify.toast.show(generateFetcher.data.errorMessage || "Failed to generate description");
    }
  }, [generateFetcher.data]);

  useEffect(() => {
    if (originalDescriptionFetcher.data) {
      if (originalDescriptionFetcher.data.success) {
        setOriginalDescription(
          originalDescriptionFetcher.data.response?.descriptionHtml,
        );
      } else {
        shopify.toast.show("Failed to get original description");
      }
    }
  }, [originalDescriptionFetcher.data]);

  const updateSelection = useCallback(
    (selected: string[]) => {
      if (selected.length === 0) {
        setProductError(
          `${pageType === "product" ? "Product" : "Collection"} is required`,
        );
      } else {
        setProductError("");
      }
      setSelectedOptions(selected);
      const selectedProduct = options.find(
        (option: {
          id: string;
          label: string;
          value: string;
          media?: React.ReactElement<IconProps | ThumbnailProps | AvatarProps>;
        }) => {
          return selected.includes(option.value);
        },
      );
      if (selectedProduct) {
        setSelectedProductItem(
          <Box
            padding="400"
            background="bg-surface-secondary"
            borderRadius="200"
          >
            <InlineStack
              gap="400"
              align="space-between"
              blockAlign="center"
              direction="row"
              wrap={false}
            >
              <InlineStack
                gap="400"
                align="center"
                blockAlign="center"
                direction="row"
                wrap={false}
              >
                {/* <Icon source={SearchIcon} tone="base" /> */}
                {selectedProduct?.media}
                <Text as="p" variant="bodyMd">
                  {selectedProduct?.label}
                </Text>
              </InlineStack>
              <Button
                icon={DeleteIcon}
                variant="tertiary"
                onClick={() => {
                  setSelectedOptions([]);
                  setSelectedProductItem(null);
                }}
              />
            </InlineStack>
          </Box>,
        );
      } else {
        setSelectedProductItem(null);
      }
    },
    [options],
  );

  const handleLoadMoreResults = useCallback(() => {
    if (willLoadMoreResults && endCursor) {
      setAutoCompleteLoading(true);
      if (pageType === "product") {
        setTimeout(() => {
          fetcher.submit(
            {
              endCursor: endCursor,
              query: textValue,
              pageSize: 20,
            },
            { method: "POST", action: "/getProductInfo" },
          );
        }, 1000);
      } else {
        setTimeout(() => {
          fetcher.submit(
            {
              endCursor: endCursor,
              query: textValue,
              pageSize: 20,
            },
            { method: "POST", action: "/getCollectionInfo" },
          );
        }, 1000);
      }
    }
  }, [willLoadMoreResults, endCursor, options.length]);

  const handleModelChange = useCallback((value: string) => {
    setModel(value);
    setModelPopoverActive(false);
  }, []);

  const handlePublish = useCallback(() => {
    publishFetcher.submit(
      {
        id: selectedOptions[0],
        pageType: editedData.pageType,
        contentType: editedData.contentType,
        title: generatedTitle,
        description:
          contentType === "seo"
            ? removeHtmlTags(editor?.getHTML() || "")
            : editor?.getHTML() || "",
      },
      { method: "POST", action: "/descriptionPublish" },
    );
  }, [selectedOptions, editedData, generatedTitle, contentType, editor]);

  const handleEdit = useCallback(() => {
    setIsEdit(true);
  }, []);

  const handleConfirm = useCallback(() => {
    setIsEdit(false);
  }, []);

  const handleCancel = useCallback(() => {
    setEditedData(originalData);
    setIsEdit(false);
  }, []);

  const handleTemplateChange = useCallback((value: string) => {
    setTemplate(value);
  }, []);

  const handleGenerate = async () => {
    setIsEdit(false);
    setEditedData(null);
    setOriginalData(null);
    setGeneratedTitle("");
    let errors = false;
    if (selectedOptions.length === 0) {
      setProductError(
        `${pageType === "product" ? "Product" : "Collection"} is required`,
      );
      errors = true;
    } else {
      setProductError("");
    }
    if (errors) {
      return;
    }
    setIsGenerating(true);
    startTipTimer();

    originalDescriptionFetcher.submit(
      {
        productId: selectedOptions[0],
        pageType,
      },
      { method: "POST", action: "/getProductInfoById" },
    );

    generateFetcher.submit(
      {
        productId: selectedOptions[0],
        pageType,
        contentType,
        languageStyle,
        brandStyle,
        language,
        seoKeywords: seoKeywordTags.join(","),
        brandWord: brand || "",
        brandSlogan: brandSlogan || "",
        additionalInformation: additionalInformation || "",
        model,
      },
      { method: "POST", action: "/aiGenerateDescription" },
    );
  };

  const startTipTimer = useCallback(() => {
    setCurrentTipIndex(0);
    tipIntervalRef.current = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tipTexts.length);
    }, 2000);
  }, [tipTexts.length]);

  const stopTipTimer = useCallback(() => {
    if (tipIntervalRef.current) {
      clearInterval(tipIntervalRef.current);
      tipIntervalRef.current = null;
    }
    setCurrentTipIndex(0);
  }, []);

  return (
    <Page
      title={`Hi ${shopOwnerName}!`}
      subtitle="Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible."
      compactTitle
    >
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4 }}>
                    <BlockStack gap="400">
                      <InlineStack gap="100">
                        {/* <Box>
                          <Icon source={MagicIcon} tone="base" />
                        </Box> */}
                        <Text as="p" variant="headingMd">
                          Select Content
                        </Text>
                      </InlineStack>
                      <Select
                        label="Page type"
                        options={[
                          { label: "Product", value: "product" },
                          { label: "Collection", value: "collection" },
                        ]}
                        value={pageType}
                        onChange={(value) => {
                          setPageType(value as "product" | "collection");
                          setSelectedOptions([]);
                          setSelectedProductItem(null);
                          setTextValue("");
                          isFirstLoad.current = true;
                        }}
                      />
                      <Select
                        label="Content type"
                        options={[
                          { label: "Description", value: "description" },
                          {
                            label: "SEO description",
                            value: "seo",
                          },
                        ]}
                        value={contentType}
                        onChange={(value) =>
                          setContentType(value as "description" | "seo")
                        }
                      />
                      {selectedProductItem ? (
                        selectedProductItem
                      ) : (
                        <Autocomplete
                          options={options}
                          selected={selectedOptions}
                          onSelect={updateSelection}
                          loading={autoCompleteLoading}
                          onLoadMoreResults={handleLoadMoreResults}
                          willLoadMoreResults={willLoadMoreResults}
                          textField={
                            <Autocomplete.TextField
                              label={
                                pageType === "product"
                                  ? "Product"
                                  : "Collection"
                              }
                              prefix={<Icon source={SearchIcon} tone="base" />}
                              placeholder={
                                pageType === "product"
                                  ? "Search Product"
                                  : "Search Collection"
                              }
                              autoComplete="off"
                              error={productError}
                              value={textValue}
                              onChange={(value) => {
                                setTextValue(value);
                                isFirstLoad.current = true;
                              }}
                            />
                          }
                        />
                      )}
                      <Divider borderColor="border" />
                      <BlockStack gap="200">
                        <Text variant="headingMd" as="p">
                          AI Generation Settings
                        </Text>
                        <Select
                          label="Language style"
                          options={languageStyleOptions}
                          value={languageStyle}
                          onChange={(value) => setLanguageStyle(value)}
                        />
                        <Select
                          label="Brand style"
                          options={brandStyleOptions}
                          value={brandStyle}
                          onChange={(value) => setBrandStyle(value)}
                        />
                        <Select
                          label="Template"
                          options={templateOptions}
                          value={template || "0"}
                          onChange={(value) => handleTemplateChange(value)}
                        />
                        <Select
                          label="Model selection"
                          options={modelSelectionOptions}
                          value={model}
                          onChange={(value) => setModel(value)}
                        />
                      </BlockStack>
                      <Divider borderColor="border" />
                      <Text variant="headingMd" as="p">
                        SEO Keywords
                      </Text>
                      <TextField
                        label=""
                        value={seoKeywords}
                        placeholder="Click the 'Enter' to add SEO keywords"
                        disabled={seoKeywordTags.length >= 3}
                        onChange={(value) => {
                          setSeoKeywords(value);
                        }}
                        autoComplete="off"
                        verticalContent={seoKeywordTagsMarkup}
                        onFocus={() => setFocusSeoKeywordInput(true)}
                        onBlur={() => setFocusSeoKeywordInput(false)}
                      />
                      <Divider borderColor="border" />
                      <BlockStack gap="200">
                        <Text variant="headingMd" as="p">
                          Brand Settings
                        </Text>
                        <TextField
                          label="Brand word"
                          value={brand}
                          maxLength={20}
                          onChange={(value) => setBrand(value)}
                          autoComplete="off"
                        />
                        <TextField
                          label="Brand Slogan"
                          value={brandSlogan}
                          maxLength={100}
                          onChange={(value) => {
                            setBrandSlogan(value);
                          }}
                          autoComplete="off"
                        />
                      </BlockStack>
                      <Divider borderColor="border" />
                      <Text variant="headingMd" as="p">
                        Language
                      </Text>
                      {/*<TextField
                        label="Additional information"
                        value={additionalInformation}
                        placeholder="Add unique product details, specifications, key selling points, etc"
                        onChange={(value) => setAdditionalInformation(value)}
                        multiline={4}
                        autoComplete="off"
                      /> */}
                      <Select
                        label=""
                        options={[
                          {
                            label: "English (United States)",
                            value: "English (United States)",
                          },
                          {
                            label: "English (United Kingdom)",
                            value: "English (United Kingdom)",
                          },
                          {
                            label: "Spanish (Mexico)",
                            value: "Spanish (Mexico)",
                          },
                          {
                            label: "Spanish (Spain)",
                            value: "Spanish (Spain)",
                          },
                          {
                            label: "Chinese (Simplified - Mainland China)",
                            value: "Chinese (Simplified - Mainland China)",
                          },
                          {
                            label: "Chinese (Traditional - Taiwan)",
                            value: "Chinese (Traditional - Taiwan)",
                          },
                          {
                            label: "Hindi (India)",
                            value: "Hindi (India)",
                          },
                          {
                            label: "Portuguese (Brazil)",
                            value: "Portuguese (Brazil)",
                          },
                          {
                            label: "Portuguese (Portugal)",
                            value: "Portuguese (Portugal)",
                          },
                          {
                            label: "French (France)",
                            value: "French (France)",
                          },
                          {
                            label: "French (Canada)",
                            value: "French (Canada)",
                          },
                          {
                            label: "German (Germany)",
                            value: "German (Germany)",
                          },
                          {
                            label: "Russian (Russia)",
                            value: "Russian (Russia)",
                          },
                          {
                            label: "Japanese (Japan)",
                            value: "Japanese (Japan)",
                          },
                          {
                            label: "Korean (South Korea)",
                            value: "Korean (South Korea)",
                          },
                          {
                            label: "Indonesian (Indonesia)",
                            value: "Indonesian (Indonesia)",
                          },
                          {
                            label: "Vietnamese (Vietnam)",
                            value: "Vietnamese (Vietnam)",
                          },
                          {
                            label: "Thai (Thailand)",
                            value: "Thai (Thailand)",
                          },
                          {
                            label: "Italian (Italy)",
                            value: "Italian (Italy)",
                          },
                          {
                            label: "Dutch (Netherlands)",
                            value: "Dutch (Netherlands)",
                          },
                          {
                            label: "Polish (Poland)",
                            value: "Polish (Poland)",
                          },
                          {
                            label: "Greek (Greece)",
                            value: "Greek (Greece)",
                          },
                          {
                            label: "Czech (Czech Republic)",
                            value: "Czech (Czech Republic)",
                          },
                          {
                            label: "Hungarian (Hungary)",
                            value: "Hungarian (Hungary)",
                          },
                          {
                            label: "Swedish (Sweden)",
                            value: "Swedish (Sweden)",
                          },
                          {
                            label: "Danish (Denmark)",
                            value: "Danish (Denmark)",
                          },
                          {
                            label: "Finnish (Finland)",
                            value: "Finnish (Finland)",
                          },
                          {
                            label: "Romanian (Romania)",
                            value: "Romanian (Romania)",
                          },
                          {
                            label: "Bulgarian (Bulgaria)",
                            value: "Bulgarian (Bulgaria)",
                          },
                          {
                            label: "Slovak (Slovakia)",
                            value: "Slovak (Slovakia)",
                          },
                          {
                            label: "Ukrainian (Ukraine)",
                            value: "Ukrainian (Ukraine)",
                          },
                          {
                            label: "Malay (Malaysia)",
                            value: "Malay (Malaysia)",
                          },
                          {
                            label: "Bengali (Bangladesh)",
                            value: "Bengali (Bangladesh)",
                          },
                          {
                            label: "Tagalog (Philippines)",
                            value: "Tagalog (Philippines)",
                          },
                          {
                            label: "Urdu (Pakistan)",
                            value: "Urdu (Pakistan)",
                          },
                          {
                            label: "Tamil (India)",
                            value: "Tamil (India)",
                          },
                          {
                            label: "Telugu (India)",
                            value: "Telugu (India)",
                          },
                          {
                            label: "Marathi (India)",
                            value: "Marathi (India)",
                          },
                          {
                            label: "Gujarati (India)",
                            value: "Gujarati (India)",
                          },
                          {
                            label: "Khmer (Cambodia)",
                            value: "Khmer (Cambodia)",
                          },
                          {
                            label: "Lao (Laos)",
                            value: "Lao (Laos)",
                          },
                          {
                            label: "Burmese (Myanmar)",
                            value: "Burmese (Myanmar)",
                          },
                          {
                            label: "Serbian (Serbia)",
                            value: "Serbian (Serbia)",
                          },
                          {
                            label: "Croatian (Croatia)",
                            value: "Croatian (Croatia)",
                          },
                          {
                            label: "Bosnian (Bosnia & Herzegovina)",
                            value: "Bosnian (Bosnia & Herzegovina)",
                          },
                          {
                            label: "Slovenian (Slovenia)",
                            value: "Slovenian (Slovenia)",
                          },
                          {
                            label: "Macedonian (North Macedonia)",
                            value: "Macedonian (North Macedonia)",
                          },
                          {
                            label: "Albanian (Albania)",
                            value: "Albanian (Albania)",
                          },
                          {
                            label: "Estonian (Estonia)",
                            value: "Estonian (Estonia)",
                          },
                          {
                            label: "Latvian (Latvia)",
                            value: "Latvian (Latvia)",
                          },
                          {
                            label: "Lithuanian (Lithuania)",
                            value: "Lithuanian (Lithuania)",
                          },
                          {
                            label: "Georgian (Georgia)",
                            value: "Georgian (Georgia)",
                          },
                          {
                            label: "Azerbaijani (Azerbaijan)",
                            value: "Azerbaijani (Azerbaijan)",
                          },
                          {
                            label: "English (Canada)",
                            value: "English (Canada)",
                          },
                          {
                            label: "Spanish (Argentina)",
                            value: "Spanish (Argentina)",
                          },
                          {
                            label: "Spanish (Colombia)",
                            value: "Spanish (Colombia)",
                          },
                          {
                            label: "Spanish (Chile)",
                            value: "Spanish (Chile)",
                          },
                          {
                            label: "Haitian Creole (Haiti)",
                            value: "Haitian Creole (Haiti)",
                          },
                          {
                            label: "French (Haiti)",
                            value: "French (Haiti)",
                          },
                          {
                            label: "Quechua (Peru)",
                            value: "Quechua (Peru)",
                          },
                          {
                            label: "Guarani (Paraguay)",
                            value: "Guarani (Paraguay)",
                          },
                          {
                            label: "Aymara (Bolivia)",
                            value: "Aymara (Bolivia)",
                          },
                          {
                            label: "Arabic (Saudi Arabia)",
                            value: "Arabic (Saudi Arabia)",
                          },
                          {
                            label: "Arabic (Egypt)",
                            value: "Arabic (Egypt)",
                          },
                          {
                            label: "Arabic (United Arab Emirates)",
                            value: "Arabic (United Arab Emirates)",
                          },
                          {
                            label: "Arabic (Qatar)",
                            value: "Arabic (Qatar)",
                          },
                          {
                            label: "Arabic (Kuwait)",
                            value: "Arabic (Kuwait)",
                          },
                          {
                            label: "Arabic (Oman)",
                            value: "Arabic (Oman)",
                          },
                          {
                            label: "Arabic (Bahrain)",
                            value: "Arabic (Bahrain)",
                          },
                          {
                            label: "Arabic (Iraq)",
                            value: "Arabic (Iraq)",
                          },
                          {
                            label: "Arabic (Jordan)",
                            value: "Arabic (Jordan)",
                          },
                          {
                            label: "Arabic (Lebanon)",
                            value: "Arabic (Lebanon)",
                          },
                          {
                            label: "Arabic (Syria)",
                            value: "Arabic (Syria)",
                          },
                          {
                            label: "Arabic (Yemen)",
                            value: "Arabic (Yemen)",
                          },
                          {
                            label: "Arabic (Palestine)",
                            value: "Arabic (Palestine)",
                          },
                          {
                            label: "Arabic (Libya)",
                            value: "Arabic (Libya)",
                          },
                          {
                            label: "Arabic (Algeria)",
                            value: "Arabic (Algeria)",
                          },
                          {
                            label: "Arabic (Morocco)",
                            value: "Arabic (Morocco)",
                          },
                          {
                            label: "Arabic (Tunisia)",
                            value: "Arabic (Tunisia)",
                          },
                          {
                            label: "Arabic (Sudan)",
                            value: "Arabic (Sudan)",
                          },
                          {
                            label: "Arabic (Mauritania)",
                            value: "Arabic (Mauritania)",
                          },
                          {
                            label: "Persian (Iran)",
                            value: "Persian (Iran)",
                          },
                          {
                            label: "Kurdish (Iraq)",
                            value: "Kurdish (Iraq)",
                          },
                          {
                            label: "Kurdish (Syria)",
                            value: "Kurdish (Syria)",
                          },
                          {
                            label: "Kurdish (Turkey)",
                            value: "Kurdish (Turkey)",
                          },
                          {
                            label: "Turkish (Turkey)",
                            value: "Turkish (Turkey)",
                          },
                          {
                            label: "Hebrew (Israel)",
                            value: "Hebrew (Israel)",
                          },
                          {
                            label: "Armenian (Armenia)",
                            value: "Armenian (Armenia)",
                          },
                          {
                            label: "Berber (Morocco)",
                            value: "Berber (Morocco)",
                          },
                          {
                            label: "Berber (Algeria)",
                            value: "Berber (Algeria)",
                          },
                          {
                            label: "Coptic (Egypt)",
                            value: "Coptic (Egypt)",
                          },
                          {
                            label: "Dari (Afghanistan)",
                            value: "Dari (Afghanistan)",
                          },
                          {
                            label: "Pashto (Afghanistan)",
                            value: "Pashto (Afghanistan)",
                          },
                          {
                            label: "Balochi (Pakistan)",
                            value: "Balochi (Pakistan)",
                          },
                          {
                            label: "Sindhi (Pakistan)",
                            value: "Sindhi (Pakistan)",
                          },
                          {
                            label: "Assyrian Neo-Aramaic (Iraq)",
                            value: "Assyrian Neo-Aramaic (Iraq)",
                          },
                          {
                            label: "Chaldean Neo-Aramaic (Iraq)",
                            value: "Chaldean Neo-Aramaic (Iraq)",
                          },
                          {
                            label: "Circassian (Jordan)",
                            value: "Circassian (Jordan)",
                          },
                          {
                            label: "Chechen (Jordan)",
                            value: "Chechen (Jordan)",
                          },
                          {
                            label: "Domari (Middle East)",
                            value: "Domari (Middle East)",
                          },
                          {
                            label: "Gilaki (Iran)",
                            value: "Gilaki (Iran)",
                          },
                          {
                            label: "Luri (Iran)",
                            value: "Luri (Iran)",
                          },
                          {
                            label: "Mazanderani (Iran)",
                            value: "Mazanderani (Iran)",
                          },
                          {
                            label: "Nubian (Egypt)",
                            value: "Nubian (Egypt)",
                          },
                          {
                            label: "Saraiki (Pakistan)",
                            value: "Saraiki (Pakistan)",
                          },
                          {
                            label: "Shabaki (Iraq)",
                            value: "Shabaki (Iraq)",
                          },
                          {
                            label: "Talysh (Azerbaijan)",
                            value: "Talysh (Azerbaijan)",
                          },
                          {
                            label: "Tat (Azerbaijan)",
                            value: "Tat (Azerbaijan)",
                          },
                          {
                            label: "Zaza (Turkey)",
                            value: "Zaza (Turkey)",
                          },
                        ]}
                        value={language}
                        onChange={(value) => setLanguage(value)}
                      />
                      {/* <InlineStack gap="200" wrap={false}>
                        <div style={{ minWidth: "115px" }}>
                          <ButtonGroup variant="segmented">
                            <Popover
                              active={modelPopoverActive}
                              preferredAlignment="right"
                              activator={
                                <Button
                                  variant="tertiary"
                                  onClick={() =>
                                    setModelPopoverActive(!modelPopoverActive)
                                  }
                                  disclosure
                                >
                                  {model}
                                </Button>
                              }
                              autofocusTarget="first-node"
                              onClose={() => setModelPopoverActive(false)}
                            >
                              <ActionList
                                actionRole="menuitem"
                                items={[
                                  {
                                    content: "GPT-4.1 Mini",
                                    onAction: () =>
                                      handleModelChange("GPT-4.1 Mini"),
                                  },
                                ]}
                              />
                            </Popover>
                          </ButtonGroup>
                        </div> */}
                      <Box paddingBlockStart="500">
                        <Button
                          fullWidth
                          variant="primary"
                          icon={MagicIcon}
                          onClick={handleGenerate}
                          loading={isGenerating}
                          size="large"
                        >
                          Generate
                        </Button>
                      </Box>

                      {/* </InlineStack> */}
                    </BlockStack>
                  </Grid.Cell>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 8 }}>
                    <div
                      className={
                        styles.Ciwi_QuickGenerator_Container +
                        " " +
                        (editedData && !isEdit ? styles.hasResult : "") +
                        " " +
                        (editedData && isEdit ? styles.isEdit : "")
                      }
                    >
                      {editedData && typeof editedData.wordCount === "number" ? (
                        <div className={styles.Ciwi_QuickGenerator_Report}>
                          {/* <BlockStack> */}
                          <Text variant="bodyMd" as="p" fontWeight="bold">
                            Text Optimization Analysis
                          </Text>
                          <InlineStack gap="100" align="start">
                            <Text variant="bodyMd" as="span" fontWeight="bold">
                              Content Length
                            </Text>
                            <Text variant="bodyMd" as="span">
                              : Increased by
                            </Text>{" "}
                            <Text variant="bodyMd" as="span" tone="success">
                              {editedData.wordCount}
                            </Text>{" "}
                            <Text variant="bodyMd" as="span">
                              words (
                            </Text>{" "}
                            <Text as="span" tone="success">
                              {editedData.wordGap * 100}%
                            </Text>{" "}
                            <Text variant="bodyMd" as="span">
                              ).
                            </Text>
                          </InlineStack>
                          {editedData.keywordStrong && (
                            <InlineStack gap="100" align="start">
                              <Text
                                variant="bodyMd"
                                as="span"
                                fontWeight="bold"
                              >
                                Keyword Density
                              </Text>
                              <Text variant="bodyMd" as="span">
                                : Primary Keyword
                              </Text>{" "}
                              <Text as="span" tone="success">
                                "{editedData.keywordStrong || ""}",
                              </Text>{" "}
                              <Text variant="bodyMd" as="span">
                                at
                              </Text>{" "}
                              <Text variant="bodyMd" as="span" tone="success">
                                {editedData.keywordPercent}%,
                              </Text>{" "}
                              <Text variant="bodyMd" as="span" tone="success">
                                {editedData.keywordCompare}%
                              </Text>{" "}
                              <Text variant="bodyMd" as="span">
                                change.
                              </Text>
                            </InlineStack>
                          )}
                          <InlineStack gap="100" align="start">
                            <Text variant="bodyMd" as="span" fontWeight="bold">
                              Content Richness
                            </Text>
                            <Text variant="bodyMd" as="span">
                              : Improved by
                            </Text>{" "}
                            <Text variant="bodyMd" as="span" tone="success">
                              {editedData.textPercent}%,
                            </Text>{" "}
                            <Text variant="bodyMd" as="span">
                              meets SEO standards.
                            </Text>
                          </InlineStack>
                          <InlineStack gap="100" align="start">
                            <Text variant="bodyMd" as="span" fontWeight="bold">
                              Conversion Rate
                            </Text>
                            <Text variant="bodyMd" as="span">
                              : Expected increase of
                            </Text>{" "}
                            <Text variant="bodyMd" as="span" tone="success">
                              {editedData.ctrIncrease}%.
                            </Text>
                          </InlineStack>
                          {/* </BlockStack> */}
                        </div>
                      ) : null}
                      <div
                        className={
                          styles.Ciwi_QuickGenerator_Result +
                          " " +
                          (!editedData ? styles.defaultStatus : "") +
                          " " +
                          (editedData && isEdit
                            ? styles.Ciwi_QuickGenerator_Result_Content_Edit
                            : "")
                        }
                      >
                        {!editedData ? (
                          <div
                            className={styles.Ciwi_QuickGenerator_Result_Empty}
                          >
                            <Text as="p" variant="bodyMd">
                              {tipTexts[currentTipIndex]}
                            </Text>
                          </div>
                        ) : null}
                        {/* {isGenerating ? (
                        <div
                          className={styles.Ciwi_QuickGenerator_Result_Loading}
                        >
                          <SkeletonBodyText lines={10} />
                        </div>
                      ) : null} */}
                        {editedData ? (
                          <div
                            className={
                              styles.Ciwi_QuickGenerator_Result_Content
                            }
                          >
                            {pageType === "product" && contentType === "description" ? (
                              <Box paddingBlockEnd="300">
                                <TextField
                                  label="Product title"
                                  value={generatedTitle}
                                  onChange={setGeneratedTitle}
                                  autoComplete="off"
                                />
                              </Box>
                            ) : null}
                            <div
                              className={
                                styles.Ciwi_QuickGenerator_Result_Editor
                              }
                            >
                              <Tiptap editor={editor} />
                            </div>
                            {/* ) : (
                              <div
                                className={
                                  styles.Ciwi_QuickGenerator_Result_Markdown
                                }
                              >
                                <div
                                  dangerouslySetInnerHTML={{
                                    __html: editor?.getHTML() || "",
                                  }}
                                />
                              </div>
                            )} */}
                            <div
                              className={
                                styles.Ciwi_QuickGenerator_Result_Feedback +
                                " " +
                                (isEdit ? styles.Edit_Button : "")
                              }
                            >
                              {/* {isEdit ? ( */}
                              {/* <Button onClick={handleConfirm}>Confirm</Button> */}
                              {/* ) : ( */}
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  width: "100%",
                                }}
                              >
                                <Button
                                  variant="tertiary"
                                  onClick={() => {
                                    setOpen(true);
                                  }}
                                >
                                  View original description
                                </Button>
                                <ButtonGroup>
                                  <Button
                                    onClick={handlePublish}
                                    loading={
                                      publishFetcher.state === "submitting"
                                    }
                                  >
                                    Publish
                                  </Button>
                                  <Button onClick={handleEdit}>Edit</Button>
                                </ButtonGroup>
                              </div>
                              {/* )} */}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </Grid.Cell>
                </Grid>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section>
            <BlockStack align="center" inlineAlign="center">
              <Text variant="bodyLg" as="p">
                Created by {/* <Link to="https://ciwi.ai" target="_blank"> */}
                ciwi.ai
                {/* </Link> */}
              </Text>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
      <Modal open={open} variant="large" onHide={() => setOpen(false)}>
        <TitleBar title={`Original description`}>
          <button onClick={() => setOpen(false)}>Close</button>
        </TitleBar>
        <Box padding="400">
          <div
            dangerouslySetInnerHTML={{
              __html: originalDescription,
            }}
          />
        </Box>
      </Modal>
    </Page>
  );
};

export const removeHtmlTags = (str: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(str, "text/html");
  return doc.body.textContent || "";
};

export default Index;
