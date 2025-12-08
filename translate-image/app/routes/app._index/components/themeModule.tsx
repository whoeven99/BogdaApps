import { Card, Row, Col, Button, Typography, Flex } from "antd";
import {
  PictureOutlined,
  BgColorsOutlined,
  FileImageOutlined,
  AuditOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const { Title } = Typography;

export default function ThemeModule() {
  const items = [
    {
      title: "Product image",
      icon: "&#xe617;",
      key: "product",
    },
    {
      title: "Theme image",
      icon: "&#xe614;",
      key: "theme",
    },
    {
      title: "Article image",
      icon: "&#xe615;",
      key: "article",
    },
    // {
    //   title: "Alt Text generate",
    //   icon: <AuditOutlined style={{ fontSize: 48 }} />,
    //   key: "alt",
    // },
  ];
  const { t } = useTranslation();
  const handleManage = (item: any) => {};
  const handleTranslate = (item: any) => {
    console.log(item);
  };
  return (
    <div>
      <Title level={3}>{t("Image Translation")}</Title>

      <Flex gap={8} style={{ width: "100% " }} justify="space-between">
        {items.map((item) => (
          <Card
            key={item.key}
            style={{
              height: 240,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              // padding: "16px",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>{item.title}</div>

            {/* 中间的 Icon */}
            <div
              style={{
                //   flex: 1,
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
            <div>
              <Button
                type="primary"
                block
                style={{ marginBottom: 8 }}
                onClick={() => handleTranslate}
              >
                翻译
              </Button>
              <Button block onClick={() => handleManage}>
                管理
              </Button>
            </div>
          </Card>
        ))}
      </Flex>
    </div>
  );
}
