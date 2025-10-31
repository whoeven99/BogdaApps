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
import WelcomeCard from "./components/welcomeCard";
import { QuotaCard } from "./components/quotaCard";
import ImageTable from "./components/ImageTable";
const { Title, Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const languageCode = language.split("-")[0];
  if (languageCode === "zh" || languageCode === "zh-CN") {
    return {
      language,
      isChinese: true,
      ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
      ciwiSwitcherBlocksId: process.env
        .SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
      server: process.env.SERVER_URL,
      shop: shop,
    };
  } else {
    return {
      language,
      isChinese: false,
      ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
      ciwiSwitcherBlocksId: process.env
        .SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
      server: process.env.SERVER_URL,
      shop: shop,
    };
  }
};

const Index = () => {
  const {
    language,
    isChinese,
    server,
    shop,
    ciwiSwitcherBlocksId,
    ciwiSwitcherId,
  } = useLoaderData<typeof loader>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  // const { userConfigIsLoading, isNew } = useSelector(
  //   (state: any) => state.userConfig,
  // );
  const [isLoading, setIsLoading] = useState(true);
  const [switcherOpen, setSwitcherOpen] = useState(true);
  const [switcherLoading, setSwitcherLoading] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&appEmbed=${ciwiSwitcherId}/star_rating`,
    [shop, ciwiSwitcherBlocksId],
  );

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  useEffect(() => {
    setIsLoading(false);
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
      console.log(themeFetcher.data);

      // const switcherData =
      //   themeFetcher.data.data.nodes[0].files.nodes[0]?.body?.content;
      // const jsonString = switcherData.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      // const blocks = JSON.parse(jsonString).current?.blocks;
      // if (blocks) {
      //   const switcherJson: any = Object.values(blocks).find(
      //     (block: any) => block.type === ciwiSwitcherBlocksId,
      //   );
      //   console.log("switcherJson: ", switcherJson);

      //   if (switcherJson) {
      //     if (switcherJson.disabled) {
      //       console.log("未开启");

      //       setSwitcherOpen(false);
      //       localStorage.setItem("switcherEnableCardOpen", "false");
      //     } else {
      //       console.log("已开启");

      //       setSwitcherOpen(true);
      //       localStorage.setItem("switcherEnableCardOpen", "true");
      //     }
      //   }
      // }
      // setSwitcherLoading(false);
    }
  }, [themeFetcher.data]);

  const handleReportCiwiHelpCenter = () => {
    // reportClick("dashboard_footer_help_center");
  };

  return (
    <Page>
      <TitleBar title={t("Image & Alt Text Translation")} />
      {/* <FreePlanCountdownCard /> */}
      {/* <ScrollNotice
        text={t(
          "Welcome to our app! If you have any questions, feel free to email us at support@ciwi.ai, and we will respond as soon as possible."
        )}
      /> */}
      <Space
        direction="vertical"
        size="large"
        style={{
          display: "flex",
          overflowX: "hidden",
        }}
      >
        <Space direction="vertical" size="middle" style={{ display: "flex" }}>
          {/* <AnalyticsCard
            isLoading={isLoading}
          ></AnalyticsCard> */}
          <QuotaCard />
          <WelcomeCard
            switcherOpen={switcherOpen}
            blockUrl={blockUrl}
            shop={shop}
            // handleReload={handleReload}
          />
          {/* <ImageTranslation /> */}
          <ImageTable />
        </Space>
      </Space>
      <Text
        style={{
          display: "flex", // 使用 flexbox 来布局
          justifyContent: "center", // 水平居中
          margin:"16px 0"
        }}
      >
        {t("Learn more in")}
        <Link
          to="https://ciwi.ai/help-center/ShopifyApp/about-ciwi-ai-translator-shopify-app"
          target="_blank"
          style={{ margin: "0 5px" }}
          onClick={handleReportCiwiHelpCenter}
        >
          {t("Ciwi Help Center")}
        </Link>
        {t("by")}
        <Link
          to={"https://ciwi.ai"}
          target="_blank"
          style={{ margin: "0 5px" }}
        >
          {t("Ciwi.ai")}
        </Link>
      </Text>
    </Page>
  );
};

export const handleContactSupport = () => {
  // 声明 tidioChatApi 类型
  interface Window {
    tidioChatApi?: {
      open: () => void;
    };
  }

  if ((window as Window)?.tidioChatApi) {
    (window as Window).tidioChatApi?.open();
  } else {
    console.warn("Tidio Chat API not loaded");
  }
};

export default Index;
