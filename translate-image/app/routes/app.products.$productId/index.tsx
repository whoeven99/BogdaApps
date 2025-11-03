import { useFetcher, useNavigate, useParams } from "@remix-run/react";
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
  const productLoading = JSON.parse(formData.get("productLoading") as string);
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
      case !!productLoading:
        try {
          const loadData = await admin.graphql(
            `query {
              product(id: "${productLoading?.productId}") { 
                id
                title
                images(first: 8) {
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
          console.log("dassada: ", response);

          console.log(
            "productLoading: ",
            response?.data?.product?.images?.edges,
          );
          if (response?.data?.product?.images?.edges.length > 0) {
            const imageData = response?.data?.product?.images?.edges.map(
              (item: any) => {
                return {
                  title: response?.data?.product?.title,
                  altText: item?.node?.altText,
                  key: item?.node?.id,
                  productId: response?.data?.product?.id,
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
  const { productId } = useParams(); // ✅ 获取路径参数
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [imageHasPreviousPage, setImageHasPreviousPage] = useState(false);
  const [productImageData, setProductImageData] = useState<any>([]);
  const [imageHasNextPage, setImageHasNextPage] = useState(false);
  const [selectedKey, setSelectedKey] = useState(
    `gid://shopify/Product/${productId}`,
  );
  const [productLoading, setProductLoading] = useState<boolean>(true);
  const imageFetcher = useFetcher<any>();
  const productLoadingFetcher = useFetcher<any>();
  const handleNavigate = () => {
    navigate("/app");
  };
  useEffect(() => {
    productLoadingFetcher.submit(
      {
        productLoading: JSON.stringify({ productId: selectedKey }),
      },
      {
        method: "POST",
      },
    );
  }, []);
  useEffect(() => {
    if (productLoadingFetcher.data) {
      setProductLoading(false);
      // console.log(productLoadingFetcher.data.imageData);
      setProductImageData(productLoadingFetcher.data.imageData);
      setImageHasNextPage(
        productLoadingFetcher.data.imageData[0]?.imageHasNextPage,
      );
      setImageHasPreviousPage(
        productLoadingFetcher.data.imageData[0]?.imageHasPreviousPage,
      );
    }
  }, [productLoadingFetcher]);
  const handleImagePrevious = () => {
    setProductLoading(true);
    imageFetcher.submit(
      {
        imageStartCursor: JSON.stringify({
          imageStartCursor: productImageData[0]?.imageStartCursor,
          productId: selectedKey,
        }),
      },
      {
        method: "post",
        action: "/app/management",
      },
    );
  };
  const handleImageNext = () => {
    setProductLoading(true);
    imageFetcher.submit(
      {
        imageEndCursor: JSON.stringify({
          imageEndCursor: productImageData[0]?.imageEndCursor,
          productId: selectedKey,
        }),
      },
      {
        method: "post",
        action: "/app/management",
      },
    );
  };
  useEffect(() => {
    if (imageFetcher.data) {
      setProductLoading(false);
      // console.log("dsdqeqsa: ", imageFetcher.data);

      setProductImageData(imageFetcher.data.imageData);
      setImageHasNextPage(imageFetcher.data.imageData[0]?.imageHasNextPage);
      setImageHasPreviousPage(
        imageFetcher.data.imageData[0]?.imageHasPreviousPage,
      );
    }
  }, [imageFetcher.data]);
  const handleSelect = (id: string) => {
    const imageId = id.split("/").pop();
    navigate(`/app/images/${productId}/${imageId}`);
  };
  return (
    <Page>
      {/* <TitleBar title="产品详情" /> */}
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at, and we will respond as soon as possible.",
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
          <Title level={4} style={{ fontSize: "16px",marginBottom:"16px" }}>
            {productImageData.length > 0 && productImageData[0].title}
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
            ) : productImageData.length > 0 ? (
              productImageData.map((item: any) => (
                <div
                  key={item.key}
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
                  onClick={() => handleSelect(item.imageId)}
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
                      src={item.imageUrl}
                      alt={item.altText || "Product Image"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                  <div style={{ padding: "12px" }}>
                    <Button
                      type="default"
                      onClick={() => handleSelect(item.imageId)}
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

          <div
            style={{
              display: `${imageHasNextPage ? "flex" : "none"}`,
              justifyContent: "center",
              marginTop: "16px",
            }}
          >
            <Pagination
              hasPrevious={imageHasPreviousPage}
              onPrevious={handleImagePrevious}
              hasNext={imageHasNextPage}
              onNext={handleImageNext}
            />
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
