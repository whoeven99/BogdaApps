import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import {
  Text,
  IndexFilters,
  IndexTable,
  Layout,
  Page,
  useIndexResourceState,
  TabProps,
  useSetIndexFiltersMode,
  Button,
  Box,
  BlockStack,
  Divider,
  InlineStack,
  Select,
  Card,
  Thumbnail,
  Badge,
  Tag,
  TextField,
} from "@shopify/polaris";
import {
  BatchGenerateDescription,
  GetTemplateByShopName,
  GetUserData,
  GetProductsByListId,
} from "app/api/JavaServer";
import CardSkeleton from "app/components/cardSkeleton";
import DetailProgress from "app/components/detailProgress";
import { authenticate } from "app/shopify.server";
import { useCallback, useEffect, useMemo, useState } from "react";

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

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = (await authenticate.admin(request)).session;
  const { shop } = adminAuthResult;
  const formData = await request.formData();
  const batchGenerationData = JSON.parse(
    formData.get("batchGenerationData") as string,
  );

  console.log(`${shop} batchGenerationData`, batchGenerationData);

  try {
    const response = await BatchGenerateDescription({
      shop: shop as string,
      language: batchGenerationData.language,
      productIds: batchGenerationData.productIds,
      pageType: "product",
      contentType: batchGenerationData.contentType,
      languageStyle: batchGenerationData.languageStyle,
      brandStyle: batchGenerationData.brandStyle,
      templateId: Number(batchGenerationData.template),
      templateType: batchGenerationData.templateType,
      model: batchGenerationData.model,
      seoKeywords: batchGenerationData.seoKeywords,
      brandWord: batchGenerationData.brandWord,
      brandSlogan: batchGenerationData.brandSlogan,
    });

    return response;
  } catch (error) {
    console.error(error);
    // return { error: "Failed to generate description" };
  }
};

const Index = () => {
  const { server, shop } = useLoaderData<typeof loader>();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    hasNextPage: false,
    hasPreviousPage: false,
    startCursor: "",
    endCursor: "",
  });
  const [selected, setSelected] = useState(0);
  const [queryValue, setQueryValue] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const {
    selectedResources,
    allResourcesSelected,
    handleSelectionChange,
    clearSelection,
  } = useIndexResourceState(data);
  const { mode, setMode } = useSetIndexFiltersMode();

  const [contentType, setContentType] = useState<"description" | "seo">(
    "description",
  );

  const [brandStyle, setBrandStyle] = useState<string>("");
  const [languageStyle, setLanguageStyle] = useState<string>("formal");
  const [model, setModel] = useState<string>("GPT-4.1 Mini");
  const [template, setTemplate] = useState<string>("");
  const [templates, setTemplates] = useState<any[]>([]);
  const [focusSeoKeywordInput, setFocusSeoKeywordInput] =
    useState<boolean>(false);
  const [seoKeyword, setSeoKeyword] = useState<string>("");
  const [seoKeywordTags, setSeoKeywordTags] = useState<string[]>([]);
  const [brand, setBrand] = useState<string>("");
  const [brandSlogan, setBrandSlogan] = useState<string>("");
  const [language, setLanguage] = useState<string>("English");
  const [progress, setProgress] = useState<any>(null);

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
  const generateFetcher = useFetcher<any>();
  const stopFetcher = useFetcher<any>();

  useEffect(() => {
    fetcher.submit(
      { query: queryValue, pageSize: 20 },
      { method: "POST", action: "/getProductInfo" },
    );
  }, []);

  useEffect(() => {
    if (progress?.taskStatus === 2 || !progress) {
      setTimeout(() => {
        progressDataUpdate();
      }, 5000);
    }
  }, [progress]);

  useEffect(() => {
    const queryText =
      selected === 0
        ? "" + queryValue
        : selected === 1
          ? "status:ACTIVE " + queryValue
          : selected === 2
            ? "status:DRAFT " + queryValue
            : "status:ARCHIVED " + queryValue;
    fetcher.submit(
      { query: queryText, pageSize: 20 },
      { method: "POST", action: "/getProductInfo" },
    );
    setData([]);
  }, [queryValue]);

  // useEffect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => {
  //     if (e.key === "Enter" && seoKeyword && focusSeoKeywordInput) {
  //       if (seoKeywordTags.includes(seoKeyword)) {
  //         shopify.toast.show(`SEO Keyword ${seoKeyword} already exists`);
  //         return;
  //       }
  //       if (seoKeywordTags.length >= 3) {
  //         shopify.toast.show("You can only add up to 3 SEO keywords");
  //         return;
  //       }
  //       setSeoKeywordTags((prev) => [...prev, seoKeyword]);
  //       setSeoKeyword("");
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyDown);

  //   // 清除上一个监听
  //   return () => {
  //     window.removeEventListener("keydown", handleKeyDown);
  //   };
  // }, [seoKeyword, focusSeoKeywordInput]);

  // useEffect(() => {
  //   setData(
  //     data.map((item: any) => ({
  //       ...item,
  //       updateTime: updateTime[item.productId] || "--",
  //     })),
  //   );
  // }, [updateTime]);

  useEffect(() => {
    setTemplate("");
    setTemplates([]);
    const fetchTemplates = async () => {
      const response = await GetTemplateByShopName({
        server: server as string,
        shop: shop as string,
        pageType: "product",
        contentType: contentType,
      });
      setTemplates(response);
      if (response && response.length > 0) {
        setTemplate(response[0].id);
      }
    };
    fetchTemplates();
  }, [contentType]);

  useEffect(() => {
    if (fetcher.data) {
      const mappedData = fetcher.data.response.data.map((item: any) => ({
        id: item.id,
        productTitle: item.title,
        productImageUrl: item.image,
        status: item.status,
        version: 1.0,
      }));
      setData(mappedData);
      setPagination({
        hasNextPage: fetcher.data.response.hasNextPage,
        hasPreviousPage: fetcher.data.response.hasPreviousPage,
        startCursor: fetcher.data.response.startCursor,
        endCursor: fetcher.data.response.endCursor,
      });
      const listId = fetcher.data.response.data.map((item: any) => item.id);
      const getProductUpdateTime = async () => {
        const response = await GetProductsByListId({
          server: server as string,
          shop: shop as string,
          listId: listId,
        });
        if (response.response !== null) {
          setData(
            mappedData.map((dataItem: any) => ({
              ...dataItem,
              updateTime:
                response.response.find(
                  (item: any) => item.productId === dataItem.id,
                )?.updateTime || null,
            })),
          );
        } else {
        }
      };

      getProductUpdateTime();
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (generateFetcher.data) {
      if (generateFetcher.data.success) {
        setProgress({
          status: 1,
          allCount: generateFetcher.data.response.allCount,
          unfinishedCount: generateFetcher.data.response.unfinishedCount,
          taskModel: generateFetcher.data.response.taskModel,
          taskStatus: generateFetcher.data.response.taskStatus,
        });
        clearSelection();
        setOpen(false);
        shopify.toast.show("Batch generation started");
      } else {
        shopify.toast.show("Batch generation failed");
      }
    }
  }, [generateFetcher.data]);

  useEffect(() => {
    if (stopFetcher.data?.success) {
      setProgress({
        ...progress,
        taskStatus: 0,
      });
    }
  }, [stopFetcher.data]);

  const handleStop = () => {
    stopFetcher.submit(
      {},
      {
        method: "POST",
        action: "/stopBatchGenerateDescription",
      },
    );
  };

  const handleNextPage = () => {
    fetcher.submit(
      { query: queryValue, pageSize: 20, endCursor: pagination.endCursor },
      { method: "POST", action: "/getProductInfo" },
    );
  };

  const handlePreviousPage = () => {
    fetcher.submit(
      { query: queryValue, pageSize: 20, startCursor: pagination.startCursor },
      { method: "POST", action: "/getProductInfo" },
    );
  };

  const tabs: TabProps[] = [
    {
      id: "1",
      content: "All",
      onAction: () => {},
    },
    {
      id: "2",
      content: "Active",
      onAction: () => {},
    },
    {
      id: "3",
      content: "Draft",
      onAction: () => {},
    },
    {
      id: "4",
      content: "Archived",
      onAction: () => {},
    },
  ];

  const progressDataUpdate = async () => {
    const response = await GetUserData({
      server: server as string,
      shop: shop as string,
    });
    if (response.success) {
      setProgress(response.response);
    }
  };

  const handleFiltersQueryChange = useCallback((value: string) => {
    setQueryValue(value);
  }, []);

  const handleSelectedStatusChange = useCallback((value: number) => {
    const queryText =
      value === 0
        ? ""
        : value === 1
          ? "status:ACTIVE"
          : value === 2
            ? "status:DRAFT"
            : "status:ARCHIVED";
    fetcher.submit(
      { query: queryText, pageSize: 20 },
      { method: "POST", action: "/getProductInfo" },
    );
    setData([]);
    setSelected(value);
  }, []);

  const handleGenerate = useCallback(async () => {
    let error = false;
    if (selectedResources.length === 0) {
      shopify.toast.show("Please select at least one product");
      error = true;
    }
    if (template === "") {
      shopify.toast.show("Please select a template");
      error = true;
    }
    if (error) return;

    generateFetcher.submit(
      {
        batchGenerationData: JSON.stringify({
          language: language,
          contentType: contentType,
          languageStyle: languageStyle,
          brandStyle: brandStyle,
          template: template,
          templateType:
            templates.find((item: any) => template == item.id)?.templateClass ||
            false,
          model: model,
          seoKeywords: seoKeyword,
          brandWord: brand,
          brandSlogan: brandSlogan,
          productIds: selectedResources,
        }),
      },
      { method: "POST" },
    );
  }, [
    selectedResources,
    language,
    contentType,
    languageStyle,
    brandStyle,
    template,
    model,
    seoKeyword,
    brand,
    brandSlogan,
  ]);

  const rowMarkup = data.map(
    ({ id, productTitle, productImageUrl, status, updateTime }, index) => (
      <IndexTable.Row
        id={id}
        key={index}
        selected={selectedResources.includes(id)}
        position={index}
        onClick={() => {}}
      >
        <IndexTable.Cell>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              // overflow: "hidden",
              // textOverflow: "ellipsis", // 添加省略号
              // wordBreak: "break-all",
            }}
          >
            <div
              style={{
                width: "40px",
                whiteSpace: "normal",
              }}
            >
              <Thumbnail
                source={productImageUrl || "/img_default-min.webp"}
                alt={productTitle}
                size="small"
              />
            </div>
            <div
              style={{
                minWidth: "calc(100% - 420px)",
                whiteSpace: "normal",
              }}
            >
              <Text variant="bodyMd" fontWeight="bold" as="span">
                {productTitle}
              </Text>
            </div>
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div
            style={{
              width: "60px",
            }}
          >
            {status === "ACTIVE" ? (
              <Badge tone="success">Active</Badge>
            ) : status === "DRAFT" ? (
              <Badge tone="info">Draft</Badge>
            ) : (
              <Badge tone="critical">Archived</Badge>
            )}
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <div
            style={{
              width: "200px",
            }}
          >
            {formatDateTime(updateTime)}
          </div>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <InlineStack gap="400" wrap={false} direction="row">
            <div
              style={{
                maxWidth: "120px",
              }}
            >
              <Button
                onClick={() =>
                  navigate(`/app`, {
                    state: {
                      productId: id,
                    },
                  })
                }
              >
                Create content
              </Button>
            </div>
            {/* <Button variant="tertiary" onClick={() => setOpen(true)}>
              Edit
            </Button> */}
          </InlineStack>
        </IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const promotedBulkActions = [
    {
      content: "Batch Generation",
      variant: "primary",
      onAction: () => setOpen(true),
    },
  ];

  return (
    <Page
      title="Batch Generation"
      fullWidth
      // subtitle="Generate multiple products at once"
    >
      <Layout>
        <Layout.Section>
          {progress && (
            <DetailProgress
              total={progress.allCount}
              unfinished={progress.unfinishedCount}
              moduleName={progress.taskModel}
              itemStatus={progress.status || 0}
              status={progress.taskStatus}
              updateTime={progress.taskTime}
              progress={
                ((progress.allCount * 3 -
                  (progress.unfinishedCount * 3 - progress?.status)) *
                  100) /
                (progress.allCount * 3)
              }
              handleStop={handleStop}
              loading={stopFetcher.state === "submitting"}
            />
          )}
        </Layout.Section>
        <Layout.Section>
          <Card padding={{ xs: "0", sm: "0", md: "0", lg: "0" }}>
            <IndexFilters
              // sortOptions={sortOptions}
              // sortSelected={sortSelected}
              queryValue={queryValue}
              // queryPlaceholder="Searching in all"
              onQueryChange={handleFiltersQueryChange}
              onQueryClear={() => setQueryValue("")}
              // onSort={setSortSelected}
              // primaryAction={primaryAction}
              cancelAction={{
                onAction: () => {
                  setQueryValue("");
                },
                disabled: false,
                loading: false,
              }}
              tabs={tabs}
              selected={selected}
              onSelect={(e) => handleSelectedStatusChange(e)}
              canCreateNewView={false}
              filters={[]}
              hideFilters
              // appliedFilters={appliedFilters}
              onClearAll={() => {}}
              mode={mode}
              setMode={setMode}
            />
            <IndexTable
              // condensed={useBreakpoints().smDown}
              // resourceName={resourceName}
              // loading={fetcher.state === "submitting"}
              itemCount={data.length}
              selectedItemsCount={
                data.every((item) => selectedResources.includes(item.id))
                  ? "All"
                  : selectedResources.length
              }
              // onSelectionChange={(
              //   selectionType: SelectionType,
              //   toggleType: boolean,
              //   selection?: string | [number, number],
              //   position?: number,
              // ) => {
              //   if (
              //     ((selectionType === "page" &&
              //       selectedResources.length +
              //         data.filter((item) => selectedResources.includes(item.id))
              //           .length >
              //         20) ||
              //       (selectionType === "single" &&
              //         selectedResources.length + 1 > 20) ||
              //       (selectionType === "multi" &&
              //         selectedResources.length + (selection?.length || 1) >
              //           20)) &&
              //     toggleType == true
              //   ) {
              //     shopify.toast.show("You can only select up to 20 products");
              //   } else {
              //     handleSelectionChange(
              //       selectionType,
              //       toggleType,
              //       selection,
              //       position,
              //     );
              //   }
              // }}
              onSelectionChange={handleSelectionChange}
              headings={[
                { title: "Product title" },
                { title: "Status" },
                { title: "Last Updated (UTC)" },
                { title: "Action" },
              ]}
              promotedBulkActions={promotedBulkActions}
              pagination={{
                hasNext: pagination.hasNextPage,
                onNext: handleNextPage,
                hasPrevious: pagination.hasPreviousPage,
                onPrevious: handlePreviousPage,
              }}
            >
              {rowMarkup}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
      <Modal open={open} variant="large" onHide={() => setOpen(false)}>
        <TitleBar
          title={`Creating ${selectedResources.length} products in batches`}
        >
          <button
            variant="primary"
            onClick={handleGenerate}
            loading={generateFetcher.state === "submitting" ? "" : undefined}
          >
            Create
          </button>
          <button onClick={() => setOpen(false)}>Cancel</button>
        </TitleBar>
        <Box padding={{ xs: "100", sm: "100", md: "400", lg: "400" }}>
          <BlockStack gap="400">
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

            <Divider borderColor="border" />
            <BlockStack gap="200">
              <Text variant="headingMd" as="h1">
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
                value={model}
                onChange={(value) => setModel(value)}
              />
            </BlockStack>
            <Divider borderColor="border" />
            <Text variant="headingMd" as="h1">
              SEO Settings
            </Text>
            <TextField
              label=""
              value={seoKeyword}
              placeholder="Click the 'Enter' to add SEO keywords"
              disabled={seoKeywordTags.length >= 3}
              onChange={(value) => {
                setSeoKeyword(value);
              }}
              autoComplete="off"
              verticalContent={seoKeywordTagsMarkup}
              onFocus={() => setFocusSeoKeywordInput(true)}
              onBlur={() => setFocusSeoKeywordInput(false)}
            />
            <Divider borderColor="border" />
            <BlockStack gap="200">
              <Text variant="headingMd" as="h1">
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
            <Text variant="headingMd" as="h1">
              Language
            </Text>
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
          </BlockStack>
        </Box>
      </Modal>
    </Page>
  );
};

export const formatDateTime = (dateString: string) => {
  if (!dateString) return "--";
  const date = new Date(dateString);
  // 转为本地时间并格式化
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export default Index;
