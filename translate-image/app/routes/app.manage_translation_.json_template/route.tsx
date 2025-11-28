import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Icon,
  Layout,
  Page,
  Pagination,
  Thumbnail,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import {
  ArrowLeftIcon,
  NoteIcon,
  SortIcon,
  ImageIcon,
} from "@shopify/polaris-icons";
import { UploadOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Table,
  Button,
  Tabs,
  Tag,
  Input,
  Flex,
  Card,
  Typography,
  Affix,
} from "antd";

import { useTranslation } from "react-i18next";
import { useNavigate, useFetcher, useLoaderData } from "@remix-run/react";

import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "~/store";
import { setLastPageCursorInfo } from "~/store/modules/articleSlice";
import { ColumnsType } from "antd/es/table";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import SortPopover from "~/components/SortPopover";
const { Text, Title } = Typography;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const searchTerm = url.searchParams.get("language");

  return json({
    searchTerm,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;
  const formData = await request.formData();
  const startCursor: any = JSON.parse(formData.get("startCursor") as string);
  const endCursor: any = JSON.parse(formData.get("endCursor") as string);
  const findImageSrc = async (admin: any, fileName: string) => {
    const response = await admin.graphql(
      `query GetFile($query: String!) {
      files(query: $query, first: 1) {
        edges {
          node {
            preview {
              image {
                src
              }
            }
          }
        }
      }
    }`,
      { variables: { query: fileName } },
    );

    const parsed = await response.json();
    return parsed?.data?.files?.edges?.[0]?.node?.preview?.image?.src ?? null;
  };
  const fetchFileReferences = async (admin: any, nodes: any[]) => {
    // 扁平化所有 FILE_REFERENCE 项
    const fileItems = nodes.flatMap((node) => {
      return (node.translatableContent || [])
        .filter((c: any) => c.type === "FILE_REFERENCE")
        .map((contentItem: any) => ({
          node,
          contentItem,
        }));
    });

    // 并行解析所有文件引用
    const resolved = await Promise.all(
      fileItems.map(async ({ node, contentItem }) => {
        const fileName = contentItem.value.split("/").pop() ?? "";

        const src = await findImageSrc(admin, fileName);

        return {
          resourceId: node.resourceId,
          ...contentItem,
          value: src, // 转换成真正 CDN URL
          translations: node.translations || [],
        };
      }),
    );
    console.log("asdiasdj", resolved);

    return resolved;
  };
  try {
    switch (true) {
      case !!startCursor:
        try {
          const response = await admin.graphql(
            `#graphql
                query JsonTemplate($startCursor: String){     
                    translatableResources(resourceType: ONLINE_STORE_THEME_JSON_TEMPLATE, last: 20, ,before: $startCursor) {
                      nodes {
                        resourceId
                        translatableContent {
                          digest
                          key
                          locale
                          type
                          value
                        }
                        translations(locale: "${startCursor?.searchTerm || searchTerm}") {
                          value
                          key
                        }
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
                startCursor: startCursor.cursor
                  ? startCursor.cursor
                  : undefined,
              },
            },
          );

          const data = await response.json();

          return {
            success: true,
            errorCode: 0,
            errorMsg: "",
            response: data?.data?.translatableResources || null,
          };
        } catch (error) {
          console.error("Error manage theme loading:", error);
          return {
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
          };
        }
      case !!endCursor:
        try {
          const response = await admin.graphql(
            `#graphql
              query JsonTemplate($endCursor: String){     
                translatableResources(
                  resourceType: ONLINE_STORE_THEME, 
                  first: 20, 
                  after: $endCursor
                ) {
                  nodes {
                    resourceId
                    translatableContent {
                      digest
                      key
                      locale
                      type
                      value
                    }
                    translations(locale: "${endCursor?.searchTerm || searchTerm}") {
                      value
                      key
                    }
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
                endCursor: endCursor.cursor || null,
              },
            },
          );

          const parsed = await response.json();
          const tr = parsed?.data?.translatableResources;

          if (!tr) {
            return json({
              data: [],
              endCursor: "",
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: "",
            });
          }

          // ⭐ 关键改动：等所有 FILE_REFERENCE 图片解析完
          const fileReferences = await fetchFileReferences(admin, tr.nodes);

          return json({
            data: fileReferences,
            endCursor: tr.pageInfo.endCursor || "",
            hasNextPage: tr.pageInfo.hasNextPage || false,
            hasPreviousPage: tr.pageInfo.hasPreviousPage || false,
            startCursor: tr.pageInfo.startCursor || "",
          });
        } catch (error) {
          console.error("Error manage theme loading:", error);
          return json({
            success: false,
            errorCode: 10001,
            errorMsg: "SERVER_ERROR",
            response: null,
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
  const { searchTerm } = useLoaderData<typeof loader>();
  const languageFetcher = useFetcher<any>();
  const artilclesFetcher = useFetcher<any>();
  const dataFetcher = useFetcher<any>();
  const queryImageFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();

  const [articlesStartCursor, setArticlesStartCursor] = useState("");
  const [articlesEndCursor, setArticlesEndCursor] = useState("");
  const [lastRequestCursor, setLastRequestCursor] = useState<any>(null);
  const [productImageData, setProductImageData] = useState<any>([]);
  const [tableDataLoading, setTableDataLoading] = useState(false);

  const [articleData, setArticleData] = useState<any>([]);
  const [selectedKey, setSelectedKey] = useState("");

  const [articlesHasNextPage, setArticlesHasNextPage] = useState(false);
  const [articlesHasPreviousPage, setArticlesHasPreviousPage] = useState(false);

  const { t } = useTranslation();
  const { Text } = Typography;
  const navigate = useNavigate();

  const [activeKey, setActiveKey] = useState("ALL");
  const [searchText, setSearchText] = useState<string>("");
  const timeoutIdRef = useRef<any>(true);
  const dispatch = useDispatch<AppDispatch>();
  const [sortKey, setSortKey] = useState("AUTHOR");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const loadFetcher = useFetcher<any>();
  const [blogsData, setBlogsData] = useState<any[]>([]);
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
        return record.value ? (
          <Thumbnail source={record.value} size="large" alt={record.value} />
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
      title: t("Key"),
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
          {record?.key || "未命名产品"}
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
      title: t("type"),
      width: 110,
      render: (_: any, record: any) => {
        return <Text>{record.type}</Text>;
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
    console.log(record);

    // const articleId = record.id.split("/").pop();
    // navigate(`/app/articles/${articleId}`);
  }
  useEffect(() => {
    setTableDataLoading(true);
    dataFetcher.submit(
      {
        endCursor: JSON.stringify({
          cursor: "",
          searchTerm,
        }),
      },
      {
        method: "POST",
      },
    );
    // const handleResize = () => {
    //   setIsMobile(window.innerWidth < 768);
    // };
    // handleResize();
    // window.addEventListener("resize", handleResize);
    // return () => {
    //   window.removeEventListener("resize", handleResize);
    // };
  }, []);
  useEffect(() => {
    if (dataFetcher.data) {
      setTableDataLoading(false);

      console.log(dataFetcher.data);
      setArticleData(dataFetcher.data?.data);
      if (dataFetcher.data?.success) {
      }
    }
  }, [dataFetcher.data]);
  // useEffect(() => {
  //   if (loadFetcher.data) {
  //     // console.log(loadFetcher.data);

  //     setArticlesHasNextPage(loadFetcher.data.hasNextPage);
  //     setArticlesHasPreviousPage(loadFetcher.data.hasPreviousPage);
  //     setArticlesStartCursor(loadFetcher.data.startCursor);
  //     setArticlesEndCursor(loadFetcher.data.endCursor);
  //     setArticleData(loadFetcher.data?.data);
  //     setTableDataLoading(false);
  //     // setBlogsData(loadFetcher.data);
  //   }
  // }, [loadFetcher.data]);
  // useEffect(() => {
  //   if (artilclesFetcher.data) {
  //     // console.log(artilclesFetcher.data);

  //     dispatch(
  //       setLastPageCursorInfo({
  //         articlesHasNextPage: artilclesFetcher.data.hasNextPage,
  //         articlesHasPreviousPage: artilclesFetcher.data.hasPreviousPage,
  //         articlesStartCursor: artilclesFetcher.data.startCursor,
  //         articlesEndCursor: artilclesFetcher.data.endCursor,
  //       }),
  //     );
  //     setArticlesHasNextPage(artilclesFetcher.data.hasNextPage);
  //     setArticlesHasPreviousPage(artilclesFetcher.data.hasPreviousPage);
  //     setArticlesStartCursor(artilclesFetcher.data.startCursor);
  //     setArticlesEndCursor(artilclesFetcher.data.endCursor);
  //     setArticleData(artilclesFetcher.data?.data);
  //   }
  // }, [artilclesFetcher.data]);
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

  const handleChangeStatusTab = (key: string) => {
    setActiveKey(key);
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      artilclesFetcher.submit(
        {
          articleEndCursor: JSON.stringify({
            cursor: "",
            query: searchText,
            status: key,
            sortKey,
            reverse: sortOrder === "asc" ? false : true,
          }),
        },
        {
          method: "post",
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
  const exMenuData = (data: any) => {
    const menuData = data
      ?.filter((item: any) => {
        const contents = item?.translatableContent;

        // 如果没有 translatableContent，跳过
        if (!Array.isArray(contents) || contents.length === 0) return false;

        // 检查是否全部为空（包括仅有空格）
        const allEmpty = contents.every(
          (c: any) => !c?.value || c.value.trim() === "",
        );

        return !allEmpty; // 仅保留有实际内容的项
      })
      ?.map((item: any) => {
        const match = item?.resourceId.match(
          /OnlineStoreThemeJsonTemplate\/([^?]+)/,
        );

        const label = match ? match[1] : item?.resourceId;

        return {
          key: item?.resourceId,
          label: label,
        };
      });
    return menuData;
  };
  const handleNavigate = () => {
    navigate("/app/manage_translation");
  };
  return (
    <Page>
      {/* <TitleBar title={t("Article Image Translate")}></TitleBar> */}
      <Affix offsetTop={0}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
            backgroundColor: "rgb(241, 241, 241)",
            padding: "16px 0",
          }}
        >
          <Flex
            align="center"
            justify="space-between"
            style={{ width: "100%" }}
          >
            <Flex align="center" gap={8}>
              <Button
                type="text"
                variant="outlined"
                onClick={handleNavigate}
                style={{ padding: "4px" }}
              >
                <Icon source={ArrowLeftIcon} tone="base" />
              </Button>
              <Title
                level={2}
                style={{
                  margin: "0",
                  fontSize: "20px",
                  fontWeight: 700,
                }}
              >
                {t("json template")}
              </Title>
            </Flex>
          </Flex>
        </div>
      </Affix>
      <Card styles={{ body: { padding: "12px 24px" } }}>
        <Flex align="center" justify="space-between">
          <Tabs
            activeKey={activeKey}
            onChange={(key) => handleChangeStatusTab(key)}
            defaultActiveKey="all"
            type="line"
            // style={{ width: "40%" }}
            items={[
              { label: t("All"), key: "ALL" },
              // {
              //   label: t("Active"),
              //   key: "ACTIVE",
              // },
              // {
              //   label: t("Draft"),
              //   key: "DRAFT",
              // },
              // {
              //   label: t("Archived"),
              //   key: "ARCHIVED",
              // },
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
            rowKey={(record) => `${record.key}_${record.digest}`} // ✅ 建议加上 key，避免警告
            loading={tableDataLoading}
            onRow={(record) => ({
              onClick: (e) => {
                // 排除点击按钮等交互元素
                if ((e.target as HTMLElement).closest("button")) return;
                console.log("嗯？？");
                sessionStorage.setItem("record", JSON.stringify(record));
                navigate(`/app/manage_translations/jsonTemplate`, {
                  state: { resourceId: record.resourceId, record: record },
                });
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
