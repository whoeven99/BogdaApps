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
import { setLastPageCursorInfo } from "~/store/modules/productSlice";
import "./style.css";
import { ColumnsType } from "antd/es/table";
import useReport from "scripts/eventReport";
import { ActionFunctionArgs, json, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import SortPopover from "~/components/SortPopover";
import ScrollNotice from "~/components/ScrollNotice";
const { Text, Title } = Typography;
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  return {
    shop: shop,
  };
};
export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const loading = JSON.parse(formData.get("loading") as string);
  const languageLoading = JSON.parse(formData.get("languageLoading") as string);
  const productStartCursor: any = JSON.parse(
    formData.get("productStartCursor") as string,
  );
  const productEndCursor: any = JSON.parse(
    formData.get("productEndCursor") as string,
  );
  const imageStartCursor: any = JSON.parse(
    formData.get("imageStartCursor") as string,
  );
  const imageEndCursor: any = JSON.parse(
    formData.get("imageEndCursor") as string,
  );

  try {
    const queryString = (productCursor: any) => {
      const { query, status } = productCursor || { query: "", status: "" };
      let str = "";

      if (status && status !== "ALL") {
        str += `status:${status.toUpperCase()} `;
      }

      if (query && query.trim()) {
        str += `${query.trim()}`;
      }

      return str.trim();
    };
    switch (true) {
      case !!languageLoading:
        // try {
        //   const fetchWithRetry = async (maxRetries = 3) => {
        //     for (let i = 0; i < maxRetries; i++) {
        //       try {
        //         const mutationResponse = await admin.graphql(
        //           `query MyQuery {
        //       shopLocales {
        //         locale
        //         name
        //         primary
        //         published
        //       }
        //     }`,
        //         );
        //         const data = (await mutationResponse.json()) as any;

        //         if (!data?.errors) {
        //           return data.data.shopLocales;
        //         }
        //       } catch (error) {
        //         if (i === maxRetries - 1) throw error;
        //         await new Promise((resolve) =>
        //           setTimeout(resolve, 1000 * (i + 1)),
        //         );
        //       }
        //     }
        //   };

        //   const result = await fetchWithRetry();

        //   return {
        //     success: true,
        //     response: result,
        //   };
        // } catch (error) {
        //   console.log("GraphQL Error: ", error);
        //   return {
        //     success: false,
        //     response: null,
        //   };
        // }
        try {
          const fetchWithRetry = async (maxRetries = 3) => {
            let lastError;

            for (let i = 0; i < maxRetries; i++) {
              try {
                const mutationResponse = await admin.graphql(
                  `query MyQuery {
                    shopLocales {
                      locale
                      name
                      primary
                      published
                    }
                  }`,
                );

                // 检查 HTTP 状态
                if (!mutationResponse.ok) {
                  throw new Error(`HTTP ${mutationResponse.status}`);
                }

                const data = (await mutationResponse.json()) as any;

                // 检查 GraphQL 错误
                if (data?.errors) {
                  console.log("GraphQL errors:", data.errors);
                  lastError = new Error(
                    data.errors[0]?.message || "GraphQL error",
                  );
                  // 如果是权限或查询错误,不需要重试
                  if (data.errors[0]?.extensions?.code === "ACCESS_DENIED") {
                    throw lastError;
                  }
                  continue; // 其他错误继续重试
                }

                // 检查数据是否存在
                if (!data?.data?.shopLocales) {
                  throw new Error("shopLocales data is missing");
                }

                return data.data.shopLocales;
              } catch (error) {
                lastError = error;
                console.log(`Attempt ${i + 1} failed:`, error);

                if (i < maxRetries - 1) {
                  await new Promise((resolve) =>
                    setTimeout(resolve, 1000 * (i + 1)),
                  );
                }
              }
            }

            // 所有重试都失败
            throw lastError || new Error("All retries failed");
          };

          const result = await fetchWithRetry();

          return {
            success: true,
            response: result,
          };
        } catch (error: any) {
          console.log("GraphQL Error: ", error);
          return {
            success: false,
            response: null,
            error: error.message, // 添加错误信息方便调试
          };
        }

      case !!productStartCursor:
        try {
          console.log(productStartCursor);

          const loadData = await admin.graphql(
            `#graphql
              query products($startCursor: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
                products(last: 10 ,before: $startCursor, query: $query, sortKey: $sortKey, reverse: $reverse) {
                  edges {
                  node {
                    id
                    title
                    status
                    images(first: 20) {
                      edges {
                        node {
                          id
                          url
                          altText
                        }
                      }
                      pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                }
            }`,
            {
              variables: {
                startCursor: productStartCursor?.cursor
                  ? productStartCursor?.cursor
                  : undefined,
                query: queryString(productStartCursor),
                sortKey: productStartCursor?.sortKey || "TITLE",
                reverse: productStartCursor?.reverse ?? false,
              },
            },
          );

          const response = await loadData.json();

          console.log("productStartCursor", response?.data?.products?.edges);
          if (response?.data?.products?.edges.length > 0) {
            const menuData = response?.data?.products?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  label: item?.node?.title,
                  imageData: item?.node?.images,
                  status: item?.node?.status,
                };
              },
            );
            const imageData = response?.data?.products?.edges.map(
              (item: any) => {
                return item?.node?.images?.edges.map((image: any) => {
                  return {
                    key: image?.node?.id,
                    altText: image?.node?.altText,
                    productId: item?.node?.id,
                    productTitle: item?.node?.title,
                    imageId: image?.node?.id,
                    imageUrl: image?.node?.url,
                    targetImageUrl: "",
                    imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                    imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                    imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                    imageHasPreviousPage:
                      item?.node?.images?.pageInfo?.hasPreviousPage,
                  };
                });
              },
            );
            return json({
              menuData,
              imageData,
              productStartCursor:
                response?.data?.products?.pageInfo?.startCursor,
              productEndCursor: response?.data?.products?.pageInfo?.endCursor,
              productHasNextPage:
                response?.data?.products?.pageInfo?.hasNextPage,
              productHasPreviousPage:
                response?.data?.products?.pageInfo?.hasPreviousPage,
            });
          } else {
            return json({
              menuData: [],
              imageData: [],
              productStartCursor: "",
              productEndCursor: "",
              productHasNextPage: "",
              productHasPreviousPage: "",
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
      case !!productEndCursor:
        try {
          console.log("productEndCursor dasd :", productEndCursor);

          const loadData = await admin.graphql(
            `#graphql
              query products($endCursor: String, $query: String, $sortKey: ProductSortKeys, $reverse: Boolean) {
                products(first: 10, after: $endCursor, query: $query, sortKey: $sortKey, reverse: $reverse) {
                  edges {
                  node {
                    id
                    title
                    status
                    images(first: 20) {
                      edges {
                        node {
                          id
                          url
                          altText
                        }
                      }
                      pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                      }
                    }
                  }
                }
                pageInfo {
                  hasNextPage
                  hasPreviousPage
                  startCursor
                  endCursor
                }
                }
            }`,
            {
              variables: {
                endCursor: productEndCursor?.cursor
                  ? productEndCursor?.cursor
                  : undefined,
                query: queryString(productEndCursor),
                sortKey: productEndCursor?.sortKey || "TITLE",
                reverse: productEndCursor?.reverse ?? false,
              },
            },
          );

          const response = await loadData.json();
          console.log("sdasdasda: ", response);

          console.log("productEndCursor11", response?.data?.products?.edges);
          if (response?.data?.products?.edges.length > 0) {
            const menuData = response?.data?.products?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  label: item?.node?.title,
                  imageData: item?.node?.images,
                  status: item?.node?.status,
                };
              },
            );
            const imageData = response?.data?.products?.edges.map(
              (item: any) => {
                return item?.node?.images?.edges.map((image: any) => {
                  return {
                    key: image?.node?.id,
                    altText: image?.node?.altText,
                    productId: item?.node?.id,
                    productTitle: item?.node?.title,
                    imageId: image?.node?.id,
                    imageUrl: image?.node?.url,
                    targetImageUrl: "",
                    imageStartCursor: item?.node?.images?.pageInfo?.startCursor,
                    imageEndCursor: item?.node?.images?.pageInfo?.endCursor,
                    imageHasNextPage: item?.node?.images?.pageInfo?.hasNextPage,
                    imageHasPreviousPage:
                      item?.node?.images?.pageInfo?.hasPreviousPage,
                  };
                });
              },
            );

            return json({
              menuData,
              imageData,
              productStartCursor:
                response?.data?.products?.pageInfo?.startCursor,
              productEndCursor: response?.data?.products?.pageInfo?.endCursor,
              productHasNextPage:
                response?.data?.products?.pageInfo?.hasNextPage,
              productHasPreviousPage:
                response?.data?.products?.pageInfo?.hasPreviousPage,
            });
          } else {
            return json({
              menuData: [],
              imageData: [],
              productStartCursor: "",
              productEndCursor: "",
              productHasNextPage: "",
              productHasPreviousPage: "",
            });
          }
        } catch (error) {
          console.error("Error action productEndCursor productImage:", error);
          return json({
            menuData: [],
            imageData: [],
            productStartCursor: "",
            productEndCursor: "",
            productHasNextPage: "",
            productHasPreviousPage: "",
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
  const { shop } = useLoaderData<{ shop: string }>();
  const { reportClick, report } = useReport();
  const loadFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();
  const fetcher = useFetcher<any>();

  const [productsStartCursor, setProductsStartCursor] = useState("");
  const [productsEndCursor, setProductsEndCursor] = useState("");
  const [lastRequestCursor, setLastRequestCursor] = useState<any>(null);
  const [productImageData, setProductImageData] = useState<any>([]);
  const [tableDataLoading, setTableDataLoading] = useState(true);

  const [menuData, setMenuData] = useState<any>([]);
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

  const dispatch = useDispatch<AppDispatch>();
  const lastPageCursorInfo = useSelector(
    (state: RootState) => state.product.lastPageCursorInfo,
  );
  const sortOptions = [
    { label: "Product Title", value: "TITLE" },
    { label: "Creation time", value: "CREATED_AT" },
    { label: "Update time", value: "UPDATED_AT" },
    { label: "Inventory", value: "INVENTORY" },
    { label: "Product Type", value: "PRODUCT_TYPE" },
    // { label: "发布时间", value: "PUBLISHED_AT" },
    { label: "Manufacturers", value: "VENDOR" },
  ];

  const panelColumns: ColumnsType<any> = [
    {
      // 不需要 dataIndex，用 render 直接取 item.node.title
      width: 100,
      render: (_: any, record: any) => {
        const imageData = record.imageData.edges;
        return imageData.length > 0 ? (
          <Thumbnail
            source={imageData[0].node.url}
            size="large"
            alt={imageData[0].node.altText}
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
      title: t("Product title"),
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
          {record?.label || "未命名产品"}
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
        const status = record?.status;
        let tone: "success" | "info" = "success";
        let label = "Unknown";

        switch (status) {
          case "ACTIVE":
            tone = "success";
            label = "Active";
            break;
          case "DRAFT":
            tone = "info";
            label = "Draft";
            break;
          case "ARCHIVED":
            label = "Archived";
            break;
        }
        if (status === "ARCHIVED") {
          return <Badge>{t(label)}</Badge>;
        }
        return <Badge tone={tone}>{t(label)}</Badge>;
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
  useEffect(() => {
    fetcher.submit(
      {
        log: `${shop} 目前在产品页面}`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  }, []);

  useEffect(() => {
    // console.log(lastPageCursorInfo);
    const {
      lastRequestCursor,
      direction,
      searchText,
      activeKey,
      sortOrder,
      sortKey,
      productsHasNextPage,
      productsHasPreviousPage,
      productsStartCursor,
      productsEndCursor,
    } = lastPageCursorInfo;
    // console.log("执行数据初始化操作", lastPageCursorInfo);

    setProductsHasNextPage(productsHasNextPage);
    setProductsHasPreviousPage(productsHasPreviousPage);
    setProductsStartCursor(productsStartCursor);
    setProductsEndCursor(productsEndCursor);
    setActiveKey(activeKey);
    setSortOrder(sortOrder);
    setSortKey(sortKey);
    // handleSortProduct(sortKey, sortOrder);
    setSearchText(searchText);

    const formData = new FormData();
    formData.append(
      direction === "next"
        ? "productEndCursor"
        : direction === "prev"
          ? "productStartCursor"
          : "productEndCursor",
      JSON.stringify({
        cursor: lastRequestCursor,
        query: searchText,
        status: activeKey,
        sortKey,
        reverse: sortOrder === "asc" ? false : true,
      }),
    );
    loadFetcher.submit(formData, { method: "POST" });
    const languageFormData = new FormData();
    languageFormData.append("languageLoading", JSON.stringify({}));
    languageFetcher.submit(languageFormData, {
      method: "POST",
    });
  }, []);

  useEffect(() => {
    if (loadFetcher.data) {
      setMenuData(loadFetcher.data.menuData);
      setSelectedKey(loadFetcher.data.menuData[0]?.key || "");
      setProductsHasNextPage(loadFetcher.data.productHasNextPage);
      setProductsHasPreviousPage(loadFetcher.data.productHasPreviousPage);
      setProductsStartCursor(loadFetcher.data.productStartCursor);
      setProductsEndCursor(loadFetcher.data.productEndCursor);
      setTableDataLoading(false);
    }
  }, [loadFetcher.data]);
  useEffect(() => {
    if (productsFetcher.data) {
      dispatch(
        setLastPageCursorInfo({
          productsHasNextPage: productsFetcher.data.productHasNextPage,
          productsHasPreviousPage: productsFetcher.data.productHasPreviousPage,
          productsStartCursor: productsFetcher.data.productStartCursor,
          productsEndCursor: productsFetcher.data.productEndCursor,
        }),
      );
      setMenuData(productsFetcher.data.menuData);
      setSelectedKey(productsFetcher.data.menuData[0]?.key || "");
      setProductsHasNextPage(productsFetcher.data.productHasNextPage);
      setProductsHasPreviousPage(productsFetcher.data.productHasPreviousPage);
      setProductsStartCursor(productsFetcher.data.productStartCursor);
      setProductsEndCursor(productsFetcher.data.productEndCursor);
      setTableDataLoading(false);
    }
  }, [productsFetcher.data]);
  useEffect(() => {
    dispatch(
      setLastPageCursorInfo({
        searchText,
        activeKey,
        sortOrder,
        sortKey,
      }),
    );
  }, [searchText, activeKey, sortOrder, sortKey]);
  useEffect(() => {
    if (imageFetcher.data) {
      console.log("dsdqeqsa: ", imageFetcher.data);

      setProductImageData(imageFetcher.data.imageData);
    }
  }, [imageFetcher.data]);

  const handleSortProduct = (key: string, order: "asc" | "desc") => {
    setSortKey(key);
    setSortOrder(order);
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
      "product_sort_product",
    );
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
        },
      );
    }, 100);
  };
  const handlePreProductPage = () => {
    if (productsFetcher.state !== "idle") {
      return;
    }
    dispatch(
      setLastPageCursorInfo({
        lastRequestCursor: productsStartCursor,
        direction: "prev",
      }),
    );

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
      },
    ); // 提交表单请求
  };
  const handleNextProductPage = () => {
    if (productsFetcher.state !== "idle") {
      return;
    }
    dispatch(
      setLastPageCursorInfo({
        lastRequestCursor: productsEndCursor,
        direction: "next",
      }),
    );

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
      },
    ); // 提交表单请求
  };

  function handleView(record: any) {
    const productId = record.key.split("/").pop();
    navigate(`/app/products/${productId}`);
  }
  const handleNavigate = (e: any, record: any) => {
    // 排除点击按钮等交互元素
    if ((e.target as HTMLElement).closest("button")) return;
    const productId = record.key.split("/").pop();
    navigate(`/app/products/${productId}`);
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
      "product_query_search",
    );
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
        },
      );
    }, 100);
  };

  const handleChangeStatusTab = (key: string) => {
    report(
      {
        activeKey: key,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "product_filter_active_status",
    );
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
        },
      );
    }, 500);
  };
  return (
    <Page>
      <TitleBar title={t("Product images")}></TitleBar>
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Title level={1} style={{ fontSize: "1.25rem" }}>
        {t("Product images")}
      </Title>
      <Layout>
        <Layout.Section>
          <div>
            {/* 顶部 Tabs */}
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
                    sortOptions={sortOptions}
                  />
                  {/* <Button onClick={() => console.log(lastPageCursorInfo)}>
                  输出store存储数据
                </Button> */}
                </Flex>
              </Flex>
            </Card>

            {/* 产品表格 */}
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
                  dataSource={menuData}
                  columns={panelColumns}
                  pagination={false}
                  rowKey={(record) => record.key} // ✅ 建议加上 key，避免警告
                  loading={tableDataLoading}
                  onRow={(record) => ({
                    onClick: (e) => handleNavigate(e, record),
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
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
