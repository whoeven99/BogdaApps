import { Layout } from "@shopify/polaris";
import { Card, Row, Col, Empty, Button, Flex } from "antd";
import { useTranslation } from "react-i18next";
import "../style.css";

export default function ImageTranslatePanel({
  images = [],
  translatedImage,
}: {
  images: string[];
  translatedImage: string;
}) {
  const { t } = useTranslation();
  return (
    <Layout>
      <Layout.Section>
        <Row gutter={16} align="stretch">
          {/* 左侧 */}
          <Col span={12}>
            <div className="column-wrapper">
              <Card title="原图" className="equal-card">
                <div className="image-list-container">
                  {images.length > 0 ? (
                    images.map((img, index) => (
                      <div key={index} className="image-box">
                        <img src={img} className="image-preview" />
                      </div>
                    ))
                  ) : (
                    <Empty description="暂无图片" />
                  )}
                </div>
              </Card>
            </div>
          </Col>

          {/* 右侧 */}
          <Col span={12}>
            <div className="column-wrapper">
              <Card title="翻译结果" className="equal-card">
                <div className="image-result-container"></div>
              </Card>
            </div>
          </Col>
        </Row>
      </Layout.Section>
      <Layout.Section>
        <Flex justify="center" gap={16}>
          <Button type="primary">{t("Start Translate")}</Button>
          <Button type="default">{t("Clear All")}</Button>
        </Flex>
      </Layout.Section>
    </Layout>
  );
}
