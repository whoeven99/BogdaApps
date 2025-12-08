import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Icon,
  Layout,
  Page,
  Pagination,
  Select,
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
import { queryShopifyThemeData } from "~/api/JavaServer";
const { Text, Title } = Typography;

export const action = async ({ request }: ActionFunctionArgs) => {
  const url = new URL(request.url);

  const searchTerm = url.searchParams.get("language");

  const adminAuthResult = await authenticate.admin(request);
  const { shop, accessToken } = adminAuthResult.session;
  const { admin } = adminAuthResult;
  const formData = await request.formData();
  const startCursor: any = JSON.parse(formData.get("startCursor") as string);
  const endCursor: any = JSON.parse(formData.get("endCursor") as string);
  const RESOURCE_TYPES = [
    "ONLINE_STORE_THEME",
    "PAGE",
    "COLLECTION",
    "METAFIELD",
  ];
  try {
    switch (true) {
      case !!startCursor:
        try {
          const response = await admin.graphql(
            `#graphql
                query JsonTemplate($startCursor: String){     
                    translatableResources(resourceType: ONLINE_STORE_THEME, last: 10, ,before: $startCursor) {
                      nodes {
                        resourceId
                        translatableContent {
                          digest
                          key
                          locale
                          type
                          value
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
          const fileReferences = await queryShopifyThemeData({
            admin,
            nodes: tr.nodes,
          });

          return json({
            data: fileReferences,
            endCursor: tr.pageInfo.endCursor || "",
            hasNextPage: tr.pageInfo.hasNextPage || false,
            hasPreviousPage: tr.pageInfo.hasPreviousPage || false,
            startCursor: tr.pageInfo.startCursor || "",
          });
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
          const all = [];

          for (const type of RESOURCE_TYPES) {
            const response = await admin.graphql(
              `#graphql
              query JsonTemplate($endCursor: String){     
                translatableResources(
                  resourceType: ${type}, 
                  first: 100, 
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

            if (!tr) continue;
            // ⭐ 关键改动：等所有 FILE_REFERENCE 图片解析完
            const records = (await queryShopifyThemeData({
              admin,
              nodes: tr.nodes,
            })) as any;

            // 给每条记录加入类型标记
            const withType = records.map((x: any) => ({
              ...x,
              resourceType: type,
            }));

            all.push(...withType);
          }
          console.log("allaaaa", all);

          return json({
            data: all,
            // ❗ 这里的分页逻辑你要根据业务决定如何合并，目前取最后一个
            endCursor: endCursor.cursor,
            hasNextPage: false,
            hasPreviousPage: false,
            startCursor: "",
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
  const dataFetcher = useFetcher<any>();
  const { t } = useTranslation();
  const itemOptions = getItemOptions(t);
  const [startCursor, setStartCursor] = useState("");
  const [endCursor, setEndCursor] = useState("");
  const [selectedItem, setSelectedItem] = useState<string>("all");
  const [tableDataLoading, setTableDataLoading] = useState(false);

  const [articleData, setArticleData] = useState<any>([]);

  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  const { Text } = Typography;
  const navigate = useNavigate();
  const panelColumns: ColumnsType<any> = [
    {
      // 不需要 dataIndex，用 render 直接取 item.node.title
      width: 100,
      render: (_: any, record: any) => {
        // console.log("record", record);
        return record.value ? (
          <Thumbnail
            source={record?.value[0]}
            size="large"
            alt={record?.value[0]}
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
      width: 210,
      render: (_: any, record: any) => {
        return <Text>{record.resourceType}</Text>;
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
    sessionStorage.setItem("record", JSON.stringify(record));
    navigate(`/app/manage_translations/online_store_theme`);
  }
  useEffect(() => {
    setTableDataLoading(true);
    const localThemeData = sessionStorage.getItem(
      "shopify_theme_all_data",
    ) as any;
    const parse = localThemeData ? JSON.parse(localThemeData) : null;
    if (!parse) {
      dataFetcher.submit(
        {
          endCursor: JSON.stringify({
            cursor: "",
          }),
        },
        {
          method: "POST",
        },
      );
    } else {
      setArticleData(parse);
      setTableDataLoading(false);
    }
  }, []);
  useEffect(() => {
    if (dataFetcher.data) {
      setTableDataLoading(false);

      console.log(dataFetcher.data);
      sessionStorage.setItem(
        "shopify_theme_all_data",
        JSON.stringify(dataFetcher.data?.data),
      );
      setHasNextPage(dataFetcher.data.hasNextPage);
      setHasPreviousPage(dataFetcher.data.hasPreviousPage);
      setStartCursor(dataFetcher.data.startCursor);
      setEndCursor(dataFetcher.data.endCursor);
      setArticleData(dataFetcher.data?.data);
    }
  }, [dataFetcher.data]);
  const handlePrePage = () => {
    if (dataFetcher.state !== "idle") {
      return;
    }
    dataFetcher.submit(
      {
        startCursor: JSON.stringify({
          cursor: startCursor,
        }),
      },
      {
        method: "post",
      },
    ); // 提交表单请求
  };
  const handleNextPage = () => {
    if (dataFetcher.state !== "idle") {
      return;
    }
    dataFetcher.submit(
      {
        endCursor: JSON.stringify({
          cursor: endCursor,
        }),
      },
      {
        method: "post",
      },
    ); // 提交表单请求
  };
  const handleNavigate = () => {
    navigate("/app/manage_translation");
  };
  const handleItemChange = (item: string) => {
    setSelectedItem(item);
    console.log(item);

    navigate(`/app/manage_translation/${item}`);
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
                {t("translatableResources")}
              </Title>
            </Flex>
          </Flex>
        </div>
      </Affix>
      <div
        style={{ display: "flex", justifyContent: "flex-end", width: "100%" }}
      >
        <div
          style={{
            width: "150px",
            marginBottom: "20px",
          }}
        >
          <Select
            label={""}
            options={itemOptions}
            value={selectedItem}
            onChange={(value) => handleItemChange(value)}
          />
        </div>
      </div>
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
                sessionStorage.setItem("record", JSON.stringify(record));
                navigate(`/app/manage_translations/all`);
              },
              style: { cursor: "pointer" },
            })}
          />
        </div>

        {/* 分页条固定在底部 */}
        {/* <div
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
            hasPrevious={hasPreviousPage}
            onPrevious={handlePrePage}
            hasNext={hasNextPage}
            onNext={handleNextPage}
          />
        </div> */}
      </div>
    </Page>
  );
}

export const getItemOptions = (t: (key: string) => string) => [
  { label: t("All"), value: "all" },
  { label: t("Online Store Theme"), value: "online_store_theme" },
  { label: t("Metafield"), value: "metafield" },
  { label: t("Pages"), value: "page" },
  { label: t("Collections"), value: "collection" },
];
