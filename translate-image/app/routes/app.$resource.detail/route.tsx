import {
  useNavigate,
  useParams,
} from "@remix-run/react";
import { Page, Icon, Pagination, Layout } from "@shopify/polaris";
import {
  Typography,
  Affix,
  Flex,
  Button,
} from "antd";
import { useTranslation } from "react-i18next";
import { ArrowLeftIcon } from "@shopify/polaris-icons";
import { useEffect, useState } from "react";
import { ActionFunctionArgs, json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import ScrollNotice from "~/components/ScrollNotice";
import { load } from "cheerio";

const { Text, Title } = Typography;

export default function ProductDetailPage() {
  const { t } = useTranslation();
  const { resource } = useParams();
  const [initData, setInitData] = useState<any>(() => {
    const raw = sessionStorage.getItem("record");
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // 如果 value 是数组 → 拆分成多个对象
    if (Array.isArray(parsed.value)) {
      return parsed.value.map((v: string, index: number) => ({
        ...parsed,
        value: v,
        dbKey: `${parsed.key}_${index}`,
      }));
    }

    return parsed;
  });
  const navigate = useNavigate();
  const handleNavigate = () => {
    navigate(`/app/${resource}`);
  };
  const handleSelect = (item: any, index: number) => {
    const raw = sessionStorage.getItem("record");
    const parsed = JSON.parse(raw || "{}");
    sessionStorage.setItem(
      "record",
      JSON.stringify({
        ...parsed,
        index,
      }),
    );
    navigate(`/app/${resource}/${item?.digest}/${item.digest}`, {
      state: { record: item },
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
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
              // padding: "10px",
            }}
          >
            {initData.length > 0 &&
              initData?.map((item: any, index: number) => (
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
                  onClick={() => handleSelect(item, index)}
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
                      onClick={() => handleSelect(item, index)}
                    >
                      {t("View translation")}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
