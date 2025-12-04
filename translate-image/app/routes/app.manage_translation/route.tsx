import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Button,
  Card,
  Col,
  Flex,
  Row,
  Skeleton,
  Space,
  Table,
  Typography,
  Modal,
} from "antd";
import { Link, useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import useReport from "scripts/eventReport";
import ScrollNotice from "~/components/ScrollNotice";
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  return {
    language,
    ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
    ciwiSwitcherBlocksId: process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
    server: process.env.SERVER_URL,
    shop: shop,
  };
};

const Index = () => {
  const { language, server, shop, ciwiSwitcherBlocksId, ciwiSwitcherId } =
    useLoaderData<typeof loader>();
  const { reportClick, report } = useReport();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(true);
  const [switcherLoading, setSwitcherLoading] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/star_rating`,
    [shop, ciwiSwitcherBlocksId],
  );

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  useEffect(() => {
    setIsLoading(false);
    fetcher.submit(
      {
        log: `${shop} 目前在主页面, 页面语言为${language}`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  }, []);
  useEffect(() => {
    setIsLoading(false);
    themeFetcher.submit(
      {
        theme: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app",
      },
    );
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  useEffect(() => {
    if (themeFetcher.data) {
      const switcherData =
        themeFetcher?.data?.data?.nodes[0]?.files?.nodes[0]?.body?.content;
      const jsonString = switcherData?.replace(/\/\*[\s\S]*?\*\//g, "")?.trim();
      const blocks = JSON.parse(jsonString).current?.blocks;
      if (blocks) {
        const switcherJson: any = Object.values(blocks).find(
          (block: any) => block.type === ciwiSwitcherBlocksId,
        );
        if (switcherJson) {
          if (switcherJson.disabled) {
            setSwitcherOpen(false);
            localStorage.setItem("switcherEnableCardOpen", "false");
          } else {
            setSwitcherOpen(true);
            localStorage.setItem("switcherEnableCardOpen", "true");
          }
        }
      }
      setSwitcherLoading(false);
    }
  }, [themeFetcher.data]);

  const handleReportCiwiHelpCenter = () => {
    reportClick("dashboard_footer_help_center");
  };

  return (
    <Page>
      <TitleBar title={t("Image & Alt Text Translation")} />
      <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible.",
        )}
      />
      <Space
        direction="vertical"
        size="large"
        style={{
          display: "flex",
          overflowX: "hidden",
        }}
      >
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          <Space direction="vertical" size="middle" style={{ display: "flex" }}>
            {/* === 1. ONLINE_STORE_THEME === */}
            <Card>
              <Table
                pagination={false}
                showHeader={false}
                dataSource={[
                  {
                    key: "theme",
                    name: t("ONLINE_STORE_THEME"),
                    count: "4565/7878",
                  },
                ]}
                columns={[
                  {
                    dataIndex: "name",
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    dataIndex: "count",
                    width: 120,
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    width: 120,
                    render: (_, record) => (
                      <Button
                        onClick={() => {
                          navigate("/app/manage_translation/json_template");
                        }}
                      >
                        {t("操作")}
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>

            {/* === 2. PAGE === */}
            <Card>
              <Table
                pagination={false}
                showHeader={false}
                dataSource={[
                  {
                    key: "page",
                    name: t("PAGE"),
                    count: "4565/7878",
                  },
                ]}
                columns={[
                  {
                    dataIndex: "name",
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    dataIndex: "count",
                    width: 120,
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    width: 120,
                    render: () => (
                      <Button
                        onClick={() => {
                          navigate("/app/manage_translation/page");
                        }}
                      >
                        {t("操作")}
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>

            {/* === 3. METAFIELD === */}
            <Card>
              <Table
                pagination={false}
                showHeader={false}
                dataSource={[
                  {
                    key: "metafield",
                    name: t("METAFIELD"),
                    count: "4565/7878",
                  },
                ]}
                columns={[
                  {
                    dataIndex: "name",
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    dataIndex: "count",
                    width: 120,
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    width: 120,
                    render: () => (
                      <Button
                        onClick={() => {
                          navigate("/app/manage_translation/metafield");
                        }}
                      >
                        {t("操作")}
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>

            {/* === 4. ARTICLE === */}
            {/* <Card>
              <Table
                pagination={false}
                showHeader={false}
                dataSource={[
                  {
                    key: "article",
                    name: t("ARTICLE"),
                    count: "4565/7878",
                  },
                ]}
                columns={[
                  {
                    dataIndex: "name",
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    dataIndex: "count",
                    width: 120,
                    render: (text) => <Text>{text}</Text>,
                  },
                  {
                    width: 120,
                    render: () => (
                      <Button
                        onClick={() => {
                          navigate("/app/manage_translation/article_image");
                        }}
                      >
                        {t("操作")}
                      </Button>
                    ),
                  },
                ]}
              />
            </Card> */}
          </Space>
        </Space>
      </Space>
    </Page>
  );
};

export const getItemOptions = (t: (key: string) => string) => [
  { label: t("Online store theme"), value: "online_store_theme" },
  { label: t("Metafield"), value: "metafield" },
  { label: t("Pages"), value: "page" },
  { label: t("Articles"), value: "article_image" },
];

export default Index;
