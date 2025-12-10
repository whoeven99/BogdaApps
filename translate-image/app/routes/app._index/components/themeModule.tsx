import { Card, Row, Col, Button, Typography, Flex } from "antd";
import {
  PictureOutlined,
  BgColorsOutlined,
  FileImageOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import useReport from "scripts/eventReport";

const { Title } = Typography;

export default function ThemeModule() {
  const { reportClick, report } = useReport();

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
    // {
    //   title: "Alt Text generate",
    //   icon: <AuditOutlined style={{ fontSize: 48 }} />,
    //   key: "alt",
    // },
  ];

  const handleManage = (item: any) => {
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
    switch (item.key) {
      case "product":
        navigate("/app/product");
        break;
      case "article":
        navigate("/app/article");
        break;
      case "theme":
        navigate("/app/theme");
        break;
    }
  };
  const handleTranslate = (item: any) => {
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
    switch (item.key) {
      case "product":
        navigate("/app/product");
        break;
      case "article":
        navigate("/app/article");
        break;
      case "theme":
        navigate("/app/theme");
        break;
    }
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
                <i
                  className="iconfont"
                  style={{ fontSize: 48 }}
                  dangerouslySetInnerHTML={{ __html: item.icon }}
                />
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
