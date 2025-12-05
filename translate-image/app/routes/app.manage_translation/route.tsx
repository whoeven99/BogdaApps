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
  const { shop } = useLoaderData<typeof loader>();
  const { reportClick, report } = useReport();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fetcher = useFetcher<any>();
  useEffect(() => {
    fetcher.submit(
      {
        log: `${shop} 目前在管理主题图片翻译页面`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  }, []);

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
                          reportClick("manage_translation_online_store_theme");
                          navigate("/app/manage_translation/online_store_theme");
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
                          reportClick("manage_translation_page");
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
                          reportClick("manage_translation_metafield");
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
          </Space>
        </Space>
      </Space>
    </Page>
  );
};

export const getItemOptions = (t: (key: string) => string) => [
  { label: t("Online Store Theme"), value: "online_store_theme" },
  { label: t("Metafield"), value: "metafield" },
  { label: t("Pages"), value: "page" },
];

export default Index;
