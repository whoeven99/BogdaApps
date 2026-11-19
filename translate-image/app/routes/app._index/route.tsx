import { Page } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { Space, Typography } from "antd";
import { Link, useFetcher, useLoaderData } from "@remix-run/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import WelcomeCard from "./components/welcomeCard";
import useReport from "scripts/eventReport";
import HomeImageJobSection from "./components/HomeImageJobSection";
import { bootMark } from "~/server/bootTrace.server";
import { getCurrentContentImageJob } from "~/server/contentImage/contentImageJobs.server";
import type { ContentImageJob } from "~/routes/component/contentImage/contentImageClient";

const { Text } = Typography;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const adminAuthResult = await authenticate.admin(request);
  const { shop } = adminAuthResult.session;
  bootMark("home loader", `shop=${shop}`);
  const language =
    request.headers.get("Accept-Language")?.split(",")[0] || "en";
  const job = await getCurrentContentImageJob(shop).catch(() => null);
  return {
    language,
    ciwiSwitcherId: process.env.SHOPIFY_CIWI_SWITCHER_ID as string,
    ciwiSwitcherBlocksId: process.env.SHOPIFY_CIWI_SWITCHER_THEME_ID as string,
    shop: shop,
    job,
  };
};

const Index = () => {
  const { language, shop, ciwiSwitcherBlocksId, ciwiSwitcherId, job } =
    useLoaderData<typeof loader>();
  const { reportClick } = useReport();
  const { t } = useTranslation();
  const [switcherOpen, setSwitcherOpen] = useState(true);
  const [switcherLoading, setSwitcherLoading] = useState(true);
  const blockUrl = useMemo(
    () =>
      `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${ciwiSwitcherId}/star_rating`,
    [shop, ciwiSwitcherBlocksId],
  );

  const fetcher = useFetcher<any>();
  const themeFetcher = useFetcher<any>();
  const printedRef = useRef(false);
  useEffect(() => {
    fetcher.submit(
      {
        log: `${shop} 目前在主页面, 页面语言为${language}}`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  }, []);
  useEffect(() => {
    if (switcherLoading) return;
    if (printedRef.current) return;

    printedRef.current = true;
    fetcher.submit(
      {
        log: `${shop} 当前插件状态为${switcherOpen ? "开启的" : "关闭的"}`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
  }, [switcherLoading]);
  useEffect(() => {
    themeFetcher.submit(
      {
        theme: JSON.stringify(true),
      },
      {
        method: "post",
        action: "/app",
      },
    );
  }, []);
  useEffect(() => {
    if (themeFetcher.data) {
      const switcherData =
        themeFetcher?.data?.data?.nodes[0]?.files?.nodes[0]?.body?.content;
      const jsonString = switcherData?.replace(/\/\*[\s\S]*?\*\//g, "")?.trim();
      const blocks = jsonString
        ? JSON.parse(jsonString).current?.blocks
        : undefined;
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
      <Space
        direction="vertical"
        size="large"
        style={{
          display: "flex",
          overflowX: "hidden",
        }}
      >
        {switcherLoading ? null : (
          <WelcomeCard
            switcherOpen={switcherOpen}
            blockUrl={blockUrl}
            shop={shop}
          />
        )}
        <HomeImageJobSection
          initialJob={(job as ContentImageJob | null) ?? null}
        />
      </Space>
      <Text
        style={{
          display: "flex",
          justifyContent: "center",
          margin: "16px 0",
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
