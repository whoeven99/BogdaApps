import {
  useFetcher,
  useLocation,
  useNavigate,
  useParams,
} from "@remix-run/react";
import { Page, Icon, Pagination, Layout } from "@shopify/polaris";
import {
  Typography,
  Affix,
  Flex,
  Button,
  Table,
  Card,
  Skeleton,
  Empty,
  Space,
} from "antd";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import ScrollNotice from "~/components/ScrollNotice";
import { load } from "cheerio";

const { Text, Title } = Typography;

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const articleLoading = JSON.parse(formData.get("articleLoading") as string);
  const articleImageFetcher = JSON.parse(
    formData.get("articleImageFetcher") as string,
  );
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

  const fetchFileReferences = async (admin: any, translatableResource: any) => {
    const tasks: Promise<any>[] = [];
    const translatableContent = translatableResource.translatableContent;

    for (const contentItem of translatableContent || []) {
      const type = contentItem.type;
      if (!IMAGE_TYPES.has(type)) continue;

      // ---- 1) FILE_REFERENCE ----
      if (type === "FILE_REFERENCE") {
        tasks.push(
          (async () => {
            const fileName = contentItem.value?.split("/").pop() ?? "";
            const src = await findImageSrc(admin, fileName);

            if (!src) return null; // ❗没有图片则忽略

            return {
              resourceId: translatableResource.resourceId,
              key: contentItem.key,
              type,
              value: src, // 单一值
              digest: contentItem.digest,
              originValue: contentItem.value,
            };
          })(),
        );
      }

      // ---- 2) LIST_FILE_REFERENCE ----
      if (type === "LIST_FILE_REFERENCE") {
        tasks.push(
          (async () => {
            const refs: string[] = contentItem.value || [];

            const urls = (
              await Promise.all(
                refs.map(async (ref) => {
                  const fileName = ref?.split("/").pop() ?? "";
                  return await findImageSrc(admin, fileName);
                }),
              )
            ).filter(Boolean);

            // ❗LIST_FILE_REFERENCE 也只返回第一张（你要求单一）
            if (urls.length === 0) return null;

            return {
              resourceId: translatableResource.resourceId,
              key: contentItem.key,
              type,
              value: urls[0],
              digest: contentItem.digest,
              originValue: contentItem.value,
            };
          })(),
        );
      }

      // ---- 3) HTML ----
      if (type === "HTML") {
        const urls = extractFromHtml(contentItem.value || "");
        console.log("contentItem.value", contentItem.value);
        console.log("urls", urls);

        if (urls.length === 0) continue; // ❗没有图片，不返回
        urls.forEach((url, index) => {
          tasks.push(
            Promise.resolve({
              resourceId: translatableResource.resourceId,
              key: contentItem.key,
              dbKey: `${contentItem.key}_${index}`,
              type,
              value: url, // 单一值
              digest: contentItem.digest,
              originValue: contentItem.value,
            }),
          );
        });
      }

      // ---- 4) RICH_TEXT_FIELD ----
      if (type === "RICH_TEXT_FIELD") {
        const urls = extractFromRichText(contentItem.value?.children || []);

        if (urls.length === 0) continue;

        tasks.push(
          Promise.resolve({
            resourceId: translatableResource.resourceId,
            key: contentItem.key,
            type,
            value: urls[0],
            digest: contentItem.digest,
            originValue: contentItem.value,
          }),
        );
      }
    }

    const resolved = await Promise.all(tasks);

    // ❗过滤掉 null（无图片的项）
    return resolved.filter(Boolean);
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
  try {
    switch (true) {
      case !!articleLoading:
        try {
          console.log("articleLoading", articleLoading);

          const loadData = await admin.graphql(
            `query ShopName {
              article(id: "${articleLoading.articleId}") {
                image {
                  altText
                  url
                  id
                }
                body
                id
                updatedAt
                title
              }
            }`,
          );

          const response = await loadData.json();
          const article = response?.data?.article;

          // ✅ 提取 body 里的 <img> 标签
          const $ = load(article.body || "");
          const embeddedImages: {
            src: string;
            alt: string | null;
            articleId: string;
          }[] = [];

          $("img").each((_, el) => {
            embeddedImages.push({
              src: $(el).attr("src") || "",
              alt: $(el).attr("alt") || null,
              articleId: article.id,
            });
          });

          // ✅ 组合返回的数据结构
          const result = {
            ...article,
            embeddedImages,
          };

          return json(result);
        } catch (error) {
          console.error("Error action articleLoading:", error);
          return json({
            imageData: [],
          });
        }
      case !!articleImageFetcher:
        try {
          console.log("articleImageFetcher", articleImageFetcher);

          const response = await admin.graphql(
            `#graphql
              query {
                translatableResource(resourceId: "${articleImageFetcher.articleId}") {
                  resourceId
                  translatableContent {
                    digest
                    key
                    locale
                    value
                    type
                  }
                }
              }`,
          );
          const parsed = await response.json();
          const tr = parsed?.data?.translatableResource;
          console.log("Parse", parsed);
          // return json({response:parsed})
          if (!tr) {
            return json({
              data: [],
            });
          }
          // ⭐ 关键改动：等所有 FILE_REFERENCE 图片解析完
          const fileReferences = await fetchFileReferences(admin, tr);

          return json({
            data: fileReferences,
          });
        } catch (error) {
          console.error("Error query article image:", error);
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

export default function ProductDetailPage() {
  const { articleId } = useParams(); // ✅ 获取路径参数
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [imageHasPreviousPage, setImageHasPreviousPage] = useState(false);
  const [articleImageData, setArticleImageData] = useState<any>([]);
  const [imageData, setImageData] = useState<any>([]);
  const [imageHasNextPage, setImageHasNextPage] = useState(false);
  const [selectedKey, setSelectedKey] = useState(
    `gid://shopify/Article/${articleId}`,
  );
  const [productLoading, setProductLoading] = useState<boolean>(true);
  const [imageLoading, setImageLoading] = useState<boolean>(true);
  const articleLoadingFetcher = useFetcher<any>();
  const articleImageFetcher = useFetcher<any>();
  const handleNavigate = () => {
    navigate("/app/article");
  };
  useEffect(() => {
    articleLoadingFetcher.submit(
      {
        articleLoading: JSON.stringify({ articleId: selectedKey }),
      },
      {
        method: "POST",
      },
    );
    articleImageFetcher.submit(
      {
        articleImageFetcher: JSON.stringify({ articleId: selectedKey }),
      },
      {
        method: "POST",
      },
    );
  }, []);
  useEffect(() => {
    if (articleLoadingFetcher.data) {
      console.log(articleLoadingFetcher.data);

      setProductLoading(false);
      setArticleImageData(articleLoadingFetcher.data);
    }
  }, [articleLoadingFetcher]);
  useEffect(() => {
    if (articleImageFetcher.data) {
      console.log(articleImageFetcher.data.data);

      setImageLoading(false);
      setImageData(articleImageFetcher?.data?.data);
    }
  }, [articleImageFetcher]);
  const handleSelect = (id: string) => {
    const imageId = id.split("/").pop();
    navigate(`/app/articles/${articleId}/${imageId}?type=article`);
  };
  const handleSelectImage = (img: any) => {
    // const imageId = id.split("/").pop();
    console.log("img", img);

    sessionStorage.setItem("record", JSON.stringify(img));
    // navigate(`/app/articles/${articleId}/${imageId}?type=article`);
    navigate(`/app/article_image/${articleId}/${img.digest}`, {
      state: { record: img },
    });
  };
  const handleSelectArticleImage = (img: any) => {
    // https://cdn.shopify.com/s/files/1/0714/6959/6922/files/71QCCuepSJL._AC_SX679.jpg?v=1764666270
    console.log(img);
    let filenameWithExt = img.src.substring(img.src.lastIndexOf("/") + 1);
    filenameWithExt = filenameWithExt.split("?")[0];
    const filenameWithoutExt = filenameWithExt.replace(/\.[^/.]+$/, "");
    console.log(filenameWithoutExt);
    const articleId = img.articleId.split("/").pop();
    // sessionStorage.setItem("article_image", JSON.stringify(img));
    navigate(`/app/article_image/${articleId}/${filenameWithoutExt}`);
  };
  return (
    <Page>
      {/* <TitleBar title="产品详情" /> */}
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
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
                {t("Translate article images")}
              </Title>
            </Flex>
          </Flex>
        </div>
      </Affix>
      <Layout>
        <Layout.Section>
          <Title level={4} style={{ fontSize: "16px", marginBottom: "16px" }}>
            {articleImageData?.title}
          </Title>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
              // padding: "10px",
            }}
          >
            {productLoading ? (
              <div
                style={{
                  gridColumn: "1 / -1", // ✅ 撑满整个 grid
                  width: "100%",
                }}
              >
                <Skeleton
                  active
                  paragraph={{ rows: 4 }}
                  style={{
                    width: "100%", // ✅ 让骨架宽度填满
                  }}
                />
              </div>
            ) : articleImageData?.image ? (
              <div
                style={{
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  border: "1px solid #f0f0f0",
                  borderRadius: "8px",
                  padding: 0,
                  backgroundColor: "#fff",
                }}
                onClick={() => handleSelect(articleImageData?.image?.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow =
                    "0 6px 12px rgba(0,0,0,0.1)";
                  // e.currentTarget.style.borderColor = "#1677ff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.borderColor = "#f0f0f0";
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "1/1",
                    borderRadius: "8px 8px 0 0",
                    overflow: "hidden",
                    backgroundColor: "#f7f7f7",
                    marginBottom: "30px",
                    padding: 0,
                  }}
                >
                  <img
                    src={articleImageData?.image?.url}
                    alt={articleImageData?.image?.altText || "Article Image"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                    }}
                  />
                </div>
                <div style={{ padding: "12px" }}>
                  <Button
                    type="default"
                    onClick={() => handleSelect(articleImageData?.image?.id)}
                  >
                    {t("View translation")}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  gridColumn: "1 / -1", // ✅ 让它跨越整个 grid
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: "40px 0",
                }}
              >
                <Empty description={t("No image data available.")} />
              </div>
            )}
          </div>
          <Space size="middle" direction="vertical">
            <Title level={4} style={{ marginTop: "24px" }}>
              {t("文章图片")}
            </Title>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "20px",
                // padding: "10px",
              }}
            >
              {imageLoading ? (
                <div
                  style={{
                    gridColumn: "1 / -1", // ✅ 撑满整个 grid
                    width: "100%",
                  }}
                >
                  <Skeleton
                    active
                    paragraph={{ rows: 4 }}
                    style={{
                      width: "100%", // ✅ 让骨架宽度填满
                    }}
                  />
                </div>
              ) : imageData.length > 0 ? (
                imageData.map((item: any) => (
                  <div
                    key={item.dbKey || item.key}
                    style={{
                      textAlign: "center",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      border: "1px solid #f0f0f0",
                      borderRadius: "8px",
                      padding: 0,
                      backgroundColor: "#fff",
                    }}
                    onClick={() => handleSelectImage(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-4px)";
                      e.currentTarget.style.boxShadow =
                        "0 6px 12px rgba(0,0,0,0.1)";
                      // e.currentTarget.style.borderColor = "#1677ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "#f0f0f0";
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: "8px 8px 0 0",
                        overflow: "hidden",
                        backgroundColor: "#f7f7f7",
                        marginBottom: "30px",
                        padding: 0,
                      }}
                    >
                      <img
                        src={item.value}
                        alt={item.altText || "article image"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    <div style={{ padding: "12px" }}>
                      <Button
                        type="default"
                        onClick={() => handleSelectImage(item)}
                      >
                        {t("View translation")}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "1 / -1", // ✅ 让它跨越整个 grid
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "40px 0",
                  }}
                >
                  <Empty description={t("No image data available.")} />
                </div>
              )}
            </div>
          </Space>

          <div
            style={{
              display: `${imageHasNextPage || imageHasPreviousPage ? "flex" : "none"}`,
              justifyContent: "center",
              marginTop: "16px",
            }}
          >
            {/* <Pagination
              hasPrevious={imageHasPreviousPage}
              onPrevious={handleImagePrevious}
              hasNext={imageHasNextPage}
              onNext={handleImageNext}
            /> */}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
