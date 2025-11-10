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
} from "antd";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import ScrollNotice from "~/components/ScrollNotice";
const { Text, Title } = Typography;

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const articleLoading = JSON.parse(formData.get("articleLoading") as string);
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
                id
                updatedAt
                title
              }
            }`,
          );

          const response = await loadData.json();

          console.log("articleLoading: ", response?.data?.article?.image);
          return json(response?.data?.article);
        } catch (error) {
          console.error("Error action imageStartCursor productImage:", error);
          return json({
            imageData: [],
          });
        }

      case !!imageStartCursor:
        try {
          const loadData = await admin.graphql(
            `query {
              product(id: "${imageStartCursor?.productId}") {
                id
                title
                images(last: 8, before: "${imageStartCursor?.imageStartCursor}") {
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
            }`,
          );

          const response = await loadData.json();

          console.log(
            "imageStartCursor",
            response?.data?.product?.images?.edges,
          );
          if (response?.data?.product?.images?.edges.length > 0) {
            const imageData = response?.data?.product?.images?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  productId: item?.node?.id,
                  productTitle: item?.node?.title,
                  imageId: item?.node?.id,
                  imageUrl: item?.node?.url,
                  targetImageUrl: "",
                  imageStartCursor:
                    response?.data?.product?.images?.pageInfo?.startCursor,
                  imageEndCursor:
                    response?.data?.product?.images?.pageInfo?.endCursor,
                  imageHasNextPage:
                    response?.data?.product?.images?.pageInfo?.hasNextPage,
                  imageHasPreviousPage:
                    response?.data?.product?.images?.pageInfo?.hasPreviousPage,
                };
              },
            );
            return json({
              imageData,
            });
          } else {
            return json({
              imageData: [],
            });
          }
        } catch (error) {
          console.error("Error action imageStartCursor productImage:", error);
          return json({
            imageData: [],
          });
        }
      case !!imageEndCursor:
        try {
          const loadData = await admin.graphql(
            `query {
              product(id: "${imageEndCursor?.productId}") {
                id
                title
                images(first: 8, after: "${imageEndCursor?.imageEndCursor}") {
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
            }`,
          );

          const response = await loadData.json();

          console.log("imageEndCursor", response?.data?.product?.images);
          if (response?.data?.product?.images?.edges.length > 0) {
            const imageData = response?.data?.product?.images?.edges.map(
              (item: any) => {
                return {
                  key: item?.node?.id,
                  productId: item?.node?.id,
                  productTitle: item?.node?.title,
                  imageId: item?.node?.id,
                  imageUrl: item?.node?.url,
                  targetImageUrl: "",
                  imageStartCursor:
                    response?.data?.product?.images?.pageInfo?.startCursor,
                  imageEndCursor:
                    response?.data?.product?.images?.pageInfo?.endCursor,
                  imageHasNextPage:
                    response?.data?.product?.images?.pageInfo?.hasNextPage,
                  imageHasPreviousPage:
                    response?.data?.product?.images?.pageInfo?.hasPreviousPage,
                };
              },
            );
            return json({
              imageData,
            });
          } else {
            return json({
              imageData: [],
            });
          }
        } catch (error) {
          console.error("Error action imageEndCursor productImage:", error);
          return json({
            imageData: [],
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
  const [imageHasNextPage, setImageHasNextPage] = useState(false);
  const [selectedKey, setSelectedKey] = useState(
    `gid://shopify/Article/${articleId}`,
  );
  const [productLoading, setProductLoading] = useState<boolean>(true);
  const articleLoadingFetcher = useFetcher<any>();
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
  }, []);
  useEffect(() => {
    if (articleLoadingFetcher.data) {
      setProductLoading(false);
      setArticleImageData(articleLoadingFetcher.data);
    }
  }, [articleLoadingFetcher]);
  const handleSelect = (id: string) => {
    const imageId = id.split("/").pop();
    navigate(`/app/images/${articleId}/${imageId}?type=article`);
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
                {t("Translate product images")}
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
