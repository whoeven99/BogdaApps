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
// import UserGuideCard from "./components/userGuideCard";
// import ContactCard from "./components/contactCard";
// import PreviewCard from "./components/previewCard";
import ScrollNotice from "~/components/ScrollNotice";
import { LoaderFunctionArgs } from "@remix-run/node";
// import ProgressingCard from "~/components/progressingCard";
import AnalyticsCard from "./components/AnalyticsCard";
import ImageTranslation from "./components/ImageTranslation";
import { authenticate } from "~/shopify.server";
import WelcomeCard from "./components/welcomeCard";
// import useReport from "scripts/eventReport";
// import { useSelector } from "react-redux";
// import CorrectIcon from "~/components/icon/correctIcon";
// import GiftIcon from "~/components/icon/giftIcon";
// import TranslationPanel from "./components/TranslationPanel";
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
  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/ciwi_I18n_Switcher`,
    [shop, ciwiSwitcherBlocksId],
  );

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  useEffect(()=>{
    setIsLoading(false);
  },[])
  useEffect(() => {
    if (themeFetcher.data) {
      const switcherData =
        themeFetcher.data.data.nodes[0].files.nodes[0]?.body?.content;
      const jsonString = switcherData.replace(/\/\*[\s\S]*?\*\//g, "").trim();
      const blocks = JSON.parse(jsonString).current?.blocks;
      if (blocks) {
        const switcherJson: any = Object.values(blocks).find(
          (block: any) => block.type === ciwiSwitcherBlocksId,
        );
        if (switcherJson) {
          if (!switcherJson.disabled) {
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

  const columns = [
    {
      title: t("planCardTableList1.title"),
      dataIndex: "need",
      key: "need",
    },
    {
      title: t("planCardTableList2.title"),
      dataIndex: "votes",
      key: "votes",
    },
    {
      title: t("planCardTableList3.title"),
      dataIndex: "devStatus",
      key: "devStatus",
    },
  ];

  const data: {
    key: number;
    need: string;
    votes: number;
    devStatus: string;
  }[] = [
    {
      key: 1,
      need: t("devplanCard1.title"),
      votes: 65,
      devStatus: t("Launched"),
    },
    {
      key: 2,
      need: t("devplanCard2.title"),
      votes: 33,
      devStatus: t("In development"),
    },
    {
      key: 3,
      need: t("devplanCard3.title"),
      votes: 41,
      devStatus: t("Launched"),
    },
    {
      key: 4,
      need: t("devplanCard4.title"),
      votes: 18,
      devStatus: t("Launched"),
    },
    {
      key: 5,
      need: t("devplanCard5.title"),
      votes: 29,
      devStatus: t("In development"),
    },
  ];
  const handleCommitRequest = () => {
    handleContactSupport();
    // reportClick("dashboard_devprogress_request");
  };
  const handleReportCiwiHelpCenter = () => {
    // reportClick("dashboard_footer_help_center");
  };
  const navigateToLanguage = () => {
    navigate("/app/language");
    fetcher.submit(
      {
        log: `${shop} 前往语言页面, 从主页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    // reportClick("dashboard_language_manage");
  };

  const navigateToCurrency = () => {
    navigate("/app/currency");
    fetcher.submit(
      {
        log: `${shop} 前往货币页面, 从主页面点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
    // reportClick("dashboard_currency_manage");
  };

  const handleReceive = () => {
    navigate("/app/pricing");
    fetcher.submit(
      {
        log: `${shop} 前往付费页面, 从新人链接点击`,
      },
      {
        method: "POST",
        action: "/log",
      },
    );
  };

  return (
    <Page>
      <TitleBar title={t("Dashboard")} />
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
          <WelcomeCard
            switcherOpen={switcherOpen}
            blockUrl={blockUrl}
            shop={shop}
            // handleReload={handleReload}
          />
          <ImageTranslation />
        </Space>
      </Space>
      <Text
        style={{
          display: "flex", // 使用 flexbox 来布局
          justifyContent: "center", // 水平居中
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
