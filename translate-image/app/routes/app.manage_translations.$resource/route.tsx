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
import { load } from "cheerio";

const { Text, Title } = Typography;

export const action = async ({ request }: ActionFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { admin } = adminAuthResult;

  const { shop, accessToken } = adminAuthResult.session;
  const formData = await request.formData();
  const articleLoading = JSON.parse(formData.get("articleLoading") as string);
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
          const embeddedImages: { src: string; alt: string | null }[] = [];

          $("img").each((_, el) => {
            embeddedImages.push({
              src: $(el).attr("src") || "",
              alt: $(el).attr("alt") || null,
            });
          });

          // ✅ 组合返回的数据结构
          const result = {
            ...article,
            embeddedImages,
          };

          return json(result);
        } catch (error) {
          console.error("Error action imageStartCursor productImage:", error);
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
  const { t } = useTranslation();
  const location = useLocation();
  const { resourceId, record } = location.state || {};
  const { resource } = useParams();
  const [initData, setInitData] = useState<any>(
    JSON.parse(sessionStorage.getItem("record") || "{}"),
  );
  useEffect(() => {
    console.log(initData);
  }, []);
  // console.log(resourceId);
  // console.log(record);

  const navigate = useNavigate();

  const handleNavigate = () => {
    navigate(`/app/manage_translation/json_template`);
  };
  const handleSelect = (id: string) => {
    // const imageId = id.split("/").pop();
    navigate(`/app/${resource}/${initData?.digest}/${initData.digest}`, {
      state: { record: initData },
    });
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
                {t("Translate json template images")}
              </Title>
            </Flex>
          </Flex>
        </div>
      </Affix>
      <Layout>
        <Layout.Section>
          {/* <Title level={4} style={{ fontSize: "16px", marginBottom: "16px" }}>
            {articleImageData?.title}
          </Title> */}
          <div
            style={{
              width: "300px",
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
            onClick={() => handleSelect(initData?.resourceId)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 6px 12px rgba(0,0,0,0.1)";
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
                src={initData?.value}
                alt={initData?.altText || "json template image"}
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
                onClick={() => handleSelect(initData?.resourceId)}
              >
                {t("View translation")}
              </Button>
            </div>
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
