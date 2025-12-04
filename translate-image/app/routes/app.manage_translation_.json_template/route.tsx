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
import { getItemOptions } from "../app.manage_translation/route";
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
  // 识别是否为图片 URL
  const IMAGE_TYPES = new Set([
    "FILE_REFERENCE",
    "LIST_FILE_REFERENCE",
    "HTML",
    "RICH_TEXT_FIELD",
  ]);

  // 从富文本递归提取图片
  const extractFromRichText = (nodes: any[]): string[] => {
    const result: string[] = [];
    if (!Array.isArray(nodes)) return result;

    for (const node of nodes) {
      if (node.type === "image" && node.src) result.push(node.src);
      if (node.children) result.push(...extractFromRichText(node.children));
    }

    return result;
  };

  // 从 HTML 提取 <img src="">
  const extractFromHtml = (html: string): string[] => {
    const result: string[] = [];
    const regex = /<img[^>]+src=["']([^"']+)["']/g;

    let match;
    while ((match = regex.exec(html)) !== null) {
      result.push(match[1]);
    }

    return result;
  };

  const fetchFileReferences = async (admin: any, nodes: any[]) => {
    const results: any[] = [];

    for (const node of nodes) {
      for (const contentItem of node.translatableContent || []) {
        const type = contentItem.type;
        if (!IMAGE_TYPES.has(type)) continue;

        // === 1) FILE_REFERENCE ===
        if (type === "FILE_REFERENCE") {
          const fileName = contentItem.value?.split("/").pop() ?? "";
          const src = await findImageSrc(admin, fileName);

          if (!src) continue;

          results.push({
            resourceId: node.resourceId,
            key: contentItem.key,
            type,
            value: [src], // ❗单图也用数组统一格式
            translations: node.translations || [],
            digest: contentItem.digest,
          });
        }

        // === 2) LIST_FILE_REFERENCE ===
        if (type === "LIST_FILE_REFERENCE") {
          const refs: string[] = contentItem.value || [];

          const urls = (
            await Promise.all(
              refs.map(async (ref) => {
                const fileName = ref?.split("/").pop() ?? "";
                return await findImageSrc(admin, fileName);
              }),
            )
          ).filter(Boolean);

          if (urls.length === 0) continue;

          results.push({
            resourceId: node.resourceId,
            key: contentItem.key,
            type,
            value: urls, // ❗多图放一起
            translations: node.translations || [],
            digest: contentItem.digest,
          });
        }

        // === 3) HTML ===
        if (type === "HTML") {
          const urls = extractFromHtml(contentItem.value || "");
          if (urls.length === 0) continue;

          results.push({
            resourceId: node.resourceId,
            key: contentItem.key,
            type,
            value: urls, // ❗html 多图放一起
            translations: node.translations || [],
            digest: contentItem.digest,
            originValue: contentItem.value,
          });
        }

        // === 4) RICH_TEXT_FIELD ===
        if (type === "RICH_TEXT_FIELD") {
          const urls = extractFromRichText(contentItem.value?.children || []);
          if (urls.length === 0) continue;

          results.push({
            resourceId: node.resourceId,
            key: contentItem.key,
            type,
            value: urls, // ❗多图放一起
            translations: node.translations || [],
            digest: contentItem.digest,
          });
        }
      }
    }

    return results;
  };

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
  // const fetchFileReferences = async (admin: any, nodes: any[]) => {
  //   // 扁平化所有 FILE_REFERENCE 项
  //   const fileItems = nodes.flatMap((node) => {
  //     return (node.translatableContent || [])
  //       .filter((c: any) => c.type === "FILE_REFERENCE")
  //       .map((contentItem: any) => ({
  //         node,
  //         contentItem,
  //       }));
  //   });

  //   // 并行解析所有文件引用
  //   const resolved = await Promise.all(
  //     fileItems.map(async ({ node, contentItem }) => {
  //       const fileName = contentItem.value.split("/").pop() ?? "";

  //       const src = await findImageSrc(admin, fileName);

  //       return {
  //         resourceId: node.resourceId,
  //         ...contentItem,
  //         value: src, // 转换成真正 CDN URL
  //         translations: node.translations || [],
  //       };
  //     }),
  //   );
  //   console.log("asdiasdj", resolved);

  //   return resolved;
  // };

  try {
    switch (true) {
      case !!startCursor:
        try {
          const response = await admin.graphql(
            `#graphql
                query JsonTemplate($startCursor: String){     
                    translatableResources(resourceType: ONLINE_STORE_THEME, last: 20, ,before: $startCursor) {
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
  const dataFetcher = useFetcher<any>();
  const { t } = useTranslation();
  const itemOptions = getItemOptions(t);
  const [startCursor, setStartCursor] = useState("");
  const [endCursor, setEndCursor] = useState("");
  const [selectedItem, setSelectedItem] = useState<string>("json_template");
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
          <Thumbnail source={record?.value[0]} size="large" alt={record?.value[0]} />
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
  }, []);
  useEffect(() => {
    if (dataFetcher.data) {
      setTableDataLoading(false);

      console.log(dataFetcher.data);
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
          searchTerm,
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
          searchTerm,
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
    // setIsLoading(true);
    // isManualChangeRef.current = true;
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
                {t("online store theme")}
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
                console.log("嗯？？");
                console.log("record",record);
                
                sessionStorage.setItem("record", JSON.stringify(record));
                navigate(`/app/manage_translations/json_template`, {
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
            hasPrevious={hasPreviousPage}
            onPrevious={handlePrePage}
            hasNext={hasNextPage}
            onNext={handleNextPage}
          />
        </div>
      </div>
    </Page>
  );
}
