import React from "react";
import { Card, Tag, Button, Space, Alert, Typography, Image, Statistic, Descriptions } from "antd";
import { EditOutlined, SwapOutlined, WarningOutlined, CheckCircleOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useI18n } from "../hooks/useI18n";

const { Text, Title } = Typography;

export default function ProductInfoCard({
  productId,
  productTitle,
  productTags,
  productPrices,
  productImage,
  productType,
  vendor,
  variantId,
  variantTitle,
  variantPrice,
  variantCompareAtPrice,
  variantSku,
  variantInventory,
  hasInventory,
  onEditProduct,
  onChangeProduct,
}) {
  const { t } = useI18n();

  if (!productId) {
    return (
      <Card size="small" style={{ background: "#fafafa", border: "1px dashed #d9d9d9", borderRadius: 8 }}>
        <div style={{ textAlign: "center", padding: "16px 0", color: "#999" }}>
          <ShoppingOutlined style={{ fontSize: 28, marginBottom: 8, display: "block" }} />
          <Text type="secondary">
            {t("productInfoCard.noProduct") || "No product bound yet. Click 'Change Lens Product' to bind one."}
          </Text>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Button size="small" icon={<SwapOutlined />} onClick={onChangeProduct}>
            {t("productInfoCard.changeProduct") || "Change Lens Product"}
          </Button>
        </div>
      </Card>
    );
  }

  const hasNoInventory = hasInventory === false;

  return (
    <Card size="small" style={{ borderRadius: 8 }}>
      <div style={{ display: "flex", gap: 16 }}>
        {productImage && (
          <div style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 6, overflow: "hidden", border: "1px solid #f0f0f0" }}>
            <Image src={productImage} alt={productTitle} width={80} height={80} style={{ objectFit: "cover" }} fallback="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjgwIiBoZWlnaHQ9IjgwIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNDAiIHk9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSIgZmlsbD0iIzk5OSIgZm9udC1zaXplPSIxMCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+" />
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <Title level={5} style={{ margin: 0, marginBottom: 4 }} ellipsis>
            {productTitle || (t("productInfoCard.defaultTitle") || "Default Title")}
          </Title>

          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            {productType && (
              <Tag color="purple" style={{ fontSize: 11 }}>{productType}</Tag>
            )}
            {vendor && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {vendor}
              </Text>
            )}
          </div>

          {variantId && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, marginBottom: 6,
              padding: "4px 10px", background: "#f6ffed", borderRadius: 4,
              border: "1px solid #b7eb8f", flexWrap: "wrap",
            }}>
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 13 }} />
              <Text style={{ fontSize: 12, color: "#135200" }}>
                <strong>{t("productInfoCard.selectedVariant") || "Variant"}:</strong> {variantTitle}
              </Text>
              {variantSku && (
                <Text type="secondary" style={{ fontSize: 11 }}>SKU: {variantSku}</Text>
              )}
              {variantCompareAtPrice > 0 && variantCompareAtPrice > variantPrice && (
                <Text delete type="secondary" style={{ fontSize: 11 }}>
                  ${variantCompareAtPrice.toFixed(2)}
                </Text>
              )}
              <Text strong style={{ fontSize: 13, color: "#f5222d" }}>${(variantPrice ?? 0).toFixed(2)}</Text>
            </div>
          )}

          {productTags && productTags.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <Text type="secondary" style={{ fontSize: 12, marginRight: 4 }}>
                {t("productInfoCard.tags") || "Tags"}:
              </Text>
              {productTags.map((tag, i) => (
                <Tag key={i} color="blue" style={{ fontSize: 11, marginBottom: 2 }}>
                  {tag}
                </Tag>
              ))}
            </div>
          )}

          {productPrices && productPrices.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>
                {t("productInfoCard.prices") || "Prices"}:
              </Text>
              {productPrices.slice(0, 5).map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "#333", paddingLeft: 4 }}>
                  {p.title} —
                  {p.compareAtPrice > 0 && p.compareAtPrice > p.price && (
                    <Text delete type="secondary" style={{ fontSize: 11, margin: "0 4px" }}>
                      ${p.compareAtPrice.toFixed(2)}
                    </Text>
                  )}
                  <Text strong style={{ color: "#f5222d" }}>${p.price.toFixed(2)}</Text>
                </div>
              ))}
            </div>
          )}

          <Space size="small">
            <Button size="small" icon={<EditOutlined />} onClick={onEditProduct}>
              {t("productInfoCard.editProduct") || "Edit Lens Product"}
            </Button>
            <Button size="small" icon={<SwapOutlined />} onClick={onChangeProduct}>
              {t("productInfoCard.changeProduct") || "Change Lens Product"}
            </Button>
          </Space>
        </div>
      </div>

      {hasNoInventory && (
        <Alert
          type="info"
          showIcon
          icon={<WarningOutlined />}
          message={t("lensOptionDetail.noInventoryWarning") || "This product appears to have no available stock. If \"Auto-hide out-of-stock lenses\" is enabled in Global Settings, this option will be hidden on the storefront."}
          style={{ marginTop: 10 }}
        />
      )}
    </Card>
  );
}
