import { useEffect, useRef, useState } from "react";
import { Layout, Pagination, Thumbnail } from "@shopify/polaris";
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
import "../style.css";
export default function Index() {
  const loadFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();

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

  const panelColumns = [
    {
      // 不需要 dataIndex，用 render 直接取 item.node.title
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
      onCell: () => ({
        style: {
          padding: "4px 8px", // ✅ 控制上下、左右 padding
        },
      }),
    },
    {
      title: t("Product"),
      // 不需要 dataIndex，用 render 直接取 item.node.title
      maxWidth: 250, // ✅ 指定列宽（单位是像素）
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
      onCell: () => ({
        style: {
          padding: "4px 8px", // ✅ 控制上下、左右 padding
        },
      }),
    },
    {
      title: t("State"),
      render: (_: any, record: any) => {
        const status = record?.status;

        let color = "default";
        let label = "Unknown";

        switch (status) {
          case "ACTIVE":
            color = "green";
            label = "Efficient";
            break;
          case "DRAFT":
            color = "orange";
            label = "Draft";
            break;
          case "ARCHIVED":
            color = "gray";
            label = "Archived";
            break;
          default:
            color = "default";
            label = "Unknown";
            break;
        }

        return <Tag color={color}>{t(label)}</Tag>;
      },
    },
    {
      title: t("Action"),
      render: (_: any, record: any) => (
        <Button onClick={() => handleView(record)}>{t("Manage")}</Button>
      ),
    },
  ];
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
    loadFetcher.submit(formData, { method: "POST", action: "/app/management" });
    const languageFormData = new FormData();
    languageFormData.append("languageLoading", JSON.stringify({}));
    languageFetcher.submit(languageFormData, {
      action: "/app/management",
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
  const handlePreProductPage = () => {
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
        action: "/app/management",
      },
    ); // 提交表单请求
  };
  const handleNextProductPage = () => {
    dispatch(
      setLastPageCursorInfo({
        lastRequestCursor: productsEndCursor,
        direction: "next",
      }),
    );
    console.log("下一页产品");

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

  function handleView(record: any): void {
    console.log("Viewing record:", record);
    const productId = record.key.split("/").pop();
    console.log("productId:", productId);

    navigate(`/app/products/${productId}`);
  }

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
  return (
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
                style={{ width: "30%" }}
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
        </div>
      </Layout.Section>
    </Layout>
  );
}
