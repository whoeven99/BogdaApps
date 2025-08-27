import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Select,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../../shopify.server";
import { Upload, Skeleton } from "antd";
import type { RcFile, UploadProps } from "antd/es/upload/interface";
import { Input, Pagination } from "antd";
import { useTranslation } from "react-i18next";
import AdTemplateSection from "./components/AdTemplateSection";
import RecentProjectsSection from "./components/RecentProjectsSection";
import { getAdTemplates, getRecentProjects } from "app/api/javaServer";
import { json } from "@remix-run/node";
import styles from "./style.module.css";
type ActionResponse = {
  imageUrl?: string;
  error?: string;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const adminAuthResult = await authenticate.admin(request);
  return { shop: adminAuthResult.session.shop };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  try {
    const formData = await request.formData();
    const loading = JSON.parse((formData.get("loading") as string) || "null");
    switch (true) {
      case !!loading:
        let [recentProjects, adTemplates] = await Promise.all([
          getRecentProjects(),
          getAdTemplates(),
        ]);
        return { result: { recentProjects, adTemplates } };
      default:
        console.log("Default case reached");
        break;
    }
  } catch (error) {
    console.error("Error parsing loading:", error);
    return { error: "Invalid loading data" };
  }

  return { error: "No file or template selected" };
};

const generateImage = async (
  file: RcFile,
  template: string,
): Promise<string> => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  await new Promise((resolve) => (reader.onload = resolve));
  const base64String = reader.result as string;
  return `https://via.placeholder.com/300?text=${encodeURIComponent(
    `Fusion of ${template} with user image`,
  )}`;
};

export default function ImageGenerator() {
  const { shop }: any = useLoaderData<typeof loader>();
  const fetcher = useFetcher<ActionResponse>();
  const shopify = useAppBridge();
  const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";
  const generatedImageUrl = fetcher.data?.imageUrl;
  const error = fetcher.data?.error;
  const { t } = useTranslation();

  const [fileList, setFileList] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("template1");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const loadingFetcher = useFetcher<any>();
  const navigate = useNavigate(); // 模拟广告模板数据
  const [adTemplates, setAdTemplates] = useState<any[]>([]);

  // 模拟最近项目数据
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  useEffect(() => {
    if (generatedImageUrl) {
      shopify.toast.show("Image generated successfully!");
    } else if (error) {
      shopify.toast.show(error, { isError: true });
    }
  }, [generatedImageUrl, error, shopify]);
  useEffect(() => {
    console.log("Loading effect triggered");

    loadingFetcher.submit(
      {
        loading: JSON.stringify({
          aa: "页面初始化",
        }),
      },
      {
        method: "POST",
        action: "",
      },
    );
  }, []);
  useEffect(() => {
    if (loadingFetcher.state === "submitting") {
      console.log("Fetcher submitting...");
    }
    if (loadingFetcher.state === "idle" && loadingFetcher.data) {
      console.log("Loading fetcher data:", loadingFetcher.data);
      setAdTemplates(loadingFetcher.data.result?.adTemplates || []);
      setRecentProjects(loadingFetcher.data.result?.recentProjects || []);
      console.log(
        "Ad Templates set:",
        loadingFetcher.data.result?.adTemplates || [],
      );
      console.log(
        "Recent Projects set:",
        loadingFetcher.data.result?.recentProjects || [],
      );
    }
    if (loadingFetcher.data?.error) {
      console.error("Fetcher error:", loadingFetcher.data.error);
    }
  }, [loadingFetcher]);
  const handleStartFree = () => {};

  return (
    <div className={styles.container}>
      <TitleBar title="Image Fusion Generator" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Creative Studio
              </Text>
              <Text variant="bodyMd" as="p">
                See how your product image pairs with ad templates to create
                custom ads. Book a free 1:1 call to explore Creative Studio.
              </Text>
              <InlineStack gap="200">
                <Button
                  variant="primary"
                  tone="critical"
                  onClick={handleStartFree}
                >
                  Start free 7-day trial
                </Button>
                <Button>+650</Button>
                <Button variant="tertiary">Generate image ads</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          {recentProjects?.length > 0 ? (
            <RecentProjectsSection projects={recentProjects} />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 16,
              }}
            >
              {recentProjects ? (
                <Card>
                  <Text as="p">No recent projects available.</Text>
                </Card>
              ) : (
                [1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <Skeleton.Image
                      style={{ width: 120, height: 120, margin: "0 auto" }}
                      active
                    />
                    <Skeleton paragraph={{ rows: 1, width: "80%" }} active />
                  </Card>
                ))
              )}
            </div>
          )}
        </Layout.Section>

        <Layout.Section>
          {adTemplates?.length > 0 ? (
            <AdTemplateSection templates={adTemplates} />
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 16,
              }}
            >
              {adTemplates ? (
                <Card>
                  <Text as="p">No ad templates available.</Text>
                </Card>
              ) : (
                [1, 2, 3, 4].map((i) => (
                  <Card key={i}>
                    <Skeleton.Image
                      style={{ width: 120, height: 120, margin: "0 auto" }}
                      active
                    />
                    <Skeleton paragraph={{ rows: 1, width: "80%" }} active />
                  </Card>
                ))
              )}
            </div>
          )}
        </Layout.Section>
      </Layout>
    </div>
  );
}
