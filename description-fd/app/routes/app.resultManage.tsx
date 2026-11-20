import {
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  IndexTable,
  InlineStack,
  Page,
  Select,
  Spinner,
  Text,
  TextField,
  useIndexResourceState,
} from "@shopify/polaris";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import SideMenu from "app/components/sideMenu";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dist/shared/lib/dynamic";
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });
import "react-quill/dist/quill.snow.css";
import {
  GenerateDescription,
  GetProductsByListId,
  GetTemplateByShopName,
  GetUserData,
} from "app/api/JavaServer";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "app/shopify.server";
import { removeHtmlTags } from "./app._index/route";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import { useEditor } from "@tiptap/react";
import { Video } from "app/components/richTextInput/extensions/VideoNode";
import TextAlign from "@tiptap/extension-text-align";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { Table } from "@tiptap/extension-table";
import { LocalImage } from "app/components/richTextInput/extensions/imageNode";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Tiptap from "app/components/richTextInput/richTextInput";
import styles from "app/routes/styles/styles.module.css";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { session, admin } = adminAuthResult;
  try {
    return {
      shop: session?.shop,
      server: process.env.SERVER_URL,
    };
  } catch (error) {
    console.error(error);
    return {
      shop: "",
      server: process.env.SERVER_URL,
    };
  }
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();

  const originalEditor = useEditor({
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

  const targetEditor = useEditor({
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

  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(data);
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeItem, setActiveItem] = useState<string>("");
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [tableLoading, setTableLoading] = useState<boolean>(true);
  const [open, setOpen] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const [brandStyle, setBrandStyle] = useState<string>("");
  const [languageStyle, setLanguageStyle] = useState<string>("formal");
  const [model, setModel] = useState<string>("GPT-4.1 Mini");
  const [template, setTemplate] = useState<string>("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [focusSeoKeywordInput, setFocusSeoKeywordInput] =
    useState<boolean>(false);
  const [seoKeyword, setSeoKeyword] = useState<string>("");
  const [brand, setBrand] = useState<string>("");
  const [brandSlogan, setBrandSlogan] = useState<string>("");
  const [language, setLanguage] = useState<string>("English");
  const [updateValue, setUpdateValue] = useState<string>("");

  const productFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const publishFetcher = useFetcher<any>();

  useEffect(() => {
    progressDataUpdate();
  }, []);

  useEffect(() => {
    if (productsFetcher.data) {
      if (productsFetcher.data.success) {
        setMenuItems(productsFetcher.data.response);
        setActiveItem(productsFetcher.data.response[0]?.id);
        setLoading(false);
      }
    }
  }, [productsFetcher.data]);

  useEffect(() => {
    if (productFetcher.data) {
      if (productFetcher.data.success) {
        setData([
          {
            ...data[0],
            originalContent: productFetcher.data.response.descriptionHtml,
          },
        ]);
        originalEditor?.commands.setContent(
          productFetcher.data.response.descriptionHtml,
        );
      }
    }
  }, [productFetcher.data]);

  useEffect(() => {
    setTemplate("");
    setTemplates([]);
    const fetchTemplates = async () => {
      const response = await GetTemplateByShopName({
        server: server as string,
        shop: shop as string,
        pageType: data[0]?.pageType || "",
        contentType: data[0]?.contentType || "",
      });

      setTemplates(response);
      setTemplate(response[0]?.id.toString());
    };
    fetchTemplates();
  }, [data]);

  useEffect(() => {
    if (activeItem) {
      setTableLoading(true);
      setData([]);
      productFetcher.submit(
        {
          productId: activeItem,
        },
        {
          method: "POST",
          action: "/getProductInfoById",
        },
      );
      const UpdateData = async () => {
        const response = await GetProductsByListId({
          server: server as string,
          shop: shop as string,
          listId: [activeItem],
        });
        if (response.success) {
          const html = response.response[0].generateContent || "";
          setData([
            {
              ...response.response[0],
              generateContent: html,
            },
          ]);
          setUpdateValue(html);
          targetEditor?.commands.setContent(html);
        }
        setTableLoading(false);
      };
      UpdateData();
    }
  }, [activeItem]);

  useEffect(() => {
    if (publishFetcher.data) {
      if (publishFetcher.data.success) {
        shopify.toast.show("Description published successfully");
      } else {
        shopify.toast.show("Failed to publish description");
      }
    }
  }, [publishFetcher.data]);

  // const handleSetValue = (text: string) => {
  //   // 先去除首尾空行，再按行分割，每行用 <p> 包裹
  //   const html = text
  //     .trim()
  //     .split("\n")
  //     .map((line) => `<p>${line}</p>`)
  //     .join("");
  //   return html;
  // };

  const progressDataUpdate = async () => {
    const response = await GetUserData({
      server: server as string,
      shop: shop as string,
    });
    if (response.success) {
      const productIds = JSON.parse(response.response.taskData)?.productIds;
      productsFetcher.submit(
        { productIds },
        {
          method: "POST",
          action: "/getProductInfoByIds",
        },
      );
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    const response = await GenerateDescription({
      server: server as string,
      shop: shop as string,
      pageType: data[0]?.pageType || "",
      contentType: data[0]?.contentType || "",
      productId: activeItem,
      languageStyle,
      brandStyle,
      templateId: Number(template),
      templateType:
        templates.find((item) => item.id === Number(template))?.templateClass || false,
      model: model,
      language,
      seoKeywords: seoKeyword,
      brandWord: brand || "",
      brandSlogan: brandSlogan || "",
    });
    if (response.success) {
      setIsGenerating(false);
      const html = response.response.description;
      targetEditor?.commands.setContent(html);
      setUpdateValue(html);
      setOpen(false);
      shopify.toast.show("Description generated successfully");
    } else {
      setIsGenerating(false);
      shopify.toast.show("Failed to generate description");
    }
  };

  const handlePublish = (id: string) => {
    publishFetcher.submit(
      {
        id: activeItem,
        pageType: data.find((item) => item.id === id)?.pageType,
        contentType: data.find((item) => item.id === id)?.contentType,
        description:
          data.find((item) => item.id === id)?.contentType === "seo"
            ? removeHtmlTags(targetEditor?.getHTML() || "")
            : targetEditor?.getHTML() || "",
      },
      {
        method: "POST",
        action: "/descriptionPublish",
      },
    );
  };

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

  const modelSelectionOptions = useMemo(
    () => [
      {
        label: "ChatGPT 4.1",
        value: "ChatGPT 4.1",
      },
      {
        label: "DeepSeek R3",
        value: "DeepSeek R3",
      },
    ],
    [],
  );

  const rowMarkup = data.map(
    (
      { id, pageType, contentType, generateContent, originalContent },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
        onClick={() => {}}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" as="span">
            {pageType} {contentType}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell className={styles.Ciwi_Original_Content_Cell}>
          <Box>
            <Tiptap
              editor={originalEditor}
              readOnly={true}
              style={{
                height: "700px",
              }}
            />
          </Box>
        </IndexTable.Cell>
        <IndexTable.Cell className={styles.Ciwi_Generated_Content_Cell}>
          <Box>
            <Tiptap
              editor={targetEditor}
              style={{
                height: "700px",
              }}
            />
          </Box>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <BlockStack gap="400" align="center">
            <div style={{ width: "200px" }}>
              <Button
                fullWidth={true}
                loading={
                  publishFetcher.state === "submitting" ? true : undefined
                }
                onClick={() => handlePublish(id)}
                disabled={!removeHtmlTags(updateValue)}
              >
                Publish Content
              </Button>
            </div>
            <div style={{ width: "200px" }}>
              <Button
                fullWidth={true}
                variant="primary"
                onClick={() => setOpen(true)}
              >
                Generate
              </Button>
            </div>
          </BlockStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  return (
    <Page
      title="Result Management"
      fullWidth
      backAction={{
        content: "Back",
        onAction: () => {
          navigate("/app/batchGeneration");
        },
      }}
      // primaryAction={{
      //   content: " Publish",
      //   onAction: () => {},
      // }}
    >
      <Box>
        {loading ? (
          <BlockStack
            gap="200"
            align="center"
            inlineAlign="center"
            reverseOrder
          >
            <Spinner />
          </BlockStack>
        ) : (
          <InlineStack gap="400" direction="row" wrap={false}>
            <SideMenu
              isMobile={isMobile}
              menuItems={menuItems}
              onClick={(item) => {
                setActiveItem(item);
              }}
              activeItem={activeItem}
              hasNext={true}
              hasPrevious={true}
            />
            <Box width={"100%"} paddingInlineStart={"500"}>
              <Box width={"100%"} paddingBlockEnd={"500"}>
                <InlineStack
                  align="space-between"
                  blockAlign="center"
                  direction="row"
                  wrap={false}
                >
                  <Text variant="headingMd" as="h1">
                    {menuItems.find((item) => item?.id === activeItem)?.title}
                  </Text>
                  {/* <Select
                    label=""
                    options={[
                      { label: "English", value: "English" },
                      { label: "Chinese", value: "Chinese" },
                      { label: "French", value: "French" },
                      { label: "German", value: "German" },
                      { label: "Italian", value: "Italian" },
                      { label: "Spanish", value: "Spanish" },
                      { label: "Portuguese", value: "Portuguese" },
                      { label: "Russian", value: "Russian" },
                      { label: "Arabic", value: "Arabic" },
                    ]}
                    onChange={(value) => {
                      setSelectedLanguage(value);
                    }}
                    value={selectedLanguage}
                  /> */}
                </InlineStack>
              </Box>
              {templates.length > 0 ? (
                <IndexTable
                  // condensed={useBreakpoints().smDown}
                  // resourceName={resourceName}
                  itemCount={data.length}
                  selectable={false}
                  headings={[
                    { title: "Module" },
                    { title: "Original Content" },
                    { title: "Generated Content" },
                    { title: "Action" },
                  ]}
                >
                  {rowMarkup}
                </IndexTable>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "90%",
                  }}
                >
                  <BlockStack
                    gap="200"
                    align="center"
                    inlineAlign="center"
                    reverseOrder
                  >
                    <Spinner />
                  </BlockStack>
                </div>
              )}
            </Box>
          </InlineStack>
        )}
      </Box>
      <Modal open={open} variant="large" onHide={() => setOpen(false)}>
        <TitleBar title={"ReGenerating"}>
          <button
            variant="primary"
            onClick={handleGenerate}
            loading={isGenerating ? "true" : undefined}
          >
            Create
          </button>
          <button
            onClick={() => {
              setIsGenerating(false);
              setOpen(false);
            }}
          >
            Cancel
          </button>
        </TitleBar>
        <Box padding={{ xs: "100", sm: "100", md: "400", lg: "400" }}>
          <BlockStack gap="400">
            <BlockStack gap="200">
              <Text variant="bodyLg" as="p">
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
                options={templates?.map((template: any, index: number) => ({
                  key: index.toString(),
                  label: template.templateTitle,
                  value: template.id.toString(),
                }))}
                value={template}
                onChange={(value) => setTemplate(value)}
              />
              <Select
                label="Model selection"
                options={modelSelectionOptions}
                value={template}
                onChange={(value) => setTemplate(value)}
              />
            </BlockStack>
            <Divider borderColor="border" />
            <TextField
              label="Seo Keywords"
              value={seoKeyword}
              placeholder="Click the 'Enter' to add SEO keywords"
              // disabled={seoKeywordTags.length >= 3}
              onChange={(value) => {
                setSeoKeyword(value);
              }}
              autoComplete="off"
              // verticalContent={seoKeywordTagsMarkup}
              onFocus={() => setFocusSeoKeywordInput(true)}
              onBlur={() => setFocusSeoKeywordInput(false)}
            />
            <Divider borderColor="border" />
            <BlockStack gap="200">
              <Text variant="bodyLg" as="p">
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

            {/*<TextField
                  label="Additional information"
                  value={additionalInformation}
                  placeholder="Add unique product details, specifications, key selling points, etc"
                  onChange={(value) => setAdditionalInformation(value)}
                  multiline={4}
                  autoComplete="off"
                /> */}
            <Select
              label="Language"
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
          </BlockStack>
        </Box>
      </Modal>
    </Page>
  );
};

export default Index;
