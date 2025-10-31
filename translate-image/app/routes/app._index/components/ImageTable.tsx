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
export default function Index() {
  const loadFetcher = useFetcher<any>();
  const languageFetcher = useFetcher<any>();
  const productsFetcher = useFetcher<any>();
  const imageFetcher = useFetcher<any>();

  const [productsStartCursor, setProductsStartCursor] = useState("");
  const [productsEndCursor, setProductsEndCursor] = useState("");

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
  const didMountRef = useRef(false);
  // const [lastPageCursorInfo, setLastPageCursorInfo] = useState<any>();
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
      title: "产品",
      // 不需要 dataIndex，用 render 直接取 item.node.title
      maxWidth: 250, // ✅ 指定列宽（单位是像素）
      render: (_: any, record: any) => (
        <Text
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
      title: "状态",
      render: (_: any, record: any) => {
        const status = record?.status;

        let color = "default";
        let label = "未知状态";

        switch (status) {
          case "ACTIVE":
            color = "green";
            label = "有效";
            break;
          case "DRAFT":
            color = "orange";
            label = "草稿";
            break;
          case "ARCHIVED":
            color = "gray";
            label = "已归档";
            break;
          default:
            color = "default";
            label = "未知";
            break;
        }

        return <Tag color={color}>{label}</Tag>;
      },
    },
    {
      title: "操作",
      render: (_: any, record: any) => (
        <Button onClick={() => handleView(record)}>{t("Manage")}</Button>
      ),
    },
  ];
  useEffect(() => {
    // loadFetcher.submit(
    //   { loading: true, sortKey, reverse: sortOrder === "asc" ? false : true },
    //   { method: "POST", action: "/app/management" },
    // );
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
      console.log(productsFetcher.data);

      // const { productEndCursor } = productsFetcher.data;
      // setLastPageCursorInfo((pre: any) => ({
      //   ...pre,
      //   productsHasNextPage: productsFetcher.data.productHasNextPage,
      //   productsHasPreviousPage: productsFetcher.data.productHasPreviousPage,
      //   productsStartCursor: productsFetcher.data.productStartCursor,
      //   productsEndCursor: productsFetcher.data.productEndCursor,
      // }));
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
    // setLastPageCursorInfo((pre: any) => ({
    //   ...pre,
    //   searchText: searchText,
    //   activeKey: activeKey,
    //   sortOrder: sortOrder,
    //   sortKey: sortKey,
    // }));
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
    if (lastPageCursorInfo) {
      console.log("变化：", lastPageCursorInfo);

      localStorage.setItem(
        "pagination-cursor-store",
        JSON.stringify(lastPageCursorInfo),
      );
    }
  }, [lastPageCursorInfo]);
  useEffect(() => {
    if (imageFetcher.data) {
      console.log("dsdqeqsa: ", imageFetcher.data);

      setProductImageData(imageFetcher.data.imageData);
    }
  }, [imageFetcher.data]);

  // 对产品进行排序
  useEffect(() => {
    if (!didMountRef.current) {
      // 第一次渲染，标记已挂载，然后直接返回
      didMountRef.current = true;
      return;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    console.log("获取初始数据");

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            cursor: "",
            query: searchText,
            sortKey: sortKey,
            reverse: sortOrder === "asc" ? false : true,
          }),
        },
        {
          method: "post",
          action: "/app/management",
        },
      );
    }, 500);
  }, [sortKey, sortOrder]);
  const handlePreProductPage = () => {
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
  const handleChangeStatusTab = (key: string) => {
    setActiveKey(key);
    console.log(key);
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
                  { label: "All", key: "ALL" },
                  {
                    label: "Active",
                    key: "ACTIVE",
                  },
                  {
                    label: "Draft",
                    key: "DRAFT",
                  },
                  {
                    label: "Archived",
                    key: "ARCHIVED",
                  },
                ]}
              />

              <Flex align="center" justify="center" gap={20}>
                <Input
                  placeholder="搜索..."
                  value={searchText}
                  onChange={(e) => handleSearch(e.target.value)}
                  prefix={<SearchOutlined />}
                />
                {/* <Button>
                    <Icon source={SortIcon} tone="base" />
                  </Button> */}
                <SortPopover
                  onChange={(key, order) => {
                    console.log(key, order);
                    setSortKey(key);
                    setSortOrder(order);
                  }}
                />
                <Button
                  onClick={() => {
                    console.log(lastPageCursorInfo);
                  }}
                >
                  输出信息
                </Button>
              </Flex>
            </Flex>
            {/* 搜索和排序行 */}
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
