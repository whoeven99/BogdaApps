import { LoaderFunctionArgs } from "@remix-run/node";
import {
  ActionList,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Grid,
  InlineStack,
  Page,
  Popover,
  Spinner,
  Tabs,
} from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import { useCallback, useEffect, useMemo, useState } from "react";
import TemplateCard from "app/components/templateCard";
import { Modal, TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  AddOfficialOrUserTemplate,
  DeleteUserTemplate,
  GetAllTemplateData,
  GetTemplateByShopName,
  PreviewExampleDataByTemplateId,
} from "app/api/JavaServer";
import CardSkeleton from "app/components/cardSkeleton";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { session } = adminAuthResult;

  const sort = request.url.split("sort=")[1];

  return {
    shop: session.shop,
    server: process.env.SERVER_URL,
    sort: Number(sort),
  };
};

const Index = () => {
  const navigate = useNavigate();

  const { shop, server, sort } = useLoaderData<typeof loader>();
  const [mainSelected, setMainSelected] = useState(sort || 0);
  const [secondarySelected, setSecondarySelected] = useState(0);
  const [descriptionSelected, setDescriptionSelected] = useState<
    "description" | "seo"
  >("description");
  const [templateTypeSelected, setTemplateTypeSelected] = useState<
    string | null
  >(null);
  const [previewModal, setPreviewModal] = useState<any>(null);
  const [popoverOneActive, setPopoverOneActive] = useState<string | null>(null);
  const [popoverTwoActive, setPopoverTwoActive] = useState<string | null>(null);
  const [templates, setTemplates] = useState<any>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCardLoading, setIsCardLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState<number[]>([]);
  // const filterTemplates = useMemo(() => {
  //   if (!templates) return [];
  //   const list = templates[mainSelected]?.[descriptionSelected] || [];
  //   return list.filter((template: any) => {
  //     if (secondarySelected === 0) return true; // "All" 标签
  //     if (secondarySelected === 1) return template.type === "product"; // "Product" 标签
  //     if (secondarySelected === 2) return template.type === "collection"; // "Collection" 标签
  //     return true;
  //   });
  // }, [templates, mainSelected, descriptionSelected, secondarySelected]);

  useEffect(() => {
    setIsLoading(false);
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    setIsCardLoading(true);
    setTemplates([]);
    const fetchTemplates = async () => {
      let response: any = null;
      if (mainSelected) {
        const res = await GetTemplateByShopName({
          server: server as string,
          shop: shop as string,
          pageType:
            secondarySelected == 0
              ? null
              : secondarySelected == 1
                ? "product"
                : "collection",
          contentType: descriptionSelected,
        });
        response = res;
      } else {
        const res = await GetAllTemplateData({
          server: server as string,
          shop: shop as string,
          pageType:
            secondarySelected == 0
              ? null
              : secondarySelected == 1
                ? "product"
                : "collection",
          contentType: descriptionSelected,
          templateType: mainSelected ? null : templateTypeSelected,
          templateClass: false,
        });
        response = res?.response;
      }
      setTemplates(response);
      setIsCardLoading(false);
    };
    fetchTemplates();
  }, [
    mainSelected,
    secondarySelected,
    descriptionSelected,
    templateTypeSelected,
  ]);

  const handleAdd = async ({ id }: { id: number }) => {
    setButtonLoading([...buttonLoading, id]);
    const response = await AddOfficialOrUserTemplate({
      server: server as string,
      shop: shop as string,
      templateId: id,
      templateType: false,
    });
    if (response.success) {
      setTemplates(
        templates.map((item: any) => {
          if (item.id == id) {
            return {
              ...item,
              isUserUsed: true,
            };
          }
          return item;
        }),
      );
    }
    setButtonLoading(buttonLoading.filter((id) => id !== id));
  };

  const handleDelete = async ({ id }: { id: number }) => {
    setButtonLoading([...buttonLoading, id]);
    const response = await DeleteUserTemplate({
      server: server as string,
      shop: shop as string,
      id: id,
      templateClass: false,
    });
    if (response.success) {
      shopify.toast.show("Template deleted successfully");
      setTemplates(templates.filter((item: any) => item.id !== id));
    }
    setButtonLoading(buttonLoading.filter((id) => id !== id));
  };

  const togglePopoverOneActive = (id: string) => () => {
    setPopoverOneActive((activeId) => (activeId !== id ? id : null));
  };

  const togglePopoverTwoActive = (id: string) => () => {
    setPopoverTwoActive((activeId) => (activeId !== id ? id : null));
  };

  const handleDescriptionChange = (value: "description" | "seo") => {
    setDescriptionSelected(value);
    setPopoverOneActive(null);
  };

  const handleTemplateTypeChange = (value: string | null) => {
    setTemplateTypeSelected(value);
    setPopoverTwoActive(null);
  };

  const handleMainTabChange = useCallback((selectedTabIndex: number) => {
    setTemplates([]);
    setMainSelected(selectedTabIndex);
  }, []);

  const handleSecondaryTabChange = useCallback(
    (selectedTabIndex: number) => setSecondarySelected(selectedTabIndex),
    [],
  );

  const handlePreview = async (template: any) => {
    const response = await PreviewExampleDataByTemplateId({
      server: server as string,
      shop: shop as string,
      templateId: template.id,
    });

    setPreviewModal({
      ...template,
      templateData: response?.response,
    });
    shopify.modal.show("preview-modal");
  };

  const handleClosePreview = () => {
    setPreviewModal(null);
    shopify.modal.hide("preview-modal");
  };

  const mainTabs = [
    {
      id: "system-templates",
      content: "System",
      accessibilityLabel: "System",
      panelID: "system-templates",
    },
    {
      id: "custom-templates",
      content: "Custom",
      panelID: "custom-templates",
    },
  ];

  const secondaryTabs = [
    {
      id: "all-templates",
      content: "All",
      accessibilityLabel: "All",
      panelID: "all-templates",
    },
    {
      id: "product-templates",
      content: "Product",
      panelID: "product-templates",
    },
    {
      id: "collection-templates",
      content: "Collection",
      panelID: "collection-templates",
    },
  ];

  return (
    <Page
      title="Template"
      subtitle="Customize and organize your content generation templates"
      compactTitle
      primaryAction={{
        content: "Create template",
        onAction: () => {
          navigate("/app/template/create");
        },
      }}
    >
      {isLoading ? (
        <CardSkeleton height="500px" />
      ) : (
        <Card background="bg-surface" padding={"200"}>
          <Box>
            <Tabs
              tabs={mainTabs}
              selected={mainSelected}
              onSelect={handleMainTabChange}
            />
          </Box>
          {isMobile ? (
            <BlockStack>
              <Tabs
                tabs={secondaryTabs}
                selected={secondarySelected}
                onSelect={handleSecondaryTabChange}
              />
              <Box paddingInlineEnd={{ xs: "200" }}>
                <ButtonGroup>
                  <Popover
                    active={popoverOneActive == "popover1"}
                    preferredAlignment="right"
                    activator={
                      <Button
                        variant="tertiary"
                        onClick={togglePopoverOneActive("popover1")}
                        disclosure
                      >
                        {templateTypeSelected || "All"}
                      </Button>
                    }
                    autofocusTarget="first-node"
                    onClose={togglePopoverOneActive("popover1")}
                  >
                    <ActionList
                      actionRole="menuitem"
                      items={[
                        {
                          content: "All",
                          onAction: () => handleTemplateTypeChange(null),
                        },
                        {
                          content: "Beauty & Skincare",
                          onAction: () =>
                            handleTemplateTypeChange("Beauty & Skincare"),
                        },
                        {
                          content: "Fashion & Apparel",
                          onAction: () =>
                            handleTemplateTypeChange("Fashion & Apparel"),
                        },
                        {
                          content: "Health & Wellness",
                          onAction: () =>
                            handleTemplateTypeChange("Health & Wellness"),
                        },
                        {
                          content: "Home & Living",
                          onAction: () =>
                            handleTemplateTypeChange("Home & Living"),
                        },
                        {
                          content: "Electronics",
                          onAction: () =>
                            handleTemplateTypeChange("Electronics"),
                        },
                        {
                          content: "Car Accessories",
                          onAction: () =>
                            handleTemplateTypeChange("Car Accessories"),
                        },
                        {
                          content: "Furniture",
                          onAction: () => handleTemplateTypeChange("Furniture"),
                        },
                        {
                          content: "Kitchen Supplies",
                          onAction: () =>
                            handleTemplateTypeChange("Kitchen Supplies"),
                        },
                        {
                          content: "Jewelry & Accessories",
                          onAction: () =>
                            handleTemplateTypeChange("Jewelry & Accessories"),
                        },
                        {
                          content: "Makeup",
                          onAction: () => handleTemplateTypeChange("Makeup"),
                        },
                        {
                          content: "Headphones",
                          onAction: () =>
                            handleTemplateTypeChange("Headphones"),
                        },
                        {
                          content: "Baby & Kids",
                          onAction: () =>
                            handleTemplateTypeChange("Baby & Kids"),
                        },
                        {
                          content: "Sports & Outdoors",
                          onAction: () =>
                            handleTemplateTypeChange("Sports & Outdoors"),
                        },
                        {
                          content: "Pet Supplies",
                          onAction: () =>
                            handleTemplateTypeChange("Pet Supplies"),
                        },
                        {
                          content: "Women’s Clothing",
                          onAction: () =>
                            handleTemplateTypeChange("Women’s Clothing"),
                        },
                        {
                          content: "Shoes",
                          onAction: () => handleTemplateTypeChange("Shoes"),
                        },
                        {
                          content: "Home Decor",
                          onAction: () =>
                            handleTemplateTypeChange("Home Decor"),
                        },
                        {
                          content: "Smartwatches",
                          onAction: () =>
                            handleTemplateTypeChange("Smartwatches"),
                        },
                        {
                          content: "Men’s Clothing",
                          onAction: () =>
                            handleTemplateTypeChange("Men’s Clothing"),
                        },
                        {
                          content: "Bags & Luggage",
                          onAction: () =>
                            handleTemplateTypeChange("Bags & Luggage"),
                        },
                        {
                          content: "Skincare",
                          onAction: () => handleTemplateTypeChange("Skincare"),
                        },
                      ]}
                    />
                  </Popover>
                  <Popover
                    active={popoverTwoActive == "popover2"}
                    preferredAlignment="right"
                    activator={
                      <Button
                        variant="tertiary"
                        onClick={togglePopoverTwoActive("popover2")}
                        disclosure
                      >
                        {descriptionSelected == "seo"
                          ? "SEO Description"
                          : "Description"}
                      </Button>
                    }
                    autofocusTarget="first-node"
                    onClose={togglePopoverTwoActive("popover2")}
                  >
                    <ActionList
                      actionRole="menuitem"
                      items={[
                        {
                          content: "Description",
                          onAction: () =>
                            handleDescriptionChange("description"),
                        },
                        {
                          content: "SEO Description",
                          onAction: () => handleDescriptionChange("seo"),
                        },
                      ]}
                    />
                  </Popover>
                </ButtonGroup>
              </Box>
            </BlockStack>
          ) : (
            <InlineStack
              align="space-between"
              wrap={false}
              direction="row"
              blockAlign="center"
            >
              <Tabs
                tabs={[
                  {
                    id: "all-templates",
                    content: "All",
                    accessibilityLabel: "All",
                    panelID: "all-templates",
                  },
                  {
                    id: "product-templates",
                    content: "Product",
                    panelID: "product-templates",
                  },
                  {
                    id: "collection-templates",
                    content: "Collection",
                    panelID: "collection-templates",
                  },
                ]}
                selected={secondarySelected}
                onSelect={handleSecondaryTabChange}
              />
              <Box paddingInlineEnd={{ xs: "200" }}>
                <ButtonGroup>
                  {!mainSelected && (
                    <Popover
                      active={popoverOneActive == "popover1"}
                      preferredAlignment="right"
                      activator={
                        <Button
                          variant="tertiary"
                          onClick={togglePopoverOneActive("popover1")}
                          disclosure
                        >
                          {templateTypeSelected || "All"}
                        </Button>
                      }
                      autofocusTarget="first-node"
                      onClose={togglePopoverOneActive("popover1")}
                    >
                      <ActionList
                        actionRole="menuitem"
                        items={[
                          {
                            content: "All",
                            onAction: () => handleTemplateTypeChange(null),
                          },
                          {
                            content: "Beauty & Skincare",
                            onAction: () =>
                              handleTemplateTypeChange("Beauty & Skincare"),
                          },
                          {
                            content: "Fashion & Apparel",
                            onAction: () =>
                              handleTemplateTypeChange("Fashion & Apparel"),
                          },
                          {
                            content: "Health & Wellness",
                            onAction: () =>
                              handleTemplateTypeChange("Health & Wellness"),
                          },
                          {
                            content: "Home & Living",
                            onAction: () =>
                              handleTemplateTypeChange("Home & Living"),
                          },
                          {
                            content: "Electronics",
                            onAction: () =>
                              handleTemplateTypeChange("Electronics"),
                          },
                          {
                            content: "Car Accessories",
                            onAction: () =>
                              handleTemplateTypeChange("Car Accessories"),
                          },
                          {
                            content: "Furniture",
                            onAction: () =>
                              handleTemplateTypeChange("Furniture"),
                          },
                          {
                            content: "Kitchen Supplies",
                            onAction: () =>
                              handleTemplateTypeChange("Kitchen Supplies"),
                          },
                          {
                            content: "Jewelry & Accessories",
                            onAction: () =>
                              handleTemplateTypeChange("Jewelry & Accessories"),
                          },
                          {
                            content: "Makeup",
                            onAction: () => handleTemplateTypeChange("Makeup"),
                          },
                          {
                            content: "Headphones",
                            onAction: () =>
                              handleTemplateTypeChange("Headphones"),
                          },
                          {
                            content: "Baby & Kids",
                            onAction: () =>
                              handleTemplateTypeChange("Baby & Kids"),
                          },
                          {
                            content: "Sports & Outdoors",
                            onAction: () =>
                              handleTemplateTypeChange("Sports & Outdoors"),
                          },
                          {
                            content: "Pet Supplies",
                            onAction: () =>
                              handleTemplateTypeChange("Pet Supplies"),
                          },
                          {
                            content: "Women’s Clothing",
                            onAction: () =>
                              handleTemplateTypeChange("Women’s Clothing"),
                          },
                          {
                            content: "Shoes",
                            onAction: () => handleTemplateTypeChange("Shoes"),
                          },
                          {
                            content: "Home Decor",
                            onAction: () =>
                              handleTemplateTypeChange("Home Decor"),
                          },
                          {
                            content: "Smartwatches",
                            onAction: () =>
                              handleTemplateTypeChange("Smartwatches"),
                          },
                          {
                            content: "Men’s Clothing",
                            onAction: () =>
                              handleTemplateTypeChange("Men’s Clothing"),
                          },
                          {
                            content: "Bags & Luggage",
                            onAction: () =>
                              handleTemplateTypeChange("Bags & Luggage"),
                          },
                          {
                            content: "Skincare",
                            onAction: () =>
                              handleTemplateTypeChange("Skincare"),
                          },
                        ]}
                      />
                    </Popover>
                  )}
                  <Popover
                    active={popoverTwoActive == "popover2"}
                    preferredAlignment="right"
                    activator={
                      <Button
                        variant="tertiary"
                        onClick={togglePopoverTwoActive("popover2")}
                        disclosure
                      >
                        {descriptionSelected == "seo"
                          ? "SEO Description"
                          : "Description"}
                      </Button>
                    }
                    autofocusTarget="first-node"
                    onClose={togglePopoverTwoActive("popover2")}
                  >
                    <ActionList
                      actionRole="menuitem"
                      items={[
                        {
                          content: "Description",
                          onAction: () =>
                            handleDescriptionChange("description"),
                        },
                        {
                          content: "SEO Description",
                          onAction: () => handleDescriptionChange("seo"),
                        },
                      ]}
                    />
                  </Popover>
                </ButtonGroup>
              </Box>
            </InlineStack>
          )}
          {isCardLoading ? (
            <Box paddingBlockStart={"2000"} paddingBlockEnd={"2000"}>
              <InlineStack align="center" direction="row" wrap={true}>
                <BlockStack
                  gap="200"
                  align="center"
                  inlineAlign="center"
                  reverseOrder
                >
                  <Spinner />
                </BlockStack>
              </InlineStack>
            </Box>
          ) : templates?.length > 0 ? (
            <Box padding={"200"}>
              <Grid>
                {templates.map((template: any) => (
                  <Grid.Cell
                    key={template.id}
                    columnSpan={{ xs: 6, sm: 3, md: 3, lg: 4, xl: 4 }}
                  >
                    <TemplateCard
                      id={template.id}
                      title={template.templateTitle}
                      description={template.templateDescription}
                      content={template.templateData}
                      loading={buttonLoading.includes(template.id)}
                      added={template.isUserUsed}
                      type={template.templateType}
                      isSystem={mainSelected == 0 ? true : false}
                      handleDelete={() => handleDelete({ id: template.id })}
                      handleAdd={() => handleAdd({ id: template.id })}
                      onClick={() => handlePreview(template)}
                    />
                  </Grid.Cell>
                ))}
              </Grid>
            </Box>
          ) : (
            <Box paddingBlockStart={"2000"} paddingBlockEnd={"2000"}>
              <InlineStack align="center" direction="row" wrap={true}>
                <BlockStack
                  gap="200"
                  align="center"
                  inlineAlign="center"
                  reverseOrder
                >
                  <p>No templates found</p>
                </BlockStack>
              </InlineStack>
            </Box>
          )}
        </Card>
      )}
      <Modal id="preview-modal">
        <Box padding="400">
          <div
            dangerouslySetInnerHTML={{
              __html: previewModal?.templateData,
            }}
          />
        </Box>
        <TitleBar title={previewModal?.templateTitle}>
          <button onClick={handleClosePreview}>Close</button>
        </TitleBar>
      </Modal>
    </Page>
  );
};

export function filterAndMapTemplates(
  data: any[],
  shopName: string,
  seo: number,
) {
  return data
    .filter(
      (item) =>
        (shopName === "system" ? !item.templateClass : item.templateClass) &&
        item.templateSeo === seo,
    )
    .map((item) => ({
      id: item.id,
      title: item.templateTitle,
      description: item.templateDescription,
      content: item.templateData,
      type: "product",
    }));
}

export default Index;
