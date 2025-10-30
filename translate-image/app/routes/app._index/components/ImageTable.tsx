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
import { Table, Button, Tabs, Tag, Input, Flex, Card } from "antd";

import { useTranslation } from "react-i18next";
import { useNavigate, useFetcher, useLoaderData } from "@remix-run/react";

import SortPopover from "~/routes/app.management/conponents/SortPopover";

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
  const navigate = useNavigate();

  const [activeKey, setActiveKey] = useState("ALL");
  const [searchText, setSearchText] = useState<string>("");
  const timeoutIdRef = useRef<any>(true);

  const [sortKey, setSortKey] = useState("CREATED_AT");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const panelColumns = [
    {
      // 不需要 dataIndex，用 render 直接取 item.node.title
      render: (_: any, record: any) => {
        const imageData = record.imageData.edges;
        return imageData.length > 0 ? (
          <Thumbnail
            source={imageData[0].node.url}
            size="small"
            alt={imageData[0].node.altText}
          />
        ) : (
          <Thumbnail source={ImageIcon} size="small" alt="Small document" />
        );
      },
    },
    {
      title: "产品",
      // 不需要 dataIndex，用 render 直接取 item.node.title
      maxWidth: 250, // ✅ 指定列宽（单位是像素）
      render: (_: any, record: any) => (
        <span
          style={{
            display: "inline-block",
            maxWidth: 320, // 给内部留点空隙
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          title={record?.label}
        >
          {record?.label || "未命名产品"}
        </span>
      ),
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
        <Button onClick={() => handleView(record)}>查看</Button>
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
    if (imageFetcher.data) {
      console.log("dsdqeqsa: ", imageFetcher.data);

      setProductImageData(imageFetcher.data.imageData);
    }
  }, [imageFetcher.data]);

  // 对产品进行排序
  useEffect(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
    }
    // console.log("dasdasdsa发送请求");
    // console.log(sortKey, sortOrder);

    // 延迟 1s 再执行请求
    timeoutIdRef.current = setTimeout(() => {
      productsFetcher.submit(
        {
          productEndCursor: JSON.stringify({
            cursor: "",
            query: searchText,
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
            query: "",
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
