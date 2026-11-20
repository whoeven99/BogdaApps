import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { SaveBar } from "@shopify/app-bridge-react";
import {
  ActionList,
  Autocomplete,
  AvatarProps,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Divider,
  FormLayout,
  Grid,
  Icon,
  IconProps,
  InlineStack,
  Layout,
  Page,
  Popover,
  Select,
  SkeletonBodyText,
  Text,
  TextField,
  Thumbnail,
  ThumbnailProps,
} from "@shopify/polaris";
import {
  MagicIcon,
  SearchIcon,
  ChevronDownIcon,
  DeleteIcon,
  ClipboardIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
} from "@shopify/polaris-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/styles.module.css";
import { LoaderFunctionArgs } from "@remix-run/node";
import axios from "axios";
import { authenticate } from "app/shopify.server";
import { CreateUserTemplate, GenerateDescription } from "app/api/JavaServer";

const originalData = {
  name: "",
  description: "",
  pageType: "product",
  contentType: "description",
  content: "",
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { session } = adminAuthResult;

  return {
    shop: session.shop,
    server: process.env.SERVER_URL,
  };
};

const Index = () => {
  const { shop, server } = useLoaderData<typeof loader>();
  const [updateData, setUpdateData] = useState(originalData);
  const [textValue, setTextValue] = useState<string>("");
  const [nameError, setNameError] = useState("");
  const [contentError, setContentError] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [options, setOptions] = useState<
    {
      id: string;
      label: string;
      value: string;
      media?: React.ReactElement<IconProps | ThumbnailProps | AvatarProps>;
    }[]
  >([]);
  const [language, setLanguage] = useState<string>("en");
  const [willLoadMoreResults, setWillLoadMoreResults] = useState(true);
  const [endCursor, setEndCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [productError, setProductError] = useState("");
  const [generateData, setGenerateData] = useState<string>("");

  const isFirstLoad = useRef(true);
  const selectedItem = useMemo(() => {
    const selectedOption = options.find(
      (option: {
        id: string;
        label: string;
        value: string;
        media?: React.ReactElement<IconProps | ThumbnailProps | AvatarProps>;
      }) => {
        return selectedOptions.includes(option.value);
      },
    );
    return selectedOption ? (
      <Box padding="400" background="bg-surface-secondary" borderRadius="200">
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
            {selectedOption?.media}
            <Text as="p" variant="bodyMd">
              {selectedOption?.label}
            </Text>
          </InlineStack>
          <Button
            icon={DeleteIcon}
            variant="tertiary"
            onClick={() => {
              setSelectedOptions([]);
            }}
          />
        </InlineStack>
      </Box>
    ) : null;
  }, [options, selectedOptions]);

  const navigate = useNavigate();

  // const fetcher = useFetcher<any>();

  // useEffect(() => {
  //   if (updateData.pageType === "product") {
  //     setOptions([]);
  //     setLoading(true);
  //     if (isFirstLoad.current) {
  //       fetcher.submit(
  //         { query: textValue },
  //         { method: "POST", action: "/getProductInfo" },
  //       );
  //       isFirstLoad.current = false;
  //     }
  //   } else {
  //     setOptions([]);
  //     setLoading(true);
  //     if (isFirstLoad.current) {
  //       fetcher.submit(
  //         { query: textValue },
  //         { method: "POST", action: "/getCollectionInfo" },
  //       );
  //       isFirstLoad.current = false;
  //     }
  //   }
  // }, [updateData.pageType, textValue]);

  // useEffect(() => {
  //   if (fetcher.data) {
  //     if (fetcher.data.success) {
  //       setLoading(false);
  //       setOptions((prev) => [
  //         ...prev,
  //         ...fetcher.data!.response.data.map((item: any) => ({
  //           id: item.id,
  //           label: item.title,
  //           value: item.id,
  //           media: <Thumbnail source={item.image} alt={item.title} />,
  //         })),
  //       ]);
  //       setWillLoadMoreResults(fetcher.data!.response.hasNextPage);
  //       setEndCursor(fetcher.data!.response.endCursor);
  //     }
  //   }
  // }, [fetcher.data]);

  useEffect(() => {
    if (JSON.stringify(updateData) !== JSON.stringify(originalData)) {
      shopify.saveBar.show("template-create-save-bar");
    } else {
      shopify.saveBar.hide("template-create-save-bar");
    }
  }, [updateData]);

  const handleSave = async () => {
    if (updateData.name === "") {
      setNameError("Name is required");
    } else {
      setNameError("");
    }
    if (updateData.content === "") {
      setContentError("Content is required");
    } else {
      setContentError("");
    }
    if (nameError || contentError) {
      return;
    }
    const response = await CreateUserTemplate({
      server: server as string,
      shop: shop as string,
      templateData: updateData.content,
      templateDescription: updateData.description,
      templateTitle: updateData.name,
      templateType: "",
      templateModel: updateData.pageType,
      templateSubtype: updateData.contentType,
    });
    if (response.success) {
      shopify.saveBar.hide("template-create-save-bar");
      shopify.toast.show("Template created successfully");
      navigate(`/app/template?sort=1`);
    } else {
      shopify.toast.show(response?.message);
      // setError(response.message);
    }
  };

  const handleDiscard = () => {
    setUpdateData(originalData);
    shopify.saveBar.hide("template-create-save-bar");
  };

  const updateSelection = useCallback(
    (selected: string[]) => {
      setSelectedOptions(selected);
      if (selected.length === 0) {
        setProductError("Product is required");
      } else {
        setProductError("");
      }
    },
    [options],
  );

  // const handleLoadMoreResults = useCallback(() => {
  //   if (willLoadMoreResults && endCursor) {
  //     setLoading(true);
  //     if (updateData.pageType === "product") {
  //       setTimeout(() => {
  //         fetcher.submit(
  //           { endCursor: endCursor },
  //           { method: "POST", action: "/getProductInfo" },
  //         );
  //       }, 1000);
  //     } else {
  //       setTimeout(() => {
  //         fetcher.submit(
  //           { endCursor: endCursor },
  //           { method: "POST", action: "/getCollectionInfo" },
  //         );
  //       }, 1000);
  //     }
  //   }
  // }, [willLoadMoreResults, endCursor, options.length, updateData.pageType]);

  const handleGenerate = useCallback(async () => {
    let errors = false;
    if (selectedOptions.length === 0) {
      setProductError("Product is required");
      errors = true;
    } else {
      setProductError("");
    }
    if (errors) {
      return;
    }
    setIsGenerating(true);
    const response = await GenerateDescription({
      server: server as string,
      shop: shop as string,
      pageType: updateData.pageType,
      contentType: updateData.contentType,
      productId: selectedOptions[0],
      languageStyle: "",
      brandStyle: "",
      templateId: 1,
      templateType: true,
      model: "gpt-4o-mini",
      language: language,
      seoKeywords: "",
      brandWord: "",
      brandSlogan: "",
    });
    if (response.success) {
      setIsGenerating(false);
      setGenerateData(response.response.description);
    } else {
      setIsGenerating(false);
      setGenerateData("");
    }
  }, [selectedOptions, updateData, language]);

  const filterTemplates = [
    { id: 1, title: "Template 1" },
    { id: 2, title: "Template 2" },
    { id: 3, title: "Template 3" },
  ];

  const [template, setTemplate] = useState<string>("1");

  return (
    <Page
      title="Create template"
      subtitle="Build a reusable pattern for generating content"
      compactTitle
      backAction={{
        onAction: () => {
          shopify.saveBar.hide("template-create-save-bar");
          navigate("/app/template");
        },
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <FormLayout>
                <Text variant="headingSm" as="h2">
                  Template information
                </Text>
                <TextField
                  type="text"
                  name="name"
                  label="Template name"
                  autoComplete="off"
                  value={updateData.name}
                  onChange={(value) =>
                    setUpdateData({ ...updateData, name: value })
                  }
                  error={nameError}
                />
              </FormLayout>
              <FormLayout>
                <TextField
                  type="text"
                  name="description"
                  label="Template description"
                  autoComplete="off"
                  value={updateData.description}
                  onChange={(value) =>
                    setUpdateData({ ...updateData, description: value })
                  }
                />
              </FormLayout>
              <FormLayout>
                <Select
                  name="type"
                  label="Page type"
                  value={updateData.pageType}
                  onChange={(value) => {
                    setUpdateData({ ...updateData, pageType: value });
                    setSelectedOptions([]);
                    setTextValue("");
                    isFirstLoad.current = true;
                  }}
                  options={[
                    { label: "Product", value: "product" },
                    { label: "Collection", value: "collection" },
                  ]}
                />
              </FormLayout>
              <FormLayout>
                <Select
                  name="contentType"
                  label="Content type"
                  value={updateData.contentType}
                  onChange={(value) =>
                    setUpdateData({ ...updateData, contentType: value })
                  }
                  options={[
                    { label: "Description", value: "description" },
                    { label: "SEO Description", value: "seo" },
                  ]}
                />
              </FormLayout>
              <FormLayout>
                <TextField
                  type="text"
                  name="content"
                  label="Template content"
                  multiline={4}
                  autoComplete="off"
                  value={updateData.content}
                  onChange={(value) =>
                    setUpdateData({ ...updateData, content: value })
                  }
                  error={contentError}
                />
              </FormLayout>
            </BlockStack>
            <SaveBar id="template-create-save-bar">
              <button variant="primary" onClick={handleSave}></button>
              <button onClick={handleDiscard}></button>
            </SaveBar>
          </Card>
        </Layout.Section>
        {/* <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Grid>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 2, lg: 4 }}>
                  <BlockStack gap="400">
                    <InlineStack gap="100">
                      <Box>
                        <Icon source={MagicIcon} tone="base" />
                      </Box>
                      <Text as="h2" variant="headingMd">
                        Test template
                      </Text>
                    </InlineStack>
                    {selectedItem ? (
                      selectedItem
                    ) : (
                      <Autocomplete
                        options={options}
                        selected={selectedOptions}
                        onSelect={updateSelection}
                        loading={loading}
                        onLoadMoreResults={handleLoadMoreResults}
                        willLoadMoreResults={willLoadMoreResults}
                        textField={
                          <Autocomplete.TextField
                            label={
                              updateData.pageType === "product"
                                ? "Product"
                                : "Collection"
                            }
                            prefix={<Icon source={SearchIcon} tone="base" />}
                            placeholder={
                              updateData.pageType === "product"
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
                      <Text variant="bodyLg" as="p">
                        AI Generation Settings
                      </Text>

                      <Select
                        label="Brand style"
                        options={filterTemplates.map((template: any) => ({
                          label: template.title,
                          value: template.id,
                        }))}
                        value={template}
                        onChange={(value) => setTemplate(value)}
                      />

                      <Select
                        label="Language style"
                        options={filterTemplates.map((template: any) => ({
                          label: template.title,
                          value: template.id,
                        }))}
                        value={template}
                        onChange={(value) => setTemplate(value)}
                      />

                      <Select
                        label="Model selection"
                        options={filterTemplates.map((template: any) => ({
                          label: template.title,
                          value: template.id,
                        }))}
                        value={template}
                        onChange={(value) => setTemplate(value)}
                      />
                    </BlockStack>
                    <Divider borderColor="border" />
                    <BlockStack gap="200">
                      <Text variant="bodyLg" as="p">
                        SEO optimization rules
                      </Text>
                      <Select
                        label="Brand word"
                        options={filterTemplates.map((template: any) => ({
                          label: template.title,
                          value: template.id,
                        }))}
                        value={template}
                        onChange={(value) => setTemplate(value)}
                      />
                      <Select
                        label="Keywords"
                        options={filterTemplates.map((template: any) => ({
                          label: template.title,
                          value: template.id,
                        }))}
                        value={template}
                        onChange={(value) => setTemplate(value)}
                      />
                    </BlockStack>
                    <Divider borderColor="border" />
                    <Select
                      label="Language"
                      options={[
                        { label: "English", value: "English" },
                        { label: "French", value: "French" },
                        { label: "Spanish", value: "Spanish" },
                        { label: "German", value: "German" },
                        { label: "Italian", value: "Italian" },
                        { label: "Portuguese", value: "Portuguese" },
                        { label: "Dutch", value: "Dutch" },
                        { label: "Japanese", value: "Japanese" },
                        { label: "Chinese", value: "Chinese" },
                        { label: "Russian", value: "Russian" },
                        { label: "Serbian", value: "Serbian" },
                        { label: "Turkish", value: "Turkish" },
                        { label: "Tiếng Việt", value: "Tiếng Việt" },
                      ]}
                      value={language}
                      onChange={(value) => setLanguage(value)}
                    />
                    <InlineStack gap="200" wrap={false}>
                      <Button
                        fullWidth
                        variant="primary"
                        icon={MagicIcon}
                        onClick={handleGenerate}
                        loading={isGenerating}
                      >
                        Generate
                      </Button>
                    </InlineStack>
                  </BlockStack>
                </Grid.Cell>
                <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 8 }}>
                  <div
                    className={
                      styles.Ciwi_QuickGenerator_Result + " " + styles.hasResult
                    }
                  >
                    {!generateData && !isGenerating ? (
                      <div className={styles.Ciwi_QuickGenerator_Result_Empty}>
                        <Text as="p" variant="bodyMd">
                          Generated content will appear here
                        </Text>
                      </div>
                    ) : null}
                    {isGenerating ? (
                      <div
                        className={styles.Ciwi_QuickGenerator_Result_Loading}
                      >
                        <SkeletonBodyText lines={10} />
                      </div>
                    ) : null}
                    {generateData && !isGenerating ? (
                      <div
                        className={styles.Ciwi_QuickGenerator_Result_Content}
                      >
                        <div
                          className={styles.Ciwi_QuickGenerator_Result_Markdown}
                        >
                          <div
                            dangerouslySetInnerHTML={{ __html: generateData }}
                          />
                        </div>
                        <div
                          className={styles.Ciwi_QuickGenerator_Result_Feedback}
                        >
                          <InlineStack gap="100">
                            <Button icon={ClipboardIcon} variant="tertiary" />
                            <Button icon={ThumbsUpIcon} variant="tertiary" />
                            <Button icon={ThumbsDownIcon} variant="tertiary" />
                          </InlineStack>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Card>
        </Layout.Section> */}
      </Layout>
    </Page>
  );
};

export default Index;
