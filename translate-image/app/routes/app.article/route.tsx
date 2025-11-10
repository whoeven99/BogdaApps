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
          console.log("response:", response);
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
  const languageFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();

  const [productsStartCursor, setProductsStartCursor] = useState("");
  const [productsEndCursor, setProductsEndCursor] = useState("");
  const [lastRequestCursor, setLastRequestCursor] = useState<any>(null);
  const [productImageData, setProductImageData] = useState<any>([]);
  const [tableDataLoading, setTableDataLoading] = useState(true);

  const [articleData, setArticleData] = useState<any>([]);
  const [selectedKey, setSelectedKey] = useState("");

  const [productsHasNextPage, setProductsHasNextPage] = useState(false);
  const [productsHasPreviousPage, setProductsHasPreviousPage] = useState(false);

  const { t } = useTranslation();
  const { Text } = Typography;
  const navigate = useNavigate();

  const [activeKey, setActiveKey] = useState("ALL");
  const [searchText, setSearchText] = useState<string>("");
  const timeoutIdRef = useRef<any>(true);

  const [sortKey, setSortKey] = useState("CREATED_AT");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const loadFetcher = useFetcher<any>();
  const articleFetcher = useFetcher<any>();
  const [blogsData, setBlogsData] = useState<any[]>([]);
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
      title: t("Article title"),
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
      title: t("Status"),
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
    console.log("Viewing record:", record);
    // navigate(`/app/products/${productId}`);
  }
  useEffect(() => {
    const formData = new FormData();
    formData.append("loading", JSON.stringify({}));
    loadFetcher.submit(formData, { method: "POST" });
  }, []);
  useEffect(() => {
    if (loadFetcher.data) {
      // console.log(loadFetcher.data);
      setArticleData(loadFetcher.data?.data);
      setTableDataLoading(false);
      // setBlogsData(loadFetcher.data);
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
  const handlePreProductPage = () => {
    if (productsFetcher.state !== "idle") {
      return;
    }

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
    if (productsFetcher.state !== "idle") {
      return;
    }

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

  const handleChangeStatusTab = (key: string) => {
    setActiveKey(key);
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            cursor: "",
            query: searchText,
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
            status: activeKey,
            sortKey,
            reverse: sortOrder === "asc" ? false : true,
          }),
        },
        {
          method: "post",
          action: "/app/management",
        },
      );
    }, 100);
  };
  const handleSortProduct = (key: string, order: "asc" | "desc") => {
    setSortKey(key);
    setSortOrder(order);
    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            cursor: "",
            query: searchText,
            sortKey: key,
            status: activeKey,
            reverse: order === "asc" ? false : true,
          }),
        },
        {
          method: "post",
          action: "/app/management",
        },
      );
    }, 100);
  };
  return (
    <Page>
      {/* {blogsData.length > 0 &&
        blogsData?.map((item) => {
          return (
            <Flex key={item.id} vertical gap={8}>
              <Text>{item.title}</Text>
              <Button onClick={() => handleQueryArticle(item.id)}>
                查询文章数据
              </Button>
            </Flex>
          );
        })} */}
      <Card styles={{ body: { padding: "12px 24px" } }}>
        <Flex align="center" justify="space-between">
          <Tabs
            activeKey={activeKey}
            onChange={(key) => handleChangeStatusTab(key)}
            defaultActiveKey="all"
            type="line"
            style={{ width: "40%" }}
            items={[
              { label: t("All"), key: "ALL" },
              {
                label: t("Active"),
                key: "ACTIVE",
              },
              {
                label: t("Draft"),
                key: "DRAFT",
              },
              {
                label: t("Archived"),
                key: "ARCHIVED",
              },
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
            />
            {/* <Button onClick={() => console.log(lastPageCursorInfo)}>
                          输出store存储数据
                        </Button> */}
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
            rowKey={(record) => record.key} // ✅ 建议加上 key，避免警告
            loading={tableDataLoading}
            onRow={(record) => ({
              onClick: (e) => {
                // 排除点击按钮等交互元素
                if ((e.target as HTMLElement).closest("button")) return;
                const productId = record.key.split("/").pop();
                navigate(`/app/products/${productId}`);
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
            hasPrevious={productsHasPreviousPage}
            onPrevious={handlePreProductPage}
            hasNext={productsHasNextPage}
            onNext={handleNextProductPage}
          />
        </div>
      </div>
    </Page>
  );
}
