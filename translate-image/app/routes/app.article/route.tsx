import { useEffect, useRef, useState } from "react";
import { Badge, Layout, Page, Pagination, Thumbnail } from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import {
  ArrowLeftIcon,
  NoteIcon,
  SortIcon,
  ImageIcon,
} from "@shopify/polaris-icons";
import { UploadOutlined, SearchOutlined } from "@ant-design/icons";
import { Table, Button, Tabs, Tag, Input, Flex, Card, Typography } from "antd";

import { useTranslation } from "react-i18next";
import { useNavigate, useFetcher, useLoaderData } from "@remix-run/react";

import SortPopover from "~/routes/app.management/conponents/SortPopover";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "~/store";
import { setLastPageCursorInfo } from "~/store/modules/productSlice";
import { ColumnsType } from "antd/es/table";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
const { Text } = Typography;
export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const loading = JSON.parse(formData.get("loading") as string);
  const articleFetcher = JSON.parse(formData.get("articleFetcher") as string);

  try {
    switch (true) {
      case !!loading:
        try {
          console.log("loading: ", loading);
          const { lastRequestCursor, direction } = loading;
          const loadData = await admin.graphql(
            `{
              articles(first: 10) {
                edges {
                  node {
                    id
                    title
                    handle
                    blog { id title }
                    image { id altText url }
                    author
                    publishedAt
                    bodySummary
                    bodyHtml
                  }
                }
                pageInfo {
                  hasNextPage
                  endCursor
                }
              }
            }`,
          );

          const response = await loadData.json();
          // const data = json.data.blogs.nodes.map((data: any) => data);
          console.log("dada", response);

          console.log("blog response:", response);
          return response;
        } catch (error) {
          console.error("Error action loadData productImage:", error);
          return json({
            resonse: null,
          });
        }
      case !!articleFetcher:
        try {
          console.log("articleFetcher: ", articleFetcher);
          const response = await admin.graphql(
            `#graphql
              query ArticleShow($id: ID!) {
                article(id: $id) {
                  id
                  author {
                    name
                  }
                  createdAt
                  handle
                }
              }`,
            {
              variables: {
                id: articleFetcher.id,
              },
            },
          );
          const json = await response.json();
          console.log("dada", json);

          console.log("blog response:", json);
          return json;
        } catch (error) {
          console.error("Error action loadData productImage:", error);
          return json({
            resonse: null,
          });
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

export default function Index() {
  const loadFetcher = useFetcher<any>();
  const articleFetcher = useFetcher<any>();
  const { t } = useTranslation();
  const [blogsData, setBlogsData] = useState<any[]>([]);
  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify({}));
    loadFetcher.submit(formData, { method: "POST" });
  }, []);
  useEffect(() => {
    if (loadFetcher.data) {
      console.log(loadFetcher.data);
      setBlogsData(loadFetcher.data);
    }
  }, [loadFetcher.data]);
  useEffect(() => {
    if (articleFetcher.data) {
      console.log(articleFetcher.data);
    }
  }, [articleFetcher.data]);
  const handleQueryArticle = (id: string) => {
    const formData = new FormData();
    formData.append("articleFetcher", JSON.stringify({ id }));
    articleFetcher.submit(formData, { method: "POST" });
  };
  return (
    <Page>
      {blogsData.length > 0 &&
        blogsData?.map((item) => {
          return (
            <Flex vertical gap={8}>
              <Text>{item.title}</Text>
              <Button onClick={() => handleQueryArticle(item.id)}>
                查询文章数据
              </Button>
            </Flex>
          );
        })}
    </Page>
  );
}
