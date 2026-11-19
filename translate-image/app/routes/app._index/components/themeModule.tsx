import { Card, Row, Col, Button, Typography, Flex } from "antd";
import { AppstoreOutlined, FileImageOutlined, FileTextOutlined, GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useFetcher, useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";

const { Title } = Typography;

const MODULE_PATH: Record<string, string> = {
  product: "/app/product",
  article: "/app/article",
  page: "/app/page",
  collection: "/app/collection",
  file: "/app/file",
  theme: "/app/theme",
  "third-party": "/app/third-party",
};

function ModuleIcon({ itemKey, icon }: { itemKey: string; icon: string }) {
  if (itemKey === "third-party") return <GlobalOutlined style={{ fontSize: 48 }} />;
  if (itemKey === "page") return <FileTextOutlined style={{ fontSize: 48 }} />;
  if (itemKey === "collection") return <AppstoreOutlined style={{ fontSize: 48 }} />;
  if (itemKey === "file") return <FileImageOutlined style={{ fontSize: 48 }} />;
  return (
    <i className="iconfont" style={{ fontSize: 48 }} dangerouslySetInnerHTML={{ __html: icon }} />
  );
}

export default function ThemeModule({ shop }: { shop: string }) {
  const { reportClick, report } = useReport();
  const fetcher = useFetcher<any>();

  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const items = [
    {
      title: t("Product image"),
      icon: "&#xe617;",
      key: "product",
    },
    {
      title: t("Theme image"),
      icon: "&#xe614;",
      key: "theme",
    },
    {
      title: t("Article image"),
      icon: "&#xe615;",
      key: "article",
    },
    {
      title: t("Page image"),
      icon: "page",
      key: "page",
    },
    {
      title: t("Collection image"),
      icon: "collection",
      key: "collection",
    },
    {
      title: t("Other image"),
      icon: "file",
      key: "file",
    },
    {
      title: t("Third-party images"),
      icon: "global",
      key: "third-party",
    },
    // {
    //   title: "Alt Text generate",
    //   icon: <AuditOutlined style={{ fontSize: 48 }} />,
    //   key: "alt",
    // },
  ];

  const handleManage = (item: any) => {
    fetcher.submit(
      {
        log: `${shop} 目前在主页面, 用户点击了管理按钮，进入到${item.key}模块}`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
    report(
      {
        moduleType: item.key,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "dashboard_manage_image",
    );
    navigate(MODULE_PATH[item.key] ?? "/app/product");
  };
  const handleTranslate = (item: any) => {
    fetcher.submit(
      {
        log: `${shop} 目前在主页面, 用户点击了翻译按钮，进入到${item.key}模块}`,
      },
      {
        method: "POST",
        action: "/app/log",
      },
    );
    report(
      {
        moduleType: item.key,
      },
      {
        action: "/app",
        method: "post",
        eventType: "click",
      },
      "dashboard_translate_image",
    );
    navigate(MODULE_PATH[item.key] ?? "/app/product");
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return (
    <div>
      <Title level={4}>{t("Image Translation")}</Title>
      <Flex gap={8} style={{ width: "100% ", flexWrap: "wrap" }}>
        {items.map((item) => (
          <div
            key={item.key}
            style={{
              width: isMobile ? "100%" : "200px",
              height: 240,
              //   textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              backgroundColor: "#fff",
              padding: "16px",
              border: "0.5px solid rgba(204,204,204,1)",
              borderRadius: "5px",
            }}
          >
            <Flex vertical justify="space-between" style={{ height: "100%" }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{item.title}</div>

              {/* 中间的 Icon */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <ModuleIcon itemKey={item.key} icon={item.icon} />
              </div>

              {/* 底部按钮 */}
              <Flex justify="center">
                <Flex
                  vertical
                  style={{ width: "200px", padding: "12px" }}
                  gap={8}
                >
                  <Button
                    type="primary"
                    block
                    style={{ marginBottom: 8 }}
                    onClick={() => handleTranslate(item)}
                  >
                    {t("Translate")}
                  </Button>
                  <Button block onClick={() => handleManage(item)}>
                    {t("Manage")}
                  </Button>
                </Flex>
              </Flex>
            </Flex>
          </div>
        ))}
      </Flex>
    </div>
  );
}
