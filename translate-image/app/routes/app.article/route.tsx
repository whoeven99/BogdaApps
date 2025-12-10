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

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "~/store";
import { setLastPageCursorInfo } from "~/store/modules/articleSlice";
import { ColumnsType } from "antd/es/table";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import SortPopover from "~/components/SortPopover";
import ScrollNotice from "~/components/ScrollNotice";
import useReport from "scripts/eventReport";
const { Text, Title } = Typography;
export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const loading = JSON.parse(formData.get("loading") as string);
  const articleStartCursor: any = JSON.parse(
    formData.get("articleStartCursor") as string,
  );
  const articleEndCursor: any = JSON.parse(
    formData.get("articleEndCursor") as string,
  );
  const articleFetcher = JSON.parse(formData.get("articleFetcher") as string);

  try {
    switch (true) {
      case !!loading:
        try {
          const loadData = await admin.graphql(
            `query GetArticles {
              articles(first: 10) {
                nodes {
                  id
                  image {
                    url
                    id
                    altText
                  }
                  title
                  isPublished
                  author {
                    name
                  }
                  blog {
                    title
                  }
                  publishedAt
                  updatedAt
                }
                pageInfo {
                  endCursor
                  hasNextPage
                  hasPreviousPage
                  startCursor
                }
              }
            }`,
          );

          const response = await loadData.json();
          const articles = response?.data?.articles;
          if (articles?.nodes?.length > 0) {
            const data = articles?.nodes?.map((item: any) => item);
            return json({
              data,
              endCursor: articles?.pageInfo?.endCursor,
              hasNextPage: articles?.pageInfo?.hasNextPage,
              hasPreviousPage: articles?.pageInfo?.hasPreviousPage,
              startCursor: articles?.pageInfo?.startCursor,
            });
          } else {
            return json({
              data: [],
              endCursor: "",
              hasNextPage: "",
              hasPreviousPage: "",
              startCursor: "",
            });
          }
        } catch (error) {
          console.error("Error action loadData productImage:", error);
          return json({
            resonse: null,
          });
        }
      case !!articleStartCursor:
        try {
          const loadData = await admin.graphql(
            `query GetArticles($startCursor: String, $query: String, $sortKey: ArticleSortKeys, $reverse: Boolean) {
              articles(last: 10 ,before: $startCursor, query: $query, sortKey: $sortKey, reverse: $reverse) {
                nodes {
                  id
                  image {
                    url
                    id
                    altText
                  }
                  title
                  isPublished
                  author {
                    name
                  }
                  blog {
                    title
                  }
                  publishedAt
                  updatedAt
                }
                pageInfo {
                  endCursor
                  hasNextPage
                  hasPreviousPage
                  startCursor
                }
              }
            }`,
            {
              variables: {
                startCursor: articleStartCursor?.cursor
                  ? articleStartCursor?.cursor
                  : undefined,
                query: articleStartCursor.query,
                sortKey: articleStartCursor?.sortKey || "AUTHOR",
                reverse: articleStartCursor?.reverse ?? false,
              },
            },
          );

          const response = await loadData.json();
          const articles = response?.data?.articles;
          if (articles?.nodes?.length > 0) {
            const data = articles?.nodes?.map((item: any) => item);
            return json({
              data,
              endCursor: articles?.pageInfo?.endCursor,
              hasNextPage: articles?.pageInfo?.hasNextPage,
              hasPreviousPage: articles?.pageInfo?.hasPreviousPage,
              startCursor: articles?.pageInfo?.startCursor,
            });
          } else {
            return json({
              data: [],
              endCursor: "",
              hasNextPage: "",
              hasPreviousPage: "",
              startCursor: "",
            });
          }
        } catch (error) {
          console.error("Error action productStartCursor productImage:", error);
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      case !!articleEndCursor:
        try {
          const loadData = await admin.graphql(
            `query GetArticles($endCursor: String, $query: String, $sortKey: ArticleSortKeys, $reverse: Boolean) {
              articles(first: 10, after: $endCursor, query: $query, sortKey: $sortKey, reverse: $reverse) {
                nodes {
                  id
                  image {
                    url
                    id
                    altText
                  }
                  title
                  isPublished
                  author {
                    name
                  }
                  blog {
                    title
                  }
                  publishedAt
                  updatedAt
                  body
                }
                pageInfo {
                  endCursor
                  hasNextPage
                  hasPreviousPage
                  startCursor
                }
              }
            }`,
            {
              variables: {
                endCursor: articleEndCursor?.cursor
                  ? articleEndCursor?.cursor
                  : undefined,
                query: articleEndCursor.query,
                sortKey: articleEndCursor?.sortKey || "AUTHOR",
                reverse: articleEndCursor?.reverse ?? false,
              },
            },
          );

          const response = await loadData.json();

          console.log("response end cursor:", response);
          const articles = response?.data?.articles;
          if (articles?.nodes?.length > 0) {
            const data = articles?.nodes?.map((item: any) => item);
            return json({
              data,
              endCursor: articles?.pageInfo?.endCursor,
              hasNextPage: articles?.pageInfo?.hasNextPage,
              hasPreviousPage: articles?.pageInfo?.hasPreviousPage,
              startCursor: articles?.pageInfo?.startCursor,
            });
          } else {
            return json({
              data: [],
              endCursor: "",
              hasNextPage: "",
              hasPreviousPage: "",
              startCursor: "",
            });
          }
        } catch (error) {
          console.error("Error action productStartCursor productImage:", error);
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
          });
        }
      case !!articleFetcher:
        try {
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
  const artilclesFetcher = useFetcher<any>();
  const { reportClick, report } = useReport();
  const [articlesStartCursor, setArticlesStartCursor] = useState("");
  const [articlesEndCursor, setArticlesEndCursor] = useState("");
  const [tableDataLoading, setTableDataLoading] = useState(true);

  const [articleData, setArticleData] = useState<any>([]);

  const [articlesHasNextPage, setArticlesHasNextPage] = useState(false);
  const [articlesHasPreviousPage, setArticlesHasPreviousPage] = useState(false);

  const { t } = useTranslation();
  const { Text } = Typography;
  const navigate = useNavigate();

  const [activeKey, setActiveKey] = useState("ALL");
  const [searchText, setSearchText] = useState<string>("");
  const timeoutIdRef = useRef<any>(true);
  const dispatch = useDispatch<AppDispatch>();
  const [sortKey, setSortKey] = useState("UPDATED_AT");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const loadFetcher = useFetcher<any>();
  const sortOptions = [
    { label: "Title", value: "TITLE" },
    { label: "Author", value: "AUTHOR" },
    { label: "Blog Title", value: "BLOG_TITLE" },
    { label: "Published Time", value: "PUBLISHED_AT" },
    { label: "Updata Time", value: "UPDATED_AT" },
  ];
  const lastPageCursorInfo = useSelector(
    (state: RootState) => state.article.lastPageCursorInfo,
  );

  const panelColumns: ColumnsType<any> = [
    {
      // 不需要 dataIndex，用 render 直接取 item.node.title
      width: 100,
      render: (_: any, record: any) => {
        // console.log("record", record);
        return record.image ? (
          <Thumbnail
            source={record.image.url}
            size="large"
            alt={record.image.altText}
          />
        ) : (
          <Thumbnail source={ImageIcon} size="large" alt="Small document" />
        );
      },
      responsive: ["xs", "sm", "md", "lg", "xl", "xxl"], // ✅ 正确
      onCell: () => ({
        style: {
          padding: "4px 8px", // ✅ 控制上下、左右 padding
        },
      }),
    },
    {
      title: t("Title"),
      // 不需要 dataIndex，用 render 直接取 item.node.title
      // maxWidth: 250, // ✅ 指定列宽（单位是像素）
      render: (_: any, record: any) => (
        <Text
          className="hover-underline"
          style={{
            display: "inline-block",
            maxWidth: 550, // 给内部留点空隙
            whiteSpace: "normal", // ✅ 自动换行
            wordBreak: "break-word", // ✅ 超长单词也能换行
            lineHeight: 1.5,
            fontSize: "14px",

            // cursor:"pointer"
          }}
        >
          {record?.title || "未命名产品"}
        </Text>
      ),
      responsive: ["xs", "sm", "md", "lg", "xl", "xxl"], // ✅ 正确
      onCell: () => ({
        style: {
          padding: "4px 8px", // ✅ 控制上下、左右 padding
        },
      }),
    },
    {
      title: t("Author"),
      width: 110,
      render: (_: any, record: any) => {
        return <Text>{record.author.name}</Text>;
      },
      responsive: ["md", "lg", "xl", "xxl"], // ✅ 手机端隐藏
    },
    {
      title: t("Blog"),
      width: 110,
      render: (_: any, record: any) => {
        return <Text>{record.blog.title}</Text>;
      },
      responsive: ["md", "lg", "xl", "xxl"], // ✅ 手机端隐藏
    },
    {
      title: t("Visibility"),
      width: 110,
      render: (_: any, record: any) => {
        if (record?.isPublished) {
          return <Badge tone="success">{t("Published")}</Badge>;
        }
        return <Badge tone="attention">{t("UnPublished")}</Badge>;
      },
      responsive: ["md", "lg", "xl", "xxl"], // ✅ 手机端隐藏
    },
    {
      title: t("Action"),
      width: 150,
      render: (_: any, record: any) => (
        <Button onClick={() => handleView(record)}>{t("Manage")}</Button>
      ),
      responsive: ["md", "lg", "xl", "xxl"], // ✅ 手机端隐藏
    },
  ];
  function handleView(record: any): void {
    const articleId = record.id.split("/").pop();
    navigate(`/app/articles/${articleId}`);
  }
  useEffect(() => {
    const {
      lastRequestCursor,
      direction,
      searchText,
      sortOrder,
      sortKey,
      articlesHasNextPage,
      articlesHasPreviousPage,
      articlesStartCursor,
      articlesEndCursor,
    } = lastPageCursorInfo;
    // console.log("执行数据初始化操作", lastPageCursorInfo);

    setArticlesHasNextPage(articlesHasNextPage);
    setArticlesHasPreviousPage(articlesHasPreviousPage);
    setArticlesStartCursor(articlesStartCursor);
    setArticlesEndCursor(articlesEndCursor);
    setSortOrder(sortOrder);
    setSortKey(sortKey);
    // handleSortProduct(sortKey, sortOrder);
    setSearchText(searchText);
    const formData = new FormData();
    formData.append(
      direction === "next"
        ? "articleEndCursor"
        : direction === "prev"
          ? "articleStartCursor"
          : "articleEndCursor",
      JSON.stringify({
        cursor: lastRequestCursor,
        query: searchText,
        status: activeKey,
        sortKey,
        reverse: sortOrder === "asc" ? false : true,
      }),
    );
    loadFetcher.submit(formData, { method: "POST" });
  }, []);
  useEffect(() => {
    if (loadFetcher.data) {
      // console.log(loadFetcher.data);

      setArticlesHasNextPage(loadFetcher.data.hasNextPage);
      setArticlesHasPreviousPage(loadFetcher.data.hasPreviousPage);
      setArticlesStartCursor(loadFetcher.data.startCursor);
      setArticlesEndCursor(loadFetcher.data.endCursor);
      setArticleData(loadFetcher.data?.data);
      setTableDataLoading(false);
      // setBlogsData(loadFetcher.data);
    }
  }, [loadFetcher.data]);
  useEffect(() => {
    if (artilclesFetcher.data) {
      // console.log(artilclesFetcher.data);

      dispatch(
        setLastPageCursorInfo({
          articlesHasNextPage: artilclesFetcher.data.hasNextPage,
          articlesHasPreviousPage: artilclesFetcher.data.hasPreviousPage,
          articlesStartCursor: artilclesFetcher.data.startCursor,
          articlesEndCursor: artilclesFetcher.data.endCursor,
        }),
      );
      setArticlesHasNextPage(artilclesFetcher.data.hasNextPage);
      setArticlesHasPreviousPage(artilclesFetcher.data.hasPreviousPage);
      setArticlesStartCursor(artilclesFetcher.data.startCursor);
      setArticlesEndCursor(artilclesFetcher.data.endCursor);
      setArticleData(artilclesFetcher.data?.data);
    }
  }, [artilclesFetcher.data]);
  useEffect(() => {
    dispatch(
      setLastPageCursorInfo({
        searchText,
        sortOrder,
        sortKey,
      }),
    );
  }, [searchText, sortOrder, sortKey]);
  const handlePreProductPage = () => {
    if (artilclesFetcher.state !== "idle") {
      return;
    }
    dispatch(
      setLastPageCursorInfo({
        lastRequestCursor: articlesStartCursor,
        direction: "prev",
      }),
    );
    artilclesFetcher.submit(
      {
        articleStartCursor: JSON.stringify({
          cursor: articlesStartCursor,
          query: searchText,
          status: activeKey,
          sortKey,
          reverse: sortOrder === "asc" ? false : true,
        }),
      },
      {
        method: "post",
      },
    ); // 提交表单请求
  };
  const handleNextProductPage = () => {
    if (artilclesFetcher.state !== "idle") {
      return;
    }
    dispatch(
      setLastPageCursorInfo({
        lastRequestCursor: articlesEndCursor,
        direction: "next",
      }),
    );
    artilclesFetcher.submit(
      {
        articleEndCursor: JSON.stringify({
          cursor: articlesEndCursor,
          query: searchText,
          status: activeKey,
          sortKey,
          reverse: sortOrder === "asc" ? false : true,
        }),
      },
      {
        method: "post",
      },
    ); // 提交表单请求
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
    report(
      {
        searchValue: value,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "article_query_search",
    );
    // 清除上一次的定时器
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      artilclesFetcher.submit(
        {
          articleEndCursor: JSON.stringify({
            cursor: "",
            query: value,
            status: activeKey,
            sortKey,
            reverse: sortOrder === "asc" ? false : true,
          }),
        },
        {
          method: "post",
        },
      );
    }, 100);
  };
  const handleSortProduct = (key: string, order: "asc" | "desc") => {
    report(
      {
        sortKey: key,
        order: order,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "article_sort_article",
    );
    setSortKey(key);
    setSortOrder(order);
    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      artilclesFetcher.submit(
        {
          articleEndCursor: JSON.stringify({
            cursor: "",
            query: searchText,
            sortKey: key,
            status: activeKey,
            reverse: order === "asc" ? false : true,
          }),
        },
        {
          method: "post",
        },
      );
    }, 100);
  };
  return (
    <Page>
      <TitleBar title={t("Article images")}></TitleBar>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Title level={1} style={{ fontSize: "1.25rem" }}>
        {t("Article images")}
      </Title>
      <Card styles={{ body: { padding: "12px 24px" } }}>
        <Flex align="center" justify="space-between">
          <Tabs
            activeKey={activeKey}
            defaultActiveKey="all"
            type="line"
            // style={{ width: "40%" }}
            items={[
              { label: t("All"), key: "ALL" },
            ]}
          />

          <Flex align="center" justify="center" gap={20}>
            <Input
              placeholder={t("Search...")}
              value={searchText}
              onChange={(e) => handleSearch(e.target.value)}
              prefix={<SearchOutlined />}
            />
            <SortPopover
              onChange={(key, order) => handleSortProduct(key, order)}
              sortKeyProp={sortKey}
              sortOrderProp={sortOrder}
              sortOptions={sortOptions}
            />
          </Flex>
        </Flex>
      </Card>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          // height: "calc(100vh)", // 根据页面结构调整
          background: "#fff",
          flex: "1",
        }}
      >
        {/* 表格主体区域（可滚动） */}
        <div style={{ flex: 1, overflow: "auto" }}>
          <Table
            dataSource={articleData}
            columns={panelColumns}
            pagination={false}
            rowKey={(record) => record.id} // ✅ 建议加上 key，避免警告
            loading={tableDataLoading}
            onRow={(record) => ({
              onClick: (e) => {
                // 排除点击按钮等交互元素
                if ((e.target as HTMLElement).closest("button")) return;
                const articleId = record.id.split("/").pop();
                navigate(`/app/articles/${articleId}`);
              },
              style: { cursor: "pointer" },
            })}
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
            hasPrevious={articlesHasPreviousPage}
            onPrevious={handlePreProductPage}
            hasNext={articlesHasNextPage}
            onNext={handleNextProductPage}
          />
        </div>
      </div>
    </Page>
  );
}
