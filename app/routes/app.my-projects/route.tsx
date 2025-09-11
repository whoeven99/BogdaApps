import {
  Page,
  Layout,
  Card,
  Text,
  Button,
  BlockStack,
  InlineStack,
  TextField,
  Thumbnail,
  Badge,
} from "@shopify/polaris";
import { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { TitleBar } from "@shopify/app-bridge-react";
import { useEffect, useState, useRef } from "react";
import { authenticate } from "app/shopify.server";
import { useFetcher } from "@remix-run/react";
import { getRecentProjects } from "app/api/javaServer";
import { RecentProjects } from "../app._index/route";
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  console.log("shopaaa", shop);
  return { shop };
  // 这里可以放置数据加载的逻辑
};
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  console.log("shopaaa", shop);
  const formData = await request.formData();
  const searchFetcher = JSON.parse(formData.get("searchFetcher") as string) || null;
  try {
    if (searchFetcher) {
      const { input } = searchFetcher;
      const response = await getRecentProjects({shop});

      return { recentProjects: response.data };
      // 这里可以放置数据提交的逻辑
    }
  } catch (error) {
    console.error("Error occurred while processing searchFetcher:", error);
  }
};

export default function CreativeStudio() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceTimeout = useRef<NodeJS.Timeout>();
  const searchFetcher = useFetcher<any>();
  const [recentProjects, setRecentProjects] = useState<RecentProjects>();
  // 防抖逻辑
  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);
    return () => clearTimeout(debounceTimeout.current);
  }, [searchQuery]);
  useEffect(()=>{
    searchFetcher.submit({
      searchFetcher: JSON.stringify({
        input: debouncedQuery,
      })
    },{
      method: "post",
      action: "/app/my-projects",
    })
  },[])
  useEffect(()=>{
    if (searchFetcher.state === "idle" && searchFetcher.data) {
      setRecentProjects(searchFetcher.data.recentProjects);
    }
  },[searchFetcher])
  useEffect(() => {
    console.log("Debounced search query changed:", debouncedQuery);
  }, [debouncedQuery]);
  return (
    <Page title="My Projects" fullWidth>
      <TitleBar title="Promer AI: Creative Studio" />
      <Layout>
        {/* 顶部内容区域 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                My Projects
              </Text>
              <InlineStack gap="200" align="end">
                <Button variant="primary" tone="critical">
                  Start free 7-day trial
                </Button>
                <Badge tone="success">650</Badge>
                <Button variant="primary">+650</Button>
                <Button variant="primary">Generate image ads</Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* 搜索和项目区域 */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              {/* 搜索框 */}
              <TextField
                label="Search projects"
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search projects"
                autoComplete="off"
                prefix={<span />}
              />

              {/* 项目卡片 */}
              <InlineStack gap="400">
                {/* 第一个卡片 - Project limit reached */}
                <Card>
                  <BlockStack gap="200">
                    <Thumbnail
                      source="https://via.placeholder.com/200?text=Project+Limit"
                      alt="Project limit reached"
                    />
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Project limit reached
                    </Text>
                    <Button variant="tertiary" tone="critical">
                      Unlock more projects
                    </Button>
                  </BlockStack>
                </Card>

                {/* 第二个卡片 - Ad template */}
                <Card>
                  <BlockStack gap="200">
                    <Thumbnail
                      source="https://via.placeholder.com/200?text=Elevate+your+western+style"
                      alt="Elevate your western style"
                    />
                    <Text as="h3" variant="headingSm">
                      Elevate your western style.
                    </Text>
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Best-kept secret for your summer fashion statement
                      <br />
                      4.8 ★★★★☆ Loved by thousands of customers
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Edited 16 days ago
                    </Text>
                  </BlockStack>
                </Card>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
